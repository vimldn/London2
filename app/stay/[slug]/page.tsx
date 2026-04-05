// app/stay/[slug]/page.tsx
import type { Metadata }            from 'next'
import { notFound }                  from 'next/navigation'
import { createServerClient }        from '@supabase/ssr'
import { createClient }              from '@supabase/supabase-js'
import { cookies }                   from 'next/headers'
import { Suspense }                  from 'react'
import { BookingWidget }             from '@/components/property/BookingWidget'
import { CommissionVerifierServer }  from '@/components/commission/CommissionVerifierServer'
import { generatePropertySchema }    from '@/lib/schema/property-jsonld'

// ── Next.js 16: params is a Promise ──────────────────────────
type Params       = Promise<{ slug: string }>
type SearchParams  = Promise<{ checkIn?: string; checkOut?: string; guests?: string }>

// ── generateStaticParams: build-time, no cookies, use service role ──
export async function generateStaticParams() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from('properties')
    .select('slug')
    .eq('is_active', true)
  return (data ?? []).map(p => ({ slug: p.slug }))
}

// ── Data fetch: request-time, use SSR client with cookies ────
async function getProperty(slug: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data } = await supabase
    .from('properties')
    .select(`
      id, slug, name, tagline, borough, postcode,
      protocol_nightly, rack_rate, ota_rate_cache, commission_tax_pct,
      aeo_headline, readaway_keywords, schema_type, is_verified,
      past_lives ( former_use, era, original_name, retained_features, salvage_story, heritage_listing, salvaged_stay_score ),
      vibe_metrics ( vibe, score, reading_nook_present, circadian_lighting ),
      property_tags ( experience_tags ( tag, category ) )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  return data
}

async function getRelatedLoop(propertyId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data } = await supabase
    .from('neighbourhood_swaps')
    .select(`
      slug, name, contrast_thesis, loop_rate, nights_a, nights_b,
      property_a:properties!neighbourhood_swaps_property_a_id_fkey ( name, borough ),
      property_b:properties!neighbourhood_swaps_property_b_id_fkey ( name, borough )
    `)
    .or(`property_a_id.eq.${propertyId},property_b_id.eq.${propertyId}`)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  return data
}

// ── generateMetadata: async params ───────────────────────────
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const p = await getProperty(slug)
  if (!p) return {}
  const borough = fmt(p.borough)
  const pl      = p.past_lives?.[0]?.former_use
  return {
    title:       `${p.name} | The London Protocol`,
    description: p.aeo_headline ?? `${p.tagline} — Book direct from £${p.protocol_nightly}. Zero commission. ${borough}.`,
    keywords:    [p.name, `${borough} boutique hotel`, ...(pl ? [`converted ${fmt(pl).toLowerCase()} hotel London`] : []), 'Salvaged Stay London'],
    alternates:  { canonical: `https://londonprotocol.com/stay/${slug}` },
  }
}

