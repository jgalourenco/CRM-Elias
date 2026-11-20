import React, { useState } from 'react'
import { Automacao } from '@/types/crm'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MessageCircle, Mail, Bell, Clock, ArrowRight, Workflow } from 'lucide-react'

/**
 * Fluxograma visual dos 5 fluxos de atendimento (régua).
 * Somente visual: clicar em um nó destaca a automação correspondente na régua.
 * Ambiente de construção — definido pelo usuário: fica como aba da Régua de Atendimento.
 */

interface FluxoDef {
  id: string
  titulo: string
  cor: string
  corBorda: string
  desc: string
  /** nomes de automações (banco) em ordem de gatilho */
  nos: { nome: string; interno?: boolean; desc: string }[]
}

const FLUXOS: FluxoDef[] = [
  {
    id: 'prospeccao',
    titulo: '1. Prospecção',
    cor: 'bg-emerald-50',
    corBorda: 'border-emerald-200',
    desc: 'Do primeiro contato ao fechamento ou encerramento educativo',
    nos: [
      { nome: 'Boas-vindas', desc: 'Novo lead no funil' },
      { nome: 'Boas-vindas v2', desc: 'Variação A/B' },
      { nome: 'Reengajamento', desc: 'D+2 sem resposta' },
      { nome: 'Encerramento', desc: 'D+5 sem conversão' },
    ],
  },
  {
    id: 'primeira_consulta',
    titulo: '2. Antes da 1ª Consulta',
    cor: 'bg-teal-50',
    corBorda: 'border-teal-200',
    desc: 'Confirmação antecipada + alerta interno de recepção',
    nos: [
      { nome: 'Confirmação D-4', desc: '4 dias antes' },
      { nome: 'Confirmação D-1', desc: '1 dia antes' },
      { nome: 'Alerta interno', interno: true, desc: 'D-0, 5 min antes' },
    ],
  },
  {
    id: 'pos_primeira',
    titulo: '3. Pós-1ª Consulta',
    cor: 'bg-blue-50',
    corBorda: 'border-blue-200',
    desc: 'Satisfação, retorno e exames laboratoriais',
    nos: [
      { nome: 'CSAT', desc: 'No dia da consulta' },
      { nome: 'Alerta interno de retorno', interno: true, desc: 'Equipe agenda o retorno' },
      { nome: 'Exames', desc: 'D+5 — lembrar exames' },
    ],
  },
  {
    id: 'antes_retorno',
    titulo: '4. Antes do Retorno',
    cor: 'bg-amber-50',
    corBorda: 'border-amber-200',
    desc: 'Confirmação antecipada + pergunta de presença',
    nos: [
      { nome: 'Confirmação D-4', desc: '4 dias antes' },
      { nome: 'Confirmação D-1', desc: '1 dia antes' },
      { nome: 'Pergunta 5 min antes', desc: 'Paciente confirmou presença?' },
    ],
  },
  {
    id: 'pos_retorno',
    titulo: '5. Pós-Retorno',
    cor: 'bg-purple-50',
    corBorda: 'border-purple-200',
    desc: 'Manipulados prontos e orientações de uso',
    nos: [{ nome: 'Manipulados', desc: 'D+5 — avisar que está pronto' }],
  },
]

function formatarTiming(minutos?: number) {
  if (!minutos) return 'Imediato'
  const abs = Math.abs(minutos)
  if (abs % 1440 === 0) {
    const dias = abs / 1440
    return minutos < 0 ? `${dias} dia(s) antes` : `${dias} dia(s) após`
  }
  if (abs >= 60 && abs % 60 === 0) {
    const horas = abs / 60
    return minutos < 0 ? `${horas}h antes` : `${horas}h após`
  }
  return minutos < 0 ? `${abs} min antes` : `${abs} min após`
}

interface Props {
  automacoes: Automacao[]
  onSelecionarNo?: (aut: Automacao) => void
}

