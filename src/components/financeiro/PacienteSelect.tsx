import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { norm } from '@/lib/financeiro'
import type { Paciente } from '@/types/crm'

interface Props {
  pacientes: Paciente[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  placeholder?: string
}

/** Select de paciente com campo de busca simples acima. */
export default function PacienteSelect({
  pacientes,
  value,
  onChange,
  disabled,
  placeholder = 'Selecione o paciente',
}: Props) {
  const [busca, setBusca] = useState('')

  const opcoes = useMemo(() => {
    const q = norm(busca)
    const filtrados = q
      ? pacientes.filter((p) => norm(p.nome).includes(q) || (p.cpf || '').includes(busca))
      : pacientes
    const lista = filtrados.slice(0, 100)
    const sel = pacientes.find((p) => p.id === value)
    if (sel && !lista.some((p) => p.id === sel.id)) lista.unshift(sel)
    return lista
  }, [pacientes, busca, value])

  return (
    <div className="space-y-1.5">
      {!disabled && (
        <Input
          placeholder="Buscar paciente por nome ou CPF..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="rounded-xl border-[#E3E7E5] h-9 text-xs"
          aria-label="Buscar paciente"
        />
      )}
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="rounded-xl border-[#E3E7E5]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {opcoes.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[#667C78]">Nenhum paciente encontrado.</div>
          ) : (
            opcoes.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
