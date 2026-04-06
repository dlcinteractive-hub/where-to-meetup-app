import './globals.css'
import { Inter } from 'next/font/google'
import { version } from '../package.json'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Where to Meetup - Find the Perfect Meeting Spot',
  description: 'Find the best meeting place for everyone. Input locations, get optimized venue suggestions.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-4xl mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold text-primary-700">
                📍 Where to Meetup
              </h1>
              <p className="text-gray-600 text-sm">
                Find the perfect meeting spot for everyone
              </p>
            </div>
          </header>
          <main className="max-w-4xl mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="max-w-4xl mx-auto px-4 py-4 text-center">
            <p className="text-xs text-gray-400">v{version}</p>
          </footer>
        </div>
      </body>
    </html>
  )
}