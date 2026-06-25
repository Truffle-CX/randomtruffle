"""Rutina de verificación de acceso al export de GA4 en BigQuery.

Primer paso del proceso de DQR (Data Quality Report): confirmar que tenemos
acceso de lectura al dataset de GA4 antes de ejecutar cualquier chequeo de
calidad de datos.

Contexto:
    - Proyecto de datos (donde vive el export):  mipedidoepura-a48cd
    - Dataset de GA4:                            analytics_153110043
    - Service account con acceso:                reader@gepp-ia-mkt.iam.gserviceaccount.com

Hay dos formas de autenticarse, ambas soportadas por este script:

1) Impersonando el service account (recomendado, no requiere bajar la llave):
   El usuario / SA que corre el script debe tener el rol
   "Service Account Token Creator" sobre reader@gepp-ia-mkt.iam.gserviceaccount.com.

       gcloud auth application-default login
       python check_access.py --impersonate reader@gepp-ia-mkt.iam.gserviceaccount.com

2) Con una llave JSON del service account:

       python check_access.py --key-file /ruta/a/reader-key.json
       # o exportando GOOGLE_APPLICATION_CREDENTIALS

Notas sobre proyectos:
    - El dataset se lee del proyecto de datos (--project, default mipedidoepura-a48cd).
    - Los jobs/consultas de BigQuery se facturan al "billing project"
      (--billing-project, default gepp-ia-mkt, el proyecto dueño del SA).
      El SA necesita roles/bigquery.jobUser en el billing project y
      roles/bigquery.dataViewer sobre el dataset destino.
"""

import argparse
import logging
import re
import sys

from google.cloud import bigquery
from google.api_core import exceptions as gcp_exceptions

# --- Constantes / defaults del proyecto ---
DEFAULT_DATA_PROJECT = "mipedidoepura-a48cd"
DEFAULT_DATASET = "analytics_153110043"
DEFAULT_BILLING_PROJECT = "gepp-ia-mkt"
DEFAULT_SERVICE_ACCOUNT = "reader@gepp-ia-mkt.iam.gserviceaccount.com"
DEFAULT_LOCATION = "US"  # Los exports de GA4 suelen estar en la multi-region US

# Scope mínimo necesario para leer BigQuery
BQ_SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]

# Patrones de tablas que genera el export de GA4
GA4_DAILY_RE = re.compile(r"^events_(\d{8})$")
GA4_INTRADAY_RE = re.compile(r"^events_intraday_(\d{8})$")


def build_credentials(args):
    """Construye las credenciales según la forma de autenticación elegida.

    Devuelve un objeto de credenciales o None para usar Application Default
    Credentials (ADC) tal cual.
    """
    if args.key_file:
        from google.oauth2 import service_account

        logging.info("Autenticando con llave JSON: %s", args.key_file)
        return service_account.Credentials.from_service_account_file(
            args.key_file, scopes=BQ_SCOPES
        )

    if args.impersonate:
        from google.auth import default as google_auth_default
        from google.auth import impersonated_credentials

        logging.info("Autenticando por impersonación de: %s", args.impersonate)
        source_credentials, _ = google_auth_default()
        return impersonated_credentials.Credentials(
            source_credentials=source_credentials,
            target_principal=args.impersonate,
            target_scopes=BQ_SCOPES,
        )

    logging.info(
        "Sin --key-file ni --impersonate: usando Application Default Credentials (ADC)."
    )
    return None  # bigquery.Client usará ADC


def build_client(args):
    """Crea el cliente de BigQuery facturando al billing project."""
    credentials = build_credentials(args)
    return bigquery.Client(
        project=args.billing_project,
        credentials=credentials,
        location=args.location,
    )


def confirm_dataset(client, data_project, dataset_id):
    """Paso 1: confirmar que el dataset existe y es accesible."""
    dataset_ref = f"{data_project}.{dataset_id}"
    logging.info("Verificando acceso al dataset: %s", dataset_ref)
    dataset = client.get_dataset(dataset_ref)  # lanza NotFound/Forbidden si falla
    print("\n[OK] Dataset accesible")
    print(f"     Referencia : {dataset.project}.{dataset.dataset_id}")
    print(f"     Ubicación  : {dataset.location}")
    if dataset.description:
        print(f"     Descripción: {dataset.description}")
    return dataset


