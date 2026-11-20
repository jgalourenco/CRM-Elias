import { useCallback, useEffect, useRef, useState } from 'react'
import { atendimentosService, dispatchAutomacao } from '@/services/crm'
import { Atendimento, Paciente } from '@/types/crm'

/**
 * Alerta interno D-0: 5 minutos antes de atendimentos de HOJE sem chegada registrada.
 * Verifica a cada ~30s, toca som (Web Audio) e não re-dispara o mesmo atendimento
 * após dispensado (persistido em localStorage).
 */

export interface AlertaInterno {
  atendimento: Atendimento
  pacienteNome: string
  pacienteTelefone?: string
  minutosRestantes: number
  horario: string
}

/** Status que já indicam chegada/resolução — não geram alerta */
const STATUS_RESOLVIDOS: string[] = [
  'Chegou',
  'Em_atendimento',
  'Realizado',
  'Cancelado',
  'No_show',
]

const JANELA_MINUTOS = 5
const TOLERANCIA_PASSOU_MIN = 2
const DISMISS_KEY = 'alerta_interno_dispensados'

function lerDispensados(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}')
  } catch {
    return {}
  }
}

function chaveAlerta(atendimentoId: string, dataHora: string) {
  const d = new Date(dataHora)
  return `${atendimentoId}_${d.toDateString()}`
}

export function useAlertaInternoConsulta() {
  const [alertas, setAlertas] = useState<AlertaInterno[]>([])
  const [dispensados, setDispensados] = useState<Record<string, string>>(() => lerDispensados())
  const disparouSomRef = useRef<Set<string>>(new Set())
  const alertouBancoRef = useRef<Set<string>>(new Set())
  const dispensadosRef = useRef<Record<string, string>>(dispensados)

  useEffect(() => {
    dispensadosRef.current = dispensados
  }, [dispensados])

  const tocarAlertaSonoro = useCallback(() => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const beeps = [0, 350, 700, 1050]
      beeps.forEach((delay) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 880
        const t = ctx.currentTime + delay / 1000
        gain.gain.setValueAtTime(0.0001, t)
        gain.gain.exponentialRampToValueAtTime(0.3, t + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.35)
      })
      setTimeout(() => ctx.close().catch(() => {}), 1800)
    } catch {
      /* som indisponível no navegador — alerta permanece visual */
    }
  }, [])

  const checar = useCallback(async () => {
    let agendamentos: Atendimento[]
    try {
      agendamentos = await atendimentosService.list('', 'data_hora')
    } catch {
      return
    }

    const agora = new Date()
    const inicio = new Date(agora.getTime() - TOLERANCIA_PASSOU_MIN * 60000)
    const fim = new Date(agora.getTime() + JANELA_MINUTOS * 60000)

    const ativos: AlertaInterno[] = []
    for (const at of agendamentos) {
      const dh = new Date(at.data_hora)
      if (dh < inicio || dh > fim) continue
      if (STATUS_RESOLVIDOS.includes(at.status)) continue
      if (dispensadosRef.current[chaveAlerta(at.id, at.data_hora)]) continue

      const pac = (at.expand?.paciente_id as Paciente | undefined) || undefined
      const diffMin = Math.round((dh.getTime() - agora.getTime()) / 60000)

      ativos.push({
        atendimento: at,
        pacienteNome: pac?.nome || 'Paciente',
        pacienteTelefone: pac?.telefone,
        minutosRestantes: diffMin,
        horario: dh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      })

      // Disparo da automação interna no banco (uma vez por atendimento/janela)
      if (!alertouBancoRef.current.has(at.id) && pac) {
        alertouBancoRef.current.add(at.id)
        dispatchAutomacao('Alerta interno — paciente não chegou (5 min antes)', pac, {
          hora: dh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          data: dh.toLocaleDateString('pt-BR'),
        })
      }
    }

    const novos = ativos.filter((a) => !disparouSomRef.current.has(a.atendimento.id))
    if (novos.length > 0) {
      novos.forEach((a) => disparouSomRef.current.add(a.atendimento.id))
      tocarAlertaSonoro()
    }

    setAlertas((prev) => {
      const ids = new Set(ativos.map((a) => a.atendimento.id))
      const mantidos = prev.filter((p) => ids.has(p.atendimento.id))
      const idsMantidos = new Set(mantidos.map((p) => p.atendimento.id))
      return [...mantidos, ...ativos.filter((a) => !idsMantidos.has(a.atendimento.id))]
    })
  }, [tocarAlertaSonoro])

  useEffect(() => {
    checar()
    const interval = setInterval(checar, 30000)
    return () => clearInterval(interval)
  }, [checar])

  const dispensar = useCallback((atendimentoId: string, dataHora: string) => {
    const key = chaveAlerta(atendimentoId, dataHora)
    setDispensados((prev) => {
      const next = { ...prev, [key]: new Date().toISOString() }
      try {
        localStorage.setItem(DISMISS_KEY, JSON.stringify(next))
      } catch {
        /* storage cheio/indisponível */
      }
      return next
    })
    setAlertas((prev) => prev.filter((a) => a.atendimento.id !== atendimentoId))
  }, [])

  /** Ação "ligar e confirmar": marca presença confirmada por telefone e dispensa o alerta */
  const confirmarPorTelefone = useCallback(
    async (atendimento: Atendimento) => {
      try {
        await atendimentosService.update(atendimento.id, { status: 'Confirmado' })
      } catch {
        /* mesmo sem salvar, dispensa o alerta para não incomodar */
      }
      dispensar(atendimento.id, atendimento.data_hora)
    },
    [dispensar],
  )

  return { alertas, dispensar, confirmarPorTelefone }
}
