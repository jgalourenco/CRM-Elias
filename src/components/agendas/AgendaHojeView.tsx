import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Atendimento, TipoAtendimento, StatusAtendimento } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Phone,
  Check,
  XCircle,
  Play,
  UserCheck,
  Stethoscope,
  Activity,
  FileText,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Edit3,
} from 'lucide-react'

export interface AgendaHojeProps {
  atendimentos: Atendimento[]
  onNovoAtendimento?: (dataHoraSugerida?: string) => void
  onEditarAtendimento?: (atendimento: Atendimento) => void
  onMudarStatus?: (id: string, status: StatusAtendimento) => void
  onIniciarConsulta?: (atendimento: Atendimento) => void
  showNovoButton?: boolean
  className?: string
  compact?: boolean
  initialDate?: Date
  title?: string
}

export function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

export function formatHora(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function getTipoLabel(tipo: TipoAtendimento) {
  switch (tipo) {
    case 'Consulta':
      return 'Consulta Integrativa'
    case 'Retorno':
      return 'Retorno'
    case 'Aplicacao_APP':
      return 'Aplicação APP'
    case 'Aplicacao_APP_AV':
      return 'Aplicação APP + AV'
    case 'Aplicacao_Manipulado':
      return 'Aplicação Manipulado'
    case 'Outro':
      return 'Outro Procedimento'
    default:
      return tipo
  }
}

export function getTipoIcon(tipo: TipoAtendimento) {
  if (tipo.includes('APP') || tipo.includes('Manipulado')) {
    return '💉'
  }
  return '🩺'
}

/**
 * Cores de status no padrão MedX + identidade Clínica Elias Mansur
 * Cada status ganha cor de borda lateral direita (border-r-8) e badge textual
 */
export interface StatusConfig {
  label: string
  color: string // CSS border color
  badgeBg: string
  badgeText: string
  badgeBorder: string
  icon: React.ReactNode
}

export function getStatusConfig(status: StatusAtendimento): StatusConfig {
  switch (status) {
    case 'Agendado':
      return {
        label: 'Agendado',
        color: '#2E7FA3', // Azul
        badgeBg: 'bg-sky-50',
        badgeText: 'text-[#2E7FA3]',
        badgeBorder: 'border-sky-200',
        icon: <Clock className="h-3 w-3 mr-1" />,
      }
    case 'Confirmado':
      return {
        label: 'Confirmado',
        color: '#C9A227', // Dourado
        badgeBg: 'bg-amber-50',
        badgeText: 'text-[#A5831D]',
        badgeBorder: 'border-amber-200',
        icon: <UserCheck className="h-3 w-3 mr-1" />,
      }
    case 'Chegou':
      return {
        label: 'Chegou na Recepção',
        color: '#0D9488', // Teal
        badgeBg: 'bg-teal-50',
        badgeText: 'text-teal-700',
        badgeBorder: 'border-teal-200',
        icon: <Activity className="h-3 w-3 mr-1" />,
      }
    case 'Em_atendimento':
      return {
        label: 'Em Atendimento',
        color: '#166A5A', // Verde principal
        badgeBg: 'bg-emerald-100',
        badgeText: 'text-[#166A5A]',
        badgeBorder: 'border-[#166A5A]/40',
        icon: <Stethoscope className="h-3 w-3 mr-1 animate-pulse" />,
      }
    case 'Realizado':
      return {
        label: 'Já Foi Atendido',
        color: '#94A3B8', // Slate / esmaecido
        badgeBg: 'bg-slate-100',
        badgeText: 'text-slate-600',
        badgeBorder: 'border-slate-300',
        icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
      }
    case 'No_show':
      return {
        label: 'Não Compareceu (No-show)',
        color: '#E11D48', // Vermelho
        badgeBg: 'bg-rose-50',
        badgeText: 'text-rose-700',
        badgeBorder: 'border-rose-200',
        icon: <AlertCircle className="h-3 w-3 mr-1" />,
      }
    case 'Cancelado':
      return {
        label: 'Cancelado',
        color: '#CBD5E1', // Cinza claro
        badgeBg: 'bg-gray-100',
        badgeText: 'text-gray-500',
        badgeBorder: 'border-gray-200',
        icon: <XCircle className="h-3 w-3 mr-1" />,
      }
    default:
      return {
        label: status,
        color: '#667C78',
        badgeBg: 'bg-gray-50',
        badgeText: 'text-gray-700',
        badgeBorder: 'border-gray-200',
        icon: <Clock className="h-3 w-3 mr-1" />,
      }
  }
}

export function getStatusBadge(status: StatusAtendimento) {
  const cfg = getStatusConfig(status)
  return (
    <Badge
      className={`${cfg.badgeBg} ${cfg.badgeText} border ${cfg.badgeBorder} text-[11px] font-semibold hover:${cfg.badgeBg} transition-colors`}
    >
      {cfg.icon}
      {cfg.label}
    </Badge>
  )
}

export default function AgendaHojeView({
  atendimentos,
  onNovoAtendimento,
  onEditarAtendimento,
  onMudarStatus,
  onIniciarConsulta,
  showNovoButton = true,
  className = '',
  compact = false,
  initialDate,
  title = 'Agenda Diária — Hora a Hora',
}: AgendaHojeProps) {
  const navigate = useNavigate()

  // Dia ativo selecionado na visualização diária
  const [dataSelecionada, setDataSelecionada] = useState<Date>(() => {
    return initialDate ? new Date(initialDate) : new Date()
  })

  // Intervalo configurável: 60 minutos (1h) ou 30 minutos (estilo MedX)
  const [intervaloMinutos, setIntervaloMinutos] = useState<30 | 60>(60)

  // Expediente padrão da clínica: 07:00 até 20:00
  const horaInicioExpediente = 7
  const horaFimExpediente = 20

  const now = new Date()
  const isSelectedToday = isSameDay(dataSelecionada, now)

  // Navegação dia anterior / próximo / hoje
  const handlePrevDay = () => {
    setDataSelecionada((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 1)
      return d
    })
  }

  const handleNextDay = () => {
    setDataSelecionada((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 1)
      return d
    })
  }

  const handleGoToday = () => {
    setDataSelecionada(new Date())
  }

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return
    const [y, m, d] = e.target.value.split('-').map(Number)
    setDataSelecionada(new Date(y, m - 1, d, 12, 0, 0))
  }

  // Filtrar atendimentos do dia selecionado
  const atendimentosDoDia = atendimentos
    .filter((a) => isSameDay(new Date(a.data_hora), dataSelecionada))
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())

  // Contadores do dia selecionado
  const concluidosCount = atendimentosDoDia.filter((a) => a.status === 'Realizado').length
  const emAndamentoCount = atendimentosDoDia.filter((a) => a.status === 'Em_atendimento').length
  const agendadosRestantesCount = atendimentosDoDia.filter(
    (a) => a.status !== 'Realizado' && a.status !== 'Cancelado' && a.status !== 'No_show',
  ).length

  const dataFormatadaExtenso = dataSelecionada.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const dataInputValue = `${dataSelecionada.getFullYear()}-${String(
    dataSelecionada.getMonth() + 1,
  ).padStart(2, '0')}-${String(dataSelecionada.getDate()).padStart(2, '0')}`

  // Ação de Iniciar Consulta: marca Em_atendimento e navega para prontuário em modo atendimento
  const handleIniciarConsulta = (at: Atendimento) => {
    if (onIniciarConsulta) {
      onIniciarConsulta(at)
    } else {
      if (onMudarStatus) {
        onMudarStatus(at.id, 'Em_atendimento')
      }
      if (at.paciente_id) {
        navigate(`/pacientes/${at.paciente_id}?modo=atendimento&atendimentoId=${at.id}`)
      }
    }
  }

  // Geração dos slots de horário
  const slots: Array<{
    horaLabel: string
    horaStartMin: number // minutos desde meia-noite
    horaEndMin: number
    horaString: string // HH:mm
    isoStringParaNovo: string // YYYY-MM-DDTHH:mm
  }> = []

  const step = intervaloMinutos
  const totalMinutosInicio = horaInicioExpediente * 60
  const totalMinutosFim = horaFimExpediente * 60

  for (let m = totalMinutosInicio; m < totalMinutosFim; m += step) {
    const h = Math.floor(m / 60)
    const min = m % 60
    const horaStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`

    const nextM = m + step
    const nextH = Math.floor(nextM / 60)
    const nextMin = nextM % 60
    const nextHoraStr = `${String(nextH).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`

    const isoStr = `${dataInputValue}T${horaStr}`

    slots.push({
      horaLabel: `${horaStr} - ${nextHoraStr}`,
      horaStartMin: m,
      horaEndMin: nextM,
      horaString: horaStr,
      isoStringParaNovo: isoStr,
    })
  }

  // Mapear atendimentos para cada slot
  // Um atendimento cai no slot se seu horário em minutos estiver dentro de [slot.horaStartMin, slot.horaEndMin)
  const getAtendimentosDoSlot = (slotStart: number, slotEnd: number) => {
    return atendimentosDoDia.filter((at) => {
      const d = new Date(at.data_hora)
      const atMin = d.getHours() * 60 + d.getMinutes()
      return atMin >= slotStart && atMin < slotEnd
    })
  }

  // Atendimentos fora do expediente regular (ex: antes das 07h ou depois das 20h)
  const atendimentosForaExpediente = atendimentosDoDia.filter((at) => {
    const d = new Date(at.data_hora)
    const atMin = d.getHours() * 60 + d.getMinutes()
    return atMin < totalMinutosInicio || atMin >= totalMinutosFim
  })

  return (
    <Card
      className={`rounded-2xl border-[#E3E7E5] bg-white shadow-xs overflow-hidden ${className}`}
    >
      {/* Header com Navegação Diária dia a dia + Seletor + Botão Hoje */}
      <CardHeader className="p-4 sm:p-5 pb-4 border-b border-[#E3E7E5]/70 bg-gradient-to-r from-[#166A5A]/5 via-white to-[#C9A227]/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Título + data por extenso */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isSelectedToday ? 'bg-[#166A5A] animate-pulse' : 'bg-slate-400'
                }`}
              />
              <CardTitle className="text-base sm:text-lg font-bold text-[#1C2B29] flex items-center gap-2">
                {title}
                {isSelectedToday ? (
                  <Badge className="bg-[#166A5A] text-white hover:bg-[#166A5A] text-xs font-semibold px-2 py-0.5">
                    Hoje
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[#166A5A] border-[#166A5A]/40 text-xs font-medium"
                  >
                    Dia Selecionado
                  </Badge>
                )}
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-[#667C78] capitalize">
              {dataFormatadaExtenso}
            </CardDescription>
          </div>

          {/* Barra de Controles: Navegação Dia a Dia + Intervalo + Novo */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Navegador Dia a Dia */}
            <div className="flex items-center bg-white border border-[#E3E7E5] rounded-xl p-1 shadow-2xs">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevDay}
                className="h-8 w-8 rounded-lg text-[#1C2B29] hover:bg-gray-100"
                title="Dia anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant={isSelectedToday ? 'default' : 'ghost'}
                size="sm"
                onClick={handleGoToday}
                className={`h-8 px-2.5 text-xs font-semibold rounded-lg ${
                  isSelectedToday
                    ? 'bg-[#166A5A] text-white hover:bg-[#0F5145]'
                    : 'text-[#166A5A] hover:bg-[#E2F0EB]'
                }`}
              >
                Hoje
              </Button>

              {/* Seletor de Data Nativo Customizado */}
              <div className="relative flex items-center px-1">
                <input
                  type="date"
                  value={dataInputValue}
                  onChange={handleDateInputChange}
                  className="text-xs font-semibold text-[#1C2B29] bg-transparent border-0 py-1 px-1 focus:ring-0 cursor-pointer"
                  title="Escolha uma data específica"
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextDay}
                className="h-8 w-8 rounded-lg text-[#1C2B29] hover:bg-gray-100"
                title="Próximo dia"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Alternância de Intervalo (1h ou 30 min) */}
            <div className="hidden sm:flex items-center bg-gray-100 p-1 rounded-xl text-xs font-medium text-[#667C78]">
              <button
                type="button"
                onClick={() => setIntervaloMinutos(60)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  intervaloMinutos === 60
                    ? 'bg-white text-[#1C2B29] font-bold shadow-2xs'
                    : 'hover:text-[#1C2B29]'
                }`}
                title="Slots de 1 em 1 hora"
              >
                1h
              </button>
              <button
                type="button"
                onClick={() => setIntervaloMinutos(30)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  intervaloMinutos === 30
                    ? 'bg-white text-[#1C2B29] font-bold shadow-2xs'
                    : 'hover:text-[#1C2B29]'
                }`}
                title="Slots de 30 em 30 minutos"
              >
                30m
              </button>
            </div>

            {/* Resumo de Atendimentos */}
            {atendimentosDoDia.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-[#667C78] bg-white px-2.5 py-1.5 rounded-xl border border-[#E3E7E5]">
                <span className="font-bold text-[#166A5A]">{atendimentosDoDia.length}</span>
                <span className="hidden md:inline">total</span>
                {emAndamentoCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-amber-600 animate-pulse">
                      {emAndamentoCount} em consulta
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="font-semibold text-emerald-700">{concluidosCount}</span>
                <span className="hidden md:inline">atendidos</span>
                <span>•</span>
                <span className="font-semibold text-[#2E7FA3]">{agendadosRestantesCount}</span>
                <span className="hidden md:inline">pendentes</span>
              </div>
            )}

            {/* Botão Novo Atendimento */}
            {showNovoButton && onNovoAtendimento && (
              <Button
                size="sm"
                onClick={() => onNovoAtendimento(`${dataInputValue}T10:00`)}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Novo</span> Agendamento
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Atendimentos fora do expediente regular (se houver algum cadastrado bem cedo ou tarde) */}
        {atendimentosForaExpediente.length > 0 && (
          <div className="p-3 bg-amber-50/70 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              {atendimentosForaExpediente.length} atendimento(s) fora do horário regular (antes das{' '}
              {horaInicioExpediente}h ou após as {horaFimExpediente}h)
            </span>
          </div>
        )}

        {/* Grade Diária Hora a Hora */}
        <div className="divide-y divide-[#E3E7E5]/70">
          {slots.map((slot) => {
            const atsNoSlot = getAtendimentosDoSlot(slot.horaStartMin, slot.horaEndMin)
            const hasAts = atsNoSlot.length > 0

            // Verifica se a hora atual do dia de hoje está dentro deste slot
            const isCurrentSlot =
              isSelectedToday &&
              now.getHours() * 60 + now.getMinutes() >= slot.horaStartMin &&
              now.getHours() * 60 + now.getMinutes() < slot.horaEndMin

            return (
              <div
                key={slot.horaString}
                className={`flex flex-col sm:flex-row items-stretch transition-colors ${
                  isCurrentSlot
                    ? 'bg-amber-50/30'
                    : hasAts
                      ? 'bg-white'
                      : 'bg-white hover:bg-slate-50/50'
                }`}
              >
                {/* Coluna do Horário (Linha / Cabeçalho da hora) */}
                <div
                  className={`sm:w-28 sm:min-w-[110px] p-2.5 sm:p-3 sm:border-r border-b sm:border-b-0 border-[#E3E7E5]/70 flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-1 shrink-0 ${
                    isCurrentSlot ? 'bg-amber-100/60 font-bold' : 'bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Clock
                      className={`h-3.5 w-3.5 ${
                        isCurrentSlot ? 'text-amber-700 animate-pulse' : 'text-[#667C78]'
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        isCurrentSlot ? 'text-amber-900 font-extrabold' : 'text-[#1C2B29] font-bold'
                      }`}
                    >
                      {slot.horaString}
                    </span>
                  </div>

                  <span className="text-[10px] text-[#667C78]">
                    {intervaloMinutos === 60 ? 'slot de 1h' : 'slot de 30m'}
                  </span>

                  {isCurrentSlot && (
                    <Badge className="bg-amber-600 text-white text-[9px] px-1 py-0 h-4 uppercase">
                      Agora
                    </Badge>
                  )}
                </div>

                {/* Coluna dos Cards de Agendamento ou Slot Vazio */}
                <div className="flex-1 p-2 sm:p-3 min-w-0">
                  {hasAts ? (
                    <div className="space-y-2">
                      {atsNoSlot.map((at) => {
                        const atDate = new Date(at.data_hora)
                        const isPast = isSelectedToday && atDate < now
                        const pac = at.expand?.paciente_id
                        const statusCfg = getStatusConfig(at.status)

                        const isRealizado = at.status === 'Realizado'
                        const isEmAtendimento = at.status === 'Em_atendimento'
                        const isPendente =
                          !isRealizado && at.status !== 'Cancelado' && at.status !== 'No_show'
                        const podeIniciarConsulta = isPendente && !!at.paciente_id

                        const initials = pac?.nome
                          ? pac.nome
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()
                          : 'EM'

                        return (
                          <div
                            key={at.id}
                            onClick={() => {
                              if (onEditarAtendimento) {
                                onEditarAtendimento(at)
                              } else if (at.paciente_id) {
                                navigate(`/pacientes/${at.paciente_id}`)
                              }
                            }}
                            style={{
                              borderRightWidth: '8px',
                              borderRightColor: statusCfg.color,
                            }}
                            className={`p-3.5 rounded-xl border border-[#E3E7E5] transition-all cursor-pointer group shadow-2xs hover:shadow-sm ${
                              isRealizado
                                ? 'bg-slate-50/70 opacity-75 hover:opacity-100 hover:bg-slate-100/90'
                                : isEmAtendimento
                                  ? 'bg-emerald-50/80 border-l-4 border-l-[#166A5A] ring-1 ring-emerald-200'
                                  : at.status === 'Chegou'
                                    ? 'bg-teal-50/60 border-l-4 border-l-teal-500'
                                    : isPast && at.status === 'Agendado'
                                      ? 'bg-amber-50/50 hover:bg-amber-50/80 border-l-4 border-l-amber-400'
                                      : 'bg-white hover:bg-[#F7F6F3]'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              {/* Identificação do Paciente */}
                              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                <Avatar className="h-9 w-9 border border-[#E3E7E5] shrink-0">
                                  <AvatarFallback
                                    className={`${
                                      isRealizado
                                        ? 'bg-slate-200 text-slate-600'
                                        : isEmAtendimento
                                          ? 'bg-[#166A5A] text-white animate-pulse'
                                          : 'bg-[#166A5A]/10 text-[#166A5A]'
                                    } font-bold text-xs`}
                                  >
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-xs px-2 py-0.5 bg-white border border-[#E3E7E5] rounded-md text-[#1C2B29]">
                                      {formatHora(at.data_hora)}
                                    </span>

                                    <p
                                      className={`font-semibold text-sm truncate transition-colors ${
                                        isRealizado
                                          ? 'text-slate-600 line-through decoration-slate-400'
                                          : 'text-[#1C2B29] group-hover:text-[#166A5A]'
                                      }`}
                                    >
                                      {pac?.nome || 'Paciente sem identificação'}
                                    </p>

                                    {/* Badge textual do Status colorido */}
                                    {getStatusBadge(at.status)}

                                    {pac?.convenio && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] text-[#166A5A] border-[#166A5A]/30 bg-emerald-50/50"
                                      >
                                        {pac.convenio}
                                      </Badge>
                                    )}

                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] text-[#667C78] bg-gray-100 flex items-center gap-1"
                                      title="Clique para editar este agendamento"
                                    >
                                      <Edit3 className="h-2.5 w-2.5" />
                                      Editar
                                    </Badge>
                                  </div>

                                  <div className="flex items-center gap-2 text-xs text-[#667C78] flex-wrap">
                                    <span className="font-medium text-[#1C2B29] flex items-center gap-1">
                                      <span>{getTipoIcon(at.tipo)}</span>
                                      {getTipoLabel(at.tipo)}
                                    </span>
                                    <span>•</span>
                                    <span>{at.profissional || 'Dr. Elias Mansur'}</span>

                                    {pac?.telefone && (
                                      <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {pac.telefone}
                                        </span>
                                      </>
                                    )}

                                    {at.hora_chegada && (
                                      <>
                                        <span>•</span>
                                        <span className="text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.2 rounded">
                                          Chegou às {formatHora(at.hora_chegada)}
                                        </span>
                                      </>
                                    )}

                                    {at.hora_inicio_atendimento && (
                                      <>
                                        <span>•</span>
                                        <span className="text-[#166A5A] font-semibold bg-emerald-50 px-1.5 py-0.2 rounded">
                                          Iniciou às {formatHora(at.hora_inicio_atendimento)}
                                        </span>
                                      </>
                                    )}

                                    {at.hora_fim_atendimento && (
                                      <>
                                        <span>•</span>
                                        <span className="text-slate-600 font-medium">
                                          Finalizado às {formatHora(at.hora_fim_atendimento)}
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  {at.observacoes && (
                                    <p className="text-[11px] text-[#667C78] italic truncate max-w-xl mt-0.5">
                                      "{at.observacoes}"
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Ações Rápidas do Card */}
                              <div
                                className="flex items-center justify-end gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E3E7E5]/50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {podeIniciarConsulta && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleIniciarConsulta(at)}
                                    className={`${
                                      isEmAtendimento
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                                        : 'bg-[#166A5A] hover:bg-[#0F5145] text-white shadow-xs'
                                    } h-8 rounded-xl text-xs font-semibold px-2.5 gap-1.5`}
                                    title={
                                      isEmAtendimento
                                        ? 'Consulta em andamento — abrir prontuário'
                                        : 'Iniciar consulta e abrir prontuário'
                                    }
                                  >
                                    {isEmAtendimento ? (
                                      <>
                                        <Stethoscope className="h-3.5 w-3.5" />
                                        <span>Em Consulta</span>
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-3.5 w-3.5 fill-current" />
                                        <span>Iniciar consulta</span>
                                      </>
                                    )}
                                  </Button>
                                )}

                                {onMudarStatus && (
                                  <div className="flex items-center gap-1">
                                    {at.status === 'Agendado' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onMudarStatus(at.id, 'Chegou')}
                                        title="Marcar chegada na recepção"
                                        className="h-8 text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200 rounded-lg px-2 gap-1 font-medium"
                                      >
                                        <Activity className="h-3.5 w-3.5" />
                                        <span>Chegou</span>
                                      </Button>
                                    )}

                                    {at.status !== 'Realizado' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onMudarStatus(at.id, 'Realizado')}
                                        title="Marcar como Concluído / Atendido"
                                        className="h-8 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 rounded-lg px-2 gap-1 font-semibold"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Concluir</span>
                                      </Button>
                                    )}

                                    {at.status !== 'Realizado' && at.status !== 'No_show' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onMudarStatus(at.id, 'No_show')}
                                        title="Marcar No-show (Não compareceu)"
                                        className="h-8 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 rounded-lg px-2"
                                      >
                                        <XCircle className="h-3.5 w-3.5" />
                                        <span className="hidden lg:inline">No-show</span>
                                      </Button>
                                    )}
                                  </div>
                                )}

                                {/* Atalho Ficha / Prontuário */}
                                {at.paciente_id && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => navigate(`/pacientes/${at.paciente_id}`)}
                                    className="h-8 w-8 text-[#667C78] hover:text-[#166A5A] hover:bg-[#E2F0EB] rounded-lg"
                                    title="Abrir Ficha Clínica do Paciente"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                )}

                                {/* Botão Editar explícito */}
                                {onEditarAtendimento && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => onEditarAtendimento(at)}
                                    className="h-8 w-8 text-[#667C78] hover:text-[#1C2B29] hover:bg-gray-100 rounded-lg"
                                    title="Editar compromisso"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    /* Slot Vazio: amigável e clicável para agendar diretamente naquele horário */
                    <div
                      onClick={() => onNovoAtendimento && onNovoAtendimento(slot.isoStringParaNovo)}
                      className="group flex items-center justify-between p-2.5 rounded-xl border border-dashed border-[#E3E7E5] hover:border-[#166A5A]/50 hover:bg-[#E2F0EB]/20 transition-all cursor-pointer text-xs text-[#667C78]"
                      title={`Clique para agendar às ${slot.horaString}`}
                    >
                      <span className="font-normal flex items-center gap-1.5 text-slate-400 group-hover:text-[#166A5A]">
                        <span>Horário livre ({slot.horaString})</span>
                      </span>

                      {onNovoAtendimento && (
                        <span className="text-[11px] font-semibold text-[#166A5A] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <Plus className="h-3 w-3" />
                          Agendar às {slot.horaString}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
