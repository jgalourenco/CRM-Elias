import { UserRole } from '@/types/crm'

export interface RolePermissions {
  // Navigation & Access
  canAccessDashboard: boolean
  canAccessPacientes: boolean
  canAccessAgendas: boolean
  canAccessExames: boolean
  canAccessMensagens: boolean
  canAccessFunil: boolean
  canAccessProspeccao: boolean
  canAccessIndicadores: boolean
  canAccessRegua: boolean
  canAccessPacotesConfig: boolean
  canAccessImportacoes: boolean
  canAccessEquipe: boolean

  // Write permissions
  canCreatePaciente: boolean
  canEditPaciente: boolean
  canDeletePaciente: boolean
  canManageAtendimentos: boolean
  canManageLancamentos: boolean
  canManageProspeccoes: boolean
  canManageNotas: boolean
  canSendMensagens: boolean
  canImport: boolean
}

/**
 * Normaliza papel legado ou nulo para os novos papéis
 */
export function normalizeRole(role?: string): UserRole {
  if (!role) return 'Visualização'
  if (role === 'Administrador') return 'Administrador'
  if (role === 'Gestor/Recepção' || role === 'Recepção') return 'Gestor/Recepção'
  if (role === 'Profissional/Saúde') return 'Profissional/Saúde'
  if (role === 'Visualização') return 'Visualização'
  if (role === 'Financeiro') return 'Administrador' // legado financeiro mapeado para admin
  return 'Visualização'
}

/**
 * Retorna as permissões para um determinado papel:
 * - Administrador: acesso total, equipe, configurações, financeiro, tudo
 * - Gestor/Recepção: pacientes, agenda, funil, prospecção, régua, mensagens, importações (sem equipe)
 * - Profissional/Saúde: agenda, pacientes/fichas, exames, mensagens simuladas (sem funil, sem financeiro, sem configs)
 * - Visualização: somente leitura das telas liberadas (sem botões de escrita)
 */
export function getPermissions(role?: string): RolePermissions {
  const norm = normalizeRole(role)

  if (norm === 'Administrador') {
    return {
      canAccessDashboard: true,
      canAccessPacientes: true,
      canAccessAgendas: true,
      canAccessExames: true,
      canAccessMensagens: true,
      canAccessFunil: true,
      canAccessProspeccao: true,
      canAccessIndicadores: true,
      canAccessRegua: true,
      canAccessPacotesConfig: true,
      canAccessImportacoes: true,
      canAccessEquipe: true,

      canCreatePaciente: true,
      canEditPaciente: true,
      canDeletePaciente: true,
      canManageAtendimentos: true,
      canManageLancamentos: true,
      canManageProspeccoes: true,
      canManageNotas: true,
      canSendMensagens: true,
      canImport: true,
    }
  }

  if (norm === 'Gestor/Recepção') {
    return {
      canAccessDashboard: true,
      canAccessPacientes: true,
      canAccessAgendas: true,
      canAccessExames: true,
      canAccessMensagens: true,
      canAccessFunil: true,
      canAccessProspeccao: true,
      canAccessIndicadores: true,
      canAccessRegua: true,
      canAccessPacotesConfig: false,
      canAccessImportacoes: true,
      canAccessEquipe: false,

      canCreatePaciente: true,
      canEditPaciente: true,
      canDeletePaciente: false,
      canManageAtendimentos: true,
      canManageLancamentos: true,
      canManageProspeccoes: true,
      canManageNotas: true,
      canSendMensagens: true,
      canImport: true,
    }
  }

  if (norm === 'Profissional/Saúde') {
    return {
      canAccessDashboard: true,
      canAccessPacientes: true,
      canAccessAgendas: true,
      canAccessExames: true,
      canAccessMensagens: true,
      canAccessFunil: false,
      canAccessProspeccao: false,
      canAccessIndicadores: false,
      canAccessRegua: false,
      canAccessPacotesConfig: false,
      canAccessImportacoes: false,
      canAccessEquipe: false,

      canCreatePaciente: true,
      canEditPaciente: true,
      canDeletePaciente: false,
      canManageAtendimentos: true,
      canManageLancamentos: false,
      canManageProspeccoes: false,
      canManageNotas: true,
      canSendMensagens: true,
      canImport: false,
    }
  }

  // Visualização (somente leitura)
  return {
    canAccessDashboard: true,
    canAccessPacientes: true,
    canAccessAgendas: true,
    canAccessExames: true,
    canAccessMensagens: true,
    canAccessFunil: true,
    canAccessProspeccao: true,
    canAccessIndicadores: true,
    canAccessRegua: false,
    canAccessPacotesConfig: false,
    canAccessImportacoes: false,
    canAccessEquipe: false,

    canCreatePaciente: false,
    canEditPaciente: false,
    canDeletePaciente: false,
    canManageAtendimentos: false,
    canManageLancamentos: false,
    canManageProspeccoes: false,
    canManageNotas: false,
    canSendMensagens: false,
    canImport: false,
  }
}

export const ROLE_LABELS: Record<UserRole, string> = {
  Administrador: 'Administrador (Acesso total)',
  'Gestor/Recepção': 'Gestor / Recepção',
  'Profissional/Saúde': 'Profissional de Saúde',
  Visualização: 'Visualização (Somente leitura)',
  Recepção: 'Gestor / Recepção',
  Financeiro: 'Administrador',
}
