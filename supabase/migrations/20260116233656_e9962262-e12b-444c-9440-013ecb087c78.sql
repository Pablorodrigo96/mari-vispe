-- Add new fields to profiles table for user data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cpf_cnpj text,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS neighborhood text;