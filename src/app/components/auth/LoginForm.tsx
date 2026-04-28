import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { useAuth } from '../../../lib/auth'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

interface FormData {
  email: string
  password: string
}

export function LoginForm() {
  const { signIn, role, status } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setServerError(null)
    const { error } = await signIn(data.email, data.password)
    if (error) {
      setServerError('Email ou senha inválidos.')
      setLoading(false)
    }
  }

  if (status === 'blocked') {
    return (
      <p className="text-sm text-red-500 text-center">
        Sua conta está bloqueada. Entre em contato com o administrador.
      </p>
    )
  }

  if (role === 'super_admin') navigate('/superadmin', { replace: true })
  if (role === 'admin') navigate('/admin', { replace: true })
  if (role === 'player') navigate('/player', { replace: true })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          {...register('email', { required: 'Email obrigatório' })}
        />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password', { required: 'Senha obrigatória' })}
        />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
      </div>

      {serverError && <p className="text-sm text-red-500">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
