import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { parametrosService, registrarAuditoria } from '@/services/crm'

export interface CorStatus {
  nome: string
  cor: string
}
export type MapaCoresAgenda = Record<string, CorStatus>

export const STATUS_ORDEM = [
  'Agendado',
  'Confirmado',
  'Chegou',
  'Em_atendimento',
  'Realizado',
  'No_show',
  'Cancelado',
] as const

export const CORES_AGENDA_PADRAO: MapaCoresAgenda = {
  Agendado: { nome: 'Agendado', cor: '#2E7FA3' },
  Confirmado: { nome: 'Confirmado', cor: '#166A5A' },
  Chegou: { nome: 'Compareceu', cor: '#C9A227' },
  Em_atendimento: { nome: 'Iniciado atendimento', cor: '#7C3AED' },
  Realizado: { nome: 'Realizado', cor: '#16A34A' },
  No_show: { nome: 'Não compareceu', cor: '#C0392B' },
  Cancelado: { nome: 'Desmarcado', cor: '#9AA8A5' },
}

function mesclar(salvo: Partial<MapaCoresAgenda> | null): MapaCoresAgenda {
  const out: MapaCoresAgenda = {}
  for (const k of STATUS_ORDEM) {
    const s = salvo?.[k]
    out[k] = {
      nome: s?.nome?.trim() ? s.nome : CORES_AGENDA_PADRAO[k].nome,
      cor: s?.cor && /^#[0-9a-fA-F]{6}$/.test(s.cor) ? s.cor : CORES_AGENDA_PADRAO[k].cor,
    }
  }
  return out
}

/** Retorna o mapa de cores/nomes dos status da agenda, com fallback ao padrão. */
export function useCoresAgenda(): MapaCoresAgenda {
  const [mapa, setMapa] = useState<MapaCoresAgenda>(CORES_AGENDA_PADRAO)
  useEffect(() => {
    let ativo = true
    parametrosService
      .get<MapaCoresAgenda>('cores_agenda')
      .then((v) => {
        if (ativo && v) setMapa(mesclar(v))
      })
      .catch(() => {
        /* mantém o padrão */
      })
    return () => {
      ativo = false
    }
  }, [])
  return mapa
}

export default function CoresAgenda() {
  const { toast } = useToast()
  const [mapa, setMapa] = useState<MapaCoresAgenda>(CORES_AGENDA_PADRAO)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const v = await parametrosService.get<MapaCoresAgenda>('cores_agenda')
        if (ativo) setMapa(mesclar(v))
      } catch {
        if (ativo)
          toast({
            title: 'Erro ao carregar',
            description: 'Não foi possível carregar as cores da agenda.',
            variant: 'destructive',
          })
      } finally {
        if (ativo) setLoading(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [toast])

  const alterar = (k: string, parcial: Partial<CorStatus>) =>
    setMapa((m) => ({ ...m, [k]: { ...m[k], ...parcial } }))

  const restaurar = () => {
    setMapa(CORES_AGENDA_PADRAO)
    toast({
      title: 'Padrão restaurado',
      description: 'Clique em Salvar para aplicar as cores padrão.',
    })
  }

  const salvar = async () => {
    if (STATUS_ORDEM.some((k) => !mapa[k].nome.trim())) {
      toast({
        title: 'Nome obrigatório',
        description: 'Todos os status precisam de um nome exibido.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      await parametrosService.set<MapaCoresAgenda>('cores_agenda', mapa)
      await registrarAuditoria('Cores da Agenda', 'Editar', 'Cores dos status da agenda atualizadas')
      toast({ title: 'Cores salvas', description: 'As cores da agenda foram atualizadas.' })
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as cores.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/config"
            className="inline-flex items-center gap-1 text-xs text-[#667C78] hover:text-[#166A5A]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Configurações
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Cores da Agenda
          </h1>
          <p className="text-sm text-[#667C78]">Nome exibido e cor de cada status de atendimento.</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={restaurar}
            className="rounded-xl text-xs gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar padrão
          </Button>
          <Button
            type="button"
            onClick={salvar}
            disabled={salvando || loading}
            className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Save className="h-4 w-4" />
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-[#E3E7E5]">
        <CardHeader>
          <CardTitle className="text-base text-[#1C2B29]">Status do atendimento</CardTitle>
          <CardDescription className="text-xs text-[#667C78]">
            A prévia mostra como o status aparecerá na agenda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="py-8 text-center text-xs text-[#667C78]">
              <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
              Carregando...
            </div>
          ) : (
            STATUS_ORDEM.map((k) => (
              <div
                key={k}
                className="grid grid-cols-1 sm:grid-cols-[140px_1fr_80px_180px] items-center gap-3 rounded-xl border border-[#E3E7E5] p-3"
              >
                <span className="text-xs font-semibold text-[#667C78]">{k.replace('_', ' ')}</span>
                <div>
                  <Label htmlFor={`nome-${k}`} className="sr-only">
                    Nome exibido de {k}
                  </Label>
                  <Input
                    id={`nome-${k}`}
                    value={mapa[k].nome}
                    onChange={(e) => alterar(k, { nome: e.target.value })}
                    className="rounded-xl border-[#E3E7E5]"
                  />
                </div>
                <div>
                  <Label htmlFor={`cor-${k}`} className="sr-only">
                    Cor de {k}
                  </Label>
                  <input
                    id={`cor-${k}`}
                    type="color"
                    value={mapa[k].cor}
                    onChange={(e) => alterar(k, { cor: e.target.value })}
                    className="h-9 w-14 cursor-pointer rounded-lg border border-[#E3E7E5] bg-white p-1"
                  />
                </div>
                <span
                  className="inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold text-white truncate"
                  style={{ backgroundColor: mapa[k].cor }}
                >
                  {mapa[k].nome || '—'}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
