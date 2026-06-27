-- ─────────────────────────────────────────────────────────────────────
-- FIX FOR AUTOMATED CUSTOMER QUOTE CHANGE REQUEST WORKFLOW
-- ─────────────────────────────────────────────────────────────────────
-- When a quote has high confidence and requires no pharmacist review, the
-- customer client updates the prescription's medicines list directly and
-- generates/inserts a new active quote. This script adds RLS policies
-- allowing authenticated users (customers) to perform inserts, updates,
-- and deletes on their own prescription_medicines and prescription_quotes.
-- ─────────────────────────────────────────────────────────────────────

-- 1. prescription_medicines Policies
DROP POLICY IF EXISTS "customer_select_own_medicines" ON public.prescription_medicines;
DROP POLICY IF EXISTS "customer_all_own_medicines" ON public.prescription_medicines;

CREATE POLICY "customer_all_own_medicines" ON public.prescription_medicines
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prescriptions
    WHERE prescriptions.id = prescription_medicines.prescription_id
      AND prescriptions.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prescriptions
    WHERE prescriptions.id = prescription_medicines.prescription_id
      AND prescriptions.user_id = auth.uid()
  ));


-- 2. prescription_quotes Policies
DROP POLICY IF EXISTS "customer_select_own_quotes" ON public.prescription_quotes;
DROP POLICY IF EXISTS "customer_all_own_quotes" ON public.prescription_quotes;

CREATE POLICY "customer_all_own_quotes" ON public.prescription_quotes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prescriptions
    WHERE prescriptions.id = prescription_quotes.prescription_id
      AND prescriptions.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prescriptions
    WHERE prescriptions.id = prescription_quotes.prescription_id
      AND prescriptions.user_id = auth.uid()
  ));
