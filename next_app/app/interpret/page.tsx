'use client'

import useSWR from 'swr'
import LillyPanel from '@/components/LillyPanel'
import CitySelector, { CityData } from '@/components/CitySelector'
import dynamic from 'next/dynamic'
import AbuRankingPanel from '@/components/AbuRankingPanel'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// Map component (client-only) - use relative import to avoid path resolution issues on Windows
const MapWithMarkers = dynamic<any>(() => import('../../components/MapWithMarkers'), { ssr: false })
const ChartWheel = dynamic<any>(() => import('../../components/ChartWheel'), { ssr: false })

const ABU = process.env.NEXT_PUBLIC_ABU_URL || 'http://localhost:8000'
const LILLY = process.env.NEXT_PUBLIC_LILLY_URL || 'http://localhost:8001'

type UserProfile = {
  name: string
  birthCity: CityData | null
  residenceCity: CityData | null
  birthDate: string
  birthTime: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error en la petición')
  return res.json()
}

const postJson = async (url: string, body: any) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error('Error en la petición')
  return res.json()
}

function yearRangeISO(year: number) {
  return {
    start: `${year}-01-01T00:00:00Z`,
    end: `${year}-12-31T00:00:00Z`
  }
}

type LocationSeries = {
  key: string
  name: string
  color: string
  lat: number
  lon: number
  data: any[]
}

const COLORS = ['#60a5fa', '#f59e0b', '#34d399', '#a78bfa', '#f472b6']

