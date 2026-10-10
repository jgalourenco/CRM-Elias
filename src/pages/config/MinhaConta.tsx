import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getPermissions } from '@/lib/permissions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { User, Lock, Mail, Camera, ShieldCheck, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { TwoFactorConfigCard } from '@/components/mfa/TwoFactorConfigCard'

export default function MinhaConta() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const permissions = getPermissions(user?.papel)

  const [nome, setNome] = useState(user?.name || '')
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)

  // Alterar senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [alterandoSenha, setAlterandoSenha] = useState(false)

  // Modal Alterar E-mail
  const [modalEmail, setModalEmail] = useState(false)
  const [novoEmail, setNovoEmail] = useState('')
  const [solicitandoEmail, setSolicitandoEmail] = useState(false)

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    setSalvandoPerfil(true)
    try {
      await pb.collection('users').update(user.id, {
        name: nome.trim(),
      })
      await refreshUser()
      toast({ title: 'Perfil atualizado', description: 'Dados salvos com sucesso.' })
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoPerfil(false)
    }
  }

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    if (novaSenha !== confirmarNovaSenha) {
      toast({
        title: 'Senhas divergentes',
        description: 'A nova senha e confirmação não conferem.',
        variant: 'destructive',
      })
      return
    }
    if (novaSenha.length < 8) {
      toast({
        title: 'Senha curta',
        description: 'A nova senha precisa ter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setAlterandoSenha(true)
    try {
      await pb.collection('users').update(user.id, {
        oldPassword: senhaAtual,
        password: novaSenha,
        passwordConfirm: confirmarNovaSenha,
      })

      toast({
        title: 'Senha alterada com sucesso!',
        description: 'Sua senha de acesso foi atualizada.',
      })
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarNovaSenha('')
    } catch (err) {
      toast({
        title: 'Erro ao alterar senha',
        description: 'Verifique se a senha atual está correta.',
        variant: 'destructive',
      })
    } finally {
      setAlterandoSenha(false)
    }
  }

  const handleSolicitarEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoEmail.trim()) return

    setSolicitandoEmail(true)
    try {
      // Simulação do e-mail de alteração gravado em mensagens
      const anyPac = (await pb.collection('pacientes').getList(1, 1)).items[0]
      if (anyPac) {
        await pb.collection('mensagens').create({
          paciente_id: anyPac.id,
          canal: 'Email',
          direcao: 'saida',
          template: 'Confirmação de Alteração de E-mail (Simulado)',
          conteudo: `Olá ${user?.name}! Recebemos seu pedido para trocar o endereço de e-mail de ${user?.email} para ${novoEmail}. Clique para confirmar: https://crm-seleta.goskip.app/verificar-email?token=simulado_email_change`,
          status: 'enviada',
          lida: false,
        })
      }

      toast({
        title: 'Solicitação registrada!',
        description: `E-mail de confirmação simulado enviado para ${novoEmail}. Verifique na Caixa de E-mail Simulada.`,
      })

      setModalEmail(false)
      setNovoEmail('')
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível solicitar alteração.',
        variant: 'destructive',
      })
    } finally {
      setSolicitandoEmail(false)
    }
  }

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'CS'

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
          Minha Conta
        </h1>
        <p className="text-sm text-[#667C78]">
          Gerencie suas preferências pessoais, segurança e dados de acesso ao sistema da Clínica
          Elias Mansur.
        </p>
      </div>

      {/* Grid: Perfil e Senha */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Dados Pessoais */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-6 space-y-6">
          <CardHeader className="p-0">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#166A5A]" />
              <CardTitle className="text-base font-bold text-[#1C2B29]">Dados do Perfil</CardTitle>
            </div>
            <CardDescription className="text-xs text-[#667C78]">
              Seu nome e foto exibidos na interface e nas mensagens da equipe.
            </CardDescription>
          </CardHeader>

          {/* Avatar Upload Preview */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-[#166A5A]">
                <AvatarFallback className="bg-[#166A5A] text-white text-lg font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-[#166A5A] text-white flex items-center justify-center shadow-md hover:bg-[#0F5145]"
                title="Alterar foto"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>
            <div>
              <p className="font-bold text-sm text-[#1C2B29]">{user?.name}</p>
              <p className="text-xs text-[#667C78]">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#E2F0EB] text-[#166A5A] rounded-md inline-block">
                  Perfil: {user?.papel || 'Visualização'}
                </span>
                <span className="text-[10px] text-[#667C78]">
                  {user?.papel === 'Administrador'
                    ? '• Acesso Total'
                    : user?.papel === 'Gestor/Recepção'
                      ? '• Gestão & Recepção'
                      : user?.papel === 'Profissional/Saúde'
                        ? '• Prontuário & Atendimento'
                        : '• Somente Leitura'}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSalvarPerfil} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Nome Completo</Label>
              <Input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#1C2B29]">E-mail de Login</Label>
                <button
                  type="button"
                  onClick={() => setModalEmail(true)}
                  className="text-xs text-[#166A5A] hover:underline font-semibold"
                >
                  Solicitar alteração
                </button>
              </div>
              <Input
                disabled
                value={user?.email || ''}
                className="rounded-xl border-[#E3E7E5] bg-gray-50 text-[#667C78]"
              />
            </div>

            <Button
              type="submit"
              disabled={salvandoPerfil}
              className="w-full bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold"
            >
              {salvandoPerfil ? 'Salvando...' : 'Atualizar Dados do Perfil'}
            </Button>
          </form>
        </Card>

        {/* Card 2: Segurança & Senha */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-6 space-y-6">
          <CardHeader className="p-0">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#166A5A]" />
              <CardTitle className="text-base font-bold text-[#1C2B29]">Alterar Senha</CardTitle>
            </div>
            <CardDescription className="text-xs text-[#667C78]">
              Atualize sua chave de segurança periodicamente para proteger o prontuário dos
              pacientes.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleAlterarSenha} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Senha Atual</Label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">
                Nova Senha (mín. 8 dígitos)
              </Label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Confirmar Nova Senha</Label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={confirmarNovaSenha}
                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <Button
              type="submit"
              disabled={alterandoSenha}
              className="w-full bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold"
            >
              {alterandoSenha ? 'Modificando senha...' : 'Salvar Nova Senha'}
            </Button>
          </form>
        </Card>
      </div>

      {/* Card 3: Autenticação em Dois Fatores (2FA / MFA) */}
      <TwoFactorConfigCard />

      {/* Modal Solicitar Alteração de E-mail */}
      <Dialog open={modalEmail} onOpenChange={setModalEmail}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              Solicitar Troca de E-mail
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              Enviaremos um e-mail de confirmação simulado para o novo endereço digitado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSolicitarEmail} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Novo E-mail</Label>
              <Input
                type="email"
                required
                placeholder="novo.email@clinica.com.br"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalEmail(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={solicitandoEmail}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
              >
                {solicitandoEmail ? 'Enviando...' : 'Confirmar e Enviar E-mail'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
