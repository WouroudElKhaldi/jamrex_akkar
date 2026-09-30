"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useI18n } from "@/i18n/client";
import { Button, Card, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { placeOrder } from "@/actions/shop";
import { cn, money } from "@/lib/utils";

export type ZoneOpt = { id: string; name: string; fee: number; freeOver: number | null };

export function CheckoutForm({
  zones,
  prefill,
  loggedIn,
  codEnabled,
  whishEnabled,
  note,
}: {
  zones: ZoneOpt[];
  prefill: { name: string; email: string; phone: string; address: string; zoneId: string };
  loggedIn: boolean;
  codEnabled: boolean;
  whishEnabled: boolean;
  note: string;
}) {
  const { t, locale } = useI18n();
  const { lines, subtotal, clear, ready } = useCart();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [v, setV] = useState({ ...prefill, notes: "" });
  const [method, setMethod] = useState<"COD" | "WHISH">(codEnabled ? "COD" : "WHISH");
  const [zoneId, setZoneId] = useState(prefill.zoneId || (zones.length === 1 ? zones[0].id : ""));

  const zone = zones.find((z) => z.id === zoneId);
  const fee = zone ? (zone.freeOver !== null && subtotal >= zone.freeOver ? 0 : zone.fee) : 0;
  const total = subtotal + fee;
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  function validate() {
    const e: Record<string, string> = {};
    if (v.name.trim().length < 2) e.name = t("checkout.fieldRequired");
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = t("checkout.invalidEmail");
    if (v.phone.replace(/\D/g, "").length < 7) e.phone = t("checkout.invalidPhone");
    if (!zoneId) e.zone = t("checkout.fieldRequired");
    if (v.address.trim().length < 4) e.address = t("checkout.fieldRequired");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError("");
    if (!validate() || lines.length === 0) return;
    start(async () => {
      const res = await placeOrder({
        items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
        name: v.name,
        email: v.email,
        phone: v.phone,
        zoneId,
        address: v.address,
        notes: v.notes,
        paymentMethod: method,
        locale,
      });
      if (!res.ok) {
        setFormError(res.error === "stock" ? t("checkout.stockError") + (res.detail ? ` (${res.detail})` : "") : res.error === "phone" ? t("checkout.invalidPhone") : t("common.error"));
        return;
      }
      clear();
      if (res.payUrl) {
        window.location.href = res.payUrl; // Whish hosted payment page
        return;
      }
      router.push(`/${locale}/order/${res.code}?k=${res.key}&new=1`);
    });
  }

  if (ready && lines.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border py-16 text-center">
        <p className="mb-4 text-muted">{t("checkout.emptyCart")}</p>
        <Link href={`/${locale}/shop`}><Button>{t("cart.continue")}</Button></Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-6">
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t("checkout.contact")}</h2>
            {!loggedIn && (
              <span className="text-sm text-muted">
                {t("checkout.loginHint")} <Link href={`/${locale}/account?next=/${locale}/checkout`} className="font-bold text-brand hover:underline">{t("checkout.loginLink")}</Link>
              </span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("checkout.name")} error={errors.name} className="sm:col-span-2"><Input value={v.name} onChange={set("name")} autoComplete="name" /></Field>
            <Field label={t("checkout.email")} error={errors.email}><Input type="email" value={v.email} onChange={set("email")} autoComplete="email" dir="ltr" /></Field>
            <Field label={t("checkout.phone")} error={errors.phone} hint={t("checkout.phoneHint")}><Input type="tel" value={v.phone} onChange={set("phone")} autoComplete="tel" dir="ltr" /></Field>
          </div>
          {!loggedIn && <p className="rounded-xl bg-brand-soft p-3 text-xs text-brand">{t("checkout.guestHint")}</p>}
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-bold">{t("checkout.delivery")}</h2>
          <Field label={t("checkout.zone")} error={errors.zone}>
            <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              <option value="">{t("checkout.selectZone")}</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name} — {money(z.fee)}</option>)}
            </Select>
          </Field>
          <Field label={t("checkout.address")} error={errors.address} hint={t("checkout.addressHint")}><Textarea value={v.address} onChange={set("address")} rows={3} autoComplete="street-address" /></Field>
          <Field label={`${t("checkout.notes")} (${t("common.optional")})`}><Textarea value={v.notes} onChange={set("notes")} rows={2} /></Field>
          {note && <p className="text-xs text-muted">{note}</p>}
        </Card>

        <Card className="space-y-3 p-6">
          <h2 className="text-lg font-bold">{t("checkout.payment")}</h2>
          {!codEnabled && !whishEnabled && <p className="rounded-xl bg-warn/15 p-3 text-sm font-semibold text-warn">{t("checkout.noPayment")}</p>}
          {[
            { id: "COD" as const, enabled: codEnabled, title: t("checkout.cod"), text: t("checkout.codText"), Icon: Banknote },
            { id: "WHISH" as const, enabled: whishEnabled, title: t("checkout.whish"), text: t("checkout.whishText"), Icon: CreditCard },
          ]
            .filter((m) => m.enabled)
            .map(({ id, title, text, Icon }) => (
              <label key={id} className={cn("flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition", method === id ? "border-brand bg-brand-soft" : "border-border hover:border-brand/40")}>
                <input type="radio" name="pay" checked={method === id} onChange={() => setMethod(id)} className="sr-only" />
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", method === id ? "bg-brand text-brand-fg" : "bg-surface-2 text-muted")}><Icon className="h-5 w-5" /></span>
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="text-sm text-muted">{text}</span>
                </span>
              </label>
            ))}
        </Card>
      </div>

      <aside className="lg:sticky lg:top-32 lg:self-start">
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-bold">{t("checkout.summary")}</h2>
          <ul className="max-h-72 space-y-3 overflow-y-auto pe-1">
            {lines.map((l) => (
              <li key={l.variantId} className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.image} alt="" className="h-14 w-14 rounded-lg border border-border bg-white object-contain p-1" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="line-clamp-2 font-semibold">{locale === "ar" && l.nameAr ? l.nameAr : l.name}</p>
                  <p className="text-xs text-muted">{l.variantLabel} × {l.qty}</p>
                </div>
                <span className="text-sm font-bold">{money(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t("common.subtotal")}</dt><dd className="font-semibold">{money(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t("common.delivery")}</dt><dd className="font-semibold">{zone ? (fee === 0 ? t("common.free") : money(fee)) : "—"}</dd></div>
            <div className="flex justify-between border-t border-border pt-3 text-lg font-black"><dt>{t("common.total")}</dt><dd className="text-brand">{money(total)}</dd></div>
          </dl>
          {formError && <p className="rounded-xl bg-danger/10 p-3 text-sm font-semibold text-danger">{formError}</p>}
          <Button type="submit" variant="accent" size="lg" className="w-full" disabled={pending || lines.length === 0 || (!codEnabled && !whishEnabled)}>
            {pending ? <><Spinner /> {method === "WHISH" ? t("checkout.redirectingWhish") : t("checkout.placing")}</> : t("checkout.placeOrder")}
          </Button>
        </Card>
      </aside>
    </form>
  );
}
