import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { formatAussieDate } from '@/utils/dateFormatter'

export const dynamic = 'force-dynamic' // Force Next.js not to cache this page

export default async function AdminPage() {
  const supabase = await createClient()

  // 1. Verify User is Admin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("No user found in auth.getUser()")
    return redirect('/login')
  }

  console.log("Found User ID:", user.id)

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  console.log("DB Query Result:", userData)
  console.log("DB Query Error:", userError)

  if (userData?.role !== 'admin') {
    console.log("Redirecting. Role was:", userData?.role)
    return redirect('/') // Redirect non-admins to the dashboard
  }

  // 2. Fetch Initial Data for the forms
  const { data: teams } = await supabase.from('teams').select('*').order('name')
  const { data: drivers } = await supabase.from('drivers').select('*, teams(name)').order('name')
  const { data: races } = await supabase.from('races').select('*').order('date')

  return (
    <div className="w-full max-w-4xl p-8 mx-auto space-y-12">
      <div className="flex justify-between items-end mb-8 border-b-2 border-border-color pb-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Admin Dashboard</h1>
          <p className="text-foreground/70 font-medium uppercase tracking-widest text-sm mt-2">Manage the season</p>
        </div>
        <a href="/admin/proxy-predict" className="text-xs font-bold uppercase tracking-widest bg-f1-red text-white hover:bg-red-700 transition-colors px-4 py-2 rounded-sm shadow-md">
          Input User Tips
        </a>
      </div>

      {/* --- TEAMS SECTION --- */}
      <section className="bg-foreground/5 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4 border-b border-foreground/10 pb-2">Manage Teams</h2>
        
        <form className="flex gap-4 items-end mb-6" action="/api/admin/team" method="POST">
          <div className="flex-1">
            <label className="block text-sm mb-1">Team Name</label>
            <input name="name" required className="w-full rounded-md px-3 py-2 bg-background border" />
          </div>
          <div className="flex-1">
            <label className="block text-sm mb-1">Logo URL (Optional)</label>
            <input name="logo_url" className="w-full rounded-md px-3 py-2 bg-background border" />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Add Team
          </button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {teams?.map((team) => (
            <div key={team.id} className="bg-background border p-3 rounded shadow-sm flex items-center gap-3">
              {team.logo_url && <img src={team.logo_url} alt={team.name} className="w-8 h-8 object-contain" />}
              <span className="font-medium">{team.name}</span>
            </div>
          ))}
        </div>
      </section>


      {/* --- DRIVERS SECTION --- */}
      <section className="bg-foreground/5 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4 border-b border-foreground/10 pb-2">Manage Drivers</h2>
        
        <form className="flex flex-col gap-4 mb-6" action="/api/admin/driver" method="POST">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm mb-1">Driver Name</label>
              <input name="name" required className="w-full rounded-md px-3 py-2 bg-background border" />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1">Select Team</label>
              <select name="team_id" required className="w-full rounded-md px-3 py-2 bg-background border">
                <option value="">-- Choose Team --</option>
                {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm mb-1">Image URL (Optional)</label>
              <input name="image_url" className="w-full rounded-md px-3 py-2 bg-background border" />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Add Driver
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drivers?.map((driver) => (
            <div key={driver.id} className="bg-background border p-3 rounded shadow-sm flex items-center gap-4">
              {driver.image_url && <img src={driver.image_url} alt={driver.name} className="w-10 h-10 rounded-full object-cover" />}
              <div>
                <div className="font-bold">{driver.name}</div>
                <div className="text-sm text-foreground/60">{driver.teams?.name}</div>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* --- RACES SECTION --- */}
      <section className="bg-foreground/5 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4 border-b border-foreground/10 pb-2">Manage Races</h2>
        
        <form className="flex flex-col gap-4 mb-8" action="/api/admin/race" method="POST">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm mb-1">Race Name</label>
              <input name="name" required placeholder="e.g. Bahrain Grand Prix" className="w-full rounded-md px-3 py-2 bg-background border" />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1">Status</label>
              <select name="status" className="w-full rounded-md px-3 py-2 bg-background border">
                <option value="upcoming">Upcoming</option>
                <option value="locked">Locked</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm mb-1">Race Date & Time (AEST/AEDT)</label>
              <input type="datetime-local" name="date" required className="w-full rounded-md px-3 py-2 bg-background border" />
              <p className="text-xs text-foreground/50 mt-1">Enter local Australian Eastern time. Deadline will automatically be set to 25 hours before this time.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm mb-1">Crazy Prediction Question</label>
              <input name="crazy_prediction_desc" placeholder="e.g. Fastest Pit Stop Team" className="w-full rounded-md px-3 py-2 bg-background border" />
            </div>
            <div className="w-32">
              <label className="block text-sm mb-1">Crazy Points</label>
              <input type="number" name="crazy_prediction_points" defaultValue={10} className="w-full rounded-md px-3 py-2 bg-background border" />
            </div>
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm mb-1">Track Layout Image URL (Optional)</label>
              <input name="track_image_url" className="w-full rounded-md px-3 py-2 bg-background border" />
            </div>
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-8 rounded">
              Create Race
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {races?.map((race) => (
            <div key={race.id} className="bg-background border p-4 rounded shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{race.name}</h3>
                  <p className="text-sm text-foreground/70">Date: {formatAussieDate(race.date)}</p>
                  <p className="text-sm text-foreground/70">Locks: {formatAussieDate(race.prediction_deadline)}</p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${
                  race.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : 
                  race.status === 'locked' ? 'bg-orange-100 text-orange-800' : 
                  'bg-green-100 text-green-800'
                }`}>
                  {race.status}
                </span>
              </div>
              
              {race.crazy_prediction_desc && (
                <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-200 rounded text-sm border border-purple-200 dark:border-purple-800">
                  <span className="font-bold">Crazy Prediction ({race.crazy_prediction_points}pts):</span> {race.crazy_prediction_desc}
                </div>
              )}

              <div className="mt-2 pt-2 border-t flex justify-end">
                <a href={`/admin/race/${race.id}/results`} className="text-sm bg-foreground/10 hover:bg-foreground/20 px-4 py-2 rounded font-semibold">
                  Input Results
                </a>
              </div>
            </div>
          ))}
          {races?.length === 0 && <p className="text-foreground/50 italic">No races created yet.</p>}
        </div>
      </section>

    </div>
  )
}
