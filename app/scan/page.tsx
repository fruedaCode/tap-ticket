'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { BottomNav } from '@/components/bottom-nav'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { useI18n } from '@/lib/i18n'

export default function ScanPage() {
  const { t } = useI18n()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const resetCapture = () => {
    setFile(null)
    setPreviewUrl(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  const scan = async () => {
    if (!file) return
    setScanning(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('/api/scan', { method: 'POST', body: formData })
      if (!res.ok) {
        const detail = ((await res.json().catch(() => null)) as { error?: string } | null)?.error
        toast.error(t('Error translating ticket'), { description: detail })
        resetCapture()
        return
      }
      const { ticketId } = (await res.json()) as { ticketId: string }
      toast.success(t('Successfully added'))
      router.replace(`/tickets/${ticketId}`)
    } catch {
      toast.error(t('Error translating ticket'))
      resetCapture()
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background pb-24">
      <h1 className="px-4 pb-2 pt-6 text-2xl font-bold">{t('Import')}</h1>

      <div className="flex flex-1 items-center justify-center px-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={onFileSelected}
        />
        <Button
          size="lg"
          className="h-14 w-full max-w-xs gap-2 text-base"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-6" />
          {t('Take picture')}
        </Button>
      </div>

      <Dialog open={previewUrl !== null} onOpenChange={(open) => !open && resetCapture()}>
        <DialogContent>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not optimizable
            <img
              src={previewUrl}
              alt={t('Ticket')}
              className="max-h-[60dvh] w-full rounded-lg object-contain"
            />
          )}
          {scanning ? (
            <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              {t('Scanning ticket')}
            </div>
          ) : (
            <DialogFooter>
              <Button variant="outline" onClick={resetCapture} disabled={scanning}>
                {t('Take another picture')}
              </Button>
              <Button onClick={scan} disabled={scanning}>
                {t('Translate')}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  )
}
