import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Verify employee is approved
    if (data.dni) {
      const employee = await prisma.employee.findUnique({ where: { dni: data.dni } });
      if (!employee || employee.status !== 'APPROVED') {
        return NextResponse.json({ message: 'Empleado no aprobado' }, { status: 403 });
      }
    }

    const newAttendance = await prisma.attendance.create({
      data: {
        userName: data.userName,
        dni: data.dni || null,
        photoUrl: data.photoUrl || '',
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });

    return NextResponse.json(newAttendance, { status: 201 });
  } catch (error) {
    console.error('Error creating attendance:', error);
    return NextResponse.json({ message: 'Error al crear asistencia' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const date = searchParams.get('date');

    const where: Record<string, unknown> = {};

    if (name) {
      where.userName = { contains: name };
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const attendances = await prisma.attendance.findMany({
      where,
      orderBy: { id: 'desc' },
    });

    return NextResponse.json(attendances);
  } catch (error) {
    console.error('Error fetching attendances:', error);
    return NextResponse.json({ message: 'Error al obtener asistencias' }, { status: 500 });
  }
}
