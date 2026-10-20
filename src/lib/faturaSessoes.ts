import { registrarAuditoria, sessoesVendaService } from '@/services/crm'
import type { ItemFatura, Procedimento, SessaoVenda } from '@/types/crm'
import { escAspas, toPbDate } from '@/lib/financeiro'

export interface SessaoDesejada {
  procedimento_id: string
  nome: string
  quantidade: number
}

/** Item elegível: tem procedimento com `nr_sessoes > 0`. */
export function procedimentoElegivel(procs: Procedimento[], procedimentoId?: string) {
  if (!procedimentoId) return null
  const p = procs.find((x) => x.id === procedimentoId)
  return p && (p.nr_sessoes || 0) > 0 ? p : null
}

/**
 * Sessões desejadas a partir dos itens marcados. Itens do mesmo procedimento são somados:
 * quantidade = Σ(item.quantidade) × nr_sessoes.
 */
export function sessoesDesejadas(
  itens: (ItemFatura & { gerarSessoes?: boolean })[],
  procs: Procedimento[],
): SessaoDesejada[] {
  const mapa = new Map<string, SessaoDesejada>()
  for (const it of itens) {
    if (!it.gerarSessoes) continue
    const p = procedimentoElegivel(procs, it.procedimento_id)
    if (!p) continue
    const qtd = Math.floor(it.quantidade || 0) * Math.floor(p.nr_sessoes || 0)
    if (qtd <= 0) continue
    const atual = mapa.get(p.id)
    if (atual) atual.quantidade += qtd
    else mapa.set(p.id, { procedimento_id: p.id, nome: p.nome, quantidade: qtd })
  }
  return [...mapa.values()]
}

export async function sessoesDaFatura(faturaId: string): Promise<SessaoVenda[]> {
  return await sessoesVendaService.list(`fatura_id = "${escAspas(faturaId)}"`, 'created', '')
}

interface SincronizarArgs {
  fatura: { id: string; paciente_id: string; data: string }
  desejadas: SessaoDesejada[]
  /** Quando true (fatura cancelada/excluída), nenhuma sessão é mantida ou criada. */
  encerrar?: boolean
  motivo?: string
}

/**
 * Sincroniza as sessões geradas por uma fatura com o que ela passou a conter.
 * Sessões com realizadas > 0 nunca são removidas nem reduzidas abaixo do realizado.
 * Devolve os avisos para exibir ao usuário.
 */
export async function sincronizarSessoesDaFatura({
  fatura,
  desejadas,
  encerrar,
  motivo = 'Edição da fatura',
}: SincronizarArgs): Promise<string[]> {
  const avisos: string[] = []
  const existentes = await sessoesDaFatura(fatura.id)
  const alvo = new Map<string, SessaoDesejada>()
  if (!encerrar) for (const d of desejadas) alvo.set(d.procedimento_id, d)

  let criadas = 0
  let atualizadas = 0
  let removidas = 0

  for (const s of existentes) {
    const realizadas = s.realizadas || 0
    const nome = s.procedimento_nome || s.expand?.procedimento_id?.nome || 'Procedimento'
    const desejada = s.procedimento_id ? alvo.get(s.procedimento_id) : undefined
    if (!desejada) {
      if (realizadas === 0) {
        await sessoesVendaService.delete(s.id)
        removidas += 1
      } else {
        avisos.push(
          `${nome}: ${realizadas} sessão(ões) já realizada(s); o controle foi mantido e deve ser ajustado manualmente em Controle de Sessões.`,
        )
      }
      continue
    }
    alvo.delete(desejada.procedimento_id)
    let qtd = desejada.quantidade
    if (qtd < realizadas) {
      avisos.push(
        `${nome}: a quantidade não pode ficar abaixo das ${realizadas} sessão(ões) já realizada(s); mantida em ${realizadas}.`,
      )
      qtd = realizadas
    }
    if (
      qtd !== (s.quantidade || 0) ||
      s.paciente_id !== fatura.paciente_id ||
      (s.data_venda || '').slice(0, 10) !== fatura.data.slice(0, 10)
    ) {
      await sessoesVendaService.update(s.id, {
        paciente_id: fatura.paciente_id,
        data_venda: toPbDate(fatura.data.slice(0, 10)),
        procedimento_nome: desejada.nome,
        quantidade: qtd,
        concluida: realizadas >= qtd,
      })
      atualizadas += 1
    }
  }

  for (const d of alvo.values()) {
    await sessoesVendaService.create({
      fatura_id: fatura.id,
      paciente_id: fatura.paciente_id,
      procedimento_id: d.procedimento_id,
      procedimento_nome: d.nome,
      data_venda: toPbDate(fatura.data.slice(0, 10)),
      quantidade: d.quantidade,
      realizadas: 0,
      concluida: false,
    })
    criadas += 1
  }

  if (criadas + atualizadas + removidas > 0) {
    await registrarAuditoria(
      'Sessões',
      'Sincronizar com fatura',
      `${motivo}: ${criadas} criada(s), ${atualizadas} ajustada(s), ${removidas} removida(s)`,
    )
  }
  return avisos
}
