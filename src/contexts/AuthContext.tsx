import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Usuario } from '@/types/crm'

interface LoginResult {
  requiresTwoFactor?: boolean
  challengeToken?: string
  user?: Usuario
}

interface AuthContextType {
  user: Usuario | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, pass: string) => Promise<LoginResult | void>
  completeTwoFactorLogin: (authData: { token: string; record: Usuario }) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(() => {
    return (pb.authStore.record as unknown as Usuario) || null
  })
  const [token, setToken] = useState<string | null>(pb.authStore.token || null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initial check
    if (pb.authStore.isValid && pb.authStore.record) {
      setUser(pb.authStore.record as unknown as Usuario)
      setToken(pb.authStore.token)
    }
    setIsLoading(false)

    const unsubscribe = pb.authStore.onChange((newToken, model) => {
      setToken(newToken || null)
      setUser((model as unknown as Usuario) || null)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string): Promise<LoginResult | void> => {
    const authData = (await pb
      .collection('users')
      .authWithPassword<Usuario>(email, pass)) as unknown as {
      token?: string
      record?: Usuario
      requiresTwoFactor?: boolean
      challengeToken?: string
      user?: Usuario
    }

    if (authData.requiresTwoFactor && authData.challengeToken) {
      // 2FA OBRIGATÓRIO: O PocketBase interceptor não emitiu o auth token!
      // Limpa authStore caso houvesse algo anterior
      pb.authStore.clear()
      setUser(null)
      setToken(null)
      return {
        requiresTwoFactor: true,
        challengeToken: authData.challengeToken,
        user: authData.user,
      }
    }

    if (authData.record && authData.token) {
      setUser(authData.record)
      setToken(authData.token)
    }
  }

  const completeTwoFactorLogin = (authData: { token: string; record: Usuario }) => {
    pb.authStore.save(
      authData.token,
      authData.record as unknown as import('pocketbase').RecordModel,
    )
    setUser(authData.record)
    setToken(authData.token)
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setToken(null)
  }

  const refreshUser = async () => {
    if (pb.authStore.isValid && user?.id) {
      try {
        const refreshed = await pb.collection('users').getOne<Usuario>(user.id)
        setUser(refreshed)
      } catch {
        /* intentionally ignored */
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        completeTwoFactorLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
