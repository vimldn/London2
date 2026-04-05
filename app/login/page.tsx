// app/login/page.tsx
import type { Metadata }  from 'next'
import { LoginForm }      from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title:  'Hotel Partner Login | The London Protocol',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return <LoginForm />
}
