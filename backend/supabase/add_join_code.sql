-- Run this in Supabase SQL Editor to add join_code to tests

-- Add join_code column
ALTER TABLE public.tests 
ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- Create function to generate random join code
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate join_code on test creation
CREATE OR REPLACE FUNCTION set_test_join_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.join_code IS NULL THEN
    NEW.join_code := generate_join_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_join_code ON public.tests;
CREATE TRIGGER trigger_set_join_code
  BEFORE INSERT ON public.tests
  FOR EACH ROW
  EXECUTE FUNCTION set_test_join_code();

-- Update existing tests with join codes
UPDATE public.tests 
SET join_code = generate_join_code() 
WHERE join_code IS NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tests_join_code ON public.tests(join_code);
