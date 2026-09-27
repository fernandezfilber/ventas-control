import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Utiliza la misma clave secreta que configuraste en middleware.ts
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'ventas-control-jwt-secret-prod-2024');

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/dashboard',
  SELLER: '/seller',
  CLIENT: '/client',
  TECHNICIAN: '/',
};

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const role = payload.role as string;

    // Role guards
    if (pathname.startsWith('/dashboard') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL(ROLE_HOME[role] || '/login', request.url));
    }
    if (pathname.startsWith('/seller') && role !== 'SELLER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL(ROLE_HOME[role] || '/login', request.url));
    }
    if (pathname.startsWith('/client') && role !== 'CLIENT' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL(ROLE_HOME[role] || '/login', request.url));
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/seller/:path*', '/client/:path*'],
};
