import { useCallback, useEffect, useState } from 'react'
import { useCoresAgenda, type MapaCoresAgenda } from '@/pages/config/CoresAgenda'
import { parametrosService, setoresAgendaService, tiposAgendamentoService } from '@/services/crm'
import type { SetorAgenda, TipoAgendamento } from '@/types/crm'
import { HORARIO_AGENDA_PADRAO, normalizarHorario, type HorarioAgenda } from '@/lib/agenda'

interface CacheAgenda {
  tipos: TipoAgendamento[]
  setores: SetorAgenda[]
  horario: HorarioAgenda
}

let cache: CacheAgenda | null = null
let emVoo: Promise<CacheAgenda> | null = null

async function carregar(forcar: boolean): Promise<CacheAgenda> {
  if (!forcar && cache) return cache
  if (!forcar && emVoo) return emVoo
  const p = (async () => {
    const [tipos, setores, horario] = await Promise.all([
      tiposAgendamentoService.list().catch((): TipoAgendamento[] => []),
      setoresAgendaService.list().catch((): SetorAgenda[] => []),
      parametrosService.get<Partial<HorarioAgenda>>('agenda'),
    ])
    cache = { tipos, setores, horario: normalizarHorario(horario) }
    return cache
  })()
  emVoo = p
  try {
    return await p
  } finally {
    if (emVoo === p) emVoo = null
  }
}

export interface AgendaConfig {
  tipos: TipoAgendamento[]
  setores: SetorAgenda[]
  horario: HorarioAgenda
  cores: MapaCoresAgenda
  loading: boolean
  reload: () => Promise<void>
}

/** Cadastros de apoio da agenda (tipos, setores, horário de funcionamento e cores de status). */
export function useAgendaConfig(): AgendaConfig {
  const cores = useCoresAgenda()
  const [dados, setDados] = useState<CacheAgenda>(
    cache ?? { tipos: [], setores: [], horario: HORARIO_AGENDA_PADRAO },
  )
  const [loading, setLoading] = useState(!cache)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setDados(await carregar(true))
    } catch {
      /* mantém o que já estava carregado */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ativo = true
    carregar(false)
      .then((d) => {
        if (ativo) setDados(d)
      })
      .catch(() => {
        /* mantém padrões */
      })
      .finally(() => {
        if (ativo) setLoading(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  return { ...dados, cores, loading, reload }
}
