import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { NavLink } from "react-router-dom"

const HOVER_DELAY = 500
const LONG_PRESS_DELAY = 500

// Ítem del riel vertical de navegación: ícono solo, con un tooltip que aparece tras
// mantener el mouse encima o mantener presionado en pantalla táctil por 0.5s, y
// opcionalmente un badge (ej. despachos pendientes). Sirve tanto para los links de
// navegación (prop "to") como para acciones sueltas como cerrar sesión (prop "onClick").
//
// "showAllLabels"/"onLongPress" son para el modo táctil: un long-press en CUALQUIER
// ícono debe mostrar los nombres de TODOS a la vez (para ubicarse de un vistazo, no
// uno por uno) — MainLayout.jsx controla ese estado compartido y se lo pasa a cada
// RailIcon; este componente solo avisa cuándo detecta su propio long-press.
export default function RailIcon({ to, onClick, icon: Icon, label, danger, badge, pulse, showAllLabels, onLongPress }) {
  const [showTip, setShowTip] = useState(false)
  const [tipPos, setTipPos] = useState(null) // { top, left } en coords de viewport
  const [hovered, setHovered] = useState(false)
  const timerRef = useRef(null)
  const longPressFired = useRef(false)
  const elRef = useRef(null)

  // El tooltip se porta directo a <body> (createPortal) en vez de vivir dentro del
  // riel: el <nav> del riel tiene overflow-y-auto (para poder hacer scroll si hay
  // muchos íconos), y por la forma en que CSS calcula overflow, eso también recorta
  // el eje X — cualquier tooltip posicionado con "left:100%" quedaba cortado y no se
  // veía. Portando a <body> con position:fixed y coordenadas reales (getBoundingClientRect)
  // se evita depender de qué contenedor lo envuelva.
  const computePos = () => {
    const rect = elRef.current?.getBoundingClientRect()
    if (rect) setTipPos({ top: rect.top + rect.height / 2, left: rect.right + 10 })
  }

  const handleEnter = () => {
    setHovered(true)
    timerRef.current = setTimeout(() => { computePos(); setShowTip(true) }, HOVER_DELAY)
  }
  const handleLeave = () => {
    setHovered(false)
    clearTimeout(timerRef.current)
    setShowTip(false)
  }

  const handleTouchStart = () => {
    longPressFired.current = false
    timerRef.current = setTimeout(() => {
      longPressFired.current = true
      onLongPress?.() // el padre pone showAllLabels=true para TODOS los íconos
    }, LONG_PRESS_DELAY)
  }
  const handleTouchEnd = () => {
    clearTimeout(timerRef.current)
  }
  // Si ya se mostró por long-press, el toque que sigue no debe navegar — primero se
  // muestran los nombres, recién el próximo toque navega de verdad.
  const handleClick = (e) => {
    if (longPressFired.current) {
      longPressFired.current = false
      e.preventDefault()
      return
    }
    onClick?.(e)
  }

  // Cuando el padre activa "mostrar todos" (long-press en cualquier ícono del riel),
  // cada RailIcon calcula su propia posición y se suma a la foto grupal.
  useEffect(() => {
    if (showAllLabels) computePos()
  }, [showAllLabels])

  const content = () => (
    <>
      <Icon size={18} />
      {badge > 0 && (
        <span
          className={pulse ? "rail-badge-pulse" : ""}
          style={{
            position: "absolute", top: 2, right: 2,
            minWidth: 15, height: 15, padding: "0 3px",
            borderRadius: 999, background: "var(--danger)", color: "white",
            fontSize: 10, fontWeight: 700, lineHeight: "15px", textAlign: "center",
          }}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </>
  )

  const tooltip = (showTip || showAllLabels) && tipPos && createPortal(
    <div
      className="animate-fade-in"
      style={{
        position: "fixed", top: tipPos.top, left: tipPos.left, transform: "translateY(-50%)",
        zIndex: 9999, whiteSpace: "nowrap", pointerEvents: "none",
        background: "var(--bg-secondary)", border: "1px solid var(--border)",
        borderRadius: 8, padding: "6px 12px", boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
      }}>
      {label}
    </div>,
    document.body
  )

  const sharedProps = {
    ref: elRef,
    onMouseEnter: handleEnter,
    onMouseLeave: handleLeave,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchEnd,
    title: "", // el tooltip propio reemplaza al nativo — evita el doble tooltip del navegador
    className: "relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
  }

  if (onClick) {
    return (
      <>
        <button {...sharedProps} onClick={handleClick}
          style={{
            background: hovered ? "var(--bg-tertiary)" : "transparent",
            color: danger ? "var(--danger)" : "var(--text-secondary)",
          }}>
          {content()}
        </button>
        {tooltip}
      </>
    )
  }

  return (
    <>
      <NavLink {...sharedProps} to={to} onClick={handleClick}
        style={({ isActive }) => ({
          // Hover en tono suave y neutro (bg-tertiary) para no competir con el
          // resaltado de la sección activa, que usa el color de marca.
          background: isActive ? "var(--brand-light)" : hovered ? "var(--bg-tertiary)" : "transparent",
          color: isActive ? "var(--brand)" : "var(--text-secondary)",
        })}>
        {content()}
      </NavLink>
      {tooltip}
    </>
  )
}
