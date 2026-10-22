import { useEffect, useRef } from 'react'

// Lathe Sim (Fanuc 0i-TF / Macro B / DNT2600M) — single-file simulator served from /public/lathe-sim.html.
// Update the sim by replacing public/lathe-sim.html with a fresh build of RAD_MFG_Lathe_Sim.html
// (the embed block just before </head> must stay: it hides the sim's own brand bar and syncs the theme).
export default function Simulator({ dark = true }) {
  const frameRef = useRef(null)
  const theme = dark ? 'dark' : 'light'

  const send = () => {
    const w = frameRef.current && frameRef.current.contentWindow
    if (w) w.postMessage({ type: 'ams-theme', theme }, window.location.origin)
  }

  // follow the site's dark/light toggle
  useEffect(send, [theme])

  // the sim announces itself once loaded; push the current theme then
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin === window.location.origin && e.data && e.data.type === 'ams-sim-ready') send()
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 560, background: dark ? '#0d1117' : '#f0f4f8' }}>
      <iframe
        ref={frameRef}
        title="Lathe Sim — Fanuc 0i-TF / DNT2600M"
        src={`/lathe-sim.html?embed=1&theme=${theme}`}
        style={{ flex: 1, width: '100%', border: 0, display: 'block', background: dark ? '#0d1117' : '#f0f4f8' }}
      />
    </div>
  )
}
