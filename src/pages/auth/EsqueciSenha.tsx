import React, { useState } from 'react'
import { Link } from 'react-router-dom'
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
import { Sparkles, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'

export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      // PocketBase password reset request (or simulated message)
      try {
        await pb.collection('users').requestPasswordReset(email.trim())
      } catch {
        /* intentionally ignored */
      }

      // Register simulated email in mensagens table
      try {
        const anyPac = (await pb.collection('pacientes').getList(1, 1)).items[0]
        if (anyPac) {
          await pb.collection('mensagens').create({
            paciente_id: anyPac.id,
            canal: 'Email',
            direcao: 'saida',
            template: 'Redefinição de Senha (Simulado)',
            conteudo: `Olá! Recebemos sua solicitação de redefinição de senha para o e-mail ${email}. Acesse o link para definir sua nova credencial: https://crm-seleta.goskip.app/redefinir-senha?token=simulado_reset_token`,
            status: 'enviada',
            lida: false,
          })
        }
      } catch {
        /* intentionally ignored */
      }

      setSubmitted(true)
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
            Recuperar Senha
          </h1>
          <p className="text-sm text-[#667C78]">Clínica Elias Mansur</p>{' '}
        </div>

        <Card className="rounded-2xl border-[#E3E7E5] shadow-xl bg-white overflow-hidden">
          {submitted ? (
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold text-[#1C2B29]">
                E-mail Enviado com Sucesso
              </CardTitle>
              <p className="text-xs text-[#667C78]">
                Se o endereço <strong>{email}</strong> estiver cadastrado em nosso sistema, você
                receberá um link com instruções para redefinir sua senha.
              </p>
              <div className="p-3 bg-[#E2F0EB]/50 rounded-xl text-xs text-[#166A5A] text-left">
                ℹ️ <strong>E-mail Simulado:</strong> Esta notificação foi gravada no banco e pode
                ser visualizada na tela de <em>Caixa de Entrada de E-mail (Simulada)</em>.
              </div>
              <div className="pt-2">
                <Link to="/login">
                  <Button className="w-full bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl">
                    Voltar para o Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-bold text-[#1C2B29]">
                  Esqueci minha senha
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Informe seu e-mail cadastrado para enviarmos as instruções.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-[#1C2B29]">
                    E-mail Cadastrado
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
                  {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </Button>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 text-xs text-[#667C78] hover:text-[#1C2B29]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar para login
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
