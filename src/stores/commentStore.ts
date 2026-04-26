import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Tables } from '@/types/database'

type Comment = Tables<'comments'> & {
  profiles: { full_name: string | null } | null
}

interface CommentsState {
  commentsByCard: Record<string, Comment[]>
  fetchComments: (cardId: string) => Promise<void>
  addComment: (cardId: string, userId: string, content: string, fullName?: string) => Promise<void>
  deleteComment: (commentId: string, cardId: string) => Promise<void>
}

export const useCommentsStore = create<CommentsState>((set, get) => ({
  commentsByCard: {},
  async fetchComments(cardId) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('comments')
    .select('*,profiles(full_name)')
    .eq('card_id', cardId)
    .order('created_at', { ascending: true })

  if (error) {
    toast.error('Yorumlar yüklenemedi')
    return
  }

  set({
    commentsByCard: { ...get().commentsByCard, [cardId]: data }
  })
},
async addComment(cardId, userId, content, fullName) {
  const tempId = crypto.randomUUID()
  const snapshot = get().commentsByCard[cardId] ?? []

  const optimistic: Comment = {
    id: tempId,
    card_id: cardId,
    user_id: userId,
    content,
    created_at: new Date().toISOString(),
    profiles: fullName ? { full_name: fullName } : null,
  }

  set({
    commentsByCard: { ...get().commentsByCard, [cardId]: [...snapshot, optimistic] }
  })

  const supabase = createClient()
  const { error } = await supabase
    .from('comments')
    .insert({ card_id: cardId, user_id: userId, content })

  if (error) {
    set({ commentsByCard: { ...get().commentsByCard, [cardId]: snapshot } })
    toast.error('Yorum eklenemedi')
    return
  }

  await get().fetchComments(cardId)
},
async deleteComment(commentId, cardId) {
  const snapshot = get().commentsByCard[cardId] ?? []

  set({
    commentsByCard: {
      ...get().commentsByCard,
      [cardId]: snapshot.filter((c) => c.id !== commentId)
    }
  })

  const supabase = createClient()
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    set({ commentsByCard: { ...get().commentsByCard, [cardId]: snapshot } })
    toast.error('Yorum silinemedi')
  }
},
}))
