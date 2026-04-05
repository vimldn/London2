// components/dashboard/StatCard.tsx
export function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: 'teal' }) {
  return (
    <div className="bg-white border border-protocol-border rounded-sm p-3.5">
      <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-protocol-faint mb-1.5">{label}</p>
      <p className={`font-display text-2xl font-normal leading-none mb-1 ${accent === 'teal' ? 'text-protocol-teal' : 'text-protocol-ink'}`}>{value}</p>
      <p className="font-mono text-[10px] text-protocol-faint">{sub}</p>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// components/dashboard/BookingFeed.tsx
// ─────────────────────────────────────────────────────────────
// (In your actual project, split each export into its own file.
//  Grouped here for zip delivery — see file header comments.)

type BookingStatus = 'confirmed' | 'pending_payment' | 'completed' | 'cancelled'
export interface Booking {
  id: string; booking_ref: string; guest_name: string
  check_in_a: string; total_rate: number; status: BookingStatus
}

const STATUS: Record<BookingStatus, string> = {
  confirmed:       'bg-protocol-teal-light text-protocol-teal-dark',
  pending_payment: 'bg-protocol-gold-light text-protocol-gold',
  completed:       'bg-protocol-cream-dark text-protocol-muted',
  cancelled:       'bg-red-50 text-red-600',
}

export function BookingFeed({ bookings }: { bookings: Booking[] }) {
  return (
    <div className="bg-white border border-protocol-border rounded-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-protocol-border flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-protocol-faint">Recent bookings</span>
        <a href="/dashboard/bookings" className="font-mono text-[9px] tracking-[0.08em] uppercase text-protocol-teal hover:opacity-70 transition-opacity">View all</a>
      </div>
      <div className="px-4 py-1">
        {bookings.length === 0
          ? <p className="font-display text-sm italic text-protocol-muted text-center py-6">No bookings yet this month.</p>
          : bookings.slice(0, 6).map(b => (
              <div key={b.id} className="flex items-center gap-3 py-2 border-b border-protocol-border last:border-0">
                <span className="font-mono text-[10px] text-protocol-muted w-20 shrink-0">{b.booking_ref}</span>
                <span className="text-[12px] text-protocol-ink flex-1 min-w-0 truncate">{b.guest_name}</span>
                <span className="font-mono text-[10px] text-protocol-faint shrink-0">
                  {new Date(b.check_in_a).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
                <span className="font-mono text-[11px] font-medium text-protocol-teal w-12 text-right shrink-0">£{Math.round(b.total_rate)}</span>
                <span className={`font-mono text-[8px] tracking-[0.06em] uppercase px-1.5 py-0.5 rounded-sm shrink-0 ${STATUS[b.status] ?? STATUS.completed}`}>
                  {b.status.replace('_', ' ')}
                </span>
              </div>
            ))
        }
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// components/dashboard/RateHealthCard.tsx
// ─────────────────────────────────────────────────────────────
export function RateHealthCard({ protocolRate, otaRate, commissionPct, commRecovered }: {
  protocolRate: number; otaRate: number | null; commissionPct: number; commRecovered: number
}) {
  const comm = otaRate ? Math.round(otaRate * commissionPct / 100) : null
  const save = otaRate ? Math.round(otaRate - protocolRate) : null

  return (
    <div className="bg-white border border-protocol-border rounded-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-protocol-border flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-protocol-faint">Rate health</span>
        <a href="/dashboard/rates" className="font-mono text-[9px] tracking-[0.08em] uppercase text-protocol-teal hover:opacity-70 transition-opacity">Edit rates</a>
      </div>
      <div className="px-4 py-2">
        {[
          { label: 'Your Protocol rate',       val: `£${protocolRate}`,                                                             cls: 'text-protocol-teal' },
          { label: 'Expedia / rack',            val: otaRate ? `£${otaRate}` : '—',                                                  cls: 'line-through text-protocol-faint' },
          { label: 'Commission tax per night',  val: comm ? `-£${comm}` : '—',                                                       cls: 'text-[#c0392b]' },
          { label: 'Guest saving vs. Expedia',  val: save && otaRate ? `£${save} (${Math.round(save / otaRate * 100)}%)` : '—',       cls: 'text-protocol-teal' },
        ].map(r => (
          <div key={r.label} className="flex justify-between items-baseline py-1.5 border-b border-protocol-border last:border-0">
            <span className="text-[12px] text-protocol-muted">{r.label}</span>
            <span className={`font-mono text-[12px] font-medium ${r.cls}`}>{r.val}</span>
          </div>
        ))}
      </div>
      {commRecovered > 0 && (
        <div className="px-4 pb-3 pt-1">
          <div className="flex items-center gap-2.5 bg-protocol-teal-light border border-[rgba(29,158,117,0.2)] rounded-sm px-3 py-2">
            <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-protocol-teal-dark">Commission recovered this month</span>
            <span className="font-display text-base italic text-protocol-teal ml-auto">£{commRecovered.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// components/dashboard/ConciergeChart.tsx  (async server component)
// ─────────────────────────────────────────────────────────────
import { createServerClient as createCC } from '@supabase/ssr'
import { cookies as ccCookies }           from 'next/headers'

export async function ConciergeChart({ propertyId }: { propertyId: string }) {
  const cookieStore = await ccCookies()
  const supabase = createCC(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const { data: searches } = await supabase
    .from('search_queries')
    .select('created_at, clicked_id, raw_query')
    .contains('result_ids', [propertyId])
    .gte('created_at', sevenDaysAgo)

  const days  = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().split('T')[0] })
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const buckets: Record<string, number> = Object.fromEntries(days.map(d => [d, 0]))
  ;(searches ?? []).forEach(s => { const day = s.created_at.split('T')[0]; if (buckets[day] !== undefined) buckets[day]++ })

  const maxVal = Math.max(...Object.values(buckets), 1)

  const queryTally: Record<string, number> = {}
  ;(searches ?? []).forEach(s => { queryTally[s.raw_query] = (queryTally[s.raw_query] ?? 0) + 1 })
  const topQueries = Object.entries(queryTally).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-white border border-protocol-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-protocol-border">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-protocol-faint">Concierge appearances · 7 days</span>
        </div>
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-end gap-1.5 h-16">
            {Object.entries(buckets).map(([day, count], i) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-sm transition-all duration-500 ${i >= 5 ? 'bg-protocol-teal' : 'bg-protocol-cream-dark'}`}
                  style={{ height: `${Math.max(Math.round((count / maxVal) * 56), 3)}px` }}
                />
                <span className="font-mono text-[8px] text-protocol-faint">{dayLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-protocol-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-protocol-border">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-protocol-faint">Top concierge queries</span>
        </div>
        <div className="px-4 py-1">
          {topQueries.length === 0
            ? <p className="font-display text-sm italic text-protocol-muted text-center py-4">No queries yet.</p>
            : topQueries.map(([query, count], i) => (
                <div key={query} className="flex items-center gap-2.5 py-1.5 border-b border-protocol-border last:border-0">
                  <span className={`font-mono text-[11px] font-medium w-6 shrink-0 ${i === 0 ? 'text-protocol-teal' : i === 1 ? 'text-protocol-gold' : 'text-protocol-muted'}`}>
                    #{i + 1}
                  </span>
                  <span className="text-[12px] italic text-protocol-muted flex-1 min-w-0 truncate">"{query}"</span>
                  <span className="font-mono text-[9px] text-protocol-faint shrink-0">{count}×</span>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}
