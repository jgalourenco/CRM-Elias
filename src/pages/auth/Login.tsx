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
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { mfaService } from '@/services/mfa'

export default function Login() {
  const { login, completeTwoFactorLogin } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('jgalourenco@hotmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 2FA Challenge State
  const [inTwoFactorFlow, setInTwoFactorFlow] = useState(false)
  const [challengeToken, setChallengeToken] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [mfaUser, setMfaUser] = useState<{ id: string; email: string; name: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await login(email.trim(), password)
      if (result && result.requiresTwoFactor && result.challengeToken) {
        // Usuário possui 2FA ativo: entrar no fluxo de segundo fator
        setChallengeToken(result.challengeToken)
        setMfaUser(result.user || null)
        setInTwoFactorFlow(true)
        setTotpCode('')
        setRecoveryCode('')
        setUseRecoveryCode(false)
        setLoading(false)
        return
      }

      // Login sem 2FA efetuado com sucesso
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'E-mail ou senha inválidos.'
      setError(msg || 'Credenciais inválidas. Verifique seu e-mail e senha.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const verifyPayload: {
        challengeToken: string
        code?: string
        recoveryCode?: string
      } = {
        challengeToken,
      }

      if (useRecoveryCode) {
        if (!recoveryCode.trim()) {
          setError('Por favor, informe um código de recuperação.')
          setLoading(false)
          return
        }
        verifyPayload.recoveryCode = recoveryCode.trim()
      } else {
        const cleanCode = totpCode.replace(/\s+/g, '')
        if (cleanCode.length !== 6) {
          setError('O código autenticador deve conter 6 dígitos.')
          setLoading(false)
          return
        }
        verifyPayload.code = cleanCode
      }

      const res = await mfaService.verify(verifyPayload)
      if (res.token && res.record) {
        completeTwoFactorLogin({ token: res.token, record: res.record })
        navigate('/dashboard')
      } else {
        setError('Não foi possível concluir a autenticação. Tente novamente.')
      }
    } catch (err: unknown) {
      const anyErr = err as { data?: { message?: string; error?: string }; message?: string }
      const msg =
        anyErr.data?.message ||
        anyErr.message ||
        'Código inválido ou expirado. Verifique os dados digitados.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToPassword = () => {
    setInTwoFactorFlow(false)
    setChallengeToken('')
    setTotpCode('')
    setRecoveryCode('')
    setError(null)
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
            Clínica Elias Mansur
          </h1>
          <p className="text-sm text-[#667C78]">
            Medicina Integrativa • CRM & Régua de Atendimento
          </p>
        </div>

        {/* Card: Fluxo 2FA ou Login Normal */}
        {inTwoFactorFlow ? (
          <Card className="rounded-2xl border-[#E3E7E5] shadow-xl bg-white overflow-hidden">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center gap-2 text-[#166A5A]">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Verificação de Segurança
                </span>
              </div>
              <CardTitle className="text-xl font-bold text-[#1C2B29]">
                Autenticação em dois fatores
              </CardTitle>
              <CardDescription className="text-xs text-[#667C78]">
                {useRecoveryCode
                  ? 'Digite um dos seus códigos de recuperação de 8 caracteres (ex: a1b2-c3d4).'
                  : `Digite o código de 6 dígitos gerado no seu aplicativo autenticador para ${mfaUser?.email || email}.`}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleVerify2FA}>
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

                {!useRecoveryCode ? (
                  <div className="space-y-2">
                    <Label htmlFor="totp-code" className="text-xs font-semibold text-[#1C2B29]">
                      Código de 6 dígitos do autenticador
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                      <Input
                        id="totp-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        required
                        autoFocus
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="pl-9 text-center font-mono text-lg tracking-[0.3em] font-semibold rounded-xl border-[#E3E7E5] focus-visible:ring-[#166A5A]"
                      />
                    </div>
                    <p className="text-[11px] text-[#667C78]">
                      Abra o Google Authenticator, Authy ou Microsoft Authenticator no celular.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="recovery-code" className="text-xs font-semibold text-[#1C2B29]">
                      Código de Recuperação (Uso Único)
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                      <Input
                        id="recovery-code"
                        type="text"
                        autoComplete="off"
                        required
                        autoFocus
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value)}
                        placeholder="ex: 3f8a-9b1c"
                        className="pl-9 font-mono text-center text-sm font-semibold rounded-xl border-[#E3E7E5] focus-visible:ring-[#166A5A]"
                      />
                    </div>
                    <p className="text-[11px] text-[#667C78]">
                      Atenção: Cada código de recuperação é invalidado imediatamente após ser
                      utilizado.
                    </p>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUseRecoveryCode(!useRecoveryCode)
                      setError(null)
                    }}
                    className="text-xs text-[#166A5A] hover:underline font-semibold"
                  >
                    {useRecoveryCode
                      ? '← Voltar para código do app autenticador'
                      : 'Perdeu o acesso ao app? Usar código de recuperação'}
                  </button>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#166A5A] hover:bg-[#0F5145] text-white font-semibold rounded-xl shadow-md transition-all active:scale-98"
                >
                  {loading ? 'Verificando...' : 'Verificar e Acessar'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBackToPassword}
                  className="w-full text-xs text-[#667C78] hover:text-[#1C2B29] rounded-xl"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Voltar para login com usuário e senha
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          /* Login Card Padrão */
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
        )}
      </div>
    </div>
  )
}
