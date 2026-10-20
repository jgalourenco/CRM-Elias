import { parametrosService } from '@/services/crm'
import type { RolePermissions } from '@/lib/permissions'

/** Evento disparado após salvar os parâmetros, para o menu recarregar os favoritos. */
export const EVENTO_FAVORITOS = 'favoritos-atualizados'

export interface ModuloFavorito {
  nome: string
  rota: string
  permitido: (p: RolePermissions) => boolean
}

/** Módulos que podem ser marcados como favoritos em Parâmetros do Sistema. */
export const MODULOS_FAVORITOS: ModuloFavorito[] = [
  { nome: 'Hoje', rota: '/dashboard', permitido: (p) => p.canAccessDashboard },
  { nome: 'Pacientes', rota: '/pacientes', permitido: (p) => p.canAccessPacientes },
  { nome: 'Agenda', rota: '/agendas', permitido: (p) => p.canAccessAgendas },
  { nome: 'Prontuário', rota: '/pacientes', permitido: (p) => p.canAccessProntuario },
  { nome: 'Exames', rota: '/pacientes', permitido: (p) => p.canAccessExames },
  { nome: 'Mensagens', rota: '/automacao/whatsapp', permitido: (p) => p.canAccessMensagens },
  { nome: 'Marketing', rota: '/marketing/qualidade', permitido: (p) => p.canAccessFinanceiro },
  { nome: 'Financeiro', rota: '/financeiro/faturamento', permitido: (p) => p.canAccessFinanceiro },
  { nome: 'Estoque', rota: '/financeiro/estoque', permitido: (p) => p.canAccessFinanceiro },
  { nome: 'Indicadores', rota: '/indicadores', permitido: (p) => p.canAccessIndicadores },
]

export async function carregarNomesFavoritos(): Promise<string[]> {
  const param = await parametrosService.get<{ modulos?: string[] }>('modulos_favoritos')
  return Array.isArray(param?.modulos) ? param.modulos : []
}

/**
 * Resolve os favoritos em links do menu: respeita as permissões do perfil e descarta rotas
 * repetidas (Prontuário e Exames levam à lista de pacientes, como Pacientes).
 */
export function resolverFavoritos(nomes: string[], permissoes: RolePermissions): ModuloFavorito[] {
  const vistos = new Set<string>()
  const resultado: ModuloFavorito[] = []
  for (const nome of nomes) {
    const modulo = MODULOS_FAVORITOS.find((m) => m.nome === nome)
    if (!modulo || !modulo.permitido(permissoes) || vistos.has(modulo.rota)) continue
    vistos.add(modulo.rota)
    resultado.push(modulo)
  }
  return resultado
}
