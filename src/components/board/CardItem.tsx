'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '@/stores/boardStore'

const priorityStyles: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
}

export default function CardItem({ card }: { card: Card }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg p-3 shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <p className="text-sm font-medium text-slate-800">{card.title}</p>
      {card.priority && (
        <span
          className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
            priorityStyles[card.priority] ?? 'bg-slate-100 text-slate-600'
          }`}
        >
          {card.priority}
        </span>
      )}
    </div>
  )
}
