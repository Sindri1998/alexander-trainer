import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ams_user'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setUser(JSON.parse(saved))
    } catch {}
    setReady(true)
  }, [])

  const login = (name) => {
    const u = { name: name.trim(), joinedAt: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return { user, ready, login, logout }
}

export function LoginScreen({ onLogin, dark }) {
  const [name, setName] = useState('')
  const [shake, setShake] = useState(false)

  const T = dark ? {
    bg: '#0d1117', sur: '#161b22', bdr: '#30363d',
    txt: '#c9d1d9', mut: '#8b949e', inp: '#0d1117',
  } : {
    bg: '#f0f4f8', sur: '#ffffff', bdr: '#e2e8f0',
    txt: '#1e293b', mut: '#64748b', inp: '#ffffff',
  }

  const handleSubmit = () => {
    if (!name.trim()) { setShake(true); setTimeout(() => setShake(false), 500); return }
    onLogin(name.trim())
  }

  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', padding: 24,
    }}>
      {/* Card */}
      <div style={{
        background: T.sur, border: `1px solid ${T.bdr}`,
        borderRadius: 14, padding: '36px 40px',
        width: '100%', maxWidth: 380,
        boxShadow: dark ? '0 8px 32px #00000066' : '0 8px 32px #0000001a',
      }}>
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-block',
            background: '#004990',
            borderRadius: 7,
            padding: '8px 24px',
            marginBottom: 12,
          }}>
            <div style={{ color: '#c8d8e8', fontWeight: 800, fontSize: 16, letterSpacing: '0.04em' }}>
              Alexander Machine Shop
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 14 }}>
            <span style={{ background: '#ef4444', color: '#fff', fontWeight: 900, fontSize: 10, padding: '2px 6px', borderRadius: '3px 0 0 3px', letterSpacing: '0.05em' }}>RAD</span>
            <span style={{ background: dark ? '#1e2633' : '#f1f5f9', border: `1px solid ${T.bdr}`, borderLeft: 'none', color: T.mut, fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: '0 3px 3px 0', letterSpacing: '0.15em' }}>MFG</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 4 }}>Training Portal</div>
          <div style={{ fontSize: 11, color: T.mut }}>Enter your name to get started</div>
        </div>

        {/* Input */}
        <div style={{
          animation: shake ? 'shake 0.4s ease' : 'none',
          marginBottom: 14,
        }}>
          <label style={{ fontSize: 10, color: T.mut, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Your Name
          </label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. John Smith"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: T.inp, color: T.txt,
              border: `1px solid ${shake ? '#ef4444' : T.bdr}`,
              borderRadius: 7, padding: '10px 14px',
              fontSize: 14, fontFamily: 'monospace',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = '#004990'}
            onBlur={e => e.target.style.borderColor = T.bdr}
          />
        </div>

        <button
          onClick={handleSubmit}
          style={{
            width: '100%', padding: '11px',
            background: '#004990', color: '#c8d8e8',
            border: 'none', borderRadius: 7,
            fontSize: 13, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.05em',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.target.style.background = '#005bb5'}
          onMouseLeave={e => e.target.style.background = '#004990'}
        >
          Enter Training Portal →
        </button>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 10, color: T.mut }}>
          PUMA DNT2600M · Fanuc 0i-TF · G-Code Training
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-5px); }
          80%       { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}
