import React, { useState, useEffect } from 'react'
import { usuariosService, mensagensService } from '@/services/crm'
import { Usuario, UserRole } from '@/types/crm'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  UserPlus,
  Shield,
  KeyRound,
  Edit2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Eye,
  Send,
  Sparkles as SparklesIcon,
  ShieldCheck,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { ROLE_LABELS, ROLE_DESCRIPTIONS, getPermissions } from '@/lib/permissions'

export default function EquipeConfig() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  const permissions = getPermissions(currentUser?.papel)
  const isAdmin = currentUser?.papel === 'Administrador'

  // Modal Criar / Convidar
  const [modalConvidar, setModalConvidar] = useState(false)
  const [conviteNome, setConviteNome] = useState('')
  const [conviteEmail, setConviteEmail] = useState('')
  const [convitePapel, setConvitePapel] = useState<UserRole>('Gestor')
  const [tipoSenhaCriacao, setTipoSenhaCriacao] = useState<'gerar' | 'manual'>('gerar')
  const [senhaManualCriacao, setSenhaManualCriacao] = useState('')
  const [dispararEmailCriacao, setDispararEmailCriacao] = useState(true)
  const [exigirTrocaCriacao, setExigirTrocaCriacao] = useState(true)
  const [convidando, setConvidando] = useState(false)

  // Modal Editar Usuário
  const [modalEditar, setModalEditar] = useState(false)
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<Usuario | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editPapel, setEditPapel] = useState<UserRole>('Gestor')
  const [editAtivo, setEditAtivo] = useState(true)
  const [editPrecisaTrocarSenha, setEditPrecisaTrocarSenha] = useState(false)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // Modal Redefinir Senha (Admin)
  const [modalSenha, setModalSenha] = useState(false)
  const [usuarioParaSenha, setUsuarioParaSenha] = useState<Usuario | null>(null)
  const [tipoSenhaReset, setTipoSenhaReset] = useState<'gerar' | 'manual'>('gerar')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [dispararEmailReset, setDispararEmailReset] = useState(true)
  const [exigirTrocaReset, setExigirTrocaReset] = useState(true)
  const [redefinindoSenha, setRedefinindoSenha] = useState(false)
  const [senhaGeradaVisualizacao, setSenhaGeradaVisualizacao] = useState('')

  const fetchUsuarios = async () => {
    setLoading(true)
    try {
      const res = await usuariosService.list()
      setUsuarios(res)
    } catch (err) {
      console.error('Erro ao listar usuários:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsuarios()
  }, [])

  // Gerador de senha forte aleatória
  const gerarSenhaSegura = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*'
    let pass = ''
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pass
  }

  // Disparar e-mail transacional simulado com credenciais
  const registrarEmailSimulado = async (
    destinatarioNome: string,
    destinatarioEmail: string,
    papel: string,
    senhaDefinida: string,
    precisaTrocar: boolean,
    motivo: 'criacao' | 'reset',
  ) => {
    try {
      const anyPac = (await pb.collection('pacientes').getList(1, 1)).items[0]
      if (anyPac) {
        const assunto =
          motivo === 'criacao'
            ? 'Acesso ao CRM • Clínica Elias Mansur'
            : 'Nova Senha de Acesso • Clínica Elias Mansur'
        const instrucaoTroca = precisaTrocar
          ? 'Por política de segurança institucional, você deverá cadastrar uma nova senha pessoal no seu primeiro acesso.'
          : 'Utilize as credenciais abaixo para entrar.'

        const conteudo = `Olá ${destinatarioNome},\n\nSeu acesso ao CRM da Clínica Elias Mansur está disponível com o perfil "${ROLE_LABELS[papel as UserRole] || papel}".\n\nLink de login: https://crm.clinicaeliasmansur.com.br/login\nUsuário: ${destinatarioEmail}\nSenha Provisória: ${senhaDefinida}\n\n${instrucaoTroca}\n\nAtenciosamente,\nAdministração da Clínica Elias Mansur`

        await pb.collection('mensagens').create({
          paciente_id: anyPac.id,
          canal: 'Email',
          direcao: 'saida',
          template: assunto,
          conteudo,
          status: 'enviada',
          lida: false,
        })
      }
    } catch (e) {
      console.warn('Aviso: e-mail simulado não pôde ser registrado:', e)
    }
  }

  // Convidar / Criar Usuário
  const handleConvidar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conviteNome.trim() || !conviteEmail.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o nome completo e o e-mail do colaborador.',
        variant: 'destructive',
      })
      return
    }

    let senhaFinal = ''
    if (tipoSenhaCriacao === 'gerar') {
      senhaFinal = gerarSenhaSegura()
    } else {
      senhaFinal = senhaManualCriacao.trim()
      if (senhaFinal.length < 8) {
        toast({
          title: 'Senha muito curta',
          description: 'A senha manual deve conter pelo menos 8 caracteres.',
          variant: 'destructive',
        })
        return
      }
    }

    setConvidando(true)
    try {
      // 1. Criar novo usuário na coleção users
      await pb.collection('users').create({
        email: conviteEmail.trim().toLowerCase(),
        name: conviteNome.trim(),
        password: senhaFinal,
        passwordConfirm: senhaFinal,
        papel: convitePapel,
        ativo: true,
        precisa_trocar_senha: exigirTrocaCriacao,
      })

      // 2. Disparar e-mail transacional se selecionado
      if (dispararEmailCriacao) {
        await registrarEmailSimulado(
          conviteNome.trim(),
          conviteEmail.trim(),
          convitePapel,
          senhaFinal,
          exigirTrocaCriacao,
          'criacao',
        )
      }

      toast({
        title: 'Usuário cadastrado com sucesso!',
        description: `${conviteNome} foi adicionado(a). Senha definida: ${senhaFinal}`,
      })

      setModalConvidar(false)
      setConviteNome('')
      setConviteEmail('')
      setSenhaManualCriacao('')
      fetchUsuarios()
    } catch (err: unknown) {
      const anyErr = err as { data?: { message?: string }; message?: string }
      toast({
        title: 'Erro ao cadastrar usuário',
        description: anyErr.data?.message || anyErr.message || 'Verifique se o e-mail já existe.',
        variant: 'destructive',
      })
    } finally {
      setConvidando(false)
    }
  }

  // Abrir Modal de Edição
  const handleAbrirEdicao = (u: Usuario) => {
    setUsuarioEmEdicao(u)
    setEditNome(u.name || '')
    setEditPapel((u.papel as UserRole) || 'Gestor')
    setEditAtivo(u.ativo !== false)
    setEditPrecisaTrocarSenha(!!u.precisa_trocar_senha)
    setModalEditar(true)
  }

  // Salvar Edição de Usuário
  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuarioEmEdicao) return

    setSalvandoEdicao(true)
    try {
      await usuariosService.update(usuarioEmEdicao.id, {
        name: editNome.trim(),
        papel: editPapel,
        ativo: editAtivo,
        precisa_trocar_senha: editPrecisaTrocarSenha,
      })

      toast({
        title: 'Usuário atualizado',
        description: `Dados de ${editNome} salvos com sucesso.`,
      })

      setModalEditar(false)
      fetchUsuarios()
    } catch (err) {
      toast({
        title: 'Erro ao atualizar',
        description: 'Permissão insuficiente ou falha na requisição.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoEdicao(false)
    }
  }

  // Abrir Modal de Redefinição de Senha
  const handleAbrirResetSenha = (u: Usuario) => {
    setUsuarioParaSenha(u)
    setTipoSenhaReset('gerar')
    const pass = gerarSenhaSegura()
    setNovaSenha(pass)
    setConfirmarNovaSenha(pass)
    setSenhaGeradaVisualizacao(pass)
    setDispararEmailReset(true)
    setExigirTrocaReset(true)
    setModalSenha(true)
  }

  // Executar Redefinição de Senha
  const handleExecutarResetSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuarioParaSenha) return

    if (novaSenha.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A nova senha deve ter pelo menos 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    if (novaSenha !== confirmarNovaSenha) {
      toast({
        title: 'Senhas não conferem',
        description: 'A confirmação deve ser idêntica à nova senha.',
        variant: 'destructive',
      })
      return
    }

    setRedefinindoSenha(true)
    try {
      await usuariosService.adminResetPassword(usuarioParaSenha.id, novaSenha, exigirTrocaReset)

      if (dispararEmailReset) {
        await registrarEmailSimulado(
          usuarioParaSenha.name || usuarioParaSenha.email,
          usuarioParaSenha.email,
          usuarioParaSenha.papel || 'Gestor',
          novaSenha,
          exigirTrocaReset,
          'reset',
        )
      }

      toast({
        title: 'Senha atualizada!',
        description: `Nova senha definida para ${usuarioParaSenha.name || usuarioParaSenha.email}. ${exigirTrocaReset ? 'Troca obrigatória no primeiro acesso ativada.' : ''}`,
      })

      setModalSenha(false)
      setNovaSenha('')
      setConfirmarNovaSenha('')
      fetchUsuarios()
    } catch (err: unknown) {
      const anyErr = err as { message?: string }
      toast({
        title: 'Erro ao redefinir senha',
        description: anyErr.message || 'Falha ao redefinir senha do usuário.',
        variant: 'destructive',
      })
    } finally {
      setRedefinindoSenha(false)
    }
  }

  // Toggle rápido de Ativo/Inativo na tabela
  const handleToggleAtivo = async (u: Usuario, novoAtivo: boolean) => {
    if (!isAdmin) {
      toast({
        title: 'Ação restrita',
        description: 'Apenas Administradores podem ativar ou desativar colaboradores.',
        variant: 'destructive',
      })
      return
    }

    try {
      await usuariosService.update(u.id, { ativo: novoAtivo })
      toast({
        title: novoAtivo ? 'Usuário ativado' : 'Usuário desativado',
        description: `${u.name} agora está ${novoAtivo ? 'ativo' : 'inativo'}.`,
      })
      fetchUsuarios()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
              Gestão da Equipe & Níveis de Acesso
            </h1>
            {!isAdmin && (
              <Badge
                variant="outline"
                className="text-xs bg-amber-50 text-amber-800 border-amber-200"
              >
                Modo Somente Leitura da Equipe
              </Badge>
            )}
          </div>
          <p className="text-sm text-[#667C78]">
            Controle de perfis (RBAC), credenciais e membros da Clínica Elias Mansur.
            {!isAdmin && ' Você tem acesso de visualização aos membros da clínica.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="rounded-xl text-xs font-semibold gap-1.5 border-[#166A5A]/30 text-[#166A5A] hover:bg-[#E2F0EB]"
          >
            <a href="/portal-paciente" target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 text-[#166A5A]" />
              Ver Portal do Paciente (Esboço)
            </a>
          </Button>

          {isAdmin ? (
            <Button
              onClick={() => {
                setTipoSenhaCriacao('gerar')
                setSenhaManualCriacao('')
                setDispararEmailCriacao(true)
                setExigirTrocaCriacao(true)
                setModalConvidar(true)
              }}
              className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              Novo Usuário
            </Button>
          ) : (
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <Shield className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Apenas Administradores podem cadastrar, alterar perfis ou redefinir senhas.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Cards informativos dos 4 perfis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-[#E3E7E5] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-amber-800">Administrador</span>
            <Badge className="bg-amber-100 text-amber-900 border-none text-[10px]">
              Gestão Total
            </Badge>
          </div>
          <p className="text-[11px] text-[#667C78] leading-relaxed">
            Acessa tudo. Gerencia papéis, cria usuários, desativa membros e redefine senhas.
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-[#E3E7E5] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-blue-800">Gestor</span>
            <Badge className="bg-blue-100 text-blue-900 border-none text-[10px]">
              Clínica Completa
            </Badge>
          </div>
          <p className="text-[11px] text-[#667C78] leading-relaxed">
            Mesmo alcance de áreas do Admin (agenda, funil, régua, pacotes), sem gerenciar usuários.
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-[#E3E7E5] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-emerald-800">Profissional</span>
            <Badge className="bg-emerald-100 text-emerald-900 border-none text-[10px]">
              Corpo Clínico
            </Badge>
          </div>
          <p className="text-[11px] text-[#667C78] leading-relaxed">
            Focado no atendimento: agendas, fichas dos pacientes, exames, notas e mensagens.
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-[#E3E7E5] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-gray-800">Visitante</span>
            <Badge className="bg-purple-100 text-purple-900 border-none text-[10px]">
              Portal Paciente
            </Badge>
          </div>
          <p className="text-[11px] text-[#667C78] leading-relaxed">
            Leitura para auditoria e base para o Portal do Paciente (consultas, exames e
            documentos).
          </p>
        </div>
      </div>

      {/* Users Table */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E3E7E5] bg-[#F7F6F3]/60 text-xs font-semibold text-[#667C78]">
                <th className="py-3.5 px-4 sm:px-6">Membro da Equipe</th>
                <th className="py-3.5 px-4">E-mail de Acesso</th>
                <th className="py-3.5 px-4">Perfil Oficial</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Primeiro Acesso</th>
                <th className="py-3.5 px-4">2FA (MFA)</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E7E5]/70">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#667C78]">
                    Carregando membros da clínica...
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => {
                  const initials = u.name
                    ? u.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'EM'

                  const isMe = u.id === currentUser?.id
                  const isAtivo = u.ativo !== false

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-[#E3E7E5]">
                            <AvatarFallback className="bg-[#166A5A] text-white font-bold text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-xs text-[#1C2B29]">
                              {u.name || 'Sem nome'}
                            </p>
                            {isMe && (
                              <Badge className="bg-[#E2F0EB] text-[#166A5A] text-[9px] h-4 px-1">
                                Você
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-[#667C78]">{u.email}</td>

                      <td className="py-3.5 px-4 text-xs">
                        <Badge
                          variant="outline"
                          className={
                            u.papel === 'Administrador'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : u.papel === 'Gestor' ||
                                  u.papel === 'Gestor/Recepção' ||
                                  u.papel === 'Recepção'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : u.papel === 'Profissional' || u.papel === 'Profissional/Saúde'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-purple-50 text-purple-800 border-purple-200'
                          }
                        >
                          {ROLE_LABELS[(u.papel as UserRole) || 'Visitante'] ||
                            u.papel ||
                            'Visitante'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={isAtivo}
                            disabled={isMe || !isAdmin}
                            onCheckedChange={(checked) => handleToggleAtivo(u, checked)}
                          />
                          <span
                            className={isAtivo ? 'text-emerald-700 font-medium' : 'text-gray-400'}
                          >
                            {isAtivo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {u.precisa_trocar_senha ? (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px] gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Troca Obrigatória
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-[#667C78]">Liberado</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {u.mfa_enabled ? (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-[#667C78]">Desativado</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-right">
                        {isAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAbrirEdicao(u)}
                              className="h-7 px-2 text-xs text-[#166A5A] hover:bg-[#E2F0EB]"
                              title="Editar usuário e papel"
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAbrirResetSenha(u)}
                              className="h-7 px-2 text-xs border-[#E3E7E5] hover:bg-amber-50 hover:text-amber-800"
                              title="Redefinir senha de acesso"
                            >
                              <KeyRound className="h-3.5 w-3.5 mr-1 text-amber-600" />
                              Senha
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#667C78] italic">Somente leitura</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Convidar / Cadastrar Novo Usuário */}
      <Dialog open={modalConvidar} onOpenChange={setModalConvidar}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              Cadastrar Novo Colaborador
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              Crie o acesso ao CRM com credenciais personalizadas e perfil definido.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConvidar} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Nome Completo</Label>
              <Input
                required
                placeholder="Ex: Dra. Mariana Vasconcelos"
                value={conviteNome}
                onChange={(e) => setConviteNome(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">E-mail Corporativo</Label>
              <Input
                type="email"
                required
                placeholder="mariana@clinicaeliasmansur.com.br"
                value={conviteEmail}
                onChange={(e) => setConviteEmail(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Perfil de Acesso</Label>
              <Select value={convitePapel} onValueChange={(v: UserRole) => setConvitePapel(v)}>
                <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador">
                    Administrador (Acesso e Gestão Total)
                  </SelectItem>
                  <SelectItem value="Gestor">
                    Gestor (Toda a Clínica • Sem Gestão de Usuários)
                  </SelectItem>
                  <SelectItem value="Profissional">
                    Profissional (Agendas, Fichas Clínicas e Exames)
                  </SelectItem>
                  <SelectItem value="Visitante">
                    Visitante (Somente Leitura • Base Portal Paciente)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-[#667C78] bg-gray-50 p-2 rounded-lg border border-gray-100">
                {ROLE_DESCRIPTIONS[convitePapel] || ROLE_DESCRIPTIONS['Gestor']}
              </p>
            </div>

            {/* Opção da Senha Inicial: Automática ou Manual */}
            <div className="space-y-2 p-3 bg-gray-50/80 rounded-xl border border-[#E3E7E5]">
              <Label className="text-xs font-semibold text-[#1C2B29] block">
                Definição da Senha Inicial
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tipoSenhaCriacao === 'gerar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoSenhaCriacao('gerar')}
                  className={
                    tipoSenhaCriacao === 'gerar'
                      ? 'bg-[#166A5A] text-white rounded-lg text-xs h-8'
                      : 'rounded-lg text-xs h-8 border-[#E3E7E5]'
                  }
                >
                  <SparklesIcon className="h-3.5 w-3.5 mr-1" />
                  Gerar Aleatória Segura
                </Button>
                <Button
                  type="button"
                  variant={tipoSenhaCriacao === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoSenhaCriacao('manual')}
                  className={
                    tipoSenhaCriacao === 'manual'
                      ? 'bg-[#166A5A] text-white rounded-lg text-xs h-8'
                      : 'rounded-lg text-xs h-8 border-[#E3E7E5]'
                  }
                >
                  <Lock className="h-3.5 w-3.5 mr-1" />
                  Digitar Manualmente
                </Button>
              </div>

              {tipoSenhaCriacao === 'manual' && (
                <div className="pt-2">
                  <Input
                    type="password"
                    required
                    placeholder="Mínimo 8 dígitos (ex: Elias@2026)"
                    value={senhaManualCriacao}
                    onChange={(e) => setSenhaManualCriacao(e.target.value)}
                    className="rounded-lg border-[#E3E7E5] text-xs h-9 bg-white"
                  />
                </div>
              )}
            </div>

            {/* Trava de Primeiro Acesso Obrigatório */}
            <div className="flex items-start justify-between p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <Label className="text-xs font-semibold text-amber-900">
                    Obrigatório trocar senha no primeiro acesso
                  </Label>
                </div>
                <p className="text-[11px] text-amber-800">
                  O usuário é impedido de navegar no sistema até cadastrar uma nova senha própria.
                </p>
              </div>
              <Switch checked={exigirTrocaCriacao} onCheckedChange={setExigirTrocaCriacao} />
            </div>

            {/* Disparo de e-mail transacional simulado */}
            <div className="flex items-center justify-between p-3 bg-[#E2F0EB]/50 rounded-xl border border-[#166A5A]/20">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-[#166A5A]" />
                  <Label className="text-xs font-semibold text-[#166A5A]">
                    Disparar e-mail de acesso
                  </Label>
                </div>
                <p className="text-[11px] text-[#667C78]">
                  Registra o e-mail com as credenciais na caixa transacional do sistema.
                </p>
              </div>
              <Switch checked={dispararEmailCriacao} onCheckedChange={setDispararEmailCriacao} />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalConvidar(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={convidando}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
              >
                {convidando ? 'Cadastrando...' : 'Cadastrar Colaborador'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Usuário */}
      <Dialog open={modalEditar} onOpenChange={setModalEditar}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">Editar Usuário</DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              Altere o nome, nível de acesso ou ative/desative a conta de {usuarioEmEdicao?.email}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarEdicao} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Nome Completo</Label>
              <Input
                required
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">E-mail</Label>
              <Input
                disabled
                value={usuarioEmEdicao?.email || ''}
                className="rounded-xl border-[#E3E7E5] bg-gray-50 text-[#667C78]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Perfil de Acesso</Label>
              <Select
                value={editPapel}
                disabled={usuarioEmEdicao?.id === currentUser?.id || !isAdmin}
                onValueChange={(v: UserRole) => setEditPapel(v)}
              >
                <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador">
                    Administrador (Acesso e Gestão Total)
                  </SelectItem>
                  <SelectItem value="Gestor">
                    Gestor (Toda a Clínica • Sem Gestão de Usuários)
                  </SelectItem>
                  <SelectItem value="Profissional">
                    Profissional (Agendas, Fichas Clínicas e Exames)
                  </SelectItem>
                  <SelectItem value="Visitante">
                    Visitante (Somente Leitura • Base Portal Paciente)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
              <div>
                <Label className="text-xs font-semibold text-amber-950 block">
                  Exigir Troca de Senha no Próximo Acesso
                </Label>
                <span className="text-[11px] text-amber-800">
                  Obriga o colaborador a cadastrar nova senha antes de navegar no sistema.
                </span>
              </div>
              <Switch
                checked={editPrecisaTrocarSenha}
                disabled={!isAdmin}
                onCheckedChange={setEditPrecisaTrocarSenha}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-[#E3E7E5]">
              <div>
                <Label className="text-xs font-semibold text-[#1C2B29] block">Conta Ativa</Label>
                <span className="text-[11px] text-[#667C78]">
                  Usuários inativos não conseguem realizar login.
                </span>
              </div>
              <Switch
                checked={editAtivo}
                disabled={usuarioEmEdicao?.id === currentUser?.id || !isAdmin}
                onCheckedChange={setEditAtivo}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalEditar(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoEdicao}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
              >
                {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Redefinir Senha (Admin) */}
      <Dialog open={modalSenha} onOpenChange={setModalSenha}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <KeyRound className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold text-[#1C2B29]">
                Redefinir Senha de Colaborador
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#667C78]">
              Defina uma nova credencial para{' '}
              <strong>{usuarioParaSenha?.name || usuarioParaSenha?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExecutarResetSenha} className="space-y-4 pt-2">
            {/* Escolha do método de definição */}
            <div className="space-y-2 p-3 bg-gray-50/80 rounded-xl border border-[#E3E7E5]">
              <Label className="text-xs font-semibold text-[#1C2B29] block">Modo da Senha</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tipoSenhaReset === 'gerar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTipoSenhaReset('gerar')
                    const pass = gerarSenhaSegura()
                    setNovaSenha(pass)
                    setConfirmarNovaSenha(pass)
                    setSenhaGeradaVisualizacao(pass)
                  }}
                  className={
                    tipoSenhaReset === 'gerar'
                      ? 'bg-[#166A5A] text-white rounded-lg text-xs h-8'
                      : 'rounded-lg text-xs h-8 border-[#E3E7E5]'
                  }
                >
                  <SparklesIcon className="h-3.5 w-3.5 mr-1" />
                  Gerar Automática
                </Button>
                <Button
                  type="button"
                  variant={tipoSenhaReset === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTipoSenhaReset('manual')
                    setNovaSenha('')
                    setConfirmarNovaSenha('')
                  }}
                  className={
                    tipoSenhaReset === 'manual'
                      ? 'bg-[#166A5A] text-white rounded-lg text-xs h-8'
                      : 'rounded-lg text-xs h-8 border-[#E3E7E5]'
                  }
                >
                  <Lock className="h-3.5 w-3.5 mr-1" />
                  Digitar Manualmente
                </Button>
              </div>

              {tipoSenhaReset === 'gerar' && (
                <div className="mt-2 p-2.5 bg-white rounded-lg border border-[#E3E7E5] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#667C78] block">Senha Gerada:</span>
                    <span className="font-mono text-sm font-bold text-[#166A5A]">
                      {senhaGeradaVisualizacao}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(senhaGeradaVisualizacao)
                      toast({ title: 'Senha copiada!' })
                    }}
                    className="h-8 px-2 text-xs text-[#667C78]"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copiar
                  </Button>
                </div>
              )}
            </div>

            {tipoSenhaReset === 'manual' && (
              <>
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
                  <Label className="text-xs font-semibold text-[#1C2B29]">
                    Confirmar Nova Senha
                  </Label>
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmarNovaSenha}
                    onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                    className="rounded-xl border-[#E3E7E5]"
                  />
                </div>
              </>
            )}

            {/* Trava de Troca Obrigatória no Primeiro Acesso */}
            <div className="flex items-start justify-between p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <Label className="text-xs font-semibold text-amber-900">
                    Obrigar troca no próximo login
                  </Label>
                </div>
                <p className="text-[11px] text-amber-800">
                  O colaborador será bloqueado de navegar até cadastrar nova senha própria.
                </p>
              </div>
              <Switch checked={exigirTrocaReset} onCheckedChange={setExigirTrocaReset} />
            </div>

            {/* Disparar e-mail de nova senha */}
            <div className="flex items-center justify-between p-3 bg-[#E2F0EB]/50 rounded-xl border border-[#166A5A]/20">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-[#166A5A]" />
                  <Label className="text-xs font-semibold text-[#166A5A]">
                    Disparar e-mail com a nova senha
                  </Label>
                </div>
                <p className="text-[11px] text-[#667C78]">
                  Registra o e-mail na caixa transacional simulada da clínica.
                </p>
              </div>
              <Switch checked={dispararEmailReset} onCheckedChange={setDispararEmailReset} />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalSenha(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={redefinindoSenha}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
              >
                {redefinindoSenha ? 'Salvando...' : 'Aplicar Nova Senha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
