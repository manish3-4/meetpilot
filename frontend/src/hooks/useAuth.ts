import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setState({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      try {
        const response = await api.get('/auth/me')
        setState({
          user: response.data.data,
          isAuthenticated: true,
          isLoading: false,
        })
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setState({ user: null, isAuthenticated: false, isLoading: false })
      }
    }

    checkAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    const { user, tokens } = response.data.data

    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)

    setState({ user, isAuthenticated: true, isLoading: false })
    return user
  }, [])

  const register = useCallback(async (email: string, name: string, password: string) => {
    const response = await api.post('/auth/register', { email, name, password })
    const { user, tokens } = response.data.data

    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)

    setState({ user, isAuthenticated: true, isLoading: false })
    return user
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => {})
    }

    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setState({ user: null, isAuthenticated: false, isLoading: false })
  }, [])

  return {
    ...state,
    login,
    register,
    logout,
  }
}
