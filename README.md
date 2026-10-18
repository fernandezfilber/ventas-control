# ForwardVision — Control de clientes y pagos

Aplicación web responsive para administrar asesores, clientes, contratos de servicio, mensualidades y pagos.

## Puesta en marcha

1. Instala dependencias: `npm install`.
2. Configura `DATABASE_URL` para MySQL, un `JWT_SECRET` aleatorio y `ADMIN_SETUP_TOKEN` para habilitar el registro inicial del administrador.
3. Actualiza el cliente y el esquema de Prisma: `npm exec -- prisma generate` y `npm exec -- prisma db push`.
4. Inicia el proyecto con `npm run dev`.

La cuenta administrativa se crea una sola vez mediante `POST /api/auth/seed`, enviando el token en la cabecera `x-admin-setup-token` y un usuario/contraseña propios en el cuerpo. La contraseña inicial debe tener al menos 12 caracteres. No expongas credenciales, tokens ni archivos `.env` en el repositorio.

## Roles y flujo

- **Administrador:** registra asesores y consulta las ventas globales por día o mes, además de contratos.
- **Asesor:** registra y administra su cartera de clientes, importa hojas Excel, descarga listas y confirma pagos recibidos.
- **Cliente:** consulta su mensualidad, contrato y pagos; puede firmar y descargar el contrato en PDF.

Las cuentas nuevas de clientes usan el DNI como usuario y contraseña inicial. El asesor debe comunicarlo al cliente y recomendar que cambie la contraseña. Al registrar un cliente instalado, ingresa su fecha real de instalación; esta fecha inicia el contrato y determina el día de vencimiento de sus mensualidades.

## WhatsApp

Los recordatorios se envían manualmente desde la ficha del cliente: el botón abre WhatsApp con un mensaje preparado y el asesor debe revisarlo y enviarlo desde la cuenta iniciada en el dispositivo. Contacto de ForwardVision: **+51 955 318 590**.

El envío automático todavía no está habilitado. La automatización solicitada (cinco días antes del vencimiento y el mismo día) requiere WhatsApp Business Platform/Cloud API, consentimiento explícito del cliente, plantillas aprobadas por Meta y una tarea programada diaria en el servidor. Una cuenta personal o la aplicación WhatsApp Business no permiten automatizar mensajes desde el servidor.

## Estado del contrato

El PDF contiene las condiciones solicitadas: permanencia mínima de tres meses, cargo indicado de S/ 100.00 por cancelación anticipada y responsabilidad por reparación comprobable de materiales dañados por uso indebido o negligencia. La empresa aún debe incorporar RUC, domicilio legal y logo; por eso el PDF se identifica expresamente como borrador y debe revisarse antes de usarse como contrato definitivo.

## Excel de clientes

La primera hoja del archivo debe incluir estas columnas: `nombres`, `dni`, `telefono`, `direccion`, `plan` y `mensualidad`. Cada fila válida genera una cuenta de cliente, contrato y tres mensualidades.

## Despliegue en Docker

Configura un archivo `.env` en el servidor con las credenciales de MySQL y un `JWT_SECRET` aleatorio. No lo subas al repositorio. La aplicación se conecta a `mysql_central:3306` y Redis en `redis_central:6379` dentro de la red Docker externa `shared-infra`.

`TRAEFIK_ACME_EMAIL` pertenece al servicio central de Traefik; configúralo en el resolver ACME correspondiente. Después de definir las variables privadas, ejecuta `docker-compose up --build -d`.
