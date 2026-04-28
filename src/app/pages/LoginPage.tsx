import { LoginForm } from '../components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold">
            Torneio de <span className="text-primary">Beach Tennis</span>
          </h1>
          <p className="text-muted-foreground text-sm tracking-wide">Arena GWM</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
