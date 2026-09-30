# Jamrex Miniyeh (Akkar) — Build Plan

Status: PLAN ONLY, nothing built yet. Facts and source data are in `RESEARCH.md`.

## 1. Decisions locked in
- Same product catalog and **same prices as jamrexlb.com** at launch (seeded from their store API); Miniyeh staff can change everything afterwards. All prices in USD.
- **One product page per product, with variants**: size buttons (e.g. Laundry Powder 700g / 4kg / 8kg, each with its own price and stock) and option buttons (scent / color) that **switch the photo immediately** when clicked. Both are named and visible to the customer.
- **Everything editable from the dashboard**: products, variants, prices, stock, categories, offers, delivery zones/fee, orders, customers, staff and permissions, and **all website text and sections** (home hero, banners, announcement bar, about/contact/policy pages, footer, social links, branch info, SEO titles). Every text field is bilingual (EN + AR).
- **The dashboard itself is bilingual (EN/AR, RTL) with light/dark mode.**
- Staff permissions are **per employee** (each user has an individually ticked permission list), no fixed roles.
- Payments: cash on delivery + Whish Pay. Delivery: all Akkar + Miniyeh, flat $4 (configurable per zone).
- Hidden admin URL (secret path from env var, 404 on `/admin`, noindex) **plus** real authentication.
- Defaults I'm assuming until told otherwise: guest checkout (no customer accounts at launch); order alerts via WhatsApp Cloud API if the client has a Meta business account, else Telegram bot; email as backup.

## 2. Stack
Next.js (App Router) + TypeScript · Tailwind CSS + shadcn/ui (admin + form pieces) · Motion (Framer Motion) · next-intl (EN/AR, RTL, `dir` switching) · next-themes (dark/light) · PostgreSQL + Prisma · Auth.js (credentials, staff only) · Zod validation · sharp for image processing · Resend or SMTP for email · Deployed on a DigitalOcean droplet (Docker Compose or PM2) behind Caddy (auto HTTPS), Postgres on the same droplet with daily backups, reserved IP (needed for Whish refunds), domain jamrexminiyeh.com from Hostinger pointed to the droplet. Images stored on a persistent server volume (abstracted so it can move to DO Spaces).

## 3. Data model (Prisma, main tables)
- `Product` (slug, status, categoryIds, sortOrder, featured, name_en/ar, shortDesc_en/ar, desc_en/ar, seo fields)
- `ProductOptionGroup` (product, type: SIZE | SCENT | COLOR | CUSTOM, name_en/ar) — a product may have a size group and/or an option group
- `ProductOptionValue` (group, label_en/ar, swatch color optional, imageId optional → drives photo switching)
- `ProductVariant` (product, sku, price, comparePrice, stock, sizeValueId?, optionValueId?, active) — one row per size×scent combination, so price and stock can differ
- `ProductImage` (product, path, alt_en/ar, sortOrder, linked to an option value)
- `Category` (slug, name_en/ar, image, sortOrder, visible)
- `Offer` / bundles: either a product flagged as bundle with included items, or discount rules (percent/fixed, date range) — editable
- `DeliveryZone` (name_en/ar, fee, freeOver?, active) ; `Setting` (key/value, e.g. branch hours, phone)
- `Order` (number, status, paymentMethod COD|WHISH, paymentStatus, customer name/phone/address/zone/notes/lat-lng optional, subtotal, deliveryFee, total, whishExternalId), `OrderItem` (snapshot of names/price/variant), `OrderEvent` (status history + who did it)
- `Customer` (built from orders by phone; optional later accounts)
- `User` (staff: name, email, passwordHash, active, 2FA optional, language pref), `Permission` (key catalog), `UserPermission` (user ↔ permission) — **per-employee permissions**
- `AuditLog` (user, action, entity, before/after)
- CMS: `Page` (slug, title_en/ar, SEO), `Section` (page, type, sortOrder, visible, JSON content with `{en, ar}` per field), `MenuItem`, `MediaAsset`, `Testimonial` (name, text_en/ar, rating; no celebrity photos), `NotificationLog`, `WhishPayment`.

## 4. Permission catalog (examples, all toggleable per employee)
products.view/create/edit/delete · prices.edit · stock.update · categories.manage · offers.manage · orders.view/update-status/cancel/refund · customers.view · delivery.manage · content.edit (pages/sections/text) · media.manage · staff.manage · permissions.manage · settings.manage · payments.view · auditlog.view. Enforced **on the server for every action/API route**, UI hides what's not allowed. The owner account always has all permissions.

## 5. Storefront pages (all EN/AR, dark/light, animated)
Home (announcement bar, animated hero, category tiles, hot deals/offers, new arrivals, best sellers, why-Miniyeh strip, testimonials, branch/map/hours block, WhatsApp CTA) · Shop with category filter, price filter, size/scent filter, sort, search · Category pages · Product page (gallery that switches with option click, size + scent buttons, price updates, stock state, qty, add to cart, WhatsApp order button, related products) · Cart drawer + Cart page · Checkout (name, phone, zone, address, notes, COD or Whish, order summary, fee) · Order confirmation + order tracking by number+phone · Contact (map, hours, form → admin inbox) · Delivery info, Exchange/Refund policy, Privacy (editable) · 404 · Wishlist (local storage).

