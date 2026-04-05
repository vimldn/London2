'use server'
// app/actions/dashboard.ts

import { createClient }   from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { z }              from 'zod'

const UpdateRatesSchema = z.object({
  propertyId:   z.string().uuid(),
  rackRate:     z.number().min(50).max(5000),
  protocolRate: z.number().min(50).max(5000),
})

export async function updatePropertyRates(input: z.infer<typeof UpdateRatesSchema>) {
  const { propertyId, rackRate, protocolRate } = UpdateRatesSchema.parse(input)

  if ((rackRate - protocolRate) / rackRate < 0.14) {
    throw new Error('Protocol rate must be at least 15% below the rack rate.')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase
    .from('properties')
    .update({ rack_rate: rackRate, protocol_nightly: protocolRate, updated_at: new Date().toISOString() })
    .eq('id', propertyId)

  await supabase.from('rate_snapshots').insert({
    property_id:   propertyId,
    protocol_rate: protocolRate,
    expedia_rate:  rackRate,
    check_in:      new Date().toISOString().split('T')[0],
    check_out:     new Date().toISOString().split('T')[0],
    scrape_method: 'manual',
  })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/rates')
}
