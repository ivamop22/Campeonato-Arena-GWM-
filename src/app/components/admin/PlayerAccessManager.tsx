import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/auth'
import { PlayerAccess } from '../../../lib/database.types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { toast } from 'sonner'

export function PlayerAccessManager() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<PlayerAccess[]>([])
  const { register, handleSubmit, reset } = useForm<{ email: string }>()

  useEffect(() => {
    if (!user) return
    supabase
      .from('player_access')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setEntries((data as PlayerAccess[]) ?? []))
  }, [user])

  const onSubmit = async ({ email }: { email: string }) => {
    if (!user) return
    const { data, error } = await supabase
      .from('player_access')
      .insert({ email: email.toLowerCase().trim(), owner_id: user.id })
      .select()
      .single()

    if (error) {
      toast.error('Erro: email pode já estar cadastrado.')
      return
    }
    setEntries((prev) => [data as PlayerAccess, ...prev])
    reset()
    toast.success('Jogador adicionado.')
  }

  const removeAccess = async (id: string) => {
    await supabase.from('player_access').delete().eq('id', id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
    toast.success('Acesso removido.')
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Acesso de Jogadores</h3>
      <p className="text-xs text-muted-foreground">
        Cadastre o email do jogador. Ele poderá se registrar e ver os torneios em modo somente leitura.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
        <Input
          type="email"
          placeholder="jogador@email.com"
          {...register('email', { required: true })}
          className="flex-1"
        />
        <Button type="submit" size="sm">Adicionar</Button>
      </form>
      <div className="space-y-2">
        {entries.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm"
          >
            <span>{e.email}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-500 hover:bg-red-500/10 h-7 px-2"
              onClick={() => removeAccess(e.id)}
            >
              Remover
            </Button>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">Nenhum jogador cadastrado.</p>
        )}
      </div>
    </div>
  )
}