## 6. Admin dashboard modules (at secret URL)
Login (rate-limited) → Dashboard (today's orders, revenue, low stock) · Orders (live list, filter, status flow: new → confirmed → preparing → out for delivery → delivered / cancelled, print invoice/label, WhatsApp customer button) · Products (bilingual form, variants matrix for size×scent, image upload + drag reorder + link image to scent, bulk price/stock edit, import from Jamrex JSON/CSV, duplicate) · Categories · Offers · Inventory (stock adjustments with history, low-stock alerts) · Customers · Delivery zones & fees · **Content manager** (page/section editor for every text, image, banner, menu, footer, social links, branch info, testimonials, SEO) · Media library · Staff & permissions (per-employee checkbox matrix) · Settings (branch info, payment toggles, notification channels) · Audit log. Dashboard language toggle EN/AR + theme toggle.

## 7. Order & notification flow
1. Customer submits checkout → server validates prices/stock from DB (never trusts client), creates `Order` in a transaction, decrements stock.
2. COD → status `new`. Whish → create payment (`externalId` = order number) → redirect to `collectUrl` → callback/redirect → **verify with status API** → mark paid or keep pending (+ polling job).
3. After the order is saved: send ONE detailed WhatsApp message (order no., items with size/scent, totals, customer name/phone/address/zone, payment method, admin link) + email backup; failures retried and logged, never block the order.

## 8. Security
Secret admin path (env), `/admin` → 404, `X-Robots-Tag: noindex`, not in sitemap/robots · Argon2/bcrypt hashes, HTTP-only secure cookies, login rate limiting, optional TOTP 2FA · server-side permission checks + audit log · Zod validation everywhere, CSRF-safe server actions, upload type/size checks · secrets only in env vars (Whish, WhatsApp, DB) · Caddy HTTPS, firewall (ufw), DB not publicly exposed, automated Postgres backups + uploads backup.

## 9. Migration of data
Re-run the store-API scrape (see RESEARCH.md §1) → script that: merges size-sibling products into one product with variants (list in RESEARCH.md §6), turns scent attributes into option values, downloads all images to our storage, maps scent ↔ photo by file name (staff verify in admin), imports Arabic names from the AR pages and marks untranslated ones for manual translation, fixes duplicates/typos.

## 10. Phases
0. Repo, Docker, Prisma schema, i18n/theme/design system, seed script
1. Catalog import + storefront browse (home, shop, category, product with variants/photo switching)
2. Cart, checkout, COD orders, order tracking
3. Admin auth (secret URL), permissions engine, products/categories/orders/inventory modules
4. Content manager (pages/sections/settings) + bilingual dashboard polish
5. Notifications (WhatsApp/Telegram + email)
6. Whish Pay (sandbox → production)
7. SEO, performance, accessibility, QA, deploy to DigitalOcean, domain + HTTPS, backups, staff training

## 11. Still needed from the client
- Whish `channel` / `secret` / `websiteUrl` (sandbox first).
- WhatsApp: Meta business account, or use Telegram; number(s) to receive orders.
- Logo + ISO badge files, testimonial texts, any Miniyeh photos; real branch email.
- Confirm design direction (colors: keep Jamrex blue + teal or refresh) and which products are actually stocked in Miniyeh.

## 12. Update: accounts and notifications (client decisions)
### Customers
- Checkout works as guest or logged in. In both cases checkout requires name, email and phone, stored on the order.
- `Customer` has unique email and unique phone (normalized: lowercase email, E.164 phone such as +9617XXXXXXX). A repeat order with the same email/phone reuses the existing Customer record (upsert); it never errors.
- Sign-up (email + password, email verification link): when the customer verifies their email, all earlier orders linked to that email are attached to the account, so "My orders" shows the full history. Phone alone does not attach orders (it would let someone read another person's orders); this can be added later with an SMS/WhatsApp code.
- Conflict case: the email belongs to customer A and the phone to customer B. The order is saved under the email's customer, flagged "phone mismatch" for staff, and never blocked.
- Customer area: login/register, forgot password, my orders with status tracking, saved addresses, profile. It is separate from staff auth, so customers can never reach the admin.

### Order notifications (free)
1. Staff app (PWA + Web Push): the dashboard is installable on staff phones ("Add to Home Screen") and new orders trigger a real push notification with sound (VAPID keys + `web-push`, service worker, no third-party cost). Each employee subscribes their own device; a permission decides who receives order alerts. Works on Android and desktop Chrome; on iPhone it works only after installing to the Home Screen (iOS 16.4+).
2. Telegram bot to a staff group with the full order details: free, and a reliable fallback if a phone blocks push.
3. Email backup. WhatsApp Cloud API can be added later if they get a Meta business account (paid per conversation after the free tier).
All sends happen after the order is saved, are retried, and are logged in `NotificationLog`.
