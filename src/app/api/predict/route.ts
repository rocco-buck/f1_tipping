import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Verify User
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const formData = await request.formData()
  const action = formData.get('action') as string // "save" or "lock"
  const race_id = formData.get('race_id') as string
  
  const pole_driver_id = formData.get('pole_driver_id') as string || null
  const p1_driver_id = formData.get('p1_driver_id') as string || null
  const p2_driver_id = formData.get('p2_driver_id') as string || null
  const p3_driver_id = formData.get('p3_driver_id') as string || null
  const p10_driver_id = formData.get('p10_driver_id') as string || null
  const crazy_prediction_value = formData.get('crazy_prediction_value') as string || null

  // Fetch Race to verify deadline
  const { data: race } = await supabase.from('races').select('*').eq('id', race_id).single()
  if (!race) return redirect('/')

  if (new Date() > new Date(race.prediction_deadline)) {
    // Too late!
    return redirect(`/predict/${race_id}?error=deadline_passed`)
  }

  // Check if they are already locked
  const { data: existing } = await supabase.from('predictions').select('is_locked').eq('user_id', user.id).eq('race_id', race_id).maybeSingle()
  if (existing?.is_locked) {
    return redirect(`/predict/${race_id}?error=already_locked`)
  }

  // Upsert prediction
  await supabase.from('predictions').upsert({
    user_id: user.id,
    race_id,
    pole_driver_id,
    p1_driver_id,
    p2_driver_id,
    p3_driver_id,
    p10_driver_id,
    crazy_prediction_value,
    is_locked: action === 'lock',
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id, race_id' })

  return redirect(action === 'lock' ? '/' : `/predict/${race_id}`)
}
