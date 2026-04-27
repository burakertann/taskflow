import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import BoardClient from '@/components/board/BoardClient'

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: board } = await supabase
    .from('boards')
    .select('id, is_public, user_id')
    .eq('id', id)
    .single()

  if (!board) redirect('/dashboard')

  const isOwner = board.user_id === user.id

  if (!isOwner) {
    const { data: membership } = await supabase
      .from('board_members')
      .select('id')
      .eq('board_id', id)
      .eq('user_id', user.id)
      .single()

    if (!membership && !board.is_public) notFound()
  }

  return <BoardClient boardId={id} isOwner={isOwner} />
}
