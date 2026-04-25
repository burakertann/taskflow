import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SignOutButton from '@/components/shared/SignOutButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Hoşgeldin, {user.email}
          </h1>
          <SignOutButton />
        </div>

        <p className="mt-4 text-slate-500">
          Panoların burada listelenecek. (Faz 3&apos;te gelecek)
        </p>
      </div>
    </div>
  )
}
