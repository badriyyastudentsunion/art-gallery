// src/pages/admin/AdminPanel.jsx
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import './admin.css'
import TeamsSection from './sections/TeamsSection'
import CategoriesSection from './sections/CategoriesSection'
import CompetitionsSection from './sections/CompetitionsSection'
import ParticipantsSection from './sections/ParticipantsSection'
import InvigilatorsSection from './sections/InvigilatorsSection'
import JudgesSection from './sections/JudgesSection'
import AnnouncersSection from './sections/AnnouncersSection'
import StagesSection from './sections/StagesSection'
import PointSettingsSection from './sections/PointSettingsSection'
import ScheduleSection from './sections/ScheduleSection'
import DashboardSection from './sections/DashboardSection'
import ResultsSection from './sections/ResultsSection'
import AnnouncerFlowSection from './sections/AnnouncerFlowSection'
import MediaSection from './sections/MediaSection'
import AppSettingsSection from './sections/AppSettingsSection'
import AwardUsersSection from './sections/AwardUsersSection'
import AwardsSection from './sections/AwardsSection'
import PosterTemplatesSection from './sections/PosterTemplatesSection'
import { APP_VERSION } from '../../version'

// ── Icons ──
const Icon = ({ d, d2, circle, rect, line, poly }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {circle && <circle {...circle} />}
    {rect && <rect {...rect} />}
    {d && <path d={d} />}
    {d2 && <path d={d2} />}
    {line && <line {...line} />}
    {poly && <polyline points={poly} />}
  </svg>
)

const icons = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  teams:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  categories: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  competitions:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 1 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>,
  participants:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  invigilators:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="3"/></svg>,
  judges:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z"/></svg>,
  announcers:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  media:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
  stages:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>,
  results:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  'announcer-flow': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  schedule:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  'point-settings': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>,
  'app-settings': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  logout:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  'award-users': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  awards: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  'poster-templates': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
}

// ── Nav config ──
const NAV = [
  { id: 'dashboard',    label: 'Dashboard',    group: 'Overview',    features: ['Live event statistics', 'Quick access panel', 'Notifications & alerts'] },
  { id: 'teams',        label: 'Teams',        group: 'Management',  features: ['Create & manage madrasa/school teams', 'Assign team leaders', 'Track team performance'] },
  { id: 'categories',   label: 'Categories',   group: 'Management',  features: ['e.g. Calligraphy, Nasheeds, Qiraat, Hadith', 'Set category rules & eligibility', 'Link categories to competitions'] },
  { id: 'competitions', label: 'Competitions', group: 'Management',  features: ['e.g. Arabic Calligraphy Solo, Nasheed Group', 'Assign judges & stages', 'Manage rounds & heats'] },
  { id: 'participants', label: 'Participants', group: 'People',      features: ['Register participants by team', 'Assign to categories & competitions', 'Track chess numbers'] },
  { id: 'invigilators', label: 'Invigilators', group: 'People',      features: ['Manage exam & competition invigilators', 'Assign invigilators to stages', 'Track invigilator attendance'] },
  { id: 'judges',       label: 'Judges',       group: 'People',      features: ['Assign judges to events', 'Manage score submissions', 'View judge profiles'] },
  { id: 'announcers',   label: 'Announcers',   group: 'People',      features: ['Manage announcer roster', 'Assign to stages', 'Schedule announcements'] },
  { id: 'media',        label: 'Media Portal', group: 'People',      features: ['Manage media uploaders', 'Moderate uploaded photos & live links', 'Assign YouTube videos'] },
  { id: 'award-users',  label: 'Award Users',  group: 'People',      features: ['Create credentials for distributors', 'Audit logins', 'Manage distribution counters'] },
  { id: 'stages',       label: 'Stages',       group: 'Venue',       features: ['Define stage/hall locations', 'Schedule stage usage', 'Manage stage capacity'] },
  { id: 'schedule',     label: 'Schedule',     group: 'Venue',       features: ['Set date & time per competition', 'Stage/room number', 'View chronological schedule'] },
  { id: 'point-settings', label: 'Point Settings', group: 'Reporting', features: ['Edit grade → points table', 'Placement points by group size', 'Results password'] },
  { id: 'results',      label: 'Results',      group: 'Reporting',   features: ['Compile final scores & rankings', 'Generate result reports', 'Export & publish results'] },
  { id: 'announcer-flow', label: 'Announcer Flow', group: 'Reporting', features: ['Sequence ready competitions', 'Tally simulator', 'Suspense settings'] },
  { id: 'awards',       label: 'Awards Corner', group: 'Reporting',   features: ['Distribute 1st & 2nd placement awards', 'Mark received by Team Leaders', 'Export distribution logs PDF'] },
  { id: 'poster-templates', label: 'Poster Templates', group: 'Reporting', features: ['Upload custom PSD-to-HTML posters', 'Dynamic live result rendering', 'Test presets & auto-fit'] },
  { id: 'app-settings', label: 'App Settings', group: 'System',     features: ['Maintenance mode toggles', 'Disable specific portals/logins', 'Custom maintenance notice'] },
]

