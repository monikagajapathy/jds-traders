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


## Variant barcode labels

- The app generates a unique identifier for each size/colour variant locally in the browser; no external barcode API is used.
- Barcode artwork is generated as a standards-based **Code 128-B** SVG with its checksum.
- Open Products & Inventory → a product → Size-wise Inventory → **Preview** on a variant to copy its barcode value or print its label.
- Existing saved barcode values are preserved so previously printed labels do not unexpectedly change. Missing/duplicate local values are repaired when saved product data is loaded.
- To enforce uniqueness in the shared Supabase database, run `supabase/variant_barcode_unique.sql` once in the Supabase SQL Editor. Back up the database first.
- A scanner must support Code 128. Test one printed label with the actual scanner before printing a batch. A QR scanner is not the same as a 1D barcode scanner.
