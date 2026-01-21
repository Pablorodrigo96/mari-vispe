-- Add stripe_customer_id to profiles for linking Supabase users to Stripe customers
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Add stripe_subscription_id to subscriptions for tracking Stripe subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);