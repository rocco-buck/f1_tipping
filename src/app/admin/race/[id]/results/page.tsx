import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminResultsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: race_id } = await params
  const supabase = await createClient()

  // Verify Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (userData?.role !== 'admin') return redirect('/')

  // Fetch Race Info
  const { data: race } = await supabase.from('races').select('*').eq('id', race_id).single()
  if (!race) return <div className="p-8 text-center text-red-500">Race not found.</div>

  // Fetch Drivers
  const { data: drivers } = await supabase.from('drivers').select('*, teams(name)').order('name')

  // Fetch Existing Results (if any)
  const { data: results } = await supabase.from('race_results').select('*').eq('race_id', race_id).maybeSingle()

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto p-8 flex flex-col gap-6">
      <div className="flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold">Input Results: {race.name}</h1>
          <p className="text-foreground/70 text-sm mt-1">Status: {race.status.toUpperCase()}</p>
        </div>
        <a href="/admin" className="text-blue-600 hover:underline">← Back to Admin</a>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-md text-sm border border-blue-200 dark:border-blue-800">
        <p className="font-bold mb-1">How scoring works:</p>
        <p>Entering the results here and clicking "Save Results & Calculate Scores" will immediately update every user's total score based on their predictions.</p>
      </div>

      <form action={`/api/admin/race/${race_id}/results`} method="POST" className="flex flex-col gap-8 bg-foreground/5 p-8 rounded-xl border">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DriverSelect label="Pole Position" name="pole_driver_id" drivers={drivers} defaultValue={results?.pole_driver_id} />
          <DriverSelect label="1st Place" name="p1_driver_id" drivers={drivers} defaultValue={results?.p1_driver_id} />
          <DriverSelect label="2nd Place" name="p2_driver_id" drivers={drivers} defaultValue={results?.p2_driver_id} />
          <DriverSelect label="3rd Place" name="p3_driver_id" drivers={drivers} defaultValue={results?.p3_driver_id} />
          <DriverSelect label="10th Place" name="p10_driver_id" drivers={drivers} defaultValue={results?.p10_driver_id} />
        </div>

        {race.crazy_prediction_desc && (
          <div className="mt-4 p-6 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
            <label className="block font-bold text-purple-900 dark:text-purple-200 mb-2">
              Crazy Prediction Answer: {race.crazy_prediction_desc}
            </label>
            <p className="text-xs text-purple-700 dark:text-purple-300 mb-3">
              Note: Because this is a free-text field, automatic scoring for crazy predictions is difficult. You will need to manually verify crazy predictions for now, or match exact text strings.
            </p>
            <input 
              type="text" 
              name="crazy_prediction_answer" 
              defaultValue={results?.crazy_prediction_answer || ''}
              placeholder="Exact correct answer..."
              className="w-full rounded-md px-4 py-3 bg-background border border-purple-300 dark:border-purple-700" 
            />
          </div>
        )}

        <div className="flex justify-end gap-4 pt-4 border-t">
          <button 
            type="submit" 
            className="px-6 py-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md"
          >
            Save Results & Calculate Scores
          </button>
        </div>
      </form>
    </div>
  )
}

function DriverSelect({ label, name, drivers, defaultValue }: any) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-semibold text-sm">{label}</label>
      <select 
        name={name} 
        defaultValue={defaultValue || ''} 
        required
        className="rounded-md px-3 py-2 bg-background border"
      >
        <option value="">-- Select Winner --</option>
        {drivers?.map((d: any) => (
          <option key={d.id} value={d.id}>{d.name} ({d.teams?.name})</option>
        ))}
      </select>
    </div>
  )
}
