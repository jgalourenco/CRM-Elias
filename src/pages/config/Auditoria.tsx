import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { auditoriaService } from '@/services/crm'
import type { AuditoriaEvento } from '@/types/crm'

const POR_PAGINA = 25

/** Escapa texto para uso dentro de aspas em filtros do PocketBase. */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

function montarFiltro(modulo: string, usuario: string, busca: string, de: string, ate: string) {
  const partes: string[] = []
  if (modulo.trim()) partes.push(`modulo ~ "${esc(modulo.trim())}"`)
  if (usuario.trim()) partes.push(`usuario ~ "${esc(usuario.trim())}"`)
  if (busca.trim()) partes.push(`descricao ~ "${esc(busca.trim())}"`)
  if (de) partes.push(`data >= "${de} 00:00:00"`)
  if (ate) partes.push(`data <= "${ate} 23:59:59"`)
  return partes.join(' && ')
}

const formatarData = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR')
}

/** Neutraliza injeção de fórmula em planilhas e escapa aspas. */
const celulaCsv = (v: string) => {
  const seguro = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
  return `"${seguro.replace(/"/g, '""')}"`
}

export default function Auditoria() {
  const { toast } = useToast()
  const [itens, setItens] = useState<AuditoriaEvento[]>([])
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [totalItens, setTotalItens] = useState(0)
  const [exportando, setExportando] = useState(false)

  const [modulo, setModulo] = useState('')
  const [usuario, setUsuario] = useState('')
  const [busca, setBusca] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  // Filtros aplicados (só mudam ao clicar em Filtrar).
  const [aplicado, setAplicado] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await auditoriaService.listPage(pagina, POR_PAGINA, aplicado)
      setItens(res.items)
      setTotalPaginas(Math.max(1, res.totalPages))
      setTotalItens(res.totalItems)
    } catch {
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os eventos de auditoria.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [pagina, aplicado, toast])

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
    setPagina(1)
    setAplicado(montarFiltro(modulo, usuario, busca, de, ate))
  }

  const limpar = () => {
    setModulo('')
    setUsuario('')
    setBusca('')
    setDe('')
    setAte('')
    setPagina(1)
    setAplicado('')
  }

  const exportarCsv = async () => {
    setExportando(true)
    try {
      const todos = await auditoriaService.list(aplicado)
      const linhas = [
        ['Módulo', 'Ação', 'Usuário', 'Descrição', 'Data'].map(celulaCsv).join(';'),
        ...todos.map((a) =>
          [a.modulo ?? '', a.acao ?? '', a.usuario ?? '', a.descricao ?? '', formatarData(a.data)]
            .map(celulaCsv)
            .join(';'),
        ),
      ]
      const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Exportação concluída', description: `${todos.length} eventos exportados.` })
    } catch {
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o arquivo CSV.',
        variant: 'destructive',
      })
    } finally {
      setExportando(false)
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
            Auditoria de Eventos
          </h1>
          <p className="text-sm text-[#667C78]">
            Histórico somente leitura das ações realizadas nas configurações do sistema.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={exportarCsv}
          disabled={exportando}
          className="rounded-xl text-xs gap-1.5"
        >
          {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar CSV
        </Button>
      </div>

      <form
        onSubmit={filtrar}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end rounded-xl border border-[#E3E7E5] bg-white p-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="a-modulo" className="text-xs font-semibold text-[#1C2B29]">
            Módulo
          </Label>
          <Input
            id="a-modulo"
            value={modulo}
            onChange={(e) => setModulo(e.target.value)}
            placeholder="Ex.: Procedimentos"
            className="rounded-xl border-[#E3E7E5]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-usuario" className="text-xs font-semibold text-[#1C2B29]">
            Usuário
          </Label>
          <Input
            id="a-usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="rounded-xl border-[#E3E7E5]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-de" className="text-xs font-semibold text-[#1C2B29]">
            De
          </Label>
          <Input
            id="a-de"
            type="date"
            value={de}
            onChange={(e) => setDe(e.target.value)}
            className="rounded-xl border-[#E3E7E5]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-ate" className="text-xs font-semibold text-[#1C2B29]">
            Até
          </Label>
          <Input
            id="a-ate"
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
            className="rounded-xl border-[#E3E7E5]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-busca" className="text-xs font-semibold text-[#1C2B29]">
            Descrição
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
            <Input
              id="a-busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar..."
              className="pl-9 rounded-xl border-[#E3E7E5]"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs"
          >
            Filtrar
          </Button>
          <Button type="button" variant="outline" onClick={limpar} className="rounded-xl text-xs">
            Limpar
          </Button>
        </div>
      </form>

      <div className="rounded-xl border border-[#E3E7E5] bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {['Módulo', 'Ação', 'Usuário', 'Descrição', 'Data'].map((h) => (
                <TableHead key={h} className="text-xs font-semibold text-[#1C2B29]">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-xs text-[#667C78]">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                  Carregando...
                </TableCell>
              </TableRow>
            ) : itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-xs text-[#667C78]">
                  Nenhum evento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              itens.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm">{a.modulo || '—'}</TableCell>
                  <TableCell className="text-sm">{a.acao || '—'}</TableCell>
                  <TableCell className="text-sm">{a.usuario || '—'}</TableCell>
                  <TableCell className="text-sm max-w-md truncate" title={a.descricao}>
                    {a.descricao || '—'}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{formatarData(a.data)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-[#667C78]">
        <span>
          {totalItens} {totalItens === 1 ? 'evento' : 'eventos'} • Página {pagina} de {totalPaginas}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pagina <= 1 || loading}
            onClick={() => setPagina((p) => p - 1)}
            className="rounded-xl gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pagina >= totalPaginas || loading}
            onClick={() => setPagina((p) => p + 1)}
            className="rounded-xl gap-1"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
