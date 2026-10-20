import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginacaoProps {
  page: number
  totalPages: number
  totalItems: number
  onChange: (page: number) => void
  loading?: boolean
  rotulo?: string
}

/** Controles anterior/próxima com o total de registros (paginação no servidor). */
export default function Paginacao({
  page,
  totalPages,
  totalItems,
  onChange,
  loading,
  rotulo = 'registros',
}: PaginacaoProps) {
  const paginas = Math.max(totalPages, 1)
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#E3E7E5] text-xs text-[#667C78]">
      <span>
        {totalItems} {totalItems === 1 ? rotulo.replace(/s$/, '') : rotulo}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading || page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-xl text-xs gap-1 h-8"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Anterior
        </Button>
        <span aria-live="polite">
          Página {Math.min(page, paginas)} de {paginas}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading || page >= paginas}
          onClick={() => onChange(page + 1)}
          className="rounded-xl text-xs gap-1 h-8"
        >
          Próxima <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
