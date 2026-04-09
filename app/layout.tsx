import './globals.css'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import pkg from '../package.json'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' })

export const metadata = {
  title: 'Midpoint — Find the Perfect Meeting Spot',
  description: 'Find the best meeting place for everyone. Input locations, get optimized venue suggestions.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body className={inter.className}>
        <div className="min-h-screen bg-brand-light">
          <header className="bg-white border-b border-brand-border">
            <div className="max-w-4xl mx-auto px-4 py-5">
              <h1 className="font-heading font-bold text-3xl text-brand-dark flex items-center">
                <span>Midp</span>
                <span className="inline-flex items-end" aria-hidden="true">
                  <svg width="18" height="24" viewBox="0 0 18 24" fill="none" className="mx-[1px]">
                    <circle cx="9" cy="9" r="9" fill="#FF6B6B" />
                    <circle cx="9" cy="9" r="4" fill="white" />
                    <path d="M9 18 L9 24" stroke="#FF6B6B" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </span>
                <span>int</span>
                <span className="sr-only">Midpoint</span>
              </h1>
              <p className="text-brand-medium text-sm mt-1">
                Find the perfect meeting spot for everyone
              </p>
            </div>
          </header>
          <main className="max-w-4xl mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="max-w-4xl mx-auto px-4 py-4 text-center">
            <p className="text-xs text-brand-muted">v{pkg.version}</p>
          </footer>
        </div>
      </body>
    </html>
  )
}