export default function FluxosRegua({ automacoes, onSelecionarNo }: Props) {
  const [noAtivo, setNoAtivo] = useState<string | null>(null)

  // Associa cada nó do fluxo às automações reais do banco por palavra-chave do nome
  const resolverAutomacoes = (fluxo: FluxoDef, no: FluxoDef['nos'][number]) => {
    const doFluxo = automacoes.filter((a) => {
      switch (fluxo.id) {
        case 'prospeccao':
          return a.fase_roadmap === 'Prospeccao'
        case 'primeira_consulta':
          return a.fase_roadmap === 'Primeira_consulta_v1' || a.fase_roadmap === 'Primeira_consulta'
        case 'pos_primeira':
          return a.fase_roadmap === 'Pos_primeira_consulta'
        case 'antes_retorno':
          return a.fase_roadmap === 'Antes_retorno'
        case 'pos_retorno':
          return a.fase_roadmap === 'Pos_retorno'
        default:
          return false
      }
    })

    const nomeNo = no.nome.toLowerCase()
    const candidatas = doFluxo.filter((a) => {
      const nome = a.nome.toLowerCase()
      if (no.interno) return nome.includes('interno') || nome.includes('não chegou')
      if (nomeNo.includes('boas-vindas')) return nome.includes('boas-vindas')
      if (nomeNo.includes('reengajamento')) return nome.includes('reengajamento')
      if (nomeNo.includes('encerramento')) return nome.includes('encerramento')
      if (nomeNo.includes('csat')) return nome.includes('csat') || nome.includes('satisfa')
      if (nomeNo.includes('exames')) return nome.includes('exame')
      if (nomeNo.includes('manipulados')) return nome.includes('manipulado')
      if (nomeNo.includes('d-4')) return nome.includes('d-4') || nome.includes('4 dias')
      if (nomeNo.includes('d-1')) return nome.includes('d-1') || nome.includes('1 dia')
      if (nomeNo.includes('5 min')) return nome.includes('5 min')
      return false
    })

    // fallback: se nada casou, usa as que sobraram do fluxo na ordem
    if (candidatas.length === 0 && doFluxo.length > 0) return doFluxo
    return candidatas
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-5">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center shrink-0">
            <Workflow className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#1C2B29]">
              Fluxograma dos Gatilhos de Comunicação
            </h2>
            <p className="text-xs text-[#667C78] leading-relaxed">
              Visão visual dos 5 fluxos da régua. Clique em um nó para destacar a automação
              correspondente.{' '}
              <Badge className="bg-[#FBF3D9] text-[#A5831D] text-[10px] font-bold gap-1 ml-1">
                <Bell className="h-3 w-3" /> Interno = alerta da equipe (não vai ao paciente)
              </Badge>
            </p>
          </div>
        </div>
      </Card>

      {FLUXOS.map((fluxo) => (
        <Card key={fluxo.id} className={cn('rounded-2xl border shadow-xs p-5', fluxo.corBorda)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#1C2B29]">{fluxo.titulo}</h3>
              <p className="text-xs text-[#667C78]">{fluxo.desc}</p>
            </div>
          </div>

          {/* Diagrama horizontal: nós ligados por setas */}
          <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
            {fluxo.nos.map((no, idx) => {
              const autos = resolverAutomacoes(fluxo, no)
              const chave = `${fluxo.id}_${idx}`
              const ativo = noAtivo === chave

              return (
                <React.Fragment key={chave}>
                  {idx > 0 && (
                    <div className="flex items-center px-1 shrink-0">
                      <ArrowRight className="h-4 w-4 text-[#667C78]/60" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setNoAtivo(ativo ? null : chave)
                      if (!ativo && autos.length > 0 && onSelecionarNo) {
                        onSelecionarNo(autos[0])
                      }
                    }}
                    className={cn(
                      'flex-1 min-w-[150px] text-left rounded-xl border-2 p-3 transition-all',
                      fluxo.cor,
                      ativo
                        ? 'border-[#166A5A] shadow-md ring-2 ring-[#166A5A]/20 scale-[1.02]'
                        : 'border-transparent hover:border-[#166A5A]/30',
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-[#1C2B29] leading-tight">
                        {no.nome}
                      </span>
                      {no.interno && (
                        <Badge className="bg-[#C9A227]/15 text-[#A5831D] text-[9px] font-bold gap-0.5">
                          <Bell className="h-2.5 w-2.5" />
                          Interno
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-[#667C78] leading-snug">{no.desc}</p>

                    {autos.length > 0 && (
                      <div className="mt-2 space-y-1 border-t border-white/60 pt-1.5">
                        {autos.slice(0, 2).map((a) => (
                          <div key={a.id} className="flex items-center gap-1 text-[9px]">
                            {a.canal === 'WhatsApp' ? (
                              <MessageCircle className="h-2.5 w-2.5 text-[#25D366]" />
                            ) : (
                              <Mail className="h-2.5 w-2.5 text-[#2E7FA3]" />
                            )}
                            <span className="text-[#667C78] truncate">
                              {formatarTiming(a.atraso_minutos)}
                            </span>
                            {(a.ativo === false || a.interno) && (
                              <Clock className="h-2.5 w-2.5 text-[#667C78]/50" />
                            )}
                          </div>
                        ))}
                        {autos.length > 2 && (
                          <span className="text-[9px] text-[#667C78]">
                            +{autos.length - 2} automação(ões)
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                </React.Fragment>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}
