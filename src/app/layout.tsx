import type { Metadata } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import Script from 'next/script'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-heading' })

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
      appearance={{ variables: { colorBackground: '#0a0a0a', colorText: '#ffffff' } }}
    >
      <html lang="en">
        <head>
          {/* Apply theme before paint to avoid flash */}
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body className={`${dmSans.variable} ${playfair.variable} ${dmSans.className}`}>
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
