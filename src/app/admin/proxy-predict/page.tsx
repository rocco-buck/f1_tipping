import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminProxyPredictPage({
  searchParams,
}: {
  searchParams: Promise<{ race?: string, user?: string }>
}) {
  const supabase = await createClient()
  const { race: selectedRaceId, user: selectedUserId } = await searchParams

  // 1. Verify Admin
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) return redirect('/login')

  const { data: userData } = await supabase.from('users').select('role').eq('id', currentUser.id).single()
  if (userData?.role !== 'admin') return redirect('/')

  // 2. Fetch Data for Dropdowns
  const { data: allUsers } = await supabase.from('users').select('id, name, email').order('email')
  const { data: races } = await supabase.from('races').select('*').order('date', { ascending: false })
  const { data: drivers } = await supabase.from('drivers').select('*, teams(name)').order('name')

  // 3. Fetch Existing Prediction if both are selected
  let existingPrediction = null
  let activeRace = null

  if (selectedRaceId && selectedUserId) {
    const { data: pred } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', selectedUserId)
      .eq('race_id', selectedRaceId)
      .maybeSingle()
    existingPrediction = pred

    activeRace = races?.find(r => r.id === selectedRaceId)
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-8 py-12 flex flex-col gap-8">
      <div className="flex justify-between items-end border-b-2 border-border-color pb-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Admin: Input Tips</h1>
          <p className="text-foreground/70 font-medium uppercase tracking-widest text-sm mt-2">Enter predictions on behalf of other users</p>
        </div>
        <a href="/admin" className="text-xs font-bold uppercase tracking-widest bg-border-color hover:bg-white hover:text-black transition-colors px-4 py-2 rounded-sm">
          Back to Admin
        </a>
      </div>

      {/* Selection Form (GET Request to update URL params) */}
      <form method="GET" className="bg-card-bg border border-border-color p-6 rounded-xl flex flex-col md:flex-row gap-4 items-end shadow-lg">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold uppercase tracking-widest text-f1-red mb-2">Select User</label>
          <select name="user" defaultValue={selectedUserId || ''} required className="w-full rounded-sm px-3 py-2 bg-background border border-border-color">
            <option value="">-- Choose User --</option>
            {allUsers?.map(u => (
              <option key={u.id} value={u.id}>{u.name ? `${u.name} (${u.email})` : u.email}</option>
            ))}
          </select>
        </div>
        
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold uppercase tracking-widest text-f1-red mb-2">Select Race</label>
          <select name="race" defaultValue={selectedRaceId || ''} required className="w-full rounded-sm px-3 py-2 bg-background border border-border-color">
            <option value="">-- Choose Race --</option>
            {races?.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({new Date(r.date).toLocaleDateString()})</option>
            ))}
          </select>
        </div>

        <button type="submit" className="w-full md:w-auto bg-white text-black font-bold uppercase tracking-widest px-6 py-2 rounded-sm hover:bg-gray-200 transition-colors">
          Load Form
        </button>
      </form>

      {/* Prediction Form */}
      {selectedRaceId && selectedUserId && activeRace && (
        <form action="/api/admin/proxy-predict" method="POST" className="bg-card-bg border border-border-color p-8 rounded-xl shadow-2xl flex flex-col gap-8">
          <input type="hidden" name="user_id" value={selectedUserId} />
          <input type="hidden" name="race_id" value={selectedRaceId} />

          <div className="bg-f1-red/10 border border-f1-red/30 p-4 rounded-sm">
            <p className="text-sm font-bold text-f1-red uppercase tracking-widest">
              Editing tips for: {allUsers?.find(u => u.id === selectedUserId)?.email}
            </p>
            <p className="text-xs font-medium text-foreground/70 mt-1">
              Note: As an admin, you bypass the deadline lock. You can edit these even after the race has started.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DriverSelect label="Pole Position (15 pts)" name="pole_driver_id" drivers={drivers} defaultValue={existingPrediction?.pole_driver_id} />
            <DriverSelect label="1st Place (25 pts)" name="p1_driver_id" drivers={drivers} defaultValue={existingPrediction?.p1_driver_id} />
            <DriverSelect label="2nd Place (18 pts)" name="p2_driver_id" drivers={drivers} defaultValue={existingPrediction?.p2_driver_id} />
            <DriverSelect label="3rd Place (15 pts)" name="p3_driver_id" drivers={drivers} defaultValue={existingPrediction?.p3_driver_id} />
            <DriverSelect label="10th Place (10 pts)" name="p10_driver_id" drivers={drivers} defaultValue={existingPrediction?.p10_driver_id} />
          </div>

          {activeRace.crazy_prediction_desc && (
            <div className="mt-2 border-t border-border-color pt-6">
              <label className="block text-xs font-bold uppercase tracking-widest text-f1-red mb-2">
                Crazy Prediction: {activeRace.crazy_prediction_desc}
              </label>
              <input 
                type="text" 
                name="crazy_prediction_value" 
                defaultValue={existingPrediction?.crazy_prediction_value || ''}
                placeholder="User's answer..."
                className="w-full rounded-sm px-4 py-3 bg-background border border-border-color focus:border-f1-red focus:ring-1 focus:ring-f1-red outline-none transition-all" 
              />
            </div>
          )}

          <div className="flex justify-end pt-6 border-t border-border-color">
            <button 
              type="submit" 
              className="bg-f1-red hover:bg-red-700 text-white font-bold uppercase tracking-widest px-8 py-4 rounded-sm transition-colors"
            >
              Save Tips & Lock
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function DriverSelect({ label, name, drivers, defaultValue }: any) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-bold uppercase tracking-wider text-xs text-foreground/70 mb-1">{label}</label>
      <select 
        name={name} 
        defaultValue={defaultValue || ''} 
        required
        className="rounded-sm px-3 py-3 bg-background border border-border-color focus:border-f1-red focus:ring-1 focus:ring-f1-red outline-none transition-all"
      >
        <option value="">-- Select Driver --</option>
        {drivers?.map((d: any) => (
          <option key={d.id} value={d.id}>{d.name} ({d.teams?.name})</option>
        ))}
      </select>
    </div>
  )
}