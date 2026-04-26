'use client'

import { useState,useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { Card } from '@/stores/boardStore'
import { useDebounce } from 'use-debounce'
import { useBoardStore } from '@/stores/boardStore'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useCommentsStore } from '@/stores/commentStore'
import { useProfileStore } from '@/stores/profileStore'
import { createClient } from '@/lib/supabase/client'

interface Props {
  card: Card
  open: boolean
  onOpenChange: (open: boolean) => void
  isOwner: boolean
}

export default function CardDetailDialog({ card, open, onOpenChange, isOwner}: Props) {
    const [title, setTitle] = useState(card.title)
    const [description, setDescription] = useState(card.description ?? '')
    const { updateCard } = useBoardStore()
    const { fetchComments, addComment, deleteComment, commentsByCard } = useCommentsStore()
    const { profile } = useProfileStore()
    const comments = commentsByCard[card.id] ?? []
    const [debouncedTitle] = useDebounce(title, 500)
    const [debouncedDescription] = useDebounce(description, 500)
    const [content, setContent] = useState('')
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
        setCurrentUserId(data.user?.id ?? null)
    })
    }, [])

    useEffect(() => {
    if (debouncedTitle !== card.title) {
        updateCard(card.id, { title: debouncedTitle })
    }
    }, [debouncedTitle])

    useEffect(() => {
    if (debouncedDescription !== (card.description ?? '')) {
        updateCard(card.id, { description: debouncedDescription })
    }
    }, [debouncedDescription])

    useEffect(() => {
        if (open) fetchComments(card.id)
    }, [open])
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle>
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-lg font-bold border-none shadow-none px-0 focus-visible:ring-0"
                    readOnly={!isOwner}
                />
                </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
                <div>
                <p className="text-xs text-slate-500 mb-1">Açıklama</p>
                <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Açıklama ekle..."
                    rows={4}
                    readOnly={!isOwner}
                />
                </div>

                <div>
                            <p className="text-xs text-slate-500 mb-1">Öncelik</p>
                            <Select
                            value={card.priority ?? 'Medium'}
                            onValueChange={(value) => updateCard(card.id, { priority: value as 'Low' | 'Medium' | 'High' })}
                            disabled = {!isOwner}
                            >
                            <SelectTrigger className="w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                            </Select>
                            </div>
                            <div>
            <p className="text-xs text-slate-500 mb-2">Yorumlar</p>
            
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {comments.map((comment) => (
                <div key={comment.id} className="bg-slate-50 rounded-lg p-2 text-sm">
                    <p className="text-xs font-medium text-slate-600 mb-0.5">
                        {comment.profiles?.full_name ?? 'Kullanıcı'}
                    </p>
                    <div className="flex justify-between items-start">
                    <p className="text-slate-800">{comment.content}</p>
                    {comment.user_id === currentUserId && (
                        <button
                        onClick={() => deleteComment(comment.id, card.id)}
                        className="text-xs text-red-400 hover:text-red-600 ml-2 shrink-0"
                        >
                        Sil
                        </button>
                    )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: tr })}
                    </p>
                </div>
                ))}
            </div>

            <form
                onSubmit={(e) => {
                e.preventDefault()
                if (!content.trim()) return
                addComment(card.id, currentUserId ?? '', content.trim(), profile?.full_name ?? undefined)
                setContent('')
                }}
                className="flex gap-2"
            >
                <input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Yorum yaz..."
                className="flex-1 text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
                <button
                type="submit"
                className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-md hover:bg-slate-700"
                >
                Gönder
                </button>
            </form>
            </div>
            </div>
            </DialogContent>
        </Dialog>
)
}

