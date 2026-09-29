import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { atendimentosService, pacientesService, dispatchAutomacao } from '@/services/crm'
import { Atendimento, Paciente, TipoAtendimento, StatusAtendimento } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Agendas() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)

  // Calendar View State: 'month' | 'week'
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Modal Novo Atendimento
  const [modalNovo, setModalNovo] = useState(false)
  const [selectedPacienteId, setSelectedPacienteId] = useState('')
  const [tipo, setTipo] = useState<TipoAtendimento>('Consulta')
  const [profissional, setProfissional] = useState('Dr. Roberto Seleta')
  const [dataHora, setDataHora] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [atRes, pacRes] = await Promise.all([
        atendimentosService.list('', 'data_hora'),
        pacientesService.list(1, 100),
      ])
      setAtendimentos(atRes)
      setPacientes(pacRes.items)
    } catch (err) {
      console.error('Erro ao carregar agenda:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Calendar Navigation
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000))
    }
  }

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000))
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Month days calculation
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay() // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Create grid days
  const daysArray: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysArray.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d)
  }

  // Get appointments for a specific day
  const getAtendimentosForDay = (day: number) => {
    return atendimentos.filter((a) => {
      const d = new Date(a.data_hora)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })
  }

  // Upcoming 7 days for sidebar
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const proximos7Dias = atendimentos
    .filter((a) => {
      const d = new Date(a.data_hora)
      return d >= now && d <= in7Days
    })
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())

  // Handle Save
  const handleCriarAtendimento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPacienteId || !dataHora) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione o paciente e horário.',
        variant: 'destructive',
      })
      return
    }

    const pac = pacientes.find((p) => p.id === selectedPacienteId)
    if (!pac) return

    // Saldo check for APP or APP_AV
    if (
      (tipo === 'Aplicacao_APP' || tipo === 'Aplicacao_APP_AV') &&
      (pac.aplicacoes_restantes || 0) <= 0
    ) {
      const confirmar = window.confirm(
        'Paciente sem pacote com aplicações restantes. Deseja criar mesmo assim?',
      )
      if (!confirmar) return
    }

    setIsSubmitting(true)
    try {
      await atendimentosService.create({
        paciente_id: pac.id,
        tipo,
        profissional,
        data_hora: new Date(dataHora).toISOString(),
        status: 'Agendado',
        observacoes,
      })

      // Disparar lembrete de agendamento automático
      const horaFormatada = new Date(dataHora).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      if (tipo === 'Aplicacao_APP') {
        await dispatchAutomacao('Lembrete de aplicação APP', pac, { hora: horaFormatada })
      } else if (tipo === 'Aplicacao_APP_AV') {
        await dispatchAutomacao('Lembrete de aplicação APP+AV', pac, { hora: horaFormatada })
      } else if (tipo === 'Retorno') {
        await dispatchAutomacao('Lembrete de retorno', pac)
      }

      toast({ title: 'Atendimento agendado!', description: 'Horário reservado com sucesso.' })
      setModalNovo(false)
      setSelectedPacienteId('')
      setDataHora('')
      setObservacoes('')
      fetchData()
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível agendar.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Agenda Médica & Aplicações
          </h1>
          <p className="text-sm text-[#667C78]">
            Controle de consultas, infusões intravenosas e retornos da clínica.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternância Mensal / Semanal */}
          <div className="bg-white border border-[#E3E7E5] p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'month' ? 'bg-[#166A5A] text-white' : 'text-[#667C78]'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'week' ? 'bg-[#166A5A] text-white' : 'text-[#667C78]'
              }`}
            >
              Semanal
            </button>
          </div>

          <Button
            onClick={() => setModalNovo(true)}
            className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Novo Atendimento
          </Button>
        </div>
      </div>

      {/* Main Grid: Calendário (8 cols) + Próximos 7 Dias (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendário Principal (8 colunas) */}
        <Card className="lg:col-span-8 rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-6 space-y-4">
          {/* Navegação de Mês */}
          <div className="flex items-center justify-between pb-2 border-b border-[#E3E7E5]">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#1C2B29]">
                {monthNames[month]} {year}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="rounded-lg text-xs h-7 px-2.5 font-medium border-[#E3E7E5]"
              >
                Hoje
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                className="h-8 w-8 rounded-lg border-[#E3E7E5]"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="h-8 w-8 rounded-lg border-[#E3E7E5]"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Grade Mensal */}
          {viewMode === 'month' ? (
            <div className="space-y-1">
              {/* Cabeçalho dias da semana */}
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-[#667C78] py-2">
                <span>Dom</span>
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
              </div>

              {/* Grade de dias */}
              <div className="grid grid-cols-7 gap-1.5">
                {daysArray.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="h-24 bg-gray-50/40 rounded-xl" />
                  }

                  const dayAtendimentos = getAtendimentosForDay(day)
                  const isToday =
                    now.getDate() === day && now.getMonth() === month && now.getFullYear() === year

                  return (
                    <div
                      key={`day-${day}`}
                      onClick={() => {
                        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T10:00`
                        setDataHora(dStr)
                        setModalNovo(true)
                      }}
                      className={`h-24 p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:border-[#166A5A] hover:bg-[#E2F0EB]/20 ${
                        isToday
                          ? 'bg-[#E2F0EB]/30 border-[#166A5A] shadow-xs'
                          : 'border-[#E3E7E5]/70 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isToday
                              ? 'h-5 w-5 rounded-full bg-[#166A5A] text-white flex items-center justify-center'
                              : 'text-[#1C2B29]'
                          }`}
                        >
                          {day}
                        </span>
                        {dayAtendimentos.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#FBF3D9] text-[#A5831D] rounded-full">
                            {dayAtendimentos.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 overflow-hidden">
                        {dayAtendimentos.slice(0, 2).map((a) => (
                          <div
                            key={a.id}
                            className="truncate text-[10px] px-1 py-0.5 rounded bg-white border border-[#E3E7E5] text-[#1C2B29] font-medium"
                            title={`${a.expand?.paciente_id?.nome}: ${a.tipo}`}
                          >
                            {a.tipo.includes('APP') ? '💉' : '🩺'}{' '}
                            {a.expand?.paciente_id?.nome?.split(' ')[0]}
                          </div>
                        ))}
                        {dayAtendimentos.length > 2 && (
                          <span className="text-[9px] text-[#667C78] block font-medium">
                            +{dayAtendimentos.length - 2} mais
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            // Visualização Semanal Resumida
            <div className="space-y-3 py-2">
              <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-[#667C78]">
                Visualização semanal detalhada de horários e salas
              </div>
              <div className="divide-y divide-[#E3E7E5]">
                {proximos7Dias.map((at) => (
                  <div key={at.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#1C2B29]">
                        {at.expand?.paciente_id?.nome || 'Paciente'}
                      </p>
                      <p className="text-xs text-[#667C78]">
                        {at.tipo.replace('_', ' ')} • {at.profissional}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {new Date(at.data_hora).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Lateral: Próximos 7 Dias (4 colunas) */}
        <Card className="lg:col-span-4 rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-6 space-y-4">
          <div>
            <CardTitle className="text-base font-bold text-[#1C2B29]">Próximos 7 Dias</CardTitle>
            <CardDescription className="text-xs text-[#667C78]">
              Agendamentos imediatos no radar da clínica
            </CardDescription>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {proximos7Dias.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#667C78]">
                Nenhum atendimento agendado para os próximos 7 dias.
              </div>
            ) : (
              proximos7Dias.map((at) => (
                <div
                  key={at.id}
                  onClick={() => navigate(`/pacientes/${at.paciente_id}`)}
                  className="p-3.5 rounded-xl border border-[#E3E7E5] bg-[#F7F6F3]/50 hover:bg-[#E2F0EB]/40 cursor-pointer transition-colors space-y-1.5 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#166A5A] group-hover:underline">
                      {at.tipo.replace('_', ' ')}
                    </span>
                    <Badge className="text-[10px] bg-white border border-[#E3E7E5] text-[#1C2B29]">
                      {new Date(at.data_hora).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </Badge>
                  </div>

                  <p className="text-sm font-semibold text-[#1C2B29]">
                    {at.expand?.paciente_id?.nome || 'Paciente'}
                  </p>

                  <div className="flex items-center justify-between text-xs text-[#667C78]">
                    <span>{at.profissional || 'Equipe Médica'}</span>
                    <span className="font-medium text-[#1C2B29]">
                      {new Date(at.data_hora).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Modal Novo Atendimento */}
      <Dialog open={modalNovo} onOpenChange={setModalNovo}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">Novo Atendimento</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCriarAtendimento} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Paciente</Label>
              <Select value={selectedPacienteId} onValueChange={setSelectedPacienteId}>
                <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                  <SelectValue placeholder="Selecione um paciente..." />
                </SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} — {p.telefone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Tipo de Atendimento</Label>
              <Select value={tipo} onValueChange={(v: TipoAtendimento) => setTipo(v)}>
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
              <Label className="text-xs font-semibold text-[#1C2B29]">
                Profissional Responsável
              </Label>
              <Input
                value={profissional}
                onChange={(e) => setProfissional(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Data e Hora</Label>
              <Input
                type="datetime-local"
                required
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Observações Clínicas</Label>
              <Textarea
                placeholder="Orientações de preparo, dosagem ou histórico..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalNovo(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
              >
                {isSubmitting ? 'Salvando...' : 'Confirmar Agendamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
