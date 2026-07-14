// src/context/AuthContext.jsx
import { createContext, useContext, useState } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_USERS = [
  { username: 'admin', password: 'admin123', role: 'Admin' },
]

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('ag_user')
    return saved ? JSON.parse(saved) : null
  })

  const login = async (username, password) => {
    // 1. Check hardcoded admin
    const adminMatch = ADMIN_USERS.find(
      u => u.username === username && u.password === password
    )
    if (adminMatch) {
      const userData = { id: 'admin', username: adminMatch.username, role: adminMatch.role }
      setUser(userData)
      sessionStorage.setItem('ag_user', JSON.stringify(userData))
      return { success: true, user: userData }
    }

    // 2. Check teams table (team login)
    const { data: teams, error: teamsErr } = await supabase
      .from('teams')
      .select('id, name, password')
      .ilike('name', username)
      .limit(1)

    if (!teamsErr && teams?.length > 0) {
      const team = teams[0]
      if (team.password === password) {
        const userData = { id: team.id, username: team.name, role: 'Team', teamId: team.id }
        setUser(userData)
        sessionStorage.setItem('ag_user', JSON.stringify(userData))
        return { success: true, user: userData }
      }
    }

    // 3. Check invigilators table
    const { data: invigs } = await supabase
      .from('invigilators')
      .select('id, name, username, password')
      .ilike('username', username)
      .limit(1)

    if (invigs?.length > 0) {
      const invig = invigs[0]
      if (invig.password === password) {
        const userData = { id: invig.id, username: invig.username, name: invig.name, role: 'Invigilator', invigilatorId: invig.id }
        setUser(userData)
        sessionStorage.setItem('ag_user', JSON.stringify(userData))
        return { success: true, user: userData }
      }
    }

    // 4. Check judges table
    const { data: judges } = await supabase
      .from('judges')
      .select('id, name, username, password')
      .ilike('username', username)
      .limit(1)

    if (judges?.length > 0) {
      const judge = judges[0]
      if (judge.password === password) {
        const userData = { id: judge.id, username: judge.username, name: judge.name, role: 'Judge', judgeId: judge.id }
        setUser(userData)
        sessionStorage.setItem('ag_user', JSON.stringify(userData))
        return { success: true, user: userData }
      }
    }

    // 5. Check announcers table
    const { data: announcers } = await supabase
      .from('announcers')
      .select('id, name, username, password')
      .ilike('username', username)
      .limit(1)

    if (announcers?.length > 0) {
      const announcer = announcers[0]
      if (announcer.password === password) {
        const userData = { id: announcer.id, username: announcer.username, name: announcer.name, role: 'Announcer', announcerId: announcer.id }
        setUser(userData)
        sessionStorage.setItem('ag_user', JSON.stringify(userData))
        return { success: true, user: userData }
      }
    }

    return { success: false, message: 'Invalid username or password' }
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('ag_user')
    sessionStorage.removeItem('admin_section')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