def summarize_tables(client, dataset):
    """Paso 2: listar tablas y resumir la cobertura del export de GA4."""
    tables = list(client.list_tables(dataset))
    daily_dates = []
    intraday_dates = []
    other_tables = []

    for table in tables:
        m_daily = GA4_DAILY_RE.match(table.table_id)
        m_intraday = GA4_INTRADAY_RE.match(table.table_id)
        if m_daily:
            daily_dates.append(m_daily.group(1))
        elif m_intraday:
            intraday_dates.append(m_intraday.group(1))
        else:
            other_tables.append(table.table_id)

    print("\n[OK] Inventario de tablas")
    print(f"     Total de tablas                : {len(tables)}")
    print(f"     Tablas diarias (events_*)      : {len(daily_dates)}")
    print(f"     Tablas intraday (events_intraday_*): {len(intraday_dates)}")
    print(f"     Otras tablas                   : {len(other_tables)}")

    if daily_dates:
        daily_dates.sort()
        print(
            f"     Rango de fechas (diarias)      : {daily_dates[0]} -> {daily_dates[-1]}"
        )
    if intraday_dates:
        intraday_dates.sort()
        print(
            f"     Intraday disponible            : {intraday_dates[0]} -> {intraday_dates[-1]}"
        )
    if other_tables:
        muestra = ", ".join(sorted(other_tables)[:10])
        print(f"     Ejemplos de otras tablas       : {muestra}")

    return {
        "total": len(tables),
        "daily_dates": daily_dates,
        "intraday_dates": intraday_dates,
        "other_tables": other_tables,
    }


def confirm_query_permission(client, data_project, dataset_id):
    """Paso 3: ejecutar una consulta mínima para confirmar permiso de jobs.

    Usa INFORMATION_SCHEMA.TABLES, que no escanea datos (0 bytes facturados)
    pero sí requiere poder lanzar un job de consulta.
    """
    query = f"""
        SELECT COUNT(*) AS num_tablas
        FROM `{data_project}.{dataset_id}.INFORMATION_SCHEMA.TABLES`
    """
    logging.info("Ejecutando consulta de prueba contra INFORMATION_SCHEMA...")
    job = client.query(query)
    rows = list(job.result())
    num = rows[0].num_tablas if rows else 0
    print("\n[OK] Permiso de consulta (job) confirmado")
    print(f"     Billing project usado : {client.project}")
    print(f"     Job ID                : {job.job_id}")
    print(f"     Bytes facturados      : {job.total_bytes_billed or 0}")
    print(f"     Tablas vía query      : {num}")
    return num


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Verifica el acceso de lectura al export de GA4 en BigQuery."
    )
    parser.add_argument("--project", default=DEFAULT_DATA_PROJECT,
                        help="Proyecto de datos donde vive el dataset de GA4.")
    parser.add_argument("--dataset", default=DEFAULT_DATASET,
                        help="ID del dataset de GA4 (ej. analytics_153110043).")
    parser.add_argument("--billing-project", default=DEFAULT_BILLING_PROJECT,
                        help="Proyecto al que se facturan los jobs de BigQuery.")
    parser.add_argument("--location", default=DEFAULT_LOCATION,
                        help="Ubicación/region del dataset (ej. US, EU).")
    parser.add_argument("--key-file", default=None,
                        help="Ruta a la llave JSON del service account.")
    parser.add_argument("--impersonate", default=None,
                        help=("Email del service account a impersonar "
                              f"(ej. {DEFAULT_SERVICE_ACCOUNT})."))
    parser.add_argument("--skip-query", action="store_true",
                        help="Omite el paso 3 (consulta de prueba).")
    return parser.parse_args(argv)


def main(argv=None):
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    args = parse_args(argv)

    print("=" * 64)
    print(" Verificación de acceso al export de GA4 (DQR - paso 0)")
    print("=" * 64)
    print(f" Proyecto de datos : {args.project}")
    print(f" Dataset           : {args.dataset}")
    print(f" Billing project   : {args.billing_project}")
    print(f" Ubicación         : {args.location}")

    try:
        client = build_client(args)
        confirm_dataset(client, args.project, args.dataset)
        summarize_tables(client, f"{args.project}.{args.dataset}")
        if not args.skip_query:
            confirm_query_permission(client, args.project, args.dataset)
    except gcp_exceptions.NotFound as e:
        print("\n[ERROR] No se encontró el dataset o proyecto.")
        print(f"        Detalle: {e}")
        return 2
    except gcp_exceptions.Forbidden as e:
        print("\n[ERROR] Acceso denegado. Revisa los roles del service account:")
        print("        - roles/bigquery.dataViewer sobre el dataset destino")
        print("        - roles/bigquery.jobUser en el billing project")
        print(f"        Detalle: {e}")
        return 3
    except Exception as e:  # noqa: BLE001 - queremos un mensaje claro al usuario
        print(f"\n[ERROR] Falló la verificación: {type(e).__name__}: {e}")
        return 1

    print("\n" + "=" * 64)
    print(" RESULTADO: acceso CONFIRMADO. Listo para correr el DQR.")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    sys.exit(main())
