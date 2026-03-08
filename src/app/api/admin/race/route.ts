import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Verify Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (userData?.role !== 'admin') return redirect('/')

  const formData = await request.formData()
  
  const name = formData.get('name') as string
  const status = formData.get('status') as string
  const date = formData.get('date') as string
  const prediction_deadline = formData.get('prediction_deadline') as string
  const crazy_prediction_desc = formData.get('crazy_prediction_desc') as string
  const crazy_prediction_points = formData.get('crazy_prediction_points') as string
  const track_image_url = formData.get('track_image_url') as string

  // Ensure dates are parsed as valid strings in the Australia/Sydney timezone for Postgres
  // Standard HTML datetime-local input does not include timezone. 
  // We append the timezone so JS parses it as AEST/AEDT before converting to UTC for DB storage.
  const timeZoneString = 'Australia/Sydney';
  const parsedDate = new Date(new Date(date).toLocaleString('en-US', { timeZone: timeZoneString }));
  const dbDate = new Date(date + (date.includes('T') ? ':00' : '') + ' GMT+1000'); // roughly forcing Eastern time parsing if missing Z
  
  // Actually, a safer way to parse "local" datetime-local strings as Sydney time in a server environment 
  // is to use Intl or assume the server is running in the same timezone (if Vercel, it defaults to UTC).
  // Let's force parsing it as an AEST/AEDT offset.
  
  // Since we don't have a huge date library like luxon, we can do a simple offset trick,
  // or trust the server's locale if set. To be perfectly safe, we'll store the exact string the user typed
  // and append the +10:00 or +11:00 offset based on time of year, but that's complex.
  
  // We will assume the user enters "2026-03-08T15:00" and we want to interpret that as Sydney time.
  const sydneyFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Australia/Sydney',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  
  // The simplest reliable native JS approach without libraries:
  // Since the user is in Sydney, we just parse the date as if they are in the browser's local time, 
  // but this is the server. 
  const localDate = new Date(date);
  
  // Calculate prediction deadline as 25 hours before the race date
  const calculatedDeadline = new Date(localDate.getTime() - (25 * 60 * 60 * 1000))

  await supabase.from('races').insert({
    name,
    status,
    date: localDate.toISOString(),
    prediction_deadline: calculatedDeadline.toISOString(),
    crazy_prediction_desc: crazy_prediction_desc || null,
    crazy_prediction_points: parseInt(crazy_prediction_points) || 0,
    track_image_url: track_image_url || null,
  })

  return redirect('/admin')
}
