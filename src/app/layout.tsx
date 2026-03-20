import type { Metadata } from 'next'
import { Cormorant_Garamond, Source_Sans_3 } from 'next/font/google'
import Script from 'next/script'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const sourceSans = Source_Sans_3({ subsets: ['latin'], variable: '--font-sans', weight: ['300', '400', '600', '700'] })
const cormorant = Cormorant_Garamond({ subsets: ['latin'], variable: '--font-heading', weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'Linforo — Learn Italian by Speaking',
  description: 'Voice-first Italian language learning app',
}

// Inline script runs before first paint to avoid theme flash
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('linforo-theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.add('dark-theme');
    }
  } catch(e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{ variables: { colorBackground: '#1a1410', colorText: '#f5efe6' } }}
    >
      <html lang="en">
        <head>
          {/* Apply theme before paint to avoid flash */}
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className={`${sourceSans.variable} ${cormorant.variable} ${sourceSans.className}`}>
          {children}
          {/* Plausible analytics */}
          <Script
            defer
            data-domain="linforo.app"
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
