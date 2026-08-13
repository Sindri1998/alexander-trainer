import { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Trainer from './Trainer.jsx'
import Simulator from './Simulator.jsx'
import CourseTest from './CourseTest.jsx'
import Leaderboard, { saveTrainerScore, saveTestScore } from './Leaderboard.jsx'
import TurretPlanner from './TurretPlanner.jsx'
import { useAuth, LoginScreen } from './Auth.jsx'

export default function App() {
  const { pathname } = useLocation()
  const { user, ready, login, logout } = useAuth()
  const [dark, setDark] = useState(true)

  if (!ready) return null
  if (!user) return <LoginScreen onLogin={login} dark={dark} />

  const handleTrainerScore = (scoreData) => {
    saveTrainerScore(user.name, scoreData)
  }

  const handleTestScore = (scoreData) => {
    saveTestScore(user.name, scoreData)
  }

  const navLink = (to, label) => (
    <Link to={to} style={{
      color: pathname === to ? '#ffffff' : '#93b8d8',
      textDecoration: 'none',
      fontSize: 12,
      fontFamily: 'monospace',
      fontWeight: pathname === to ? 700 : 400,
      padding: '4px 10px',
      borderRadius: 4,
      background: pathname === to ? '#00336699' : 'transparent',
      border: pathname === to ? '1px solid #4d8fcc55' : '1px solid transparent',
      transition: 'all 0.15s',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>{label}</Link>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        background: '#004990',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        boxShadow: '0 2px 8px #00000044',
        flexShrink: 0,
      }}>
        <span style={{ color: '#c8d8e8', fontWeight: 800, fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.04em', marginRight: 4, whiteSpace: 'nowrap' }}>
          Alexander Machine Shop
        </span>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {navLink('/',           '🎮 Trainer')}
          {navLink('/gcodesim',  '⚙️ Simulator')}
          {navLink('/test',      '📋 Test')}
          {navLink('/leaderboard','🏆 Leaderboard')}
          {navLink('/turret',     '🔧 Turret')}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: '#005bb5', border: '1px solid #4d8fcc',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: '#c8d8e8', fontFamily: 'monospace',
            }}>
              {user.name[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 11, color: '#c8d8e8', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{user.name}</span>
            <button onClick={logout} style={{
              background: 'none', border: '1px solid #4d8fcc44',
              borderRadius: 4, color: '#93b8d8', fontSize: 10,
              cursor: 'pointer', padding: '2px 7px', fontFamily: 'monospace',
            }}>Sign out</button>
          </div>
          <button onClick={() => setDark(d => !d)} style={{
            background: 'none', border: '1px solid #4d8fcc44',
            borderRadius: 4, color: '#93b8d8', fontSize: 11,
            cursor: 'pointer', padding: '3px 7px',
          }}>{dark ? '☀️' : '🌙'}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{ background: '#ef4444', color: '#fff', fontWeight: 900, fontSize: 9, padding: '1px 5px', borderRadius: '3px 0 0 3px', fontFamily: 'monospace' }}>RAD</span>
            <span style={{ background: '#003366', border: '1px solid #4d8fcc44', borderLeft: 'none', color: '#93b8d8', fontSize: 9, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.15em', padding: '1px 6px', borderRadius: '0 3px 3px 0' }}>MFG</span>
          </div>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/"            element={<Trainer     dark={dark} setDark={setDark} user={user} onScore={handleTrainerScore} />} />
          <Route path="/gcodesim"   element={<Simulator   dark={dark} setDark={setDark} user={user} />} />
          <Route path="/test"        element={<CourseTest  dark={dark} user={user} onScoreSubmit={handleTestScore} />} />
          <Route path="/leaderboard" element={<Leaderboard dark={dark} user={user} />} />
          <Route path="/turret"      element={<TurretPlanner dark={dark} />} />
        </Routes>
      </div>
    </div>
  )
}
