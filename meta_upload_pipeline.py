import argparse
import json
import logging
import time
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
from apache_beam.transforms.combiners import Sample
import requests
from google.cloud import secretmanager

# --- Constantes y Configuración ---
# Ajusta la versión de la API Graph si es necesario
META_API_VERSION = 'v19.0'
# Tamaño del lote para enviar a la API de Meta (máximo ~10k)
META_BATCH_SIZE = 9500
META_GRAPH_URL = f'https://graph.facebook.com/{META_API_VERSION}'
# Configuración de reintentos para llamadas API
MAX_RETRIES = 3
INITIAL_BACKOFF_SECS = 2

# --- Funciones Auxiliares ---

def get_meta_token(secret_version_name):
    """Obtiene el token de Meta desde Secret Manager."""
    # Añadir import logging aquí por si acaso el scope global no llega
    import logging
    # Añadir import de secretmanager aquí por si acaso
    from google.cloud import secretmanager
    logging.info(f"Intentando acceder al secreto: {secret_version_name}") # Log del nombre usado
    try:
        client = secretmanager.SecretManagerServiceClient()
        response = client.access_secret_version(request={"name": secret_version_name})
        token = response.payload.data.decode("UTF-8")
        if not token:
             raise ValueError(f"El secreto recuperado está vacío: {secret_version_name}")
        logging.info(f"Token de Meta obtenido exitosamente desde {secret_version_name}.")
        return token
    except Exception as e:
        logging.error(f"Error crítico obteniendo secreto '{secret_version_name}': {e}")
        # Propagar el error detendrá el pipeline, lo cual es probablemente deseable si no hay token.
        raise RuntimeError(f"No se pudo obtener el token de Meta: {e}") from e


# --- DoFns (Lógica del Pipeline de Beam) ---

class FormatUserPayloadDoFn(beam.DoFn):
    """Transforma fila de BQ a lista de hashes para payload Meta, respetando el schema."""
    def __init__(self, email_col, phone_col, meta_schema_list):
        # Guarda los nombres de las columnas de BQ y el orden del schema de Meta
        self.email_col = email_col
        self.phone_col = phone_col
        self.meta_schema_list = meta_schema_list
        # Crea un mapa del tipo de schema al nombre de columna BQ para fácil acceso
        self.source_col_map = {}
        if self.email_col:
            self.source_col_map['EMAIL_SHA256'] = self.email_col
        if self.phone_col:
            self.source_col_map['PHONE_SHA256'] = self.phone_col
        # Añadir más mapeos si usas otros identificadores (FN_SHA256, LN_SHA256, etc.)

    def process(self, element):
        # element es un diccionario que representa una fila de BigQuery
        # --- Importar DENTRO del método si usas beam.metrics aquí ---
        import apache_beam as beam
        import logging
        try:
            user_data = []
            has_data = False
            # Construye la lista respetando el orden exacto del meta_schema_list
            for schema_key in self.meta_schema_list:
                bq_col_name = self.source_col_map.get(schema_key)
                value = element.get(bq_col_name) if bq_col_name else None
                user_data.append(value)
                if value is not None:
                    has_data = True

            # Solo procesar si la fila tiene al menos un identificador válido
            if has_data:
                yield user_data
            # else:
            #    # Opcional: Contar filas omitidas si es necesario
            #    beam.metrics.Metrics.counter('main', 'omitted_rows_no_ids').inc()

        except KeyError as e:
            logging.warning(f"Se omitió una fila debido a que falta la columna esperada '{e}'. Fila: {element}")
            beam.metrics.Metrics.counter('main', 'rows_with_missing_columns').inc()
        except Exception as e:
            logging.error(f"Error inesperado formateando la fila: {element}. Error: {e}")
            beam.metrics.Metrics.counter('main', 'formatting_errors').inc()


