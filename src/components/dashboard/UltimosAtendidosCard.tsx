import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Atendimento } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  CheckCircle2,
  Calendar,
  FileText,
  DollarSign,
  ChevronRight,
  Clock,
  UserCheck,
} from 'lucide-react'

interface UltimosAtendidosCardProps {
  atendimentos: Atendimento[]
  className?: string
  maxItems?: number
}

export function formatDataHora(iso: string) {
  const d = new Date(iso)
  return {
    data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

export default function UltimosAtendidosCard({
  atendimentos,
  className = '',
  maxItems = 5,
}: UltimosAtendidosCardProps) {
  const navigate = useNavigate()

  // Filtrar apenas Realizados e ordenar pelo mais recente (como MedX: orderBy: '-Ultimo')
  const atendidos = atendimentos
    .filter((a) => a.status === 'Realizado')
    .sort(
      (a, b) =>
        new Date(b.hora_fim_atendimento || b.data_hora).getTime() -
        new Date(a.hora_fim_atendimento || a.data_hora).getTime(),
    )
    .slice(0, maxItems)

  return (
    <Card
      className={`rounded-2xl border-[#E3E7E5] bg-white shadow-xs overflow-hidden ${className}`}
    >
      <CardHeader className="p-5 pb-3 border-b border-[#E3E7E5]/70 flex flex-row items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-[#2E8B57] flex items-center justify-center border border-emerald-200">
              <UserCheck className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-bold text-[#1C2B29]">Últimos Atendidos</CardTitle>
            <Badge className="bg-emerald-50 text-[#2E8B57] border-emerald-200 text-[10px] font-semibold">
              Concluídos
            </Badge>
          </div>
          <CardDescription className="text-xs text-[#667C78]">
            Pacientes que já passaram por consulta ou procedimento recente
          </CardDescription>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/pacientes')}
          className="text-[#166A5A] text-xs font-semibold gap-1 hover:bg-[#E2F0EB]"
        >
          Ver Pacientes
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        {atendidos.length === 0 ? (
          <div className="py-10 px-4 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-[#166A5A] mx-auto opacity-40" />
            <p className="text-xs text-[#667C78]">
              Nenhum atendimento recente marcado como realizado.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E3E7E5]/70">
            {atendidos.map((at) => {
              const pac = at.expand?.paciente_id
              const dt = formatDataHora(at.hora_fim_atendimento || at.data_hora)

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
                  className="p-3.5 hover:bg-[#F7F6F3]/70 cursor-pointer flex items-center justify-between gap-3 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 border border-[#E3E7E5] shrink-0">
                      <AvatarFallback className="bg-[#166A5A]/10 text-[#166A5A] font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1C2B29] group-hover:text-[#166A5A] transition-colors truncate">
                        {pac?.nome || 'Paciente'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#667C78] flex-wrap">
                        <span className="font-medium text-[#1C2B29]">
                          {at.tipo.replace('_', ' ')}
                        </span>
                        <span>•</span>
                        <span>{at.profissional || 'Equipe Médica'}</span>
                        {pac?.convenio && (
                          <>
                            <span>•</span>
                            <span className="text-[#166A5A] font-medium">{pac.convenio}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Data/Hora do último atendimento + Atalhos MedX */}
                  <div
                    className="flex items-center gap-3 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-right">
                      <span className="text-xs font-semibold text-[#1C2B29] block">{dt.data}</span>
                      <span className="text-[11px] text-[#667C78] flex items-center justify-end gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        às {dt.hora}
                      </span>
                    </div>

                    {/* Atalhos para Contato/Prontuário/Fatura */}
                    {at.paciente_id && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/pacientes/${at.paciente_id}?tab=visao-geral`)}
                          className="h-8 w-8 text-[#667C78] hover:text-[#166A5A] hover:bg-[#E2F0EB] rounded-lg"
                          title="Abrir Prontuário"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/pacientes/${at.paciente_id}?tab=faturamento`)}
                          className="h-8 w-8 text-[#667C78] hover:text-[#C9A227] hover:bg-amber-50 rounded-lg"
                          title="Abrir Fatura"
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
