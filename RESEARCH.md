# Jamrex Lebanon (jamrexlb.com) — Research Notes (2026-09-29)

## 1. Tech stack of the existing site
- WordPress 7.1 + WooCommerce 11.1 + Elementor, Woodmart-style theme, TranslatePress (EN/AR), Google Ads conversion tag, footer credit "Powered by Waslah".
- Font: Satoshi. Brand: royal blue header (#0a3fd1-ish), teal buttons `rgb(0,195,178)`, JAMREX logo + ISO 9001 badge.
- **Public WooCommerce Store API works** (no auth) — best data source for the migration:
  - `GET /wp-json/wc/store/v1/products?per_page=100&page=N` (86 products total, 1 page of 100)
  - `GET /wp-json/wc/store/v1/products/categories?per_page=100`
  - Sitemaps: `/wp-sitemap.xml` (pages, products, product_cat)
- Arabic is TranslatePress (translated at render time): the API returns English even under `/ar/`. Arabic names/short descriptions must be scraped from `/ar/product/<slug>/` HTML (h1 + `.woocommerce-product-details__short-description`). I did this: **~65 of 86 have Arabic names; ~11 are untranslated** (mostly offer bundles, e.g. Bathroom Care Offer, shampoos, "powder 8kg", "Jamrex Towel", "Laundry Softener and Freshener 3L", some names are poor machine translation, e.g. "الصفحة الرئيسية العروض" for Home Offer, "2 × 2 ×"). **We need to re-translate Arabic ourselves.**
- Scraped CSV/XLSX in this folder (86 rows) only has name, price, one image. The API gives far more (full gallery, categories, descriptions, attributes, stock). Prefer the API; CSV is a cross-check.

## 2. Sitemap / pages
| Page | URL | Content |
|---|---|---|
| Home | `/en/home/` (root `/` redirects) | Announcement marquee "Free Shipping On Orders Over $100"; hero YouTube video (`_DFFhWYitT4`); "Trusted By Top Celebrities / Featured Everywhere" (images: celebrity screenshots); carousels: **Hot Deals** (offers), **Hello, Newness!** (new: shampoos), **"Enough With Products That Don't Work" – Fabrics**, **Car Care**, **Home Cleaning**; each "Add to cart / wishlist". |
| `/en/` | Empty blog page ("Nothing Found") — no blog content exists. |
| Shop | `/en/shop/` | Sort: popularity, latest, price asc/desc; per-page 9/12/18/24; no filter widgets. |
| Category | `/en/product-category/<slug>/` | 12 categories (below) |
| Product | `/en/product/<slug>/` | Breadcrumb, gallery, title, short desc, price, qty, Add to cart, Buy now, share buttons, fake social-proof ("3 people watching", "9 items sold in last 2 hours"), Description tab. No reviews, no related products. |
| Cart / Checkout | `/en/cart/`, `/en/checkout/` | Standard WooCommerce (couldn't see fields with empty cart). |
| My account | `/en/my-account/` | Login + Register (email only, anti-spam). |
| Contact | `/en/contact-us/` | Address, hours, phone, email, "Drop us a line" form. |
| Refund & Returns | `/en/refund_returns/` | "No refund – exchange only" policy (details below). |
| Privacy | `/en/privacy-policy/` | Generic policy, effective 18 Aug 2025. |
| Arabic | `/ar/...` (RTL), nav: الإكسسوارات، معطرات الجو، العروض، العناية بالسيارات، مستحضرات التجميل، غسيل الصحون، الأقمشة، صابون اليدين، تنظيف المنزل، الغسيل، الأحذية |

Header: search bar, language switch, Login/Register, Basket, category nav ("More" dropdown), "Live Chat Support" (WhatsApp), "Shipping Available – All Countries". Floating WhatsApp button.

## 3. Company / contact info
- Brand tagline: "Jamrex – Trust The National Industry" (AR: جامركس - الثقة في الصناعة الوطنية); "Detergents, car care, cosmetics, and more".
- Lebanon: Nejme Square, Saida (footer); Contact page: Takkeyeddine El Solh street facing Ziad library, Saida, South Lebanon. Hours: every day 9:00am–6:00pm.
- UAE: JAMREX TRADING L.L.C, Al Khabeesi Building, Office 3-248, Al Khabeesi area, Dubai.
- Phones: +961 70 656 445 (contact page / WhatsApp `wa.me/96170656445`), +961 81 90 60 60, +971 58 669 5755. Email: support@jamrexlb.com.
- Social: Facebook (profile id 61554154915191), Instagram @jamrex.lb, TikTok @jamrexlb, WhatsApp.
- Akkar branch: **no info on the site** — we need address/phone/hours/delivery area from the brother.

## 4. Policies
- **Refund/Exchange:** no cash refunds ever. Cancel within 2 days if not yet shipped. Damaged/faulty: contact within 48h with photos; item is inspected, then repaired/replaced free, or (management approval) gift voucher for the purchase price valid ~6–12 months. Used/misused items not accepted.
- Free shipping over $100. Currency USD only. No visible payment-method list on the site (need to decide: COD, Whish, OMT, card, etc.).

## 5. Categories (12) — product counts (products can be in several)
Home Cleaning 35 · Offers 23 · Car Care 19 · Fabrics 13 · Laundry 10 · Shoes 9 · Accessories 5 · Cosmetics 5 · Air Fresheners 3 · Dishwash 3 · Other 3 · Hand Soap 2. ("Other" is hidden from nav; product "wind shield" has no category.) No category images.

## 6. Product options (sizes / colors / scents) — the key finding
- Total **86 products**. Only **2 are true WooCommerce variable products**: `Brush` (Color: Beige, Gray — currently OUT of stock) and `Car Air Freshener 250ml` (Scent ×5). But on the live page, **neither shows a selector** and the API returns empty variation lists, so the variations are broken/not priced individually.
- **Sizes are NOT variations. Each size is a separate product with its own price** (e.g. Laundry Powder 700g/4kg/8kg; Dishwashing Liquid 700ml/2l/3.7l). In the new shop we should **group these into one product with size selector** (better UX), keeping identical prices.
- **Scents are stored only as an informational attribute** on ~20 products, and are shown as the product's gallery images (one photo per scent, +1 generic). No scent picker, one price. In the new shop → scent/color swatch selector linked to the matching gallery photo (needs manual mapping of image ↔ scent; file names hint at it, e.g. `Floor-cleaning-Ocean-Breeze.jpg`, `Ruby-red.jpg`).

### Scent/color options per product
| Product (size) | Price $ | Options |
|---|---|---|
| Floor Cleaner 750ml (2 listings: ids 16883 & 18234, duplicate) | 2.25 | Ocean Green, Wild Rose, Fresh Breeze, Terre D'agrumes, Ruby Red |
| Floor Cleaner 3.7l | 7.5 | Ocean Green, Wild Rose, Ruby Red, Fresh Breeze, Luxury Jamrex |
| Dishwashing Liquid 700ml / 2l / 3.7l | 2.15 / 4 / 6.5 | Apple, Lemon, Ocean Blue, Mixed Berries (3.7l: "Mix Berry") |
| Laundry Liquid 3l | 6.5 | Violet Breeze, Spring Blossom, Wave Breeze, Dandelion Flowers |
| Laundry Liquid 5l | 11 | none listed |
| Laundry Softener & Freshener 3L | 6.5 | Twilight Musk, Violet Breeze, Wave Breeze, Spring Blossom |
| Laundry Powder 700g / 4kg / 8kg | 2 (OUT) / 10 / 22 | 700g: Fresh Essence · 4kg: Spring Bloom, Lavender, Wave Breeze, Twilight Musk · 8kg: Lavender, Sunflower, Wild Rose, Jasmine Rose |
| Hand Soap Liquid 750ml | 3 | Luxury Jamrex, Orange Blossom, Wave Blue, Green, Night Jewelry, Red |
| Hand Soap Liquid 3.7l | 9 | Wave Breeze, Night Jewelry, Pomegranate, Apple, Orange Blossom |
| Home Air Freshener 500ml | 6 | Antalya, Beirut, Sham, Blooming Care, Soft Blue, Passion |
| Car Air Freshener 250ml | 5 | Antakia, Bombasa, Rossy, Tsubaki, Gold Icon |
| Condensed Air Freshener 650ml | 6 | Pink+green, Blue, Pink+Blue |
| Mr. Glassy 700ml | 1.9 | Fresh Essence, Tropical Flowers, Wild Flowers |
| Brush | 2 (OUT) | Beige, Gray |

### Size families to merge into one product (price per size, $)
- Floor Cleaner: 750ml 2.25 · 3.7l 7.5
- Dishwashing Liquid: 700ml 2.15 · 2l 4 · 3.7l 6.5
- Laundry Powder: 700g 2 · 4kg 10 · 8kg 22
- Laundry Liquid: 3l 6.5 · 5l 11
- Hand Soap Liquid: 750ml 3 · 3.7l 9
- Liptolex: 750ml 7 (listed 3.5 on home page cards? — verify; API says 7) · 3.7l 9 · Spray 750ml 5
- Chlorexo Bleach: 1l 1.5 · 3.4l 4
- Volcano Flash: 1l 3.1 · 3.4l 7.5
- Fabric Cleaner: 50ml 5 · 250ml 12 · 1l 25 · (5l+250ml free bundle 82)
- Anti Mist bundles (x1 15, x2 20), Shoe Cleaner (180ml 10, 2x 20, 3x 25), Duo/Trio Fabric Cleaner (20/25).
- Price discrepancy to verify: home page card shows Liptolex 750ml at $3.50 while the API price is $7 — confirm with brother which is right.

## 7. Data-quality issues to fix in the rebuild
- Duplicate: Floor Cleaner 750ml (two ids). "Car Care Essentials" and other offers appear in several places.
- Missing descriptions: `powder 8kg` (id 23016, Laundry — looks like a duplicate of Laundry Powder 8kg, 4 images), `Jamrex Towel`.
- Typos: "fourmulated", "Shoes CLeaner", "Jamerx", "limscale", "Tropical FLowers".
- No SKUs, no weights/dimensions, no stock quantities (only in/out; 2 items OUT: Brush, Laundry Powder 700g), no reviews/ratings, no tags/brands.
- Product images: `https://jamrexlb.com/wp-content/uploads/YYYY/MM/...` — some are WhatsApp screenshots (offers), quality varies; download originals to our own storage/CDN (no hotlinking).
- Descriptions are short, generic (many share identical text across sizes) — good chance to rewrite properly in EN + AR.

## 8. What the current site lacks (design opportunities)
No real hero/brand story, no category pages with visuals, no filters (price/category/size), no reviews, no blog content, no Arabic quality, fake "people watching" counters, stock-photo-free plain grid, no order tracking, no wishlist page UX, weak mobile experience, empty cart pages, WhatsApp only for support.

## 9. Questions for the brother (needed before building)
1. Akkar branch: address, phone/WhatsApp, hours, email, Google Maps location, social handles (own or shared with Jamrex Lebanon)?
2. Delivery: areas covered from Akkar, delivery fee, free-delivery threshold, delivery times? Currency: USD only, or USD + LBP?
3. Payments: cash on delivery, Whish/OMT, card (Stripe/other)? Or WhatsApp-order checkout?
4. Does the Akkar shop keep the exact same prices, and are the ids/stock per branch managed separately? Which products are actually stocked in Akkar?
5. Admin needs: add/edit products, prices, stock, categories, offers, orders, customers, delivery zones — one or several staff users?
6. Can we use Jamrex's logo, ISO badge, photos, and celebrity/testimonial imagery (permission from head office)? Domain name?
7. Confirm scent-to-photo mapping and size grouping decisions, and Liptolex price.

## 10. Suggested stack (for later, not started)
Next.js (App Router) + TypeScript + Tailwind + Framer Motion, next-intl (EN/AR, RTL), next-themes (dark/light), PostgreSQL + Prisma (or Supabase), NextAuth for admin/customers, admin dashboard (products/orders/inventory), image storage (S3/Cloudinary/Supabase), order notification via WhatsApp/email. Seed the DB from the Store API scrape.

## 11. Answers from the client (Akkar / Miniyeh branch)
- Address: Miniyeh, Mafraq, Shahrazad Hall (المنية مفرق صالة شهرزاد) — updated by the client. Map: https://www.google.com/maps/place/34.473053,35.923363 (lat 34.473053, lng 35.923363).
- Phone / WhatsApp: +961 70 596 772. Hours and email: not provided yet.
- Instagram: https://www.instagram.com/jamrexminiyeh/ — Facebook: https://www.facebook.com/people/Jamrex-Miniyeh/61594234088354/ (own accounts, separate from Jamrex Lebanon). Domain: jamrexminiyeh.com
- Delivery: all of Akkar and Miniyeh, flat $4 for now (make it configurable per zone). Currency: USD only.
- Payments: cash on delivery + Whish Pay (docs: https://whish-partners.pages.dev/whish-pay-9z366gc6922w/ — could not be opened from this environment, need the content pasted/saved).
- Catalog/prices/stock are managed separately by Miniyeh staff (own products, own stock, own prices — Jamrex Lebanon's data is only a starting seed).
- Admin: several staff, **fully dynamic per-employee permissions** (not fixed roles): each employee gets individually toggled permissions.
- Assets: logo + ISO badge OK, testimonials OK, people/celebrity photos NOT allowed.

## 12. Branch details (final) and Whish Pay integration notes
- Hours: every day 9:00 AM – 9:00 PM. Email: placeholder `info@jamrexminiyeh.com` (replace when a real one exists).
- Whish Pay docs saved locally at `C:\Users\wouro\Desktop\whish\docs.html` (v1.4.4). Summary:
  - Base URLs: sandbox `https://partner.api.sbx.whish.money/itel-service/api`, production `https://api.whish.money/itel-service/api`. Currencies USD/LBP (we use USD, min 1.00).
  - Every request needs headers `channel`, `secret`, `websiteUrl` (values issued by Whish), `User-Agent: AppName/version (website; contact-email)`, plus JSON content type. Keys stay server-side only (env vars).
  - Flow: `POST /payment/whish` with `amount` (string), `currency`, `invoice`, `externalId` (= our order id, unique), `successCallbackUrl`, `failureCallbackUrl`, `successRedirectUrl`, `failureRedirectUrl` → returns `collectUrl`; redirect customer there. Customer pays from Whish balance with an OTP in the Whish app.
  - Callbacks are unauthenticated GETs → never trust them; always confirm with `POST /payment/collect/status` (`{currency, externalId}` → `collectStatus`: pending | success | failed | refunded | unknown) before marking an order paid. A failure callback does NOT mean failed (link stays payable). Add a polling fallback job for missing callbacks. Put our order reference in the callback URL query.
  - All responses are HTTP 200; branch on `status`/`code` in the body. `status:false, code:"500"` = pending/unknown, not failed.
  - Callback/redirect URLs must be public (localhost rejected with 403) → use a tunnel (ngrok/cloudflared) or the staging domain in development. Whish callback IPs (allowlist if needed): prod 18.213.222.45, 52.21.189.51, 52.21.55.64; sandbox 52.4.4.47.
  - Refund `POST /payment/whish/refund` only works from IPs whitelisted by Whish → give Whish the DigitalOcean droplet's public IP (use a reserved IP).
  - Sandbox test: phone 96170123456, OTP 111111. No emojis in payload (error `emoji.not_supported`).
  - Still needed from the client: Whish `channel`, `secret`, `websiteUrl` for sandbox and production.
