import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json();
  const password = body.password;
  if (password !== process.env.APP_ACCESS_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: 'access_granted',
    value: 'true',
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
