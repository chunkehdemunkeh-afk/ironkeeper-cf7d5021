
-- Drop existing fragile PERMISSIVE false policies
DROP POLICY IF EXISTS "Deny direct role inserts" ON public.user_roles;
DROP POLICY IF EXISTS "Deny direct role deletes" ON public.user_roles;

-- Create RESTRICTIVE policies that can never be overridden by future PERMISSIVE policies
CREATE POLICY "Restrict role inserts" ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "Restrict role updates" ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (false);

CREATE POLICY "Restrict role deletes" ON public.user_roles
  AS RESTRICTIVE FOR DELETE TO authenticated USING (false);
