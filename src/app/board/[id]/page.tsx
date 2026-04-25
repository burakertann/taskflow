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

  if (!board) notFound()

  const canAccess = board.user_id === user.id || board.is_public
  if (!canAccess) notFound()

  return <BoardClient boardId={id} />
}
