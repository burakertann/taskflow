'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  TouchSensor,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Column from './Column'
import { useBoardStore, type Card } from '@/stores/boardStore'
import { getPositionBetween, needsRebalance } from '@/lib/utils/fractional-index'
import { createClient } from '@/lib/supabase/client'
import { Switch } from '@/components/ui/switch'

export default function BoardClient({ boardId, isOwner }: { boardId: string; isOwner: boolean }) {
  const { board, columns, loading, fetchBoardData, addColumn, reorderCardsDuringDrag, moveCard, beginDrag, togglePublic } =
    useBoardStore()
  const [addingCol, setAddingCol] = useState(false)
  const [colTitle, setColTitle] = useState('')
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  const sensors = useSensors(
    ...(isOwner ? [
      useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
      useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    ] : [])
  )

  useEffect(() => {
    fetchBoardData(boardId)
  }, [boardId, fetchBoardData])

  function onDragStart(event: DragStartEvent) {
    beginDrag()
    const cardId = String(event.active.id)
    const found = columns.flatMap((c) => c.cards).find((card) => card.id === cardId)
    setActiveCard(found ?? null)
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return
    reorderCardsDuringDrag(activeId, overId)
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)

    if (!over) {
      fetchBoardData(boardId)
      return
    }

    const activeId = String(active.id)
    const targetCol = columns.find((c) => c.cards.some((card) => card.id === activeId))
    if (!targetCol) return

    const cardIndex = targetCol.cards.findIndex((c) => c.id === activeId)
    const prevPos = targetCol.cards[cardIndex - 1]?.position ?? null
    const nextPos = targetCol.cards[cardIndex + 1]?.position ?? null

    const newPosition = getPositionBetween(prevPos,nextPos)

    if (prevPos !== null && nextPos !== null && needsRebalance(prevPos,nextPos)){
       const supabase = createClient()
       await supabase.rpc('rebalance_column', { col_id: targetCol.id })
       await fetchBoardData(boardId)
       return
    }
    moveCard(activeId, targetCol.id, newPosition)
  }

  async function handleAddColumn(e: React.FormEvent<HTMLFormElement & EventTarget>) {
    e.preventDefault()
    if (!colTitle.trim()) return
    await addColumn(boardId, colTitle.trim())
    setColTitle('')
    setAddingCol(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Yükleniyor...
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Pano bulunamadı.
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex flex-col h-screen">
        <header className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b bg-white">
          <h1 className="text-lg font-bold text-slate-800">{board.title}</h1>
          {isOwner && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Public</span>
              <Switch checked={board.is_public} onCheckedChange={togglePublic} />
            </div>
          )}
        </header>
        
        <div className="flex-1 overflow-x-auto p-4 md:p-6">
          <div className="flex gap-4 items-start h-full min-w-max">
            {columns.map((column) => (
              <Column key={column.id} column={column} isOwner = {isOwner}/>
            ))}
          {isOwner && (
            addingCol ? (
              <form
                onSubmit={handleAddColumn}
                className="shrink-0 w-64 md:w-72 bg-slate-100 rounded-xl p-3 flex flex-col gap-2"
              >
                <Input
                  autoFocus
                  placeholder="Sütun adı"
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  className="bg-white text-sm"
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="flex-1">
                    Ekle
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => { setAddingCol(false); setColTitle('') }}
                  >
                    İptal
                  </Button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAddingCol(true)}
                className="shrink-0 w-64 md:w-72 h-12 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Sütun ekle
              </button>
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="bg-white rounded-lg p-3 shadow-xl border border-slate-300 rotate-2 cursor-grabbing">
            <p className="text-sm font-medium text-slate-800">{activeCard.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
