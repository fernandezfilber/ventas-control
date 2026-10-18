# ForwardVision — Control de clientes y pagos

Aplicación web responsive para administrar asesores, clientes, contratos de servicio, mensualidades y pagos.

## Puesta en marcha

1. Instala dependencias: `npm install`.
2. Configura `DATABASE_URL` para MySQL, un `JWT_SECRET` aleatorio y `ADMIN_SETUP_TOKEN` para habilitar el registro inicial del administrador.
3. Actualiza el cliente de Prisma: `npm exec -- prisma generate`. Para desarrollo local puedes sincronizar el esquema con `npm exec -- prisma db push`.
4. Inicia el proyecto con `npm run dev`.

La cuenta administrativa se crea una sola vez mediante `POST /api/auth/seed`, enviando el token en la cabecera `x-admin-setup-token` y un usuario/contraseña propios en el cuerpo. La contraseña inicial debe tener al menos 12 caracteres. No expongas credenciales, tokens ni archivos `.env` en el repositorio.

## Roles y flujo

- **Administrador:** registra asesores y consulta las ventas globales por día o mes, además de contratos.
- **Asesor:** registra y administra su cartera de clientes, importa hojas Excel, descarga listas y confirma pagos recibidos.
- **Cliente:** consulta su mensualidad, contrato y pagos; puede firmar y descargar el contrato en PDF.

Las cuentas nuevas de clientes usan el DNI como usuario y contraseña inicial. El asesor debe comunicarlo al cliente y recomendar que cambie la contraseña. Al registrar un cliente instalado, ingresa su fecha real de instalación; esta fecha inicia el contrato y determina el día de vencimiento de sus mensualidades.

## Lista de clientes

La lista muestra todos los clientes por defecto y permite buscar o filtrar por mes. Los estados se marcan en rojo para pagos vencidos, amarillo para vencimientos dentro de cinco días y verde para clientes al día. En móvil se muestra un resumen compacto; en escritorio se incluyen también DNI, teléfono, plan, dirección y vencimiento.

## Recordatorios automáticos por WhatsApp

La aplicación usa Evolution API con Baileys (sesión vinculada a WhatsApp Web), no WhatsApp Cloud API. Es una integración no oficial: WhatsApp puede desconectar o restringir la cuenta y no hay garantía de disponibilidad. El volumen bajo no elimina ese riesgo. Para producción, usa un número dedicado y no el número personal principal.

El primer mes se registra como pagado al crear el contrato, porque el pago se cobra por adelantado. Los meses segundo y tercero quedan pendientes y son los únicos recibos programados; después del tercer mes no se generan más mensualidades ni recordatorios automáticamente. El cliente debe activar su consentimiento en **Pagos**; por defecto está desactivado y puede retirarlo en cualquier momento desde la misma pantalla. Solo se envían avisos para recibos pendientes cinco días antes y el día del vencimiento. Los avisos salen de forma secuencial, con una pausa aleatoria de 5 a 15 segundos entre mensajes para no enviarlos todos a la vez. Una ejecución puede tardar hasta unos 25 minutos si hay 100 mensajes; programa un solo cron diario y evita ejecuciones simultáneas.

Cada aviso permite responder **SALIR** para darse de baja. Evolution API debe enviar el evento `MESSAGES_UPSERT` al webhook privado de la aplicación para desactivar los avisos del número remitente. También pueden desactivarse en **Pagos**. El envío requiere que la instancia `forwardvision` de Evolution API esté conectada y que el cron diario esté configurado. Contacto de ForwardVision: **+51 955 318 590**.

Las imágenes enviadas por WhatsApp desde el número registrado del cliente se guardan como capturas pendientes para que el asesor las revise en la ficha. Recibir una imagen no confirma un pago ni detiene los avisos: el asesor debe comprobar el abono y aprobar la captura asociándola a un recibo, o registrar manualmente el pago. En ambos casos, al quedar el recibo marcado pagado, cesan sus recordatorios. Si hay varios recibos pendientes, la captura queda sin asociación y el asesor debe elegir el correcto. Las capturas se almacenan en MySQL; la lectura está protegida por la sesión del asesor.

## Estado del contrato

El PDF contiene las condiciones solicitadas: permanencia mínima de tres meses, cargo indicado de S/ 100.00 por cancelación anticipada y responsabilidad por reparación comprobable de materiales dañados por uso indebido o negligencia. La empresa aún debe incorporar RUC, domicilio legal y logo; por eso el PDF se identifica expresamente como borrador y debe revisarse antes de usarse como contrato definitivo.

