import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const { message } = await searchParams

  const signIn = async (formData: FormData) => {
    'use server'

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return redirect('/login?message=Could not authenticate user')
    }

    return redirect('/')
  }

  const signUp = async (formData: FormData) => {
    'use server'

    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = await createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })

    if (error) {
      return redirect('/login?message=Could not authenticate user')
    }

    return redirect('/login?message=Check email to continue sign in process')
  }

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto mt-24">
      <form
        className="flex flex-col w-full justify-center gap-2 text-foreground"
        action={signIn}
      >
        <h1 className="text-2xl font-bold mb-4">F1 Tipping Competition</h1>
        
        <label className="text-md" htmlFor="email">
          Email
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-6"
          name="email"
          placeholder="you@example.com"
          required
        />
        
        <label className="text-md" htmlFor="password">
          Password
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-6"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />
        
        <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-2">
          Sign In
        </button>
        <button
          formAction={signUp}
          className="border border-foreground/20 hover:bg-slate-100 py-2 px-4 rounded mb-2"
        >
          Sign Up
        </button>
        
        {message && (
          <p className="mt-4 p-4 bg-foreground/10 text-foreground text-center rounded-md">
            {message}
          </p>
        )}
      </form>
    </div>
  )
}
