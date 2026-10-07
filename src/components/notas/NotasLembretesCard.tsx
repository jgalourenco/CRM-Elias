import React, { useState } from 'react'
import { Nota, Usuario } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Check,
} from 'lucide-react'

interface NotasLembretesCardProps {
  notas: Nota[]
  usuarios?: Usuario[]
  currentUserId?: string
  onCriarNota: (nota: { memo: string; data: string; usuario_id?: string }) => Promise<void>
  onAtualizarNota: (id: string, data: Partial<Nota>) => Promise<void>
  onExcluirNota: (id: string) => Promise<void>
  className?: string
}

/**
 * Classificação MedX de tempo:
 * 'hoje' | 'atrasadas' | 'futuras'
 */
export function classificarDataNota(dataIso: string): 'hoje' | 'atrasadas' | 'futuras' {
  const d = new Date(dataIso)
  const now = new Date()

  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()

  if (isToday) return 'hoje'
  if (d < now) return 'atrasadas'
  return 'futuras'
}

export function formatarTempoRelativo(dataIso: string) {
  const d = new Date(dataIso)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffHoras = Math.round(diffMs / (1000 * 60 * 60))
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (classificarDataNota(dataIso) === 'hoje') {
    return `Hoje às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }
  if (diffDias === -1) {
    return 'Ontem'
  }
  if (diffDias === 1) {
    return 'Amanhã'
  }
  if (diffDias < 0) {
    return `${Math.abs(diffDias)} dias atrás`
  }
  return `em ${diffDias} dias`
}

export default function NotasLembretesCard({
  notas,
  usuarios = [],
  currentUserId,
  onCriarNota,
  onAtualizarNota,
  onExcluirNota,
  className = '',
}: NotasLembretesCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState<'Nova Nota' | 'Editar Nota'>('Nova Nota')
  const [editId, setEditId] = useState<string | null>(null)

  const [memo, setMemo] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [concluido, setConcluido] = useState(false)
  const [usuarioId, setUsuarioId] = useState(currentUserId || '')
  const [salvando, setSalvando] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'pendentes' | 'concluidas'>(
    'pendentes',
  )

  const abrirNovaNota = () => {
    setModalTitle('Nova Nota')
    setEditId(null)
    setMemo('')
    const nowIso = new Date().toISOString().slice(0, 16)
    setDataHora(nowIso)
    setConcluido(false)
    setUsuarioId(currentUserId || '')
    setModalOpen(true)
  }

  const abrirEditarNota = (nota: Nota) => {
    setModalTitle('Editar Nota')
    setEditId(nota.id)
    setMemo(nota.memo)
    setDataHora(nota.data ? new Date(nota.data).toISOString().slice(0, 16) : '')
    setConcluido(!!nota.concluido)
    setUsuarioId(nota.usuario_id || currentUserId || '')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memo.trim() || !dataHora) return

    setSalvando(true)
    try {
      if (editId) {
        await onAtualizarNota(editId, {
          memo: memo.trim(),
          data: new Date(dataHora).toISOString(),
          concluido,
          usuario_id: usuarioId || undefined,
        })
      } else {
        await onCriarNota({
          memo: memo.trim(),
          data: new Date(dataHora).toISOString(),
          usuario_id: usuarioId || undefined,
        })
      }
      setModalOpen(false)
    } finally {
      setSalvando(false)
    }
  }

  const handleToggleConcluido = async (nota: Nota) => {
    await onAtualizarNota(nota.id, { concluido: !nota.concluido })
  }

  // Ordenação por data (como no MedX: orderBy: 'Data')
  const notasOrdenadas = [...notas].sort(
    (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
  )

  const notasFiltradas = notasOrdenadas.filter((n) => {
    if (filtroStatus === 'pendentes') return !n.concluido
    if (filtroStatus === 'concluidas') return !!n.concluido
    return true
  })

  const contagemAtrasadas = notas.filter(
    (n) => !n.concluido && classificarDataNota(n.data) === 'atrasadas',
  ).length
  const contagemHoje = notas.filter(
    (n) => !n.concluido && classificarDataNota(n.data) === 'hoje',
  ).length

  return (
    <Card
      className={`rounded-2xl border-[#E3E7E5] bg-white shadow-xs overflow-hidden ${className}`}
    >
      {/* Header do Bloco */}
      <CardHeader className="p-5 pb-3 border-b border-[#E3E7E5]/70 bg-gradient-to-r from-amber-500/5 via-white to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-50 text-[#C9A227] flex items-center justify-center border border-amber-200">
                <Bell className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-bold text-[#1C2B29] flex items-center gap-2">
                Notas & Lembretes
                {contagemAtrasadas > 0 && (
                  <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 text-[10px] font-bold px-1.5 py-0 border-rose-200">
                    {contagemAtrasadas} atrasadas
                  </Badge>
                )}
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-[#667C78]">
              Lembretes rápidos operacionais por usuário
            </CardDescription>
          </div>

          <Button
            size="sm"
            onClick={abrirNovaNota}
            className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova Nota
          </Button>
        </div>

        {/* Filtros rápidos */}
        <div className="flex items-center justify-between pt-2 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFiltroStatus('pendentes')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filtroStatus === 'pendentes'
                  ? 'bg-[#166A5A] text-white'
                  : 'text-[#667C78] hover:bg-gray-100'
              }`}
            >
              Pendentes ({notas.filter((n) => !n.concluido).length})
            </button>
            <button
              onClick={() => setFiltroStatus('todas')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filtroStatus === 'todas'
                  ? 'bg-[#166A5A] text-white'
                  : 'text-[#667C78] hover:bg-gray-100'
              }`}
            >
              Todas ({notas.length})
            </button>
            <button
              onClick={() => setFiltroStatus('concluidas')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filtroStatus === 'concluidas'
                  ? 'bg-[#166A5A] text-white'
                  : 'text-[#667C78] hover:bg-gray-100'
              }`}
            >
              Concluídas ({notas.filter((n) => n.concluido).length})
            </button>
          </div>

          {contagemHoje > 0 && (
            <span className="text-[11px] text-amber-700 font-medium">{contagemHoje} para hoje</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {notasFiltradas.length === 0 ? (
          <div className="py-10 px-4 text-center space-y-2">
            <Clock className="h-8 w-8 text-[#C9A227] mx-auto opacity-40" />
            <p className="text-xs text-[#667C78]">Nenhum lembrete nesta visualização.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={abrirNovaNota}
              className="text-xs rounded-xl border-[#E3E7E5]"
            >
              Criar Primeiro Lembrete
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[#E3E7E5]/70 max-h-[360px] overflow-y-auto">
            {notasFiltradas.map((nota) => {
              const statusClass = classificarDataNota(nota.data)
              const isAtrasada = !nota.concluido && statusClass === 'atrasadas'
              const isHoje = !nota.concluido && statusClass === 'hoje'

              return (
                <div
                  key={nota.id}
                  className={`p-3.5 transition-colors flex items-start justify-between gap-3 group ${
                    nota.concluido
                      ? 'bg-gray-50/70 opacity-60'
                      : isAtrasada
                        ? 'bg-rose-50/50 border-l-4 border-l-rose-500'
                        : isHoje
                          ? 'bg-amber-50/40 border-l-4 border-l-[#C9A227]'
                          : 'bg-white hover:bg-[#F7F6F3]/60'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Checkbox de Conclusão rápida */}
                    <div className="pt-0.5">
                      <Checkbox
                        checked={!!nota.concluido}
                        onCheckedChange={() => handleToggleConcluido(nota)}
                        className="data-[state=checked]:bg-[#166A5A] data-[state=checked]:border-[#166A5A]"
                      />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <p
                        onClick={() => abrirEditarNota(nota)}
                        className={`text-xs font-semibold cursor-pointer hover:text-[#166A5A] transition-colors ${
                          nota.concluido
                            ? 'line-through text-[#667C78]'
                            : isAtrasada
                              ? 'text-rose-900 font-bold'
                              : 'text-[#1C2B29]'
                        }`}
                      >
                        {nota.memo}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-[#667C78] flex-wrap">
                        {/* Estado visual MedX: hoje / atrasadas / futuras */}
                        {nota.concluido ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-gray-100 text-gray-600"
                          >
                            Concluída
                          </Badge>
                        ) : isAtrasada ? (
                          <Badge className="text-[10px] bg-rose-100 text-rose-700 border-rose-200">
                            <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                            Atrasada
                          </Badge>
                        ) : isHoje ? (
                          <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">
                            <Clock className="h-2.5 w-2.5 mr-1" />
                            Para Hoje
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-sky-700 border-sky-200 bg-sky-50"
                          >
                            Futura
                          </Badge>
                        )}

                        <span>•</span>
                        <span>{formatarTempoRelativo(nota.data)}</span>

                        {nota.expand?.usuario_id?.name && (
                          <>
                            <span>•</span>
                            <span className="text-[#166A5A]">{nota.expand.usuario_id.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações de Edição e Exclusão */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => abrirEditarNota(nota)}
                      className="h-7 w-7 text-[#667C78] hover:text-[#166A5A] rounded-lg"
                      title="Editar Nota"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Deseja excluir este lembrete?')) {
                          onExcluirNota(nota.id)
                        }
                      }}
                      className="h-7 w-7 text-[#667C78] hover:text-rose-600 rounded-lg"
                      title="Excluir Nota"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Modal CRUD Completo de Notas (Popup estilo MedX) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29] flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#C9A227]" />
              {modalTitle}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Lembrete / Descrição</Label>
              <Textarea
                required
                rows={3}
                placeholder="Descreva a nota ou ação a ser lembrada..."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="rounded-xl border-[#E3E7E5] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Data e Horário</Label>
              <Input
                type="datetime-local"
                required
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
                className="rounded-xl border-[#E3E7E5] text-xs"
              />
            </div>

            {usuarios.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Usuário Destinado</Label>
                <select
                  value={usuarioId}
                  onChange={(e) => setUsuarioId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-[#E3E7E5] bg-white px-3 text-xs text-[#1C2B29]"
                >
                  <option value="">Geral / Qualquer usuário</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="checkConcluido"
                checked={concluido}
                onCheckedChange={(checked) => setConcluido(!!checked)}
              />
              <Label htmlFor="checkConcluido" className="text-xs text-[#1C2B29] cursor-pointer">
                Marcar como concluído
              </Label>
            </div>

            <DialogFooter className="gap-2 pt-2">
              {editId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (confirm('Deseja excluir esta nota?')) {
                      await onExcluirNota(editId)
                      setModalOpen(false)
                    }
                  }}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl text-xs mr-auto"
                >
                  Excluir
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold"
              >
                {salvando ? 'Salvando...' : 'Salvar Nota'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