export default function InterpretPage() {
  // Load user profile from localStorage
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    birthCity: null,
    residenceCity: null,
    birthDate: '1990-07-05',
    birthTime: '12:00'
  })
  const [showProfileForm, setShowProfileForm] = useState(false)

  // Load profile on mount
  useEffect(() => {
    const saved = localStorage.getItem('userProfile')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setProfile(parsed)
        if (!parsed.birthCity) setShowProfileForm(true)
      } catch (err) {
        console.error('Error loading profile:', err)
        setShowProfileForm(true)
      }
    } else {
      setShowProfileForm(true)
    }
  }, [])

  // Save profile when it changes
  useEffect(() => {
    if (profile.name || profile.birthCity) {
      localStorage.setItem('userProfile', JSON.stringify(profile))
    }
  }, [profile])

  // Build birth datetime from profile
  const birthDateISO = useMemo(() => {
    if (!profile.birthCity) return ''
    return `${profile.birthDate}T${profile.birthTime}:00Z`
  }, [profile.birthDate, profile.birthTime, profile.birthCity])

  // UI state: tone and question for Lilly (local editing, not reactive)
  const [tone, setTone] = useState<string>('poético')
  const [question, setQuestion] = useState<string>('')
  
  // Committed state: only updated on explicit Regenerar click
  const [committedTone, setCommittedTone] = useState<string>('poético')
  const [committedQuestion, setCommittedQuestion] = useState<string>('')
  
  // Lazy loading control: user explicitly requests map/forecast
  const [showMapSection, setShowMapSection] = useState<boolean>(false)
  
  // 1) Life cycles and text interpretation (PRIORITY: load immediately)
  const { data: cyclesData, error: cyclesError } = useSWR(
    birthDateISO ? `${ABU}/api/astro/life-cycles?birthDate=${birthDateISO}` : null,
    fetcher
  )

  const { data: interpretation, error: interpretError, mutate: mutateInterpret } = useSWR(
    cyclesData && profile.name && profile.birthCity
      ? [`${LILLY}/api/ai/interpret`, cyclesData.astro_data?.events, committedTone, committedQuestion, profile.name, profile.birthCity]
      : null,
    ([url, events, t, q, name, birthCity]) => postJson(url, { 
      events, 
      language: 'es', 
      tone: t, 
      question: q,
      user_name: name,
      birth_location: `${birthCity.city}, ${birthCity.country}`
    })
  )
  
  const handleRegenerate = () => {
    setCommittedTone(tone)
    setCommittedQuestion(question)
    mutateInterpret()
  }
  // 2) Fetch natal + solar + relocation (LAZY: only when showMapSection is true)
  const year = useMemo(() => new Date().getUTCFullYear(), [])
  const { start, end } = yearRangeISO(year)

  const birthLat = profile.birthCity?.lat || 0
  const birthLon = profile.birthCity?.lon || 0

  const { data: natalChart } = useSWR(
    showMapSection && birthDateISO ? `${ABU}/api/astro/chart?date=${birthDateISO}&lat=${birthLat}&lon=${birthLon}` : null,
    fetcher
  )

  const { data: solarReturn } = useSWR(
    showMapSection && birthDateISO ? `${ABU}/api/astro/solar-return?birthDate=${birthDateISO}&lat=${birthLat}&lon=${birthLon}&year=${year}` : null,
    fetcher
  )

  const { data: relocation } = useSWR(
    showMapSection && natalChart && solarReturn
      ? [`${LILLY}/api/ai/solar-return`, natalChart, solarReturn]
      : null,
    ([url, natal, solar]) => postJson(url, { natal_chart: { planets: natal.planets }, solar_chart: { planets: solar.planets }, language: 'es' })
  )

  // Abu ranking (for map markers when selected)
  const { data: abuRanking } = useSWR(
    showMapSection && birthDateISO
      ? `${ABU}/api/astro/solar-return/ranking?birthDate=${encodeURIComponent(birthDateISO)}&year=${year}&top_n=5`
      : null,
    fetcher
  )

  // 3) Small comparison chart below the map (LAZY: only when showMapSection)
  const [series, setSeries] = useState<LocationSeries[]>([])
  const [mapSource, setMapSource] = useState<'abu' | 'lilly'>('abu')
  const [selectedCity, setSelectedCity] = useState<any>(null)

  // Load home series when map section is activated
  const addSeries = useCallback(async (name: string, lat: number, lon: number, color: string) => {
    if (!birthDateISO) return
    const forecastUrl = `${ABU}/api/astro/forecast?birthDate=${birthDateISO}&lat=${lat}&lon=${lon}&start=${start}&end=${end}&step=7d`
    const f = await fetcher(forecastUrl)
    setSeries(prev => {
      const key = `${name}-${lat}-${lon}`
      if (prev.some(s => s.key === key)) return prev
      return [...prev, { key, name, color, lat, lon, data: f.timeseries || [] }]
    })
  }, [birthDateISO, start, end])

  useEffect(() => {
    // Initialize natal location series when map section is shown
    if (showMapSection && series.length === 0 && profile.birthCity) {
      addSeries(profile.birthCity.city, birthLat, birthLon, COLORS[0])
      // Also add residence if different
      if (profile.residenceCity && (profile.residenceCity.lat !== birthLat || profile.residenceCity.lon !== birthLon)) {
        addSeries(profile.residenceCity.city, profile.residenceCity.lat, profile.residenceCity.lon, COLORS[1])
      }
    }
  }, [showMapSection, series.length, addSeries, profile.birthCity, profile.residenceCity, birthLat, birthLon])

  // Persist recommended cities for the /forecast page
  useEffect(() => {
    if (relocation?.location_details) {
      localStorage.setItem('recommendedCities', JSON.stringify(relocation.location_details))
    }
  }, [relocation])

  if (cyclesError || interpretError) return (
    <div className="p-6 text-red-400">
      Error: {cyclesError?.message || interpretError?.message}
    </div>
  )

  // Show profile form if user data is incomplete
  if (!profile.birthCity || showProfileForm) return (
    <main className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Configuración de Perfil</h2>
      <p className="text-white/70 text-sm">
        Para obtener una lectura personalizada, necesitamos conocer tus datos de nacimiento y residencia.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); setShowProfileForm(false) }} className="bg-white/5 rounded-lg p-6 space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm text-white/80 mb-1">Nombre completo</label>
          <input
            type="text"
            value={profile.name}
            onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Tu nombre"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 outline-none focus:border-white/30"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <CitySelector
          label="Lugar de nacimiento"
          value={profile.birthCity}
          onChange={(city) => setProfile(prev => ({ ...prev, birthCity: city }))}
          placeholder="Buscar ciudad de nacimiento..."
          required
        />

        <CitySelector
          label="Lugar de residencia actual"
          value={profile.residenceCity}
          onChange={(city) => setProfile(prev => ({ ...prev, residenceCity: city }))}
          placeholder="Buscar ciudad de residencia..."
        />

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!profile.birthCity || !profile.name}
            className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Comenzar Lectura
          </button>
        </div>
      </form>
    </main>
  )

  if (!interpretation) return (
    <div className="p-6 space-y-4">
      <div className="animate-pulse space-y-3">
        <div className="h-8 bg-white/10 rounded w-2/3"></div>
        <div className="h-4 bg-white/10 rounded w-1/2"></div>
        <div className="h-32 bg-white/10 rounded"></div>
      </div>
      <p className="text-sm text-white/60">Consultando a Abu y Lilly para {profile.name}...</p>
    </div>
  )

  const markers = useMemo(() => {
    if (mapSource === 'abu' && abuRanking?.rankings) {
      return abuRanking.rankings.map((r: any) => ({
        city: r.city,
        coordinates: r.coordinates,
        region: r.region,
        score: r.total_score,
      }))
    }
    return (relocation?.location_details || []).map((m: any) => ({
      city: m.city,
      coordinates: m.coordinates,
      element: m.element,
      region: m.region,
      compatibility: m.compatibility,
    }))
  }, [mapSource, abuRanking, relocation])

  return (
    <main className="p-6 space-y-6">
      {/* User Info Header */}
      <section className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-white/10 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-purple-200">{profile.name}</h2>
            <div className="text-sm text-white/70 space-y-1 mt-1">
              <div>
                {profile.birthCity && `${profile.birthCity.city}, ${profile.birthCity.country}`}
                {profile.residenceCity && profile.residenceCity.city !== profile.birthCity?.city && (
                  <span className="text-white/50 ml-2">→ {profile.residenceCity.city}</span>
                )}
              </div>
              <div className="text-xs text-white/50">
                {new Date(`${profile.birthDate}T${profile.birthTime}:00Z`).toLocaleString('es-ES', { 
                  dateStyle: 'long', 
                  timeStyle: 'short' 
                })}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowProfileForm(true)}
            className="text-xs text-white/60 hover:text-white underline"
          >
            Editar perfil
          </button>
        </div>
      </section>

      <h2 className="text-2xl font-bold">Interpretación Astrológica</h2>
      {/* Controls for tone and question */}
      <div className="flex flex-col gap-3 max-w-2xl">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-white/80 mb-1">Pregunta / Enfoque</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="¿Qué necesito comprender ahora?"
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-1">Tono</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-3 py-2 outline-none focus:border-white/30"
            >
              <option value="poético">Poético</option>
              <option value="analítico">Analítico</option>
              <option value="profundo">Profundo</option>
              <option value="práctico">Práctico</option>
            </select>
          </div>
          <button
            onClick={handleRegenerate}
            className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 rounded text-white text-sm"
            title="Regenerar con este tono y pregunta"
          >
            Regenerar
          </button>
        </div>
      </div>
      <LillyPanel interpretation={interpretation} />

      {/* Lazy-loaded sections: Map and Forecast */}
      {!showMapSection ? (
        <div className="text-center py-8">
          <button
            onClick={() => setShowMapSection(true)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium transition-colors"
          >
            Ver Recomendaciones Geográficas y Forecast
          </button>
          <p className="text-sm text-white/60 mt-2">Análisis de relocalización y comparativa temporal</p>
        </div>
      ) : (
        <>
          {/* Natal Chart Wheel (MVP) */}
          <section className="space-y-3">
            <h3 className="text-xl font-semibold">Carta Natal (MVP)</h3>
            {!natalChart ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-white/10 rounded w-2/3"></div>
                <div className="w-full max-w-[600px] h-[600px] mx-auto bg-white/10 rounded-full"></div>
              </div>
            ) : (
              <ChartWheel chart={natalChart} />
            )}
          </section>

          {/* Abu Solar Return Ranking */}
          <AbuRankingPanel birthDateISO={birthDateISO} year={year} />

          {/* Map source toggle */}
          <div className="flex gap-3 items-center">
            <span className="text-sm text-white/70">Fuente de recomendaciones:</span>
            <div className="inline-flex rounded overflow-hidden border border-white/10">
              <button
                className={`px-3 py-1 text-sm ${mapSource==='abu' ? 'bg-white/20' : 'bg-transparent'}`}
                onClick={() => setMapSource('abu')}
              >Abu (ranking)</button>
              <button
                className={`px-3 py-1 text-sm ${mapSource==='lilly' ? 'bg-white/20' : 'bg-transparent'}`}
                onClick={() => setMapSource('lilly')}
              >Lilly (heurístico)</button>
            </div>
          </div>

          {/* Map with recommended cities */}
          <section className="space-y-3">
            <h3 className="text-xl font-semibold">Recomendaciones Geográficas</h3>
            {mapSource==='lilly' && !relocation ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                <div className="h-64 bg-white/10 rounded"></div>
              </div>
            ) : mapSource==='abu' && !abuRanking ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                <div className="h-64 bg-white/10 rounded"></div>
              </div>
            ) : (
              <>
                <p className="text-white/70 text-sm">Haz clic en un marcador para añadir su línea de forecast comparativa{mapSource==='abu' ? ' y ver el desglose' : ''}.</p>
                <MapWithMarkers
                  markers={markers}
                  center={{ lat: 20, lon: 0 }}
                  zoom={2}
                  onMarkerClick={(m: any) => {
                    const color = COLORS[(series.length + 1) % COLORS.length]
                    addSeries(m.city, m.coordinates.lat, m.coordinates.lon, color)
                    if (mapSource === 'abu' && abuRanking?.rankings) {
                      const found = abuRanking.rankings.find((r: any) => r.city === m.city)
                      setSelectedCity(found || null)
                    }
                  }}
                />
              </>
            )}
          </section>

          {/* City breakdown (Abu) */}
          {mapSource==='abu' && selectedCity && (
            <section className="space-y-2">
              <h3 className="text-lg font-semibold">{selectedCity.city}: Desglose del Ranking</h3>
              <div className="text-sm text-white/80">Puntaje total: {selectedCity.total_score?.toFixed(2)}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white/5 rounded p-3 border border-white/10">
                  <div className="font-medium">Dignidades</div>
                  <div className="text-sm">Total: {selectedCity.breakdown?.dignities?.total ?? '-'}</div>
                </div>
                <div className="bg-white/5 rounded p-3 border border-white/10">
                  <div className="font-medium">Angularidad</div>
                  <div className="text-sm">Total: {selectedCity.breakdown?.angularity?.total ?? '-'}</div>
                </div>
                <div className="bg-white/5 rounded p-3 border border-white/10">
                  <div className="font-medium">Condiciones Solares</div>
                  <div className="text-sm">Total: {selectedCity.breakdown?.solar_conditions?.total ?? '-'}</div>
                </div>
                <div className="bg-white/5 rounded p-3 border border-white/10">
                  <div className="font-medium">Aspectos y Recepción</div>
                  <div className="text-sm">Total: {selectedCity.breakdown?.aspects_reception?.total ?? '-'}</div>
                </div>
                <div className="bg-white/5 rounded p-3 border border-white/10">
                  <div className="font-medium">Secta</div>
                  <div className="text-sm">Total: {selectedCity.breakdown?.sect?.total ?? '-'}</div>
                </div>
              </div>
              <div className="text-xs text-white/50">ASC: {selectedCity.chart_summary?.asc_sign} · MC: {selectedCity.chart_summary?.mc_sign} · RS: {selectedCity.chart_summary?.solar_return_datetime}</div>
            </section>
          )}

          {/* Mini multi-line chart */}
          <section className="space-y-3">
            <h3 className="text-xl font-semibold">Comparador de Forecast</h3>
            {series.length === 0 ? (
              <div className="animate-pulse">
                <div className="h-80 bg-white/10 rounded"></div>
              </div>
            ) : (
              <div style={{ width: '100%', height: 320 }} className="bg-white/5 rounded-lg p-2">
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
          </section>
        </>
      )}
    </main>
  )
}