-- 1. Create the notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'all', -- 'all', 'admin', 'customer'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'general', -- 'order', 'prescription', 'chat', 'inventory', 'customer_registration'
    is_read BOOLEAN DEFAULT false,
    read BOOLEAN DEFAULT false, -- fallback duplicate key
    prescription_id UUID,
    quote_id UUID,
    related_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Select Policies
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
CREATE POLICY notifications_select_policy ON public.notifications
    FOR SELECT TO public
    USING (
      -- Admins can select any notification
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      OR
      -- Customers can select their own notifications or those matching general/customer roles
      user_id = auth.uid()
      OR
      (role IN ('customer', 'all') AND user_id IS NULL)
    );

-- 4. Insert Policies
DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
CREATE POLICY notifications_insert_policy ON public.notifications
    FOR INSERT TO public
    WITH CHECK (true); -- Allow clients and trigger functions to insert notifications safely

-- 5. Update Policies
DROP POLICY IF EXISTS notifications_update_policy ON public.notifications;
CREATE POLICY notifications_update_policy ON public.notifications
    FOR UPDATE TO public
    USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      OR
      user_id = auth.uid()
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      OR
      user_id = auth.uid()
    );

-- 6. Delete Policies
DROP POLICY IF EXISTS notifications_delete_policy ON public.notifications;
CREATE POLICY notifications_delete_policy ON public.notifications
    FOR DELETE TO public
    USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      OR
      user_id = auth.uid()
    );

-- 7. Automated Notification Triggers for Status Changes

-- Trigger for Orders status changes
CREATE OR REPLACE FUNCTION public.on_order_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, role, title, message, type, related_id)
    VALUES (
      NEW.user_id,
      'customer',
      'Order Status Update',
      'Your order reservation ' || NEW.reservation_id || ' is now: ' || NEW.status || '.',
      'order',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_order_status_update ON public.pickup_reservations;
CREATE TRIGGER trigger_order_status_update
    AFTER UPDATE ON public.pickup_reservations
    FOR EACH ROW EXECUTE FUNCTION public.on_order_status_update();

-- Trigger for new Order placements (notifies Admins)
CREATE OR REPLACE FUNCTION public.on_order_inserted()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, role, title, message, type, related_id)
  VALUES (
    NULL,
    'admin',
    'New Reservation Placed',
    'A new reservation order (' || NEW.reservation_id || ') has been placed.',
    'order',
    NEW.id::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_order_inserted ON public.pickup_reservations;
CREATE TRIGGER trigger_order_inserted
    AFTER INSERT ON public.pickup_reservations
    FOR EACH ROW EXECUTE FUNCTION public.on_order_inserted();

-- Trigger for Prescriptions status updates
CREATE OR REPLACE FUNCTION public.on_prescription_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, role, title, message, type, prescription_id)
    VALUES (
      NEW.user_id,
      'customer',
      'Prescription Update',
      'Your prescription tracker ' || NEW.reference_id || ' is now: ' || NEW.status || '.',
      'prescription',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prescription_status_update ON public.prescriptions;
CREATE TRIGGER trigger_prescription_status_update
    AFTER UPDATE ON public.prescriptions
    FOR EACH ROW EXECUTE FUNCTION public.on_prescription_status_update();

-- Trigger for new Prescription uploads (notifies Admins)
CREATE OR REPLACE FUNCTION public.on_prescription_inserted()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, role, title, message, type, prescription_id)
  VALUES (
    NULL,
    'admin',
    'New Prescription Uploaded',
    'A new prescription (' || NEW.reference_id || ') has been uploaded for verification.',
    'prescription',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prescription_inserted ON public.prescriptions;
CREATE TRIGGER trigger_prescription_inserted
    AFTER INSERT ON public.prescriptions
    FOR EACH ROW EXECUTE FUNCTION public.on_prescription_inserted();

-- Trigger for new Customer profiles registrations (notifies Admins)
CREATE OR REPLACE FUNCTION public.on_customer_registered()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, role, title, message, type, related_id)
  VALUES (
    NULL,
    'admin',
    'New Customer Registered',
    'A new customer profile (' || COALESCE(NEW.name, 'Name not set') || ') has registered.',
    'customer_registration',
    NEW.id::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_customer_registered ON public.profiles;
CREATE TRIGGER trigger_customer_registered
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.on_customer_registered();

-- Trigger for inventory low stock updates (notifies Admins)
CREATE OR REPLACE FUNCTION public.on_product_stock_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity < NEW.reorder_level AND (OLD.stock_quantity IS NULL OR OLD.stock_quantity >= OLD.reorder_level) THEN
    INSERT INTO public.notifications (user_id, role, title, message, type, related_id)
    VALUES (
      NULL,
      'admin',
      'Low Stock Warning',
      'Stock for ' || NEW.name || ' is low (' || NEW.stock_quantity || ' remaining). Reorder level is ' || NEW.reorder_level || '.',
      'inventory',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_product_stock_change ON public.products;
CREATE TRIGGER trigger_product_stock_change
    AFTER UPDATE OF stock_quantity ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.on_product_stock_change();

-- 8. Add all relevant tables to the supabase_realtime publication
DO $$
BEGIN
  -- Re-create publication or empty it to avoid duplicate entry errors
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS 
    public.notifications,
    public.orders,
    public.pickup_reservations,
    public.prescriptions,
    public.chat_messages,
    public.chat_conversations,
    public.products,
    public.inventory_logs,
    public.cms_offers,
    public.cms_health_concerns,
    public.cms_why_choose_us,
    public.profiles;

  -- Add tables
  ALTER PUBLICATION supabase_realtime ADD TABLE 
    public.notifications,
    public.orders,
    public.pickup_reservations,
    public.prescriptions,
    public.chat_messages,
    public.chat_conversations,
    public.products,
    public.inventory_logs,
    public.cms_offers,
    public.cms_health_concerns,
    public.cms_why_choose_us,
    public.profiles;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Publication alter completed or ignored.';
END;
$$;