## Excel de clientes

La primera hoja del archivo debe incluir estas columnas: `nombres`, `dni`, `telefono`, `direccion`, `plan` y `mensualidad`. Cada fila válida genera una cuenta de cliente, contrato y tres mensualidades.

## Despliegue en Docker

Configura un archivo `.env` en el servidor con las credenciales de MySQL, un `JWT_SECRET` aleatorio, un `CRON_SECRET` aleatorio y un `EVOLUTION_API_KEY` aleatorio (el mismo valor autentica a Evolution API y a la aplicación). No lo subas al repositorio. La aplicación se conecta a la base `ventas_control` en el servidor MySQL `mysql_central:3306` y Redis en `redis_central:6379` dentro de la red Docker externa `shared-infra`. Evolution API comparte ese servicio Redis usando la contraseña `REDIS_PASSWORD` del `.env` y un prefijo de caché propio (`evolution`). No hace falta crear otro contenedor Redis. Evolution API puede usar el mismo servidor MySQL, pero debe conectarse a una base separada (en este despliegue, `evolution_db`) y un usuario dedicado; no apuntes Evolution a `ventas_control`.

Antes de desplegar Evolution por primera vez, crea una base vacía y un usuario con permisos solo sobre esa base en el servidor MySQL. Por ejemplo, en una sesión MySQL administrativa:

```sql
CREATE DATABASE evolution_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'evolution'@'%' IDENTIFIED BY 'REEMPLAZA_CON_UNA_CLAVE_ALEATORIA';
GRANT ALL PRIVILEGES ON evolution_db.* TO 'evolution'@'%';
```

Pon la URI correspondiente en `EVOLUTION_DATABASE_URL` del `.env` privado (por ejemplo, `mysql://evolution:CLAVE_CODIFICADA@mysql_central:3306/evolution_db`); codifica los caracteres reservados de la contraseña para URL. Si `evolution_db` ya existe, no ejecutes `CREATE DATABASE` de nuevo. Evolution creará sus tablas en esa base durante el arranque. Si los logs muestran `ventas_control`, el contenedor aún está usando una configuración antigua o se está desplegando otro archivo Compose: corrige esa conexión antes de reintentar. No borres tablas ni ejecutes un baseline sobre `ventas_control`.

Después del primer despliegue, crea la instancia Baileys `forwardvision` en Evolution API (`POST /instance/create`, con `instanceName: "forwardvision"`, `integration: "WHATSAPP-BAILEYS"` y `qrcode: true`), solicita la conexión con `GET /instance/connect/forwardvision` y escanea el QR con el teléfono dedicado. Autentica las solicitudes a Evolution API con el encabezado `apikey` y `EVOLUTION_API_KEY`. Mantén el dispositivo conectado y comprueba que la instancia esté en línea. No expongas la API públicamente sin protegerla.

Configura en esa instancia un webhook de mensajes entrantes (`MESSAGES_UPSERT`) con `webhook_by_events: false` y `webhook_base64: true`, que apunte a `http://ventas-app:3000/api/whatsapp/evolution-webhook/EVOLUTION_WEBHOOK_SECRET`. Sustituye el último segmento por el valor de `EVOLUTION_WEBHOOK_SECRET` del `.env`; la URL privada usa el nombre del contenedor en la red Docker compartida. La clave aleatoria protege el endpoint; el manejador procesa respuestas `SALIR` e imágenes entrantes directas. Las imágenes mayores de 6 MB o sin su contenido Base64 se ignoran y no detienen recordatorios.

Antes de iniciar la versión nueva, aplica la migración aditiva a la base MySQL existente:

```bash
docker compose --profile migrations run --rm prisma-migrate
```

Después despliega con `docker-compose up --build -d`. Programa el endpoint para ejecutarse diariamente, por ejemplo a las 9:00 a. m. hora de Perú, enviando el secreto como `Authorization: Bearer`:

```cron
CRON_TZ=America/Lima
0 9 * * * curl --fail --silent --show-error -X POST -H "Authorization: Bearer TU_CRON_SECRET" https://ventas.forwardvision.cloud/api/cron/payment-reminders
```

El endpoint reporta errores de conexión o envío y acepta reintentos; los avisos enviados correctamente quedan registrados para no repetirlos. `TRAEFIK_ACME_EMAIL` pertenece al servicio central de Traefik; configúralo en el resolver ACME correspondiente.
