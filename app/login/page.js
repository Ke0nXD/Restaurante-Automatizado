'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { setAuth } from '@/lib/auth'
import { useBranding, BrandLogo } from '@/lib/branding'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
function isValidEmail(e) { return EMAIL_RE.test(String(e || '').trim()) }
function formatPhoneBR(raw) {
  const d = String(raw || '').replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
function isValidPhone(p) { return String(p || '').replace(/\D/g, '').length >= 10 }

function LoginPage() {
  const router = useRouter()
  const branding = useBranding()
  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '' })
  const [touched, setTouched] = useState({})

  const emailValid = useMemo(() => isValidEmail(form.email), [form.email])
  const phoneValid = useMemo(() => isValidPhone(form.phone), [form.phone])
  const emailError = touched.email && form.email && !emailValid ? 'Digite um email válido (ex: nome@dominio.com)' : ''
  const phoneError = touched.phone && form.phone && !phoneValid ? 'Telefone inválido — informe DDD + número' : ''

  const canSubmit = tab === 'login'
    ? emailValid && form.password.length >= 4
    : emailValid && phoneValid && form.password.length >= 4 && form.name.trim().length > 0

  const submit = async () => {
    // Mark all relevant fields as touched for validation feedback
    setTouched({ email: true, phone: true, password: true, name: true })
    if (!emailValid) { toast.error('Digite um email válido'); return }
    if (tab === 'register' && !phoneValid) { toast.error('Telefone inválido'); return }
    if (form.password.length < 4) { toast.error('Senha muito curta'); return }

    setLoading(true)
    try {
      const url = tab === 'login' ? '/api/auth/login' : '/api/auth/register'
      const payload = tab === 'login'
        ? { email: form.email.trim(), password: form.password }
        : { email: form.email.trim(), password: form.password, name: form.name.trim(), phone: form.phone.replace(/\D/g, '') }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro')
      setAuth(data.token, data.user)
      toast.success(tab === 'login' ? 'Login efetuado!' : 'Cadastro concluído!')
      if (['owner_admin', 'admin', 'attendant', 'delivery_driver'].includes(data.user.role)) router.push('/admin')
      else {
        const redirect = localStorage.getItem('sabor_redirect_after_login') || '/'
        localStorage.removeItem('sabor_redirect_after_login')
        router.push(redirect)
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-stone-950 to-black px-4 py-10">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Link>
        <div className="mb-8 flex items-center gap-3">
          <BrandLogo size="md" />
          <div>
            <h1 className="text-2xl font-bold">{branding.restaurantName}</h1>
            <p className="text-xs uppercase tracking-widest text-amber-400">acesso ao sistema</p>
          </div>
        </div>

        <Card className="border-white/10 bg-zinc-900/60">
          <CardContent className="p-6">
            <Tabs value={tab} onValueChange={(v) => { setTab(v); setTouched({}) }}>
              <TabsList className="grid w-full grid-cols-2 bg-black/30">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6 space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`mt-1 bg-white/5 ${emailError ? 'border-red-500/60' : 'border-white/10'}`}
                  />
                  {emailError && <p className="mt-1 flex items-center gap-1 text-xs text-red-400"><AlertCircle className="h-3 w-3" /> {emailError}</p>}
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
                  <strong>Admin demo:</strong> admin@sabor.com / admin123
                </div>
              </TabsContent>

              <TabsContent value="register" className="mt-6 space-y-4">
                <div>
                  <Label>Nome completo</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`mt-1 bg-white/5 ${emailError ? 'border-red-500/60' : 'border-white/10'}`}
                  />
                  {emailError && <p className="mt-1 flex items-center gap-1 text-xs text-red-400"><AlertCircle className="h-3 w-3" /> {emailError}</p>}
                </div>
                <div>
                  <Label>Telefone (DDD + número)</Label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 99999-9999"
                    value={form.phone}
                    onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                    onChange={(e) => setForm({ ...form, phone: formatPhoneBR(e.target.value) })}
                    className={`mt-1 bg-white/5 ${phoneError ? 'border-red-500/60' : 'border-white/10'}`}
                  />
                  {phoneError && <p className="mt-1 flex items-center gap-1 text-xs text-red-400"><AlertCircle className="h-3 w-3" /> {phoneError}</p>}
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                  <p className="mt-1 text-[11px] text-muted-foreground">Mínimo 4 caracteres.</p>
                </div>
              </TabsContent>

              <Button disabled={loading || !canSubmit} onClick={submit} className="mt-6 w-full bg-brand-gradient hover:opacity-90 disabled:opacity-50">
                {loading ? 'Aguarde...' : tab === 'login' ? 'Entrar' : 'Criar conta'}
              </Button>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default LoginPage
