'use client'
// components/dashboard/DashboardShell.tsx

import { usePathname } from 'next/navigation'
import Link            from 'next/link'

interface Props {
  children: React.ReactNode; propertyName: string
  borough: string; tier: string; isLive: boolean
}

const NAV = [
  { section: 'Property', items: [
    { href: '/dashboard',           label: 'Overview'  },
    { href: '/dashboard/bookings',  label: 'Bookings'  },
    { href: '/dashboard/rates',     label: 'Rates'     },
    { href: '/dashboard/analytics', label: 'Analytics' },
  ]},
  { section: 'Protocol', items: [
    { href: '/dashboard/loop',    label: 'The Loop'  },
    { href: '/dashboard/listing', label: 'My listing'},
  ]},
]

const TIER_NAMES: Record<string, string> = {
  protocol_core: 'Protocol Core', protocol_plus: 'Protocol Plus', protocol_elite: 'Protocol Elite',
}

export function DashboardShell({ children, propertyName, tier, isLive }: Props) {
  const pathname = usePathname()
  const isActive = (href: string) => href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <div className="flex flex-col min-h-screen">
      <header className="h-11 bg-protocol-ink flex items-center px-5 gap-3 shrink-0">
        <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-white/90">The London Protocol</span>
        <span className="w-1 h-1 rounded-full bg-protocol-teal shrink-0" />
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-white/35">{propertyName}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {isLive && <><span className="w-1.5 h-1.5 rounded-full bg-protocol-teal" /><span className="font-mono text-[9px] tracking-[0.08em] uppercase text-white/30">Live</span></>}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-48 shrink-0 bg-white border-r border-protocol-border flex flex-col">
          <nav className="flex-1 py-4">
            {NAV.map(group => (
              <div key={group.section} className="mb-5">
                <p className="font-mono text-[8px] tracking-[0.14em] uppercase text-protocol-faint px-4 mb-1">{group.section}</p>
                {group.items.map(item => (
                  <Link
                    key={item.href} href={item.href}
                    className={[
                      'flex items-center gap-2 px-4 py-1.5 text-[13px] my-px border-l-2 transition-all duration-100',
                      isActive(item.href)
                        ? 'border-l-protocol-ink text-protocol-ink bg-protocol-cream'
                        : 'border-l-transparent text-protocol-muted hover:text-protocol-ink hover:bg-protocol-cream',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="px-4 py-3 border-t border-protocol-border">
            <span className="inline-block font-mono text-[8px] tracking-[0.1em] uppercase bg-protocol-gold-light text-protocol-gold px-2 py-0.5 rounded-sm mb-1">
              {TIER_NAMES[tier] ?? tier}
            </span>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-protocol-cream px-7 py-7">{children}</main>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// components/dashboard/RateEditor.tsx  (client component)
// ─────────────────────────────────────────────────────────────
import { useState, useTransition } from 'react'
import { updatePropertyRates }     from '@/app/actions/dashboard'

export function RateEditor({ propertyId, initialRackRate, initialProtocolRate, commissionPct }: {
  propertyId: string; initialRackRate: number; initialProtocolRate: number; commissionPct: number
}) {
  const [rack,  setRack]  = useState(initialRackRate)
  const [proto, setProto] = useState(initialProtocolRate)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const comm      = rack  ? Math.round(rack  * commissionPct / 100) : 0
  const save      = rack && proto ? Math.round(rack - proto) : 0
  const savePct   = rack  ? Math.round(save / rack * 100) : 0
  const hotelRev  = rack  ? rack - comm : 0
  const gain      = proto ? proto - hotelRev : 0
  const qualifies = rack && proto ? (rack - proto) / rack >= 0.15 : false

  const handleSave = () => {
    startTransition(async () => {
      await updatePropertyRates({ propertyId, rackRate: rack, protocolRate: proto })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-white border border-protocol-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-protocol-border">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-protocol-faint">Update rates</span>
        </div>
        <div className="px-4 py-4 space-y-4">
          <RateField label="Expedia / rack rate" hint="Per night, GBP" value={rack} onChange={v => { setRack(v); setProto(Math.round(v * 0.85)) }} />
          <RateField label="Protocol direct rate" hint="Min 15% below rack" value={proto} onChange={setProto} />
          <div className={`flex items-center gap-2 px-3 py-2 rounded-sm ${qualifies ? 'bg-protocol-teal-light' : 'bg-red-50'}`}>
            <span className={`font-mono text-[9px] tracking-[0.08em] uppercase ${qualifies ? 'text-protocol-teal-dark' : 'text-red-600'}`}>
              {qualifies ? `✓ Qualifies — ${Math.round((rack - proto) / rack * 100)}% below Expedia` : `✗ Must be ≥ 15% below Expedia`}
            </span>
          </div>
          <button
            onClick={handleSave}
            disabled={isPending || !qualifies}
            className={`w-full font-mono text-[10px] tracking-[0.1em] uppercase py-2.5 rounded-sm text-white transition-all disabled:opacity-40 ${saved ? 'bg-protocol-teal' : 'bg-protocol-ink hover:bg-[#2d2d2a] active:scale-[0.97]'}`}
          >
            {saved ? 'Saved ✓' : isPending ? 'Saving…' : 'Save rates'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-protocol-border rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-protocol-border">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-protocol-faint">Live commission breakdown</span>
        </div>
        <div className="px-4 py-2">
          {[
            { label: 'Expedia listing price',       val: rack   ? `£${rack}`                                     : '—', cls: 'line-through text-protocol-faint' },
            { label: `Expedia commission (${commissionPct}%)`, val: comm ? `-£${comm}`                            : '—', cls: 'text-[#c0392b]' },
            { label: 'Hotel revenue via Expedia',   val: rack   ? `£${hotelRev}`                                  : '—', cls: 'text-protocol-faint' },
            { label: 'Protocol direct rate',        val: proto  ? `£${proto}`                                     : '—', cls: 'text-protocol-teal' },
            { label: 'Guest saving vs. Expedia',    val: save && rack ? `£${save} (${savePct}%)`                  : '—', cls: 'text-protocol-teal' },
            { label: 'You keep more per booking',   val: gain > 0 ? `+£${gain}`                                   : '£0', cls: gain > 0 ? 'text-protocol-teal' : 'text-protocol-faint' },
          ].map(r => (
            <div key={r.label} className="flex justify-between items-baseline py-1.5 border-b border-protocol-border last:border-0">
              <span className="text-[12px] text-protocol-muted">{r.label}</span>
              <span className={`font-mono text-[12px] font-medium ${r.cls}`}>{r.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RateField({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block font-mono text-[9px] tracking-[0.1em] uppercase text-protocol-faint mb-1.5">
        {label} <span className="normal-case tracking-normal font-normal text-[9px]">({hint})</span>
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-protocol-faint text-[14px]">£</span>
        <input
          type="number" value={value || ''} onChange={e => onChange(parseInt(e.target.value) || 0)}
          className="w-full bg-protocol-cream border border-protocol-border-strong rounded-sm pl-7 pr-3 py-2 font-mono text-[14px] font-medium text-protocol-ink text-right outline-none focus:border-protocol-ink focus:bg-white transition-all"
          placeholder="0"
        />
      </div>
    </div>
  )
}
