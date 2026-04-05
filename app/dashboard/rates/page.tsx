// app/dashboard/rates/page.tsx
import { redirect }           from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies }            from 'next/headers'
import { RateEditor }         from '@/components/dashboard/DashboardShell'

export default async function RatesPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: account } = await supabase
    .from('hotel_accounts')
    .select('property_id, properties ( protocol_nightly, rack_rate, ota_rate_cache, commission_tax_pct )')
    .eq('contact_email', user.email!)
    .single()

  if (!account) redirect('/login')

  const property = account.properties as any

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-normal">Rate management</h1>
        <p className="text-sm text-protocol-muted font-light mt-0.5">
          Set your Protocol direct rate. Guests see the live comparison with Expedia.
        </p>
      </div>
      <RateEditor
        propertyId={account.property_id}
        initialRackRate={property?.rack_rate ?? property?.ota_rate_cache ?? 0}
        initialProtocolRate={property?.protocol_nightly ?? 0}
        commissionPct={property?.commission_tax_pct ?? 25}
      />
    </div>
  )
}
