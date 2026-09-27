This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Recordatorios de pago por WhatsApp

Los asesores pueden abrir WhatsApp con un mensaje preparado para cada recibo pendiente. Para el envío automático, el cliente debe activar el consentimiento desde su portal y el asesor debe elegir el modo **Automático** en el contrato.

El envío automático necesita una cuenta de WhatsApp Business Platform, una plantilla aprobada por Meta con tres variables de cuerpo (`{{1}}` cliente, `{{2}}` monto, `{{3}}` vencimiento) y un programador externo que invoque diariamente `GET /api/cron/payment-reminders` por HTTPS con `Authorization: Bearer <CRON_SECRET>`. El endpoint solo toma recibos pendientes con vencimiento dentro de los próximos tres días y vuelve a intentar como máximo cada 24 horas.

Configura estos valores en el entorno de ejecución, no en el código:

- `CRON_SECRET`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_TEMPLATE_NAME`
- `WHATSAPP_TEMPLATE_LANGUAGE` (por defecto `es_PE`)
- `WHATSAPP_DEFAULT_COUNTRY_CODE` (por defecto `51` para Perú)
- `WHATSAPP_GRAPH_VERSION` (por defecto `v22.0`)

Después de actualizar el esquema Prisma, aplica los cambios a la base de datos con `npm exec -- prisma db push` usando un `DATABASE_URL` MySQL válido. La variable actual debe comenzar con `mysql://`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
"# ventas-control" 
