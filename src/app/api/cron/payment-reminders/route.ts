import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { message: 'Los recordatorios automáticos no están habilitados. Envía los avisos manualmente desde la ficha del cliente.' },
    { status: 503 },
  );
}
