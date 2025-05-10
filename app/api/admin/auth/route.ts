import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD
const ADMIN_ACCESS_KEY = process.env.NEXT_PUBLIC_ADMIN_ACCESS_KEY
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

export async function POST(request: Request) {
  try {
    const { email, password, accessKey } = await request.json()

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD || accessKey !== ADMIN_ACCESS_KEY) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await new SignJWT({ 
      email, 
      role: 'admin',
      accessKey: ADMIN_ACCESS_KEY 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(JWT_SECRET)
    
    const response = NextResponse.json({ success: true })

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    })

    return response
  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

