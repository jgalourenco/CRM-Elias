import React, { useState, useEffect } from 'react'
import { medxImportacoesService, pacientesService } from '@/services/crm'
import { MedXImportacao } from '@/types/crm'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  History,
  FileText,
  Clock,
  User,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ColunaDetectada {
  indice: number
  nomeCabecalho: string
  campoMapeado: string
}

const CAMPOS_SISTEMA = [
  { valor: 'ignorar', label: '— Não mapear (Ignorar) —' },
  { valor: 'nome', label: 'Nome Completo (Obrigatório)' },
  { valor: 'telefone', label: 'Telefone / WhatsApp (Opcional)' },
  { valor: 'email', label: 'E-mail' },
  { valor: 'cpf', label: 'CPF' },
  { valor: 'id_cliente', label: 'ID do Cliente / Código' },
  { valor: 'id_assinatura', label: 'ID da Assinatura' },
  { valor: 'id_convenio', label: 'ID do Convênio' },
  { valor: 'convenio', label: 'Convênio / Plano de Saúde' },
  { valor: 'data_nascimento', label: 'Data de Nascimento' },
  { valor: 'logradouro', label: 'Endereço (Rua/Av)' },
  { valor: 'observacoes', label: 'Observações' },
]

export default function ImportacaoMedX() {
  const { toast } = useToast()
  const { user } = useAuth()

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [colunas, setColunas] = useState<ColunaDetectada[]>([])
  const [linhasArquivo, setLinhasArquivo] = useState<string[][]>([])

  // Validation & Import status
  const [validado, setValidado] = useState(false)
  const [registrosValidos, setRegistrosValidos] = useState(0)
  const [registrosInvalidos, setRegistrosInvalidos] = useState(0)
  const [logErros, setLogErros] = useState<Array<{ linha: number; nome?: string; erro: string }>>(
    [],
  )
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<{ importados: number; erros: number } | null>(null)

  // Histórico de importações (últimos 30 dias)
  const [historico, setHistorico] = useState<MedXImportacao[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  const carregarHistorico = async () => {
    setCarregandoHistorico(true)
    try {
      // Filtrar registros dos últimos 30 dias no cliente e no servidor
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - 30)
      const dataLimiteIso = dataLimite.toISOString().replace('T', ' ').substring(0, 19)

      const lista = await medxImportacoesService.list(`created >= "${dataLimiteIso}"`, '-created')
      setHistorico(lista)
    } catch (err) {
      console.error('Erro ao carregar histórico de importações:', err)
      // fallback sem filtro estrito de data se a regra do banco falhar
      try {
        const fallback = await medxImportacoesService.list('', '-created')
        const trintaDiasAtrasMs = Date.now() - 30 * 24 * 60 * 60 * 1000
        setHistorico(
          fallback.filter((item) => new Date(item.created).getTime() >= trintaDiasAtrasMs),
        )
      } catch {
        /* ignore */
      }
    } finally {
      setCarregandoHistorico(false)
    }
  }

  useEffect(() => {
    carregarHistorico()
  }, [])

  // File parsing (.csv handler)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setArquivo(file)
    setValidado(false)
    setResultado(null)
    setLogErros([])

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => l.split(/[,;]/).map((c) => c.trim().replace(/^["']|["']$/g, '')))

      if (lines.length > 0) {
        const headers = lines[0]
        const rows = lines.slice(1)
        setLinhasArquivo(rows)

        // Auto-mapping heuristics genéricas
        const mapped: ColunaDetectada[] = headers.map((h, i) => {
          const lower = h.toLowerCase()
          let campo = 'ignorar'
          if (lower.includes('assinatura') || lower.includes('sub_id') || lower.includes('id_sub'))
            campo = 'id_assinatura'
          else if (
            lower.includes('id_convenio') ||
            lower.includes('idconvenio') ||
            lower.includes('cod_convenio')
          )
            campo = 'id_convenio'
          else if (
            lower.includes('convenio') ||
            lower.includes('plano') ||
            lower.includes('seguradora')
          )
            campo = 'convenio'
          else if (
            lower.includes('id_cliente') ||
            lower.includes('idcliente') ||
            lower.includes('cod_cliente') ||
            lower.includes('codigo_cliente') ||
            lower.includes('id_paciente') ||
            lower === 'id' ||
            lower === 'prontuario'
          )
            campo = 'id_cliente'
          else if (lower.includes('nome') || lower.includes('paciente')) campo = 'nome'
          else if (
            lower.includes('tel') ||
            lower.includes('cel') ||
            lower.includes('whats') ||
            lower.includes('fone')
          )
            campo = 'telefone'
          else if (lower.includes('mail')) campo = 'email'
          else if (lower.includes('cpf')) campo = 'cpf'
          else if (lower.includes('nasc')) campo = 'data_nascimento'
          else if (lower.includes('end') || lower.includes('rua') || lower.includes('logradouro'))
            campo = 'logradouro'
          else if (lower.includes('obs')) campo = 'observacoes'

          return {
            indice: i,
            nomeCabecalho: h,
            campoMapeado: campo,
          }
        })

        setColunas(mapped)
      }
    }

    reader.readAsText(file)
  }

  // Validar dados
  const handleValidar = () => {
    const nomeCol = colunas.find((c) => c.campoMapeado === 'nome')

    if (!nomeCol) {
      toast({
        title: 'Mapeamento incompleto',
        description: 'É obrigatório mapear a coluna Nome do Paciente.',
        variant: 'destructive',
      })
      return
    }

    let validos = 0
    let invalidos = 0
    const erros: Array<{ linha: number; nome?: string; erro: string }> = []

    linhasArquivo.forEach((row, idx) => {
      const nomeVal = row[nomeCol.indice]?.trim()

      if (!nomeVal) {
        invalidos++
        erros.push({ linha: idx + 2, nome: 'Não informado', erro: 'Nome obrigatório ausente' })
      } else {
        validos++
      }
    })

    setRegistrosValidos(validos)
    setRegistrosInvalidos(invalidos)
    setLogErros(erros)
    setValidado(true)

    toast({
      title: 'Validação concluída',
      description: `${validos} válidos e ${invalidos} inválidos identificados.`,
    })
  }

  // Importar
  const handleImportar = async () => {
    if (!validado || registrosValidos === 0) return

    setImportando(true)
    const nomeCol = colunas.find((c) => c.campoMapeado === 'nome')!
    const telCol = colunas.find((c) => c.campoMapeado === 'telefone')
    const emailCol = colunas.find((c) => c.campoMapeado === 'email')
    const cpfCol = colunas.find((c) => c.campoMapeado === 'cpf')
    const idClienteCol = colunas.find((c) => c.campoMapeado === 'id_cliente')
    const idAssinaturaCol = colunas.find((c) => c.campoMapeado === 'id_assinatura')
    const idConvenioCol = colunas.find((c) => c.campoMapeado === 'id_convenio')
    const convenioCol = colunas.find((c) => c.campoMapeado === 'convenio')
    const obsCol = colunas.find((c) => c.campoMapeado === 'observacoes')

    let importados = 0
    let errosExecucao = 0
    const errosFinais: Array<{ linha: number; nome?: string; erro: string }> = [...logErros]

    for (let i = 0; i < linhasArquivo.length; i++) {
      const row = linhasArquivo[i]
      const nomeVal = row[nomeCol.indice]?.trim()
      const telVal = telCol ? row[telCol.indice]?.trim() : ''

      if (nomeVal) {
        try {
          await pacientesService.create({
            nome: nomeVal,
            telefone: telVal || undefined,
            email: emailCol ? row[emailCol.indice]?.trim() || undefined : undefined,
            cpf: cpfCol ? row[cpfCol.indice]?.trim() || undefined : undefined,
            id_cliente: idClienteCol ? row[idClienteCol.indice]?.trim() || undefined : undefined,
            id_assinatura: idAssinaturaCol
              ? row[idAssinaturaCol.indice]?.trim() || undefined
              : undefined,
            id_convenio: idConvenioCol ? row[idConvenioCol.indice]?.trim() || undefined : undefined,
            convenio: convenioCol ? row[convenioCol.indice]?.trim() || undefined : undefined,
            observacoes: obsCol
              ? `[Importação de Planilha] ${row[obsCol.indice] || ''}`
              : '[Importação de Planilha]',
            fase: 'Prospeccao', // Registros importados entram como Prospecção
          })
          importados++
        } catch (err: unknown) {
          errosExecucao++
          errosFinais.push({
            linha: i + 2,
            nome: nomeVal,
            erro: 'Falha ao salvar paciente no banco',
          })
        }
      }
    }

    const totalFalhas = registrosInvalidos + errosExecucao
    const statusFinal: 'concluida' | 'com_erro' =
      importados > 0 && totalFalhas === 0 ? 'concluida' : importados > 0 ? 'concluida' : 'com_erro'

    // Persistir histórico da execução na coleção
    try {
      await medxImportacoesService.create({
        nome_arquivo: arquivo?.name || 'planilha_pacientes.csv',
        tipo: 'Planilha de Pacientes',
        total_registros: linhasArquivo.length,
        importados: importados,
        erros: totalFalhas,
        status: statusFinal,
        usuario_nome: user?.name || user?.email || 'Administrador',
        log_erros: errosFinais,
        criado_por: user?.id,
      })
    } catch (e) {
      console.error('Erro ao registrar histórico de importação:', e)
    }

    setResultado({ importados, erros: totalFalhas })
    setImportando(false)
    carregarHistorico()

    toast({
      title: 'Importação finalizada!',
      description: `${importados} pacientes cadastrados na fase Prospecção.`,
    })
  }

  const handleDownloadLog = (
    errosList: Array<{ linha: number; nome?: string; erro: string }>,
    nomeArq?: string,
  ) => {
    const csvContent =
      'Linha;Nome;Erro\n' +
      errosList.map((e) => `${e.linha};"${e.nome || ''}";"${e.erro}"`).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `log_erros_${nomeArq || 'importacao'}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
          Importação de Pacientes
        </h1>
        <p className="text-sm text-[#667C78]">
          Importação inteligente em lote de planilhas de contatos e pacientes para a Clínica Elias
          Mansur (.csv ou .xlsx).
        </p>
      </div>

      {/* Instruções Passo a Passo */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base font-bold text-[#1C2B29]">
            Instruções de Importação
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs">
          <div className="p-3 bg-[#F7F6F3] rounded-xl space-y-1 border border-[#E3E7E5]">
            <span className="font-bold text-[#166A5A]">1. Preparar Planilha</span>
            <p className="text-[#667C78]">
              Organize os pacientes em uma planilha (.csv) com cabeçalhos na primeira linha.
            </p>
          </div>
          <div className="p-3 bg-[#F7F6F3] rounded-xl space-y-1 border border-[#E3E7E5]">
            <span className="font-bold text-[#166A5A]">2. Carregar Arquivo</span>
            <p className="text-[#667C78]">
              Arraste o arquivo para a área de upload para detecção automática das colunas.
            </p>
          </div>
          <div className="p-3 bg-[#F7F6F3] rounded-xl space-y-1 border border-[#E3E7E5]">
            <span className="font-bold text-[#166A5A]">3. Mapear & Validar</span>
            <p className="text-[#667C78]">
              Associe a coluna Nome (obrigatória); telefone, CPF e convênio são opcionais.
            </p>
          </div>
          <div className="p-3 bg-[#F7F6F3] rounded-xl space-y-1 border border-[#E3E7E5]">
            <span className="font-bold text-[#166A5A]">4. Concluir & Histórico</span>
            <p className="text-[#667C78]">
              Os contatos entram como <strong>Prospecção</strong> e a importação fica registrada no
              histórico.
            </p>
          </div>
        </div>
      </Card>

      {/* Upload Drag & Drop Area */}
      <Card className="rounded-2xl border-2 border-dashed border-[#E3E7E5] bg-white p-8 text-center space-y-4 hover:border-[#166A5A] transition-colors">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#1C2B29]">
            {arquivo ? arquivo.name : 'Selecione ou arraste sua planilha (.csv ou .xlsx)'}
          </h3>
          <p className="text-xs text-[#667C78] mt-1">
            {arquivo
              ? `${linhasArquivo.length} linhas de dados encontradas no documento.`
              : 'Arquivos separados por vírgula ou ponto-e-vírgula com cabeçalho na primeira linha'}
          </p>
        </div>
        <div>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold shadow-xs">
              <FileSpreadsheet className="h-4 w-4" />
              {arquivo ? 'Trocar Planilha' : 'Escolher Planilha de Pacientes'}
            </span>
            <input
              type="file"
              accept=".csv,.txt,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </Card>

      {/* Tabela de Mapeamento de Colunas */}
      {colunas.length > 0 && (
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-[#1C2B29]">
                Mapeamento de Colunas Detectadas
              </CardTitle>
              <CardDescription className="text-xs text-[#667C78]">
                Associe as colunas da sua planilha aos campos do CRM da Clínica Elias Mansur.
              </CardDescription>
            </div>
            <Button
              onClick={handleValidar}
              className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold"
            >
              Validar Dados ({linhasArquivo.length} linhas)
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E3E7E5] bg-[#F7F6F3] text-[#667C78] font-semibold">
                  <th className="py-2.5 px-3">Coluna na Planilha</th>
                  <th className="py-2.5 px-3">Exemplo da Linha 1</th>
                  <th className="py-2.5 px-3">Mapear para Campo do CRM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E7E5]">
                {colunas.map((col, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-3 font-semibold text-[#1C2B29]">
                      {col.nomeCabecalho}
                    </td>
                    <td className="py-2.5 px-3 text-[#667C78] italic truncate max-w-xs">
                      {linhasArquivo[0]?.[col.indice] || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <Select
                        value={col.campoMapeado}
                        onValueChange={(val) => {
                          setColunas((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, campoMapeado: val } : c)),
                          )
                          setValidado(false)
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-lg border-[#E3E7E5] max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CAMPOS_SISTEMA.map((item) => (
                            <SelectItem key={item.valor} value={item.valor} className="text-xs">
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Resumo da Validação & Botão de Importação */}
      {validado && (
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold text-[#1C2B29]">
                Resultado da Validação
              </CardTitle>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-[#2E8B57] font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  {registrosValidos} registros válidos
                </span>
                {registrosInvalidos > 0 && (
                  <span className="flex items-center gap-1 text-[#C0392B] font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    {registrosInvalidos} com inconsistências (nome ausente)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {logErros.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadLog(logErros, arquivo?.name)}
                  className="rounded-xl text-xs gap-1.5 border-[#E3E7E5]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar Log de Erros
                </Button>
              )}
              <Button
                onClick={handleImportar}
                disabled={importando || registrosValidos === 0}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
              >
                {importando ? 'Importando pacientes...' : `Importar ${registrosValidos} Pacientes`}
              </Button>
            </div>
          </div>

          {resultado && (
            <div className="p-4 bg-[#E2F0EB]/60 rounded-xl border border-[#166A5A]/30 text-xs space-y-1 text-[#166A5A]">
              <p className="font-bold">Importação concluída com sucesso!</p>
              <p>
                {resultado.importados} pacientes foram inseridos na base como{' '}
                <strong>Prospecção</strong> e já estão disponíveis no Funil e na lista de Pacientes.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Histórico de Importações (Últimos 30 Dias) */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
              <History className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-[#1C2B29]">
                Histórico de Importações
              </CardTitle>
              <CardDescription className="text-xs text-[#667C78]">
                Execuções realizadas nos últimos 30 dias (registros com mais de 30 dias são
                ocultados automaticamente).
              </CardDescription>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={carregarHistorico}
            disabled={carregandoHistorico}
            className="rounded-xl text-xs gap-1.5 border-[#E3E7E5]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${carregandoHistorico ? 'animate-spin' : ''}`} />
            Atualizar Histórico
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E7E5] bg-[#F7F6F3]/70 text-[#667C78] font-semibold">
                <th className="py-3 px-3">Data / Hora</th>
                <th className="py-3 px-3">Arquivo</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Responsável</th>
                <th className="py-3 px-3 text-center">Processados</th>
                <th className="py-3 px-3 text-center">Criados</th>
                <th className="py-3 px-3 text-center">Erros</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E7E5]/70">
              {carregandoHistorico ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-[#667C78]">
                    Carregando histórico...
                  </td>
                </tr>
              ) : historico.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-[#667C78]">
                    Nenhuma importação registrada nos últimos 30 dias.
                  </td>
                </tr>
              ) : (
                historico.map((h) => {
                  const dataFormatada = new Date(h.created).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  const isSucesso = h.status === 'concluida' || (h.importados > 0 && h.erros === 0)

                  return (
                    <tr key={h.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-3 text-[#1C2B29] font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#667C78]" />
                          {dataFormatada}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-semibold text-[#1C2B29] truncate max-w-[180px]">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-[#166A5A]" />
                          <span title={h.nome_arquivo}>{h.nome_arquivo}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-[#667C78] whitespace-nowrap">
                        {h.tipo || 'Planilha de Pacientes'}
                      </td>

                      <td className="py-3 px-3 text-[#667C78] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {h.usuario_nome || 'Equipe'}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-medium text-[#1C2B29]">
                        {h.total_registros || 0}
                      </td>

                      <td className="py-3 px-3 text-center font-semibold text-emerald-700">
                        {h.importados || 0}
                      </td>

                      <td className="py-3 px-3 text-center font-semibold text-red-600">
                        {h.erros || 0}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {isSucesso ? (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Concluída
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px] gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {h.importados > 0 ? 'Concluída c/ erros' : 'Com erro'}
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {Array.isArray(h.log_erros) && h.log_erros.length > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadLog(h.log_erros, h.nome_arquivo)}
                            className="h-7 px-2 text-[11px] text-[#667C78] hover:text-[#166A5A]"
                            title="Baixar log de falhas"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Erros ({h.log_erros.length})
                          </Button>
                        ) : (
                          <span className="text-[11px] text-[#667C78]">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
