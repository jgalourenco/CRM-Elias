import { EVENTO_FAVORITOS } from '@/lib/modulosFavoritos'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { parametrosService, registrarAuditoria } from '@/services/crm'

interface ParamAgenda {
  horario_inicio: string
  horario_fim: string
  intervalo_min: number
}
interface ParamClinica {
  nome: string
  pais: string
  ddd: string
  telefone: string
  email: string
}
interface ParamFavoritos {
  modulos: string[]
}

const LIMITE_SMS = 142

const MODULOS = [
  'Hoje',
  'Pacientes',
  'Agenda',
  'Prontuário',
  'Exames',
  'Mensagens',
  'Marketing',
  'Financeiro',
  'Estoque',
  'Indicadores',
]

const AGENDA_PADRAO: ParamAgenda = { horario_inicio: '07:00', horario_fim: '19:00', intervalo_min: 30 }
const CLINICA_PADRAO: ParamClinica = {
  nome: '',
  pais: 'Brasil',
  ddd: '',
  telefone: '',
  email: '',
}

export default function ParametrosGerais() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [agenda, setAgenda] = useState<ParamAgenda>(AGENDA_PADRAO)
  const [clinica, setClinica] = useState<ParamClinica>(CLINICA_PADRAO)
  const [favoritos, setFavoritos] = useState<string[]>([])

  useEffect(() => {
    let ativo = true
    ;(async () => {
      try {
        const [a, c, f] = await Promise.all([
          parametrosService.get<ParamAgenda>('agenda'),
          parametrosService.get<ParamClinica>('clinica'),
          parametrosService.get<ParamFavoritos>('modulos_favoritos'),
        ])
        if (!ativo) return
        if (a) setAgenda({ ...AGENDA_PADRAO, ...a })
        if (c) setClinica({ ...CLINICA_PADRAO, ...c })
        if (f && Array.isArray(f.modulos)) setFavoritos(f.modulos)
      } catch {
        if (ativo)
          toast({
            title: 'Erro ao carregar',
            description: 'Não foi possível carregar os parâmetros.',
            variant: 'destructive',
          })
      } finally {
        if (ativo) setLoading(false)
      }
    })()
    return () => {
      ativo = false
    }
  }, [toast])

  const alternarFavorito = (m: string, marcado: boolean) =>
    setFavoritos((atual) => (marcado ? [...new Set([...atual, m])] : atual.filter((x) => x !== m)))

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agenda.horario_inicio || !agenda.horario_fim || agenda.horario_inicio >= agenda.horario_fim) {
      toast({
        title: 'Horário inválido',
        description: 'O horário de início deve ser anterior ao de término.',
        variant: 'destructive',
      })
      return
    }
    if (!Number.isFinite(agenda.intervalo_min) || agenda.intervalo_min < 5) {
      toast({
        title: 'Intervalo inválido',
        description: 'Informe um intervalo de pelo menos 5 minutos.',
        variant: 'destructive',
      })
      return
    }
    if (!clinica.nome.trim()) {
      toast({
        title: 'Nome da clínica obrigatório',
        description: 'Informe o nome da clínica.',
        variant: 'destructive',
      })
      return
    }
    if (clinica.nome.length > LIMITE_SMS) {
      toast({
        title: 'Nome muito longo',
        description: `O nome entra na mensagem de SMS (limite de ${LIMITE_SMS} caracteres).`,
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      await Promise.all([
        parametrosService.set<ParamAgenda>('agenda', agenda),
        parametrosService.set<ParamClinica>('clinica', { ...clinica, nome: clinica.nome.trim() }),
        parametrosService.set<ParamFavoritos>('modulos_favoritos', { modulos: favoritos }),
      ])
      await registrarAuditoria('Parâmetros do Sistema', 'Editar', 'Parâmetros gerais atualizados')
      window.dispatchEvent(new Event(EVENTO_FAVORITOS))
      toast({ title: 'Parâmetros salvos', description: 'As configurações foram atualizadas.' })
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os parâmetros.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const tamanho = clinica.nome.length
  const excedeu = tamanho > LIMITE_SMS

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-[#667C78]">
        <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
        Carregando parâmetros...
      </div>
    )
  }

  return (
    <form onSubmit={salvar} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/config"
            className="inline-flex items-center gap-1 text-xs text-[#667C78] hover:text-[#166A5A]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Configurações
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Parâmetros do Sistema
          </h1>
          <p className="text-sm text-[#667C78]">
            Horário de funcionamento, dados da clínica e módulos favoritos.
          </p>
        </div>
        <Button
          type="submit"
          disabled={salvando}
          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <Save className="h-4 w-4" />
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <Card className="rounded-2xl border-[#E3E7E5]">
        <CardHeader>
          <CardTitle className="text-base text-[#1C2B29]">Horário de funcionamento</CardTitle>
          <CardDescription className="text-xs text-[#667C78]">
            Define a grade padrão da agenda.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="h-ini" className="text-xs font-semibold text-[#1C2B29]">
              Início
            </Label>
            <Input
              id="h-ini"
              type="time"
              value={agenda.horario_inicio}
              onChange={(e) => setAgenda({ ...agenda, horario_inicio: e.target.value })}
              className="rounded-xl border-[#E3E7E5]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-fim" className="text-xs font-semibold text-[#1C2B29]">
              Fim
            </Label>
            <Input
              id="h-fim"
              type="time"
              value={agenda.horario_fim}
              onChange={(e) => setAgenda({ ...agenda, horario_fim: e.target.value })}
              className="rounded-xl border-[#E3E7E5]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-int" className="text-xs font-semibold text-[#1C2B29]">
              Intervalo (minutos)
            </Label>
            <Input
              id="h-int"
              type="number"
              min={5}
              step={5}
              value={agenda.intervalo_min}
              onChange={(e) => setAgenda({ ...agenda, intervalo_min: Number(e.target.value) })}
              className="rounded-xl border-[#E3E7E5]"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#E3E7E5]">
        <CardHeader>
          <CardTitle className="text-base text-[#1C2B29]">Dados da clínica</CardTitle>
          <CardDescription className="text-xs text-[#667C78]">
            O nome da clínica entra na mensagem de SMS, que tem limite de {LIMITE_SMS} caracteres.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="c-nome" className="text-xs font-semibold text-[#1C2B29]">
                Nome da clínica *
              </Label>
              <span
                className={`text-xs font-semibold ${excedeu ? 'text-[#C0392B]' : 'text-[#667C78]'}`}
                aria-live="polite"
              >
                {tamanho}/{LIMITE_SMS}
              </span>
            </div>
            <Input
              id="c-nome"
              value={clinica.nome}
              onChange={(e) => setClinica({ ...clinica, nome: e.target.value })}
              className="rounded-xl border-[#E3E7E5]"
            />
            {excedeu && (
              <p className="text-[11px] text-[#C0392B]">
                O nome excede o limite de caracteres da mensagem de SMS.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-pais" className="text-xs font-semibold text-[#1C2B29]">
              País
            </Label>
            <Input
              id="c-pais"
              value={clinica.pais}
              onChange={(e) => setClinica({ ...clinica, pais: e.target.value })}
              className="rounded-xl border-[#E3E7E5]"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-ddd" className="text-xs font-semibold text-[#1C2B29]">
                DDD
              </Label>
              <Input
                id="c-ddd"
                inputMode="numeric"
                maxLength={3}
                value={clinica.ddd}
                onChange={(e) => setClinica({ ...clinica, ddd: e.target.value })}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="c-tel" className="text-xs font-semibold text-[#1C2B29]">
                Telefone
              </Label>
              <Input
                id="c-tel"
                value={clinica.telefone}
                onChange={(e) => setClinica({ ...clinica, telefone: e.target.value })}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="c-email" className="text-xs font-semibold text-[#1C2B29]">
              E-mail
            </Label>
            <Input
              id="c-email"
              type="email"
              value={clinica.email}
              onChange={(e) => setClinica({ ...clinica, email: e.target.value })}
              className="rounded-xl border-[#E3E7E5]"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#E3E7E5]">
        <CardHeader>
          <CardTitle className="text-base text-[#1C2B29]">Módulos favoritos</CardTitle>
          <CardDescription className="text-xs text-[#667C78]">
            Marque os módulos de acesso rápido.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {MODULOS.map((m) => (
            <label
              key={m}
              className="flex items-center gap-2 rounded-xl border border-[#E3E7E5] px-3 py-2 text-sm text-[#1C2B29] cursor-pointer"
            >
              <Checkbox
                checked={favoritos.includes(m)}
                onCheckedChange={(v) => alternarFavorito(m, v === true)}
              />
              {m}
            </label>
          ))}
        </CardContent>
      </Card>
    </form>
  )
}
