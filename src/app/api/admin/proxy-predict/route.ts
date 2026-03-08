import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function POST(request: Request) {
  const supabase = await createClient()

  // 1. Verify Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (userData?.role !== 'admin') return redirect('/')

  const formData = await request.formData()
  
  const user_id = formData.get('user_id') as string
  const race_id = formData.get('race_id') as string
  
  if (!user_id || !race_id) {
    return redirect('/admin')
  }

  const pole_driver_id = formData.get('pole_driver_id') as string || null
  const p1_driver_id = formData.get('p1_driver_id') as string || null
  const p2_driver_id = formData.get('p2_driver_id') as string || null
  const p3_driver_id = formData.get('p3_driver_id') as string || null
  const p10_driver_id = formData.get('p10_driver_id') as string || null
  const crazy_prediction_value = formData.get('crazy_prediction_value') as string || null

  // Upsert prediction directly for the selected user
  await supabase.from('predictions').upsert({
    user_id,
    race_id,
    pole_driver_id,
    p1_driver_id,
    p2_driver_id,
    p3_driver_id,
    p10_driver_id,
    crazy_prediction_value,
    is_locked: true, // Force lock since admin is submitting it
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id, race_id' })

  return redirect(`/admin/proxy-predict?user=${user_id}&race=${race_id}&success=1`)
}
