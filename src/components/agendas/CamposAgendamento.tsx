import { useEffect, useMemo, useState } from 'react'
import { Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Atendimento, SetorAgenda, TipoAgendamento, TipoAtendimento } from '@/types/crm'
import {
  DURACAO_PADRAO_MIN,
  duracaoDoTipo,
  enumDoNomeTipo,
  horariosLivres,
  listarAtendimentosDoDia,
  type HorarioAgenda,
} from '@/lib/agenda'

const SEM_SETOR = '__sem_setor__'

interface SeletorTipoSetorProps {
  tipos: TipoAgendamento[]
  setores: SetorAgenda[]
  tipoAgendamentoId: string
  onTipoAgendamentoId: (id: string) => void
  tipo: TipoAtendimento
  onTipo: (t: TipoAtendimento) => void
  setorId: string
  onSetorId: (id: string) => void
  duracao: number
  onDuracao: (n: number) => void
}

/** Tipo (cadastrado ou fixo, como fallback), setor opcional e duração do agendamento. */
export function SeletorTipoSetor({
  tipos,
  setores,
  tipoAgendamentoId,
  onTipoAgendamentoId,
  tipo,
  onTipo,
  setorId,
  onSetorId,
  duracao,
  onDuracao,
}: SeletorTipoSetorProps) {
  const escolherTipoCadastrado = (id: string) => {
    onTipoAgendamentoId(id)
    const t = tipos.find((x) => x.id === id)
    if (t) {
      onTipo(enumDoNomeTipo(t.nome))
      onDuracao(duracaoDoTipo(t))
    }
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-[#1C2B29]">Tipo de Atendimento</Label>
        {tipos.length > 0 ? (
          <Select value={tipoAgendamentoId} onValueChange={escolherTipoCadastrado}>
            <SelectTrigger className="rounded-xl border-[#E3E7E5]">
              <SelectValue placeholder="Selecione o tipo de agendamento..." />
            </SelectTrigger>
            <SelectContent>
              {tipos.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    {t.cor && (
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: t.cor }}
                        aria-hidden="true"
                      />
                    )}
                    {t.nome}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={tipo} onValueChange={(v: TipoAtendimento) => onTipo(v)}>
            <SelectTrigger className="rounded-xl border-[#E3E7E5]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Consulta">Consulta (Primeira Consulta)</SelectItem>
              <SelectItem value="Retorno">Retorno (Follow-up)</SelectItem>
              <SelectItem value="Aplicacao_APP">Aplicação APP</SelectItem>
              <SelectItem value="Aplicacao_APP_AV">Aplicação APP + AV (Venosa)</SelectItem>
              <SelectItem value="Aplicacao_Manipulado">Aplicação Manipulado</SelectItem>
              <SelectItem value="Outro">Outro Procedimento</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#1C2B29]">Setor (opcional)</Label>
          <Select
            value={setorId || SEM_SETOR}
            onValueChange={(v) => onSetorId(v === SEM_SETOR ? '' : v)}
          >
            <SelectTrigger className="rounded-xl border-[#E3E7E5]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_SETOR}>Sem setor</SelectItem>
              {setores.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-[#1C2B29]">Duração (min)</Label>
          <Input
            type="number"
            min={5}
            step={5}
            value={duracao}
            onChange={(e) => onDuracao(Number(e.target.value) || DURACAO_PADRAO_MIN)}
            className="rounded-xl border-[#E3E7E5]"
          />
        </div>
      </div>
    </>
  )
}

interface HorariosLivresProps {
  /** Valor do input datetime-local (YYYY-MM-DDTHH:mm). */
  dataHora: string
  onEscolher: (novoValor: string) => void
  profissional: string
  duracao: number
  horario: HorarioAgenda
  ignorarId?: string | null
  /** Lista já carregada; se omitida, os atendimentos do dia são buscados. */
  atendimentos?: Atendimento[]
}

/** Até 8 horários livres do profissional na data escolhida. */
export function HorariosLivresSugeridos({
  dataHora,
  onEscolher,
  profissional,
  duracao,
  horario,
  ignorarId,
  atendimentos,
}: HorariosLivresProps) {
  const [doDia, setDoDia] = useState<Atendimento[]>([])
  const dataParte = dataHora.slice(0, 10)

  useEffect(() => {
    if (atendimentos || !/^\d{4}-\d{2}-\d{2}$/.test(dataParte)) return
    let ativo = true
    const [y, m, d] = dataParte.split('-').map(Number)
    listarAtendimentosDoDia(new Date(y, m - 1, d))
      .then((r) => {
        if (ativo) setDoDia(r)
      })
      .catch(() => {
        if (ativo) setDoDia([])
      })
    return () => {
      ativo = false
    }
  }, [atendimentos, dataParte])

  const fonte = atendimentos ?? doDia
  const livres = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataParte)) return []
    const [y, m, d] = dataParte.split('-').map(Number)
    return horariosLivres(fonte, {
      dia: new Date(y, m - 1, d),
      profissional,
      duracaoMin: duracao,
      horario,
      ignorarId,
      max: 8,
    })
  }, [fonte, dataParte, profissional, duracao, horario, ignorarId])

  return (
    <div className="p-3 rounded-xl bg-[#F7F6F3] border border-[#E3E7E5] space-y-2">
      <Label className="text-xs font-semibold text-[#1C2B29] flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-[#166A5A]" />
        Horários livres sugeridos
      </Label>
      {livres.length === 0 ? (
        <p className="text-[11px] text-[#667C78]">
          Nenhum horário livre encontrado para {profissional || 'o profissional'} nesta data.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {livres.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => onEscolher(`${dataParte}T${h}`)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                dataHora.slice(11, 16) === h
                  ? 'bg-[#166A5A] text-white border-[#166A5A]'
                  : 'bg-white text-[#166A5A] border-[#166A5A]/30 hover:bg-[#E2F0EB]'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
