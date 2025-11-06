'use client'

import { useState, useEffect, useRef } from 'react'

export type CityData = {
  city: string
  country: string
  lat: number
  lon: number
}

type CitySelectorProps = {
  value?: CityData | null
  onChange: (city: CityData | null) => void
  placeholder?: string
  label?: string
  required?: boolean
}

export default function CitySelector({
  value,
  onChange,
  placeholder = "Buscar ciudad...",
  label,
  required = false
}: CitySelectorProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CityData[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search cities when query changes
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const base = process.env.NEXT_PUBLIC_ABU_URL || 'http://localhost:8000'
        const res = await fetch(`${base}/api/cities/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
          setShowDropdown(true)
        }
      } catch (err) {
        console.error('Error searching cities:', err)
      } finally {
        setLoading(false)
      }
    }, 300) // Debounce 300ms

    return () => clearTimeout(timer)
  }, [query])

  function handleSelect(city: CityData) {
    onChange(city)
    setQuery(`${city.city}, ${city.country}`)
    setShowDropdown(false)
  }

  function handleClear() {
    onChange(null)
    setQuery('')
    setResults([])
  }

  // Display selected city or allow typing
  const displayValue = value ? `${value.city}, ${value.country}` : query

  return (
    <div className="relative" ref={wrapperRef}>
      {label && (
        <label className="block text-sm text-white/80 mb-1">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value)
            if (value) onChange(null) // Clear selection when typing
          }}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true)
          }}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 outline-none focus:border-white/30 pr-10"
          required={required}
        />
        
        {(loading || value) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            ) : value ? (
              <button
                type="button"
                onClick={handleClear}
                className="w-5 h-5 flex items-center justify-center text-white/60 hover:text-white"
                title="Limpiar"
              >
                ✕
              </button>
            ) : null}
          </div>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {results.map((city, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(city)}
              className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
            >
              <div className="font-medium text-white">{city.city}</div>
              <div className="text-sm text-white/60">{city.country}</div>
            </button>
          ))}
        </div>
      )}

      {value && (
        <div className="text-xs text-white/40 mt-1 font-mono">
          {value.lat.toFixed(4)}°, {value.lon.toFixed(4)}°
        </div>
      )}
    </div>
  )
}
