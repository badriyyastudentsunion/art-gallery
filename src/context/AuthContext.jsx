// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ag_user')
    return saved ? JSON.parse(saved) : null
  })

  // ── Realtime & periodic guard: force logout admin immediately if password changed in DB ──
  useEffect(() => {
    if (!user || user.role !== 'Admin') return

    let isMounted = true
    let isChecking = false

    const verifySession = async () => {
      if (isChecking) return
      isChecking = true
      try {
        const savedPass = localStorage.getItem('ag_pass')
        if (!savedPass) {
          if (isMounted) logout()
          return
        }

        const { data: isValid, error } = await supabase.rpc('verify_admin_session', {
          p_username: user.username,
          p_password: savedPass
        })

        if (!error && isValid === false) {
          console.warn('Admin password changed or invalid in DB. Forcing immediate logout.')
          if (isMounted) {
            logout()
            alert('Your session has expired because the admin password was changed. Please log in with the new password.')
          }
        }
      } catch (err) {
        console.error('Session check error:', err)
      } finally {
        isChecking = false
      }
    }

    // 1. Check immediately on mount/state update
    verifySession()

    // 2. Realtime subscription on admins table & app_settings
    const rand = Math.random().toString(36).substring(2, 7)
    const ch = supabase.channel(`admin-auth-guard-${rand}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admins' }, () => {
        verifySession()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (payload) => {
        if (payload.new?.key === 'admin_session_version' || payload.new?.key === 'admin_force_logout') {
          verifySession()
        }
      })
      .subscribe()

    // 3. Fallback interval check every 5 seconds (hard kick without user refresh)
    const interval = setInterval(verifySession, 5000)

    // 4. Check whenever tab becomes active
    const onFocus = () => verifySession()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      supabase.removeChannel(ch)
    }
  }, [user?.id, user?.username, user?.role])

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
