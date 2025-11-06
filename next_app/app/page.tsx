'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Home() {
  const [hoverAbu, setHoverAbu] = useState(false)
  const [hoverLilly, setHoverLilly] = useState(false)
  
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-purple-900 to-black opacity-40 pointer-events-none" />
      
      {/* Main content */}
      <div className="relative z-10 max-w-4xl w-full space-y-12">
        {/* Title */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-purple-300 to-blue-200">
            Portal del Oráculo
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Abu calcula. Lilly interpreta. Juntos revelan tu cielo.
          </p>
        </div>

        {/* Abu and Lilly presentation */}
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          {/* Abu */}
          <div 
            className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/30 rounded-lg p-6 space-y-3 transition-all duration-300 hover:scale-105 hover:border-yellow-400/50"
            onMouseEnter={() => setHoverAbu(true)}
            onMouseLeave={() => setHoverAbu(false)}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-500/30 flex items-center justify-center text-yellow-200 text-xl font-bold">
                A
              </div>
              <h3 className="text-2xl font-semibold text-yellow-200">Abu</h3>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">
              {hoverAbu 
                ? "Calculo las posiciones celestes con precisión astronómica. Soy la estructura, el número, el orden del cosmos." 
                : "Precisión astronómica. Sol, estructura, razón."}
            </p>
          </div>

          {/* Lilly */}
          <div 
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/30 rounded-lg p-6 space-y-3 transition-all duration-300 hover:scale-105 hover:border-purple-400/50"
            onMouseEnter={() => setHoverLilly(true)}
            onMouseLeave={() => setHoverLilly(false)}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-200 text-xl font-bold">
                L
              </div>
              <h3 className="text-2xl font-semibold text-purple-200">Lilly</h3>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">
              {hoverLilly 
                ? "Traduzco los números en símbolos vivos. Soy la intuición, el significado, la voz del alma estelar." 
                : "Interpretación simbólica. Luna, emoción, significado."}
            </p>
          </div>
        </div>

        {/* Navigation options */}
        <div className="space-y-4 mt-16">
          <h2 className="text-xl font-semibold text-center text-white/90">Elige tu consulta</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link 
              href="/positions"
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-lg p-6 text-center transition-all duration-200 group"
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🌞</div>
              <h3 className="text-lg font-semibold text-white/90 mb-1">Carta Natal</h3>
              <p className="text-sm text-white/60">Posiciones, dignidades y puntos</p>
            </Link>

            <Link 
              href="/forecast"
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-lg p-6 text-center transition-all duration-200 group"
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🌝</div>
              <h3 className="text-lg font-semibold text-white/90 mb-1">Revolución Solar</h3>
              <p className="text-sm text-white/60">Descubre tu año astrológico</p>
            </Link>

            <Link 
              href="/interpret"
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-lg p-6 text-center transition-all duration-200 group"
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">✨</div>
              <h3 className="text-lg font-semibold text-white/90 mb-1">Lectura Personalizada</h3>
              <p className="text-sm text-white/60">Consulta a Abu y Lilly</p>
            </Link>
          </div>
        </div>

        {/* Footer quote */}
        <p className="text-center text-white/50 text-sm italic mt-12">
          "El Oráculo no predice, revela patrones de conciencia."
        </p>
      </div>
    </main>
  )
}
