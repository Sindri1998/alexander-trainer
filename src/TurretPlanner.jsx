import { useEffect, useRef, useState } from 'react'

// The planner is a self-contained page at public/turret.html, embedded in an
// iframe on purpose: it sets html/body height, overflow:hidden and a class on
// <body> to drive its print layout, which would fight the rest of the app if
// it were inlined. The iframe scopes all of that to the planner.
export default function TurretPlanner({ dark }) {
  const frame = useRef(null)
  const [top, setTop] = useState(44)

  // sit directly under the nav, whatever height it wraps to
  useEffect(() => {
    const measure = () => setTop(document.querySelector('nav')?.offsetHeight ?? 44)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // keep the planner's theme in step with the site's
  const push = () => frame.current?.contentWindow?.postMessage(
    { type: 'theme', value: dark ? 'dark' : 'light' }, '*')
  useEffect(push, [dark])

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, top, bottom: 0 }}>
      <iframe
        ref={frame}
        title="Turret Layout Planner"
        src={`/turret.html?theme=${dark ? 'dark' : 'light'}`}
        onLoad={push}
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
      />
    </div>
  )
}
