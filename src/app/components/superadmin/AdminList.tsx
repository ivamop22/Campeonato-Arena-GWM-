import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Profile } from '../../../lib/database.types'
import { Switch } from '../ui/switch'
import { Badge } from '../ui/badge'
import { toast } from 'sonner'

interface Props {
  refreshKey: number
}

export function AdminList({ refreshKey }: Props) {
  const [admins, setAdmins] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error('Erro ao carregar admins.')
        setAdmins((data as Profile[]) ?? [])
        setLoading(false)
      })
  }, [refreshKey])

  async function toggleStatus(admin: Profile) {
    const newStatus = admin.status === 'active' ? 'blocked' : 'active'
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', admin.id)

    if (error) {
      toast.error('Erro ao atualizar status.')
      return
    }

    setAdmins((prev) =>
      prev.map((a) => (a.id === admin.id ? { ...a, status: newStatus } : a))
    )
    toast.success(`${admin.email} ${newStatus === 'active' ? 'ativado' : 'bloqueado'}.`)
  }

  if (loading) return <p className="text-muted-foreground text-sm">Carregando...</p>

  if (admins.length === 0)
    return <p className="text-muted-foreground text-center py-8 text-sm">Nenhum admin cadastrado.</p>

  return (
    <div className="space-y-3">
      {admins.map((admin) => (
        <div
          key={admin.id}
          className="flex items-center justify-between p-4 bg-card border border-border rounded-xl"
        >
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm truncate">{admin.email}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              desde {new Date(admin.created_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <Badge
              variant="outline"
              className={
                admin.status === 'active'
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }
            >
              {admin.status === 'active' ? 'Ativo' : 'Bloqueado'}
            </Badge>
            <Switch
              checked={admin.status === 'active'}
              onCheckedChange={() => toggleStatus(admin)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
