'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { BottomNav } from '@/components/bottom-nav'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useTicket } from '@/lib/hooks/useTicket'
import { useI18n } from '@/lib/i18n'
import { deleteTicket, updateItemFields, updateTicketFields } from '@/lib/mutations'
import { createClient } from '@/lib/supabase/client'
import type { Invoice, Restaurant } from '@/lib/types'

// numeric fields are edited as strings and parsed on save (empty string -> 0)
type ItemForm = {
  id: string
  description: string
  quantity: string
  price: string
  discount_percentage: string
  discount_amount: string
}

type TotalsForm = {
  base: string
  taxPercentage: string
  taxAmount: string
  totalWithoutTax: string
  totalWithTax: string
}

const num = (s: string) => {
  const n = Number(s)
  return s.trim() === '' || !Number.isFinite(n) ? 0 : n
}

export default function TicketEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useI18n()
  const [supabase] = useState(createClient)
  const { ticket, loading } = useTicket(id)

  const [userId, setUserId] = useState<string | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<ItemForm[] | null>(null)
  const [totals, setTotals] = useState<TotalsForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
  }, [supabase])

  // initialize the form once from the first load so realtime refetches
  // don't clobber in-progress edits
  const initialized = useRef(false)
  useEffect(() => {
    if (!ticket || initialized.current) return
    initialized.current = true
    setRestaurant({ ...ticket.restaurant })
    setInvoice({ ...ticket.invoice })
    setTotals({
      base: String(ticket.totals?.base ?? 0),
      taxPercentage: String(ticket.totals?.tax?.percentage ?? 0),
      taxAmount: String(ticket.totals?.tax?.amount ?? 0),
      totalWithoutTax: String(ticket.totals?.total_without_tax ?? 0),
      totalWithTax: String(ticket.totals?.total_with_tax ?? 0),
    })
    setItems(
      ticket.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: String(item.quantity),
        price: String(item.price),
        discount_percentage: String(item.discount_percentage ?? 0),
        discount_amount: String(item.discount_amount ?? 0),
      })),
    )
  }, [ticket])

  const setItem = (itemId: string, field: keyof Omit<ItemForm, 'id'>, value: string) => {
    setItems((prev) => prev?.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)) ?? null)
  }

  const handleSave = async () => {
    if (!restaurant || !invoice || !totals || !items) return
    setSaving(true)
    try {
      await updateTicketFields(supabase, id, {
        restaurant,
        invoice,
        totals: {
          base: num(totals.base),
          tax: { percentage: num(totals.taxPercentage), amount: num(totals.taxAmount) },
          total_without_tax: num(totals.totalWithoutTax),
          total_with_tax: num(totals.totalWithTax),
        },
      })
      for (const item of items) {
        await updateItemFields(supabase, item.id, {
          description: item.description,
          quantity: Math.max(1, num(item.quantity)),
          price: num(item.price),
          discount_percentage: num(item.discount_percentage),
          discount_amount: num(item.discount_amount),
        })
      }
      router.back()
    } catch {
      toast.error(t('Error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!ticket) return
    setDeleting(true)
    try {
      await deleteTicket(supabase, id, ticket.img_path)
      router.replace('/tickets')
    } catch {
      toast.error(t('Error'))
      setDeleting(false)
    }
  }

  if (!loading && !ticket) {
    return (
      <div className="mx-auto w-full min-h-dvh max-w-md bg-background pb-24">
        <p className="px-4 pt-24 text-center text-muted-foreground">{t('Invalid link')}</p>
        <BottomNav />
      </div>
    )
  }

  if (loading || !ticket || !restaurant || !invoice || !totals || !items) {
    return (
      <div className="mx-auto w-full min-h-dvh max-w-md bg-background pb-24">
        <div className="space-y-4 px-4 pt-6">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <BottomNav />
      </div>
    )
  }

  const isOwner = userId !== null && ticket.owner_id === userId

  return (
    <div className="mx-auto w-full min-h-dvh max-w-md bg-background pb-24">
      <div className="flex flex-col gap-6 px-4 pt-6">
        <h1 className="text-2xl font-bold">{t('Edit')}</h1>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t('Restaurant')}</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restaurant-name">{t('Name')}</Label>
            <Input
              id="restaurant-name"
              value={restaurant.name}
              onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restaurant-address">{t('Address')}</Label>
            <Input
              id="restaurant-address"
              value={restaurant.address}
              onChange={(e) => setRestaurant({ ...restaurant, address: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restaurant-phone">{t('Phone')}</Label>
            <Input
              id="restaurant-phone"
              value={restaurant.phone}
              onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restaurant-nif">{t('NIF')}</Label>
            <Input
              id="restaurant-nif"
              value={restaurant.NIF}
              onChange={(e) => setRestaurant({ ...restaurant, NIF: e.target.value })}
            />
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t('Ticket')}</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice-type">{t('Type')}</Label>
            <Input
              id="invoice-type"
              value={invoice.type}
              onChange={(e) => setInvoice({ ...invoice, type: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice-operation-number">{t('Operation number')}</Label>
            <Input
              id="invoice-operation-number"
              value={invoice.operation_number}
              onChange={(e) => setInvoice({ ...invoice, operation_number: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice-table">{t('Table')}</Label>
            <Input
              id="invoice-table"
              value={invoice.table}
              onChange={(e) => setInvoice({ ...invoice, table: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice-date">{t('Date')}</Label>
            <Input
              id="invoice-date"
              value={invoice.date}
              onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice-cashier">{t('Cashier')}</Label>
            <Input
              id="invoice-cashier"
              value={invoice.cashier}
              onChange={(e) => setInvoice({ ...invoice, cashier: e.target.value })}
            />
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t('Items')}</h2>
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-xl border p-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`item-${item.id}-description`}>{t('Description')}</Label>
                <Input
                  id={`item-${item.id}-description`}
                  value={item.description}
                  onChange={(e) => setItem(item.id, 'description', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`item-${item.id}-quantity`}>{t('Units')}</Label>
                  <Input
                    id={`item-${item.id}-quantity`}
                    type="number"
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(e) => setItem(item.id, 'quantity', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`item-${item.id}-price`}>{t('Total')}</Label>
                  <Input
                    id={`item-${item.id}-price`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={item.price}
                    onChange={(e) => setItem(item.id, 'price', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`item-${item.id}-discount-percentage`}>{t('Discount %')}</Label>
                  <Input
                    id={`item-${item.id}-discount-percentage`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={item.discount_percentage}
                    onChange={(e) => setItem(item.id, 'discount_percentage', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`item-${item.id}-discount-amount`}>{t('Discount amount')}</Label>
                  <Input
                    id={`item-${item.id}-discount-amount`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={item.discount_amount}
                    onChange={(e) => setItem(item.id, 'discount_amount', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t('Bill')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="totals-base">{t('Base')}</Label>
              <Input
                id="totals-base"
                type="number"
                inputMode="decimal"
                step="any"
                value={totals.base}
                onChange={(e) => setTotals({ ...totals, base: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="totals-tax-percentage">{t('Tax percentage')}</Label>
              <Input
                id="totals-tax-percentage"
                type="number"
                inputMode="decimal"
                step="any"
                value={totals.taxPercentage}
                onChange={(e) => setTotals({ ...totals, taxPercentage: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="totals-tax-amount">{t('Tax Amount')}</Label>
              <Input
                id="totals-tax-amount"
                type="number"
                inputMode="decimal"
                step="any"
                value={totals.taxAmount}
                onChange={(e) => setTotals({ ...totals, taxAmount: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="totals-without-tax">{t('Total without tax')}</Label>
              <Input
                id="totals-without-tax"
                type="number"
                inputMode="decimal"
                step="any"
                value={totals.totalWithoutTax}
                onChange={(e) => setTotals({ ...totals, totalWithoutTax: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="totals-with-tax">{t('Total')}</Label>
              <Input
                id="totals-with-tax"
                type="number"
                inputMode="decimal"
                step="any"
                value={totals.totalWithTax}
                onChange={(e) => setTotals({ ...totals, totalWithTax: e.target.value })}
              />
            </div>
          </div>
        </section>

        <Button type="button" disabled={saving} onClick={handleSave}>
          {t('Save')}
        </Button>

        {isOwner && (
          <>
            <Separator />
            <section className="flex flex-col gap-3">
              <Button type="button" variant="destructive" disabled={deleting} onClick={() => setConfirmOpen(true)}>
                <Trash2 />
                {t('Delete')}
              </Button>
            </section>
          </>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Are you sure?')}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('Cancel')}</DialogClose>
            <Button type="button" variant="destructive" disabled={deleting} onClick={handleDelete}>
              {t('Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  )
}
