import pb from '@/lib/pocketbase/client'
import { pacientesService } from '@/services/crm'
import type { ContaLancamento, Paciente, PagamentoLancamento } from '@/types/crm'

/** Itens por página nas listagens paginadas no servidor. */
export const POR_PAGINA = 25

export const brl = (v?: number | null) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const pad = (n: number) => String(n).padStart(2, '0')

/** yyyy-mm-dd no fuso local. */
export function dateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const hojeStr = () => dateStr(new Date())

export function diasAtrasStr(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return dateStr(d)
}

export function inicioMesStr(): string {
  const d = new Date()
  return dateStr(new Date(d.getFullYear(), d.getMonth(), 1))
}

/** Extrai yyyy-mm-dd de um valor de data do PocketBase. */
export const soData = (s?: string | null) => (s ? s.slice(0, 10) : '')

export function fmtData(s?: string | null): string {
  const d = soData(s)
  if (d.length !== 10) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

/** Converte yyyy-mm-dd em valor de data do PocketBase (meio-dia UTC evita virada de dia). */
export const toPbDate = (d: string) => `${d} 12:00:00.000Z`

/** Filtro PocketBase de intervalo de datas (inclusivo) sobre um campo date. */
export function filtroPeriodo(campo: string, de?: string, ate?: string): string {
  const parts: string[] = []
  if (de) parts.push(`${campo} >= "${de} 00:00:00"`)
  if (ate) parts.push(`${campo} <= "${ate} 23:59:59"`)
  return parts.join(' && ')
}

export function juntarFiltros(...fs: string[]): string {
  return fs.filter(Boolean).join(' && ')
}

export function baixarCsv(
  nome: string,
  linhas: (string | number | boolean | null | undefined)[][],
) {
  const esc = (v: string | number | boolean | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = '﻿' + linhas.map((l) => l.map(esc).join(';')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Carrega todos os pacientes (paginando) ordenados por nome. */
export async function listarTodosPacientes(filter = ''): Promise<Paciente[]> {
  const out: Paciente[] = []
  let page = 1
  for (;;) {
    const res = await pacientesService.list(page, 500, filter, 'nome')
    out.push(...res.items)
    if (page >= res.totalPages) break
    page += 1
  }
  return out
}

export const norm = (s?: string | null) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export function msgErro(e: unknown, padrao: string): string {
  return e instanceof Error && e.message ? e.message : padrao
}

/** Escapa barra invertida e aspas para uso dentro de um literal "..." de filtro do PocketBase. */
export const escAspas = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

interface OpcoesCarga {
  filter?: string
  sort?: string
  fields?: string
  expand?: string
}

/** Carrega todos os registros de uma coleção paginando em lotes (use `fields` para economizar). */
export async function carregarTudo<T>(colecao: string, opcoes: OpcoesCarga = {}): Promise<T[]> {
  const out: T[] = []
  let page = 1
  for (;;) {
    const res = await pb.collection(colecao).getList<T>(page, 500, {
      ...(opcoes.filter ? { filter: opcoes.filter } : {}),
      ...(opcoes.sort ? { sort: opcoes.sort } : {}),
      ...(opcoes.fields ? { fields: opcoes.fields } : {}),
      ...(opcoes.expand ? { expand: opcoes.expand } : {}),
    })
    out.push(...res.items)
    if (page >= res.totalPages) break
    page += 1
  }
  return out
}

/** Ids de pacientes cujo nome contém o texto (limite de 200). */
export async function idsPacientesPorNome(texto: string): Promise<string[]> {
  const q = texto.trim()
  if (!q) return []
  const res = await pb.collection('pacientes').getList<{ id: string }>(1, 200, {
    filter: `nome ~ "${escAspas(q)}"`,
    fields: 'id',
  })
  return res.items.map((p) => p.id)
}

/** Condição de filtro `campo = id1 || campo = id2 ...` (ou condição falsa quando não há ids). */
export function filtroPorIds(campo: string, ids: string[]): string {
  if (ids.length === 0) return `${campo} = "__sem_resultado__"`
  return `(${ids.map((id) => `${campo} = "${escAspas(id)}"`).join(' || ')})`
}

/** Mapa id → nome de pacientes (consulta em lotes por id). */
export async function nomesPacientes(ids: string[]): Promise<Record<string, string>> {
  const unicos = [...new Set(ids.filter(Boolean))]
  const out: Record<string, string> = {}
  for (let i = 0; i < unicos.length; i += 50) {
    const lote = unicos.slice(i, i + 50)
    const res = await pb.collection('pacientes').getList<{ id: string; nome: string }>(1, 50, {
      filter: lote.map((id) => `id = "${escAspas(id)}"`).join(' || '),
      fields: 'id,nome',
    })
    for (const p of res.items) out[p.id] = p.nome
  }
  return out
}

/**
 * Histórico de pagamentos de um lançamento. Registros antigos com `pago > 0` e sem
 * `pagamentos` ganham uma baixa inicial implícita (sem reescrever o registro).
 */
export function historicoPagamentos(l: ContaLancamento): PagamentoLancamento[] {
  const p = Array.isArray(l.pagamentos) ? l.pagamentos : []
  if (p.length === 0 && (l.pago || 0) > 0) {
    return [
      {
        data: l.updated || l.created,
        valor: l.pago || 0,
        tipo: 'baixa',
        conta_id: l.conta_id,
        observacao: 'Baixa anterior (sem detalhamento)',
      },
    ]
  }
  return p
}

/** Soma das baixas menos estornos, nunca menor que zero nem maior que o valor do lançamento. */
export function totalPago(pagamentos: PagamentoLancamento[], valor: number): number {
  const soma = pagamentos.reduce(
    (s, p) => s + (p.tipo === 'estorno' ? -(p.valor || 0) : p.valor || 0),
    0,
  )
  return Math.min(Math.max(Math.round(soma * 100) / 100, 0), Math.max(valor || 0, 0))
}
