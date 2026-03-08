import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const supabase = await createClient()
  const { message } = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Fetch current user details
  const { data: userData } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .single()

  const updateProfile = async (formData: FormData) => {
    'use server'
    const name = formData.get('name') as string
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase.from('users').update({ name }).eq('id', user.id)
    }
    
    return redirect('/profile?message=Profile updated successfully')
  }

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 md:px-8 py-12 flex flex-col gap-8">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Your Profile</h1>
      
      <div className="bg-card-bg border border-border-color p-8 rounded-xl shadow-2xl">
        <form action={updateProfile} className="flex flex-col gap-6">
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-foreground/70 mb-2">Email (Cannot be changed)</label>
            <input 
              type="email" 
              value={userData?.email || user.email} 
              disabled 
              className="w-full rounded-md px-4 py-3 bg-background border border-border-color opacity-50 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-f1-red mb-2">Display Name</label>
            <input 
              type="text" 
              name="name" 
              defaultValue={userData?.name || ''} 
              placeholder="e.g. Max Fan 33"
              required
              className="w-full rounded-md px-4 py-3 bg-background border border-border-color focus:border-f1-red focus:ring-1 focus:ring-f1-red outline-none transition-all"
            />
            <p className="text-xs text-foreground/50 mt-2 font-medium">This name will be shown on the public leaderboard.</p>
          </div>

          <button 
            type="submit" 
            className="mt-4 bg-f1-red hover:bg-red-700 text-white font-bold uppercase tracking-widest py-4 px-6 rounded-sm transition-colors"
          >
            Update Profile
          </button>

          {message && (
            <div className="mt-2 p-4 bg-green-500/10 border border-green-500/50 text-green-500 font-bold text-center rounded-sm">
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