// ── Page ──────────────────────────────────────────────────────
export default async function StayPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { slug }                          = await params
  const { checkIn, checkOut, guests = '2' } = await searchParams

  const property = await getProperty(slug)
  if (!property) notFound()

  const [loop] = await Promise.all([getRelatedLoop(property.id)])

  const checkInDate  = checkIn  ?? tomorrow()
  const checkOutDate = checkOut ?? addDays(checkInDate, 2)
  const allTags      = property.property_tags?.map((t: any) => t.experience_tags?.tag).filter(Boolean) ?? []
  const pastLife     = property.past_lives?.[0]
  const commAmt      = property.ota_rate_cache
    ? Math.round(property.ota_rate_cache * (property.commission_tax_pct / 100))
    : null

  const schema = generatePropertySchema({
    property: {
      id: property.id, slug: property.slug, name: property.name,
      tagline: property.tagline, borough: property.borough,
      protocolNightly: property.protocol_nightly, otaRateCache: property.ota_rate_cache,
      commissionTaxPct: property.commission_tax_pct, commissionSaved: null,
      pastLife: pastLife?.former_use ?? null, retainedFeatures: pastLife?.retained_features ?? [],
      salvagedStayScore: pastLife?.salvaged_stay_score ?? null,
      matchedTags: allTags, similarity: 1, aeoHeadline: property.aeo_headline,
      schemaType: property.schema_type, primaryVibe: property.vibe_metrics?.[0]?.vibe ?? null,
      vibeScore: property.vibe_metrics?.[0]?.score ?? null,
    } as any,
    checkIn: checkInDate, checkOut: checkOutDate,
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <main className="bg-protocol-cream min-h-screen">
        <div className="max-w-[900px] mx-auto px-6 pb-20">

          <nav className="py-4">
            <a href="/" className="font-mono text-[10px] tracking-[0.08em] uppercase text-protocol-faint hover:text-protocol-muted transition-colors">
              ← Browse stays
            </a>
          </nav>

          <div className="grid grid-cols-[1fr_300px] gap-8 items-start mb-8">
            <div>
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Chip cls="bg-protocol-cream-dark text-protocol-muted">{fmt(property.borough)}</Chip>
                {pastLife && <Chip cls="bg-[#e8e0f0] text-[#4a2d82]">{fmt(pastLife.former_use)}</Chip>}
                {property.vibe_metrics?.[0] && <Chip cls="bg-protocol-gold-light text-protocol-gold">{fmt(property.vibe_metrics[0].vibe)}</Chip>}
                {pastLife?.heritage_listing && <Chip cls="bg-protocol-cream-dark text-protocol-gold">{pastLife.heritage_listing}</Chip>}
                {property.is_verified && <Chip cls="bg-protocol-teal-light text-protocol-teal-dark">Protocol Verified</Chip>}
              </div>

              <h1 className="font-display text-[2.1rem] font-normal leading-tight mb-2">{property.name}</h1>
              {property.tagline && (
                <p className="font-display text-lg italic text-protocol-muted mb-4 leading-relaxed">{property.tagline}</p>
              )}
              {property.aeo_headline && (
                <p className="font-mono text-[10px] tracking-[0.08em] text-protocol-faint leading-relaxed mb-5 max-w-[480px]">
                  {property.aeo_headline}
                </p>
              )}

              {/* Image grid */}
              <div className="grid grid-cols-2 gap-1 mb-6 rounded-sm overflow-hidden" style={{ gridTemplateRows: 'auto auto' }}>
                <div className="bg-protocol-cream-dark flex items-center justify-center" style={{ gridRow: '1/3', height: 220 }}>
                  <span className="font-mono text-[8px] tracking-[0.1em] uppercase text-protocol-faint">Common room</span>
                </div>
                <div className="bg-protocol-cream-dark flex items-center justify-center" style={{ height: 107 }}>
                  <span className="font-mono text-[8px] tracking-[0.1em] uppercase text-protocol-faint">Room</span>
                </div>
                <div className="bg-protocol-cream-dark flex items-center justify-center" style={{ height: 107 }}>
                  <span className="font-mono text-[8px] tracking-[0.1em] uppercase text-protocol-faint">Courtyard</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-6">
                {allTags.map((tag: string) => (
                  <span key={tag} className="font-mono text-[9px] tracking-[0.06em] uppercase px-2 py-1 bg-protocol-teal-light text-protocol-teal-dark rounded-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Booking widget — client component */}
            <div className="sticky top-5">
              <BookingWidget
                propertySlug={property.slug}
                protocolRate={property.protocol_nightly}
                otaRate={property.ota_rate_cache ?? property.rack_rate}
                commissionPct={property.commission_tax_pct}
                defaultCheckIn={checkInDate}
                defaultCheckOut={checkOutDate}
                defaultGuests={parseInt(guests)}
              />
            </div>
          </div>

          {/* Commission strip */}
          {commAmt && (
            <div className="flex items-center justify-between bg-[#fdf0ef] border border-[rgba(192,57,43,0.12)] rounded-sm px-4 py-2.5 mb-7">
              <span className="font-mono text-[10px] text-[#c0392b]">£{commAmt} Expedia commission tax avoided per night</span>
              <span className="font-mono text-[10px] font-medium text-protocol-teal">Book direct · save every time</span>
            </div>
          )}

          {/* Commission verifier — server prefetch wrapper */}
          <Section label="Rate verification">
            <Suspense fallback={<div className="h-48 bg-protocol-cream-dark rounded-sm animate-pulse" />}>
              <CommissionVerifierServer
                propertyId={property.id}
                propertyName={property.name}
                checkIn={checkInDate}
                checkOut={checkOutDate}
              />
            </Suspense>
          </Section>

          {/* Salvaged Stay */}
          {pastLife && (
            <Section label="Salvaged Stay profile">
              <div className="bg-white border border-protocol-border border-l-[3px] border-l-[#9b59b6] rounded-sm p-4">
                <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-[#6c3483] mb-3">
                  Past life · {fmt(pastLife.former_use)}{pastLife.era ? ` · ${pastLife.era}` : ''}{pastLife.heritage_listing ? ` · ${pastLife.heritage_listing}` : ''}
                </p>
                {pastLife.original_name && <p className="font-display text-lg font-normal mb-2">{pastLife.original_name}</p>}
                {pastLife.salvage_story && <p className="text-[13px] text-protocol-muted leading-relaxed mb-3 font-light">{pastLife.salvage_story}</p>}
                {pastLife.retained_features?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {pastLife.retained_features.map((f: string) => (
                      <span key={f} className="text-[11px] text-[#6c3483] bg-[#f0e8f8] px-2 py-0.5 rounded-sm">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* The Loop */}
          {loop && (
            <Section label="The Loop · neighbourhood swap">
              <a href={`/loop/${loop.slug}`} className="flex gap-4 items-start bg-white border border-protocol-border rounded-sm p-4 hover:border-protocol-border-strong transition-colors">
                <div className="w-8 h-8 rounded-full bg-protocol-ink flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1.5C3.5 1.5 1.5 3.5 1.5 6S3.5 10.5 6 10.5s4.5-2 4.5-4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <path d="M10.5 1.5l-1.5 1.5 1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="font-display text-base font-normal mb-1">{loop.name}</p>
                  {loop.contrast_thesis && <p className="text-[13px] italic text-protocol-muted leading-relaxed mb-2">{loop.contrast_thesis}</p>}
                  <p className="font-mono text-[10px] tracking-wide text-protocol-teal">
                    £{loop.loop_rate} for {(loop.nights_a ?? 2) + (loop.nights_b ?? 2)} nights →
                  </p>
                </div>
              </a>
            </Section>
          )}
        </div>
      </main>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-protocol-faint mb-3 pb-2 border-b border-protocol-border">{label}</p>
      {children}
    </div>
  )
}

function Chip({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`font-mono text-[9px] tracking-[0.08em] uppercase px-2 py-0.5 rounded-sm ${cls}`}>{children}</span>
}

function fmt(s: string) { return (s ?? '').split('_').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ') }
function tomorrow()    { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] }
function addDays(s: string, n: number) { const d = new Date(s); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0] }
