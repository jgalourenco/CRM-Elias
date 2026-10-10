import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
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
import { Sparkles, ArrowRight, Lock, Mail, User, CheckCircle2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function Cadastro() {
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
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
      setError('A senha deve possuir no mínimo 8 caracteres.')
      return
    }

    setLoading(true)

    try {
      // 1. Create user in PocketBase
      const user = await pb.collection('users').create({
        name: nome.trim(),
        email: email.trim(),
        password: password,
        passwordConfirm: passwordConfirm,
        papel: 'Recepção',
      })

      // 2. Simulated verification email registered in mensagens
      // (Using fake patient or general admin message)
      try {
        const adminPac = (await pb.collection('pacientes').getList(1, 1)).items[0]
        if (adminPac) {
          await pb.collection('mensagens').create({
            paciente_id: adminPac.id,
            canal: 'Email',
            direcao: 'saida',
            template: 'Verificação de Conta (Simulado)',
            conteudo: `Olá ${nome}, confirme seu e-mail para ativar seu acesso à Clínica Elias Mansur: https://crm.clinicaeliasmansur.com.br/verificar-email?token=token_simulado_${user.id}`,
            status: 'enviada',
            lida: false,
          })
        }
      } catch {
        /* intentionally ignored */
      }

      setSuccess(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao realizar cadastro.'
      setError(msg || 'Erro ao criar conta. O e-mail pode já estar em uso.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F6F3] p-4">
        <Card className="w-full max-w-md rounded-2xl border-[#E3E7E5] shadow-xl bg-white p-6 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-[#1C2B29]">Verifique seu E-mail</CardTitle>
          <p className="text-xs text-[#667C78]">
            Enviamos uma mensagem de confirmação para <strong>{email}</strong>. (Mensagem
            transacional registrada na <em>Caixa de Entrada de E-mail Simulada</em>).
          </p>
          <div className="pt-2">
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
            >
              Ir para Login
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F6F3] p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br from-[#166A5A] to-[#0F5145] items-center justify-center text-white shadow-lg shadow-[#166A5A]/25 mb-1">
            <Sparkles className="h-6 w-6 text-[#C9A227]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C2B29]">
            Criar Conta
          </h1>
          <p className="text-sm text-[#667C78]">
            Acesso para membros da equipe Clínica Elias Mansur
          </p>{' '}
        </div>

        <Card className="rounded-2xl border-[#E3E7E5] shadow-xl bg-white overflow-hidden">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-[#1C2B29]">Cadastro de Usuário</CardTitle>
            <CardDescription className="text-xs text-[#667C78]">
              Preencha os dados abaixo para criar sua conta.
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
                <Label htmlFor="nome" className="text-xs font-semibold text-[#1C2B29]">
                  Nome Completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                  <Input
                    id="nome"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Dra. Juliana Mendes"
                    className="pl-9 rounded-xl border-[#E3E7E5]"
                  />
                </div>
              </div>

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
                    placeholder="juliana@seletaclinica.com.br"
                    className="pl-9 rounded-xl border-[#E3E7E5]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-[#1C2B29]">
                  Senha (mínimo 8 caracteres)
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
                  Confirmar Senha
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
                {loading ? 'Cadastrando...' : 'Criar Conta'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="text-center text-xs text-[#667C78]">
                Já possui uma conta?{' '}
                <Link to="/login" className="text-[#166A5A] font-semibold hover:underline">
                  Fazer login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
