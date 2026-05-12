'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE = 'aw-auth';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function loginAction(formData: FormData) {
  const password = formData.get('password') as string;

  if (!password || password !== process.env.AUTH_PASSWORD) {
    redirect('/login?error=1');
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, process.env.AUTH_SECRET!, {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect('/dashboard');
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, '', { ...COOKIE_OPTS, maxAge: 0 });
  redirect('/login');
}
