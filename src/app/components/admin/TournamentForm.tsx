import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/auth'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { toast } from 'sonner'

interface Props {
  onSaved: () => void
  onCancel: () => void
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now()
}

export function TournamentForm({ onSaved, onCancel }: Props) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Nome obrigatório'); return }
    if (!startDate) { setError('Data de início obrigatória'); return }
    if (!endDate) { setError('Data de fim obrigatória'); return }
    if (endDate < startDate) { setError('Data de fim deve ser após o início'); return }
    if (!user) return

    setLoading(true)
    setError(null)

    const { error: dbError } = await supabase.from('tournaments').insert({
      owner_id: user.id,
      name: name.trim(),
      slug: toSlug(name),
      start_date: startDate,
      end_date: endDate,
      status: 'draft',
      level: 'recreational',
    })

    if (dbError) {
      toast.error('Erro ao criar torneio: ' + dbError.message)
      setLoading(false)
      return
    }
    toast.success('Torneio criado!')
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="t-name">Nome do torneio</Label>
        <Input
          id="t-name"
          placeholder="Ex: Torneio Junho 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="t-start">Data de início</Label>
        <Input
          id="t-start"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="t-end">Data de fim</Label>
        <Input
          id="t-end"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? 'Criando...' : 'Criar Torneio'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
