// app/dashboard/page.tsx
import { redirect }           from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies }            from 'next/headers'
import { Suspense }           from 'react'
import { StatCard }           from '@/components/dashboard/StatCard'
import { BookingFeed }        from '@/components/dashboard/BookingFeed'
import { RateHealthCard }     from '@/components/dashboard/RateHealthCard'
import { ConciergeChart }     from '@/components/dashboard/ConciergeChart'

export default async function DashboardPage() {
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
    .select('property_id, properties ( name, borough, protocol_nightly, ota_rate_cache, commission_tax_pct )')
    .eq('contact_email', user.email!)
    .single()

  if (!account) redirect('/login')

  const propertyId = account.property_id
  const property   = account.properties as any
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [bookingsRes, rateRes, searchRes] = await Promise.all([
    supabase
      .from('loop_bookings')
      .select('id, booking_ref, guest_name, check_in_a, total_rate, status, created_at')
      .or(`property_a_id.eq.${propertyId},property_b_id.eq.${propertyId}`)
      .gte('created_at', monthStart)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('latest_rate_intelligence')
      .select('protocol_rate, expedia_rate, commission_saved')
      .eq('property_id', propertyId)
      .single(),
    supabase
      .from('search_queries')
      .select('id, clicked_id')
      .contains('result_ids', [propertyId])
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
  ])

  const bookings      = bookingsRes.data  ?? []
  const rate          = rateRes.data
  const searches      = searchRes.data    ?? []
  const commRecovered = rate?.commission_saved ? Math.round(rate.commission_saved * bookings.length) : 0
  const clicks        = searches.filter(s => s.clicked_id === propertyId).length
  const ctr           = searches.length ? Math.round(clicks / searches.length * 100) : 0

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-normal">Good morning.</h1>
        <p className="text-sm text-protocol-muted font-light mt-0.5">
          {property?.name} · <span className="text-protocol-teal">Live</span>
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        <StatCard label="Commission recovered" value={`£${commRecovered.toLocaleString()}`} sub="this month" accent="teal" />
        <StatCard label="Protocol bookings"    value={String(bookings.length)}               sub="this month" />
        <StatCard label="Concierge appearances" value={String(searches.length)}              sub="last 30 days" />
        <StatCard label="Click-through rate"   value={`${ctr}%`}                            sub="of appearances" accent="teal" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BookingFeed bookings={bookings} />
        <RateHealthCard
          protocolRate={rate?.protocol_rate  ?? property?.protocol_nightly}
          otaRate={rate?.expedia_rate        ?? property?.ota_rate_cache}
          commissionPct={property?.commission_tax_pct ?? 25}
          commRecovered={commRecovered}
        />
      </div>

      <Suspense fallback={<div className="h-40 bg-protocol-cream-dark rounded-sm animate-pulse" />}>
        <ConciergeChart propertyId={propertyId} />
      </Suspense>
    </div>
  )
}
