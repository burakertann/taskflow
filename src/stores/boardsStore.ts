import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'

type Board = Tables<'boards'> & {
  profiles: { full_name: string | null; email: string | null } | null
}

interface BoardsState {
  boards: Board[]
  loading: boolean
  fetchBoards: (userId: string) => Promise<void>
  createBoard: (title: string, userId: string) => Promise<void>
  deleteBoard: (id: string) => Promise<void>
}

export const useBoardsStore = create<BoardsState>((set, get) => ({
  boards: [],
  loading: false,

  async fetchBoards(userId) {
    set({ loading: true })
    const supabase = createClient()

    const [ownResult, membershipResult] = await Promise.all([
      supabase
        .from('boards')
        .select('*, profiles(full_name, email)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('board_members')
        .select('board_id')
        .eq('user_id', userId),
    ])

    if (ownResult.error) {
      toast.error('Panolar yüklenemedi')
      set({ loading: false })
      return
    }

    const memberBoardIds = membershipResult.data?.map((m) => m.board_id).filter((id): id is string => id !== null) ?? []
    console.log('membershipResult:', membershipResult.data, membershipResult.error)
    console.log('memberBoardIds:', memberBoardIds)
    let memberBoards: Board[] = []
    

    if (memberBoardIds.length > 0) {
      const { data, error: memberBoardsError } = await supabase
        .from('boards')
        .select('*, profiles(full_name, email)')
        .in('id', memberBoardIds)
      memberBoards = (data ?? []) as Board[]
      console.log('memberBoards data:', data, 'error:', memberBoardsError)
    }

    const ownIds = new Set(ownResult.data?.map((b) => b.id))
    const merged = [
      ...(ownResult.data ?? []),
      ...memberBoards.filter((b) => !ownIds.has(b.id)),
    ]

    set({ boards: merged, loading: false })
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
      profiles: null,
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
    set({ boards: get().boards.map((b) => (b.id === tempId ? { ...data, profiles: null } : b)) })
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
