import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { formatAussieDate } from '@/utils/dateFormatter'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Fetch the next upcoming race
  const { data: upcomingRace } = await supabase
    .from('races')
    .select('*')
    .in('status', ['upcoming', 'locked']) // Show locked races as upcoming until they are completed
    .eq('completed', false)
    .order('date', { ascending: true })
    .limit(1)
    .maybeSingle()

  // Fetch completed races
  const { data: completedRaces } = await supabase
    .from('races')
    .select('*, race_results(p1_driver_id)')
    .eq('completed', true)
    .order('date', { ascending: false })

  // We need to join the driver info manually for the winner if we want to show it
  const { data: drivers } = await supabase.from('drivers').select('id, name, teams(name)')

  // If there's an upcoming race, check if the user has already made a prediction
  let userPrediction = null
  if (upcomingRace) {
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id)
      .eq('race_id', upcomingRace.id)
      .maybeSingle()
    
    userPrediction = data
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12 max-w-5xl mx-auto px-4 md:px-8 pb-16">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-8">Dashboard</h1>
      
      {upcomingRace ? (
        <div className="bg-card-bg border border-border-color rounded-xl overflow-hidden shadow-2xl">
          {/* Header Strip */}
          <div className="bg-gradient-to-r from-border-color to-card-bg p-6 border-b border-border-color flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-white text-black font-black uppercase text-xs px-2 py-0.5 rounded-sm tracking-wider">Up Next</div>
              </div>
              <h3 className="text-4xl font-black text-white">{upcomingRace.name}</h3>
              <p className="text-lg font-bold text-foreground/60 mt-1 uppercase tracking-widest">
                {formatAussieDate(upcomingRace.date)}
              </p>
            </div>
            
            <div className="bg-background/80 p-4 border border-f1-red/30 rounded-md">
              <p className="text-[10px] font-black text-f1-red uppercase tracking-widest mb-1">Picks Lock At</p>
              <p className="font-mono text-lg font-bold">{formatAussieDate(upcomingRace.prediction_deadline)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            {(upcomingRace.track_image_url || upcomingRace.location_image_url) && (
              <div className="flex flex-col gap-2 justify-center bg-background rounded-lg p-4 border border-border-color">
                {upcomingRace.track_image_url && (
                  <img src={upcomingRace.track_image_url} alt="Track Layout" className="object-contain h-48 w-full filter invert contrast-200" />
                )}
              </div>
            )}

            <div className="flex flex-col justify-center gap-6">
              <div className="flex items-center justify-between border-b-2 border-border-color pb-2">
                <h4 className="font-extrabold text-2xl">Your Predictions</h4>
              </div>
              
              {userPrediction ? (
                <div className="bg-background border border-border-color p-6 rounded-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center font-bold text-xl">✓</div>
                    <p className="font-bold uppercase tracking-wider text-sm">Picks Submitted</p>
                  </div>
                  <a href={`/predict/${upcomingRace.id}`} className="block w-full text-center bg-border-color hover:bg-white hover:text-black font-bold uppercase tracking-widest text-sm py-4 transition-colors rounded-sm">
                    {userPrediction.is_locked ? 'View Locked Picks' : 'Edit Your Picks'}
                  </a>
                </div>
              ) : (
                <div className="bg-background border border-border-color p-6 rounded-lg">
                  <p className="text-foreground/70 mb-6 font-medium">You haven't made any picks for this race yet.</p>
                  <a href={`/predict/${upcomingRace.id}`} className="block w-full text-center bg-f1-red text-white font-bold uppercase tracking-widest text-sm py-4 hover:bg-red-700 transition-colors rounded-sm">
                    Make Predictions
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card-bg p-12 border border-border-color rounded-xl text-center">
          <h2 className="text-3xl font-black mb-4">No Upcoming Races</h2>
          <p className="text-foreground/50 text-lg font-medium">The season might be over, or the admin hasn't added the next race yet. Check back soon!</p>
        </div>
      )}

      {/* Completed Races Section */}
      <div className="mt-8 flex flex-col gap-6">
        <h2 className="text-2xl font-extrabold tracking-tight uppercase">Completed Races</h2>
        
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="font-bold border-b-2 border-border-color pb-3 text-xs tracking-wider">Grand Prix</th>
                <th className="font-bold border-b-2 border-border-color pb-3 text-xs tracking-wider">Date</th>
                <th className="font-bold border-b-2 border-border-color pb-3 text-xs tracking-wider">Winner</th>
                <th className="font-bold border-b-2 border-border-color pb-3 text-xs tracking-wider">Team</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {completedRaces?.map((race) => {
                const winnerId = race.race_results?.[0]?.p1_driver_id;
                const winner = drivers?.find(d => d.id === winnerId);
                
                return (
                  <tr key={race.id} className="transition hover:bg-card-hover group">
                    <td className="p-4 font-bold text-lg border-b border-border-color">
                      {race.name}
                    </td>
                    <td className="p-4 text-foreground/70 border-b border-border-color font-medium">
                      {new Date(race.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="p-4 font-bold text-lg border-b border-border-color text-white group-hover:text-f1-red transition-colors">
                      {winner ? winner.name : 'Unknown'}
                    </td>
                    <td className="p-4 font-medium text-foreground/70 border-b border-border-color">
                      {winner?.teams ? (winner.teams as any).name : '-'}
                    </td>
                  </tr>
                )
              })}
              
              {(!completedRaces || completedRaces.length === 0) && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-foreground/50 italic border-b border-border-color">
                    No races have been completed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
