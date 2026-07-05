# PulseFlow

Marketing campaign management, financial budget control, and team operations, unified in one real-time system.

Built with Next.js 15 (App Router, Server Actions), TypeScript, Tailwind + shadcn/ui, Supabase (Postgres + Auth + Realtime), Drizzle ORM, Zod, React Hook Form, Zustand, Recharts, and dnd-kit.

## What's included

- **RBAC**: Admin / Manager / Member roles enforced by Postgres Row Level Security, not just UI checks.
- **Campaigns**: full CRUD, filtering, status lifecycle (draft → active → paused → completed/cancelled).
- **Financial engine**: expense logging + approval workflow, burn rate, remaining budget %, ROI calculation, an 85%-budget alert, and a weighted campaign performance score.
- **Operations**: tasks linked to campaigns, kanban (drag-and-drop) and list views, high-priority-task approval gate.
- **Real-time**: Supabase Realtime subscriptions push expense/task/campaign changes to every connected client instantly; a Presence channel powers the "N online now" indicator.
- **Dashboard**: portfolio-wide budget vs. spend, ROI per campaign, expense breakdown, and task-completion trend charts.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. In **Project Settings → API**, copy the `Project URL` and `anon public` key.
3. In **Project Settings → Database → Connection string** (Session pooler), copy the connection string.
4. Copy `.env.example` to `.env.local` and fill in all four values.

## 2. Push the schema

```bash
npm install
npm run db:push        # creates all tables + enums from db/schema.ts
```

Then open the Supabase **SQL Editor**, paste the contents of `supabase/migrations/0002_rls_and_triggers.sql`, and run it. This adds:
- a trigger that creates a `profiles` row for every new signup (first user becomes `admin`, everyone else `member`)
- Row Level Security policies for every table
- realtime publication for `campaigns`, `expenses`, `tasks`, `campaign_analytics`

## 3. Run locally

```bash
npm run dev
```

Sign up at `/login` — your first account is auto-promoted to Admin. Invite teammates by having them sign up too (default role: Member); an Admin can promote them via the `profiles` table in Supabase Studio until an in-app role manager is built.

## 4. Deploy

**Vercel**: import the GitHub repo, add the same four env vars from `.env.local` in Project Settings → Environment Variables, deploy.

**Supabase**: already live from step 1 — no separate deploy step needed. Just make sure your Vercel domain doesn't need to be added anywhere (Supabase Auth works cross-origin by default for the anon key flow used here).

## Notes on scope / what to extend next

- Mock performance ingestion (leads/conversions) currently lives on the `campaigns` row itself (`leads_generated`, `conversions`, `revenue_value`) and is editable via Supabase Studio or a future admin form — wire up a small form on the campaign page if you want in-app editing.
- `campaign_analytics` table exists for daily snapshots if you want a true time series instead of the mocked cumulative-from-expenses chart currently used for "budget vs spend."
- Add an in-app role management screen (Admin only) instead of editing `profiles.role` directly in Supabase Studio.

PulseFlow@13
https://hueiktbghsiuzieaxote.supabase.co/rest/v1/
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZWlrdGJnaHNpdXppZWF4b3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzc5MDgsImV4cCI6MjA5ODc1MzkwOH0.8W7GHsYWiCKFlShRdThJ-fgehttG1h8uxyR8_1PpDWI
postgres://postgres.apbkobhfnmcqqzqeeqss:[PulseFlow@13]@aws-[eu-west-1].pooler.supabase.com:5432/postgres
eu-west-1