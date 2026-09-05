# Zion Curtain Store

A professional inventory and daily operations dashboard for Zion curtain store.

## Stack

- `frontend`: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui-style primitives, lucide-react
- `backend`: Node.js, Express, TypeScript, PostgreSQL, Zod, JWT, bcryptjs, xlsx
- `database`: PostgreSQL 16 via Docker Compose

## Quick start

Prerequisites: Node.js 20+, npm 10+, Docker Desktop.

```bash
git init
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
npm install
npm run install:all
npm run db:up
npm run seed
npm run dev
```

Open `http://localhost:3000`. The API runs at `http://localhost:4000`.

Demo credentials after seeding: `owner@zioncurtains.com` / `zion-demo-password`.

## Database setup

The backend applies `backend/src/database/schema.sql` on startup. `docker compose up -d postgres` creates the local database. Set `DATABASE_URL` in `backend/.env` for another PostgreSQL instance.

For a production database, use a managed PostgreSQL provider, set a strong password, restrict network access, and run migrations during deployment.

## Excel import format

The curtains importer accepts `.xlsx`, `.xls`, or `.csv`. The first row must contain headers such as `name`, `sku`, `category`, `color`, `width`, `height`, `material`, `quantity`, `unitPrice`, and `reorderLevel`. Unknown columns are ignored and validation errors are returned per row.

## Product notes

The API uses JWT bearer tokens for the prototype. For production, move refresh tokens to secure, httpOnly cookies, add CSRF protection, configure object storage for original uploads, and place the API behind TLS. Role checks are included for future staff/admin expansion.
