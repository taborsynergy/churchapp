/*
  # Fix missing GRANT on users table

  The `users` table was created without explicit GRANT statements for the
  `authenticated` and `anon` roles. Without these grants, the Supabase JS client
  (which uses the authenticated role for logged-in users) cannot read profile rows
  through the `church_users` view (SECURITY INVOKER view requires grants on the
  underlying table), causing profile fetches to silently return null.

  Effect of null profiles:
  - Login page falls through to else-branch → all users redirected to /
  - Admin layout sees null profile → admin/staff locked out of /admin
  - /give shows PendingApprovalScreen for all authenticated users

  Fix: Grant the standard CRUD privileges that Supabase normally sets up via
  ALTER DEFAULT PRIVILEGES.
*/

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Also grant on the view (already done, but re-asserting for safety)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.church_users TO authenticated;
GRANT SELECT ON public.church_users TO anon;

-- Ensure future tables in public schema auto-grant to these roles
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
