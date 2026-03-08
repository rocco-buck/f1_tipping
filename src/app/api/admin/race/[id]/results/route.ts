import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const params = await context.params
  const race_id = params.id

  // Verify Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (userData?.role !== 'admin') return redirect('/')

  const formData = await request.formData()
  const pole_driver_id = formData.get('pole_driver_id') as string || null
  const p1_driver_id = formData.get('p1_driver_id') as string || null
  const p2_driver_id = formData.get('p2_driver_id') as string || null
  const p3_driver_id = formData.get('p3_driver_id') as string || null
  const p10_driver_id = formData.get('p10_driver_id') as string || null
  const crazy_prediction_answer = formData.get('crazy_prediction_answer') as string || null

  // 1. Upsert Race Results
  await supabase.from('race_results').upsert({
    race_id,
    pole_driver_id,
    p1_driver_id,
    p2_driver_id,
    p3_driver_id,
    p10_driver_id,
    crazy_prediction_answer,
    created_at: new Date().toISOString(),
  }, { onConflict: 'race_id' })

  // 2. Mark race as completed
  await supabase.from('races').update({ status: 'completed', completed: true }).eq('id', race_id)

  // 3. Calculate Scores for all predictions for this race
  const { data: race } = await supabase.from('races').select('*').eq('id', race_id).single()
  const { data: predictions } = await supabase.from('predictions').select('*').eq('race_id', race_id)

  if (predictions && predictions.length > 0 && race) {
    // We could store user_race_scores in a new table, but for now, 
    // the easiest robust way is just to have a leaderboard view or query. 
    // However, saving them to a table makes historical data safer.
    // Let's create an upsert into a scores table (we'll need to create this table if it doesn't exist, 
    // or calculate on the fly in the leaderboard). 
    
    // For this app, calculating on the fly for the leaderboard is actually safer 
    // in case results change. We'll leave the scoring calculation to the leaderboard page 
    // which will compare `predictions` vs `race_results`.
  }

  return redirect('/admin')
}
