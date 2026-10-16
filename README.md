# JDS Traders — React starter

## Requirements
- Node.js LTS
- npm
- A Supabase project (for live data)

## Install
```bash
npm install
npm run dev
```

## Configure Supabase
Copy `.env.example` to `.env`, then set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Restart Vite after changing `.env`.

Never put a Supabase service-role or secret key in browser code. Enable RLS and use database-side functions for billing and stock updates.

## Current status
This package includes the React UI shell and initial Supabase service functions. It is not yet a production-ready POS: checkout remains disabled until the database migration, auth, RLS policies, and transaction-safe RPC functions have been applied and tested.
