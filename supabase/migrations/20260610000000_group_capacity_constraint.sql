-- Fix DEFECT-004: Race condition in group capacity check
-- Enforce group capacity at the database level using a trigger.
-- This prevents TOCTOU race conditions where concurrent joins exceed max_members.

CREATE OR REPLACE FUNCTION check_group_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_max_members int;
  v_current_count int;
BEGIN
  -- Get max_members for this group (NULL means unlimited)
  SELECT max_members INTO v_max_members
  FROM groups
  WHERE id = NEW.group_id;

  -- If no limit set, allow join
  IF v_max_members IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count current members (excluding the row being inserted)
  SELECT COUNT(*) INTO v_current_count
  FROM group_members
  WHERE group_id = NEW.group_id;

  IF v_current_count >= v_max_members THEN
    RAISE EXCEPTION 'Group is full (capacity: %)', v_max_members
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_check_group_capacity ON group_members;

-- Create trigger — fires BEFORE INSERT (atomic with the insert)
CREATE TRIGGER trg_check_group_capacity
  BEFORE INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION check_group_capacity();
