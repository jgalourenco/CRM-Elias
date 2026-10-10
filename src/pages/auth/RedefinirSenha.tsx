import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
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
import { Sparkles, ArrowRight, Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== passwordConfirm) {
      setError('As senhas digitadas não coincidem.')
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      // Simulação bem-sucedida de atualização de senha
      await new Promise((res) => setTimeout(res, 800))
      setSuccess(true)
    } catch (err: unknown) {
      setError('Não foi possível redefinir a senha com o token fornecido.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F6F3] p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br from-[#166A5A] to-[#0F5145] items-center justify-center text-white shadow-lg shadow-[#166A5A]/25 mb-1">
            <Sparkles className="h-6 w-6 text-[#C9A227]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C2B29]">
            Redefinir Senha
          </h1>
          <p className="text-sm text-[#667C78]">Clínica Elias Mansur</p>
        </div>

        <Card className="rounded-2xl border-[#E3E7E5] shadow-xl bg-white overflow-hidden">
          {success ? (
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold text-[#1C2B29]">Senha Atualizada!</CardTitle>
              <p className="text-xs text-[#667C78]">
                Sua senha foi redefinida com sucesso. Você já pode acessar a plataforma com suas
                novas credenciais.
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
                >
                  Fazer Login
                </Button>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-bold text-[#1C2B29]">Criar Nova Senha</CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Digite sua nova senha abaixo para reestabelecer o acesso.
                </CardDescription>
              </CardHeader>
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
                  <Label htmlFor="password" className="text-xs font-semibold text-[#1C2B29]">
                    Nova Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 rounded-xl border-[#E3E7E5]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="passwordConfirm" className="text-xs font-semibold text-[#1C2B29]">
                    Confirmar Nova Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                    <Input
                      id="passwordConfirm"
                      type="password"
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 rounded-xl border-[#E3E7E5]"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#166A5A] hover:bg-[#0F5145] text-white font-semibold rounded-xl shadow-md"
                >
                  {loading ? 'Redefinindo...' : 'Atualizar Senha'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Link
                  to="/login"
                  className="text-xs text-[#667C78] hover:text-[#1C2B29] text-center"
                >
                  Voltar ao login
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
