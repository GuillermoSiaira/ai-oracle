'use client'

import useSWR from 'swr'
import React from 'react'

const ABU = process.env.NEXT_PUBLIC_ABU_URL || 'http://localhost:8000'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error en la petición')
  return res.json()
}

export default function AbuRankingPanel({ birthDateISO, year }: { birthDateISO: string, year: number }) {
  const { data, error, isLoading } = useSWR(
    birthDateISO ? `${ABU}/api/astro/solar-return/ranking?birthDate=${encodeURIComponent(birthDateISO)}&year=${year}&top_n=3` : null,
    fetcher
  )

  if (!birthDateISO) return null
  if (isLoading) return <div className="text-sm text-white/70">Calculando ranking de ciudades…</div>
  if (error) return <div className="text-sm text-red-400">Error: {String(error)}</div>
  if (!data) return null

  const top = data.top_recommendations || []
  const rows = (data.rankings || []).slice(0, 5)

  return (
    <section className="space-y-3">
      <h3 className="text-xl font-semibold">Ranking de Ciudades (Abu)</h3>
      {top.length > 0 && (
        <div className="text-sm text-white/80">Mejores: <span className="font-semibold">{top.join(', ')}</span></div>
      )}
      <div className="overflow-x-auto bg-white/5 border border-white/10 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="text-white/70">
            <tr>
              <th className="text-left p-2">Ciudad</th>
              <th className="text-left p-2">Región</th>
              <th className="text-right p-2">Score</th>
              <th className="text-left p-2">Notas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.city} className="border-t border-white/10">
                <td className="p-2">{r.city}</td>
                <td className="p-2">{r.region || '-'}</td>
                <td className="p-2 text-right">{r.total_score?.toFixed(2)}</td>
                <td className="p-2 text-white/60">
                  {r.breakdown?.angularity?.note || r.breakdown?.sect?.note ? 'sin casas (proxy)' : 'casas OK'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-white/50">Criterios: Dignidades, Angularidad, Secta, Recepción, Condiciones Solares.</p>
    </section>
  )
}
