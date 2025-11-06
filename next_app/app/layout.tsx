import '@/styles/globals.css'
import 'leaflet/dist/leaflet.css'

export const metadata = {
  title: 'AI Oracle',
  description: 'Astrology visualizer'
}

import Navigation from '@/components/Navigation'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen font-serif bg-cosmic text-white">
        <Navigation />
        {children}
      </body>
    </html>
  )
}
