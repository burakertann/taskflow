import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'

type Profile = Tables<'profiles'>

interface ProfileState {
  profile: Profile | null
  loading: boolean
  fetchProfile: (userId: string) => Promise<void>
  updateProfile: (fields: Partial<Profile>) => Promise<void>
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,

  async fetchProfile(userId) {
    set({ loading: true })
    const supabase = createClient()

    const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId).single()

    if (error) {
        toast.error('Profil Yüklenemedi')
        set({ loading: false })
        return
    }

    set({ profile: data, loading: false })
  },

  async updateProfile(fields) {
    const snapshot = structuredClone(get().profile)

    set({ profile: { ...get().profile!, ...fields } })

    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update(fields)
      .eq('id', get().profile!.id)

    if (error) {
      set({ profile: snapshot })
      toast.error('Profil güncellenemedi')
    }

  },
}))
