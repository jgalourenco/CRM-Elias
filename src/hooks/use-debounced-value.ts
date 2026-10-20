import { useEffect, useState } from 'react'

/** Devolve `valor` somente depois de `atrasoMs` sem alterações (busca no servidor). */
export function useDebouncedValue<T>(valor: T, atrasoMs = 350): T {
  const [debounced, setDebounced] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(valor), atrasoMs)
    return () => clearTimeout(t)
  }, [valor, atrasoMs])
  return debounced
}
