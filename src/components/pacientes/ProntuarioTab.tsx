import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import pb from '@/lib/pocketbase/client'
import {
  pacientesService,
  evolucoesService,
  documentosPacienteService,
  questionariosApoioService,
  questionariosRespostasService,
  formulariosAnamneseService,
  modelosDocumentosService,
  cabecalhosRodapesService,
  registrarAuditoria,
} from '@/services/crm'
import {
  Paciente,
  EvolucaoProntuario,
  TipoEvolucao,
  DocumentoPaciente,
  TipoDocumentoPaciente,
  QuestionarioApoio,
  PerguntaApoio,
  QuestionarioResposta,
  FormularioAnamnese,
  ModeloDocumento,
  CabecalhoRodape,
} from '@/types/crm'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertTriangle,
  Search,
  FileText,
  Upload,
  Trash2,
  Pencil,
  Download,
  ExternalLink,
  Printer,
  Save,
  Stethoscope,
  Pill,
  Video,
  Bot,
  Sparkles,
  X,
  Check,
} from 'lucide-react'

interface ProntuarioTabProps {
  paciente: Paciente
  onChanged: () => void
  modoAtendimento?: boolean
}

const TIPOS_EVOLUCAO: TipoEvolucao[] = ['Evolução', 'Anamnese', 'Orientação']
const TIPOS_DOCUMENTO: TipoDocumentoPaciente[] = [
  'Receita',
  'Exame',
  'Solicitação',
  'Resultado',
  'Atestado',
  'Outro',
]
const LIMITE_ARQUIVO_MB = 15
const OPCOES_FREQUENCIA = ['Nunca', 'Às vezes', 'Frequentemente', 'Sempre']

const inputCls = 'rounded-xl border-[#E3E7E5] text-xs focus-visible:ring-[#166A5A]'
const labelCls = 'text-xs font-semibold text-[#1C2B29]'
const btnPrimary =
  'bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5'
const triggerCls =
  'rounded-xl text-xs font-semibold data-[state=active]:bg-[#166A5A] data-[state=active]:text-white whitespace-nowrap'

function parseData(s?: string): Date | null {
  if (!s) return null
  const d = new Date(s.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? null : d
}

function fmtData(s?: string): string {
  // datas sem hora (meia-noite UTC) não devem sofrer deslocamento de fuso
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})[ T]00:00:00/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const d = parseData(s)
  return d ? d.toLocaleDateString('pt-BR') : '—'
}

