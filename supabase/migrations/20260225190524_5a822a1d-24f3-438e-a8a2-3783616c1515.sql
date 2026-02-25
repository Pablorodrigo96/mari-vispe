
-- Step 1: Add column
ALTER TABLE public.listings ADD COLUMN additional_info text;

-- Step 2: Drop existing view
DROP VIEW IF EXISTS public.public_listings;

-- Step 3: Recreate view with new column
CREATE VIEW public.public_listings AS
SELECT id,
    title,
    category,
    description,
    additional_info,
    foundation_year,
    annual_revenue,
    annual_profit,
    asking_price,
    hide_price,
    city,
    state,
    neighborhood,
    square_meters,
    rent_value,
    iptu_value,
    sale_reason,
    images,
    plan,
    status,
    ticker,
    created_at,
    updated_at
FROM listings
WHERE status = 'active'::text;
