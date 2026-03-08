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
  const logo_url = formData.get('logo_url') as string

  await supabase.from('teams').insert({
    name,
    logo_url: logo_url || null,
  })

  return redirect('/admin')
}
