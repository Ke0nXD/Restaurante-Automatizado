import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/lib/theme'

export const metadata = {
  title: 'Sabor & Arte — Restaurante',
  description: 'Peça direto da mesa ou receba em casa. Experiência gastronômica premium.',
}

// Inline script applied BEFORE first paint to eliminate FOUC.
// Reads cached theme from localStorage and writes CSS variables + html class.
const themeBootstrapScript = `(function(){try{
  var raw = localStorage.getItem('sabor_theme_v1');
  var t = raw ? JSON.parse(raw) : null;
  var mode = t && t.mode ? t.mode : 'dark';
  var resolved = mode === 'auto'
    ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : (mode === 'light' ? 'light' : 'dark');
  var root = document.documentElement;
  root.classList.remove('light','dark'); root.classList.add(resolved);
  root.setAttribute('data-theme-mode', mode);
  if (!t) return;
  var palette = t[resolved] || {};
  var brand = t.brand || {};
  function hexToHsl(hex){
    if(!hex) return null;
    var h = String(hex).trim().replace('#','');
    if(h.length===3) h = h.split('').map(function(c){return c+c;}).join('');
    var r=parseInt(h.slice(0,2),16)/255, g=parseInt(h.slice(2,4),16)/255, b=parseInt(h.slice(4,6),16)/255;
    var mx=Math.max(r,g,b), mn=Math.min(r,g,b), hh=0, s=0, l=(mx+mn)/2;
    if(mx!==mn){ var d=mx-mn; s=l>0.5?d/(2-mx-mn):d/(mx+mn);
      switch(mx){case r: hh=(g-b)/d+(g<b?6:0); break; case g: hh=(b-r)/d+2; break; case b: hh=(r-g)/d+4; break;}
      hh/=6;
    }
    return Math.round(hh*360)+' '+Math.round(s*100)+'% '+Math.round(l*100)+'%';
  }
  function set(key, val){ if(val) root.style.setProperty(key, val); }
  set('--background', hexToHsl(palette.background));
  set('--foreground', hexToHsl(palette.foreground));
  set('--card', hexToHsl(palette.card));
  set('--card-foreground', hexToHsl(palette.foreground));
  set('--popover', hexToHsl(palette.card));
  set('--popover-foreground', hexToHsl(palette.foreground));
  set('--primary', hexToHsl(palette.primary));
  set('--primary-foreground', hexToHsl(palette.primaryForeground));
  set('--secondary', hexToHsl(palette.secondary));
  set('--secondary-foreground', hexToHsl(palette.secondaryForeground));
  set('--muted', hexToHsl(palette.muted));
  set('--muted-foreground', hexToHsl(palette.mutedForeground));
  set('--accent', hexToHsl(palette.accent));
  set('--accent-foreground', hexToHsl(palette.primaryForeground));
  set('--destructive', hexToHsl(palette.destructive));
  set('--destructive-foreground', hexToHsl(palette.primaryForeground));
  set('--border', hexToHsl(palette.border));
  set('--input', hexToHsl(palette.border));
  set('--ring', hexToHsl(palette.primary));
  if(brand.from) root.style.setProperty('--brand-from', brand.from);
  if(brand.to) root.style.setProperty('--brand-to', brand.to);
  if(palette.primary) root.style.setProperty('--brand-primary', palette.primary);
}catch(e){}})();`

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
