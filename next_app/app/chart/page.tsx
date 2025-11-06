'use client'

import { FormEvent, useState } from 'react'
import ChartWheel from '@/components/ChartWheel'

interface ChartFormData {
  birthDate: string
  birthTime: string
  latitude: string
  longitude: string
}

interface AspectLine {
  x1: number
  y1: number
  x2: number
  y2: number
  type: string
}

async function fetchChart(data: ChartFormData) {
  const { birthDate, birthTime, latitude, longitude } = data
  const datetime = `${birthDate}T${birthTime}Z`
  const base = process.env.NEXT_PUBLIC_ABU_URL || 'http://localhost:8000'
  const url = `${base}/api/astro/chart?lat=${latitude}&lon=${longitude}&date=${datetime}`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Error fetching chart')
  return response.json()
}

async function fetchInterpretation(chartData: any) {
  const lilly = process.env.NEXT_PUBLIC_LILLY_URL || 'http://localhost:8001'
  const response = await fetch(`${lilly}/api/ai/interpret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      planets: chartData.planets,
      aspects: chartData.aspects
    })
  })
  if (!response.ok) throw new Error('Error fetching interpretation')
  return response.json()
}

// Wheel rendering is handled by ChartWheel component

export default function ChartPage() {
  const [formData, setFormData] = useState<ChartFormData>({
    birthDate: '1990-01-01',
    birthTime: '12:00',
    latitude: '-34.6',
    longitude: '-58.38'
  })
  const [chartData, setChartData] = useState<any>(null)
  const [interpretation, setInterpretation] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      console.log('[Chart] Fetching chart data...', formData)
      const chart = await fetchChart(formData)
      console.log('[Chart] Chart data received:', chart)
      setChartData(chart)
      
      console.log('[Chart] Fetching interpretation...')
      const interp = await fetchInterpretation(chart)
      console.log('[Chart] Interpretation received:', interp)
      setInterpretation(interp)
    } catch (err) {
      console.error('[Chart] Error:', err)
      setError(err instanceof Error ? err.message : 'Error processing request')
    } finally {
      setLoading(false)
    }
  }

  // Wheel rendering is delegated to ChartWheel

  return (
    <main className="p-6">
      <h2 className="text-2xl font-bold mb-4">Carta Astral</h2>
      
      <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Fecha de nacimiento
            <input
              type="date"
              value={formData.birthDate}
              onChange={e => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
              className="mt-1 block w-full rounded bg-white/10 border border-gray-600 text-white px-3 py-2"
              required
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Hora de nacimiento
            <input
              type="time"
              value={formData.birthTime}
              onChange={e => setFormData(prev => ({ ...prev, birthTime: e.target.value }))}
              className="mt-1 block w-full rounded bg-white/10 border border-gray-600 text-white px-3 py-2"
              required
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Latitud
            <input
              type="number"
              step="0.000001"
              value={formData.latitude}
              onChange={e => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
              className="mt-1 block w-full rounded bg-white/10 border border-gray-600 text-white px-3 py-2"
              required
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Longitud
            <input
              type="number"
              step="0.000001"
              value={formData.longitude}
              onChange={e => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
              className="mt-1 block w-full rounded bg-white/10 border border-gray-600 text-white px-3 py-2"
              required
            />
          </label>
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded bg-yellow-600 text-white font-medium hover:bg-yellow-700 disabled:opacity-50 ${loading ? 'animate-pulse' : ''}`}
          >
            {loading ? 'Calculando...' : 'Calcular carta'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded text-red-200">
          {error}
        </div>
      )}

      {loading && !chartData && (
        <div className="animate-pulse space-y-3">
          <div className="w-full max-w-[600px] h-[600px] mx-auto bg-white/10 rounded-full"></div>
          <p className="text-sm text-white/60 text-center">Abu está calculando las posiciones celestes...</p>
        </div>
      )}

      {chartData && (
        <ChartWheel chart={chartData} showAspects={true} showHouses={true} className="mt-2" />
      )}

      {interpretation && (
        <div className="mt-8 p-6 bg-white/5 rounded-lg">
          <h3 className="text-xl font-semibold text-yellow-200 mb-4">
            {interpretation.headline}
          </h3>
          <p className="text-gray-200 whitespace-pre-line">
            {interpretation.narrative}
          </p>
          {interpretation.actions?.length > 0 && (
            <ul className="mt-4 list-disc list-inside text-gray-300">
              {interpretation.actions.map((action: string, i: number) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  )
}
