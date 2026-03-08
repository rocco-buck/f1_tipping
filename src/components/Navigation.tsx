import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Navigation() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userRole = 'user'

  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData) {
      userRole = userData.role
    }
  }

  const signOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    return redirect('/login')
  }

  return (
    <nav className="w-full flex justify-center border-b-2 border-border-color h-16 bg-card-bg shadow-lg">
      <div className="w-full max-w-5xl flex justify-between items-center px-4 md:px-8 text-sm">
        <div className="flex gap-8 items-center font-semibold">
          <a href="/" className="flex items-center gap-2">
            <span className="text-f1-red font-extrabold tracking-tight text-2xl" style={{ fontFamily: 'Titillium Web, sans-serif' }}>F1</span>
            <span className="font-extrabold tracking-wide uppercase mt-1">Tipping</span>
          </a>
        </div>
        {!user ? (
          <div className="flex gap-4">
            <a
              href="/login"
              className="py-2 px-4 flex rounded-md font-bold uppercase tracking-wider text-xs border border-border-color hover:bg-border-color transition-colors"
            >
              Login
            </a>
          </div>
        ) : (
          <div className="flex items-center gap-4 md:gap-6 font-bold uppercase text-xs tracking-wider">
            <a href="/profile" className="hover:text-f1-red transition-colors py-2 truncate max-w-[120px] inline-block align-bottom">{user.email}</a>
            <a href="/leaderboard" className="hover:text-f1-red transition-colors py-2">Leaderboard</a>
            {userRole === 'admin' && (
              <a href="/admin" className="text-f1-red hover:text-white transition-colors py-2">Admin</a>
            )}
            <form action={signOut}>
              <button className="py-2 px-4 rounded-md border border-border-color hover:bg-border-color transition-colors uppercase font-bold tracking-wider text-xs">
                Logout
              </button>
            </form>
          </div>
        )}
      </div>
    </nav>
  )
}
