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
  User,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  Phone,
  Eye,
  Check,
  XCircle,
} from 'lucide-react'

interface AgendaHojeProps {
  atendimentos: Atendimento[]
  onNovoAtendimento?: () => void
  onMudarStatus?: (id: string, status: StatusAtendimento) => void
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
      return 'Consulta'
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

export function getStatusBadge(status: StatusAtendimento) {
  switch (status) {
    case 'Realizado':
      return (
        <Badge className="bg-emerald-50 text-[#2E8B57] border border-emerald-200 text-[11px] font-semibold hover:bg-emerald-50">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Realizado
        </Badge>
      )
    case 'Agendado':
      return (
        <Badge className="bg-blue-50 text-[#2E7FA3] border border-blue-200 text-[11px] font-semibold hover:bg-blue-50">
          <Clock className="h-3 w-3 mr-1" />
          Agendado
        </Badge>
      )
    case 'No_show':
      return (
        <Badge className="bg-red-50 text-[#C0392B] border border-red-200 text-[11px] font-semibold hover:bg-red-50">
          <AlertCircle className="h-3 w-3 mr-1" />
          No-show
        </Badge>
      )
    case 'Cancelado':
      return (
        <Badge className="bg-gray-100 text-[#667C78] border border-gray-200 text-[11px] font-semibold hover:bg-gray-100">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelado
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function AgendaHojeView({
  atendimentos,
  onNovoAtendimento,
  onMudarStatus,
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

  // Separar em já realizados / passados vs a seguir
  const concluidosCount = hojeAtendimentos.filter((a) => a.status === 'Realizado').length
  const agendadosRestantesCount = hojeAtendimentos.filter(
    (a) => a.status === 'Agendado' && new Date(a.data_hora) >= now,
  ).length

  const dataHojeFormatada = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

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
                Agenda de Hoje
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
                <span>•</span>
                <span className="font-semibold text-[#2E8B57]">{concluidosCount}</span>
                <span>concluídos</span>
                <span>•</span>
                <span className="font-semibold text-[#2E7FA3]">{agendadosRestantesCount}</span>
                <span>a seguir</span>
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
          /* Lista Cronológica */
          <div className="divide-y divide-[#E3E7E5]/70">
            {hojeAtendimentos.map((at, idx) => {
              const atDate = new Date(at.data_hora)
              const isPast = atDate < now
              const isAgendado = at.status === 'Agendado'
              const isProximo = isAgendado && !isPast
              const pac = at.expand?.paciente_id

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
                  className={`p-4 transition-colors group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isProximo
                      ? 'bg-[#E2F0EB]/30 hover:bg-[#E2F0EB]/50 border-l-4 border-l-[#166A5A]'
                      : isPast && isAgendado
                        ? 'bg-amber-50/30 hover:bg-amber-50/50 border-l-4 border-l-amber-400'
                        : at.status === 'Realizado'
                          ? 'bg-white hover:bg-[#F7F6F3]/60 border-l-4 border-l-emerald-500'
                          : 'bg-white hover:bg-[#F7F6F3]/60 border-l-4 border-l-gray-300'
                  }`}
                >
                  {/* Horário + Paciente + Tipo */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Badge Horário */}
                    <div className="flex flex-col items-center justify-center min-w-[62px] px-2.5 py-1.5 rounded-xl bg-white border border-[#E3E7E5] shadow-2xs text-center">
                      <span className="text-xs font-bold text-[#1C2B29]">
                        {formatHora(at.data_hora)}
                      </span>
                      <span className="text-[10px] text-[#667C78] font-medium flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {isPast
                          ? at.status === 'Realizado'
                            ? 'concluído'
                            : 'já passou'
                          : 'a seguir'}
                      </span>
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-10 w-10 border border-[#E3E7E5] shrink-0">
                      <AvatarFallback className="bg-[#166A5A]/10 text-[#166A5A] font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    {/* Detalhes do Paciente & Procedimento */}
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-[#1C2B29] group-hover:text-[#166A5A] transition-colors truncate">
                          {pac?.nome || 'Paciente sem identificação'}
                        </p>
                        {isProximo && (
                          <Badge className="bg-[#166A5A] text-white hover:bg-[#166A5A] text-[10px] px-1.5 py-0">
                            Próximo
                          </Badge>
                        )}
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
                      </div>

                      {at.observacoes && (
                        <p className="text-[11px] text-[#667C78] italic truncate max-w-lg mt-0.5">
                          "{at.observacoes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status & Ações Rápidas */}
                  <div
                    className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E3E7E5]/50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>{getStatusBadge(at.status)}</div>

                    {isAgendado && onMudarStatus && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onMudarStatus(at.id, 'Realizado')}
                          title="Marcar como Realizado"
                          className="h-8 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 rounded-lg px-2.5 gap-1 font-semibold"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Concluir</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onMudarStatus(at.id, 'No_show')}
                          title="Marcar No-show"
                          className="h-8 text-xs bg-red-50 text-red-700 hover:bg-red-100 border-red-200 rounded-lg px-2"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">No-show</span>
                        </Button>
                      </div>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => at.paciente_id && navigate(`/pacientes/${at.paciente_id}`)}
                      className="h-8 w-8 text-[#667C78] hover:text-[#166A5A] hover:bg-[#E2F0EB] rounded-lg"
                      title="Ver Ficha"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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
