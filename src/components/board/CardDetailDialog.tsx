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

interface Props {
  card: Card
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CardDetailDialog({ card, open, onOpenChange }: Props) {
    const [title, setTitle] = useState(card.title)
    const [description, setDescription] = useState(card.description ?? '')
    const { updateCard } = useBoardStore()
    const [debouncedTitle] = useDebounce(title, 500)
    const [debouncedDescription] = useDebounce(description, 500)
    
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle>
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-lg font-bold border-none shadow-none px-0 focus-visible:ring-0"
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
                />
                </div>

                <div>
                <p className="text-xs text-slate-500 mb-1">Öncelik</p>
                <Select
                value={card.priority ?? 'Medium'}
                onValueChange={(value) => updateCard(card.id, { priority: value as 'Low' | 'Medium' | 'High' })}
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
            </div>
            </DialogContent>
        </Dialog>
)
}

