'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import SignOutButton from '@/components/shared/SignOutButton'
import { useBoardsStore } from '@/stores/boardsStore'
import { useProfileStore } from '@/stores/profileStore'

export default function DashboardClient({ user }: { user: User }) {
  const router = useRouter()
  const { boards, loading, fetchBoards, createBoard, deleteBoard } = useBoardsStore()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const { profile, fetchProfile, loading: profileLoading } = useProfileStore()

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards])
  
  useEffect(() => {
    fetchProfile(user.id)
  }, [user.id])

  async function handleCreate(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    await createBoard(title.trim(), user.id)
    setTitle('')
    setOpen(false)
    setCreating(false)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Panolarım</h1>
            {!profileLoading && <p className="text-sm text-slate-500">{profile?.full_name ?? user.email}</p>}
          </div>
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Pano
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Pano Oluştur</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-2">
                  <Input
                    placeholder="Pano adı"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                    required
                  />
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? 'Oluşturuluyor...' : 'Oluştur'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <SignOutButton />
          </div>
        </div>

        {loading && (
          <p className="text-slate-400">Yükleniyor...</p>
        )}

        {!loading && boards.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg">Henüz panonuz yok.</p>
            <p className="text-sm mt-1">Yukarıdan yeni bir pano oluşturun.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Card
              key={board.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/board/${board.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-base">{board.title}</CardTitle>
              </CardHeader>
              <CardFooter className="flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  {format(new Date(board.created_at), 'd MMM yyyy', { locale: tr })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteBoard(board.id)
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
