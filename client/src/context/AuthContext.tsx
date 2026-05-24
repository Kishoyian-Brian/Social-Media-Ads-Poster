import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getMe, login as apiLogin, type UserDTO } from '../api/auth'

interface AuthContextValue {
  user: UserDTO | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'))
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    if (!token) {
      setUser(null)
      return
    }

    const profile = await getMe(token)
    setUser(profile)
  }

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    getMe(token)
      .then((profile) => {
        setUser(profile)
      })
      .catch(() => {
        localStorage.removeItem('auth_token')
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const persistSession = (tokenValue: string, userData: UserDTO) => {
    localStorage.setItem('auth_token', tokenValue)
    setToken(tokenValue)
    setUser(userData)
  }

  const login = async (email: string, password: string) => {
    const response = await apiLogin(email, password)
    persistSession(response.token, response.user)
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, token, loading, login, logout, refresh }),
    [user, token, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
