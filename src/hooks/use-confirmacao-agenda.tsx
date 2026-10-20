import { useCallback, useRef, useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface EstadoConfirmacao {
  titulo: string
  mensagens: string[]
}

/** Confirmação assíncrona em AlertDialog: `await confirmar(titulo, mensagens)` devolve true/false. */
export function useConfirmacaoAgenda(): {
  confirmar: (titulo: string, mensagens: string[]) => Promise<boolean>
  dialog: ReactNode
} {
  const [estado, setEstado] = useState<EstadoConfirmacao | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirmar = useCallback(
    (titulo: string, mensagens: string[]) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve
        setEstado({ titulo, mensagens })
      }),
    [],
  )

  const fechar = (valor: boolean) => {
    resolver.current?.(valor)
    resolver.current = null
    setEstado(null)
  }

  const dialog = (
    <AlertDialog
      open={estado !== null}
      onOpenChange={(aberto) => {
        if (!aberto) fechar(false)
      }}
    >
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#1C2B29]">{estado?.titulo}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-[#667C78]">
              {estado?.mensagens.map((m) => <p key={m}>{m}</p>)}
              <p className="font-semibold text-[#1C2B29]">Deseja salvar mesmo assim?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl" onClick={() => fechar(false)}>
            Voltar
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-xl bg-[#166A5A] text-white hover:bg-[#0F5145]"
            onClick={() => fechar(true)}
          >
            Salvar mesmo assim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { confirmar, dialog }
}
