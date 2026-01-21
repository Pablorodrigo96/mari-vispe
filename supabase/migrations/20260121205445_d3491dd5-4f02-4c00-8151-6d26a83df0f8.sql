-- Admin can view all listings
CREATE POLICY "Admins can view all listings"
ON public.listings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update all listings
CREATE POLICY "Admins can update all listings"
ON public.listings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete all listings
CREATE POLICY "Admins can delete all listings"
ON public.listings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update all subscriptions
CREATE POLICY "Admins can update all subscriptions"
ON public.subscriptions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all user_roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can insert user_roles
CREATE POLICY "Admins can insert user roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can delete user_roles
CREATE POLICY "Admins can delete user roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all valuation_history
CREATE POLICY "Admins can view all valuation history"
ON public.valuation_history FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all valuation_purchases
CREATE POLICY "Admins can view all valuation purchases"
ON public.valuation_purchases FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));