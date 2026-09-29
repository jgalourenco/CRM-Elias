import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('jgalourenco@hotmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(email.trim(), password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'E-mail ou senha inválidos.'
      setError(msg || 'Credenciais inválidas. Verifique seu e-mail e senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F6F3] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br from-[#166A5A] to-[#0F5145] items-center justify-center text-white shadow-lg shadow-[#166A5A]/25 mb-1">
            <Sparkles className="h-6 w-6 text-[#C9A227]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C2B29]">
            Clínica Seleta
          </h1>
          <p className="text-sm text-[#667C78]">
            Medicina Integrativa • CRM & Régua de Atendimento
          </p>
        </div>

        {/* Login Card */}
        <Card className="rounded-2xl border-[#E3E7E5] shadow-xl bg-white overflow-hidden">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-[#1C2B29]">Entrar no Sistema</CardTitle>
            <CardDescription className="text-xs text-[#667C78]">
              Digite suas credenciais de acesso para continuar.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert
                  variant="destructive"
                  className="rounded-xl py-2 px-3 text-xs bg-red-50 text-[#C0392B] border-red-200"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-[#1C2B29]">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@clinica.com.br"
                    className="pl-9 rounded-xl border-[#E3E7E5] focus-visible:ring-[#166A5A]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-[#1C2B29]">
                    Senha
                  </Label>
                  <Link
                    to="/esqueci-senha"
                    className="text-xs text-[#166A5A] hover:underline font-medium"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 rounded-xl border-[#E3E7E5] focus-visible:ring-[#166A5A]"
                  />
                </div>
              </div>

              {/* Dica de acesso padrão */}
              <div className="p-3 bg-[#E2F0EB]/60 rounded-xl border border-[#166A5A]/20 text-xs text-[#166A5A]">
                <p className="font-semibold">Credenciais de Demonstração:</p>
                <p>
                  E-mail: <code className="font-mono">jgalourenco@hotmail.com</code>
                </p>
                <p>
                  Senha: <code className="font-mono">Skip@Pass</code>
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#166A5A] hover:bg-[#0F5145] text-white font-semibold rounded-xl shadow-md transition-all active:scale-98"
              >
                {loading ? 'Acessando...' : 'Entrar no CRM'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="text-center text-xs text-[#667C78]">
                Não possui uma conta?{' '}
                <Link to="/cadastro" className="text-[#166A5A] font-semibold hover:underline">
                  Criar conta
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
