'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CardItem from './CardItem'
import { useBoardStore } from '@/stores/boardStore'
import type { Column as ColumnType } from '@/stores/boardStore'

export default function Column({ column, isOwner }: { column: ColumnType; isOwner: boolean }) {
  const { addCard, deleteColumn } = useBoardStore()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  const { setNodeRef } = useDroppable({ id: column.id })
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function handleAddCard(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim()) return
    await addCard(column.id, title.trim())
    setTitle('')
    setAdding(false)
  }

  return (
    <div className="shrink-0 w-64 md:w-72 bg-slate-100 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-slate-700 text-sm">{column.title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{column.cards.length}</span>
          {isOwner && (
            confirmingDelete ? (
              <div className="flex items-center gap-1">
                <button onClick={() => deleteColumn(column.id)} className="text-xs text-red-500 font-medium">Sil</button>
                <span className="text-xs text-slate-300">/</span>
                <button onClick={() => setConfirmingDelete(false)} className="text-xs text-slate-400">İptal</button>
              </div>
            ) : (
              <button onClick={() => setConfirmingDelete(true)} className="text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>
      <SortableContext
        items={column.cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="flex flex-col gap-2 min-h-5">
          {column.cards.map((card) => (
            <CardItem key={card.id} card={card} isOwner={isOwner} />
          ))}
        </div>
      </SortableContext>

      {isOwner && (
        adding ? (
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
      ))
    }
    </div>
  )
}
