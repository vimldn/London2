'use server'
// app/actions/auth.ts

import { createServerClient } from '@supabase/ssr'
import { cookies }            from 'next/headers'
import { redirect }           from 'next/navigation'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: cs => cs.forEach(c => cookieStore.set(c)) } }
  )
}

export async function signInWithMagicLink(email: string): Promise<{ error: string | null }> {
  const supabase = await getSupabase()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
      shouldCreateUser: false,
    },
  })
  if (error) return { error: 'No Protocol partner account found for this email.' }
  return { error: null }
}

export async function signInWithPassword(email: string, password: string): Promise<{ error: string } | never> {
  const supabase = await getSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Invalid email or password.' }
  redirect('/dashboard')
}

export async function signOut(): Promise<never> {
  const supabase = await getSupabase()
  await supabase.auth.signOut()
  redirect('/login')
}