// Group nav items
const GROUPS = [...new Set(NAV.map(n => n.group))]

export default function AdminPanel() {
  const { user, logout } = useAuth()

  const [active, setActive] = useState(() => {
    return sessionStorage.getItem('admin_section') || 'dashboard'
  })

  function navigate(id) {
    sessionStorage.setItem('admin_section', id)
    setActive(id)
  }

  const current = NAV.find(n => n.id === active)
  const initials = user?.username?.slice(0, 2).toUpperCase() || 'AD'

  return (
    <div className="admin-root">

      {/* ── Top Bar ── */}
      <header className="admin-topbar">
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/inspico-logo.svg" alt="Inspico Logo" style={{ height: 22, width: 22, filter: 'brightness(0) invert(1)', flexShrink: 0 }} />
          <img src="/inspico.svg" alt="Inspico" style={{ height: 16, maxWidth: 100 }} />
          <div className="topbar-sep" />
          <span className="topbar-section">Panel</span>
        </div>
        <div className="topbar-right">
          <div className="topbar-user">
            <span className="topbar-username">{user?.username}</span>
          </div>
          {user?.role && user?.role.toLowerCase() !== user?.username?.toLowerCase() && (
            <span className="topbar-role">{user?.role}</span>
          )}
          <button className="topbar-logout" onClick={logout}>
            {icons.logout}
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <nav className="sidebar-nav">
          {GROUPS.map(group => (
            <div key={group}>
              <p className="sidebar-group-label">{group}</p>
              {NAV.filter(n => n.group === group).map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${active === item.id ? 'active' : ''}`}
                  onClick={() => navigate(item.id)}
                >
                  {icons[item.id]}
                  {item.label}
                </button>
              ))}
            </div>
          ))}
          <div style={{ padding: '16px 20px 8px 20px', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.6 }}>
            Inspico Platform {APP_VERSION}
          </div>
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main className="admin-main" key={active}>

        {active === 'teams'        && <TeamsSection navigateTo={navigate} />}
        {active === 'categories'   && <CategoriesSection navigateTo={navigate} />}
        {active === 'competitions' && <CompetitionsSection navigateTo={navigate} />}
        {active === 'participants' && <ParticipantsSection navigateTo={navigate} />}
        {active === 'invigilators' && <InvigilatorsSection navigateTo={navigate} />}
        {active === 'judges'       && <JudgesSection navigateTo={navigate} />}
        {active === 'announcers'   && <AnnouncersSection />}
        {active === 'stages'       && <StagesSection />}

        {/* Coming Soon for remaining sections */}
        {active === 'dashboard'      && <DashboardSection />}
        {active === 'point-settings' && <PointSettingsSection />}
        {active === 'schedule'       && <ScheduleSection />}
        {active === 'results'        && <ResultsSection />}
        {active === 'announcer-flow' && <AnnouncerFlowSection />}
        {active === 'media'          && <MediaSection />}
        {active === 'app-settings'   && <AppSettingsSection />}
        {active === 'award-users'    && <AwardUsersSection />}
        {active === 'awards'         && <AwardsSection />}
        {active === 'poster-templates' && <PosterTemplatesSection />}
        {!['teams','categories','competitions','participants','invigilators','judges','announcers','stages','point-settings','schedule','dashboard','results','announcer-flow','media','app-settings','award-users','awards','poster-templates'].includes(active) && (
          <>
            <div className="page-header">
              <div className="page-header-left">
                <p className="page-eyebrow">Admin · {current?.group}</p>
                <h1 className="page-title">{current?.label}</h1>
              </div>
            </div>
            <div className="coming-soon-wrap">
              <span className="coming-soon-ghost" aria-hidden="true">
                {current?.label?.toUpperCase()}
              </span>
              <span className="cs-badge">Coming Soon</span>
              <h2 className="cs-title">
                {current?.label}<br />
                <span style={{ color: 'var(--accent-light)' }}>Module</span>
              </h2>
              <div className="cs-line" />
              <p className="cs-desc">
                This section is under development. Here's what you'll manage once it's live.
              </p>
              <div className="cs-features">
                {current?.features.map((f, i) => (
                  <div key={i} className="cs-feature">{f}</div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

    </div>
  )
}
