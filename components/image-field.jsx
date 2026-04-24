'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Link2, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { authHeaders } from '@/lib/auth'

/**
 * Hybrid image field: accepts a URL or a file upload (device).
 * Calls onChange(url) when URL changes (after upload success, url is /uploads/xxx).
 */
export function ImageField({ label = 'Imagem', value, onChange, placeholder = 'https://... ou envie um arquivo' }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Arquivo muito grande (máx 5MB)'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', headers: { ...authHeaders() }, body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro no upload')
      onChange(data.url)
      toast.success('Imagem enviada')
    } catch (e) { toast.error(e.message) }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <div>
      {label && <Label className="text-xs">{label}</Label>}
      <div className="mt-1 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="border-white/10 bg-white/5 pl-7"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="shrink-0 border-white/10"
          >
            {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
            {uploading ? 'Enviando' : 'Enviar'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        {value && (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="preview" className="max-h-32 rounded-lg border border-white/10 object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange('')}
              className="absolute right-1 top-1 h-6 w-6 border-white/20 bg-black/60 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageField
