import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE = 'aw-auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/login')) return NextResponse.next();

  const token = request.cookies.get(COOKIE)?.value;
  if (token && token === process.env.AUTH_SECRET) return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts).*)'],
};
