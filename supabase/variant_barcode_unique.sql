-- JDS Traders: enforce one unique barcode per product variant.
-- Run once in Supabase SQL Editor after confirming product_variants.barcode exists.
-- Existing duplicate/missing values are repaired before the unique index is created.
with ranked as (
  select id, barcode,
         row_number() over (partition by barcode order by id) as duplicate_rank
  from public.product_variants
  where barcode is not null and btrim(barcode) <> ''
)
update public.product_variants as variants
set barcode = 'JDS-' || upper(substr(md5(gen_random_uuid()::text), 1, 12))
from ranked
where variants.id = ranked.id and ranked.duplicate_rank > 1;

update public.product_variants
set barcode = 'JDS-' || upper(substr(md5(gen_random_uuid()::text), 1, 12))
where barcode is null or btrim(barcode) = '';

create unique index if not exists product_variants_barcode_unique_idx
  on public.product_variants (barcode);
