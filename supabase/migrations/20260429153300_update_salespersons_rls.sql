DROP POLICY IF EXISTS "staff_select_salespersons" ON salespersons;

CREATE POLICY "staff_select_salespersons" ON salespersons
FOR SELECT
TO authenticated
USING (
  current_user_app_role() = ANY (
    ARRAY['admin'::app_role, 'salesperson'::app_role, 'partner'::app_role]
  )
);
