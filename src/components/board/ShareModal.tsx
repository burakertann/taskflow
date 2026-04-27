'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { X } from 'lucide-react'

interface Member {
  id: string
  user_id: string
  profiles: { full_name: string | null; email: string | null } | null
}

interface Props {
  boardId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ShareModal({ boardId, open, onOpenChange }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('board_members')
      .select('id, user_id, profiles(full_name, email)')
      .eq('board_id', boardId)
      .then(({ data }) => setMembers((data as Member[]) ?? []))
  }, [open, boardId])

  async function handleShare(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)

    const supabase = createClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim())
      .single()

    if (profileError || !profile) {
      toast.error('Bu email ile kayıtlı kullanıcı bulunamadı')
      setLoading(false)
      return
    }

    const { data: newMember, error } = await supabase
      .from('board_members')
      .insert({ board_id: boardId, user_id: profile.id })
      .select('id, user_id, profiles(full_name, email)')
      .single()

    if (error) {
      toast.error('Paylaşım başarısız')
    } else {
      toast.success('Pano paylaşıldı')
      setMembers((prev) => [...prev, newMember as Member])
      setEmail('')
    }
    setLoading(false)
  }

  async function handleRemove(memberId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('board_members').delete().eq('id', memberId)
    if (error) {
      toast.error('Çıkarma başarısız')
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      toast.success('Kullanıcı çıkarıldı')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Panoyu Paylaş</DialogTitle>
        </DialogHeader>

        {members.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Erişimi olanlar</p>
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-700">
                  {m.profiles?.full_name ?? m.profiles?.email ?? 'Kullanıcı'}
                </span>
                <button onClick={() => handleRemove(m.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleShare} className="space-y-3">
          <Input
            type="email"
            placeholder="Kullanıcı emaili"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Ekleniyor...' : 'Paylaş'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
