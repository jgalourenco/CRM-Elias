import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { mensagensService, pacientesService } from '@/services/crm'
import { Paciente } from '@/types/crm'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Filter,
  UserPlus,
  DollarSign,
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
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
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
          <p className="text-sm font-medium text-[#667C78]">Carregando Clínica Seleta...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-[#E2F0EB] text-[#166A5A] font-semibold shadow-sm'
        : 'text-[#667C78] hover:text-[#1C2B29] hover:bg-black/5'
    }`

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'CS'

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E3E7E5]">
      {/* Brand Logo Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-[#E3E7E5]/70">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#166A5A] to-[#0F5145] flex items-center justify-center text-white shadow-md shadow-[#166A5A]/20">
            <Sparkles className="h-5 w-5 text-[#C9A227]" />
          </div>
          <div>
            <span className="text-base font-bold text-[#1C2B29] tracking-tight">Seleta</span>
            <span className="text-xs ml-1.5 font-medium px-1.5 py-0.5 bg-[#FBF3D9] text-[#A5831D] rounded-md">
              CRM
            </span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-[#667C78] hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav Menu Items */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Seção Principal */}
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-[#667C78]/80 mb-2">
            Principal
          </p>
          <nav className="space-y-1">
            <NavLink to="/dashboard" className={navItemClass}>
              <div className="flex items-center gap-3">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </div>
            </NavLink>
            <NavLink to="/pacientes" className={navItemClass}>
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4" />
                <span>Pacientes</span>
              </div>
            </NavLink>
            <NavLink to="/agendas" className={navItemClass}>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4" />
                <span>Agendas</span>
              </div>
            </NavLink>
          </nav>
        </div>

        {/* Seção Vendas */}
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-[#667C78]/80 mb-2">
            Vendas & Indicadores
          </p>
          <nav className="space-y-1">
            <NavLink to="/indicadores" className={navItemClass}>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-[#166A5A]" />
                <span>Indicadores / Insights</span>
              </div>
            </NavLink>
            <NavLink to="/funil" className={navItemClass}>
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4" />
                <span>Funil</span>
              </div>
            </NavLink>
            <NavLink to="/prospeccao" className={navItemClass}>
              <div className="flex items-center gap-3">
                <UserPlus className="h-4 w-4" />
                <span>Prospecção</span>
              </div>
            </NavLink>
          </nav>
        </div>

        {/* Seção Automação */}
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-[#667C78]/80 mb-2">
            Automação
          </p>
          <nav className="space-y-1">
            <NavLink to="/automacao/regua" className={navItemClass}>
              <div className="flex items-center gap-3">
                <Workflow className="h-4 w-4" />
                <span>Régua de Atendimento</span>
              </div>
            </NavLink>
            <NavLink to="/automacao/whatsapp" className={navItemClass}>
              <div className="flex items-center gap-3">
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                <span className="truncate">WhatsApp (Simulada)</span>
              </div>
              {unreadWhatsApp > 0 && (
                <Badge className="bg-[#25D366] text-white hover:bg-[#25D366] text-xs h-5 px-1.5 min-w-[20px] justify-center">
                  {unreadWhatsApp}
                </Badge>
              )}
            </NavLink>
            <NavLink to="/automacao/email" className={navItemClass}>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-[#2E7FA3]" />
                <span className="truncate">E-mail (Simulada)</span>
              </div>
              {unreadEmail > 0 && (
                <Badge className="bg-[#2E7FA3] text-white hover:bg-[#2E7FA3] text-xs h-5 px-1.5 min-w-[20px] justify-center">
                  {unreadEmail}
                </Badge>
              )}
            </NavLink>
          </nav>
        </div>

        {/* Seção Configurações */}
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-[#667C78]/80 mb-2">
            Configurações
          </p>
          <nav className="space-y-1">
            <NavLink to="/config/pacotes" className={navItemClass}>
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4" />
                <span>Pacotes</span>
              </div>
            </NavLink>
            <NavLink to="/config/importacao-medx" className={navItemClass}>
              <div className="flex items-center gap-3">
                <Upload className="h-4 w-4" />
                <span>Importação MedX</span>
              </div>
            </NavLink>
            {user?.papel === 'Administrador' && (
              <NavLink to="/config/equipe" className={navItemClass}>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4" />
                  <span>Equipe</span>
                </div>
              </NavLink>
            )}
            <NavLink to="/config/conta" className={navItemClass}>
              <div className="flex items-center gap-3">
                <Settings className="h-4 w-4" />
                <span>Minha Conta</span>
              </div>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-[#E3E7E5]/70 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 border border-[#E3E7E5]">
              <AvatarFallback className="bg-[#166A5A] text-white font-medium text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#1C2B29] truncate">
                {user?.name || 'Usuário'}
              </p>
              <p className="text-xs text-[#667C78] truncate">{user?.papel || 'Equipe'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sair da conta"
            className="p-1.5 rounded-lg text-[#667C78] hover:text-[#C0392B] hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#F7F6F3]">
      {/* Desktop Fixed Sidebar 260px */}
      <aside className="hidden lg:block w-[260px] fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[270px] bg-white shadow-2xl transition-transform">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[260px] flex flex-col min-h-screen">
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
            <Button
              onClick={() => setModalNovoPaciente(true)}
              className="bg-[#166A5A] hover:bg-[#0F5145] text-white shadow-sm font-medium gap-1.5 rounded-xl h-10 px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Paciente</span>
            </Button>

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
                className="w-56 rounded-xl shadow-lg border border-[#E3E7E5]"
              >
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold text-[#1C2B29]">
                      {user?.name || 'Usuário'}
                    </p>
                    <p className="text-xs text-[#667C78] truncate">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/config/conta')}
                  className="cursor-pointer py-2 gap-2"
                >
                  <User className="h-4 w-4 text-[#667C78]" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/config/pacotes')}
                  className="cursor-pointer py-2 gap-2"
                >
                  <Package className="h-4 w-4 text-[#667C78]" />
                  <span>Configurar Pacotes</span>
                </DropdownMenuItem>
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
  )
}
