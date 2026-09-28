import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      select: { id: true, name: true, dni: true, status: true, createdAt: true },
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
    const { name, dni, password } = await req.json();

    if (!name || !dni || !password) {
      return NextResponse.json({ message: 'Nombre, DNI y contraseña son requeridos' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ message: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    const existing = await prisma.employee.findUnique({
      where: { dni: dni.trim() },
      select: { id: true, name: true, dni: true, status: true, createdAt: true },
    });
    if (existing) {
      return NextResponse.json({ message: 'Ya existe un empleado con ese DNI', employee: existing }, { status: 409 });
    }

    const employee = await prisma.employee.create({
      data: {
        name: name.trim(),
        dni: dni.trim(),
        passwordHash: await bcrypt.hash(password, 10),
        status: 'PENDING',
      },
      select: { id: true, name: true, dni: true, status: true, createdAt: true },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ message: 'Error al registrar empleado' }, { status: 500 });
  }
}
