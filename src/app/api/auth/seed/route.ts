import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const setupToken = process.env.ADMIN_SETUP_TOKEN;
  if (!setupToken) {
    return NextResponse.json({ message: 'La creación inicial del administrador no está habilitada.' }, { status: 503 });
  }
  if (req.headers.get('x-admin-setup-token') !== setupToken) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  if (existingAdmin) {
    return NextResponse.json({ message: 'El administrador ya está configurado.' }, { status: 409 });
  }

  try {
    const { username, password, fullName } = await req.json();
    if (typeof username !== 'string' || !username.trim() ||
      typeof password !== 'string' || password.length < 12) {
      return NextResponse.json({ message: 'Indica un usuario y una contraseña de al menos 12 caracteres.' }, { status: 400 });
    }

    const admin = await prisma.user.create({
      data: {
        username: username.trim(),
        password: await bcrypt.hash(password, 12),
        role: 'ADMIN',
        fullName: typeof fullName === 'string' ? fullName.trim() : null,
      },
      select: { id: true, username: true, role: true },
    });
    return NextResponse.json(admin, { status: 201 });
  } catch (error) {
    console.error('Error creating initial admin:', error);
    return NextResponse.json({ message: 'No se pudo crear el administrador inicial.' }, { status: 500 });
  }
}