class CallMetaApiDoFn(beam.DoFn):
    """Formatea el batch y llama a la API de Meta con reintentos."""
    def __init__(self, audience_id, token_secret_name, schema_list):
        self.audience_id = audience_id
        self.token_secret_name = token_secret_name
        self.schema_list = schema_list # Lista de strings ['EMAIL_SHA256', 'PHONE_SHA256', ...]
        self.meta_graph_url = META_GRAPH_URL
        self.max_retries = MAX_RETRIES
        self.initial_backoff = INITIAL_BACKOFF_SECS
        self.session = None
        self.meta_token = None

    def setup(self):
        # Inicializar sesión y obtener token una vez por worker/bundle
        import requests
        from google.cloud import secretmanager
        import logging

        # --- Inicialización de variables (indentadas bajo setup) ---
        self.session = None
        self.meta_token = None
        logging.info("CallMetaApiDoFn setup: Starting...")

        # --- Define la función para obtener el token LOCALMENTE dentro de setup ---
        def get_meta_token_local(secret_version_name_param):
                """Obtiene el token de Meta desde Secret Manager (versión local)."""
                logging.info(f"Intentando acceder al secreto localmente: {secret_version_name_param}")
                try:
                    client = secretmanager.SecretManagerServiceClient()
                    response = client.access_secret_version(request={"name": secret_version_name_param})
                    payload = response.payload.data.decode("UTF-8")
                    if not payload:
                        logging.error(f"El secreto {secret_version_name_param} está vacío.")
                        raise ValueError(f"El secreto recuperado está vacío: {secret_version_name_param}")
                    logging.info(f"Token de Meta obtenido localmente desde {secret_version_name_param}.")
                    return payload
                except Exception as e:
                    logging.error(f"Error específico obteniendo secreto localmente '{secret_version_name_param}': {type(e).__name__} - {e}")
                    raise RuntimeError(f"No se pudo obtener el token de Meta localmente: {e}") from e
        # --- Fin de la función local ---
        
        try:
            # Es crucial obtener el token aquí. Si falla, el worker no puede operar.
            logging.info("CallMetaApiDoFn setup: Initializing requests session...")
            self.session = requests.Session()
            self.meta_token = get_meta_token_local(self.token_secret_name)
            # ---------------------------------------------
            logging.info(f"CallMetaApiDoFn setup: Calling get_meta_token_local with: {self.token_secret_name}")
            self.meta_token = get_meta_token_local(self.token_secret_name)
            logging.info("CallMetaApiDoFn setup: Token obtained successfully.")
        except Exception as e:
            logging.critical(f"CallMetaApiDoFn setup: CRITICAL - Failed to get Meta token due to: {type(e).__name__} - {e}. Setup cannot complete.")
            self.meta_token = None # Asegurar que esté None si falló
            raise # Relanza para que el worker falle correctamente

    def process(self, batch):
        # batch es una lista de listas de datos de usuario (ej. [[hash_e1, hash_p1], [hash_e2, null], ...])
        import requests
        import logging # Para logging
        import json # Para json.dumps
        import time # Para time.sleep en reintentos
        import apache_beam as beam
        if not batch:
            logging.info("Batch vacío recibido, omitiendo llamada API.")
            return
        if not self.session or not self.meta_token:
             logging.error("Error Crítico: Sesión o Token no inicializados en process(). Omitiendo batch.")
             beam.metrics.Metrics.counter('main', 'batches_skipped_no_token').inc()
             return

        # Construye el payload para la API de Meta
        api_payload = {
            'payload': {
                'schema': self.schema_list,
                'data': batch
            }
        }
        json_payload = json.dumps(api_payload)
        headers = {
            'Authorization': f'Bearer {self.meta_token}',
            'Content-Type': 'application/json'
        }
        url = f'{self.meta_graph_url}/{self.audience_id}/users'

        current_retry = 0
        backoff = self.initial_backoff
        while current_retry <= self.max_retries:
            try:
                logging.info(f"Intentando enviar batch de {len(batch)} usuarios a audiencia {self.audience_id} (Intento {current_retry + 1})...")
                response = self.session.post(url, headers=headers, data=json_payload, timeout=90) # Timeout más largo para API

                # Éxito (200 OK)
                if response.status_code == 200:
                    logging.info(f"Batch de {len(batch)} usuarios enviado exitosamente a audiencia {self.audience_id}. Respuesta: {response.json()}")
                    beam.metrics.Metrics.counter('main', 'batches_sent_successfully').inc()
                    beam.metrics.Metrics.counter('main', 'users_processed_successfully').inc(len(batch))
                    return # Salir del bucle de reintento

                # Error manejable del cliente (4xx) - No reintentar usualmente
                elif 400 <= response.status_code < 500:
                    logging.error(f"Error Cliente ({response.status_code}) enviando batch a Meta para audiencia {self.audience_id}. Respuesta: {response.text[:1000]}. Payload (parcial): {json_payload[:500]}")
                    beam.metrics.Metrics.counter('main', 'batches_failed_client_error').inc()
                    beam.metrics.Metrics.counter('main', 'users_failed').inc(len(batch))
                    return # No reintentar errores de cliente

                # Error del servidor (5xx) o Rate Limit (429) - Reintentar
                else:
                    response.raise_for_status() # Lanza excepción para otros errores 5xx o inesperados

            except requests.exceptions.RequestException as e:
                logging.warning(f"Error de red/timeout (Intento {current_retry + 1}/{MAX_RETRIES + 1}) enviando batch a Meta: {e}")
                # Si es el último intento, loguear como error final y salir
                if current_retry == MAX_RETRIES:
                    logging.error(f"Fallo final enviando batch a Meta después de {MAX_RETRIES + 1} intentos. Error: {e}. Payload (parcial): {json_payload[:500]}")
                    beam.metrics.Metrics.counter('main', 'batches_failed_network_error').inc()
                    beam.metrics.Metrics.counter('main', 'users_failed').inc(len(batch))
                    return # Salir después del último reintento

            # Esperar antes del siguiente reintento (backoff exponencial)
            logging.info(f"Esperando {backoff} segundos antes del reintento...")
            time.sleep(backoff)
            current_retry += 1
            backoff *= 2 # Incrementar espera

    def teardown(self):
         # Limpiar sesión al finalizar el worker
         import logging # Importar para logging
         if self.session:
             self.session.close()
             logging.info("Sesión de Requests cerrada.")


