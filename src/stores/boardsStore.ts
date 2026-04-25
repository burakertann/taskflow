import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'

type Board = Tables<'boards'>

interface BoardsState {
  boards: Board[]
  loading: boolean
  fetchBoards: () => Promise<void>
  createBoard: (title: string, userId: string) => Promise<void>
  deleteBoard: (id: string) => Promise<void>
}

export const useBoardsStore = create<BoardsState>((set, get) => ({
  boards: [],
  loading: false,

  async fetchBoards() {
    set({ loading: true })
    const supabase = createClient()
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Panolar yüklenemedi')
    } else {
      set({ boards: data })
    }
    set({ loading: false })
  },

  async createBoard(title, userId) {
    const tempId = crypto.randomUUID()
    const snapshot = get().boards
    const optimistic: Board = {
      id: tempId,
      title,
      user_id: userId,
      is_public: false,
      created_at: new Date().toISOString(),
    }
    set({ boards: [optimistic, ...snapshot] })

    const supabase = createClient()
    const { data, error } = await supabase
      .from('boards')
      .insert({ title, user_id: userId })
      .select()
      .single()

    if (error) {
      set({ boards: snapshot })
      toast.error('Pano oluşturulamadı')
      return
    }

    set({ boards: get().boards.map((b) => (b.id === tempId ? data : b)) })
    toast.success('Pano oluşturuldu')
  },

  async deleteBoard(id) {
    const snapshot = get().boards
    set({ boards: snapshot.filter((b) => b.id !== id) })

    const supabase = createClient()
    const { error } = await supabase.from('boards').delete().eq('id', id)

    if (error) {
      set({ boards: snapshot })
      toast.error('Pano silinemedi, geri alındı')
    } else {
      toast.success('Pano silindi')
    }
  },
}))
