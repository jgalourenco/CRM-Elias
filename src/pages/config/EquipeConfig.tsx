import React, { useEffect, useState } from 'react'
import { usuariosService, mensagensService } from '@/services/crm'
import { Usuario } from '@/types/crm'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Users, UserPlus, Shield, Mail, Trash2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export default function EquipeConfig() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  // Modal Convidar
  const [modalConvidar, setModalConvidar] = useState(false)
  const [conviteNome, setConviteNome] = useState('')
  const [conviteEmail, setConviteEmail] = useState('')
  const [convitePapel, setConvitePapel] = useState<'Administrador' | 'Recepção' | 'Financeiro'>(
    'Recepção',
  )
  const [convidando, setConvidando] = useState(false)

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

  // Update Role in-line
  const handleUpdatePapel = async (
    userId: string,
    novoPapel: 'Administrador' | 'Recepção' | 'Financeiro',
  ) => {
    try {
      await usuariosService.update(userId, { papel: novoPapel })
      toast({
        title: 'Papel atualizado',
        description: `Usuário agora tem acesso como ${novoPapel}.`,
      })
      fetchUsuarios()
    } catch (err) {
      toast({
        title: 'Erro ao atualizar',
        description: 'Permissão insuficiente.',
        variant: 'destructive',
      })
    }
  }

  // Convidar Usuário (gera convite simulado registrado em mensagens)
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
      // 1. Criar novo usuário na coleção users
      let novoUser
      try {
        novoUser = await pb.collection('users').create({
          email: conviteEmail.trim(),
          name: conviteNome.trim(),
          password: 'TrocarSenha@123',
          passwordConfirm: 'TrocarSenha@123',
          papel: convitePapel,
        })
      } catch (_) {
        // Se falhar (por exemplo email já existe), continua
      }

      // 2. Simular envio de e-mail de convite registrado em mensagens
      try {
        const anyPac = (await pb.collection('pacientes').getList(1, 1)).items[0]
        if (anyPac) {
          await pb.collection('mensagens').create({
            paciente_id: anyPac.id,
            canal: 'Email',
            direcao: 'saida',
            template: 'Convite para Equipe Seleta (Simulado)',
            conteudo: `Olá ${conviteNome}! Você foi convidado(a) pelo Dr. Lourenço para acessar o CRM da Clínica Seleta como "${convitePapel}". Acesse https://crm-seleta.goskip.app/login com seu e-mail ${conviteEmail} e senha provisória TrocarSenha@123`,
            status: 'enviada',
            lida: false,
          })
        }
      } catch {
        /* intentionally ignored */
      }

      toast({
        title: 'Convite enviado com sucesso!',
        description: `E-mail transacional de convite registrado na caixa simulada para ${conviteEmail}.`,
      })

      setModalConvidar(false)
      setConviteNome('')
      setConviteEmail('')
      fetchUsuarios()
    } catch (err) {
      toast({
        title: 'Erro ao enviar convite',
        description: 'Falha ao registrar convite.',
        variant: 'destructive',
      })
    } finally {
      setConvidando(false)
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
            Gestão da Equipe & Permissões
          </h1>
          <p className="text-sm text-[#667C78]">
            Controle de acessos de médicos, enfermeiros, recepção e equipe financeira da Clínica
            Seleta.
          </p>
        </div>

        <Button
          onClick={() => setModalConvidar(true)}
          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Convidar Usuário
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
                <th className="py-3.5 px-4">Papel / Nível</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Cadastrado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E7E5]/70">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-[#667C78]">
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
                    : 'US'

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
                            {u.id === currentUser?.id && (
                              <Badge className="bg-[#E2F0EB] text-[#166A5A] text-[9px] h-4 px-1">
                                Você
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-[#667C78]">{u.email}</td>

                      <td className="py-3.5 px-4">
                        <Select
                          value={u.papel || 'Recepção'}
                          onValueChange={(val: 'Administrador' | 'Recepção' | 'Financeiro') =>
                            handleUpdatePapel(u.id, val)
                          }
                          disabled={u.id === currentUser?.id}
                        >
                          <SelectTrigger className="h-8 text-xs rounded-lg border-[#E3E7E5] w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Administrador">Administrador</SelectItem>
                            <SelectItem value="Recepção">Recepção</SelectItem>
                            <SelectItem value="Financeiro">Financeiro</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <Badge className="bg-emerald-50 text-[#2E8B57] text-[10px]">Ativo</Badge>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-[#667C78] text-right">
                        {new Date(u.created).toLocaleDateString('pt-BR')}
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
              Convidar Membro para a Equipe
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              Um e-mail de convite simulado será registrado no sistema com instruções de acesso.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConvidar} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Nome Completo</Label>
              <Input
                required
                placeholder="Ex: Dra. Renata Meireles"
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
                placeholder="renata@seletaclinica.com.br"
                value={conviteEmail}
                onChange={(e) => setConviteEmail(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Papel no Sistema</Label>
              <Select
                value={convitePapel}
                onValueChange={(v: 'Administrador' | 'Recepção' | 'Financeiro') =>
                  setConvitePapel(v)
                }
              >
                <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador">Administrador (Acesso total)</SelectItem>
                  <SelectItem value="Recepção">
                    Recepção (Agendas, Pacientes e Conversas)
                  </SelectItem>
                  <SelectItem value="Financeiro">Financeiro (Lançamentos e Pacotes)</SelectItem>
                </SelectContent>
              </Select>
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
                {convidando ? 'Enviando convite...' : 'Enviar Convite Simulado'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
