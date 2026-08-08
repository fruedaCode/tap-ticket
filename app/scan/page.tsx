'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ImagePlus, Loader2, ReceiptText, ScanLine, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { BottomNav } from '@/components/bottom-nav'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { useI18n } from '@/lib/i18n'

export default function ScanPage() {
  const { t } = useI18n()
  const router = useRouter()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

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
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
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
        const body = (await res.json().catch(() => null)) as { error?: string; limit?: number } | null
        if (res.status === 402 && body?.error === 'scan_limit_reached') {
          toast.error(t('Weekly scan limit reached'), {
            description: t('Upgrade your plan to scan more tickets'),
            action: { label: t('See plans'), onClick: () => router.push('/plans') },
          })
        } else {
          toast.error(t('Error translating ticket'), { description: body?.error })
        }
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
    <div className="mx-auto flex w-full min-h-dvh max-w-md flex-col bg-background pb-24">
      <h1 className="px-4 pb-2 pt-6 text-2xl font-bold">{t('Import')}</h1>

      <div className="flex flex-1 flex-col gap-4 px-4 pt-2">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={onFileSelected}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onFileSelected}
        />

        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/25 px-6 py-12 text-center active:bg-muted/50"
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Camera className="size-8 text-primary" aria-hidden />
          </div>
          <p className="text-base font-medium">{t('Take picture')}</p>
          <p className="text-sm text-muted-foreground">{t('Snap a photo of your receipt')}</p>
        </button>

        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full gap-2"
          onClick={() => galleryInputRef.current?.click()}
        >
          <ImagePlus className="size-5" aria-hidden />
          {t('Upload from gallery')}
        </Button>

        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-medium">{t('Tips for a good scan')}</p>
          <ul className="space-y-2.5">
            {[
              { icon: Sun, tip: 'Use good, even lighting' },
              { icon: ReceiptText, tip: 'Lay the receipt flat, without folds' },
              { icon: ScanLine, tip: 'Fit the whole ticket in the frame' },
            ].map(({ icon: Icon, tip }) => (
              <li key={tip} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Icon className="size-4 shrink-0" aria-hidden />
                {t(tip)}
              </li>
            ))}
          </ul>
        </div>
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
