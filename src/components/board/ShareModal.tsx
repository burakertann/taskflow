'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  boardId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ShareModal({ boardId, open, onOpenChange }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

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

    const { error } = await supabase
      .from('board_members')
      .insert({ board_id: boardId, user_id: profile.id })

    if (error) {
      toast.error('Paylaşım başarısız')
    } else {
      toast.success('Pano paylaşıldı')
      setEmail('')
      onOpenChange(false)
    }
    setLoading(false)
  }

    return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Panoyu Paylaş</DialogTitle>
        </DialogHeader>
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

