// app/dashboard/layout.tsx
import { redirect }           from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies }            from 'next/headers'
import { DashboardShell }     from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: cs => cs.forEach(c => cookieStore.set(c)) } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/dashboard')

  const { data: account } = await supabase
    .from('hotel_accounts')
    .select('tier, property:properties ( id, name, borough, is_active )')
    .eq('contact_email', user.email!)
    .eq('billing_active', true)
    .single()

  if (!account) redirect('/login?next=/dashboard')

  const property = account.property as any

  return (
    <DashboardShell
      propertyName={property?.name ?? 'Your Property'}
      borough={property?.borough ?? ''}
      tier={account.tier}
      isLive={property?.is_active ?? false}
    >
      {children}
    </DashboardShell>
  )
}
