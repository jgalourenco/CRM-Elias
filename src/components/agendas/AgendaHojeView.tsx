import React from 'react'
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
  Eye,
  Check,
  XCircle,
  Play,
  UserCheck,
  Stethoscope,
  Activity,
  FileText,
  DollarSign,
} from 'lucide-react'

interface AgendaHojeProps {
  atendimentos: Atendimento[]
  onNovoAtendimento?: () => void
  onMudarStatus?: (id: string, status: StatusAtendimento) => void
  onIniciarConsulta?: (atendimento: Atendimento) => void
  showNovoButton?: boolean
  className?: string
  compact?: boolean
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
 * Cores de status no padrão MedX + identidade Clínica Seleta
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
        color: '#2E7FA3', // Azul Seleta
        badgeBg: 'bg-sky-50',
        badgeText: 'text-[#2E7FA3]',
        badgeBorder: 'border-sky-200',
        icon: <Clock className="h-3 w-3 mr-1" />,
      }
    case 'Confirmado':
      return {
        label: 'Confirmado',
        color: '#C9A227', // Dourado Seleta
        badgeBg: 'bg-amber-50',
        badgeText: 'text-[#A5831D]',
        badgeBorder: 'border-amber-200',
        icon: <UserCheck className="h-3 w-3 mr-1" />,
      }
    case 'Chegou':
      return {
        label: 'Chegou na Clínica',
        color: '#0D9488', // Teal vibrante
        badgeBg: 'bg-teal-50',
        badgeText: 'text-teal-700',
        badgeBorder: 'border-teal-200',
        icon: <Activity className="h-3 w-3 mr-1" />,
      }
    case 'Em_atendimento':
      return {
        label: 'Em Atendimento',
        color: '#166A5A', // Verde Seleta principal
        badgeBg: 'bg-emerald-100',
        badgeText: 'text-[#166A5A]',
        badgeBorder: 'border-[#166A5A]/40',
        icon: <Stethoscope className="h-3 w-3 mr-1 animate-pulse" />,
      }
    case 'Realizado':
      return {
        label: 'Atendido',
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
  onMudarStatus,
  onIniciarConsulta,
  showNovoButton = true,
  className = '',
  compact = false,
}: AgendaHojeProps) {
  const navigate = useNavigate()
  const now = new Date()

  // Filtrar atendimentos de hoje em ordem cronológica
  const hojeAtendimentos = atendimentos
    .filter((a) => isSameDay(new Date(a.data_hora), now))
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())

  // Contadores
  const concluidosCount = hojeAtendimentos.filter((a) => a.status === 'Realizado').length
  const emAndamentoCount = hojeAtendimentos.filter((a) => a.status === 'Em_atendimento').length
  const agendadosRestantesCount = hojeAtendimentos.filter(
    (a) => a.status !== 'Realizado' && a.status !== 'Cancelado' && a.status !== 'No_show',
  ).length

  const dataHojeFormatada = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

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

  return (
    <Card
      className={`rounded-2xl border-[#E3E7E5] bg-white shadow-xs overflow-hidden ${className}`}
    >
      {/* Header do Card Hoje */}
      <CardHeader className="p-5 pb-4 border-b border-[#E3E7E5]/70 bg-gradient-to-r from-[#166A5A]/5 via-white to-[#C9A227]/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#166A5A] animate-pulse" />
              <CardTitle className="text-lg font-bold text-[#1C2B29] flex items-center gap-2">
                Atendimentos de Hoje
                <Badge className="bg-[#166A5A] text-white hover:bg-[#166A5A] text-xs font-semibold px-2 py-0.5">
                  Hoje
                </Badge>
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-[#667C78] capitalize">
              {dataHojeFormatada}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hojeAtendimentos.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-[#667C78] bg-white px-3 py-1.5 rounded-xl border border-[#E3E7E5]">
                <span className="font-semibold text-[#166A5A]">{hojeAtendimentos.length}</span>
                <span>total</span>
                {emAndamentoCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-amber-600 animate-pulse">
                      {emAndamentoCount} em consulta
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="font-semibold text-[#2E8B57]">{concluidosCount}</span>
                <span>atendidos</span>
                <span>•</span>
                <span className="font-semibold text-[#2E7FA3]">{agendadosRestantesCount}</span>
                <span>pendentes</span>
              </div>
            )}

            {showNovoButton && onNovoAtendimento && (
              <Button
                size="sm"
                onClick={onNovoAtendimento}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Agendar Hoje
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {hojeAtendimentos.length === 0 ? (
          /* Estado Vazio Amigável */
          <div className="py-12 px-6 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#1C2B29]">
                Nenhum atendimento agendado para o dia de hoje
              </h4>
              <p className="text-xs text-[#667C78] max-w-md mx-auto">
                A agenda de hoje está livre. Você pode registrar novas consultas, retornos ou
                aplicações de protocolo injetável a qualquer momento.
              </p>
            </div>
            {showNovoButton && onNovoAtendimento && (
              <div className="pt-2">
                <Button
                  onClick={onNovoAtendimento}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-[#166A5A] text-[#166A5A] hover:bg-[#E2F0EB] text-xs font-semibold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agendar Primeiro Atendimento de Hoje
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Lista Cronológica com Borda Lateral Direita Colorida MedX */
          <div className="divide-y divide-[#E3E7E5]/70">
            {hojeAtendimentos.map((at) => {
              const atDate = new Date(at.data_hora)
              const isPast = atDate < now
              const pac = at.expand?.paciente_id
              const statusCfg = getStatusConfig(at.status)

              // Estados visuais
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
                : 'CS'

              return (
                <div
                  key={at.id}
                  onClick={() => at.paciente_id && navigate(`/pacientes/${at.paciente_id}`)}
                  style={{
                    borderRightWidth: '8px',
                    borderRightColor: statusCfg.color,
                  }}
                  className={`p-4 transition-all group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isRealizado
                      ? 'bg-slate-50/70 opacity-70 hover:opacity-100 hover:bg-slate-100/80'
                      : isEmAtendimento
                        ? 'bg-emerald-50/70 border-l-4 border-l-[#166A5A] ring-1 ring-emerald-200'
                        : at.status === 'Chegou'
                          ? 'bg-teal-50/50 border-l-4 border-l-teal-500'
                          : isPast && at.status === 'Agendado'
                            ? 'bg-amber-50/40 hover:bg-amber-50/60 border-l-4 border-l-amber-400'
                            : 'bg-white hover:bg-[#F7F6F3]/70'
                  }`}
                >
                  {/* Horário + Avatar + Detalhes do Paciente */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    {/* Badge Horário */}
                    <div className="flex flex-col items-center justify-center min-w-[66px] px-2.5 py-1.5 rounded-xl bg-white border border-[#E3E7E5] shadow-2xs text-center shrink-0">
                      <span className="text-xs font-bold text-[#1C2B29]">
                        {formatHora(at.data_hora)}
                      </span>
                      <span className="text-[10px] text-[#667C78] font-medium flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {isRealizado
                          ? 'atendido'
                          : isEmAtendimento
                            ? 'em curso'
                            : at.status === 'Chegou'
                              ? 'na recepção'
                              : isPast
                                ? 'atrasado'
                                : 'previsto'}
                      </span>
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-10 w-10 border border-[#E3E7E5] shrink-0">
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

                    {/* Dados Paciente & Procedimento */}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={`font-semibold text-sm truncate transition-colors ${
                            isRealizado
                              ? 'text-slate-600 line-through decoration-slate-400'
                              : 'text-[#1C2B29] group-hover:text-[#166A5A]'
                          }`}
                        >
                          {pac?.nome || 'Paciente sem identificação'}
                        </p>

                        {/* Rótulo textual do status com badge configurada */}
                        {getStatusBadge(at.status)}

                        {pac?.convenio && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-[#166A5A] border-[#166A5A]/30 bg-emerald-50/50"
                          >
                            {pac.convenio}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#667C78] flex-wrap">
                        <span className="font-medium text-[#1C2B29] flex items-center gap-1">
                          <span>{getTipoIcon(at.tipo)}</span>
                          {getTipoLabel(at.tipo)}
                        </span>
                        <span>•</span>
                        <span>{at.profissional || 'Equipe Médica'}</span>
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
                            <span className="text-teal-700 font-medium">
                              Chegou às {formatHora(at.hora_chegada)}
                            </span>
                          </>
                        )}
                        {at.hora_inicio_atendimento && (
                          <>
                            <span>•</span>
                            <span className="text-[#166A5A] font-medium">
                              Iniciou às {formatHora(at.hora_inicio_atendimento)}
                            </span>
                          </>
                        )}
                      </div>

                      {at.observacoes && (
                        <p className="text-[11px] text-[#667C78] italic truncate max-w-lg mt-0.5">
                          "{at.observacoes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas + Botão "Iniciar consulta" */}
                  <div
                    className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E3E7E5]/50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Botão INICIAR CONSULTA (estilo MedX): visível apenas se ainda não atendido e tem paciente */}
                    {podeIniciarConsulta && (
                      <Button
                        size="sm"
                        onClick={() => handleIniciarConsulta(at)}
                        className={`${
                          isEmAtendimento
                            ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                            : 'bg-[#166A5A] hover:bg-[#0F5145] text-white shadow-xs'
                        } h-8 rounded-xl text-xs font-semibold px-3 gap-1.5`}
                        title={
                          isEmAtendimento
                            ? 'Consulta em andamento — ir para prontuário'
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

                    {/* Ações de status adicionais (Chegou / Concluir / No-show) */}
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
                            <span className="hidden md:inline">Chegou</span>
                          </Button>
                        )}

                        {at.status !== 'Realizado' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onMudarStatus(at.id, 'Realizado')}
                            title="Marcar como Concluído / Atendido"
                            className="h-8 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 rounded-lg px-2.5 gap-1 font-semibold"
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
                            <span className="hidden md:inline">No-show</span>
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Atalhos padrão MedX: Contato / Prontuário */}
                    {at.paciente_id && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/pacientes/${at.paciente_id}?tab=visao-geral`)}
                          className="h-8 w-8 text-[#667C78] hover:text-[#166A5A] hover:bg-[#E2F0EB] rounded-lg"
                          title="Abrir Prontuário / Ficha"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/pacientes/${at.paciente_id}?tab=faturamento`)}
                          className="h-8 w-8 text-[#667C78] hover:text-[#C9A227] hover:bg-amber-50 rounded-lg"
                          title="Abrir Faturamento do Paciente"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
