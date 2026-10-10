import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pacientesService, pacotesService, atendimentosService } from '@/services/crm'
import { Paciente, FasePaciente, Pacote, Atendimento } from '@/types/crm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  FileText,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  DollarSign,
  Send,
  Link as LinkIcon,
  Check,
  ClipboardList,
} from 'lucide-react'
import EnviarMensagemAvulsaModal from '@/components/pacientes/EnviarMensagemAvulsaModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import NovoPacienteModal from '@/components/pacientes/NovoPacienteModal'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { getPermissions } from '@/lib/permissions'

export default function Pacientes() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const permissions = getPermissions(user?.papel)

  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [faseFilter, setFaseFilter] = useState<string>('todos')
  const [aplicacaoFilter, setAplicacaoFilter] = useState<string>('todos')

  // Pagination (20 per page)
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 20

  // Modals
  const [modalNovo, setModalNovo] = useState(false)
  const [pacienteEditando, setPacienteEditando] = useState<Paciente | null>(null)
  const [pacienteExcluir, setPacienteExcluir] = useState<Paciente | null>(null)
  const [pacienteMensagemAvulsa, setPacienteMensagemAvulsa] = useState<Paciente | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const preCadastroUrl = `${window.location.origin}/questionario`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(preCadastroUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
    toast({
      title: 'Link copiado!',
      description:
        'O link do questionário de pré-cadastro foi copiado para a área de transferência.',
    })
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resPac, resPacotes, resAt] = await Promise.all([
        pacientesService.list(1, 100),
        pacotesService.list(),
        atendimentosService.list(),
      ])
      setPacientes(resPac.items)
      setPacotes(resPacotes)
      setAtendimentos(resAt)
    } catch (err) {
      console.error('Erro ao listar pacientes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filtered Patients
  const filtered = pacientes.filter((p) => {
    const matchSearch =
      !search ||
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      (p.telefone && p.telefone.includes(search)) ||
      (p.email && p.email.toLowerCase().includes(search.toLowerCase())) ||
      (p.cpf && p.cpf.includes(search)) ||
      (p.id_cliente && p.id_cliente.toLowerCase().includes(search.toLowerCase())) ||
      (p.id_assinatura && p.id_assinatura.toLowerCase().includes(search.toLowerCase())) ||
      (p.id_convenio && p.id_convenio.toLowerCase().includes(search.toLowerCase())) ||
      (p.convenio && p.convenio.toLowerCase().includes(search.toLowerCase()))

    const matchFase = faseFilter === 'todos' || p.fase === faseFilter

    let matchAplicacao = true
    if (aplicacaoFilter !== 'todos') {
      const pac = pacotes.find((pkg) => pkg.id === p.pacote_atual_id)
      if (aplicacaoFilter === 'Nenhum') {
        matchAplicacao = !pac
      } else {
        matchAplicacao = pac?.tipo_aplicacao === aplicacaoFilter
      }
    }

    return matchSearch && matchFase && matchAplicacao
  })

  // Paginated
  const totalPages = Math.ceil(filtered.length / perPage) || 1
  const paginatedPacientes = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!pacienteExcluir) return
    try {
      await pacientesService.delete(pacienteExcluir.id)
      toast({
        title: 'Paciente excluído',
        description: `${pacienteExcluir.nome} foi removido com sucesso.`,
      })
      setPacienteExcluir(null)
      fetchData()
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o paciente.',
        variant: 'destructive',
      })
    }
  }

  const getFaseBadge = (fase: FasePaciente) => {
    switch (fase) {
      case 'Ativo':
        return <Badge className="bg-[#E2F0EB] text-[#166A5A] hover:bg-[#E2F0EB]">Ativo</Badge>
      case 'Em_acompanhamento':
        return (
          <Badge className="bg-blue-50 text-[#2E7FA3] hover:bg-blue-50">Em Acompanhamento</Badge>
        )
      case 'Primeira_consulta':
        return (
          <Badge className="bg-[#FBF3D9] text-[#A5831D] hover:bg-[#FBF3D9]">
            Primeira Consulta
          </Badge>
        )
      case 'Prospeccao':
        return <Badge className="bg-gray-100 text-[#667C78] hover:bg-gray-100">Prospecção</Badge>
      case 'Concluido':
        return <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-50">Concluído</Badge>
      case 'Inativo':
        return <Badge className="bg-red-50 text-[#C0392B] hover:bg-red-50">Inativo</Badge>
      default:
        return <Badge variant="outline">{fase}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C2B29] tracking-tight flex items-center gap-2">
            Gestão de Pacientes
            <Badge className="bg-[#E2F0EB] text-[#166A5A] text-xs font-semibold">
              {filtered.length} cadastros
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-[#667C78]">
            Visualização de prontuários, status de atendimento, pacotes e valor de vida (LTV).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="rounded-xl text-xs font-semibold gap-1.5 border-[#166A5A]/30 text-[#166A5A] hover:bg-[#E2F0EB] w-full sm:w-auto justify-center"
            title="Copiar link público do formulário de pré-cadastro"
          >
            {copiedLink ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <LinkIcon className="h-4 w-4" />
            )}
            <span>Link de pré-cadastro</span>
          </Button>

          {permissions.canCreatePaciente && (
            <Button
              onClick={() => {
                setPacienteEditando(null)
                setModalNovo(true)
              }}
              className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm w-full sm:w-auto justify-center"
            >
              <Plus className="h-4 w-4" />
              Novo Paciente
            </Button>
          )}
        </div>
      </div>

      {/* Banner Informativo Questionário de Pré-Cadastro */}
      <Card className="rounded-2xl border border-[#166A5A]/20 bg-gradient-to-r from-[#E2F0EB]/60 via-white to-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-[#166A5A] text-white flex items-center justify-center shadow-xs">
            <ClipboardList className="h-5 w-5 text-[#C9A227]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#1C2B29]">Questionário de Pré-Cadastro Online</p>
            <p className="text-[11px] text-[#667C78]">
              Envie o link para o paciente preencher queixas e dados básicos sem precisar de login.
              Submissões entram no funil de prospecção.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Input
            readOnly
            value={preCadastroUrl}
            className="text-xs h-8 bg-white border-[#E3E7E5] rounded-lg max-w-[220px] font-mono text-[#667C78]"
          />
          <Button
            size="sm"
            onClick={handleCopyLink}
            className="h-8 rounded-lg bg-[#166A5A] hover:bg-[#0F5145] text-white text-xs gap-1"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
            {copiedLink ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </Card>

      {/* Filter Bar */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Busca */}
          <div className="relative sm:col-span-1 lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
            <Input
              type="text"
              placeholder="Buscar por nome, telefone, CPF, convênio, ID cliente..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 rounded-xl border-[#E3E7E5] text-xs h-10"
            />
          </div>

          {/* Filtro Fase */}
          <div>
            <Select
              value={faseFilter}
              onValueChange={(v) => {
                setFaseFilter(v)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="rounded-xl border-[#E3E7E5] text-xs h-10">
                <SelectValue placeholder="Todas as fases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as fases</SelectItem>
                <SelectItem value="Prospeccao">Prospecção</SelectItem>
                <SelectItem value="Primeira_consulta">Primeira Consulta</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Em_acompanhamento">Em Acompanhamento</SelectItem>
                <SelectItem value="Concluido">Concluído</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Tipo Aplicação */}
          <div>
            <Select
              value={aplicacaoFilter}
              onValueChange={(v) => {
                setAplicacaoFilter(v)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="rounded-xl border-[#E3E7E5] text-xs h-10">
                <SelectValue placeholder="Tipo de Aplicação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as aplicações</SelectItem>
                <SelectItem value="APP">Somente APP</SelectItem>
                <SelectItem value="APP_AV">APP + Venosa (APP+AV)</SelectItem>
                <SelectItem value="Nenhum">Sem pacote</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Patients Table Card */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E3E7E5] bg-[#F7F6F3]/60 text-xs font-semibold text-[#667C78]">
                <th className="py-3.5 px-4 sm:px-6">Paciente</th>
                <th className="py-3.5 px-4">Convênio / IDs</th>
                <th className="py-3.5 px-4">Fase</th>
                <th className="py-3.5 px-4">Próximo Atendimento</th>
                <th className="py-3.5 px-4">Pacote Atual</th>
                <th className="py-3.5 px-4">LTV</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E7E5]/70">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#667C78]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#166A5A] border-t-transparent" />
                      Carregando pacientes...
                    </div>
                  </td>
                </tr>
              ) : paginatedPacientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#667C78]">
                    Nenhum paciente encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedPacientes.map((pac) => {
                  const initials = pac.nome
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()

                  // Find next appointment
                  const nextAt = atendimentos
                    .filter((a) => a.paciente_id === pac.id && new Date(a.data_hora) >= new Date())
                    .sort(
                      (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime(),
                    )[0]

                  // Pacote name
                  const pacPackage = pacotes.find((p) => p.id === pac.pacote_atual_id)

                  return (
                    <tr
                      key={pac.id}
                      className="hover:bg-[#F7F6F3]/50 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/pacientes/${pac.id}`)}
                    >
                      {/* Avatar + Nome + Telefone */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-[#E3E7E5]">
                            <AvatarFallback className="bg-[#166A5A]/10 text-[#166A5A] font-bold text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-[#1C2B29] group-hover:text-[#166A5A] transition-colors">
                              {pac.nome}
                            </p>
                            <p className="text-xs text-[#667C78] flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {pac.telefone ? (
                                pac.telefone
                              ) : (
                                <span className="italic text-[#9AA8A5]">Sem telefone</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Convênio / IDs */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="space-y-0.5">
                          {pac.convenio ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] font-semibold text-[#166A5A] border-[#166A5A]/30 bg-[#E2F0EB]/40"
                            >
                              {pac.convenio}
                              {pac.id_convenio ? ` (${pac.id_convenio})` : ''}
                            </Badge>
                          ) : (
                            <span className="text-[#667C78] italic text-xs">Particular</span>
                          )}
                          {(pac.id_cliente || pac.id_assinatura) && (
                            <p className="text-[10px] text-[#667C78] font-mono">
                              {pac.id_cliente && `Cli: ${pac.id_cliente}`}
                              {pac.id_cliente && pac.id_assinatura && ' • '}
                              {pac.id_assinatura && `Ass: ${pac.id_assinatura}`}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Fase */}
                      <td className="py-3.5 px-4">{getFaseBadge(pac.fase)}</td>

                      {/* Próximo Atendimento */}
                      <td className="py-3.5 px-4 text-xs">
                        {nextAt ? (
                          <div>
                            <p className="font-medium text-[#1C2B29]">
                              {new Date(nextAt.data_hora).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(nextAt.data_hora).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            <span className="text-[#667C78] text-[11px]">
                              {nextAt.tipo.replace('_', ' ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#667C78] italic text-xs">Nenhum</span>
                        )}
                      </td>

                      {/* Pacote Atual */}
                      <td className="py-3.5 px-4 text-xs">
                        {pacPackage ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-[#1C2B29]">{pacPackage.nome}</span>
                            <p className="text-[11px] text-[#667C78]">
                              {pac.aplicacoes_restantes || 0} de {pacPackage.quantidade_aplicacoes}{' '}
                              restantes
                            </p>
                          </div>
                        ) : (
                          <span className="text-[#667C78] italic text-xs">—</span>
                        )}
                      </td>

                      {/* LTV */}
                      <td className="py-3.5 px-4 text-xs font-semibold">
                        {(pac.ltv || 0) > 0 ? (
                          <span className="text-[#2E8B57] bg-emerald-50 px-2 py-0.5 rounded-md">
                            {(pac.ltv || 0).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </span>
                        ) : (
                          <span className="text-[#667C78]">R$ 0,00</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td
                        className="py-3.5 px-4 sm:px-6 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#667C78] hover:text-[#166A5A] hover:bg-[#E2F0EB]"
                            title="Enviar Mensagem"
                            onClick={() => setPacienteMensagemAvulsa(pac)}
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#667C78] hover:text-[#166A5A] hover:bg-[#E2F0EB]"
                            title="Ver Ficha"
                            onClick={() => navigate(`/pacientes/${pac.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {permissions.canEditPaciente && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[#667C78] hover:text-[#166A5A] hover:bg-[#E2F0EB]"
                              title="Editar"
                              onClick={() => {
                                setPacienteEditando(pac)
                                setModalNovo(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {permissions.canDeletePaciente && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[#667C78] hover:text-[#C0392B] hover:bg-red-50"
                              title="Excluir"
                              onClick={() => setPacienteExcluir(pac)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#E3E7E5] text-xs text-[#667C78]">
            <span>
              Exibindo {Math.min((currentPage - 1) * perPage + 1, filtered.length)} a{' '}
              {Math.min(currentPage * perPage, filtered.length)} de {filtered.length} pacientes
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-medium">
                {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Enviar Mensagem Avulsa a partir da lista */}
      {pacienteMensagemAvulsa && (
        <EnviarMensagemAvulsaModal
          open={!!pacienteMensagemAvulsa}
          onClose={() => setPacienteMensagemAvulsa(null)}
          paciente={pacienteMensagemAvulsa}
          onSuccess={fetchData}
        />
      )}

      {/* Modal Editar / Novo */}
      <NovoPacienteModal
        open={modalNovo}
        pacienteParaEditar={pacienteEditando}
        onClose={() => {
          setModalNovo(false)
          setPacienteEditando(null)
        }}
        onSuccess={() => {
          setModalNovo(false)
          setPacienteEditando(null)
          fetchData()
        }}
      />

      {/* Dialog Confirmação Exclusão */}
      <AlertDialog open={!!pacienteExcluir} onOpenChange={(v) => !v && setPacienteExcluir(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#1C2B29]">
              Excluir Paciente
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#667C78]">
              Tem certeza que deseja excluir o cadastro de <strong>{pacienteExcluir?.nome}</strong>?
              Esta ação removerá os atendimentos, mensagens e dados clínicos associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-[#C0392B] hover:bg-red-700 text-white rounded-xl"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
