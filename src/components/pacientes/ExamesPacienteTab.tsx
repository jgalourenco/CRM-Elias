import React, { useState } from 'react'
import { ExameLaboratorial, StatusExame, Sexo } from '@/types/crm'
import { examesService } from '@/services/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { useToast } from '@/hooks/use-toast'
import {
  TestTube2,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Sparkles,
  Calculator,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'

// Modelos clínicos predefinidos inspirados no MedX para preenchimento ágil
const MODELOS_EXAMES_MEDX = [
  {
    nome: 'Vitamina D (25-OH)',
    unidade: 'ng/mL',
    refFeminino: '30.0 a 60.0 ng/mL',
    refMasculino: '30.0 a 60.0 ng/mL',
    laboratorio: 'Fleury',
  },
  {
    nome: 'Ferritina Sérica',
    unidade: 'ng/mL',
    refFeminino: '10.0 a 120.0 ng/mL',
    refMasculino: '20.0 a 250.0 ng/mL',
    laboratorio: 'Fleury',
  },
  {
    nome: 'TSH Ultra Sensível',
    unidade: 'mUI/L',
    refFeminino: '0.40 a 4.50 mUI/L',
    refMasculino: '0.40 a 4.50 mUI/L',
    laboratorio: 'Fleury',
  },
  {
    nome: 'T4 Livre',
    unidade: 'ng/dL',
    refFeminino: '0.80 a 1.90 ng/dL',
    refMasculino: '0.80 a 1.90 ng/dL',
    laboratorio: 'Fleury',
  },
  {
    nome: 'Testosterona Total',
    unidade: 'ng/dL',
    refFeminino: '15 a 70 ng/dL',
    refMasculino: '240 a 870 ng/dL',
    laboratorio: 'Dasa',
  },
  {
    nome: 'Testosterona Livre',
    unidade: 'pg/mL',
    refFeminino: '1.0 a 8.5 pg/mL',
    refMasculino: '4.5 a 25.0 pg/mL',
    laboratorio: 'Dasa',
  },
  {
    nome: 'Estradiol (E2)',
    unidade: 'pg/mL',
    refFeminino: 'Fase folicular: 30 a 120 pg/mL',
    refMasculino: '11 a 44 pg/mL',
    laboratorio: 'Dasa',
  },
  {
    nome: 'Creatinina Sérica',
    unidade: 'mg/dL',
    refFeminino: '0.50 a 1.00 mg/dL',
    refMasculino: '0.70 a 1.20 mg/dL',
    laboratorio: 'Dasa',
  },
  {
    nome: 'Proteína C Reativa (PCR-us)',
    unidade: 'mg/L',
    refFeminino: '< 1.0 mg/L',
    refMasculino: '< 1.0 mg/L',
    laboratorio: 'Dasa',
  },
  {
    nome: 'Glicemia de Jejum',
    unidade: 'mg/dL',
    refFeminino: '70 a 99 mg/dL',
    refMasculino: '70 a 99 mg/dL',
    laboratorio: 'Fleury',
  },
  {
    nome: 'Hemoglobina Glicada (HbA1c)',
    unidade: '%',
    refFeminino: '< 5.7%',
    refMasculino: '< 5.7%',
    laboratorio: 'Fleury',
  },
  {
    nome: 'Insulina Basal',
    unidade: 'uUI/mL',
    refFeminino: '< 10.0 uUI/mL (ótimo)',
    refMasculino: '< 10.0 uUI/mL (ótimo)',
    laboratorio: 'Fleury',
  },
  {
    nome: 'Zinco Sérico',
    unidade: 'mcg/dL',
    refFeminino: '70 a 120 mcg/dL',
    refMasculino: '70 a 120 mcg/dL',
    laboratorio: 'Fleury',
  },
  {
    nome: 'Magnésio Sérico',
    unidade: 'mg/dL',
    refFeminino: '1.8 a 2.4 mg/dL',
    refMasculino: '1.8 a 2.4 mg/dL',
    laboratorio: 'Fleury',
  },
]

interface ExamesPacienteTabProps {
  pacienteId: string
  pacienteNome: string
  pacienteSexo?: Sexo
  exames: ExameLaboratorial[]
  onReload: () => void
}

export default function ExamesPacienteTab({
  pacienteId,
  pacienteNome,
  pacienteSexo = 'Feminino',
  exames,
  onReload,
}: ExamesPacienteTabProps) {
  const { toast } = useToast()

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [dataFiltro, setDataFiltro] = useState<string>('todas')

  // Modais
  const [modalFormOpen, setModalFormOpen] = useState(false)
  const [exameEmEdicao, setExameEmEdicao] = useState<ExameLaboratorial | null>(null)
  const [modalConversorOpen, setModalConversorOpen] = useState(false)
  const [exameExcluir, setExameExcluir] = useState<ExameLaboratorial | null>(null)

  // Estado do formulário de exame
  const [formNome, setFormNome] = useState('')
  const [formData, setFormData] = useState(new Date().toISOString().slice(0, 10))
  const [formResultado, setFormResultado] = useState('')
  const [formUnidade, setFormUnidade] = useState('')
  const [formRef, setFormRef] = useState('')
  const [formStatus, setFormStatus] = useState<StatusExame>('Normal')
  const [formLab, setFormLab] = useState('')
  const [formObs, setFormObs] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Estado do conversor de unidades do MedX (g, dg, cg, mg vs l, dl, cl, ml)
  const [convValorOrig, setConvValorOrig] = useState('')
  const [convPesoOrig, setConvPesoOrig] = useState<'g' | 'dg' | 'cg' | 'mg'>('mg')
  const [convVolOrig, setConvVolOrig] = useState<'l' | 'dl' | 'cl' | 'ml'>('dl')
  const [convPesoDest, setConvPesoDest] = useState<'g' | 'dg' | 'cg' | 'mg'>('mg')
  const [convVolDest, setConvVolDest] = useState<'l' | 'dl' | 'cl' | 'ml'>('l')
  const [convResultado, setConvResultado] = useState<string | null>(null)

  // Abrir modal para novo exame
  const handleNovoExame = () => {
    setExameEmEdicao(null)
    setFormNome('')
    setFormData(new Date().toISOString().slice(0, 10))
    setFormResultado('')
    setFormUnidade('ng/mL')
    setFormRef('')
    setFormStatus('Normal')
    setFormLab('')
    setFormObs('')
    setModalFormOpen(true)
  }

  // Abrir modal para editar
  const handleEditarExame = (item: ExameLaboratorial) => {
    setExameEmEdicao(item)
    setFormNome(item.nome_exame)
    setFormData(item.data.slice(0, 10))
    setFormResultado(item.resultado)
    setFormUnidade(item.unidade || '')
    setFormRef(item.valor_referencia || '')
    setFormStatus(item.status || 'Normal')
    setFormLab(item.laboratorio || '')
    setFormObs(item.observacoes || '')
    setModalFormOpen(true)
  }

  // Preencher a partir do catálogo MedX
  const handleSelecionarModelo = (nome: string) => {
    const mod = MODELOS_EXAMES_MEDX.find((m) => m.nome === nome)
    if (!mod) return
    setFormNome(mod.nome)
    setFormUnidade(mod.unidade)
    setFormLab(mod.laboratorio)
    const ref = pacienteSexo === 'Masculino' ? mod.refMasculino : mod.refFeminino
    setFormRef(ref)
  }

  // Submeter exame (criar ou editar)
  const handleSalvarExame = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNome.trim() || !formResultado.trim() || !formData) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome do exame, resultado e data da coleta.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const payload: Partial<ExameLaboratorial> = {
        paciente_id: pacienteId,
        data: new Date(`${formData}T08:00:00.000Z`).toISOString(),
        nome_exame: formNome.trim(),
        resultado: formResultado.trim(),
        unidade: formUnidade.trim(),
        valor_referencia: formRef.trim(),
        status: formStatus,
        laboratorio: formLab.trim(),
        observacoes: formObs.trim(),
      }

      if (exameEmEdicao) {
        await examesService.update(exameEmEdicao.id, payload)
        toast({ title: 'Exame atualizado', description: 'Resultado alterado com sucesso.' })
      } else {
        await examesService.create(payload)
        toast({ title: 'Exame registrado', description: 'Resultado cadastrado no histórico.' })
      }

      setModalFormOpen(false)
      onReload()
    } catch (err) {
      console.error('Erro ao salvar exame:', err)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível gravar o resultado do exame.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Excluir exame
  const handleConfirmarExclusao = async () => {
    if (!exameExcluir) return
    try {
      await examesService.delete(exameExcluir.id)
      toast({ title: 'Exame excluído' })
      setExameExcluir(null)
      onReload()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o exame.',
        variant: 'destructive',
      })
    }
  }

  // Cálculo da conversor de unidades (portado de exames.controller.js)
  const pesoFatores = { g: 1, dg: 0.1, cg: 0.01, mg: 0.001 }
  const volFatores = { l: 1, dl: 0.1, cl: 0.01, ml: 0.001 }

  const handleCalcularConversao = () => {
    const val = parseFloat(convValorOrig.replace(',', '.'))
    if (isNaN(val)) {
      setConvResultado(null)
      return
    }

    const valEmGramasPorLitro = (val * pesoFatores[convPesoOrig]) / volFatores[convVolOrig]
    const resultadoDest =
      (valEmGramasPorLitro / pesoFatores[convPesoDest]) * volFatores[convVolDest]
    setConvResultado(resultadoDest.toFixed(3))
  }

  const handleAplicarConversaoAoForm = () => {
    if (convResultado !== null) {
      setFormResultado(convResultado)
      setFormUnidade(`${convPesoDest}/${convVolDest}`)
      setModalConversorOpen(false)
      toast({
        title: 'Conversão aplicada',
        description: `Resultado atualizado para ${convResultado} ${convPesoDest}/${convVolDest}.`,
      })
    }
  }

  // Agrupamento de datas disponíveis
  const datasUnicas = Array.from(new Set(exames.map((e) => e.data.slice(0, 10)))).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  )

  // Filtragem
  const examesFiltrados = exames.filter((ex) => {
    const matchBusca =
      !busca ||
      ex.nome_exame.toLowerCase().includes(busca.toLowerCase()) ||
      (ex.laboratorio && ex.laboratorio.toLowerCase().includes(busca.toLowerCase())) ||
      (ex.observacoes && ex.observacoes.toLowerCase().includes(busca.toLowerCase()))
    const matchStatus = filtroStatus === 'todos' || ex.status === filtroStatus
    const matchData = dataFiltro === 'todas' || ex.data.slice(0, 10) === dataFiltro
    return matchBusca && matchStatus && matchData
  })

  // Agrupados por data
  const agrupadosPorData = datasUnicas
    .map((dataStr) => ({
      data: dataStr,
      itens: examesFiltrados.filter((e) => e.data.slice(0, 10) === dataStr),
    }))
    .filter((g) => g.itens.length > 0)

  return (
    <div className="space-y-4">
      {/* Barra Superior */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
                <TestTube2 className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-[#1C2B29]">Exames Laboratoriais</h2>
              <Badge className="bg-[#E2F0EB] text-[#166A5A] text-xs">
                {exames.length} {exames.length === 1 ? 'registro' : 'registros'}
              </Badge>
            </div>
            <p className="text-xs text-[#667C78] mt-1">
              Resultados clínicos organizados cronologicamente com valores de referência e status.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConvValorOrig(formResultado || '')
                setConvResultado(null)
                setModalConversorOpen(true)
              }}
              className="rounded-xl border-[#E3E7E5] text-xs font-semibold gap-1.5"
            >
              <Calculator className="h-3.5 w-3.5 text-[#166A5A]" />
              Conversor de Unidades
            </Button>
            <Button
              type="button"
              onClick={handleNovoExame}
              className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Adicionar Exame
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-[#E3E7E5]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#667C78]" />
            <Input
              placeholder="Buscar por nome, laboratório..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl border-[#E3E7E5]"
            />
          </div>

          <div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-9 text-xs rounded-xl border-[#E3E7E5]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Alterado">Alterado</SelectItem>
                <SelectItem value="Atenção">Atenção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={dataFiltro} onValueChange={setDataFiltro}>
              <SelectTrigger className="h-9 text-xs rounded-xl border-[#E3E7E5]">
                <SelectValue placeholder="Data da Coleta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as datas</SelectItem>
                {datasUnicas.map((d) => (
                  <SelectItem key={d} value={d}>
                    Coleta de {new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Lista de Exames Agrupados por Data */}
      {agrupadosPorData.length === 0 ? (
        <Card className="rounded-2xl border-[#E3E7E5] bg-white p-12 text-center shadow-xs">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
              <TestTube2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-[#1C2B29]">Nenhum exame cadastrado</h3>
            <p className="text-xs text-[#667C78] max-w-md">
              Cadastre resultados de coletas e exames de rotina ou use os modelos clínicos
              integrados para acompanhar a evolução terapêutica.
            </p>
            <Button
              onClick={handleNovoExame}
              className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs gap-1.5 mt-2"
            >
              <Plus className="h-4 w-4" />
              Cadastrar Primeiro Exame
            </Button>
          </div>
        </Card>
      ) : (
        agrupadosPorData.map((grupo) => (
          <Card
            key={grupo.data}
            className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs overflow-hidden"
          >
            <div className="px-5 py-3 bg-[#F7F6F3]/80 border-b border-[#E3E7E5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#166A5A]" />
                <span className="text-xs font-bold text-[#1C2B29]">
                  Coleta em {new Date(`${grupo.data}T12:00:00`).toLocaleDateString('pt-BR')}
                </span>
                <span className="text-[11px] text-[#667C78]">
                  • {grupo.itens.length} {grupo.itens.length === 1 ? 'exame' : 'exames'}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#E3E7E5] bg-white text-[11px] font-semibold text-[#667C78] uppercase tracking-wider">
                    <th className="py-2.5 px-5">Exame</th>
                    <th className="py-2.5 px-4">Resultado</th>
                    <th className="py-2.5 px-4">Valores de Referência</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Laboratório</th>
                    <th className="py-2.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E7E5]/70">
                  {grupo.itens.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F7F6F3]/40 transition-colors">
                      <td className="py-3 px-5">
                        <p className="text-xs font-bold text-[#1C2B29]">{item.nome_exame}</p>
                        {item.observacoes && (
                          <p className="text-[11px] text-[#667C78] mt-0.5 line-clamp-1">
                            {item.observacoes}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-bold text-[#166A5A]">
                          {item.resultado}
                        </span>
                        {item.unidade && (
                          <span className="text-xs text-[#667C78] ml-1">{item.unidade}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#667C78]">
                        {item.valor_referencia || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={`text-[11px] ${
                            item.status === 'Alterado'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : item.status === 'Atenção'
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {item.status || 'Normal'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#667C78]">
                        {item.laboratorio || 'Não informado'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditarExame(item)}
                            className="h-7 w-7 text-[#667C78] hover:text-[#166A5A] hover:bg-[#E2F0EB]"
                            title="Editar"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExameExcluir(item)}
                            className="h-7 w-7 text-[#667C78] hover:text-red-600 hover:bg-red-50"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}

      {/* Modal Adicionar / Editar Exame */}
      <Dialog open={modalFormOpen} onOpenChange={setModalFormOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              {exameEmEdicao ? 'Editar Exame Laboratorial' : 'Novo Resultado de Exame'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              Paciente: <strong>{pacienteNome}</strong> ({pacienteSexo})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarExame} className="space-y-4 pt-2">
            {/* Atalho Catálogo MedX */}
            <div className="p-3 bg-[#E2F0EB]/40 rounded-xl space-y-1.5 border border-[#166A5A]/20">
              <Label className="text-xs font-semibold text-[#166A5A] flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-[#C9A227]" />
                Modelos Clínicos Frequentes (MedX)
              </Label>
              <Select onValueChange={handleSelecionarModelo}>
                <SelectTrigger className="rounded-xl border-[#E3E7E5] text-xs bg-white">
                  <SelectValue placeholder="Preencher com exame frequente..." />
                </SelectTrigger>
                <SelectContent>
                  {MODELOS_EXAMES_MEDX.map((m) => (
                    <SelectItem key={m.nome} value={m.nome}>
                      <span className="text-xs">
                        {m.nome} ({m.unidade})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-[#1C2B29]">Nome do Exame</Label>
                <Input
                  required
                  placeholder="Ex: Vitamina D (25-OH), Ferritina..."
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="rounded-xl border-[#E3E7E5] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Data da Coleta</Label>
                <Input
                  type="date"
                  required
                  value={formData}
                  onChange={(e) => setFormData(e.target.value)}
                  className="rounded-xl border-[#E3E7E5] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Laboratório</Label>
                <Input
                  placeholder="Ex: Fleury, Dasa, Lavoisier..."
                  value={formLab}
                  onChange={(e) => setFormLab(e.target.value)}
                  className="rounded-xl border-[#E3E7E5] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">
                  Resultado Numérico/Texto
                </Label>
                <Input
                  required
                  placeholder="Ex: 48.2"
                  value={formResultado}
                  onChange={(e) => setFormResultado(e.target.value)}
                  className="rounded-xl border-[#E3E7E5] text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Unidade de Medida</Label>
                <Input
                  placeholder="Ex: ng/mL, mg/dL, pg/mL..."
                  value={formUnidade}
                  onChange={(e) => setFormUnidade(e.target.value)}
                  className="rounded-xl border-[#E3E7E5] text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-[#1C2B29]">
                  Valores de Referência
                </Label>
                <Input
                  placeholder="Ex: 30.0 a 60.0 ng/mL"
                  value={formRef}
                  onChange={(e) => setFormRef(e.target.value)}
                  className="rounded-xl border-[#E3E7E5] text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-[#1C2B29]">
                  Classificação do Status
                </Label>
                <Select value={formStatus} onValueChange={(v: StatusExame) => setFormStatus(v)}>
                  <SelectTrigger className="rounded-xl border-[#E3E7E5] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal (Dentro da faixa terapêutica)</SelectItem>
                    <SelectItem value="Alterado">Alterado (Fora da referência)</SelectItem>
                    <SelectItem value="Atenção">Atenção (Subótimo / borderline)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-[#1C2B29]">Observações Clínicas</Label>
                <Textarea
                  rows={2}
                  placeholder="Notas do médico sobre a conduta, necessidade de ajuste de dose..."
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  className="rounded-xl border-[#E3E7E5] text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalFormOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs"
              >
                {salvando ? 'Salvando...' : exameEmEdicao ? 'Salvar Alterações' : 'Cadastrar Exame'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Conversor de Unidades (MedX) */}
      <Dialog open={modalConversorOpen} onOpenChange={setModalConversorOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
                <Calculator className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold text-[#1C2B29]">
                Conversor de Unidades Laboratoriais
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#667C78]">
              Portado do módulo MedX (peso e volume de exames) para harmonização de dosagens.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* Valor de Entrada */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Valor Original</Label>
              <Input
                type="number"
                step="any"
                placeholder="Ex: 100"
                value={convValorOrig}
                onChange={(e) => setConvValorOrig(e.target.value)}
                className="rounded-xl border-[#E3E7E5] font-mono text-xs"
              />
            </div>

            {/* De: Peso / Volume */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#F7F6F3] rounded-xl">
              <div className="space-y-1">
                <span className="font-semibold text-[#1C2B29]">De: Unidade Massa</span>
                <Select
                  value={convPesoOrig}
                  onValueChange={(v: 'g' | 'dg' | 'cg' | 'mg') => setConvPesoOrig(v)}
                >
                  <SelectTrigger className="bg-white rounded-xl text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">Gramas (g)</SelectItem>
                    <SelectItem value="dg">Decigramas (dg)</SelectItem>
                    <SelectItem value="cg">Centigramas (cg)</SelectItem>
                    <SelectItem value="mg">Miligramas (mg)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[#1C2B29]">De: Unidade Volume</span>
                <Select
                  value={convVolOrig}
                  onValueChange={(v: 'l' | 'dl' | 'cl' | 'ml') => setConvVolOrig(v)}
                >
                  <SelectTrigger className="bg-white rounded-xl text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="l">Litros (l)</SelectItem>
                    <SelectItem value="dl">Decilitros (dl)</SelectItem>
                    <SelectItem value="cl">Centilitros (cl)</SelectItem>
                    <SelectItem value="ml">Mililitros (ml)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Para: Peso / Volume */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#E2F0EB]/40 rounded-xl border border-[#166A5A]/20">
              <div className="space-y-1">
                <span className="font-semibold text-[#166A5A]">Para: Massa</span>
                <Select
                  value={convPesoDest}
                  onValueChange={(v: 'g' | 'dg' | 'cg' | 'mg') => setConvPesoDest(v)}
                >
                  <SelectTrigger className="bg-white rounded-xl text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">Gramas (g)</SelectItem>
                    <SelectItem value="dg">Decigramas (dg)</SelectItem>
                    <SelectItem value="cg">Centigramas (cg)</SelectItem>
                    <SelectItem value="mg">Miligramas (mg)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[#166A5A]">Para: Volume</span>
                <Select
                  value={convVolDest}
                  onValueChange={(v: 'l' | 'dl' | 'cl' | 'ml') => setConvVolDest(v)}
                >
                  <SelectTrigger className="bg-white rounded-xl text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="l">Litros (l)</SelectItem>
                    <SelectItem value="dl">Decilitros (dl)</SelectItem>
                    <SelectItem value="cl">Centilitros (cl)</SelectItem>
                    <SelectItem value="ml">Mililitros (ml)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleCalcularConversao}
              className="w-full bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs"
            >
              Calcular Conversão
            </Button>

            {convResultado !== null && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-1">
                <span className="text-[11px] text-emerald-800 font-medium">
                  Resultado Convertido:
                </span>
                <p className="text-lg font-bold text-emerald-900 font-mono">
                  {convResultado} {convPesoDest}/{convVolDest}
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalConversorOpen(false)}
                className="rounded-xl text-xs"
              >
                Fechar
              </Button>
              {convResultado !== null && (
                <Button
                  type="button"
                  onClick={handleAplicarConversaoAoForm}
                  className="bg-[#C9A227] hover:bg-[#b08d20] text-white rounded-xl text-xs font-bold gap-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Aplicar ao Formulário
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar Exclusão de Exame */}
      <AlertDialog open={!!exameExcluir} onOpenChange={(v) => !v && setExameExcluir(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#1C2B29]">
              Excluir Resultado de Exame
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#667C78]">
              Tem certeza que deseja remover o registro do exame{' '}
              <strong>{exameExcluir?.nome_exame}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              className="bg-[#C0392B] hover:bg-red-700 text-white rounded-xl"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
