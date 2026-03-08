import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { formatAussieDate } from '@/utils/dateFormatter'

export const dynamic = 'force-dynamic'

export default async function PredictionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: race_id } = await params
  const supabase = await createClient()

  // Verify User
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Fetch Race Info
  const { data: race } = await supabase
    .from('races')
    .select('*')
    .eq('id', race_id)
    .single()

  if (!race) {
    return <div className="p-8 text-center text-red-500">Race not found.</div>
  }

  // Fetch Drivers for dropdowns
  const { data: drivers } = await supabase
    .from('drivers')
    .select('*, teams(name)')
    .order('name')

  // Fetch Existing Prediction
  const { data: prediction } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.id)
    .eq('race_id', race_id)
    .maybeSingle()

  // Check if past deadline
  const isPastDeadline = new Date() > new Date(race.prediction_deadline)
  const isLocked = isPastDeadline || prediction?.is_locked

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto p-8 flex flex-col gap-6">
      <div className="flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold">{race.name} Predictions</h1>
          <p className="text-foreground/70">{formatAussieDate(race.date)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-orange-600 uppercase">Deadline</p>
          <p className="font-mono">{formatAussieDate(race.prediction_deadline)}</p>
        </div>
      </div>

      {isLocked && (
        <div className="bg-orange-100 border border-orange-300 text-orange-800 p-4 rounded-md font-bold text-center">
          Picks are locked for this race! You can no longer edit your predictions.
        </div>
      )}

      <form action={`/api/predict`} method="POST" className="flex flex-col gap-8 bg-foreground/5 p-8 rounded-xl border">
        <input type="hidden" name="race_id" value={race.id} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DriverSelect label="Pole Position (15 pts)" name="pole_driver_id" drivers={drivers} defaultValue={prediction?.pole_driver_id} disabled={isLocked} />
          <DriverSelect label="1st Place (25 pts)" name="p1_driver_id" drivers={drivers} defaultValue={prediction?.p1_driver_id} disabled={isLocked} />
          <DriverSelect label="2nd Place (18 pts)" name="p2_driver_id" drivers={drivers} defaultValue={prediction?.p2_driver_id} disabled={isLocked} />
          <DriverSelect label="3rd Place (15 pts)" name="p3_driver_id" drivers={drivers} defaultValue={prediction?.p3_driver_id} disabled={isLocked} />
          <DriverSelect label="10th Place (10 pts)" name="p10_driver_id" drivers={drivers} defaultValue={prediction?.p10_driver_id} disabled={isLocked} />
        </div>

        {race.crazy_prediction_desc && (
          <div className="mt-4 p-6 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
            <label className="block font-bold text-purple-900 dark:text-purple-200 mb-2">
              Crazy Prediction ({race.crazy_prediction_points} pts): {race.crazy_prediction_desc}
            </label>
            <input 
              type="text" 
              name="crazy_prediction_value" 
              defaultValue={prediction?.crazy_prediction_value || ''}
              disabled={isLocked}
              placeholder="Your answer..."
              className="w-full rounded-md px-4 py-3 bg-background border border-purple-300 dark:border-purple-700 focus:ring-2 focus:ring-purple-500" 
            />
          </div>
        )}

        {!isLocked && (
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button 
              type="submit" 
              name="action" 
              value="save"
              className="px-6 py-2 rounded-md bg-foreground/10 hover:bg-foreground/20 font-semibold"
            >
              Save Draft
            </button>
            <button 
              type="submit" 
              name="action" 
              value="lock"
              className="px-6 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md"
            >
              Lock In Picks
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

function DriverSelect({ label, name, drivers, defaultValue, disabled }: any) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-semibold text-sm">{label}</label>
      <select 
        name={name} 
        defaultValue={defaultValue || ''} 
        disabled={disabled}
        required
        className="rounded-md px-3 py-2 bg-background border disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">-- Select Driver --</option>
        {drivers?.map((d: any) => (
          <option key={d.id} value={d.id}>{d.name} ({d.teams?.name})</option>
        ))}
      </select>
    </div>
  )
}
