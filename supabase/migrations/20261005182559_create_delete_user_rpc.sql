/*
# Create delete_user_account RPC function

## Purpose
Replaces the Edge Function approach for account deletion with a direct
PostgreSQL SECURITY DEFINER function callable via supabase.rpc().

## What it does
1. Verifies the caller is the account owner (auth.uid() = p_user_id).
2. Deletes the user's rows from tables with ON DELETE SET NULL foreign keys
   so their content doesn't linger with null user_id:
   - catches
   - point_posts
   - point_comments
   - feedback
3. Deletes the user's app_settings row (no FK to auth.users).
4. Deletes the auth user from auth.users, which CASCADE-deletes:
   - notifications (CASCADE)
   - reports (CASCADE)
   - user_profiles (CASCADE)

## Security
- SECURITY DEFINER: runs as the function owner (postgres/supabase_admin),
  which is the only role that can DELETE from auth.users.
- SET search_path = public to prevent search_path injection.
- REVOKE EXECUTE from anon and public so only authenticated users can call it.
- GRANT EXECUTE to authenticated only.
- Authorization check inside the function: auth.uid() must match p_user_id.
  A user cannot delete another user's account.
*/

CREATE OR REPLACE FUNCTION delete_user_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_deleted_tables text[] := ARRAY[]::text[];
  v_count int;
BEGIN
  -- Authorize: caller must be deleting their own account
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF v_caller <> p_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account' USING ERRCODE = '42501';
  END IF;

  -- Delete from tables with ON DELETE SET NULL (rows would otherwise persist with null user_id)
  DELETE FROM catches WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_tables := array_append(v_deleted_tables, 'catches:' || v_count);

  DELETE FROM point_comments WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_tables := array_append(v_deleted_tables, 'point_comments:' || v_count);

  DELETE FROM point_posts WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_tables := array_append(v_deleted_tables, 'point_posts:' || v_count);

  DELETE FROM feedback WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_tables := array_append(v_deleted_tables, 'feedback:' || v_count);

  -- Delete app_settings (no FK to auth.users, won't cascade)
  DELETE FROM app_settings WHERE id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_tables := array_append(v_deleted_tables, 'app_settings:' || v_count);

  -- Delete the auth user — this CASCADEs to notifications, reports, user_profiles
  DELETE FROM auth.users WHERE id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Auth user not found' USING ERRCODE = 'P0002';
  END IF;

  v_deleted_tables := array_append(v_deleted_tables, 'auth.users:' || v_count);

  RETURN jsonb_build_object(
    'success', true,
    'deleted_tables', v_deleted_tables
  );
END;
$$;

-- Lock down execution: only authenticated users can call this
REVOKE EXECUTE ON FUNCTION delete_user_account(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION delete_user_account(uuid) TO authenticated;
