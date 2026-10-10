import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { mensagensService, pacientesService } from '@/services/crm'
import { Paciente } from '@/types/crm'
import { getPermissions } from '@/lib/permissions'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Filter,
  UserPlus,
  Workflow,
  MessageCircle,
  Mail,
  Package,
  Upload,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  Plus,
  User,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  TrendingUp,
  FileBarChart,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import NovoPacienteModal from '@/components/pacientes/NovoPacienteModal'

export default function Layout() {
  const { user, logout, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadWhatsApp, setUnreadWhatsApp] = useState(0)
  const [unreadEmail, setUnreadEmail] = useState(0)

  // Estado do Sidebar Recolhido (Rail) e Seções Minimizáveis com LocalStorage
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const [sectionsOpen, setSectionsOpen] = useState<{
    principal: boolean
    vendas: boolean
    automacao: boolean
    config: boolean
  }>(() => {
    try {
      const saved = localStorage.getItem('sidebar_sections')
      if (saved) return JSON.parse(saved)
    } catch {
      /* ignore */
    }
    return {
      principal: true,
      vendas: true,
      automacao: true,
      config: true,
    }
  })

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('sidebar_collapsed', String(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const toggleSection = (sectionKey: 'principal' | 'vendas' | 'automacao' | 'config') => {
    setSectionsOpen((prev) => {
      const next = { ...prev, [sectionKey]: !prev[sectionKey] }
      try {
        localStorage.setItem('sidebar_sections', JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const permissions = getPermissions(user?.papel)

  // Global search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Paciente[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Novo Paciente modal state
  const [modalNovoPaciente, setModalNovoPaciente] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, isLoading, navigate])

  // Load unread counts
  const fetchUnreadCounts = async () => {
    try {
      const messages = await mensagensService.list('lida = false')
      const wa = messages.filter((m) => m.canal === 'WhatsApp').length
      const em = messages.filter((m) => m.canal === 'Email').length
      setUnreadWhatsApp(wa)
      setUnreadEmail(em)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCounts()
      const interval = setInterval(fetchUnreadCounts, 10000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  // Global search debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await pacientesService.list(
          1,
          6,
          `nome ~ "${searchQuery}" || telefone ~ "${searchQuery}" || cpf ~ "${searchQuery}"`,
        )
        setSearchResults(res.items)
        setSearchOpen(true)
      } catch (_) {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F7F6F3]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#166A5A] border-t-transparent" />
          <p className="text-sm font-medium text-[#667C78]">Carregando Clínica Elias Mansur...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'EM'

  const renderNavLink = (
    to: string,
    label: string,
    icon: React.ReactNode,
    badgeCount = 0,
    isRail = false,
  ) => {
    const linkContent = ({ isActive }: { isActive: boolean }) => (
      <div
        className={`flex items-center ${isRail ? 'justify-center w-10 h-10 mx-auto' : 'justify-between px-3 py-2'} rounded-xl text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-[#E2F0EB] text-[#166A5A] font-semibold shadow-xs'
            : 'text-[#667C78] hover:text-[#1C2B29] hover:bg-black/5'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="shrink-0">{icon}</span>
          {!isRail && <span>{label}</span>}
        </div>
        {badgeCount > 0 &&
          (isRail ? (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#166A5A] ring-2 ring-white" />
          ) : (
            <Badge className="bg-[#166A5A] text-white hover:bg-[#166A5A] text-xs h-5 px-1.5 min-w-[20px] justify-center">
              {badgeCount}
            </Badge>
          ))}
      </div>
    )

    if (isRail) {
      return (
        <Tooltip key={to}>
          <TooltipTrigger asChild>
            <NavLink to={to} className="relative block my-1">
              {linkContent}
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
            {label}
            {badgeCount > 0 && ` (${badgeCount})`}
          </TooltipContent>
        </Tooltip>
      )
    }

    return (
      <NavLink key={to} to={to} className="block my-0.5">
        {linkContent}
      </NavLink>
    )
  }

  const renderSidebar = (isRail: boolean) => (
    <div
      className={`flex flex-col h-full bg-white border-r border-[#E3E7E5] ${isRail ? 'w-[72px]' : 'w-[260px]'} transition-all duration-300`}
    >
      {/* Brand Logo Header */}
      <div
        className={`h-16 ${isRail ? 'px-2 flex-col justify-center gap-1.5 py-2 h-auto min-h-[64px]' : 'px-3.5 justify-between flex-row'} flex items-center border-b border-[#E3E7E5]/70 relative`}
      >
        <div className={`flex items-center gap-2.5 min-w-0 ${isRail ? 'justify-center' : ''}`}>
          <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-[#166A5A] to-[#0F5145] flex items-center justify-center text-white shadow-md shadow-[#166A5A]/20">
            <Sparkles className="h-5 w-5 text-[#C9A227]" />
          </div>
          {!isRail && (
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-[#1C2B29] tracking-tight truncate block">
                Clínica Elias Mansur
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.2 bg-[#FBF3D9] text-[#A5831D] rounded-md">
                CRM
              </span>
            </div>
          )}
        </div>

        {/* Toggle Collapse button on desktop, close on mobile */}
        <div className={`flex items-center shrink-0 ${isRail ? 'w-full justify-center' : 'ml-1'}`}>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[#667C78] hover:bg-gray-100"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={toggleCollapsed}
            title={isRail ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            className="hidden lg:flex p-1.5 rounded-lg text-[#667C78] hover:text-[#1C2B29] hover:bg-gray-100 transition-colors"
            aria-label={isRail ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          >
            {isRail ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Nav Menu Items */}
      <div className={`flex-1 overflow-y-auto ${isRail ? 'px-2 py-4' : 'px-3 py-4 space-y-4'}`}>
        {/* Seção Principal */}
        <div className="space-y-1">
          {!isRail && (
            <button
              type="button"
              onClick={() => toggleSection('principal')}
              className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[#667C78] hover:text-[#1C2B29] transition-colors"
            >
              <span>Principal</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${sectionsOpen.principal ? '' : '-rotate-90'}`}
              />
            </button>
          )}
          {(isRail || sectionsOpen.principal) && (
            <nav className="space-y-0.5">
              {permissions.canAccessDashboard &&
                renderNavLink(
                  '/dashboard',
                  'Dashboard',
                  <LayoutDashboard className="h-4 w-4" />,
                  0,
                  isRail,
                )}
              {permissions.canAccessPacientes &&
                renderNavLink('/pacientes', 'Pacientes', <Users className="h-4 w-4" />, 0, isRail)}
              {permissions.canAccessAgendas &&
                renderNavLink('/agendas', 'Agendas', <Calendar className="h-4 w-4" />, 0, isRail)}
              {permissions.canAccessAgendas &&
                renderNavLink(
                  '/agendas/relatorio',
                  'Relatório Agenda',
                  <FileBarChart className="h-4 w-4" />,
                  0,
                  isRail,
                )}
            </nav>
          )}
        </div>

        {/* Seção Vendas */}
        {(permissions.canAccessFunil ||
          permissions.canAccessProspeccao ||
          permissions.canAccessIndicadores) && (
          <div className="space-y-1">
            {!isRail && (
              <button
                type="button"
                onClick={() => toggleSection('vendas')}
                className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[#667C78] hover:text-[#1C2B29] transition-colors"
              >
                <span>Vendas & Indicadores</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${sectionsOpen.vendas ? '' : '-rotate-90'}`}
                />
              </button>
            )}
            {(isRail || sectionsOpen.vendas) && (
              <nav className="space-y-0.5">
                {permissions.canAccessIndicadores &&
                  renderNavLink(
                    '/indicadores',
                    'Indicadores / Insights',
                    <TrendingUp className="h-4 w-4 text-[#166A5A]" />,
                    0,
                    isRail,
                  )}
                {permissions.canAccessFunil &&
                  renderNavLink('/funil', 'Funil', <Filter className="h-4 w-4" />, 0, isRail)}
                {permissions.canAccessProspeccao &&
                  renderNavLink(
                    '/prospeccao',
                    'Prospecção',
                    <UserPlus className="h-4 w-4" />,
                    0,
                    isRail,
                  )}
              </nav>
            )}
          </div>
        )}

        {/* Seção Automação */}
        {(permissions.canAccessRegua || permissions.canAccessMensagens) && (
          <div className="space-y-1">
            {!isRail && (
              <button
                type="button"
                onClick={() => toggleSection('automacao')}
                className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[#667C78] hover:text-[#1C2B29] transition-colors"
              >
                <span>Automação</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${sectionsOpen.automacao ? '' : '-rotate-90'}`}
                />
              </button>
            )}
            {(isRail || sectionsOpen.automacao) && (
              <nav className="space-y-0.5">
                {permissions.canAccessRegua &&
                  renderNavLink(
                    '/automacao/regua',
                    'Régua de Atendimento',
                    <Workflow className="h-4 w-4" />,
                    0,
                    isRail,
                  )}
                {permissions.canAccessMensagens &&
                  renderNavLink(
                    '/automacao/whatsapp',
                    'WhatsApp (Simulada)',
                    <MessageCircle className="h-4 w-4 text-[#25D366]" />,
                    unreadWhatsApp,
                    isRail,
                  )}
                {permissions.canAccessMensagens &&
                  renderNavLink(
                    '/automacao/email',
                    'E-mail (Simulada)',
                    <Mail className="h-4 w-4 text-[#2E7FA3]" />,
                    unreadEmail,
                    isRail,
                  )}
              </nav>
            )}
          </div>
        )}

        {/* Seção Configurações */}
        <div className="space-y-1">
          {!isRail && (
            <button
              type="button"
              onClick={() => toggleSection('config')}
              className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[#667C78] hover:text-[#1C2B29] transition-colors"
            >
              <span>Configurações</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${sectionsOpen.config ? '' : '-rotate-90'}`}
              />
            </button>
          )}
          {(isRail || sectionsOpen.config) && (
            <nav className="space-y-0.5">
              {permissions.canAccessPacotesConfig &&
                renderNavLink(
                  '/config/pacotes',
                  'Pacotes',
                  <Package className="h-4 w-4" />,
                  0,
                  isRail,
                )}
              {permissions.canAccessImportacoes &&
                renderNavLink(
                  '/config/importacao-medx',
                  'Importações',
                  <Upload className="h-4 w-4" />,
                  0,
                  isRail,
                )}
              {permissions.canAccessEquipe &&
                renderNavLink('/config/equipe', 'Equipe', <Users className="h-4 w-4" />, 0, isRail)}
              {renderNavLink(
                '/config/conta',
                'Minha Conta',
                <Settings className="h-4 w-4" />,
                0,
                isRail,
              )}
            </nav>
          )}
        </div>
      </div>

      {/* User Footer Profile */}
      <div
        className={`p-3 border-t border-[#E3E7E5]/70 bg-gray-50/50 ${isRail ? 'flex flex-col items-center gap-2' : ''}`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-8 w-8 shrink-0 border border-[#E3E7E5]">
              <AvatarFallback className="bg-[#166A5A] text-white font-medium text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {!isRail && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#1C2B29] truncate">
                  {user?.name || 'Usuário'}
                </p>
                <p className="text-[10px] text-[#667C78] truncate">{user?.papel || 'Equipe'}</p>
              </div>
            )}
          </div>
          {!isRail && (
            <button
              onClick={logout}
              title="Sair da conta"
              className="p-1.5 rounded-lg text-[#667C78] hover:text-[#C0392B] hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
        {isRail && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-[#667C78] hover:text-[#C0392B] hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Sair da conta
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex min-h-screen bg-[#F7F6F3]">
        {/* Desktop Fixed Sidebar */}
        <aside
          className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-300 ${
            collapsed ? 'w-[72px]' : 'w-[260px]'
          }`}
        >
          {renderSidebar(collapsed)}
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-[270px] bg-white shadow-2xl transition-transform">
              {renderSidebar(false)}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
            collapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
          }`}
        >
          {/* Top Header 64px */}
          <header className="h-16 sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[#E3E7E5] px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 max-w-xl">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-[#1C2B29]"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Global Search with Dropdown */}
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                <Input
                  type="text"
                  placeholder="Buscar paciente por nome, CPF ou telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 h-10 bg-[#F7F6F3]/80 border-[#E3E7E5] rounded-xl text-sm focus-visible:ring-[#166A5A]"
                />

                {/* Search dropdown results */}
                {searchOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-[#E3E7E5] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {isSearching ? (
                      <div className="px-4 py-3 text-xs text-[#667C78] flex items-center gap-2">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#166A5A] border-t-transparent" />
                        Buscando pacientes...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div>
                        <div className="px-3 py-1.5 text-[11px] font-semibold text-[#667C78] uppercase tracking-wider">
                          Pacientes encontrados
                        </div>
                        {searchResults.map((paciente) => (
                          <button
                            key={paciente.id}
                            onClick={() => {
                              setSearchOpen(false)
                              setSearchQuery('')
                              navigate(`/pacientes/${paciente.id}`)
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-[#E2F0EB]/50 flex items-center justify-between transition-colors group"
                          >
                            <div>
                              <p className="text-sm font-semibold text-[#1C2B29] group-hover:text-[#166A5A]">
                                {paciente.nome}
                              </p>
                              <p className="text-xs text-[#667C78]">
                                {paciente.telefone} {paciente.cpf ? `• ${paciente.cpf}` : ''}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[11px] capitalize">
                              {paciente.fase.replace('_', ' ')}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-xs text-[#667C78]">
                        Nenhum paciente encontrado para "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-3">
              {permissions.canCreatePaciente && (
                <Button
                  onClick={() => setModalNovoPaciente(true)}
                  className="bg-[#166A5A] hover:bg-[#0F5145] text-white shadow-sm font-medium gap-1.5 rounded-xl h-10 px-4"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo Paciente</span>
                </Button>
              )}

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-hidden">
                    <Avatar className="h-9 w-9 border border-[#E3E7E5]">
                      <AvatarFallback className="bg-[#166A5A] text-white font-medium text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 rounded-xl shadow-lg border border-[#E3E7E5]"
                >
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold text-[#1C2B29]">
                        {user?.name || 'Usuário'}
                      </p>
                      <p className="text-xs text-[#667C78] truncate">{user?.email}</p>
                      <div className="pt-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#E2F0EB] text-[#166A5A] rounded-md inline-block">
                          Perfil: {user?.papel || 'Visualização'}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate('/config/conta')}
                    className="cursor-pointer py-2 gap-2"
                  >
                    <User className="h-4 w-4 text-[#667C78]" />
                    <span>Minha Conta</span>
                  </DropdownMenuItem>
                  {permissions.canAccessPacotesConfig && (
                    <DropdownMenuItem
                      onClick={() => navigate('/config/pacotes')}
                      className="cursor-pointer py-2 gap-2"
                    >
                      <Package className="h-4 w-4 text-[#667C78]" />
                      <span>Configurar Pacotes</span>
                    </DropdownMenuItem>
                  )}
                  {permissions.canAccessEquipe && (
                    <DropdownMenuItem
                      onClick={() => navigate('/config/equipe')}
                      className="cursor-pointer py-2 gap-2"
                    >
                      <Users className="h-4 w-4 text-[#667C78]" />
                      <span>Gestão da Equipe</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer py-2 gap-2 text-[#C0392B] focus:text-[#C0392B] focus:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
            <Outlet />
          </main>
        </div>

        {/* Modal Global Novo Paciente */}
        <NovoPacienteModal
          open={modalNovoPaciente}
          onClose={() => setModalNovoPaciente(false)}
          onSuccess={(pacienteCriado) => {
            setModalNovoPaciente(false)
            navigate(`/pacientes/${pacienteCriado.id}`)
          }}
        />
      </div>
    </TooltipProvider>
  )
}
