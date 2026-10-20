import type { CSSProperties } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Atendimento, TipoAgendamento, TipoAtendimento } from '@/types/crm'

export const DURACAO_PADRAO_MIN = 30

export interface HorarioAgenda {
  horario_inicio: string
  horario_fim: string
  intervalo_min: number
}

export const HORARIO_AGENDA_PADRAO: HorarioAgenda = {
  horario_inicio: '07:00',
  horario_fim: '19:00',
  intervalo_min: 30,
}

/** Lista atendimentos já com expand de paciente, tipo de agendamento e setor. */
export async function listarAtendimentos(filter = '', sort = 'data_hora') {
  return await pb.collection('atendimentos').getFullList<Atendimento>({
    filter,
    sort,
    expand: 'paciente_id,tipo_agendamento_id,setor_id',
  })
}

/** Atendimentos de um dia local (para validar conflitos fora da lista carregada). */
export async function listarAtendimentosDoDia(dia: Date) {
  const ini = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate())
  const fim = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1)
  const fmt = (d: Date) => d.toISOString().replace('T', ' ')
  return await listarAtendimentos(`data_hora >= "${fmt(ini)}" && data_hora < "${fmt(fim)}"`)
}

export function normalizarTexto(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const ROTULOS_ENUM: Record<TipoAtendimento, string[]> = {
  Consulta: ['Consulta', 'Consulta Integrativa', 'Primeira Consulta'],
  Retorno: ['Retorno', 'Follow-up'],
  Aplicacao_APP: ['Aplicação APP'],
  Aplicacao_APP_AV: ['Aplicação APP + AV', 'Aplicação APP AV', 'Aplicação APP+AV'],
  Aplicacao_Manipulado: ['Aplicação Manipulado'],
  Outro: ['Outro', 'Outro Procedimento'],
}

/** Converte o nome de um tipo cadastrado para o enum fixo (ou 'Outro'). */
export function enumDoNomeTipo(nome: string): TipoAtendimento {
  const alvo = normalizarTexto(nome)
  for (const k of Object.keys(ROTULOS_ENUM) as TipoAtendimento[]) {
    if (ROTULOS_ENUM[k].some((r) => normalizarTexto(r) === alvo)) return k
  }
  return 'Outro'
}

/** Rótulo do tipo: nome do tipo cadastrado quando existir, senão o enum formatado. */
export function rotuloTipoAtendimento(
  at: Pick<Atendimento, 'tipo' | 'expand'>,
  formatarEnum: (t: TipoAtendimento) => string = (t) => t.replace(/_/g, ' '),
) {
  return at.expand?.tipo_agendamento_id?.nome || formatarEnum(at.tipo)
}

export function corTipoAtendimento(at: Pick<Atendimento, 'expand'>) {
  const c = at.expand?.tipo_agendamento_id?.cor
  return c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : undefined
}

export function duracaoDoAtendimento(at: Pick<Atendimento, 'duracao_min'>) {
  return at.duracao_min && at.duracao_min > 0 ? at.duracao_min : DURACAO_PADRAO_MIN
}

export function duracaoDoTipo(t?: TipoAgendamento) {
  return t?.duracao_min && t.duracao_min > 0 ? t.duracao_min : DURACAO_PADRAO_MIN
}

/** "HH:mm" para minutos desde a meia-noite (com fallback). */
export function paraMinutos(hhmm: string, fallback: number) {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '')
  if (!m) return fallback
  return Number(m[1]) * 60 + Number(m[2])
}

