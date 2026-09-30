# Jamrex Miniyeh — online shop

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Prisma + PostgreSQL · Framer Motion.
English / Arabic (RTL), light / dark, fully editable from a hidden staff dashboard.
Every library and integration used here is free and open source (Telegram Bot API, Web Push, SMTP and Whish Pay's REST API cost nothing to integrate; you only pay for hosting and the domain).

> **Status:** the whole codebase was written without being able to run it (no Node.js on the machine it was authored on). Expect to fix a few small type/compile errors on the first `npm run build`. Nothing has been tested against Whish yet.

## E-mails with Resend (free)
Set `RESEND_API_KEY` (and `EMAIL_FROM` on your verified domain) in `.env`. It is used for the customer's *confirm your e-mail* and *set password* e-mails. Without a key the link is printed in the server log. The *order confirmation* e-mail exists but is switched **off** (Dashboard -> Settings) until you decide to use it. Until the domain is verified, Resend only delivers to your own address.

## 1. Run it locally

Requirements: Node.js 20+ (22 recommended) and PostgreSQL 15+ (or Docker).

```bash
npm install
cp .env.example .env            # then edit .env (AUTH_SECRET, ADMIN_PATH, OWNER_PASSWORD…)
# start a local database if you do not have one:
docker run -d --name jamrex-db -e POSTGRES_USER=jamrex -e POSTGRES_PASSWORD=jamrex -e POSTGRES_DB=jamrex_miniyeh -p 5432:5432 postgres:17-alpine
npx prisma migrate dev --name init   # creates the tables AND the prisma/migrations folder (commit it)
npm run db:seed                      # owner account, $4 delivery zone, categories, default pages
npm run import:jamrex                # optional: import the Jamrex catalogue as a starting point
npm run dev
```

* Shop: http://localhost:3000  (redirects to /en or /ar)
* Staff dashboard: `http://localhost:3000/<ADMIN_PATH>`  (the value from `.env`). `/adm`, `/admin`, `/login`… return a 404.
* Log in with `OWNER_EMAIL` / `OWNER_PASSWORD`, then create employees under **Staff & permissions** and tick exactly what each may do.

## 2. What is where

| Area | Path |
|---|---|
| Storefront pages | `src/app/[locale]/…` |
| Hidden dashboard | `src/app/adm/…` (served at `/<ADMIN_PATH>` by `src/middleware.ts`) |
| Server actions (all writes) | `src/actions/…` (every one checks the employee's permission on the server) |
| Permissions list | `src/lib/permissions.ts` (add a key here to create a new toggle) |
| Editable website text/sections | `src/lib/content-registry.ts` → dashboard **Website content** |
| Translations (UI strings) | `src/i18n/en.ts`, `src/i18n/ar.ts` |
| Whish Pay | `src/lib/whish.ts`, `src/app/api/whish/[result]/route.ts`, `src/app/api/cron/reconcile/route.ts` |
| Notifications | `src/lib/notify.ts` (Telegram, Web Push, email) |
| Colours / theme | `src/app/globals.css` |

### Key behaviours
* **Sizes** = size buttons (each with its own price + stock). **Scents/colours** = option buttons linked to a photo: clicking one switches the gallery photo instantly. Configure per product in *Products → edit*.
* **Prices and stock are always read from the database** at checkout, never from the browser.
* **Customers:** guest checkout or account. Email and phone are unique on `Customer`; a repeat order re-uses the record. Signing up sends a link to set the password; orders placed earlier with that email then show up in *My orders*.
* **Order alerts:** saved first, then Telegram message + Web Push to every employee with `orders.alerts` + email. Online (Whish) orders alert staff once the payment is confirmed.
* **Whish:** callbacks are never trusted; the status is always confirmed through Whish's status API. A cron job (below) catches missed callbacks.

## 3. Notifications (all free)
1. **Telegram:** talk to @BotFather → `/newbot` → put the token in `TELEGRAM_BOT_TOKEN`. Add the bot to your staff group, send a message, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` to read the group `chat.id` → `TELEGRAM_CHAT_ID`.
2. **Staff app push:** run `npm run vapid`, paste both keys in `.env`. Each employee opens the dashboard on their phone → *Notifications* → *Enable* (iPhone: first "Add to Home Screen", iOS 16.4+). Needs HTTPS (so it works on the real domain, or on `localhost`).
3. **Email:** any SMTP account works (a Gmail app password, Brevo's free plan, or your domain's mailbox). Without SMTP, sign-up/reset links are printed in the server log instead of emailed, so **set SMTP before going live** if you want customer accounts.

## 4. Whish Pay
Fill `WHISH_CHANNEL`, `WHISH_SECRET`, `WHISH_WEBSITE_URL` (sandbox first, keep `WHISH_BASE_URL` on the sandbox URL). Whish must be able to reach your site, so use the real domain or a tunnel (`cloudflared tunnel --url http://localhost:3000`) and set `SITE_URL` to it. Sandbox test payer: phone `96170123456`, OTP `111111`.
For refunds, give Whish the droplet's public IP (use a DigitalOcean *Reserved IP*).
Missed-callback safety net (server crontab, every 5 minutes):
```
*/5 * * * * curl -s -H "x-cron-secret: YOUR_CRON_SECRET" https://jamrexminiyeh.com/api/cron/reconcile > /dev/null
```

## 5. Deploy on a DigitalOcean droplet (Ubuntu, 2 GB RAM is enough)
1. Buy the domain at Hostinger, then add an **A record** `@` (and `www`) pointing to the droplet IP.
2. On the droplet: install Docker (`curl -fsSL https://get.docker.com | sh`), clone/copy this project, `cp .env.example .env` and set real values: `SITE_URL=https://jamrexminiyeh.com`, a long random `AUTH_SECRET`, a random `ADMIN_PATH`, `DB_PASSWORD`, `OWNER_PASSWORD`, notifications, Whish.
3. `docker compose up -d --build` (Caddy gets the HTTPS certificate automatically).
4. First time only: `docker compose exec app npm run db:seed` and (optionally) `docker compose exec app npm run import:jamrex`.
5. Backups: `docker compose exec db pg_dump -U jamrex jamrex_miniyeh | gzip > backup-$(date +%F).sql.gz` daily (cron) and copy the `uploads` volume. Turn on DigitalOcean droplet backups too.
6. Firewall: `ufw allow 22,80,443/tcp && ufw enable`.

## 6. Still needed from the client
* Real Jamrex logo (Website content → *Logo image*) and ISO badge, testimonials (Dashboard → Testimonials).
* Whish keys · Telegram bot · SMTP · real branch email.
* After the catalogue import: check every product's scent ↔ photo links, Arabic names, and enter the **real Miniyeh stock and prices**.
