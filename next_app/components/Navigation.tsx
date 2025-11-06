'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  // Only show navigation if not on home page
  if (pathname === '/') return null

  return (
    <nav className="bg-white/5 p-4 mb-6">
      <ul className="flex gap-6">
        <li>
          <Link 
            href="/"
            className="hover:text-yellow-200 transition-colors text-gray-300"
          >
            ← Volver al Portal
          </Link>
        </li>
      </ul>
    </nav>
  )
}