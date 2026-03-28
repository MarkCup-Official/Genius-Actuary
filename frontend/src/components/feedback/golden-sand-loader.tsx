import { useEffect, useRef } from 'react'

import { useReducedMotion } from 'framer-motion'

interface GoldenSandLoaderProps {
  label: string
}

export function GoldenSandLoader({ label }: GoldenSandLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || reducedMotion) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const resize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio
      canvas.height = canvas.clientHeight * window.devicePixelRatio
      context.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: 120 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 40 + Math.random() * 120,
      speed: 0.003 + Math.random() * 0.012,
      size: 1 + Math.random() * 2.4,
    }))

    let frame = 0
    let animationFrame = 0

    const render = () => {
      frame += 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const cx = width / 2
      const cy = height / 2

      context.clearRect(0, 0, width, height)

      const radial = context.createRadialGradient(cx, cy, 0, cx, cy, 140)
      radial.addColorStop(0, 'rgba(249, 228, 159, 0.16)')
      radial.addColorStop(0.4, 'rgba(212, 175, 55, 0.08)')
      radial.addColorStop(1, 'rgba(8, 8, 10, 0)')
      context.fillStyle = radial
      context.fillRect(0, 0, width, height)

      particles.forEach((particle, index) => {
        particle.angle += particle.speed
        particle.radius *= 0.992

        if (particle.radius < 18) {
          particle.radius = 120 + Math.random() * 70
          particle.angle = (index / particles.length) * Math.PI * 2
        }

        const x = cx + Math.cos(particle.angle + frame * 0.01) * particle.radius
        const y = cy + Math.sin(particle.angle + frame * 0.01) * particle.radius * 0.68

        context.beginPath()
        context.fillStyle = `rgba(249, 228, 159, ${0.2 + (1 - particle.radius / 180) * 0.8})`
        context.shadowBlur = 20
        context.shadowColor = 'rgba(212, 175, 55, 0.55)'
        context.arc(x, y, particle.size, 0, Math.PI * 2)
        context.fill()
      })

      context.beginPath()
      context.fillStyle = 'rgba(249, 228, 159, 0.88)'
      context.shadowBlur = 38
      context.shadowColor = 'rgba(212, 175, 55, 0.66)'
      context.arc(cx, cy, 12, 0, Math.PI * 2)
      context.fill()

      animationFrame = window.requestAnimationFrame(render)
    }

    animationFrame = window.requestAnimationFrame(render)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
    }
  }, [reducedMotion])

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border-subtle bg-app-bg-elevated p-6">
      <canvas ref={canvasRef} className="h-64 w-full rounded-[24px]" />
      {reducedMotion ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="size-16 rounded-full bg-cover bg-center bg-no-repeat opacity-80 blur-sm"
            style={{ backgroundColor: 'var(--gold-primary)', backgroundImage: 'var(--gradient-gold)' }}
          />
        </div>
      ) : null}
      <p className="mt-4 text-center text-sm text-text-secondary">{label}</p>
    </div>
  )
}
