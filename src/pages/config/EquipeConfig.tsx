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
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { ROLE_LABELS } from '@/lib/permissions'

export default function EquipeConfig() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  // Modal Criar / Convidar
  const [modalConvidar, setModalConvidar] = useState(false)
  const [conviteNome, setConviteNome] = useState('')
  const [conviteEmail, setConviteEmail] = useState('')
  const [convitePapel, setConvitePapel] = useState<UserRole>('Gestor/Recepção')
  const [convidando, setConvidando] = useState(false)

  // Modal Editar Usuário
  const [modalEditar, setModalEditar] = useState(false)
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<Usuario | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editPapel, setEditPapel] = useState<UserRole>('Gestor/Recepção')
  const [editAtivo, setEditAtivo] = useState(true)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // Modal Redefinir Senha (Admin)
  const [modalSenha, setModalSenha] = useState(false)
  const [usuarioParaSenha, setUsuarioParaSenha] = useState<Usuario | null>(null)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [redefinindoSenha, setRedefinindoSenha] = useState(false)

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

  // Convidar / Criar Usuário
  const handleConvidar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conviteNome.trim() || !conviteEmail.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe nome e e-mail.',
        variant: 'destructive',
      })
      return
    }

    setConvidando(true)
    try {
      // 1. Criar novo usuário na coleção users com senha padrão provisória
      const defaultPassword = 'TrocarSenha@123'
      await pb.collection('users').create({
        email: conviteEmail.trim().toLowerCase(),
        name: conviteNome.trim(),
        password: defaultPassword,
        passwordConfirm: defaultPassword,
        papel: convitePapel,
        ativo: true,
      })

      // 2. Simular e-mail transacional de convite registrado na caixa simulada
      try {
        const anyPac = (await pb.collection('pacientes').getList(1, 1)).items[0]
        if (anyPac) {
          await pb.collection('mensagens').create({
            paciente_id: anyPac.id,
            canal: 'Email',
            direcao: 'saida',
            template: 'Convite para Equipe Clínica Elias Mansur',
            conteudo: `Olá ${conviteNome}! Você foi convidado(a) para acessar o CRM da Clínica Elias Mansur como "${convitePapel}". Acesse https://crm.clinicaeliasmansur.com.br/login com seu e-mail ${conviteEmail} e senha provisória ${defaultPassword}`,
            status: 'enviada',
            lida: false,
          })
        }
      } catch {
        /* intentionally ignored */
      }

      toast({
        title: 'Usuário cadastrado com sucesso!',
        description: `Convite enviado para ${conviteEmail} com senha provisória.`,
      })

      setModalConvidar(false)
      setConviteNome('')
      setConviteEmail('')
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
    setEditPapel((u.papel as UserRole) || 'Gestor/Recepção')
    setEditAtivo(u.ativo !== false)
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
    setNovaSenha('')
    setConfirmarNovaSenha('')
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
      await usuariosService.adminResetPassword(usuarioParaSenha.id, novaSenha)

      toast({
        title: 'Senha redefinida!',
        description: `A nova senha de ${usuarioParaSenha.name || usuarioParaSenha.email} já está em vigor.`,
      })

      setModalSenha(false)
      setNovaSenha('')
      setConfirmarNovaSenha('')
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

  if (currentUser?.papel !== 'Administrador') {
    return (
      <div className="p-8 text-center space-y-3">
        <Shield className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-[#1C2B29]">Acesso Restrito</h2>
        <p className="text-xs text-[#667C78]">
          Apenas usuários com perfil de <strong>Administrador</strong> podem gerenciar a equipe da
          clínica.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Gestão da Equipe & Níveis de Acesso
          </h1>
          <p className="text-sm text-[#667C78]">
            Controle de perfis (RBAC), credenciais e membros da Clínica Elias Mansur.
          </p>
        </div>

        <Button
          onClick={() => setModalConvidar(true)}
          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Users Table */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E3E7E5] bg-[#F7F6F3]/60 text-xs font-semibold text-[#667C78]">
                <th className="py-3.5 px-4 sm:px-6">Membro da Equipe</th>
                <th className="py-3.5 px-4">E-mail de Acesso</th>
                <th className="py-3.5 px-4">Perfil / Nível</th>
                <th className="py-3.5 px-4">Status</th>
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
                              : u.papel === 'Gestor/Recepção' || u.papel === 'Recepção'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : u.papel === 'Profissional/Saúde'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-gray-50 text-gray-700 border-gray-200'
                          }
                        >
                          {ROLE_LABELS[(u.papel as UserRole) || 'Visualização'] ||
                            u.papel ||
                            'Visualização'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={isAtivo}
                            disabled={isMe}
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
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Convidar Usuário */}
      <Dialog open={modalConvidar} onOpenChange={setModalConvidar}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              Cadastrar Novo Usuário
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              Cria o acesso ao CRM com senha temporária e perfil de permissão definido.
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
              <Label className="text-xs font-semibold text-[#1C2B29]">
                Perfil de Acesso (Papel)
              </Label>
              <Select value={convitePapel} onValueChange={(v: UserRole) => setConvitePapel(v)}>
                <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador">Administrador (Acesso total)</SelectItem>
                  <SelectItem value="Gestor/Recepção">
                    Gestor / Recepção (Agenda, pacientes, régua, funil, importações)
                  </SelectItem>
                  <SelectItem value="Profissional/Saúde">
                    Profissional / Saúde (Agenda, fichas clínicas, exames, mensagens)
                  </SelectItem>
                  <SelectItem value="Visualização">Visualização (Somente leitura)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-[#E2F0EB]/60 rounded-xl border border-[#166A5A]/20 text-xs text-[#166A5A]">
              <p className="font-semibold">Senha inicial de acesso:</p>
              <p>
                O usuário será criado com a senha provisória{' '}
                <code className="font-mono">TrocarSenha@123</code> e poderá alterá-la na tela Minha
                Conta.
              </p>
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
                {convidando ? 'Cadastrando...' : 'Cadastrar Usuário'}
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
                disabled={usuarioEmEdicao?.id === currentUser?.id}
                onValueChange={(v: UserRole) => setEditPapel(v)}
              >
                <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador">Administrador (Acesso total)</SelectItem>
                  <SelectItem value="Gestor/Recepção">
                    Gestor / Recepção (Agenda, pacientes, régua, funil, importações)
                  </SelectItem>
                  <SelectItem value="Profissional/Saúde">
                    Profissional / Saúde (Agenda, fichas clínicas, exames, mensagens)
                  </SelectItem>
                  <SelectItem value="Visualização">Visualização (Somente leitura)</SelectItem>
                </SelectContent>
              </Select>
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
                disabled={usuarioEmEdicao?.id === currentUser?.id}
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

      {/* Modal Redefinir Senha */}
      <Dialog open={modalSenha} onOpenChange={setModalSenha}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <KeyRound className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold text-[#1C2B29]">
                Redefinir Senha de Usuário
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#667C78]">
              Defina uma nova senha para{' '}
              <strong>{usuarioParaSenha?.name || usuarioParaSenha?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExecutarResetSenha} className="space-y-4 pt-2">
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
                {redefinindoSenha ? 'Redefinindo...' : 'Atualizar Senha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
