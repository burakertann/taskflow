import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { arrayMove } from '@dnd-kit/sortable'
import type { Tables } from '@/types/database'

export type Card = Tables<'cards'>
export type Column = Tables<'columns'> & { cards: Card[] }
export type Board = Tables<'boards'>

interface BoardState {
  board: Board | null
  columns: Column[]
  loading: boolean
  dragSnapshot : Column[] | null
  fetchBoardData: (boardId: string) => Promise<void>
  addColumn: (boardId: string, title: string) => Promise<void>
  addCard: (columnId: string, title: string) => Promise<void>
  reorderCardsDuringDrag: (activeCardId: string, overId: string) => void
  moveCard: (cardId: string, targetColumnId: string, newPosition: number) => Promise<void>
  beginDrag: () => void
  updateCard: (cardId: string, fields: Partial<Card>) => Promise<void>
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,
  columns: [],
  dragSnapshot: null,
  loading: false,

  async fetchBoardData(boardId) {
    set({ loading: true })
    const supabase = createClient()

    const { data, error } = await supabase
      .from('boards')
      .select('*, columns(*, cards(*))')
      .eq('id', boardId)
      .single()

    if (error || !data) {
      toast.error('Pano yüklenemedi')
      set({ loading: false })
      return
    }

    const sortedColumns: Column[] = (data.columns as Column[])
      .sort((a, b) => a.position - b.position)
      .map((col) => ({
        ...col,
        cards: col.cards.slice().sort((a, b) => a.position - b.position),
      }))

    set({ board: data, columns: sortedColumns, loading: false })
  },

  async addColumn(boardId, title) {
    const snapshot = structuredClone(get().columns)
    const maxPos = snapshot.length > 0 ? Math.max(...snapshot.map((c) => c.position)) : 0
    const position = maxPos + 1000

    const tempId = crypto.randomUUID()
    const optimistic: Column = {
      id: tempId,
      board_id: boardId,
      title,
      position,
      created_at: new Date().toISOString(),
      cards: [],
    }
    set({ columns: [...snapshot, optimistic] })

    const supabase = createClient()
    const { data, error } = await supabase
      .from('columns')
      .insert({ board_id: boardId, title, position })
      .select()
      .single()

    if (error) {
      set({ columns: snapshot })
      toast.error('Sütun eklenemedi')
      return
    }

    set({
      columns: get().columns.map((c) =>
        c.id === tempId ? { ...data, cards: [] } : c
      ),
    })
  },

  async addCard(columnId, title) {
    const snapshot = structuredClone(get().columns)
    const column = snapshot.find((c) => c.id === columnId)
    if (!column) return

    const maxPos = column.cards.length > 0 ? Math.max(...column.cards.map((c) => c.position)) : 0
    const position = maxPos + 1000

    const tempId = crypto.randomUUID()
    const optimisticCard: Card = {
      id: tempId,
      column_id: columnId,
      title,
      description: null,
      priority: 'Medium',
      position,
      created_at: new Date().toISOString(),
    }

    set({
      columns: snapshot.map((c) =>
        c.id === columnId ? { ...c, cards: [...c.cards, optimisticCard] } : c
      ),
    })

    const supabase = createClient()
    const { data, error } = await supabase
      .from('cards')
      .insert({ column_id: columnId, title, position })
      .select()
      .single()

    if (error) {
      set({ columns: snapshot })
      toast.error('Kart eklenemedi')
      return
    }

    set({
      columns: get().columns.map((c) =>
        c.id === columnId
          ? { ...c, cards: c.cards.map((card) => (card.id === tempId ? data : card)) }
          : c
      ),
    })
  },

  reorderCardsDuringDrag(activeCardId, overId) {
    const { columns } = get()

    const sourceCol = columns.find((c) => c.cards.some((card) => card.id === activeCardId))
    if (!sourceCol) return

    const targetCol =
      columns.find((c) => c.id === overId) ??
      columns.find((c) => c.cards.some((card) => card.id === overId))
    if (!targetCol) return

    const activeIdx = sourceCol.cards.findIndex((c) => c.id === activeCardId)

    if (sourceCol.id === targetCol.id) {
      const overIdx = sourceCol.cards.findIndex((c) => c.id === overId)
      if (overIdx === -1 || activeIdx === overIdx) return
      set({
        columns: columns.map((col) =>
          col.id === sourceCol.id
            ? { ...col, cards: arrayMove(col.cards, activeIdx, overIdx) }
            : col
        ),
      })
    } else {
      const activeCard = sourceCol.cards[activeIdx]
      const overIdx = targetCol.cards.findIndex((c) => c.id === overId)
      const insertAt = overIdx === -1 ? targetCol.cards.length : overIdx
      const newTargetCards = [...targetCol.cards]
      newTargetCards.splice(insertAt, 0, { ...activeCard, column_id: targetCol.id })

      set({
        columns: columns.map((col) => {
          if (col.id === sourceCol.id) return { ...col, cards: col.cards.filter((c) => c.id !== activeCardId) }
          if (col.id === targetCol.id) return { ...col, cards: newTargetCards }
          return col
        }),
      })
    }
  },

  async moveCard(cardId, targetColumnId, newPosition) {
    const snapshot = structuredClone(get().columns)

    set({
      columns: snapshot.map((col) => ({
        ...col,
        cards: col.cards
          .map((card) =>
            card.id === cardId
              ? { ...card, column_id: targetColumnId, position: newPosition }
              : card
          )
          .sort((a, b) => a.position - b.position),
      })),
    })

    const supabase = createClient()
    const { error } = await supabase
      .from('cards')
      .update({ column_id: targetColumnId, position: newPosition })
      .eq('id', cardId)

    if (error) {
      set({columns: get().dragSnapshot!, dragSnapshot: null})
      toast.error('Kart taşınamadı, geri alındı')
    }else{
      set({dragSnapshot: null})
    }
  },

  beginDrag() {
    set({dragSnapshot: structuredClone(get().columns)})
  },

  async updateCard(cardId, fields) {
    const snapshot = structuredClone(get().columns)

    set({
      columns: get().columns.map((col) => ({
        ...col,
        cards: col.cards.map((card) =>
          card.id === cardId ? { ...card, ...fields } : card
        ),
      })),
    })

    const supabase = createClient()
    const { error } = await supabase
      .from('cards')
      .update(fields)
      .eq('id', cardId)

    if (error) {
      set({ columns: snapshot })
      toast.error('Kart güncellenemedi')
    }
  },


}))
