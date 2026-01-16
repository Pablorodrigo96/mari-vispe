-- Create listings table for business advertisements
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Basic Info
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  foundation_year INTEGER,
  cnpj TEXT,
  
  -- Financial
  annual_revenue DECIMAL(15,2),
  annual_profit DECIMAL(15,2),
  asking_price DECIMAL(15,2),
  hide_price BOOLEAN DEFAULT false,
  
  -- Description & Location
  description TEXT,
  cep TEXT,
  street TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  show_address BOOLEAN DEFAULT false,
  
  -- Commercial Space
  square_meters DECIMAL(10,2),
  rent_value DECIMAL(15,2),
  iptu_value DECIMAL(15,2),
  sale_reason TEXT,
  
  -- Media (placeholder for future)
  images TEXT[] DEFAULT '{}',
  
  -- Plan
  plan TEXT DEFAULT 'basic',
  
  -- Status
  status TEXT DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own listings"
ON public.listings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own listings"
ON public.listings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings"
ON public.listings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings"
ON public.listings FOR DELETE
USING (auth.uid() = user_id);

-- Public can view active listings
CREATE POLICY "Public can view active listings"
ON public.listings FOR SELECT
USING (status = 'active');

-- Trigger for updated_at
CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();