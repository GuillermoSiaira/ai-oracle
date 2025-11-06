'use client'

import { useState, useEffect } from 'react'
import CitySelector, { CityData } from '@/components/CitySelector'

type Dignity = {
  domicile: boolean
  exaltation: boolean
  detriment: boolean
  fall: boolean
  peregrine: boolean
  score: number
}

type Planet = {
  name: string
  longitude: number
  sign: string
  degree_in_sign: number
  formatted: string
  house?: number | null
  dignity: Dignity
}

type DetailedChart = {
  datetime: string
  location: { lat: number; lon: number }
  planets: Planet[]
  aspects: any[]
  arabic_parts: any
  lunar_nodes: any
}

type UserProfile = {
  name: string
  birthCity: CityData | null
  residenceCity: CityData | null
  birthDate: string
  birthTime: string
}

export default function PositionsTableDemo() {
  const [chart, setChart] = useState<DetailedChart | null>(null)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    birthCity: null,
    residenceCity: null,
    birthDate: '1990-07-05',
    birthTime: '12:00'
  })

  // Load profile from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('userProfile')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setProfile(parsed)
      } catch (err) {
        console.error('Error loading profile:', err)
      }
    }
  }, [])

  // Save profile to localStorage when it changes
  useEffect(() => {
    if (profile.name || profile.birthCity) {
      localStorage.setItem('userProfile', JSON.stringify(profile))
    }
  }, [profile])

  async function fetchChart() {
    if (!profile.birthCity) {
      alert('Por favor selecciona tu lugar de nacimiento')
      return
    }

    setLoading(true)
    try {
      const datetime = `${profile.birthDate}T${profile.birthTime}:00Z`
      const base = process.env.NEXT_PUBLIC_ABU_URL || 'http://localhost:8000'
      const url = `${base}/api/astro/chart-detailed?date=${datetime}&lat=${profile.birthCity.lat}&lon=${profile.birthCity.lon}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Error fetching chart')
      const data = await res.json()
      setChart(data)
    } catch (err) {
      console.error(err)
      alert('Error al cargar la carta')
    } finally {
      setLoading(false)
    }
  }

  function getDignityLabel(dignity: Dignity): string {
    if (dignity.domicile) return 'Domicilio'
    if (dignity.exaltation) return 'Exaltación'
    if (dignity.detriment) return 'Exilio'
    if (dignity.fall) return 'Caída'
    if (dignity.peregrine) return 'Peregrino'
    return '—'
  }

  function getDignityColor(dignity: Dignity): string {
    if (dignity.domicile || dignity.exaltation) return 'text-green-400'
    if (dignity.detriment || dignity.fall) return 'text-red-400'
    return 'text-gray-400'
  }

  return (
    <main className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Tabla de Posiciones Detalladas</h2>
      <p className="text-white/70 text-sm">
        Calcula posiciones exactas, dignidades esenciales, nodos lunares y partes arábicas.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); fetchChart() }} className="bg-white/5 rounded-lg p-6 space-y-4">
        {/* User Name */}
        <div>
          <label className="block text-sm text-white/80 mb-1">Nombre completo</label>
          <input
            type="text"
            value={profile.name}
            onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Juan Pérez"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 outline-none focus:border-white/30"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Birth Date & Time */}
          <div>
            <label className="block text-sm text-white/80 mb-1">
              Fecha de nacimiento <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={profile.birthDate}
              onChange={e => setProfile(prev => ({ ...prev, birthDate: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 outline-none focus:border-white/30"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-1">
              Hora de nacimiento <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={profile.birthTime}
              onChange={e => setProfile(prev => ({ ...prev, birthTime: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 outline-none focus:border-white/30"
              required
            />
          </div>
        </div>

        {/* Birth City */}
        <CitySelector
          label="Lugar de nacimiento"
          value={profile.birthCity}
          onChange={(city) => setProfile(prev => ({ ...prev, birthCity: city }))}
          placeholder="Buscar ciudad de nacimiento..."
          required
        />

        {/* Residence City */}
        <CitySelector
          label="Lugar de residencia actual"
          value={profile.residenceCity}
          onChange={(city) => setProfile(prev => ({ ...prev, residenceCity: city }))}
          placeholder="Buscar ciudad de residencia..."
        />

        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={() => {
              if (confirm('¿Borrar todos los datos guardados?')) {
                localStorage.removeItem('userProfile')
                setProfile({
                  name: '',
                  birthCity: null,
                  residenceCity: null,
                  birthDate: '1990-07-05',
                  birthTime: '12:00'
                })
                setChart(null)
              }
            }}
            className="text-sm text-white/60 hover:text-white underline"
          >
            Borrar datos guardados
          </button>

          <button
            type="submit"
            disabled={loading || !profile.birthCity}
            className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Calculando...' : 'Calcular Posiciones'}
          </button>
        </div>
      </form>

      {chart && (
        <div className="space-y-6">
          {/* User Info Header */}
          <section className="bg-gradient-to-r from-yellow-500/10 to-purple-500/10 border border-white/10 rounded-lg p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xl font-semibold text-yellow-200 mb-2">
                  {profile.name || 'Consulta Astrológica'}
                </h3>
                <div className="space-y-1 text-sm text-white/80">
                  <div>
                    <span className="text-white/60">Nacimiento:</span>{' '}
                    {new Date(chart.datetime).toLocaleString('es-ES', { 
                      dateStyle: 'long', 
                      timeStyle: 'short' 
                    })}
                  </div>
                  <div>
                    <span className="text-white/60">Lugar:</span>{' '}
                    {profile.birthCity ? `${profile.birthCity.city}, ${profile.birthCity.country}` : 'No especificado'}
                  </div>
                  <div className="font-mono text-xs text-white/50">
                    {chart.location.lat.toFixed(4)}°, {chart.location.lon.toFixed(4)}°
                  </div>
                </div>
              </div>
              {profile.residenceCity && (
                <div className="border-l border-white/10 pl-4">
                  <h4 className="text-sm font-medium text-white/70 mb-2">Residencia Actual</h4>
                  <div className="space-y-1 text-sm text-white/80">
                    <div>{profile.residenceCity.city}, {profile.residenceCity.country}</div>
                    <div className="font-mono text-xs text-white/50">
                      {profile.residenceCity.lat.toFixed(4)}°, {profile.residenceCity.lon.toFixed(4)}°
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Main Positions Table */}
          <section className="bg-white/5 rounded-lg p-4 overflow-x-auto">
            <h3 className="text-xl font-semibold mb-4">Posiciones Planetarias</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3">Planeta</th>
                  <th className="text-left py-2 px-3">Posición</th>
                  <th className="text-left py-2 px-3">Longitud</th>
                  <th className="text-left py-2 px-3">Casa</th>
                  <th className="text-left py-2 px-3">Dignidad</th>
                  <th className="text-right py-2 px-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {chart.planets.filter(p => !p.name.includes('Node')).map((planet, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-3 font-medium">{planet.name}</td>
                    <td className="py-2 px-3 font-mono text-yellow-200">{planet.formatted}</td>
                    <td className="py-2 px-3 text-white/60 font-mono text-xs">{planet.longitude.toFixed(4)}°</td>
                    <td className="py-2 px-3 text-white/60">{planet.house || '—'}</td>
                    <td className={`py-2 px-3 ${getDignityColor(planet.dignity)}`}>
                      {getDignityLabel(planet.dignity)}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono ${planet.dignity.score > 0 ? 'text-green-400' : planet.dignity.score < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {planet.dignity.score > 0 ? '+' : ''}{planet.dignity.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Lunar Nodes */}
          <section className="bg-white/5 rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-4">Nodos Lunares</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 rounded">
                <div className="text-sm text-white/60 mb-1">Nodo Norte ☊</div>
                <div className="text-lg font-mono text-yellow-200">{chart.lunar_nodes.north_node.formatted}</div>
                <div className="text-xs text-white/40 font-mono mt-1">{chart.lunar_nodes.north_node.longitude.toFixed(4)}°</div>
              </div>
              <div className="p-3 bg-white/5 rounded">
                <div className="text-sm text-white/60 mb-1">Nodo Sur ☋</div>
                <div className="text-lg font-mono text-yellow-200">{chart.lunar_nodes.south_node.formatted}</div>
                <div className="text-xs text-white/40 font-mono mt-1">{chart.lunar_nodes.south_node.longitude.toFixed(4)}°</div>
              </div>
            </div>
          </section>

          {/* Arabic Parts */}
          <section className="bg-white/5 rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-4">Partes Arábicas</h3>
            <div className="p-3 bg-white/5 rounded">
              <div className="text-sm text-white/60 mb-1">Parte de la Fortuna ⊕</div>
              <div className="text-lg font-mono text-yellow-200">{chart.arabic_parts.part_of_fortune.formatted}</div>
              <div className="text-xs text-white/40 font-mono mt-1">{chart.arabic_parts.part_of_fortune.longitude.toFixed(4)}°</div>
              {chart.arabic_parts.part_of_fortune.note && (
                <div className="text-xs text-orange-300 mt-2 italic">⚠️ {chart.arabic_parts.part_of_fortune.note}</div>
              )}
            </div>
          </section>

          {/* Aspects Summary */}
          <section className="bg-white/5 rounded-lg p-4 overflow-x-auto">
            <h3 className="text-xl font-semibold mb-4">Aspectos ({chart.aspects.length})</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3">Planeta A</th>
                  <th className="text-center py-2 px-3">Aspecto</th>
                  <th className="text-left py-2 px-3">Planeta B</th>
                  <th className="text-right py-2 px-3">Orbe</th>
                </tr>
              </thead>
              <tbody>
                {chart.aspects.map((asp, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-2 px-3">{asp.a}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        asp.type === 'conjunction' ? 'bg-yellow-600/20 text-yellow-200' :
                        asp.type === 'trine' ? 'bg-green-600/20 text-green-200' :
                        asp.type === 'sextile' ? 'bg-blue-600/20 text-blue-200' :
                        asp.type === 'square' ? 'bg-red-600/20 text-red-200' :
                        asp.type === 'opposition' ? 'bg-purple-600/20 text-purple-200' :
                        'bg-gray-600/20 text-gray-200'
                      }`}>
                        {asp.type}
                      </span>
                    </td>
                    <td className="py-2 px-3">{asp.b}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-white/60">{asp.orb.toFixed(2)}°</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </main>
  )
}
