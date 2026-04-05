'use client'
// components/auth/LoginForm.tsx

import { useState, useTransition } from 'react'
import { signInWithMagicLink, signInWithPassword } from '@/app/actions/auth'

type Mode = 'magic' | 'password'

export function LoginForm() {
  const [mode,      setMode]      = useState<Mode>('magic')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleMagic = () => {
    if (!email) return
    setError(null)
    startTransition(async () => {
      const res = await signInWithMagicLink(email)
      if (res.error) setError(res.error)
      else           setMagicSent(true)
    })
  }

  const handlePassword = () => {
    if (!email || !password) return
    setError(null)
    startTransition(async () => {
      const res = await signInWithPassword(email, password)
      if (res?.error) setError(res.error)
    })
  }

  const switchMode = (m: Mode) => { setMode(m); setError(null); setMagicSent(false) }

  return (
    <div className="min-h-screen grid grid-cols-2">
      {/* Left — editorial panel */}
      <div className="bg-protocol-ink flex flex-col justify-between px-10 py-12">
        <div>
          <p className="font-mono text-[9px] tracking-[0.16em] uppercase text-white/35 mb-5">Hotel Partner Portal</p>
          <h1 className="font-display text-[2rem] font-normal text-white leading-tight mb-4">
            Your margin.<br />
            <em className="italic text-white/50">Restored.</em>
          </h1>
          <p className="text-[14px] text-white/35 font-light leading-relaxed max-w-xs mb-10">
            Full visibility into bookings, rate performance, and commission recovered — in real time.
          </p>
          <div className="space-y-4">
            {[
              { val: '£38',  label: 'avg saved per guest per night'   },
              { val: '25%',  label: 'commission recovered per booking' },
              { val: '47',   label: 'properties live in London'        },
            ].map(s => (
              <div key={s.label} className="flex items-baseline gap-3">
                <span className="font-display text-2xl text-white/80">{s.val}</span>
                <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-white/30">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="font-mono text-[9px] tracking-[0.08em] uppercase text-white/20">
          londonprotocol.com
        </p>
      </div>

      {/* Right — form */}
      <div className="bg-protocol-cream flex items-center justify-center px-10 py-12">
        <div className="w-full max-w-[320px]">
          <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-protocol-teal mb-2">Hotel partner access</p>
          <h2 className="font-display text-2xl font-normal mb-1">Sign in.</h2>
          <p className="text-[13px] text-protocol-muted font-light mb-6">Access your property dashboard and rate tools.</p>

          {/* Mode tabs */}
          <div className="flex border-b border-protocol-border mb-5">
            {(['magic', 'password'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={[
                  'font-mono text-[10px] tracking-[0.08em] uppercase px-4 py-1.5 border-b-2 -mb-px transition-all',
                  mode === m ? 'border-b-protocol-ink text-protocol-ink' : 'border-b-transparent text-protocol-faint hover:text-protocol-muted',
                ].join(' ')}
              >
                {m === 'magic' ? 'Magic link' : 'Password'}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-sm px-3 py-2 mb-4">
              <p className="font-mono text-[10px] text-red-600">{error}</p>
            </div>
          )}

          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@yourproperty.com" disabled={magicSent} />

          {mode === 'password' && (
            <>
              <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
              <div className="text-right mb-3 -mt-2">
                <a href="/login/reset" className="font-mono text-[9px] tracking-wide text-protocol-faint hover:text-protocol-muted transition-colors">
                  Forgot password?
                </a>
              </div>
            </>
          )}

          {magicSent ? (
            <div className="bg-protocol-teal-light border border-[rgba(29,158,117,0.2)] rounded-sm px-4 py-3 mb-4 text-center">
              <p className="font-mono text-[10px] tracking-[0.06em] text-protocol-teal-dark leading-relaxed">
                Link sent to {email}<br />Expires in 10 minutes.
              </p>
            </div>
          ) : (
            <button
              onClick={mode === 'magic' ? handleMagic : handlePassword}
              disabled={isPending || !email || (mode === 'password' && !password)}
              className="w-full font-mono text-[10px] tracking-[0.12em] uppercase py-2.5 rounded-sm bg-protocol-ink text-white hover:bg-[#2d2d2a] active:scale-[0.97] transition-all disabled:opacity-40 mb-3"
            >
              {isPending ? (mode === 'magic' ? 'Sending…' : 'Signing in…') : mode === 'magic' ? 'Send magic link →' : 'Sign in →'}
            </button>
          )}

          <p className="text-center font-mono text-[9px] tracking-[0.06em] text-protocol-faint mt-5">
            Not a partner yet?{' '}
            <a href="/onboard" className="text-protocol-teal hover:opacity-70 transition-opacity">Apply to list →</a>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, disabled }: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean
}) {
  return (
    <div className="mb-4">
      <label className="block font-mono text-[9px] tracking-[0.1em] uppercase text-protocol-muted mb-1.5">{label}</label>
      <input
        type={type} value={value} placeholder={placeholder} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-protocol-border-strong rounded-sm px-3 py-2.5 font-sans text-[14px] text-protocol-ink bg-white outline-none focus:border-protocol-ink transition-colors placeholder:text-protocol-faint disabled:opacity-50 disabled:bg-protocol-cream"
      />
    </div>
  )
}
