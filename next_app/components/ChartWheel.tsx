'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

type Planet = { name: string; lon: number; sign?: string; house?: number | null }
type Aspect = { a: string; b: string; type: string; orb?: number; angle?: number }
type HouseCusp = { lon: number }

export interface ChartWheelProps {
  chart: {
    planets: Planet[]
    aspects?: Aspect[]
    houses?: HouseCusp[]
    datetime?: string
    location?: { lat: number; lon: number }
  }
  width?: number
  height?: number
  showAspects?: boolean
  showHouses?: boolean
  className?: string
}

const ZODIAC_SIGNS = [
  { name: 'Aries', symbol: '♈', element: 'fire', color: '#ff595e' },
  { name: 'Taurus', symbol: '♉', element: 'earth', color: '#8ac926' },
  { name: 'Gemini', symbol: '♊', element: 'air', color: '#1982c4' },
  { name: 'Cancer', symbol: '♋', element: 'water', color: '#6a4c93' },
  { name: 'Leo', symbol: '♌', element: 'fire', color: '#ff595e' },
  { name: 'Virgo', symbol: '♍', element: 'earth', color: '#8ac926' },
  { name: 'Libra', symbol: '♎', element: 'air', color: '#1982c4' },
  { name: 'Scorpio', symbol: '♏', element: 'water', color: '#6a4c93' },
  { name: 'Sagittarius', symbol: '♐', element: 'fire', color: '#ff595e' },
  { name: 'Capricorn', symbol: '♑', element: 'earth', color: '#8ac926' },
  { name: 'Aquarius', symbol: '♒', element: 'air', color: '#1982c4' },
  { name: 'Pisces', symbol: '♓', element: 'water', color: '#6a4c93' }
]

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '⛢',
  Neptune: '♆',
  Pluto: '♇'
}

type TooltipData = { x: number; y: number; content: string }

