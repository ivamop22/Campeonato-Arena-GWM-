import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { toast } from 'sonner'

interface FormData {
  email: string
  password: string
}

interface Props {
  onCreated: () => void
}

export function CreateAdminDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setLoading(true)

    const { data: fnData, error: fnError } = await supabase.functions.invoke('create-admin-user', {
      body: { email: data.email, password: data.password },
    })

    if (fnError || fnData?.error) {
      toast.error(fnData?.error ?? 'Erro ao criar admin.')
      setLoading(false)
      return
    }

    toast.success(`Admin ${data.email} criado com sucesso.`)
    reset()
    setOpen(false)
    onCreated()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Novo Admin</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Admin</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="admin@email.com"
              {...register('email', {
                required: 'Email obrigatório',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Email inválido',
                },
              })}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input
              type="password"
              placeholder="mínimo 8 caracteres"
              {...register('password', {
                required: 'Senha obrigatória',
                minLength: { value: 8, message: 'Mínimo 8 caracteres' },
              })}
            />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Admin'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
