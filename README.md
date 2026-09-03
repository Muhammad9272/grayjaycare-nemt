# Gray Jay Care NEMT Platform

Production-oriented booking, dispatch, driver, hospital, customer, fleet, and accounting portals for Gray Jay Care. The public site follows the existing Gray Jay Care visual identity and the fare engine implements the approved **Service & Rate Manual 2026**.

## Implemented workflow

1. A passenger enters Google-assisted pickup and drop-off addresses, chooses care requirements, and receives a server-calculated estimate.
2. The server independently verifies route distance with Google, calculates the fare, creates the trip, and emails a reference and status link.
3. For a new public passenger, the booking atomically creates a customer account and signs the browser directly into the portal. A separate one-hour email link lets the passenger create a password; passwords are never emailed.
4. Dispatch confirms and assigns a compatible active vehicle plus an approved driver with a valid licence.
5. The driver advances the trip through assigned, en route, arrived, in progress, and completed states. Every state is recorded in the timeline and emailed to the passenger.
6. Customer and hospital portals show only their own trips and allow cancellation while the trip is eligible. The three-hour late-cancellation/no-show policy creates the configured fee.
7. Completion creates a draft invoice, while driver mileage, fuel, and inspections update the linked fleet record. Accounting reports completed revenue and exports CSV.

All mutations perform role checks in the route/action itself. Proxy protection is only the first gate.

## Roles and portals

| Role | Home | Responsibilities |
| --- | --- | --- |
| Super admin / admin | `/admin` | Users, driver approval, fleet, pricing, trips, audit overview |
| Dispatcher | `/dispatch` | Phone bookings, assignment, operational trip control |
| Driver | `/driver` | Duty state, assigned trips, status progression, vehicle logs |
| Customer | `/portal` | Booking status, cancellation, password/security settings |
| Hospital | `/hospital` | Patient bookings and hospital-owned trip status |
| Accountant | `/accounting` | Revenue, invoice state, utilization, CSV export |

## Local setup

Requirements: Node.js 20+, npm, and MySQL/MariaDB.

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open `http://localhost:3000`. Seed accounts use `SEED_PASSWORD`; set a strong, non-default value before running the seed. Seed data is for local/staging use only.

## Required environment

- `DATABASE_URL`: MySQL connection string. Production should require TLS and use a least-privilege database user.
- `AUTH_SECRET`: random secret of at least 32 characters.
- `NEXTAUTH_URL`: canonical application URL; it must be public HTTPS in production.
- `GOOGLE_MAPS_KEY`: server-side key for Places Autocomplete, Place Details, and Distance Matrix.
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `EMAIL_FROM`: SMTP delivery.
- `MAIL_ENCRYPTION`: use `ssl` for implicit TLS; other values use STARTTLS when supported.
- `DISABLE_OUTBOUND_EMAIL=true`: test/staging safety switch only.

Stripe and Twilio variables in `.env.example` are reserved for future direct card collection and SMS delivery. Current payment settlement is operational/off-platform; invoices and accounting records are generated in the platform. Email is the implemented notification channel.

Run the live dependency checks without displaying secret values:

```bash
npm run check:env
```

## Verification

```bash
npm run lint          # ESLint
npm run typecheck     # strict TypeScript
npm run test:unit     # pricing and Toronto time-zone rules
npm run test:e2e      # production build + complete Playwright API/browser suite
npm run check         # all release checks
npm audit --omit=dev  # production dependency audit
```

The Playwright suite creates isolated test users/trips/vehicles, tests each role on desktop and phone viewports, and deletes its fixtures afterward. Outbound email is disabled only for that suite.

## Deployment checklist

1. Create the production database and configure backups, TLS, network restrictions, and a least-privilege user.
2. Set production secrets in the hosting platform; never commit `.env`.
3. Restrict the Google key to the required APIs and production server/network, then rotate any key that has been shared in chat or logs.
4. Run `NODE_ENV=production npm run check:env` from a production-like network.
5. Run `npx prisma migrate deploy` during release, before starting the new application build.
6. Run `npm run check` against a staging database, then deploy the output of `npm run build`.
7. Confirm `/api/health` returns HTTP 200 and exercise one real test booking/email before opening traffic.
8. Configure centralized logs, uptime monitoring, database backups, and an external/shared rate limiter if deploying more than one application instance.

The in-process request limiter protects a single Node instance. Multi-instance or serverless production should replace it with Redis/managed rate limiting so limits are shared across instances.
