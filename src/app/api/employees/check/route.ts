import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { dni } = await req.json();

    if (!dni) {
      return NextResponse.json({ message: 'DNI es requerido' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { dni } });

    if (!employee) {
      return NextResponse.json({ status: 'NOT_FOUND', message: 'No registrado' });
    }

    return NextResponse.json({ status: employee.status, employee });
  } catch (error) {
    console.error('Error checking employee:', error);
    return NextResponse.json({ message: 'Error al verificar empleado' }, { status: 500 });
  }
}
