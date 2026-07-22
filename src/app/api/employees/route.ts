import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ message: 'Error al obtener empleados' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, dni } = await req.json();

    if (!name || !dni) {
      return NextResponse.json({ message: 'Nombre y DNI son requeridos' }, { status: 400 });
    }

    const existing = await prisma.employee.findUnique({ where: { dni } });
    if (existing) {
      return NextResponse.json({ message: 'Ya existe un empleado con ese DNI', employee: existing }, { status: 409 });
    }

    const employee = await prisma.employee.create({
      data: { name, dni, status: 'PENDING' },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ message: 'Error al registrar empleado' }, { status: 500 });
  }
}
