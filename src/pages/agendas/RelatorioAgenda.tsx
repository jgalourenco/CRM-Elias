import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { atendimentosService, pacientesService } from '@/services/crm'
import { Atendimento, Paciente, StatusAtendimento } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileBarChart,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Printer,
  ChevronLeft,
  Filter,
  Users,
  UserCheck,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function RelatorioAgenda() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros de período (padrão: mês atual)
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
  })
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
  })

  // Filtros adicionais
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroProfissional, setFiltroProfissional] = useState<string>('todos')
  const [filtroPacienteId, setFiltroPacienteId] = useState<string>('todos')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [atRes, pacRes] = await Promise.all([
          atendimentosService.list('', '-data_hora'),
          pacientesService.list(1, 200),
        ])
        setAtendimentos(atRes)
        setPacientes(pacRes.items)
      } catch (err) {
        console.error('Erro ao carregar dados do relatório:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Lista de profissionais únicos
  const profissionaisUnicos = useMemo(() => {
    const profs = new Set<string>()
    atendimentos.forEach((a) => {
      if (a.profissional?.trim()) profs.add(a.profissional.trim())
    })
    return Array.from(profs).sort()
  }, [atendimentos])

  // Filtragem dos atendimentos conforme período e seleções
  const atendimentosFiltrados = useMemo(() => {
    return atendimentos.filter((a) => {
      const dataAt = a.data_hora.slice(0, 10)
      if (dataInicio && dataAt < dataInicio) return false
      if (dataFim && dataAt > dataFim) return false
      if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false
      if (filtroProfissional !== 'todos' && a.profissional !== filtroProfissional) return false
      if (filtroPacienteId !== 'todos' && a.paciente_id !== filtroPacienteId) return false
      return true
    })
  }, [atendimentos, dataInicio, dataFim, filtroStatus, filtroProfissional, filtroPacienteId])

  // Métricas Consolidadas
  const totalAgendados = atendimentosFiltrados.length
  const comparecimentos = atendimentosFiltrados.filter(
    (a) => a.status === 'Realizado' || a.status === 'Em_atendimento',
  ).length
  const noShows = atendimentosFiltrados.filter((a) => a.status === 'No_show').length
  const cancelamentos = atendimentosFiltrados.filter((a) => a.status === 'Cancelado').length
  const confirmadosPendentes = atendimentosFiltrados.filter(
    (a) => a.status === 'Agendado' || a.status === 'Confirmado' || a.status === 'Chegou',
  ).length

  const taxaComparecimento =
    totalAgendados > 0 ? ((comparecimentos / totalAgendados) * 100).toFixed(1) : '0'
  const taxaNoShow = totalAgendados > 0 ? ((noShows / totalAgendados) * 100).toFixed(1) : '0'
  const taxaCancelamento =
    totalAgendados > 0 ? ((cancelamentos / totalAgendados) * 100).toFixed(1) : '0'

  // Agrupamento por Profissional
  const resumoPorProfissional = useMemo(() => {
    const map = new Map<
      string,
      { total: number; compareceu: number; noShow: number; cancelado: number }
    >()
    atendimentosFiltrados.forEach((a) => {
      const prof = a.profissional || 'Não especificado'
      if (!map.has(prof)) {
        map.set(prof, { total: 0, compareceu: 0, noShow: 0, cancelado: 0 })
      }
      const item = map.get(prof)!
      item.total++
      if (a.status === 'Realizado' || a.status === 'Em_atendimento') item.compareceu++
      else if (a.status === 'No_show') item.noShow++
      else if (a.status === 'Cancelado') item.cancelado++
    })
    return Array.from(map.entries()).map(([prof, stats]) => ({
      profissional: prof,
      ...stats,
      taxaNoShow: stats.total > 0 ? ((stats.noShow / stats.total) * 100).toFixed(1) : '0',
    }))
  }, [atendimentosFiltrados])

  // Exportação CSV / Excel
  const handleExportCSV = () => {
    if (atendimentosFiltrados.length === 0) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Ajuste os filtros de período para incluir atendimentos.',
        variant: 'destructive',
      })
      return
    }

    const headers = [
      'Data/Hora',
      'Paciente',
      'Telefone',
      'Profissional',
      'Tipo Procedimento',
      'Status',
      'Recorrencia',
      'Observacoes',
    ]

    const rows = atendimentosFiltrados.map((a) => {
      const pac = pacientes.find((p) => p.id === a.paciente_id)
      const dataFmt = new Date(a.data_hora).toLocaleString('pt-BR')
      const recorrente = a.serie_recorrencia_id
        ? `Sessão ${a.numero_recorrencia || 1}/${a.total_recorrencias || 1}`
        : 'Avulso'
      return [
        `"${dataFmt}"`,
        `"${pac?.nome || a.expand?.paciente_id?.nome || 'Desconhecido'}"`,
        `"${pac?.telefone || ''}"`,
        `"${a.profissional || ''}"`,
        `"${a.tipo || ''}"`,
        `"${a.status}"`,
        `"${recorrente}"`,
        `"${(a.observacoes || '').replace(/"/g, '""')}"`,
      ].join(';')
    })

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `relatorio_agenda_clinica_elias_mansur_${dataInicio}_a_${dataFim}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: 'Planilha exportada!',
      description: 'O arquivo CSV compatível com Excel foi gerado com sucesso.',
    })
  }

  // Exportação PDF / Impressão Formatada
  const handlePrintPDF = () => {
    window.print()
  }

  const getStatusBadge = (status: StatusAtendimento) => {
    switch (status) {
      case 'Realizado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Realizado</Badge>
        )
      case 'No_show':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">No-show (Falta)</Badge>
      case 'Cancelado':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Cancelado</Badge>
      case 'Confirmado':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Confirmado</Badge>
      case 'Chegou':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Na Recepção</Badge>
      case 'Em_atendimento':
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            Em Atendimento
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/agendas')}
              className="h-8 px-2 text-[#667C78] hover:text-[#1C2B29]"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar à Agenda
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Relatório de Agenda & No-Show
          </h1>
          <p className="text-sm text-[#667C78]">
            Análise de comparecimentos, absenteísmo e cancelamentos da Clínica Elias Mansur.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="rounded-xl text-xs font-semibold gap-1.5 border-[#E3E7E5] hover:bg-gray-50"
          >
            <Download className="h-4 w-4 text-[#166A5A]" />
            Exportar CSV / Excel
          </Button>

          <Button
            onClick={handlePrintPDF}
            className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Printer className="h-4 w-4 text-[#C9A227]" />
            Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      {/* Relatório Impresso Header (somente no print) */}
      <div className="hidden print:block border-b border-gray-300 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-black">
          Clínica Elias Mansur • Relatório de Atendimentos
        </h1>
        <p className="text-sm text-gray-600">
          Período apurado: {new Date(dataInicio).toLocaleDateString('pt-BR')} até{' '}
          {new Date(dataFim).toLocaleDateString('pt-BR')} • Emitido em{' '}
          {new Date().toLocaleString('pt-BR')}
        </p>
      </div>

      {/* Filtros de Período e Critérios */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-4 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Data Início */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#1C2B29]">Data Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="rounded-xl border-[#E3E7E5] text-xs h-9"
            />
          </div>

          {/* Data Fim */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#1C2B29]">Data Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="rounded-xl border-[#E3E7E5] text-xs h-9"
            />
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#1C2B29]">Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="rounded-xl border-[#E3E7E5] text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="Realizado">Realizado (Compareceu)</SelectItem>
                <SelectItem value="No_show">No-show (Faltou)</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
                <SelectItem value="Confirmado">Confirmado</SelectItem>
                <SelectItem value="Agendado">Agendado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Profissional */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#1C2B29]">Profissional</Label>
            <Select value={filtroProfissional} onValueChange={setFiltroProfissional}>
              <SelectTrigger className="rounded-xl border-[#E3E7E5] text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os profissionais</SelectItem>
                {profissionaisUnicos.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paciente */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#1C2B29]">Paciente</Label>
            <Select value={filtroPacienteId} onValueChange={setFiltroPacienteId}>
              <SelectTrigger className="rounded-xl border-[#E3E7E5] text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os pacientes</SelectItem>
                {pacientes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Agendamentos */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-4">
          <div className="flex items-center justify-between text-xs text-[#667C78]">
            <span>Total no Período</span>
            <Calendar className="h-4 w-4 text-[#166A5A]" />
          </div>
          <p className="text-2xl font-bold text-[#1C2B29] mt-2">{totalAgendados}</p>
          <p className="text-[11px] text-[#667C78] mt-0.5">
            {confirmadosPendentes} pendentes / confirmados
          </p>
        </Card>

        {/* Comparecimentos */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-4">
          <div className="flex items-center justify-between text-xs text-emerald-700">
            <span>Comparecimentos</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{comparecimentos}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
            Taxa de Presença: {taxaComparecimento}%
          </p>
        </Card>

        {/* No-Shows */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-4">
          <div className="flex items-center justify-between text-xs text-red-700">
            <span>No-Show (Faltas)</span>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-700 mt-2">{noShows}</p>
          <p className="text-[11px] text-red-600 mt-0.5 font-medium">
            Taxa de No-Show: {taxaNoShow}%
          </p>
        </Card>

        {/* Cancelamentos */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-4">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Cancelamentos</span>
            <XCircle className="h-4 w-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-gray-700 mt-2">{cancelamentos}</p>
          <p className="text-[11px] text-gray-600 mt-0.5 font-medium">
            Taxa de Cancelamento: {taxaCancelamento}%
          </p>
        </Card>
      </div>

      {/* Tabela Resumo por Profissional */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-2 border-b border-[#E3E7E5]/70">
          <CardTitle className="text-base font-bold text-[#1C2B29] flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-[#166A5A]" />
            Desempenho e No-Show por Profissional
          </CardTitle>
          <CardDescription className="text-xs text-[#667C78]">
            Comparativo de atendimentos realizados vs. faltas por médico/terapeuta no período.
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E7E5] bg-[#F7F6F3]/60 font-semibold text-[#667C78]">
                <th className="py-3 px-4 sm:px-6">Profissional</th>
                <th className="py-3 px-4 text-center">Total Agendados</th>
                <th className="py-3 px-4 text-center text-emerald-700">Realizados</th>
                <th className="py-3 px-4 text-center text-red-700">No-Show</th>
                <th className="py-3 px-4 text-center text-gray-600">Cancelados</th>
                <th className="py-3 px-4 text-center font-bold">Taxa No-Show</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E7E5]/70">
              {resumoPorProfissional.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#667C78]">
                    Nenhum profissional com atendimentos no período selecionado.
                  </td>
                </tr>
              ) : (
                resumoPorProfissional.map((row) => (
                  <tr key={row.profissional} className="hover:bg-[#F7F6F3]/50">
                    <td className="py-3 px-4 sm:px-6 font-semibold text-[#1C2B29]">
                      {row.profissional}
                    </td>
                    <td className="py-3 px-4 text-center font-medium">{row.total}</td>
                    <td className="py-3 px-4 text-center text-emerald-700 font-bold">
                      {row.compareceu}
                    </td>
                    <td className="py-3 px-4 text-center text-red-700 font-bold">{row.noShow}</td>
                    <td className="py-3 px-4 text-center text-gray-600">{row.cancelado}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          Number(row.taxaNoShow) > 20
                            ? 'bg-red-100 text-red-800'
                            : Number(row.taxaNoShow) > 10
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {row.taxaNoShow}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tabela Detalhada de Atendimentos */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-2 border-b border-[#E3E7E5]/70">
          <CardTitle className="text-base font-bold text-[#1C2B29] flex items-center justify-between">
            <span>Listagem Detalhada ({atendimentosFiltrados.length} agendamentos)</span>
          </CardTitle>
          <CardDescription className="text-xs text-[#667C78]">
            Histórico item a item com data, paciente, procedimento e status de comparecimento.
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E7E5] bg-[#F7F6F3]/60 font-semibold text-[#667C78]">
                <th className="py-3 px-4 sm:px-6">Data & Horário</th>
                <th className="py-3 px-4">Paciente</th>
                <th className="py-3 px-4">Profissional</th>
                <th className="py-3 px-4">Procedimento</th>
                <th className="py-3 px-4">Série / Recorrência</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 sm:px-6">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E7E5]/70">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#667C78]">
                    Carregando dados...
                  </td>
                </tr>
              ) : atendimentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#667C78]">
                    Nenhum agendamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                atendimentosFiltrados.map((a) => {
                  const pac = pacientes.find((p) => p.id === a.paciente_id)
                  const dataObj = new Date(a.data_hora)
                  return (
                    <tr key={a.id} className="hover:bg-[#F7F6F3]/50">
                      <td className="py-3 px-4 sm:px-6 whitespace-nowrap">
                        <span className="font-semibold text-[#1C2B29]">
                          {dataObj.toLocaleDateString('pt-BR')}
                        </span>{' '}
                        <span className="text-[#667C78]">
                          às{' '}
                          {dataObj.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#1C2B29]">
                          {pac?.nome || a.expand?.paciente_id?.nome || '—'}
                        </p>
                        <p className="text-[10px] text-[#667C78]">{pac?.telefone || ''}</p>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#1C2B29]">
                        {a.profissional || 'Dr. Elias Mansur'}
                      </td>
                      <td className="py-3 px-4 text-[#166A5A] font-semibold">
                        {a.tipo.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4">
                        {a.serie_recorrencia_id ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-[#E2F0EB]/40 border-[#166A5A]/30 text-[#166A5A]"
                          >
                            Semanal {a.numero_recorrencia || 1}/{a.total_recorrencias || 1}
                          </Badge>
                        ) : (
                          <span className="text-[#667C78] text-[11px]">Individual</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(a.status)}</td>
                      <td className="py-3 px-4 sm:px-6 text-[#667C78] max-w-xs truncate">
                        {a.observacoes || '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