export function deMinutos(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

export function normalizarHorario(h: Partial<HorarioAgenda> | null | undefined): HorarioAgenda {
  const p = HORARIO_AGENDA_PADRAO
  const intervalo = Number(h?.intervalo_min)
  return {
    horario_inicio:
      h?.horario_inicio && /^\d{1,2}:\d{2}/.test(h.horario_inicio)
        ? h.horario_inicio
        : p.horario_inicio,
    horario_fim:
      h?.horario_fim && /^\d{1,2}:\d{2}/.test(h.horario_fim) ? h.horario_fim : p.horario_fim,
    intervalo_min: intervalo > 0 ? intervalo : p.intervalo_min,
  }
}

export function foraDoExpediente(inicio: Date, duracaoMin: number, horario: HorarioAgenda) {
  const ini = inicio.getHours() * 60 + inicio.getMinutes()
  const abre = paraMinutos(horario.horario_inicio, 7 * 60)
  const fecha = paraMinutos(horario.horario_fim, 19 * 60)
  return ini < abre || ini + duracaoMin > fecha
}

function mesmoProfissional(a?: string, b?: string) {
  return normalizarTexto(a || '') === normalizarTexto(b || '')
}

/** Atendimentos não cancelados do mesmo profissional que se sobrepõem ao intervalo informado. */
export function encontrarConflitos(
  atendimentos: Atendimento[],
  alvo: { inicio: Date; duracaoMin: number; profissional?: string; ignorarId?: string | null },
) {
  const ini = alvo.inicio.getTime()
  const fim = ini + alvo.duracaoMin * 60000
  return atendimentos.filter((a) => {
    if (a.id === alvo.ignorarId || a.status === 'Cancelado') return false
    if (!mesmoProfissional(a.profissional, alvo.profissional)) return false
    const aIni = new Date(a.data_hora).getTime()
    const aFim = aIni + duracaoDoAtendimento(a) * 60000
    return ini < aFim && aIni < fim
  })
}

/** Até `max` horários livres no dia (formato "HH:mm"), dentro do expediente. */
export function horariosLivres(
  atendimentos: Atendimento[],
  opts: {
    dia: Date
    profissional?: string
    duracaoMin: number
    horario: HorarioAgenda
    ignorarId?: string | null
    max?: number
  },
) {
  const { dia, horario } = opts
  const abre = paraMinutos(horario.horario_inicio, 7 * 60)
  const fecha = paraMinutos(horario.horario_fim, 19 * 60)
  const agora = new Date()
  const hoje =
    agora.getFullYear() === dia.getFullYear() &&
    agora.getMonth() === dia.getMonth() &&
    agora.getDate() === dia.getDate()
  const out: string[] = []
  for (let m = abre; m + opts.duracaoMin <= fecha; m += horario.intervalo_min) {
    if (out.length >= (opts.max ?? 8)) break
    const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, m)
    if (hoje && inicio <= agora) continue
    const conflito = encontrarConflitos(atendimentos, {
      inicio,
      duracaoMin: opts.duracaoMin,
      profissional: opts.profissional,
      ignorarId: opts.ignorarId,
    })
    if (conflito.length === 0) out.push(deMinutos(m))
  }
  return out
}

export interface FiltroAgenda {
  setorId?: string
  profissional?: string
}

export function filtrarAtendimentos(lista: Atendimento[], f: FiltroAgenda) {
  return lista.filter((a) => {
    if (f.setorId && a.setor_id !== f.setorId) return false
    if (f.profissional && !mesmoProfissional(a.profissional, f.profissional)) return false
    return true
  })
}

// ---- Cores ----

type Rgb = [number, number, number]

function hexParaRgb(hex: string): Rgb {
  const h = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#667C78'
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}

function luminancia([r, g, b]: Rgb) {
  const f = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contraste(a: Rgb, b: Rgb) {
  const la = luminancia(a)
  const lb = luminancia(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export type EstiloCor = Pick<CSSProperties, 'backgroundColor' | 'borderColor' | 'color'>

/** Fundo suave + borda na cor e texto escurecido até contraste >= 4,5. */
export function estiloDaCor(cor: string): EstiloCor {
  const rgb = hexParaRgb(cor)
  const fundo = rgb.map((v) => Math.round(v * 0.14 + 255 * 0.86)) as Rgb
  let texto = rgb
  for (let i = 0; i < 12 && contraste(texto, fundo) < 4.5; i++) {
    texto = texto.map((v) => Math.round(v * 0.85)) as Rgb
  }
  return {
    backgroundColor: `rgb(${fundo.join(',')})`,
    borderColor: `rgba(${rgb.join(',')},0.5)`,
    color: `rgb(${texto.join(',')})`,
  }
}

/** Mensagens de aviso (fora do expediente e conflitos) a confirmar antes de salvar. */
export function avisosDeAgendamento(opts: {
  inicio: Date
  duracaoMin: number
  profissional?: string
  ignorarId?: string | null
  atendimentos: Atendimento[]
  horario: HorarioAgenda
}) {
  const avisos: string[] = []
  if (foraDoExpediente(opts.inicio, opts.duracaoMin, opts.horario)) {
    avisos.push(
      `O horário escolhido está fora do horário de funcionamento da clínica (${opts.horario.horario_inicio} às ${opts.horario.horario_fim}).`,
    )
  }
  const conflitos = encontrarConflitos(opts.atendimentos, {
    inicio: opts.inicio,
    duracaoMin: opts.duracaoMin,
    profissional: opts.profissional,
    ignorarId: opts.ignorarId,
  })
  if (conflitos.length > 0) {
    const lista = conflitos
      .map((c) => {
        const hora = new Date(c.data_hora).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
        return `${c.expand?.paciente_id?.nome || 'Paciente'} (${hora})`
      })
      .join(', ')
    avisos.push(
      `Conflito de horário: ${opts.profissional || 'o profissional'} já tem atendimento sobreposto com ${lista}.`,
    )
  }
  return avisos
}
