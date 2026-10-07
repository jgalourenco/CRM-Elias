import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  pacientesService,
  atendimentosService,
  lancamentosService,
  prospeccoesService,
  mensagensService,
  pacotesService,
  examesService,
  dispatchAutomacao,
} from '@/services/crm'
import {
  Paciente,
  Atendimento,
  Lancamento,
  Prospeccao,
  Mensagem,
  Pacote,
  ExameLaboratorial,
  TipoAtendimento,
  TipoLancamento,
  StatusLancamento,
  EtapaProspeccao,
  FasePaciente,
} from '@/types/crm'
import ExamesPacienteTab from '@/components/pacientes/ExamesPacienteTab'
import EnviarMensagemAvulsaModal from '@/components/pacientes/EnviarMensagemAvulsaModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import NovoPacienteModal from '@/components/pacientes/NovoPacienteModal'
import {
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  MessageSquare,
  Filter,
  Edit,
  Plus,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  Package,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'

export default function FichaPaciente() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const modoAtendimentoParam = searchParams.get('modo') === 'atendimento'
  const atendimentoIdParam = searchParams.get('atendimentoId')
  const tabParam = searchParams.get('tab')

  const [emModoAtendimento, setEmModoAtendimento] = useState(modoAtendimentoParam)
  const [atendimentoAtualId, setAtendimentoAtualId] = useState<string | null>(atendimentoIdParam)

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [prospeccao, setProspeccao] = useState<Prospeccao | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [exames, setExames] = useState<ExameLaboratorial[]>([])
  const [loading, setLoading] = useState(true)

  // Tab State
  const [activeTab, setActiveTab] = useState(tabParam || 'visao-geral')

  // Modals
  const [modalEditarPaciente, setModalEditarPaciente] = useState(false)
  const [modalNovoAtendimento, setModalNovoAtendimento] = useState(false)
  const [modalNovoLancamento, setModalNovoLancamento] = useState(false)
  const [modalAssociarPacote, setModalAssociarPacote] = useState(false)
  const [modalMensagemAvulsa, setModalMensagemAvulsa] = useState(false)

  // Anamnese Form State
  const [comoChegou, setComoChegou] = useState('')
  const [indicacaoProfissional, setIndicacaoProfissional] = useState('')
  const [comorbidades, setComorbidades] = useState('')
  const [alergias, setAlergias] = useState('')
  const [medicamentos, setMedicamentos] = useState('')
  const [objetivos, setObjetivos] = useState('')
  const [savingAnamnese, setSavingAnamnese] = useState(false)

  // Form Novo Atendimento
  const [tipoAt, setTipoAt] = useState<TipoAtendimento>('Consulta')
  const [profAt, setProfAt] = useState('Dr. Roberto Seleta')
  const [dataHoraAt, setDataHoraAt] = useState('')
  const [obsAt, setObsAt] = useState('')

  // Form Novo Lancamento
  const [descLanc, setDescLanc] = useState('')
  const [tipoLanc, setTipoLanc] = useState<TipoLancamento>('Consulta')
  const [valorLanc, setValorLanc] = useState<number>(500)
  const [statusLanc, setStatusLanc] = useState<StatusLancamento>('Pago')

  // Form Associar Pacote
  const [selectedPacoteId, setSelectedPacoteId] = useState('')

  // Mensagem Manual
  const [novaMsgTexto, setNovaMsgTexto] = useState('')
  const [canalEnvio, setCanalEnvio] = useState<'WhatsApp' | 'Email'>('WhatsApp')
  const [enviandoMsg, setEnviandoMsg] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      const [pacRes, atRes, lancRes, prospRes, msgRes, pacotesRes, examesRes] = await Promise.all([
        pacientesService.getById(id),
        atendimentosService.list(`paciente_id = "${id}"`, '-data_hora'),
        lancamentosService.list(`paciente_id = "${id}"`, '-data'),
        prospeccoesService.list(`paciente_id = "${id}"`),
        mensagensService.list(`paciente_id = "${id}"`, 'created'),
        pacotesService.list(),
        examesService.list(`paciente_id = "${id}"`, '-data'),
      ])

      setPaciente(pacRes)
      setAtendimentos(atRes)
      setLancamentos(lancRes)
      setProspeccao(prospRes[0] || null)
      setMensagens(msgRes)
      setPacotes(pacotesRes)
      setExames(examesRes)

      // Preencher campos de Anamnese
      if (pacRes.anamnese) {
        setComoChegou(pacRes.anamnese.como_chegou || '')
        setIndicacaoProfissional(pacRes.anamnese.indicacao_profissional || '')
        setComorbidades((pacRes.anamnese.comorbidades || []).join(', '))
        setAlergias((pacRes.anamnese.alergias || []).join(', '))
        setMedicamentos(pacRes.anamnese.medicamentos || '')
        setObjetivos(pacRes.anamnese.objetivos || '')
      }
    } catch (err) {
      console.error('Erro ao carregar prontuário do paciente:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
    if (searchParams.get('modo') === 'atendimento') {
      setEmModoAtendimento(true)
      setActiveTab('visao-geral')
      const atId = searchParams.get('atendimentoId')
      if (atId) setAtendimentoAtualId(atId)
    }
  }, [searchParams, tabParam])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#166A5A] border-t-transparent" />
      </div>
    )
  }

  if (!paciente) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-[#667C78]">Paciente não encontrado.</p>
        <Button onClick={() => navigate('/pacientes')} variant="outline">
          Voltar para Pacientes
        </Button>
      </div>
    )
  }

  const initials = paciente.nome
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const pacoteAtual = pacotes.find((p) => p.id === paciente.pacote_atual_id)

  // Próximo atendimento
  const proximoAt = atendimentos
    .filter((a) => new Date(a.data_hora) >= new Date() && a.status === 'Agendado')
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())[0]

  // 1. Salvar Anamnese
  const handleSalvarAnamnese = async () => {
    setSavingAnamnese(true)
    try {
      const anamneseAtualizada = {
        como_chegou: comoChegou.trim(),
        indicacao_profissional: indicacaoProfissional.trim(),
        comorbidades: comorbidades
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        alergias: alergias
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        medicamentos: medicamentos.trim(),
        objetivos: objetivos.trim(),
      }

      await pacientesService.update(paciente.id, {
        anamnese: anamneseAtualizada,
      })

      toast({ title: 'Anamnese atualizada', description: 'Ficha clínica gravada com sucesso.' })
      loadData()
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar a anamnese.',
        variant: 'destructive',
      })
    } finally {
      setSavingAnamnese(false)
    }
  }

  // 2. Salvar Novo Atendimento
  const handleCriarAtendimento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dataHoraAt) {
      toast({
        title: 'Horário obrigatório',
        description: 'Selecione a data e hora do atendimento.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Validação de saldo de pacote se for aplicação
      if (
        (tipoAt === 'Aplicacao_APP' || tipoAt === 'Aplicacao_APP_AV') &&
        (paciente.aplicacoes_restantes || 0) <= 0
      ) {
        const confirmar = window.confirm(
          'Paciente sem pacote com aplicações restantes. Deseja criar o agendamento mesmo assim?',
        )
        if (!confirmar) return
      }

      await atendimentosService.create({
        paciente_id: paciente.id,
        tipo: tipoAt,
        profissional: profAt,
        data_hora: new Date(dataHoraAt).toISOString(),
        status: 'Agendado',
        observacoes: obsAt,
      })

      // Disparar automação de confirmação de agendamento correspondente
      if (tipoAt === 'Aplicacao_APP') {
        await dispatchAutomacao('Lembrete de aplicação APP', paciente, {
          hora: new Date(dataHoraAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })
      } else if (tipoAt === 'Aplicacao_APP_AV') {
        await dispatchAutomacao('Lembrete de aplicação APP+AV', paciente, {
          hora: new Date(dataHoraAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })
      } else if (tipoAt === 'Retorno') {
        await dispatchAutomacao('Lembrete de retorno', paciente)
      }

      toast({ title: 'Atendimento agendado', description: 'Novo agendamento salvo no calendário.' })
      setModalNovoAtendimento(false)
      setDataHoraAt('')
      setObsAt('')
      loadData()
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível agendar o atendimento.',
        variant: 'destructive',
      })
    }
  }

  // Concluir consulta do modo atendimento
  const handleConcluirConsultaAtual = async () => {
    if (!atendimentoAtualId) {
      setEmModoAtendimento(false)
      return
    }
    try {
      await atendimentosService.update(atendimentoAtualId, {
        status: 'Realizado',
        hora_fim_atendimento: new Date().toISOString(),
      })
      await dispatchAutomacao('Agradecimento pela consulta', paciente)
      toast({
        title: 'Consulta concluída com sucesso!',
        description: 'Atendimento finalizado e marcado como Realizado.',
      })
      setEmModoAtendimento(false)
      // Atualizar URL removendo modo=atendimento
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('modo')
      newParams.delete('atendimentoId')
      setSearchParams(newParams)
      loadData()
    } catch {
      toast({
        title: 'Erro ao concluir',
        description: 'Não foi possível finalizar o atendimento.',
        variant: 'destructive',
      })
    }
  }

  // Atualizar status do atendimento
  const handleMudarStatusAtendimento = async (
    atId: string,
    novoStatus: 'Realizado' | 'No_show' | 'Cancelado',
  ) => {
    try {
      const target = atendimentos.find((a) => a.id === atId)
      await atendimentosService.update(atId, { status: novoStatus })

      // Consumir 1 aplicação se for aplicação e virou Realizado
      if (
        novoStatus === 'Realizado' &&
        target &&
        (target.tipo === 'Aplicacao_APP' || target.tipo === 'Aplicacao_APP_AV')
      ) {
        const novoSaldo = Math.max((paciente.aplicacoes_restantes || 0) - 1, 0)
        await pacientesService.update(paciente.id, { aplicacoes_restantes: novoSaldo })

        // Se zerou, disparar automação de LTV
        if (novoSaldo === 0 && (paciente.aplicacoes_restantes || 0) > 0) {
          await dispatchAutomacao('Oferta de programa de fidelidade', paciente)
        }
      }

      // Triggers de automação por status
      if (novoStatus === 'Realizado') {
        await dispatchAutomacao('Agradecimento pela consulta', paciente)
      } else if (novoStatus === 'No_show') {
        await dispatchAutomacao('Notifica ausência', paciente)
      }

      toast({ title: 'Status atualizado', description: `Atendimento marcado como ${novoStatus}.` })
      loadData()
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao atualizar status.', variant: 'destructive' })
    }
  }

  // 3. Salvar Novo Lançamento
  const handleCriarLancamento = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await lancamentosService.create({
        paciente_id: paciente.id,
        descricao: descLanc.trim(),
        tipo: tipoLanc,
        valor: Number(valorLanc),
        status: statusLanc,
        data: new Date().toISOString(),
      })

      // Se pago, somar ao LTV e disparar automação de NF
      if (statusLanc === 'Pago') {
        const novoLtv = (paciente.ltv || 0) + Number(valorLanc)
        await pacientesService.update(paciente.id, { ltv: novoLtv })
        await dispatchAutomacao('Envio de nota fiscal', paciente)
      }

      toast({ title: 'Lançamento registrado', description: 'Financeiro atualizado com sucesso.' })
      setModalNovoLancamento(false)
      setDescLanc('')
      loadData()
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o lançamento.',
        variant: 'destructive',
      })
    }
  }

  // 4. Associar Pacote
  const handleAssociarPacote = async () => {
    if (!selectedPacoteId) return
    const pkg = pacotes.find((p) => p.id === selectedPacoteId)
    if (!pkg) return

    try {
      // 1. Atualizar paciente com o pacote e saldo de aplicações
      await pacientesService.update(paciente.id, {
        pacote_atual_id: pkg.id,
        aplicacoes_restantes: pkg.quantidade_aplicacoes,
        fase: 'Ativo',
        ltv: (paciente.ltv || 0) + pkg.valor_total,
      })

      // 2. Registrar lançamento de venda do pacote
      await lancamentosService.create({
        paciente_id: paciente.id,
        descricao: `Venda ${pkg.nome}`,
        tipo: 'Pacote',
        valor: pkg.valor_total,
        status: 'Pago',
        data: new Date().toISOString(),
      })

      // 3. Disparar automação de NF
      await dispatchAutomacao('Envio de nota fiscal', paciente)

      toast({
        title: 'Pacote associado',
        description: `${pkg.nome} associado com ${pkg.quantidade_aplicacoes} aplicações!`,
      })
      setModalAssociarPacote(false)
      loadData()
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível associar o pacote.',
        variant: 'destructive',
      })
    }
  }

  // 5. Etapas de Prospecção
  const etapasLista: EtapaProspeccao[] = [
    'primeiro_contato',
    'proposta',
    'comparacao',
    'recomendacao',
    'fechamento',
  ]

  const handleAvancarEtapa = async (etapaAlvo: EtapaProspeccao) => {
    try {
      if (prospeccao) {
        await prospeccoesService.update(prospeccao.id, {
          etapa: etapaAlvo,
          data_proximo_contato: new Date().toISOString(),
        })
      } else {
        await prospeccoesService.create({
          paciente_id: paciente.id,
          etapa: etapaAlvo,
          prioridade: 'media',
          canal: 'WhatsApp',
        })
      }

      // Ao chegar em fechamento, disparar automação e mudar fase para Ativo/Primeira consulta
      if (etapaAlvo === 'fechamento') {
        await dispatchAutomacao('Boas-vindas — primeiro contato', paciente)
        await pacientesService.update(paciente.id, { fase: 'Primeira_consulta' })
      }

      toast({
        title: 'Etapa atualizada',
        description: `Funil avançado para ${etapaAlvo.replace('_', ' ')}.`,
      })
      loadData()
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao atualizar etapa.', variant: 'destructive' })
    }
  }

  // 6. Enviar Mensagem Manual
  const handleEnviarMensagemManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaMsgTexto.trim()) return

    setEnviandoMsg(true)
    try {
      await mensagensService.create({
        paciente_id: paciente.id,
        canal: canalEnvio,
        direcao: 'saida',
        template: 'Manual',
        conteudo: novaMsgTexto.trim(),
        status: 'enviada',
        lida: true,
        agendada_para: new Date().toISOString(),
      })

      setNovaMsgTexto('')
      toast({
        title: 'Mensagem enviada',
        description: `Mensagem registrada na caixa ${canalEnvio} simulada.`,
      })
      loadData()
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar mensagem.',
        variant: 'destructive',
      })
    } finally {
      setEnviandoMsg(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <Button
        variant="ghost"
        onClick={() => navigate('/pacientes')}
        className="text-[#667C78] hover:text-[#1C2B29] gap-1 px-0 h-auto font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para a Lista de Pacientes
      </Button>

      {/* BANNER MODO EM ATENDIMENTO (se ativado via Iniciar consulta) */}
      {emModoAtendimento && (
        <div className="rounded-2xl bg-gradient-to-r from-[#166A5A] via-[#166A5A] to-[#0F5145] p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-emerald-600/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Consulta em Andamento
                </h2>
                <Badge className="bg-emerald-400/20 text-emerald-200 border-emerald-300/30 text-[11px] font-semibold">
                  Modo Atendimento Ativo
                </Badge>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Você está atendendo <strong className="text-white">{paciente.nome}</strong>. O
                prontuário está aberto para preenchimento de anamnese e evolução.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleSalvarAnamnese}
              disabled={savingAnamnese}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs font-semibold rounded-xl"
            >
              {savingAnamnese ? 'Salvando...' : 'Salvar Evolução'}
            </Button>
            <Button
              size="sm"
              onClick={handleConcluirConsultaAtual}
              className="bg-[#C9A227] hover:bg-[#b08d20] text-white text-xs font-bold rounded-xl gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              Finalizar Atendimento
            </Button>
          </div>
        </div>
      )}

      {/* Cabeçalho da Ficha */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-[#166A5A]/20">
              <AvatarFallback className="bg-[#166A5A] text-white font-bold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-[#1C2B29]">{paciente.nome}</h1>
                <Badge className="bg-[#E2F0EB] text-[#166A5A] hover:bg-[#E2F0EB] text-xs capitalize">
                  {paciente.fase.replace('_', ' ')}
                </Badge>
                {pacoteAtual && (
                  <Badge className="bg-[#FBF3D9] text-[#A5831D] hover:bg-[#FBF3D9] text-xs">
                    {pacoteAtual.nome} ({paciente.aplicacoes_restantes || 0} rest.)
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-[#667C78] flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {paciente.telefone || <span className="italic text-[#9AA8A5]">Sem telefone</span>}
                </span>
                {paciente.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {paciente.email}
                  </span>
                )}
                {paciente.cpf && <span>CPF: {paciente.cpf}</span>}
                {paciente.convenio && (
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold text-[#166A5A] border-[#166A5A]/30 bg-[#E2F0EB]/50"
                  >
                    Convênio: {paciente.convenio}
                    {paciente.id_convenio ? ` (#${paciente.id_convenio})` : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setModalMensagemAvulsa(true)}
              className="rounded-xl border-[#166A5A]/30 text-[#166A5A] hover:bg-[#E2F0EB] text-xs font-semibold gap-1.5 bg-[#E2F0EB]/30"
            >
              <Send className="h-3.5 w-3.5" />
              Enviar Mensagem
            </Button>
            <Button
              variant="outline"
              onClick={() => setModalEditarPaciente(true)}
              className="rounded-xl border-[#E3E7E5] text-xs font-semibold gap-1.5"
            >
              <Edit className="h-3.5 w-3.5" />
              Editar Cadastro
            </Button>
            <Button
              variant="outline"
              onClick={() => setModalNovoLancamento(true)}
              className="rounded-xl border-[#E3E7E5] text-xs font-semibold gap-1.5"
            >
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              Novo Lançamento
            </Button>
            <Button
              onClick={() => setModalNovoAtendimento(true)}
              className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Calendar className="h-3.5 w-3.5" />
              Agendar Atendimento
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs da Ficha */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border border-[#E3E7E5] p-1 rounded-2xl w-full grid grid-cols-2 sm:grid-cols-6 gap-1">
          <TabsTrigger
            value="visao-geral"
            className="rounded-xl text-xs font-semibold data-[state=active]:bg-[#166A5A] data-[state=active]:text-white"
          >
            Visão Geral & Anamnese
          </TabsTrigger>
          <TabsTrigger
            value="exames"
            className="rounded-xl text-xs font-semibold data-[state=active]:bg-[#166A5A] data-[state=active]:text-white"
          >
            Exames ({exames.length})
          </TabsTrigger>
          <TabsTrigger
            value="atendimentos"
            className="rounded-xl text-xs font-semibold data-[state=active]:bg-[#166A5A] data-[state=active]:text-white"
          >
            Atendimentos ({atendimentos.length})
          </TabsTrigger>
          <TabsTrigger
            value="prospeccao"
            className="rounded-xl text-xs font-semibold data-[state=active]:bg-[#166A5A] data-[state=active]:text-white"
          >
            Funil / Prospecção
          </TabsTrigger>
          <TabsTrigger
            value="faturamento"
            className="rounded-xl text-xs font-semibold data-[state=active]:bg-[#166A5A] data-[state=active]:text-white"
          >
            Faturamento ({lancamentos.length})
          </TabsTrigger>
          <TabsTrigger
            value="conversas"
            className="rounded-xl text-xs font-semibold data-[state=active]:bg-[#166A5A] data-[state=active]:text-white"
          >
            Caixa de Conversas ({mensagens.length})
          </TabsTrigger>
        </TabsList>
        {/* 1. VISÃO GERAL & ANAMNESE */}
        <TabsContent value="visao-geral" className="space-y-6 pt-4">
          {' '}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Anamnese (2 colunas) */}
            <Card className="lg:col-span-2 rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-[#1C2B29]">
                      Ficha de Anamnese Integrativa
                    </CardTitle>
                    <CardDescription className="text-xs text-[#667C78]">
                      Histórico clínico, comorbidades, medicamentos e metas terapêuticas do
                      paciente.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleSalvarAnamnese}
                    disabled={savingAnamnese}
                    className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs"
                  >
                    {savingAnamnese ? 'Salvando...' : 'Salvar Anamnese'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#1C2B29]">
                      Como chegou à Clínica Seleta?
                    </Label>
                    <Select value={comoChegou} onValueChange={setComoChegou}>
                      <SelectTrigger className="rounded-xl border-[#E3E7E5] text-xs">
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Instagram">Instagram</SelectItem>
                        <SelectItem value="Google">Google / Busca Orgânica</SelectItem>
                        <SelectItem value="Indicação médica">Indicação Médica</SelectItem>
                        <SelectItem value="Indicação de paciente">
                          Indicação de Amigo/Familiar
                        </SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#1C2B29]">
                      Indicação de Profissional de Saúde
                    </Label>
                    <Input
                      placeholder="Ex: Dra. Camila Dermatologista"
                      value={indicacaoProfissional}
                      onChange={(e) => setIndicacaoProfissional(e.target.value)}
                      className="rounded-xl border-[#E3E7E5] text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-[#1C2B29]">
                      Comorbidades (separadas por vírgula)
                    </Label>
                    <Input
                      placeholder="Ex: Hipotireoidismo, Fadiga crônica, Resistência insulínica"
                      value={comorbidades}
                      onChange={(e) => setComorbidades(e.target.value)}
                      className="rounded-xl border-[#E3E7E5] text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-[#1C2B29]">
                      Alergias Conhecidas (separadas por vírgula)
                    </Label>
                    <Input
                      placeholder="Ex: Sulfas, Dipirona, Frutos do mar"
                      value={alergias}
                      onChange={(e) => setAlergias(e.target.value)}
                      className="rounded-xl border-[#E3E7E5] text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-[#1C2B29]">
                      Medicamentos e Suplementos em Uso
                    </Label>
                    <Textarea
                      rows={3}
                      placeholder="Ex: Levotiroxina 50mcg jejum, Coenzima Q10 100mg, Ômega 3 1g..."
                      value={medicamentos}
                      onChange={(e) => setMedicamentos(e.target.value)}
                      className="rounded-xl border-[#E3E7E5] text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-[#1C2B29]">
                      Objetivos com o Tratamento
                    </Label>
                    <Textarea
                      rows={3}
                      placeholder="Ex: Disposição física, melhora mitocondrial, equilíbrio hormonal..."
                      value={objetivos}
                      onChange={(e) => setObjetivos(e.target.value)}
                      className="rounded-xl border-[#E3E7E5] text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coluna Direita: Cards Próximo Atendimento & LTV */}
            <div className="space-y-6">
              {/* Card Dados Cadastrais & Convênio */}
              <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-[#1C2B29]">
                      Dados Cadastrais & Convênio
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setModalEditarPaciente(true)}
                      className="text-[#166A5A] hover:bg-[#E2F0EB] text-xs h-7 px-2"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#E3E7E5]/60">
                    <span className="text-[#667C78]">ID do Cliente:</span>
                    <span className="font-semibold text-[#1C2B29] font-mono">
                      {paciente.id_cliente || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E3E7E5]/60">
                    <span className="text-[#667C78]">ID da Assinatura:</span>
                    <span className="font-semibold text-[#1C2B29] font-mono">
                      {paciente.id_assinatura || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E3E7E5]/60">
                    <span className="text-[#667C78]">Convênio:</span>
                    <span className="font-semibold text-[#166A5A]">
                      {paciente.convenio || 'Particular'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E3E7E5]/60">
                    <span className="text-[#667C78]">ID do Convênio:</span>
                    <span className="font-semibold text-[#1C2B29] font-mono">
                      {paciente.id_convenio || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E3E7E5]/60">
                    <span className="text-[#667C78]">Telefone:</span>
                    <span className="font-semibold text-[#1C2B29]">
                      {paciente.telefone || (
                        <span className="italic text-[#9AA8A5]">Não informado</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#667C78]">Cidade / UF:</span>
                    <span className="font-semibold text-[#1C2B29]">
                      {paciente.cidade ? `${paciente.cidade}/${paciente.uf || 'SP'}` : '—'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Card Próximo Atendimento */}
              <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-[#1C2B29]">
                      Próximo Atendimento
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-[#166A5A]" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {proximoAt ? (
                    <div className="p-3 bg-[#E2F0EB]/50 rounded-xl space-y-1">
                      <p className="text-sm font-bold text-[#166A5A]">
                        {proximoAt.tipo.replace('_', ' ')}
                      </p>
                      <p className="text-xs font-semibold text-[#1C2B29]">
                        {new Date(proximoAt.data_hora).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(proximoAt.data_hora).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-[#667C78]">
                        Profissional: {proximoAt.profissional || 'Equipe Seleta'}
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs text-[#667C78] py-2">
                      Nenhum atendimento futuro agendado.
                    </div>
                  )}
                  <Button
                    onClick={() => setModalNovoAtendimento(true)}
                    variant="outline"
                    className="w-full text-xs rounded-xl"
                  >
                    Agendar Novo Horário
                  </Button>
                </CardContent>
              </Card>

              {/* Card LTV do Paciente */}
              <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-[#1C2B29]">
                      LTV do Paciente
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-[#C9A227]" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-3xl font-bold text-[#2E8B57]">
                    {(paciente.ltv || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </p>
                  <p className="text-xs text-[#667C78]">
                    Valor total acumulado em consultas e pacotes concluídos.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ABA EXAMES (Novo módulo inspirado no MedX) */}
        <TabsContent value="exames" className="space-y-4 pt-4">
          <ExamesPacienteTab
            pacienteId={paciente.id}
            pacienteNome={paciente.nome}
            pacienteSexo={paciente.sexo}
            exames={exames}
            onReload={loadData}
          />
        </TabsContent>

        {/* 2. ATENDIMENTOS */}
        <TabsContent value="atendimentos" className="space-y-4 pt-4">
          {' '}
          <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold text-[#1C2B29]">
                  Histórico de Atendimentos
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Consultas, retornos e procedimentos injetáveis
                </CardDescription>
              </div>
              <Button
                onClick={() => setModalNovoAtendimento(true)}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Agendar
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#E3E7E5] bg-[#F7F6F3]/60 text-xs font-semibold text-[#667C78]">
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Data e Hora</th>
                    <th className="py-3 px-4">Profissional</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E7E5]/70">
                  {atendimentos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-[#667C78]">
                        Nenhum atendimento registrado para este paciente.
                      </td>
                    </tr>
                  ) : (
                    atendimentos.map((at) => (
                      <tr key={at.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-semibold text-[#1C2B29] text-xs">
                          {at.tipo.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#1C2B29]">
                          {new Date(at.data_hora).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(at.data_hora).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#667C78]">
                          {at.profissional || 'Equipe Médica'}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <Badge
                            className={
                              at.status === 'Realizado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : at.status === 'No_show'
                                  ? 'bg-red-100 text-red-800'
                                  : at.status === 'Cancelado'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-blue-100 text-blue-800'
                            }
                          >
                            {at.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {at.status === 'Agendado' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMudarStatusAtendimento(at.id, 'Realizado')}
                                className="h-7 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                              >
                                Concluir
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMudarStatusAtendimento(at.id, 'No_show')}
                                className="h-7 text-xs bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                              >
                                No-Show
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 3. PROSPECÇÃO & FUNIL */}
        <TabsContent value="prospeccao" className="space-y-4 pt-4">
          <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-6 space-y-6">
            <div>
              <CardTitle className="text-lg font-bold text-[#1C2B29]">
                Pipeline de Prospecção do Paciente
              </CardTitle>
              <CardDescription className="text-xs text-[#667C78]">
                Acompanhamento sequencial das 5 etapas da jornada de prospecção com disparo
                automático de réguas
              </CardDescription>
            </div>

            <div className="space-y-4">
              {etapasLista.map((etapa, idx) => {
                const etapaAtualIdx = etapasLista.indexOf(prospeccao?.etapa || 'primeiro_contato')
                const isConcluida = idx <= etapaAtualIdx
                const isCurrent = idx === etapaAtualIdx

                const etapaLabels: Record<EtapaProspeccao, string> = {
                  primeiro_contato: '1. Primeiro Contato (WhatsApp / Instagram)',
                  proposta: '2. Proposta / Consulta Agendada',
                  comparacao: '3. Comparação Diagnóstico',
                  recomendacao: '4. Recomendação de Tratamento',
                  fechamento: '5. Fechamento (Novo Paciente Ativo)',
                }

                return (
                  <div
                    key={etapa}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isCurrent
                        ? 'bg-[#E2F0EB]/40 border-[#166A5A]'
                        : isConcluida
                          ? 'bg-gray-50 border-[#E3E7E5]'
                          : 'bg-white border-[#E3E7E5] opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          isConcluida ? 'bg-[#166A5A] text-white' : 'bg-gray-200 text-[#667C78]'
                        }`}
                      >
                        {isConcluida ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1C2B29]">{etapaLabels[etapa]}</p>
                        <p className="text-xs text-[#667C78]">
                          {isCurrent
                            ? 'Etapa atual em andamento'
                            : isConcluida
                              ? 'Concluída'
                              : 'Pendente'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isConcluida ? (
                        <Button
                          size="sm"
                          onClick={() => handleAvancarEtapa(etapa)}
                          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs h-8"
                        >
                          Avançar para esta etapa
                        </Button>
                      ) : isCurrent && idx > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAvancarEtapa(etapasLista[idx - 1])}
                          className="rounded-xl text-xs h-8"
                        >
                          Voltar Etapa
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </TabsContent>

        {/* 4. FATURAMENTO */}
        <TabsContent value="faturamento" className="space-y-4 pt-4">
          <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold text-[#1C2B29]">
                  Lançamentos & Pacotes
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Histórico financeiro e saldo de procedimentos injetáveis
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setModalAssociarPacote(true)}
                  className="rounded-xl border-[#E3E7E5] text-xs font-semibold gap-1.5"
                >
                  <Package className="h-4 w-4 text-[#166A5A]" />
                  Associar Pacote
                </Button>
                <Button
                  onClick={() => setModalNovoLancamento(true)}
                  className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Novo Lançamento
                </Button>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#E3E7E5] bg-[#F7F6F3]/60 text-xs font-semibold text-[#667C78]">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E7E5]/70">
                  {lancamentos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-[#667C78]">
                        Nenhum lançamento financeiro registrado.
                      </td>
                    </tr>
                  ) : (
                    lancamentos.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 text-xs text-[#667C78]">
                          {new Date(l.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#1C2B29] text-xs">
                          {l.descricao}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <Badge variant="outline">{l.tipo.replace('_', ' ')}</Badge>
                        </td>
                        <td className="py-3 px-4 text-xs font-bold text-[#166A5A]">
                          {l.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <Badge
                            className={
                              l.status === 'Pago'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }
                          >
                            {l.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 5. CAIXA DE CONVERSAS (SIMULADA) */}
        <TabsContent value="conversas" className="space-y-4 pt-4">
          <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E3E7E5] pb-3">
              <div>
                <CardTitle className="text-lg font-bold text-[#1C2B29]">
                  Histórico de Mensagens Simuladas
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  WhatsApp (verde) e E-mails (azul) registrados para este paciente
                </CardDescription>
              </div>
              <Badge className="bg-[#E2F0EB] text-[#166A5A] text-xs">SIMULADA</Badge>
            </div>

            {/* Balões de Mensagem */}
            <div className="space-y-3 max-h-[450px] overflow-y-auto p-2 bg-[#F7F6F3]/50 rounded-xl">
              {mensagens.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#667C78]">
                  Nenhuma mensagem registrada ainda para este paciente.
                </div>
              ) : (
                mensagens.map((msg) => {
                  const isSaida = msg.direcao === 'saida'
                  const isWA = msg.canal === 'WhatsApp'

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isSaida ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3.5 text-xs shadow-xs space-y-1.5 ${
                          isSaida
                            ? isWA
                              ? 'bg-[#E2F0EB] text-[#1C2B29] rounded-br-xs border border-[#166A5A]/20'
                              : 'bg-blue-50 text-[#1C2B29] rounded-br-xs border border-blue-200'
                            : 'bg-white text-[#1C2B29] rounded-bl-xs border border-[#E3E7E5]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[10px] text-[#667C78]">
                          <span className="font-semibold flex items-center gap-1">
                            {isWA ? (
                              <span className="text-[#25D366]">WhatsApp</span>
                            ) : (
                              <span className="text-[#2E7FA3]">E-mail</span>
                            )}
                            {msg.template && `• ${msg.template}`}
                          </span>
                          <span>
                            {new Date(msg.created).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-line">{msg.conteudo}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Enviar Mensagem Manual */}
            <form
              onSubmit={handleEnviarMensagemManual}
              className="pt-2 flex flex-col sm:flex-row gap-2"
            >
              <Select
                value={canalEnvio}
                onValueChange={(v: 'WhatsApp' | 'Email') => setCanalEnvio(v)}
              >
                <SelectTrigger className="w-[140px] rounded-xl border-[#E3E7E5] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Email">E-mail</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Digitar mensagem manual simulada..."
                value={novaMsgTexto}
                onChange={(e) => setNovaMsgTexto(e.target.value)}
                className="flex-1 rounded-xl border-[#E3E7E5] text-xs"
              />
              <Button
                type="submit"
                disabled={enviandoMsg || !novaMsgTexto.trim()}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Enviar
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Enviar Mensagem Avulsa (MedX) */}
      {paciente && (
        <EnviarMensagemAvulsaModal
          open={modalMensagemAvulsa}
          onClose={() => setModalMensagemAvulsa(false)}
          paciente={paciente}
          onSuccess={loadData}
        />
      )}

      {/* Modal Editar Paciente */}
      <NovoPacienteModal
        open={modalEditarPaciente}
        pacienteParaEditar={paciente}
        onClose={() => setModalEditarPaciente(false)}
        onSuccess={() => {
          setModalEditarPaciente(false)
          loadData()
        }}
      />

      {/* Modal Novo Atendimento */}
      <Dialog open={modalNovoAtendimento} onOpenChange={setModalNovoAtendimento}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              Agendar Atendimento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriarAtendimento} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Tipo de Atendimento</Label>
              <Select value={tipoAt} onValueChange={(v: TipoAtendimento) => setTipoAt(v)}>
                <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consulta">Consulta (Primeira Consulta)</SelectItem>
                  <SelectItem value="Retorno">Retorno (Follow-up)</SelectItem>
                  <SelectItem value="Aplicacao_APP">Aplicação APP</SelectItem>
                  <SelectItem value="Aplicacao_APP_AV">Aplicação APP + AV (Venosa)</SelectItem>
                  <SelectItem value="Aplicacao_Manipulado">Aplicação Manipulado</SelectItem>
                  <SelectItem value="Outro">Outro Procedimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Profissional</Label>
              <Input
                value={profAt}
                onChange={(e) => setProfAt(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Data e Hora</Label>
              <Input
                type="datetime-local"
                required
                value={dataHoraAt}
                onChange={(e) => setDataHoraAt(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Observações</Label>
              <Textarea
                placeholder="Orientações de preparo ou notas clínicas..."
                value={obsAt}
                onChange={(e) => setObsAt(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalNovoAtendimento(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
              >
                Confirmar Agendamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Lançamento */}
      <Dialog open={modalNovoLancamento} onOpenChange={setModalNovoLancamento}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              Novo Lançamento Financeiro
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriarLancamento} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Descrição</Label>
              <Input
                required
                placeholder="Ex: Consulta Integrativa Inicial"
                value={descLanc}
                onChange={(e) => setDescLanc(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Tipo de Cobrança</Label>
              <Select value={tipoLanc} onValueChange={(v: TipoLancamento) => setTipoLanc(v)}>
                <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consulta">Consulta</SelectItem>
                  <SelectItem value="Retorno">Retorno</SelectItem>
                  <SelectItem value="Manipulado">Manipulado</SelectItem>
                  <SelectItem value="Aplicacao_APP">Aplicação APP</SelectItem>
                  <SelectItem value="Aplicacao_APP_AV">Aplicação APP+AV</SelectItem>
                  <SelectItem value="Pacote">Pacote</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={valorLanc}
                  onChange={(e) => setValorLanc(Number(e.target.value))}
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Status</Label>
                <Select
                  value={statusLanc}
                  onValueChange={(v: StatusLancamento) => setStatusLanc(v)}
                >
                  <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalNovoLancamento(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
              >
                Salvar Lançamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Associar Pacote */}
      <Dialog open={modalAssociarPacote} onOpenChange={setModalAssociarPacote}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              Associar Pacote de Aplicações
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-[#667C78]">
              Selecione o plano de aplicações para atribuir ao paciente. Ao confirmar, o saldo de
              aplicações será atualizado e o lançamento correspondente será gerado.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Pacote Disponível</Label>
              <Select value={selectedPacoteId} onValueChange={setSelectedPacoteId}>
                <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                  <SelectValue placeholder="Selecione um pacote" />
                </SelectTrigger>
                <SelectContent>
                  {pacotes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} — {p.quantidade_aplicacoes}x (
                      {p.valor_total.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalAssociarPacote(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAssociarPacote}
                disabled={!selectedPacoteId}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
              >
                Confirmar e Vender Pacote
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
