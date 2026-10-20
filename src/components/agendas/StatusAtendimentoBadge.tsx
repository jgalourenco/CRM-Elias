import type { ReactNode } from 'react'
import type { MapaCoresAgenda } from '@/pages/config/CoresAgenda'
import { CORES_AGENDA_PADRAO } from '@/pages/config/CoresAgenda'
import { estiloDaCor } from '@/lib/agenda'

interface Props {
  status: string
  cores: MapaCoresAgenda
  icon?: ReactNode
  className?: string
}

/** Chip de status usando nome e cor configurados em Cores da Agenda. */
export default function StatusAtendimentoBadge({ status, cores, icon, className = '' }: Props) {
  const cfg = cores[status] ?? CORES_AGENDA_PADRAO[status] ?? { nome: status, cor: '#667C78' }
  return (
    <span
      style={estiloDaCor(cfg.cor)}
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${className}`}
    >
      {icon}
      {cfg.nome}
    </span>
  )
}