# --- Función Principal del Pipeline ---
def run(argv=None):
    parser = argparse.ArgumentParser()
    # Argumentos requeridos para la lógica del pipeline
    parser.add_argument('--input_table', required=True, help='Tabla BigQuery de entrada (project:dataset.table)')
    parser.add_argument('--audience_id', required=True, help='ID de la Audiencia Personalizada de Meta')
    parser.add_argument('--token_secret_name', required=True, help='Nombre completo del recurso del secreto de Secret Manager (projects/PROJECT_ID/secrets/SECRET_ID/versions/VERSION)')
    # Argumentos para especificar columnas y schema (hace el pipeline reutilizable)
    parser.add_argument('--bq_email_column', default=None, help='Nombre de la columna BQ con email hasheado (SHA256)')
    parser.add_argument('--bq_phone_column', default=None, help='Nombre de la columna BQ con teléfono hasheado (SHA256)')
    # Añadir más argumentos si usas otros identificadores (ej. --bq_fn_column)
    parser.add_argument('--meta_schema', required=True, help='Schema de Meta como string separado por comas (ej. EMAIL_SHA256,PHONE_SHA256)')

    # Parsear argumentos conocidos del pipeline y los nuestros
    known_args, pipeline_args = parser.parse_known_args(argv)

    # Validar que al menos una columna BQ fue proporcionada
    if not known_args.bq_email_column and not known_args.bq_phone_column: # Añadir otros aquí si los agregas
        raise ValueError("Se debe especificar al menos una columna de BQ (ej. --bq_email_column o --bq_phone_column).")

    # Construir la query de BigQuery dinámicamente
    select_columns = []
    if known_args.bq_email_column:
        select_columns.append(f"`{known_args.bq_email_column}` AS email_hash")
    if known_args.bq_phone_column:
        select_columns.append(f"`{known_args.bq_phone_column}` AS phone_hash")
    # Añadir más si es necesario

    if not select_columns:
         raise ValueError("No se especificaron columnas válidas para seleccionar de BigQuery.")

    query = f"SELECT {', '.join(select_columns)} FROM `{known_args.input_table}`"
    logging.info(f"Ejecutando consulta BQ: {query}")

    # Convertir el schema string a lista
    schema_list = [s.strip().upper() for s in known_args.meta_schema.split(',') if s.strip()]
    if not schema_list:
        raise ValueError("El argumento --meta_schema no puede estar vacío y debe contener tipos válidos (ej. EMAIL_SHA256).")
    logging.info(f"Usando schema de Meta: {schema_list}")


    # Configurar opciones del pipeline (runner, project, region se pasan desde la línea de comandos)
    pipeline_options = PipelineOptions(pipeline_args, streaming=False)

    # Definir y ejecutar el pipeline
    with beam.Pipeline(options=pipeline_options) as pipeline:
        (
            pipeline
            | 'ReadFromBigQuery' >> beam.io.ReadFromBigQuery(
                query=query,
                use_standard_sql=True,
                # Optimización: Evita serializar el objeto pipeline completo a los workers
                use_json_exports=True
                )
            | 'FormatUserPayload' >> beam.ParDo(FormatUserPayloadDoFn(
                                                email_col='email_hash', # Usa los alias definidos en la query
                                                phone_col='phone_hash',
                                                meta_schema_list=schema_list))
            | 'BatchUsers' >> beam.transforms.BatchElements(
                # min_batch_size=int(META_BATCH_SIZE * 0.8), # Opcional
                max_batch_size=META_BATCH_SIZE
                )
            | 'CallMetaAPI' >> beam.ParDo(CallMetaApiDoFn(
                                                audience_id=known_args.audience_id,
                                                token_secret_name=known_args.token_secret_name,
                                                schema_list=schema_list))
        )

    logging.info("Pipeline de Dataflow completado.")

# --- Punto de Entrada ---
if __name__ == '__main__':
    # Configura el logging para que se muestre en la consola de Dataflow
    logging.getLogger().setLevel(logging.INFO)
    logging.info("Iniciando pipeline de carga de audiencia a Meta...")
    run()