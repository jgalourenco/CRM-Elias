import React from 'react'
import { AlertaInterno } from '@/hooks/useAlertaInternoConsulta'
import { Atendimento } from '@/types/crm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { BellRing, Phone, X } from 'lucide-react'

interface Props {
  alertas: AlertaInterno[]
  onDispensar: (atendimentoId: string, dataHora: string) => void
  onConfirmarTelefone: (atendimento: Atendimento) => void
  /** Ação extra ao clicar no alerta (ex.: navegar para a agenda) */
  onVerAgenda?: () => void
}

export default function BannerAlertaInterno({
  alertas,
  onDispensar,
  onConfirmarTelefone,
  onVerAgenda,
}: Props) {
  if (alertas.length === 0) return null

  return (
    <div className="space-y-2">
      {alertas.map((al) => (
        <div
          key={al.atendimento.id}
          className={cn(
            'rounded-2xl border-2 border-amber-300 bg-amber-50 shadow-sm p-4',
            'flex flex-col sm:flex-row sm:items-center gap-3 animate-pulse-border',
          )}
        >
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <BellRing className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-[#1C2B29]">
                {al.pacienteNome} previsto para {al.horario} ainda não chegou
              </p>
              <Badge className="bg-amber-200 text-amber-900 text-[10px] font-bold gap-0.5">
                <BellRing className="h-2.5 w-2.5" />
                Interno
              </Badge>
              {al.minutosRestantes > 0 ? (
                <Badge className="bg-white text-amber-800 border border-amber-300 text-[10px]">
                  faltam {al.minutosRestantes} min
                </Badge>
              ) : (
                <Badge className="bg-white text-red-700 border border-red-300 text-[10px]">
                  horário passou
                </Badge>
              )}
            </div>
            <p className="text-xs text-[#667C78] mt-0.5">
              Ligar e confirmar presença
              {al.pacienteTelefone ? ` — ${al.pacienteTelefone}` : ''}.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onVerAgenda && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onVerAgenda}
                className="text-xs font-semibold text-[#667C78] hover:text-[#166A5A] hover:bg-white rounded-xl"
              >
                Ver agenda
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => onConfirmarTelefone(al.atendimento)}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold gap-1.5"
            >
              <Phone className="h-3.5 w-3.5" />
              Ligar e confirmar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDispensar(al.atendimento.id, al.atendimento.data_hora)}
              className="text-[#667C78] hover:bg-white rounded-xl"
              title="Dispensar alerta"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
