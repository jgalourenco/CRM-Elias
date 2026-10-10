import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usuariosService } from '@/services/crm'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { KeyRound, ShieldAlert, CheckCircle2, Lock, ArrowRight, LogOut } from 'lucide-react'

export default function PrimeiroAcesso() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação não coincide com a nova senha digitada.')
      return
    }

    if (currentPassword && currentPassword === newPassword) {
      setError('A nova senha não pode ser idêntica à senha temporária inicial.')
      return
    }

    setLoading(true)
    try {
      await usuariosService.trocarSenhaPrimeiroAcesso(currentPassword, newPassword)
      await refreshUser()
      setSuccess(true)
    } catch (err: unknown) {
      const anyErr = err as { data?: { message?: string }; message?: string }
      setError(
        anyErr.data?.message ||
          anyErr.message ||
          'Falha ao atualizar senha. Verifique se a senha provisória está correta.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-amber-50/40 via-[#F7F6F3] to-[#F7F6F3] p-4 sm:p-6">
      <div className="w-full max-w-md space-y-5 animate-fade-in">
        {/* Header institucional */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br from-[#166A5A] to-[#0F5145] items-center justify-center text-white shadow-lg shadow-[#166A5A]/25 mb-1">
            <KeyRound className="h-6 w-6 text-[#C9A227]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C2B29]">
            Clínica Elias Mansur
          </h1>
          <p className="text-xs text-[#667C78]">Segurança da Informação • Primeiro Acesso</p>
        </div>

        <Card className="rounded-2xl border-amber-200/80 shadow-xl bg-white overflow-hidden">
          {success ? (
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold text-[#1C2B29]">
                  Senha Cadastrada com Sucesso!
                </CardTitle>
                <p className="text-xs text-[#667C78] max-w-xs mx-auto">
                  Sua nova credencial foi gravada. A partir de agora você terá acesso completo ao
                  CRM.
                </p>
              </div>
              <div className="pt-3">
                <Button
                  onClick={() => navigate('/dashboard', { replace: true })}
                  className="w-full bg-[#166A5A] hover:bg-[#0F5145] text-white font-semibold rounded-xl h-11"
                >
                  Entrar no Sistema
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader className="pb-3 border-b border-[#E3E7E5]/60 bg-amber-50/40">
                <div className="flex items-center gap-2 text-amber-800">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Troca Obrigatória de Senha
                  </span>
                </div>
                <CardTitle className="text-lg font-bold text-[#1C2B29]">
                  Defina sua Senha Pessoal
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Olá, <strong className="text-[#1C2B29]">{user?.name || user?.email}</strong>. Por
                  segurança institucional, é necessário alterar sua senha inicial antes de navegar
                  pelo sistema.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-5">
                {error && (
                  <Alert
                    variant="destructive"
                    className="rounded-xl py-2 px-3 text-xs bg-red-50 text-red-700 border-red-200"
                  >
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#1C2B29]">
                    Senha Provisória Atual
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                    <Input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Senha temporária informada pelo administrador"
                      className="pl-9 rounded-xl border-[#E3E7E5] text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#1C2B29]">
                    Nova Senha Definitiva
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                    <Input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres (letras, números e símbolos)"
                      className="pl-9 rounded-xl border-[#E3E7E5] text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#1C2B29]">
                    Confirmar Nova Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                    <Input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha exatamente igual"
                      className="pl-9 rounded-xl border-[#E3E7E5] text-xs h-10"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 text-[11px] text-blue-900 leading-relaxed">
                  🔒 Escolha uma senha segura com pelo menos 8 dígitos que você não use em outros
                  serviços.
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2.5 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#166A5A] hover:bg-[#0F5145] text-white font-semibold rounded-xl shadow-md"
                >
                  {loading ? 'Atualizando senha...' : 'Confirmar e Liberar Acesso'}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={logout}
                  className="w-full text-xs text-[#667C78] hover:text-red-700 rounded-xl"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  Sair e fazer login mais tarde
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