function fmtDataHora(s?: string): string {
  const d = parseData(s)
  return d
    ? `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : '—'
}

function tempoData(s?: string): number {
  return parseData(s)?.getTime() ?? 0
}

function hojeISO(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function msgErro(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function contem(texto: string | undefined, termo: string): boolean {
  return !!texto && texto.toLowerCase().includes(termo)
}

function SecaoVazia({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-8 text-center text-xs text-[#667C78] border border-dashed border-[#E3E7E5] rounded-xl">
      {children}
    </div>
  )
}

function SecaoCarregando() {
  return (
    <div className="flex h-24 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#166A5A] border-t-transparent" />
    </div>
  )
}

function SecaoErro({ mensagem, onRetry }: { mensagem: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-[#C0392B]/30 bg-[#C0392B]/5 p-4 text-xs text-[#C0392B] flex items-center justify-between gap-3">
      <span>{mensagem}</span>
      <Button size="sm" variant="outline" onClick={onRetry} className="rounded-xl text-xs h-7">
        Tentar novamente
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Notas clínicas                                                      */
/* ------------------------------------------------------------------ */

const CAMPOS_NOTAS = [
  { key: 'diagnosticos', label: 'Diagnósticos principais' },
  { key: 'historia_pregressa', label: 'História patológica pregressa' },
  { key: 'medicamentos_em_uso', label: 'Medicamentos em uso' },
  { key: 'alergias_alerta', label: 'Alergias' },
  { key: 'obs_importantes', label: 'Observações importantes' },
] as const

type ChaveNota = (typeof CAMPOS_NOTAS)[number]['key']
type NotasState = Record<ChaveNota, string>

function notasDoPaciente(p: Paciente): NotasState {
  return {
    diagnosticos: p.diagnosticos || '',
    historia_pregressa: p.historia_pregressa || '',
    medicamentos_em_uso: p.medicamentos_em_uso || '',
    alergias_alerta: p.alergias_alerta || '',
    obs_importantes: p.obs_importantes || '',
  }
}

function NotasClinicasSection({
  paciente,
  onChanged,
}: {
  paciente: Paciente
  onChanged: () => void
}) {
  const { toast } = useToast()
  const [notas, setNotas] = useState<NotasState>(() => notasDoPaciente(paciente))
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    setNotas(notasDoPaciente(paciente))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    paciente.id,
    paciente.updated,
    paciente.diagnosticos,
    paciente.historia_pregressa,
    paciente.medicamentos_em_uso,
    paciente.alergias_alerta,
    paciente.obs_importantes,
  ])

  const salvar = async () => {
    setSalvando(true)
    try {
      await pacientesService.update(paciente.id, {
        diagnosticos: notas.diagnosticos.trim(),
        historia_pregressa: notas.historia_pregressa.trim(),
        medicamentos_em_uso: notas.medicamentos_em_uso.trim(),
        alergias_alerta: notas.alergias_alerta.trim(),
        obs_importantes: notas.obs_importantes.trim(),
      })
      await registrarAuditoria(
        'Prontuário',
        'Atualização',
        `Notas clínicas atualizadas — ${paciente.nome}`,
      )
      toast({ title: 'Notas clínicas salvas', description: 'Prontuário atualizado com sucesso.' })
      onChanged()
    } catch (e) {
      toast({
        title: 'Erro ao salvar',
        description: msgErro(e, 'Não foi possível salvar as notas clínicas.'),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-[#1C2B29]">Notas clínicas</CardTitle>
        <CardDescription className="text-xs text-[#667C78]">
          Informações permanentes do paciente. Alergias preenchidas geram alerta no topo da ficha.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CAMPOS_NOTAS.map((c) => (
            <div
              key={c.key}
              className={`space-y-1.5 ${c.key === 'obs_importantes' ? 'md:col-span-2' : ''}`}
            >
              <Label htmlFor={`nota-${c.key}`} className={labelCls}>
                {c.label}
              </Label>
              <Textarea
                id={`nota-${c.key}`}
                rows={3}
                value={notas[c.key]}
                onChange={(e) => setNotas((n) => ({ ...n, [c.key]: e.target.value }))}
                className={inputCls}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={salvar} disabled={salvando} className={btnPrimary}>
            <Save className="h-3.5 w-3.5" />
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Evoluções                                                           */
/* ------------------------------------------------------------------ */

function EvolucoesSection({
  paciente,
  evolucoes,
  busca,
  onReload,
}: {
  paciente: Paciente
  evolucoes: EvolucaoProntuario[]
  busca: string
  onReload: () => void
}) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState<TipoEvolucao>('Evolução')
  const [salvando, setSalvando] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editTexto, setEditTexto] = useState('')
  const [editTipo, setEditTipo] = useState<TipoEvolucao>('Evolução')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [excluir, setExcluir] = useState<EvolucaoProntuario | null>(null)

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return [...evolucoes]
      .filter((e) => !termo || contem(e.texto, termo) || contem(e.tipo, termo))
      .sort((a, b) => tempoData(b.data || b.created) - tempoData(a.data || a.created))
  }, [evolucoes, busca])

  const salvar = async () => {
    if (!texto.trim()) {
      toast({
        title: 'Texto obrigatório',
        description: 'Escreva a evolução antes de salvar.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      await evolucoesService.create({
        paciente_id: paciente.id,
        data: new Date().toISOString(),
        texto: texto.trim(),
        tipo,
        profissional: user?.name || user?.email || 'Profissional',
      })
      await registrarAuditoria('Prontuário', 'Criação', `${tipo} registrada — ${paciente.nome}`)
      toast({ title: 'Salvo no histórico', description: `${tipo} registrada no prontuário.` })
      setTexto('')
      onReload()
    } catch (e) {
      toast({
        title: 'Erro ao salvar',
        description: msgErro(e, 'Não foi possível salvar a evolução.'),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const iniciarEdicao = (ev: EvolucaoProntuario) => {
    setEditId(ev.id)
    setEditTexto(ev.texto || '')
    setEditTipo(ev.tipo || 'Evolução')
  }

  const salvarEdicao = async () => {
    if (!editId) return
    if (!editTexto.trim()) {
      toast({
        title: 'Texto obrigatório',
        description: 'A evolução não pode ficar vazia.',
        variant: 'destructive',
      })
      return
    }
    setSalvandoEdicao(true)
    try {
      await evolucoesService.update(editId, { texto: editTexto.trim(), tipo: editTipo })
      await registrarAuditoria('Prontuário', 'Edição', `Evolução editada — ${paciente.nome}`)
      toast({ title: 'Evolução atualizada' })
      setEditId(null)
      onReload()
    } catch (e) {
      toast({
        title: 'Erro ao atualizar',
        description: msgErro(e, 'Não foi possível atualizar a evolução.'),
        variant: 'destructive',
      })
    } finally {
      setSalvandoEdicao(false)
    }
  }

  const confirmarExclusao = async () => {
    if (!excluir) return
    try {
      await evolucoesService.delete(excluir.id)
      await registrarAuditoria('Prontuário', 'Exclusão', `Evolução excluída — ${paciente.nome}`)
      toast({ title: 'Evolução excluída' })
      onReload()
    } catch (e) {
      toast({
        title: 'Erro ao excluir',
        description: msgErro(e, 'Não foi possível excluir a evolução.'),
        variant: 'destructive',
      })
    } finally {
      setExcluir(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#1C2B29]">Nova evolução</CardTitle>
          <CardDescription className="text-xs text-[#667C78]">
            Profissional: {user?.name || user?.email || '—'} · Data:{' '}
            {fmtData(new Date().toISOString())}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="space-y-1.5 sm:w-52">
              <Label className={labelCls}>Tipo</Label>
              <Select value={tipo} onValueChange={(v: TipoEvolucao) => setTipo(v)}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_EVOLUCAO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea
            rows={5}
            placeholder="Descreva a evolução clínica, conduta, orientações..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            aria-label="Texto da evolução"
            className={inputCls}
          />
          <div className="flex justify-end">
            <Button onClick={salvar} disabled={salvando} className={btnPrimary}>
              <Save className="h-3.5 w-3.5" />
              {salvando ? 'Salvando...' : 'Salvar no histórico'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#1C2B29]">
            Histórico ({lista.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lista.length === 0 ? (
            <SecaoVazia>
              {busca.trim()
                ? 'Nenhuma evolução encontrada para a busca.'
                : 'Nenhuma evolução registrada para este paciente.'}
            </SecaoVazia>
          ) : (
            lista.map((ev) => (
              <div key={ev.id} className="rounded-xl border border-[#E3E7E5] p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-[#667C78]">
                    <Badge className="bg-[#E2F0EB] text-[#166A5A] hover:bg-[#E2F0EB] text-[11px]">
                      {ev.tipo || 'Evolução'}
                    </Badge>
                    <span>{fmtDataHora(ev.data || ev.created)}</span>
                    {ev.profissional && <span>· {ev.profissional}</span>}
                  </div>
                  {editId !== ev.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => iniciarEdicao(ev)}
                        aria-label="Editar evolução"
                        className="h-7 w-7 p-0 text-[#166A5A] hover:bg-[#E2F0EB]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExcluir(ev)}
                        aria-label="Excluir evolução"
                        className="h-7 w-7 p-0 text-[#C0392B] hover:bg-[#C0392B]/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {editId === ev.id ? (
                  <div className="space-y-2">
                    <Select value={editTipo} onValueChange={(v: TipoEvolucao) => setEditTipo(v)}>
                      <SelectTrigger className={`${inputCls} sm:w-52`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_EVOLUCAO.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      rows={5}
                      value={editTexto}
                      onChange={(e) => setEditTexto(e.target.value)}
                      aria-label="Editar texto da evolução"
                      className={inputCls}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditId(null)}
                        className="rounded-xl text-xs gap-1"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={salvarEdicao}
                        disabled={salvandoEdicao}
                        className={btnPrimary}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#1C2B29] whitespace-pre-line leading-relaxed">
                    {ev.texto}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evolução?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o registro do prontuário e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="rounded-xl bg-[#C0392B] hover:bg-[#a53125] text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Documentos                                                          */
/* ------------------------------------------------------------------ */

function DocumentosSection({
  paciente,
  documentos,
  busca,
  onReload,
}: {
  paciente: Paciente
  documentos: DocumentoPaciente[]
  busca: string
  onReload: () => void
}) {
  const { toast } = useToast()
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<TipoDocumentoPaciente>('Exame')
  const [data, setData] = useState(hojeISO())
  const [observacoes, setObservacoes] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [inputKey, setInputKey] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [excluir, setExcluir] = useState<DocumentoPaciente | null>(null)

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return [...documentos]
      .filter(
        (d) =>
          !termo ||
          contem(d.titulo, termo) ||
          contem(d.observacoes, termo) ||
          contem(d.tipo, termo),
      )
      .sort((a, b) => tempoData(b.data || b.created) - tempoData(a.data || a.created))
  }, [documentos, busca])

  const aoEscolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    if (f && f.size > LIMITE_ARQUIVO_MB * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: `O limite é de ${LIMITE_ARQUIVO_MB} MB por arquivo.`,
        variant: 'destructive',
      })
      setArquivo(null)
      setInputKey((k) => k + 1)
      return
    }
    setArquivo(f)
    if (f && !titulo.trim()) setTitulo(f.name.replace(/\.[^.]+$/, ''))
  }

  const enviar = async () => {
    if (!titulo.trim() || !arquivo) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o título e selecione um arquivo.',
        variant: 'destructive',
      })
      return
    }
    if (arquivo.size > LIMITE_ARQUIVO_MB * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: `O limite é de ${LIMITE_ARQUIVO_MB} MB por arquivo.`,
        variant: 'destructive',
      })
      return
    }
    setEnviando(true)
    try {
      const fd = new FormData()
      fd.append('paciente_id', paciente.id)
      fd.append('titulo', titulo.trim())
      fd.append('tipo', tipo)
      fd.append('data', data || hojeISO())
      fd.append('observacoes', observacoes.trim())
      fd.append('arquivo', arquivo)
      await documentosPacienteService.create(fd)
      await registrarAuditoria(
        'Prontuário',
        'Upload',
        `Documento "${titulo.trim()}" anexado — ${paciente.nome}`,
      )
      toast({ title: 'Documento anexado', description: 'Arquivo salvo no prontuário.' })
      setTitulo('')
      setObservacoes('')
      setArquivo(null)
      setInputKey((k) => k + 1)
      onReload()
    } catch (e) {
      toast({
        title: 'Erro no upload',
        description: msgErro(e, 'Não foi possível enviar o arquivo.'),
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  const confirmarExclusao = async () => {
    if (!excluir) return
    try {
      await documentosPacienteService.delete(excluir.id)
      await registrarAuditoria(
        'Prontuário',
        'Exclusão',
        `Documento "${excluir.titulo}" excluído — ${paciente.nome}`,
      )
      toast({ title: 'Documento excluído' })
      onReload()
    } catch (e) {
      toast({
        title: 'Erro ao excluir',
        description: msgErro(e, 'Não foi possível excluir o documento.'),
        variant: 'destructive',
      })
    } finally {
      setExcluir(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#1C2B29]">Adicionar documento</CardTitle>
          <CardDescription className="text-xs text-[#667C78]">
            Exames, receitas, resultados e atestados (máx. {LIMITE_ARQUIVO_MB} MB por arquivo).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="doc-titulo" className={labelCls}>
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="doc-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Hemograma completo"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Tipo</Label>
              <Select value={tipo} onValueChange={(v: TipoDocumentoPaciente) => setTipo(v)}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-data" className={labelCls}>
                Data
              </Label>
              <Input
                id="doc-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="doc-arquivo" className={labelCls}>
                Arquivo <span className="text-red-500">*</span>
              </Label>
              <Input
                key={inputKey}
                id="doc-arquivo"
                type="file"
                onChange={aoEscolherArquivo}
                className={`${inputCls} file:text-xs file:font-semibold file:text-[#166A5A]`}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="doc-obs" className={labelCls}>
                Observações
              </Label>
              <Input
                id="doc-obs"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={enviar} disabled={enviando} className={btnPrimary}>
              <Upload className="h-3.5 w-3.5" />
              {enviando ? 'Enviando...' : 'Anexar documento'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#1C2B29]">
            Documentos ({lista.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {lista.length === 0 ? (
            <SecaoVazia>
              {busca.trim()
                ? 'Nenhum documento encontrado para a busca.'
                : 'Nenhum documento anexado para este paciente.'}
            </SecaoVazia>
          ) : (
            lista.map((d) => {
              const url = d.arquivo ? pb.files.getURL(d, d.arquivo) : ''
              const urlDownload = d.arquivo ? pb.files.getURL(d, d.arquivo, { download: true }) : ''
              return (
                <div
                  key={d.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-[#E3E7E5] p-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#1C2B29] truncate">{d.titulo}</p>
                      <p className="text-[11px] text-[#667C78]">
                        {d.tipo || 'Outro'} · {fmtData(d.data || d.created)}
                        {d.observacoes ? ` · ${d.observacoes}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {url && (
                      <>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-xl text-xs gap-1"
                        >
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Abrir
                          </a>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-xl text-xs gap-1"
                        >
                          <a href={urlDownload} rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5" />
                            Baixar
                          </a>
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExcluir(d)}
                      aria-label="Excluir documento"
                      className="h-7 w-7 p-0 text-[#C0392B] hover:bg-[#C0392B]/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo &quot;{excluir?.titulo}&quot; será removido do prontuário e não poderá ser
              recuperado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="rounded-xl bg-[#C0392B] hover:bg-[#a53125] text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Questionários de apoio                                              */
/* ------------------------------------------------------------------ */

function perguntaAplicavel(p: PerguntaApoio, sexo?: string): boolean {
  if (p.aplicacao === 'Feminino') return sexo === 'Feminino'
  if (p.aplicacao === 'Masculino') return sexo === 'Masculino'
  return true
}

/** Converte a resposta para um valor entre 0 e 1. Texto não pontua. */
function valorNormalizado(p: PerguntaApoio, resp: string | number | undefined): number {
  if (resp === undefined || resp === '') return 0
  const n = Number(resp)
  if (Number.isNaN(n)) return 0
  if (p.tipo === 'Frequência') return Math.min(Math.max(n, 0), 3) / 3
  if (p.tipo === 'Intensidade') return Math.min(Math.max(n, 0), 10) / 10
  if (p.tipo === 'Sim ou Não') return n ? 1 : 0
  return 0
}

function calcularPontuacao(
  perguntas: PerguntaApoio[],
  respostas: Record<string, string | number>,
): number {
  const total = perguntas.reduce(
    (acc, p) => acc + valorNormalizado(p, respostas[p.id]) * (Number(p.peso) || 0),
    0,
  )
  return Math.round(total * 100) / 100
}

function pontuacaoMaxima(perguntas: PerguntaApoio[]): number {
  return perguntas
    .filter((p) => p.tipo !== 'Texto')
    .reduce((acc, p) => acc + (Number(p.peso) || 0), 0)
}

function QuestionariosSection({ paciente }: { paciente: Paciente }) {
  const { toast } = useToast()
  const [questionarios, setQuestionarios] = useState<QuestionarioApoio[]>([])
  const [respostasSalvas, setRespostasSalvas] = useState<QuestionarioResposta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [selecionadoId, setSelecionadoId] = useState('')
  const [respostas, setRespostas] = useState<Record<string, string | number>>({})
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const [qs, rs] = await Promise.all([
        questionariosApoioService.list(),
        questionariosRespostasService.list(`paciente_id = "${paciente.id}"`, '-data'),
      ])
      setQuestionarios(qs.filter((q) => q.ativo !== false))
      setRespostasSalvas(rs)
    } catch (e) {
      setErro(msgErro(e, 'Não foi possível carregar os questionários.'))
    } finally {
      setCarregando(false)
    }
  }, [paciente.id])

  useEffect(() => {
    carregar()
  }, [carregar])

  const questionario = questionarios.find((q) => q.id === selecionadoId)
  const perguntas = useMemo(
    () => (questionario?.perguntas ?? []).filter((p) => perguntaAplicavel(p, paciente.sexo)),
    [questionario, paciente.sexo],
  )
  const pontuacaoAtual = calcularPontuacao(perguntas, respostas)
  const maxima = pontuacaoMaxima(perguntas)

  const setResposta = (id: string, valor: string | number) =>
    setRespostas((r) => ({ ...r, [id]: valor }))

  const escolherQuestionario = (id: string) => {
    setSelecionadoId(id)
    setRespostas({})
  }

  const salvar = async () => {
    if (!questionario) return
    const respondidas = perguntas.filter(
      (p) => respostas[p.id] !== undefined && respostas[p.id] !== '',
    )
    if (respondidas.length === 0) {
      toast({
        title: 'Nenhuma resposta',
        description: 'Responda ao menos uma pergunta antes de salvar.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      await questionariosRespostasService.create({
        paciente_id: paciente.id,
        questionario_id: questionario.id,
        questionario_nome: questionario.nome,
        respostas,
        pontuacao: pontuacaoAtual,
        data: new Date().toISOString(),
      })
      await registrarAuditoria(
        'Prontuário',
        'Questionário',
        `${questionario.nome} respondido (pontuação ${pontuacaoAtual}) — ${paciente.nome}`,
      )
      toast({
        title: 'Respostas salvas',
        description: `Pontuação registrada: ${pontuacaoAtual}.`,
      })
      setRespostas({})
      await carregar()
    } catch (e) {
      toast({
        title: 'Erro ao salvar',
        description: msgErro(e, 'Não foi possível salvar as respostas.'),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const historicoDoSelecionado = useMemo(
    () =>
      respostasSalvas
        .filter((r) => r.questionario_id === selecionadoId)
        .sort((a, b) => tempoData(a.data || a.created) - tempoData(b.data || b.created)),
    [respostasSalvas, selecionadoId],
  )
  const dadosGrafico = historicoDoSelecionado.map((r) => ({
    data: fmtData(r.data || r.created),
    pontuacao: r.pontuacao ?? 0,
  }))

  if (carregando) return <SecaoCarregando />
  if (erro) return <SecaoErro mensagem={erro} onRetry={carregar} />

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#1C2B29]">
            Questionários de apoio
          </CardTitle>
          <CardDescription className="text-xs text-[#667C78]">
            Perguntas filtradas pelo sexo do paciente ({paciente.sexo || 'não informado'}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {questionarios.length === 0 ? (
            <SecaoVazia>Nenhum questionário ativo cadastrado.</SecaoVazia>
          ) : (
            <>
              <div className="space-y-1.5 sm:max-w-sm">
                <Label className={labelCls}>Questionário</Label>
                <Select value={selecionadoId} onValueChange={escolherQuestionario}>
                  <SelectTrigger className={inputCls}>
                    <SelectValue placeholder="Selecione um questionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {questionarios.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {questionario && perguntas.length === 0 && (
                <SecaoVazia>Este questionário não tem perguntas aplicáveis ao paciente.</SecaoVazia>
              )}

              {questionario && perguntas.length > 0 && (
                <div className="space-y-4">
                  {perguntas.map((p, idx) => {
                    const valor = respostas[p.id]
                    return (
                      <div
                        key={p.id}
                        className="rounded-xl border border-[#E3E7E5] p-3.5 space-y-2.5"
                      >
                        <p className="text-xs font-semibold text-[#1C2B29]">
                          {idx + 1}. {p.nome}
                          {p.tipo !== 'Texto' && (
                            <span className="ml-2 font-normal text-[#667C78]">(peso {p.peso})</span>
                          )}
                        </p>
                        {p.tipo === 'Frequência' && (
                          <RadioGroup
                            value={valor === undefined ? '' : String(valor)}
                            onValueChange={(v) => setResposta(p.id, Number(v))}
                            className="flex flex-wrap gap-x-5 gap-y-2"
                            aria-label={p.nome}
                          >
                            {OPCOES_FREQUENCIA.map((o, i) => (
                              <div key={o} className="flex items-center gap-1.5">
                                <RadioGroupItem value={String(i)} id={`q-${p.id}-${i}`} />
                                <Label htmlFor={`q-${p.id}-${i}`} className="text-xs font-normal">
                                  {o}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                        {p.tipo === 'Intensidade' && (
                          <div className="flex items-center gap-4">
                            <Slider
                              min={0}
                              max={10}
                              step={1}
                              value={[typeof valor === 'number' ? valor : 0]}
                              onValueChange={(a) => setResposta(p.id, a[0])}
                              aria-label={p.nome}
                              className="flex-1"
                            />
                            <span className="w-16 text-right text-xs font-semibold text-[#166A5A]">
                              {valor === undefined ? 'sem resp.' : `${valor} / 10`}
                            </span>
                          </div>
                        )}
                        {p.tipo === 'Sim ou Não' && (
                          <RadioGroup
                            value={valor === undefined ? '' : String(valor)}
                            onValueChange={(v) => setResposta(p.id, Number(v))}
                            className="flex gap-5"
                            aria-label={p.nome}
                          >
                            {[
                              { l: 'Sim', v: '1' },
                              { l: 'Não', v: '0' },
                            ].map((o) => (
                              <div key={o.v} className="flex items-center gap-1.5">
                                <RadioGroupItem value={o.v} id={`q-${p.id}-${o.v}`} />
                                <Label htmlFor={`q-${p.id}-${o.v}`} className="text-xs font-normal">
                                  {o.l}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                        {p.tipo === 'Texto' && (
                          <Textarea
                            rows={2}
                            value={typeof valor === 'string' ? valor : ''}
                            onChange={(e) => setResposta(p.id, e.target.value)}
                            aria-label={p.nome}
                            className={inputCls}
                          />
                        )}
                      </div>
                    )
                  })}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#E2F0EB]/60 p-3.5">
                    <p className="text-sm font-bold text-[#166A5A]">
                      Pontuação: {pontuacaoAtual}
                      <span className="font-normal text-[#667C78]"> / {maxima}</span>
                    </p>
                    <Button onClick={salvar} disabled={salvando} className={btnPrimary}>
                      <Save className="h-3.5 w-3.5" />
                      {salvando ? 'Salvando...' : 'Salvar respostas'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {questionario && dadosGrafico.length >= 2 && (
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-[#1C2B29]">
              Evolução da pontuação — {questionario.nome}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGrafico} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3E7E5" />
                  <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#667C78' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#667C78' }} />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="pontuacao"
                    name="Pontuação"
                    stroke="#166A5A"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#166A5A' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#1C2B29]">
            Histórico de respostas ({respostasSalvas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {respostasSalvas.length === 0 ? (
            <SecaoVazia>Nenhum questionário respondido por este paciente.</SecaoVazia>
          ) : (
            respostasSalvas.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E3E7E5] p-3"
              >
                <div>
                  <p className="text-xs font-semibold text-[#1C2B29]">
                    {r.questionario_nome || 'Questionário'}
                  </p>
                  <p className="text-[11px] text-[#667C78]">{fmtDataHora(r.data || r.created)}</p>
                </div>
                <Badge className="bg-[#E2F0EB] text-[#166A5A] hover:bg-[#E2F0EB] text-xs">
                  Pontuação {r.pontuacao ?? 0}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Anamnese por formulário                                             */
/* ------------------------------------------------------------------ */

type RespostaAnamnese = string | string[]

function AnamneseFormularioSection({
  paciente,
  onReload,
}: {
  paciente: Paciente
  onReload: () => void
}) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [formularios, setFormularios] = useState<FormularioAnamnese[]>([])
  const [formId, setFormId] = useState('')
  const [respostas, setRespostas] = useState<Record<string, RespostaAnamnese>>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const lista = (await formulariosAnamneseService.list()).filter((f) => f.ativo !== false)
      setFormularios(lista)
      setFormId((atual) => atual || lista[0]?.id || '')
    } catch (e) {
      setErro(msgErro(e, 'Não foi possível carregar os formulários de anamnese.'))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const formulario = formularios.find((f) => f.id === formId)
  const itens = formulario?.estrutura ?? []

  const setResp = (id: string, v: RespostaAnamnese) => setRespostas((r) => ({ ...r, [id]: v }))

  const alternarCheck = (item: string, opcao: string, marcado: boolean) => {
    const atual = Array.isArray(respostas[item]) ? (respostas[item] as string[]) : []
    setResp(item, marcado ? [...atual, opcao] : atual.filter((o) => o !== opcao))
  }

  const montarTexto = (): string => {
    const linhas: string[] = []
    for (const it of itens) {
      if (it.tipo === 'titulo') {
        linhas.push(`# ${it.rotulo}`)
        continue
      }
      if (it.tipo === 'rotulo') continue
      const r = respostas[it.id]
      const valor = Array.isArray(r) ? r.join(', ') : (r || '').trim()
      if (valor) linhas.push(`${it.rotulo}: ${valor}`)
    }
    // remove títulos que ficaram sem nenhuma resposta depois deles
    return linhas
      .filter((l, i) => !l.startsWith('# ') || (linhas[i + 1] && !linhas[i + 1].startsWith('# ')))
      .join('\n')
  }

  const salvar = async () => {
    if (!formulario) return
    const corpo = montarTexto()
    if (!corpo.replace(/^# .*$/gm, '').trim()) {
      toast({
        title: 'Formulário vazio',
        description: 'Preencha ao menos um campo antes de salvar.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      await evolucoesService.create({
        paciente_id: paciente.id,
        data: new Date().toISOString(),
        tipo: 'Anamnese',
        texto: `${formulario.nome}\n${corpo}`,
        profissional: user?.name || user?.email || 'Profissional',
      })
      await registrarAuditoria(
        'Prontuário',
        'Anamnese',
        `Anamnese "${formulario.nome}" registrada — ${paciente.nome}`,
      )
      toast({ title: 'Anamnese salva', description: 'Registrada no histórico do prontuário.' })
      setRespostas({})
      onReload()
    } catch (e) {
      toast({
        title: 'Erro ao salvar',
        description: msgErro(e, 'Não foi possível salvar a anamnese.'),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <SecaoCarregando />
  if (erro) return <SecaoErro mensagem={erro} onRetry={carregar} />

  return (
    <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-[#1C2B29]">
          Anamnese por formulário
        </CardTitle>
        <CardDescription className="text-xs text-[#667C78]">
          Ao salvar, as respostas são gravadas como uma evolução do tipo Anamnese.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {formularios.length === 0 ? (
          <SecaoVazia>Nenhum formulário de anamnese ativo cadastrado.</SecaoVazia>
        ) : (
          <>
            {formularios.length > 1 && (
              <div className="space-y-1.5 sm:max-w-sm">
                <Label className={labelCls}>Formulário</Label>
                <Select
                  value={formId}
                  onValueChange={(v) => {
                    setFormId(v)
                    setRespostas({})
                  }}
                >
                  <SelectTrigger className={inputCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formularios.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {itens.length === 0 && <SecaoVazia>Este formulário não possui itens.</SecaoVazia>}
            <div className="space-y-4">
              {itens.map((it) => {
                if (it.tipo === 'titulo') {
                  return (
                    <h4
                      key={it.id}
                      className="text-xs font-bold uppercase tracking-wider text-[#166A5A] border-b border-[#E3E7E5] pb-1 pt-2"
                    >
                      {it.rotulo}
                    </h4>
                  )
                }
                if (it.tipo === 'rotulo') {
                  return (
                    <p key={it.id} className="text-xs text-[#667C78]">
                      {it.rotulo}
                    </p>
                  )
                }
                if (it.tipo === 'caixa_texto') {
                  return (
                    <div key={it.id} className="space-y-1.5">
                      <Label htmlFor={`an-${it.id}`} className={labelCls}>
                        {it.rotulo}
                      </Label>
                      <Textarea
                        id={`an-${it.id}`}
                        rows={3}
                        value={
                          typeof respostas[it.id] === 'string' ? (respostas[it.id] as string) : ''
                        }
                        onChange={(e) => setResp(it.id, e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  )
                }
                if (it.tipo === 'painel_check') {
                  const marcados = Array.isArray(respostas[it.id])
                    ? (respostas[it.id] as string[])
                    : []
                  return (
                    <fieldset key={it.id} className="space-y-2">
                      <legend className={labelCls}>{it.rotulo}</legend>
                      <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {(it.opcoes ?? []).map((o, i) => (
                          <div key={`${o}-${i}`} className="flex items-center gap-1.5">
                            <Checkbox
                              id={`an-${it.id}-${i}`}
                              checked={marcados.includes(o)}
                              onCheckedChange={(c) => alternarCheck(it.id, o, c === true)}
                            />
                            <Label htmlFor={`an-${it.id}-${i}`} className="text-xs font-normal">
                              {o}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </fieldset>
                  )
                }
                return (
                  <fieldset key={it.id} className="space-y-2">
                    <legend className={labelCls}>{it.rotulo}</legend>
                    <RadioGroup
                      value={
                        typeof respostas[it.id] === 'string' ? (respostas[it.id] as string) : ''
                      }
                      onValueChange={(v) => setResp(it.id, v)}
                      className="flex flex-wrap gap-x-5 gap-y-2"
                    >
                      {(it.opcoes ?? []).map((o, i) => (
                        <div key={`${o}-${i}`} className="flex items-center gap-1.5">
                          <RadioGroupItem value={o} id={`an-${it.id}-${i}`} />
                          <Label htmlFor={`an-${it.id}-${i}`} className="text-xs font-normal">
                            {o}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </fieldset>
                )
              })}
            </div>
            {itens.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={salvar} disabled={salvando} className={btnPrimary}>
                  <Save className="h-3.5 w-3.5" />
                  {salvando ? 'Salvando...' : 'Salvar anamnese'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Receituário / modelos                                               */
/* ------------------------------------------------------------------ */

function aplicarVariaveis(texto: string, p: Paciente): string {
  const mapa: Record<string, string> = {
    nome: p.nome,
    data: new Date().toLocaleDateString('pt-BR'),
    cpf: p.cpf || '',
    nascimento: p.data_nascimento ? fmtData(p.data_nascimento) : '',
  }
  return texto.replace(/\{(nome|data|cpf|nascimento)\}/gi, (_m, k: string) => mapa[k.toLowerCase()])
}

function ReceituarioSection({ paciente, onReload }: { paciente: Paciente; onReload: () => void }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [modelos, setModelos] = useState<ModeloDocumento[]>([])
  const [cabecalhos, setCabecalhos] = useState<CabecalhoRodape[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [modeloId, setModeloId] = useState('')
  const [texto, setTexto] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const [ms, cs] = await Promise.all([
        modelosDocumentosService.list(),
        cabecalhosRodapesService.list(),
      ])
      setModelos(ms)
      setCabecalhos(cs)
    } catch (e) {
      setErro(msgErro(e, 'Não foi possível carregar os modelos de documentos.'))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const porPasta = useMemo(() => {
    const grupos = new Map<string, ModeloDocumento[]>()
    for (const m of modelos) {
      const pasta = m.pasta?.trim() || 'Sem pasta'
      grupos.set(pasta, [...(grupos.get(pasta) ?? []), m])
    }
    return Array.from(grupos.entries())
  }, [modelos])

  const modelo = modelos.find((m) => m.id === modeloId)
  const cabecalhoPadrao = cabecalhos.find((c) => c.padrao)

  const escolherModelo = (id: string) => {
    setModeloId(id)
    const m = modelos.find((x) => x.id === id)
    setTexto(aplicarVariaveis(m?.conteudo || '', paciente))
  }

  const imprimir = (controlado: boolean) => {
    if (!texto.trim()) {
      toast({
        title: 'Documento vazio',
        description: 'Escolha um modelo ou escreva o texto antes de imprimir.',
        variant: 'destructive',
      })
      return
    }
    const janela = window.open('', '_blank', 'width=820,height=1000')
    if (!janela) {
      toast({
        title: 'Janela bloqueada',
        description: 'Permita pop-ups neste site para imprimir o documento.',
        variant: 'destructive',
      })
      return
    }
    const topo = cabecalhoPadrao?.margem_topo ?? 15
    const base = cabecalhoPadrao?.margem_base ?? 15
    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(modelo?.titulo || 'Documento')} - ${escapeHtml(paciente.nome)}</title>
<style>
  @page { margin: ${Number(topo) || 15}mm 15mm ${Number(base) || 15}mm 15mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 13px; line-height: 1.5; }
  .cabecalho { text-align: center; border-bottom: 1px solid #999; padding-bottom: 8px; margin-bottom: 16px; white-space: pre-line; }
  .rodape { text-align: center; border-top: 1px solid #999; padding-top: 8px; margin-top: 24px; font-size: 11px; white-space: pre-line; }
  .controle { font-weight: bold; text-transform: uppercase; text-align: center; border: 2px solid #111; padding: 6px; margin-bottom: 16px; }
  .corpo { white-space: pre-wrap; }
</style>
</head>
<body>
${cabecalhoPadrao?.cabecalho ? `<div class="cabecalho">${escapeHtml(cabecalhoPadrao.cabecalho)}</div>` : ''}
${controlado ? '<div class="controle">Receita de controle especial</div>' : ''}
<div class="corpo">${escapeHtml(texto)}</div>
${cabecalhoPadrao?.rodape ? `<div class="rodape">${escapeHtml(cabecalhoPadrao.rodape)}</div>` : ''}
</body>
</html>`
    janela.document.open()
    janela.document.write(html)
    janela.document.close()
    janela.focus()
    window.setTimeout(() => janela.print(), 300)
  }

  const salvarNoProntuario = async () => {
    if (!texto.trim()) {
      toast({
        title: 'Documento vazio',
        description: 'Não há texto para salvar no prontuário.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      await evolucoesService.create({
        paciente_id: paciente.id,
        data: new Date().toISOString(),
        tipo: 'Orientação',
        texto: `${modelo?.titulo ? `[${modelo.titulo}]\n` : ''}${texto.trim()}`,
        profissional: user?.name || user?.email || 'Profissional',
      })
      await registrarAuditoria(
        'Prontuário',
        'Documento',
        `Documento "${modelo?.titulo || 'avulso'}" salvo no prontuário — ${paciente.nome}`,
      )
      toast({ title: 'Salvo no prontuário', description: 'Registrado como Orientação.' })
      onReload()
    } catch (e) {
      toast({
        title: 'Erro ao salvar',
        description: msgErro(e, 'Não foi possível salvar no prontuário.'),
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <SecaoCarregando />
  if (erro) return <SecaoErro mensagem={erro} onRetry={carregar} />

  return (
    <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-[#1C2B29]">
          Receituário e documentos
        </CardTitle>
        <CardDescription className="text-xs text-[#667C78]">
          Variáveis disponíveis: {'{nome}'}, {'{data}'}, {'{cpf}'}, {'{nascimento}'}.{' '}
          {cabecalhoPadrao
            ? `Cabeçalho/rodapé padrão: ${cabecalhoPadrao.nome}.`
            : 'Nenhum cabeçalho/rodapé padrão definido.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {modelos.length === 0 ? (
          <SecaoVazia>Nenhum modelo de documento cadastrado.</SecaoVazia>
        ) : (
          <div className="space-y-1.5 sm:max-w-sm">
            <Label className={labelCls}>Modelo</Label>
            <Select value={modeloId} onValueChange={escolherModelo}>
              <SelectTrigger className={inputCls}>
                <SelectValue placeholder="Selecione um modelo" />
              </SelectTrigger>
              <SelectContent>
                {porPasta.map(([pasta, itens]) => (
                  <SelectGroup key={pasta}>
                    <SelectLabel>{pasta}</SelectLabel>
                    {itens.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.titulo}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="rec-texto" className={labelCls}>
            Texto do documento
          </Label>
          <Textarea
            id="rec-texto"
            rows={12}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escolha um modelo ou escreva o documento aqui..."
            className={`${inputCls} font-mono`}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={salvarNoProntuario}
            disabled={salvando}
            className="rounded-xl text-xs font-semibold gap-1.5 border-[#E3E7E5]"
          >
            <Save className="h-3.5 w-3.5" />
            {salvando ? 'Salvando...' : 'Salvar no prontuário'}
          </Button>
          <Button
            variant="outline"
            onClick={() => imprimir(true)}
            className="rounded-xl text-xs font-semibold gap-1.5 border-[#A5831D]/40 text-[#A5831D] bg-[#FBF3D9]/60 hover:bg-[#FBF3D9]"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir controlado
          </Button>
          <Button onClick={() => imprimir(false)} className={btnPrimary}>
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Integrações (somente interface)                                     */
/* ------------------------------------------------------------------ */

function IntegracoesSection() {
  const itens = [
    { label: 'Receituário eletrônico (Memed)', Icon: Pill },
    { label: 'Telemedicina', Icon: Video },
    { label: 'R1 · Agente (IA)', Icon: Bot },
    { label: 'Evolução Inteligente', Icon: Sparkles },
  ]
  return (
    <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-[#1C2B29]">Integrações</CardTitle>
        <CardDescription className="text-xs text-[#667C78]">
          Recursos externos ainda não configurados nesta clínica.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={150}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {itens.map(({ label, Icon }) => (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="block">
                    <Button
                      disabled
                      variant="outline"
                      className="w-full justify-start rounded-xl text-xs font-semibold gap-2 border-[#E3E7E5]"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Integração não configurada</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */

export default function ProntuarioTab({
  paciente,
  onChanged,
  modoAtendimento,
}: ProntuarioTabProps) {
  const [evolucoes, setEvolucoes] = useState<EvolucaoProntuario[]>([])
  const [documentos, setDocumentos] = useState<DocumentoPaciente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [subAba, setSubAba] = useState(modoAtendimento ? 'evolucoes' : 'notas')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const [evs, docs] = await Promise.all([
        evolucoesService.list(`paciente_id = "${paciente.id}"`, '-data'),
        documentosPacienteService.list(`paciente_id = "${paciente.id}"`, '-data'),
      ])
      setEvolucoes(evs)
      setDocumentos(docs)
    } catch (e) {
      setErro(msgErro(e, 'Não foi possível carregar o prontuário.'))
    } finally {
      setCarregando(false)
    }
  }, [paciente.id])

  useEffect(() => {
    setCarregando(true)
    carregar()
  }, [carregar])

  const termo = busca.trim().toLowerCase()

  const resultadosNotas = useMemo(() => {
    if (!termo) return []
    return CAMPOS_NOTAS.filter((c) => contem(paciente[c.key], termo))
  }, [termo, paciente])
  const totalEvolucoes = termo
    ? evolucoes.filter((e) => contem(e.texto, termo) || contem(e.tipo, termo)).length
    : 0
  const totalDocumentos = termo
    ? documentos.filter(
        (d) => contem(d.titulo, termo) || contem(d.observacoes, termo) || contem(d.tipo, termo),
      ).length
    : 0

  const aposMudanca = () => {
    carregar()
    onChanged()
  }

  return (
    <div className="space-y-4">
      {paciente.alergias_alerta?.trim() && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-[#C0392B]/40 bg-[#C0392B]/10 p-4"
        >
          <AlertTriangle className="h-5 w-5 text-[#C0392B] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#C0392B]">
              Alerta de alergia
            </p>
            <p className="text-sm font-semibold text-[#1C2B29] whitespace-pre-line">
              {paciente.alergias_alerta}
            </p>
          </div>
        </div>
      )}

      {modoAtendimento && (
        <div className="flex items-center gap-2 rounded-xl bg-[#E2F0EB] px-3.5 py-2 text-xs font-semibold text-[#166A5A]">
          <Stethoscope className="h-4 w-4" />
          Modo atendimento ativo — registre a evolução desta consulta.
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar no prontuário (evoluções, documentos e notas)..."
          aria-label="Buscar no prontuário"
          className="pl-9 rounded-xl border-[#E3E7E5] text-xs"
        />
      </div>

      {termo && (
        <div className="rounded-xl border border-[#E3E7E5] bg-white p-3.5 space-y-2 text-xs">
          <p className="font-semibold text-[#1C2B29]">Resultados para &quot;{busca.trim()}&quot;</p>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-[#E2F0EB] text-[#166A5A] hover:bg-[#E2F0EB]">
              Notas: {resultadosNotas.length}
            </Badge>
            <Badge className="bg-[#E2F0EB] text-[#166A5A] hover:bg-[#E2F0EB]">
              Evoluções: {totalEvolucoes}
            </Badge>
            <Badge className="bg-[#E2F0EB] text-[#166A5A] hover:bg-[#E2F0EB]">
              Documentos: {totalDocumentos}
            </Badge>
          </div>
          {resultadosNotas.map((c) => (
            <div key={c.key} className="rounded-lg bg-[#F7F6F3] p-2.5">
              <p className="font-semibold text-[#166A5A]">{c.label}</p>
              <p className="text-[#1C2B29] whitespace-pre-line">{paciente[c.key]}</p>
            </div>
          ))}
          <p className="text-[#667C78]">
            Abra as abas Evoluções e Documentos para ver os itens filtrados.
          </p>
        </div>
      )}

      {carregando ? (
        <SecaoCarregando />
      ) : erro ? (
        <SecaoErro mensagem={erro} onRetry={carregar} />
      ) : (
        <Tabs value={subAba} onValueChange={setSubAba} className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList className="bg-white border border-[#E3E7E5] p-1 rounded-2xl flex w-max min-w-full gap-1">
              <TabsTrigger value="notas" className={triggerCls}>
                Notas clínicas
              </TabsTrigger>
              <TabsTrigger value="evolucoes" className={triggerCls}>
                Evoluções ({evolucoes.length})
              </TabsTrigger>
              <TabsTrigger value="documentos" className={triggerCls}>
                Documentos ({documentos.length})
              </TabsTrigger>
              <TabsTrigger value="questionarios" className={triggerCls}>
                Questionários
              </TabsTrigger>
              <TabsTrigger value="anamnese" className={triggerCls}>
                Anamnese
              </TabsTrigger>
              <TabsTrigger value="receituario" className={triggerCls}>
                Receituário
              </TabsTrigger>
              <TabsTrigger value="integracoes" className={triggerCls}>
                Integrações
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="notas" className="pt-3">
            <NotasClinicasSection paciente={paciente} onChanged={onChanged} />
          </TabsContent>
          <TabsContent value="evolucoes" className="pt-3">
            <EvolucoesSection
              paciente={paciente}
              evolucoes={evolucoes}
              busca={busca}
              onReload={aposMudanca}
            />
          </TabsContent>
          <TabsContent value="documentos" className="pt-3">
            <DocumentosSection
              paciente={paciente}
              documentos={documentos}
              busca={busca}
              onReload={aposMudanca}
            />
          </TabsContent>
          <TabsContent value="questionarios" className="pt-3">
            <QuestionariosSection paciente={paciente} />
          </TabsContent>
          <TabsContent value="anamnese" className="pt-3">
            <AnamneseFormularioSection paciente={paciente} onReload={aposMudanca} />
          </TabsContent>
          <TabsContent value="receituario" className="pt-3">
            <ReceituarioSection paciente={paciente} onReload={aposMudanca} />
          </TabsContent>
          <TabsContent value="integracoes" className="pt-3">
            <IntegracoesSection />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
