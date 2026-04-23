import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'Sabor & Arte — Restaurante',
  description: 'Peça direto da mesa ou receba em casa. Experiência gastronômica premium.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  )
}
