import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Default to dashboard, but allow 'next' param to override
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()

    // Create a Server Client to handle the cookie exchange securely
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    
    // Exchange the Auth Code for a Session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Success! Redirect user to the dashboard
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If something failed, send them back to login with an error
  return NextResponse.redirect(`${origin}/?error=auth_code_error`)
}