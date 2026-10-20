import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { iaExtratoService, parametrosService, registrarAuditoria } from '@/services/crm'
import type { IaExtrato } from '@/types/crm'

interface IntegracaoDef {
  id: string
  nome: string
  descricao: string
}

const INTEGRACOES: IntegracaoDef[] = [
  {
    id: 'stone_pagarme',
    nome: 'Stone / Pagar.me',
    descricao: 'Recebimentos por cartão e conciliação de vendas com a adquirente.',
  },
  {
    id: 'memed',
    nome: 'Memed',
    descricao: 'Receituário eletrônico com prescrição digital e assinatura.',
  },
  {
    id: 'tiss',
    nome: 'Guia TISS',
    descricao: 'Geração e envio de guias TISS para convênios e operadoras.',
  },
  {
    id: 'nota_fiscal',
    nome: 'Nota Fiscal',
    descricao: 'Emissão de notas fiscais de serviço a partir das faturas.',
  },
  {
    id: 'whatsapp_waba',
    nome: 'WhatsApp Business (Meta/Waba)',
    descricao: 'Envio de mensagens e lembretes pela API oficial do WhatsApp Business.',
  },
  {
    id: 'rd_station',
    nome: 'RD Station',
    descricao: 'Sincronização de contatos e oportunidades com a plataforma de marketing.',
  },
  {
    id: 'inbody',
    nome: 'InBody',
    descricao: 'Importação de resultados de bioimpedância para o prontuário.',
  },
  {
    id: 'medbot_ia',
    nome: 'MEDBOT / IA R1',
    descricao: 'Assistente de inteligência artificial para apoio clínico e administrativo.',
  },
]

type MapaIntegracoes = Record<string, { habilitada: boolean }>

const formatarData = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR')
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

function AbaIntegracoes() {
  const { toast } = useToast()
  const [mapa, setMapa] = useState<MapaIntegracoes>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const v = await parametrosService.get<MapaIntegracoes>('integracoes')
        if (ativo && v) setMapa(v)
      } catch {
        if (ativo)
          toast({
            title: 'Erro ao carregar',
            description: 'Não foi possível carregar as integrações.',
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

  const alternar = async (def: IntegracaoDef, habilitada: boolean) => {
    const anterior = mapa
    const novo = { ...mapa, [def.id]: { habilitada } }
    setMapa(novo)
    setSalvando(def.id)
    try {
      await parametrosService.set<MapaIntegracoes>('integracoes', novo)
      await registrarAuditoria(
        'Integrações e Mensagens',
        'Editar',
        `${def.nome}: ${habilitada ? 'habilitada' : 'desabilitada'} para uso futuro`,
      )
    } catch {
      setMapa(anterior)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível registrar a preferência.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(null)
    }
  }

  return (
    <div className="space-y-4">
      <div
        role="note"
        className="flex items-start gap-2 rounded-xl border border-[#C9A227]/40 bg-[#FBF3D9]/60 p-3 text-xs text-[#1C2B29]"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-[#C9A227] mt-0.5" />
        <p>
          Chaves de API devem ser configuradas no servidor; esta tela apenas registra a intenção de
          uso. Nenhum token ou segredo é armazenado aqui e nenhuma chamada externa é feita.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#667C78]">
          <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
          Carregando...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INTEGRACOES.map((i) => {
            const habilitada = mapa[i.id]?.habilitada === true
            return (
              <Card key={i.id} className="rounded-2xl border-[#E3E7E5] bg-white">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#1C2B29]">{i.nome}</h3>
                    <Badge variant="outline" className="text-[11px] text-[#667C78] shrink-0">
                      Não configurada
                    </Badge>
                  </div>
                  <p className="text-xs text-[#667C78]">{i.descricao}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      id={`int-${i.id}`}
                      checked={habilitada}
                      disabled={salvando === i.id}
                      onCheckedChange={(v) => alternar(i, v)}
                    />
                    <Label htmlFor={`int-${i.id}`} className="text-xs font-semibold text-[#1C2B29]">
                      Habilitar quando disponível
                    </Label>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AbaExtratoIA() {
  const { toast } = useToast()
  const [itens, setItens] = useState<IaExtrato[]>([])
  const [loading, setLoading] = useState(true)
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [aplicado, setAplicado] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      setItens(await iaExtratoService.list(aplicado))
    } catch {
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar o extrato de uso da IA.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [aplicado, toast])

  useEffect(() => {
    carregar()
  }, [carregar])

  const filtrar = (e: React.FormEvent) => {
    e.preventDefault()
    if (de && ate && de > ate) {
      toast({
        title: 'Período inválido',
        description: 'A data inicial deve ser anterior à final.',
        variant: 'destructive',
      })
      return
    }
    const partes: string[] = []
    if (de) partes.push(`data >= "${esc(de)} 00:00:00"`)
    if (ate) partes.push(`data <= "${esc(ate)} 23:59:59"`)
    setAplicado(partes.join(' && '))
  }

  return (
    <div className="space-y-4">
      <form onSubmit={filtrar} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ia-de" className="text-xs font-semibold text-[#1C2B29]">
            De
          </Label>
          <Input
            id="ia-de"
            type="date"
            value={de}
            onChange={(e) => setDe(e.target.value)}
            className="rounded-xl border-[#E3E7E5]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ia-ate" className="text-xs font-semibold text-[#1C2B29]">
            Até
          </Label>
          <Input
            id="ia-ate"
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
            className="rounded-xl border-[#E3E7E5]"
          />
        </div>
        <Button type="submit" className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs">
          Filtrar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDe('')
            setAte('')
            setAplicado('')
          }}
          className="rounded-xl text-xs"
        >
          Limpar
        </Button>
      </form>

      <div className="rounded-xl border border-[#E3E7E5] bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {['Data', 'Área', 'Pergunta', 'Resposta'].map((h) => (
                <TableHead key={h} className="text-xs font-semibold text-[#1C2B29]">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-xs text-[#667C78]">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                  Carregando...
                </TableCell>
              </TableRow>
            ) : itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-xs text-[#667C78]">
                  Nenhum dado disponível
                </TableCell>
              </TableRow>
            ) : (
              itens.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-sm whitespace-nowrap">{formatarData(i.data)}</TableCell>
                  <TableCell className="text-sm">{i.area || '—'}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate" title={i.pergunta}>
                    {i.pergunta || '—'}
                  </TableCell>
                  <TableCell className="text-sm max-w-md truncate" title={i.resposta}>
                    {i.resposta || '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default function Integracoes() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          to="/config"
          className="inline-flex items-center gap-1 text-xs text-[#667C78] hover:text-[#166A5A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Configurações
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
          Integrações e Mensagens
        </h1>
        <p className="text-sm text-[#667C78]">
          Contratos de integração previstos e extrato de uso da inteligência artificial.
        </p>
      </div>

      <Tabs defaultValue="integracoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
          <TabsTrigger value="extrato">Extrato de uso da IA</TabsTrigger>
        </TabsList>
        <TabsContent value="integracoes">
          <AbaIntegracoes />
        </TabsContent>
        <TabsContent value="extrato">
          <AbaExtratoIA />
        </TabsContent>
      </Tabs>
    </div>
  )
}