export default function ChartWheel({
  chart,
  width = 600,
  height = 600,
  showAspects = true,
  showHouses = true,
  className
}: ChartWheelProps) {
  const ref = useRef<SVGSVGElement | null>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  useEffect(() => {
    if (!chart || !ref.current) return
    const svg = d3.select(ref.current)
    const r = Math.min(width, height) / 2 - 40
    svg.attr('viewBox', `0 0 ${width} ${height}`)
    svg.selectAll('*').remove()

    // Center group
    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`)

    // Outer circle
    g.append('circle').attr('r', r).attr('fill', 'none').attr('stroke', 'rgba(255,255,255,0.1)')

    // Zodiac ring
    const arc = d3.arc().innerRadius(r - 60).outerRadius(r)
    ZODIAC_SIGNS.forEach((sign, i) => {
      const startAngle = ((i * 30) - 90) * (Math.PI / 180)
      const endAngle = (((i + 1) * 30) - 90) * (Math.PI / 180)

      g.append('path')
        .attr('d', arc({ startAngle, endAngle } as any) as string)
        .attr('fill', `${sign.color}15`)
        .attr('stroke', 'rgba(255,255,255,0.1)')

      const angle = (i * 30 + 15 - 90) * (Math.PI / 180)
      const labelRadius = r - 30
      const symbolX = Math.cos(angle) * (r - 45)
      const symbolY = Math.sin(angle) * (r - 45)
      const labelX = Math.cos(angle) * labelRadius
      const labelY = Math.sin(angle) * labelRadius

      g.append('text')
        .attr('x', symbolX)
        .attr('y', symbolY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', sign.color)
        .attr('font-size', '16px')
        .text(sign.symbol)

      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', 'rgba(255,255,255,0.6)')
        .attr('font-size', '10px')
        .text(sign.name)
    })

    // Degree markers
    for (let i = 0; i < 36; i++) {
      const angle = (i * 10 - 90) * (Math.PI / 180)
      const x1 = Math.cos(angle) * (r - 60)
      const y1 = Math.sin(angle) * (r - 60)
      const x2 = Math.cos(angle) * r
      const y2 = Math.sin(angle) * r

      g.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', 'rgba(255,255,255,0.1)')
        .attr('stroke-width', i % 3 === 0 ? 2 : 1)
    }

    // Inner boundary
    g.append('circle').attr('r', r - 60).attr('fill', 'none').attr('stroke', 'rgba(255,255,255,0.12)')

    // House ring (sectors + cusps)
    const houseInner = r - 120
    const houseOuter = r - 60
    const houseArc = d3.arc().innerRadius(houseInner).outerRadius(houseOuter)

    if (showHouses && chart.houses?.length) {
      const cusps = chart.houses
      const cuspAngles = cusps.map((c) => ((c.lon - 90) * Math.PI) / 180)

      for (let i = 0; i < cusps.length; i++) {
        const startAngle = cuspAngles[i]
        const nextAngle = cuspAngles[(i + 1) % cusps.length]
        const endAngle = nextAngle < startAngle ? nextAngle + Math.PI * 2 : nextAngle
        g.append('path')
          .attr('d', houseArc({ startAngle, endAngle } as any) as string)
          .attr('fill', i % 2 === 0 ? 'rgba(255, 209, 102, 0.06)' : 'transparent')
          .attr('stroke', 'rgba(255,255,255,0.06)')
      }

      const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
      cusps.forEach((cusp: any, i: number) => {
        const angle = (cusp.lon - 90) * (Math.PI / 180)
        const x2 = Math.cos(angle) * r
        const y2 = Math.sin(angle) * r
        const x1 = Math.cos(angle) * (r - 60)
        const y1 = Math.sin(angle) * (r - 60)
        g.append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', i === 0 || i === 9 ? '#ffe28a' : '#ffd166')
          .attr('stroke-width', i === 0 || i === 9 ? 2.5 : 1)

        const next = cusps[(i + 1) % cusps.length]
        const delta = ((next.lon - cusp.lon + 360) % 360)
        const midAngle = (cusp.lon + delta / 2 - 90) * (Math.PI / 180)
        const labelR = (houseInner + houseOuter) / 2
        const labelX = Math.cos(midAngle) * labelR
        const labelY = Math.sin(midAngle) * labelR
        g.append('text')
          .attr('x', labelX)
          .attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', '#ffd166')
          .attr('font-size', '11px')
          .text(roman[i] || String(i + 1))
      })
    }

    // Aspects
    if (showAspects && chart.aspects?.length) {
      const aspectGroup = g.append('g').attr('class', 'aspects')
      chart.aspects.forEach((aspect: any) => {
        const p1 = chart.planets.find((p: any) => p.name === aspect.a)
        const p2 = chart.planets.find((p: any) => p.name === aspect.b)
        if (!p1 || !p2) return

        const angle1 = (p1.lon - 90) * (Math.PI / 180)
        const angle2 = (p2.lon - 90) * (Math.PI / 180)
        const x1 = Math.cos(angle1) * (r - 20)
        const y1 = Math.sin(angle1) * (r - 20)
        const x2 = Math.cos(angle2) * (r - 20)
        const y2 = Math.sin(angle2) * (r - 20)

        const aspectColors: { [key: string]: string } = {
          conjunction: '#ffd166',
          opposition: '#ff6b6b',
          trine: '#4ecdc4',
          square: '#ff6b6b',
          sextile: '#95a5a6'
        }
        const widths: { [key: string]: number } = {
          conjunction: 1.5,
          opposition: 1.5,
          square: 1.2,
          trine: 1.1,
          sextile: 1.1
        }

        aspectGroup
          .append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', aspectColors[aspect.type] || '#ffffff')
          .attr('stroke-width', widths[aspect.type] || 1)
          .attr('stroke-dasharray', aspect.type === 'square' ? '4,4' : 'none')
          .attr('opacity', 0.45)
      })
    }

    // Planets with simple overlap avoidance
    const planets = chart.planets || []
    const stacked = [...planets]
      .sort((a: any, b: any) => a.lon - b.lon)
      .reduce((acc: any[], p: any) => {
        const last = acc[acc.length - 1]
        const threshold = 8
        const level = last && Math.abs(p.lon - last.original.lon) < threshold ? last.level + 1 : 0
        acc.push({ original: p, level: Math.min(level, 3) })
        return acc
      }, [])

    stacked.forEach(({ original: p, level }: any) => {
      const angle = (p.lon - 90) * (Math.PI / 180)
      const radiusOffset = 20 + level * 12
      const x = Math.cos(angle) * (r - radiusOffset)
      const y = Math.sin(angle) * (r - radiusOffset)

      const group = g
        .append('g')
        .attr('class', 'planet-marker')
        .style('cursor', 'pointer')
        .on('mouseenter', () => {
          setTooltip({
            x: width / 2 + x,
            y: height / 2 + y,
            content: `${p.name} ${PLANET_SYMBOLS[p.name] || ''}\n${p.lon.toFixed(1)}° ${p.sign || ''}`
          })
        })
        .on('mouseleave', () => setTooltip(null))

      group
        .append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 8)
        .attr('fill', '#1f1f1f')
        .attr('stroke', '#ffd166')
        .attr('stroke-width', 1.5)

      group
        .append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', '#ffd166')
        .attr('font-size', '14px')
        .text(PLANET_SYMBOLS[p.name] || p.name[0])
    })
  }, [chart, width, height, showAspects, showHouses])

  return (
    <div className={`relative ${className || ''}`}>
      <svg ref={ref} className="w-full max-w-[600px] h-auto mx-auto" />
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(0,0,0,0.8)',
            padding: '0.5rem',
            borderRadius: 4,
            whiteSpace: 'pre-line'
          }}
          className="text-sm text-white pointer-events-none"
        >
          {tooltip.content}
        </div>
      )}
    </div>
  )
}
