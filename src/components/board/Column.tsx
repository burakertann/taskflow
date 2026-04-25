'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CardItem from './CardItem'
import { useBoardStore } from '@/stores/boardStore'
import type { Column as ColumnType } from '@/stores/boardStore'

export default function Column({ column }: { column: ColumnType }) {
  const { addCard } = useBoardStore()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  const { setNodeRef } = useDroppable({ id: column.id })

  async function handleAddCard(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim()) return
    await addCard(column.id, title.trim())
    setTitle('')
    setAdding(false)
  }

  return (
    <div className="shrink-0 w-72 bg-slate-100 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-slate-700 text-sm">{column.title}</h3>
        <span className="text-xs text-slate-400">{column.cards.length}</span>
      </div>

      <SortableContext
        items={column.cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="flex flex-col gap-2 min-h-5">
          {column.cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>

      {adding ? (
        <form onSubmit={handleAddCard} className="flex flex-col gap-2 mt-1">
          <Input
            autoFocus
            placeholder="Kart başlığı"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-sm bg-white"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1">
              Ekle
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { setAdding(false); setTitle('') }}
            >
              İptal
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-slate-500 hover:text-slate-700 mt-1"
          onClick={() => setAdding(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Kart ekle
        </Button>
      )}
    </div>
  )
}
