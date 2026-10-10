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

  // Gestão de Usuários (Apenas Administrador)
  canManageUsers: boolean
  canResetPasswords: boolean

  // Automação & Régua
  canEditRegua: boolean

  // Write permissions operacionais
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
 * Normaliza papel legado ou nulo para os 4 perfis oficiais do CRM:
 * - Administrador
 * - Gestor
 * - Profissional
 * - Visitante
 */
export function normalizeRole(role?: string): UserRole {
  if (!role) return 'Visitante'
  if (role === 'Administrador') return 'Administrador'
  if (role === 'Gestor' || role === 'Gestor/Recepção' || role === 'Recepção') return 'Gestor'
  if (role === 'Profissional' || role === 'Profissional/Saúde') return 'Profissional'
  if (role === 'Visitante' || role === 'Visualização') return 'Visitante'
  if (role === 'Financeiro') return 'Administrador' // legado financeiro mapeado para admin
  return 'Visitante'
}

/**
 * Retorna as permissões para cada perfil:
 * - Administrador: acessa tudo, gerencia os demais usuários (cria, altera papéis, redefine senhas, desativa).
 * - Gestor: acessa todas as áreas da clínica (mesmo alcance de menus do Admin, incluindo pacotes, régua, funil, importações),
 *           mas NÃO gerencia funções/perfis de outros usuários (não cria, não muda papéis, não reseta senhas).
 * - Profissional: focado na operação clínica (agenda, pacientes/fichas, exames, notas, mensagens).
 * - Visitante: somente leitura das telas da equipe + prévia/esboço do Portal do Paciente.
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

      canManageUsers: true,
      canResetPasswords: true,

      canEditRegua: true,

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

  if (norm === 'Gestor') {
    return {
      // Gestor tem o mesmo alcance de menus/rotas da clínica que o Administrador
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
      // Gestor pode ver a equipe, mas NÃO edita funções nem senhas (somente visualiza membros)
      canAccessEquipe: true,

      canManageUsers: false,
      canResetPasswords: false,

      canEditRegua: true,

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

  if (norm === 'Profissional') {
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

      canManageUsers: false,
      canResetPasswords: false,

      canEditRegua: false,

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

  // Visitante (somente leitura operacional)
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

    canManageUsers: false,
    canResetPasswords: false,

    canEditRegua: false,

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
  Administrador: 'Administrador (Acesso e Gestão Total)',
  Gestor: 'Gestor (Acesso a todas as áreas • Sem gestão de usuários)',
  Profissional: 'Profissional (Agenda, Fichas Clínicas e Exames)',
  Visitante: 'Visitante (Somente Leitura • Futuro Portal do Paciente)',
  // Sinônimos e legados para compatibilidade
  'Gestor/Recepção': 'Gestor (Acesso a todas as áreas • Sem gestão de usuários)',
  'Profissional/Saúde': 'Profissional (Agenda, Fichas Clínicas e Exames)',
  Visualização: 'Visitante (Somente Leitura • Futuro Portal do Paciente)',
  Recepção: 'Gestor (Acesso a todas as áreas • Sem gestão de usuários)',
  Financeiro: 'Administrador (Acesso e Gestão Total)',
}

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  Administrador:
    'Acesso irrestrito a todas as áreas clínicas, operacionais e de gestão. É o único perfil autorizado a criar e remover colaboradores, alterar perfis e definir ou disparar senhas de acesso.',
  Gestor:
    'Acesso completo a todas as áreas da clínica (dashboards, pacientes, agendas, funil, régua, indicadores, pacotes e importações). Por diretriz de segurança, NÃO edita papéis de outros usuários, não cria contas, não desativa membros nem altera senhas.',
  Profissional:
    'Perfil dedicado a médicos e profissionais assistenciais. Acesso a agendas, prontuários de pacientes, visualização/registro de exames laboratoriais, notas clínicas e mensagens.',
  Visitante:
    'Modo de consulta com permissões somente leitura para auditoria da equipe. Servirá de base para o futuro Portal do Paciente.',
}
