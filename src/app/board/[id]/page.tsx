export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Board: {id}</h1>
      <p className="text-slate-400 mt-2">Faz 4&apos;te gelecek.</p>
    </div>
  )
}
