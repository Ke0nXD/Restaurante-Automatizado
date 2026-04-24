import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/lib/theme'

export const metadata = {
  title: 'Sabor & Arte — Restaurante',
  description: 'Peça direto da mesa ou receba em casa. Experiência gastronômica premium.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
