'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type City = { city: string; coordinates: { lat: number; lon: number } }
type LocationSeries = { key: string; name: string; color: string; lat: number; lon: number; data: any[] }

const BIRTH_DATE = '1990-01-01T12:00:00Z'
const DEFAULT_HOME = { name: 'Home', lat: -34.6, lon: -58.38 }
const COLORS = ['#60a5fa', '#f59e0b', '#34d399', '#a78bfa', '#f472b6']

function yearRangeISO(year: number) {
  return {
    start: `${year}-01-01T00:00:00Z`,
    end: `${year}-12-31T00:00:00Z`
  }
}

export default function ForecastPage() {
  const year = useMemo(() => new Date().getUTCFullYear(), [])
  const { start, end } = yearRangeISO(year)

  const [series, setSeries] = useState<LocationSeries[]>([])
  const [recommended, setRecommended] = useState<City[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)

  const addSeries = useCallback(async (name: string, lat: number, lon: number, color: string) => {
    const base = process.env.NEXT_PUBLIC_ABU_URL || 'http://localhost:8000'
    const url = `${base}/api/astro/forecast?birthDate=${BIRTH_DATE}&lat=${lat}&lon=${lon}&start=${start}&end=${end}&step=7d`
    const data = await fetcher(url)
    setSeries(prev => {
      const key = `${name}-${lat}-${lon}`
      if (prev.some(s => s.key === key)) return prev
      return [...prev, { key, name, color, lat, lon, data: data.timeseries || [] }]
    })
  }, [start, end])

  // Initialize with Home
  useEffect(() => {
    addSeries(DEFAULT_HOME.name, DEFAULT_HOME.lat, DEFAULT_HOME.lon, COLORS[0])
      .finally(() => setLoading(false))
  }, [addSeries])

  // Load recommended cities from localStorage (set on interpret page)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('recommendedCities')
      if (raw) {
        const parsed = JSON.parse(raw) as any[]
        const cities: City[] = parsed.map((m: any) => ({ city: m.city, coordinates: m.coordinates }))
        setRecommended(cities)
      }
    } catch (e) {
      // ignore
    }
  }, [])

  const handleAdd = async () => {
    if (!selected) return
    const city = recommended.find(c => `${c.city}` === selected)
    if (!city) return
    const color = COLORS[(series.length) % COLORS.length]
    await addSeries(city.city, city.coordinates.lat, city.coordinates.lon, color)
  }

  return (
    <main className="p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Forecast Timeseries</h2>
          <p className="text-white/70 text-sm">Compara tu línea base con ubicaciones sugeridas.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="bg-white/10 border border-white/10 rounded px-3 py-2"
          >
            <option value="">Selecciona ubicación sugerida</option>
            {recommended.map((c) => (
              <option key={c.city} value={c.city}>{c.city}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded text-white"
          >
            Añadir línea
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-96 bg-white/10 rounded-lg"></div>
          <p className="text-sm text-white/60 text-center">Calculando forecast...</p>
        </div>
      ) : (
        <div style={{ width: '100%', height: 420 }} className="bg-white/5 rounded-lg p-2">
          <ResponsiveContainer>
            <LineChart>
            <XAxis dataKey="t" allowDuplicatedCategory={false} />
            <YAxis />
            <Tooltip />
            <Legend />
            {series.map((s) => (
              <Line key={s.key} data={s.data} type="monotone" dataKey="F" name={s.name} stroke={s.color} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      )}
    </main>
  )
}
