# DQR - GA4 export en BigQuery

Proceso de **Data Quality Report (DQR)** sobre el export de Google Analytics 4
alojado en BigQuery.

| Parámetro              | Valor                                            |
|------------------------|--------------------------------------------------|
| Proyecto de datos      | `mipedidoepura-a48cd`                             |
| Dataset GA4            | `analytics_153110043`                            |
| Service account lector | `reader@gepp-ia-mkt.iam.gserviceaccount.com`     |
| Billing project        | `gepp-ia-mkt` (proyecto dueño del SA)            |

## Paso 0 — Confirmar acceso (`check_access.py`)

Antes de cualquier chequeo de calidad, esta rutina confirma que tenemos lectura
sobre el dataset. Hace 3 cosas:

1. **Dataset accesible** — `get_dataset()` confirma que existe y es visible.
2. **Inventario de tablas** — lista tablas, cuenta `events_*` / `events_intraday_*`
   y reporta el rango de fechas del export.
3. **Permiso de job** — corre una consulta mínima contra `INFORMATION_SCHEMA`
   (0 bytes facturados) para confirmar que el SA puede lanzar consultas.

### Instalación

```bash
python -m venv venv && source venv/bin/activate
pip install -r dqr/requirements.txt
```

### Autenticación

**Opción A — Impersonar el service account (recomendado).**
Tu identidad necesita el rol *Service Account Token Creator* sobre el SA lector.

```bash
gcloud auth application-default login
python dqr/check_access.py --impersonate reader@gepp-ia-mkt.iam.gserviceaccount.com
```

**Opción B — Con llave JSON del service account.**

```bash
python dqr/check_access.py --key-file /ruta/a/reader-key.json
# o:  export GOOGLE_APPLICATION_CREDENTIALS=/ruta/a/reader-key.json
#     python dqr/check_access.py
```

Con los valores por defecto ya apunta a `mipedidoepura-a48cd` /
`analytics_153110043`, así que basta con indicar cómo autenticarte.

### Flags útiles

| Flag                  | Default               | Descripción                          |
|-----------------------|-----------------------|--------------------------------------|
| `--project`           | `mipedidoepura-a48cd` | Proyecto de datos del export.        |
| `--dataset`           | `analytics_153110043` | Dataset de GA4.                      |
| `--billing-project`   | `gepp-ia-mkt`         | Proyecto que factura los jobs.       |
| `--location`          | `US`                  | Region del dataset (`US`, `EU`, …).  |
| `--impersonate`       | —                     | Email del SA a impersonar.           |
| `--key-file`          | —                     | Ruta a la llave JSON.                |
| `--skip-query`        | off                   | Omite el paso 3 (job de prueba).     |

### Roles requeridos por el SA lector

- `roles/bigquery.dataViewer` sobre el dataset `analytics_153110043`.
- `roles/bigquery.jobUser` en el billing project (`gepp-ia-mkt`).

### Códigos de salida

| Código | Significado                                  |
|--------|----------------------------------------------|
| `0`    | Acceso confirmado.                           |
| `1`    | Error genérico.                              |
| `2`    | Dataset/proyecto no encontrado (NotFound).   |
| `3`    | Acceso denegado (Forbidden) — revisar roles. |
