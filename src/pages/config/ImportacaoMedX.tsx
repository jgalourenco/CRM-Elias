import React, { useState } from 'react'
import { medxImportacoesService, pacientesService } from '@/services/crm'
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
  ArrowRight,
  Sparkles,
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
  { valor: 'telefone', label: 'Telefone / WhatsApp (Obrigatório)' },
  { valor: 'email', label: 'E-mail' },
  { valor: 'cpf', label: 'CPF' },
  { valor: 'data_nascimento', label: 'Data de Nascimento' },
  { valor: 'logradouro', label: 'Endereço (Rua/Av)' },
  { valor: 'observacoes', label: 'Observações' },
]

export default function ImportacaoMedX() {
  const { toast } = useToast()

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

        // Auto-mapping heuristics
        const mapped: ColunaDetectada[] = headers.map((h, i) => {
          const lower = h.toLowerCase()
          let campo = 'ignorar'
          if (lower.includes('nome')) campo = 'nome'
          else if (lower.includes('tel') || lower.includes('cel') || lower.includes('whats'))
            campo = 'telefone'
          else if (lower.includes('mail')) campo = 'email'
          else if (lower.includes('cpf')) campo = 'cpf'
          else if (lower.includes('nasc')) campo = 'data_nascimento'
          else if (lower.includes('end') || lower.includes('rua')) campo = 'logradouro'
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
    const telCol = colunas.find((c) => c.campoMapeado === 'telefone')

    if (!nomeCol || !telCol) {
      toast({
        title: 'Mapeamento incompleto',
        description: 'É obrigatório mapear as colunas Nome e Telefone.',
        variant: 'destructive',
      })
      return
    }

    let validos = 0
    let invalidos = 0
    const erros: Array<{ linha: number; nome?: string; erro: string }> = []

    linhasArquivo.forEach((row, idx) => {
      const nomeVal = row[nomeCol.indice]?.trim()
      const telVal = row[telCol.indice]?.trim()

      if (!nomeVal) {
        invalidos++
        erros.push({ linha: idx + 2, nome: 'Não informado', erro: 'Nome obrigatório ausente' })
      } else if (!telVal) {
        invalidos++
        erros.push({ linha: idx + 2, nome: nomeVal, erro: 'Telefone obrigatório ausente' })
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
    const telCol = colunas.find((c) => c.campoMapeado === 'telefone')!
    const emailCol = colunas.find((c) => c.campoMapeado === 'email')
    const cpfCol = colunas.find((c) => c.campoMapeado === 'cpf')
    const obsCol = colunas.find((c) => c.campoMapeado === 'observacoes')

    let importados = 0
    for (const row of linhasArquivo) {
      const nomeVal = row[nomeCol.indice]?.trim()
      const telVal = row[telCol.indice]?.trim()

      if (nomeVal && telVal) {
        try {
          await pacientesService.create({
            nome: nomeVal,
            telefone: telVal,
            email: emailCol ? row[emailCol.indice]?.trim() : undefined,
            cpf: cpfCol ? row[cpfCol.indice]?.trim() : undefined,
            observacoes: obsCol
              ? `[Importado MedX] ${row[obsCol.indice] || ''}`
              : '[Importado MedX]',
            fase: 'Prospeccao', // Registros importados entram como Prospecção
          })
          importados++
        } catch {
          /* intentionally ignored */
        }
      }
    }

    // Salvar registro da importação
    try {
      await medxImportacoesService.create({
        nome_arquivo: arquivo?.name || 'importacao_medx.csv',
        total_registros: linhasArquivo.length,
        importados: importados,
        erros: registrosInvalidos,
        log_erros: logErros,
      })
    } catch {
      /* intentionally ignored */
    }

    setResultado({ importados, erros: registrosInvalidos })
    setImportando(false)
    toast({
      title: 'Importação finalizada!',
      description: `${importados} pacientes migrados para a fase Prospeccao.`,
    })
  }

  const handleDownloadLog = () => {
    const csvContent =
      'Linha;Nome;Erro\n' +
      logErros.map((e) => `${e.linha};"${e.nome || ''}";"${e.erro}"`).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `log_erros_medx_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
          Importação de Pacientes — MedX
        </h1>
        <p className="text-sm text-[#667C78]">
          Migrador inteligente para importação em lote de contatos e prontuários legados (.csv ou
          .xlsx).
        </p>
      </div>

      {/* Instruções Passo a Passo */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base font-bold text-[#1C2B29]">
            Instruções Passo a Passo de Migração
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-[#F7F6F3] rounded-xl space-y-1 border border-[#E3E7E5]">
            <span className="font-bold text-[#166A5A]">1. Exportar do MedX</span>
            <p className="text-[#667C78]">
              Gere o relatório completo de pacientes em formato CSV no sistema MedX.
            </p>
          </div>
          <div className="p-3 bg-[#F7F6F3] rounded-xl space-y-1 border border-[#E3E7E5]">
            <span className="font-bold text-[#166A5A]">2. Carregar Arquivo</span>
            <p className="text-[#667C78]">
              Arraste o arquivo .csv para a área abaixo para detecção automática de colunas.
            </p>
          </div>
          <div className="p-3 bg-[#F7F6F3] rounded-xl space-y-1 border border-[#E3E7E5]">
            <span className="font-bold text-[#166A5A]">3. Mapear & Validar</span>
            <p className="text-[#667C78]">
              Confira os campos. Nome e Telefone são obrigatórios. Clique em "Validar dados".
            </p>
          </div>
          <div className="p-3 bg-[#F7F6F3] rounded-xl space-y-1 border border-[#E3E7E5]">
            <span className="font-bold text-[#166A5A]">4. Importar para o CRM</span>
            <p className="text-[#667C78]">
              Os contatos entram com a fase <strong>Prospecção</strong> para início da régua.
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
            {arquivo ? arquivo.name : 'Selecione ou arraste seu arquivo .csv/.xlsx'}
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
              {arquivo ? 'Trocar Arquivo' : 'Escolher Arquivo do MedX'}
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
                Associe as colunas do seu arquivo aos campos da Clínica Seleta.
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
                  <th className="py-2.5 px-3">Coluna no Arquivo MedX</th>
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
                    {registrosInvalidos} com erros (nome ou telefone ausentes)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {logErros.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadLog}
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
              <p className="font-bold">Migração concluída com sucesso!</p>
              <p>
                {resultado.importados} novos pacientes foram inseridos na base como{' '}
                <strong>Prospecção</strong> e já estão disponíveis no Funil e na lista de Pacientes.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
