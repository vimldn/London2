'use client'
// components/property/BookingWidget.tsx

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'

interface Props {
  propertySlug:    string
  protocolRate:    number
  otaRate:         number | null
  commissionPct:   number
  defaultCheckIn:  string
  defaultCheckOut: string
  defaultGuests:   number
}

export function BookingWidget({ propertySlug, protocolRate, otaRate, commissionPct, defaultCheckIn, defaultCheckOut, defaultGuests }: Props) {
  const router = useRouter()
  const [checkIn,  setCheckIn]  = useState(defaultCheckIn)
  const [checkOut, setCheckOut] = useState(defaultCheckOut)
  const [guests,   setGuests]   = useState(defaultGuests)
  const [isPending, startTransition] = useTransition()

  const nights   = Math.max(1, nightsBetween(checkIn, checkOut))
  const subtotal = protocolRate * nights
  const otaTotal = otaRate ? Math.round(otaRate * nights) : null
  const save     = otaTotal ? otaTotal - subtotal : null
  const savePct  = otaTotal && save ? Math.round(save / otaTotal * 100) : null

  const handleBook = () => {
    startTransition(() => {
      router.push(`/stay/${propertySlug}/book?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`)
    })
  }

  return (
    <div className="bg-white border border-protocol-border-strong rounded-sm overflow-hidden">
      <div className="bg-protocol-ink px-4 py-4">
        <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-white/40 mb-1">Protocol direct rate</p>
        <p className="font-display text-[28px] text-white font-normal leading-none">£{protocolRate}</p>
        <p className="font-mono text-[9px] tracking-[0.06em] uppercase text-white/30 mt-1">per night · zero commission</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <DateField label="Check-in"  value={checkIn}  min={today()} onChange={v => { setCheckIn(v); if (v >= checkOut) setCheckOut(addDays(v, 1)) }} />
          <DateField label="Check-out" value={checkOut} min={addDays(checkIn, 1)} onChange={setCheckOut} />
        </div>

        <div>
          <label className="block font-mono text-[9px] tracking-[0.08em] uppercase text-protocol-faint mb-1.5">Guests</label>
          <select
            value={guests}
            onChange={e => setGuests(Number(e.target.value))}
            className="w-full border border-protocol-border-strong rounded-sm px-3 py-2 font-sans text-[13px] text-protocol-ink bg-protocol-cream outline-none focus:border-protocol-ink appearance-none"
          >
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
          </select>
        </div>

        <div className="bg-protocol-cream rounded-sm px-3 py-2.5 space-y-1.5">
          <div className="flex justify-between items-baseline">
            <span className="text-[12px] text-protocol-muted">£{protocolRate} × {nights} {nights === 1 ? 'night' : 'nights'}</span>
            <span className="font-mono text-[12px] font-medium">£{subtotal}</span>
          </div>
          {otaTotal && (
            <div className="flex justify-between items-baseline">
              <span className="text-[12px] text-protocol-muted">Expedia price</span>
              <span className="font-mono text-[11px] text-protocol-faint line-through">£{otaTotal}</span>
            </div>
          )}
          {save && save > 0 && (
            <p className="font-mono text-[9px] tracking-[0.06em] uppercase text-protocol-teal pt-1 border-t border-protocol-border">
              You save £{save} ({savePct}%) — no commission
            </p>
          )}
        </div>

        <button
          onClick={handleBook}
          disabled={isPending}
          className="w-full font-mono text-[10px] tracking-[0.12em] uppercase py-3 rounded-sm bg-protocol-ink text-white hover:bg-[#2d2d2a] active:scale-[0.97] transition-all disabled:opacity-50 cursor-pointer"
        >
          {isPending ? 'Loading…' : 'Reserve · Protocol Direct'}
        </button>

        <div className="flex items-center gap-2 px-3 py-2 bg-protocol-teal-light border border-[rgba(29,158,117,0.15)] rounded-sm">
          <svg className="w-3 h-3 shrink-0 text-protocol-teal" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M3.5 6l2 2L9 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-mono text-[9px] tracking-[0.06em] text-protocol-teal-dark">Rates verified · no OTA markup</span>
        </div>
      </div>
    </div>
  )
}

function DateField({ label, value, min, onChange }: { label: string; value: string; min?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block font-mono text-[9px] tracking-[0.08em] uppercase text-protocol-faint mb-1.5">{label}</label>
      <input
        type="date" value={value} min={min}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-protocol-border-strong rounded-sm px-2.5 py-2 font-mono text-[11px] text-protocol-ink bg-protocol-cream outline-none focus:border-protocol-ink transition-colors"
      />
    </div>
  )
}

function nightsBetween(a: string, b: string) { return Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 86400000)) }
function today()    { return new Date().toISOString().split('T')[0] }
function addDays(s: string, n: number) { const d = new Date(s); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0] }
