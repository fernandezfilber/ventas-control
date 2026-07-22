import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' },
    });

    if (existingAdmin) {
      return NextResponse.json({ message: 'El usuario admin ya existe' });
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    return NextResponse.json({ message: 'Usuario admin creado exitosamente', userId: admin.id });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ message: 'Error al crear usuario admin' }, { status: 500 });
  }
}
