import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type LeaderboardEntry = {
  user_id: string
  name: string
  points: number
}

export default async function LeaderboardPage() {
  const supabase = await createClient()

  // Verify User
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  // Fetch all completed races
  const { data: completedRaces } = await supabase.from('races').select('*').eq('completed', true)
  
  // Fetch all users
  const { data: users } = await supabase.from('users').select('id, name, email')

  // Fetch all predictions and results
  const { data: predictions } = await supabase.from('predictions').select('*')
  const { data: results } = await supabase.from('race_results').select('*')

  // Calculate scores
  const leaderboardMap = new Map<string, LeaderboardEntry>()

  users?.forEach(u => {
    leaderboardMap.set(u.id, {
      user_id: u.id,
      name: u.name || u.email.split('@')[0], // Fallback to email prefix if no name
      points: 0
    })
  })

  // Iterate over all results
  results?.forEach(result => {
    const race = completedRaces?.find(r => r.id === result.race_id)
    if (!race) return // Skip if race isn't marked completed

    // Find predictions for this race
    const racePredictions = predictions?.filter(p => p.race_id === result.race_id)

    racePredictions?.forEach(pred => {
      let score = 0
      
      if (pred.pole_driver_id && pred.pole_driver_id === result.pole_driver_id) score += 15
      if (pred.p1_driver_id && pred.p1_driver_id === result.p1_driver_id) score += 25
      if (pred.p2_driver_id && pred.p2_driver_id === result.p2_driver_id) score += 18
      if (pred.p3_driver_id && pred.p3_driver_id === result.p3_driver_id) score += 15
      if (pred.p10_driver_id && pred.p10_driver_id === result.p10_driver_id) score += 10
      
      // Auto-scoring for crazy prediction if strings match exactly (case-insensitive)
      if (
        pred.crazy_prediction_value && 
        result.crazy_prediction_answer && 
        pred.crazy_prediction_value.trim().toLowerCase() === result.crazy_prediction_answer.trim().toLowerCase()
      ) {
        score += race.crazy_prediction_points || 0
      }

      // Add to user's total
      const userEntry = leaderboardMap.get(pred.user_id)
      if (userEntry) {
        userEntry.points += score
      }
    })
  })

  // Convert map to array and sort descending
  const leaderboard = Array.from(leaderboardMap.values()).sort((a, b) => b.points - a.points)

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 flex flex-col gap-8 pb-12">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-6">Season Leaderboard</h1>
      
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="font-bold border-b-2 border-border-color pb-3 text-xs tracking-wider w-24">Pos</th>
              <th className="font-bold border-b-2 border-border-color pb-3 text-xs tracking-wider">Player</th>
              <th className="font-bold border-b-2 border-border-color pb-3 text-xs tracking-wider text-right w-32">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color">
            {leaderboard.map((entry, index) => (
              <tr key={entry.user_id} className={`transition group ${entry.user_id === user.id ? 'bg-f1-red/10' : ''}`}>
                <td className="p-4 font-bold text-xl text-foreground/50 border-b border-border-color">{index + 1}</td>
                <td className="p-4 font-bold text-xl border-b border-border-color">
                  {entry.name}
                  {entry.user_id === user.id && <span className="ml-3 text-[10px] bg-f1-red text-white px-2 py-1 rounded-sm uppercase tracking-widest align-middle">You</span>}
                </td>
                <td className="p-4 font-extrabold text-2xl text-right border-b border-border-color">
                  <span className="bg-foreground text-background px-3 py-1 rounded-sm group-hover:bg-f1-red group-hover:text-white transition-colors">
                    {entry.points}
                  </span>
                </td>
              </tr>
            ))}
            
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-foreground/50 italic border-b border-border-color">
                  No users or points recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
