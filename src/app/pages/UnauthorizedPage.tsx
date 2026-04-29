import { useNavigate } from 'react-router'
import { Button } from '../components/ui/button'

export default function UnauthorizedPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Acesso não autorizado</h1>
      <p className="text-muted-foreground text-center">
        Você não tem permissão para acessar esta página ou sua conta foi bloqueada.
      </p>
      <Button onClick={() => navigate('/login')}>Ir para login</Button>
    </div>
  )
}
