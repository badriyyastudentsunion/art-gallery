// src/context/AuthContext.jsx
import { createContext, useContext, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ag_user')
    return saved ? JSON.parse(saved) : null
  })

  const login = async (username, password) => {
    try {
      const { data, error } = await supabase.rpc('authenticate_user', {
        p_username: username,
        p_password: password
      })

      if (error) {
        console.error('Auth RPC error:', error)
        return { success: false, message: 'Authentication service error' }
      }

      if (data) {
        const userData = {
          id: data.id,
          username: data.username,
          name: data.name || data.username,
          role: data.role,
          ...(data.teamId && { teamId: data.teamId }),
          ...(data.invigilatorId && { invigilatorId: data.invigilatorId }),
          ...(data.judgeId && { judgeId: data.judgeId }),
          ...(data.announcerId && { announcerId: data.announcerId }),
          ...(data.uploaderId && { uploaderId: data.uploaderId }),
          ...(data.awardUserId && { awardUserId: data.awardUserId }),
        }
        if (data.role === 'Admin') {
          localStorage.setItem('ag_pass', password)
        }
        setUser(userData)
        localStorage.setItem('ag_user', JSON.stringify(userData))
        sessionStorage.removeItem('pwa_prompt_dismissed')
        return { success: true, user: userData }
      }

      return { success: false, message: 'Invalid username or password' }
    } catch (err) {
      console.error('Login error:', err)
      return { success: false, message: 'Connection error. Please try again.' }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('ag_user')
    localStorage.removeItem('ag_pass')
    sessionStorage.removeItem('admin_section')
    sessionStorage.removeItem('pwa_prompt_dismissed')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
