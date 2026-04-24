'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { ChefHat, ArrowLeft } from 'lucide-react'
import { setAuth } from '@/lib/auth'
import { useBranding, BrandLogo } from '@/lib/branding'

function LoginPage() {
  const router = useRouter()
  const branding = useBranding()
  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '' })

  const submit = async () => {
    setLoading(true)
    try {
      const url = tab === 'login' ? '/api/auth/login' : '/api/auth/register'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2 bg-black/30">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-6 space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
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
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 border-white/10 bg-white/5" />
                </div>
              </TabsContent>
              <Button disabled={loading} onClick={submit} className="mt-6 w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90">
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
