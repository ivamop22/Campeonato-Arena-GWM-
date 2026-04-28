import { useForm } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/auth'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { toast } from 'sonner'

interface FormData {
  name: string
}

interface Props {
  onSaved: () => void
  onCancel: () => void
}

export function TournamentForm({ onSaved, onCancel }: Props) {
  const { user } = useAuth()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    if (!user) return

    const { error } = await supabase.from('tournaments').insert({
      owner_id: user.id,
      name: data.name,
    })

    if (error) {
      toast.error('Erro ao criar torneio.')
      return
    }
    toast.success('Torneio criado!')
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label>Nome do torneio</Label>
        <Input
          placeholder="Ex: Torneio Junho 2026"
          {...register('name', { required: 'Nome obrigatório' })}
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>
      <div className="flex gap-3">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'Criando...' : 'Criar Torneio'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
