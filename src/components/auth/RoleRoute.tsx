import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getPermissions, RolePermissions } from '@/lib/permissions'
import { Shield } from 'lucide-react'

interface RoleRouteProps {
  permission: (perms: RolePermissions) => boolean
  children: React.ReactNode
}

export function RoleRoute({ permission, children }: RoleRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const perms = getPermissions(user?.papel)
  if (!permission(perms)) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto my-12 bg-white rounded-2xl border border-[#E3E7E5] shadow-xs">
        <Shield className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-[#1C2B29]">Acesso Restrito</h2>
        <p className="text-xs text-[#667C78]">
          Seu perfil ({user?.papel || 'Visualização'}) não possui permissão para acessar esta área
          da Clínica Elias Mansur.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
