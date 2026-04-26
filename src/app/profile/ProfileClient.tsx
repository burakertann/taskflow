'use client'

import { useEffect, useState } from 'react'
import { useProfileStore } from '@/stores/profileStore'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'

export default function ProfileClient({ user }: { user: User }) {
  const { profile, fetchProfile, updateProfile } = useProfileStore()
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    fetchProfile(user.id)
  }, [user.id])

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setBio(profile.bio ?? '')
    }
  }, [profile])

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    await updateProfile({ full_name: fullName, bio })
    toast.success('Profil güncellendi')
  }
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <h1 className="text-2xl font-bold">Profilim</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Ad Soyad</p>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Adın Soyadın"
            />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Bio</p>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Kendinden bahset..."
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full">Kaydet</Button>
        </form>
      </div>
    </div>
  )
}

