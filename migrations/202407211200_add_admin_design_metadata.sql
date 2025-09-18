-- Adds admin-specific metadata columns to the designs table and enforces admin ownership
ALTER TABLE designs
  ADD COLUMN is_admin_template BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN admin_notes TEXT,
  ADD COLUMN managed_by_admin_id TEXT;

ALTER TABLE designs
  ADD CONSTRAINT fk_designs_managed_by_admin
  FOREIGN KEY (managed_by_admin_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

ALTER TABLE designs
  ADD CONSTRAINT chk_designs_admin_requires_manager
  CHECK (
    NOT is_admin_template OR managed_by_admin_id IS NOT NULL
  );

CREATE OR REPLACE FUNCTION ensure_design_manager_is_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.managed_by_admin_id IS NULL THEN
    IF NEW.is_admin_template THEN
      RAISE EXCEPTION 'Admin templates must be managed by an admin user';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = NEW.managed_by_admin_id
      AND LOWER(u.role) = 'admin'
  ) THEN
    RAISE EXCEPTION 'User % is not an admin and cannot manage design metadata', NEW.managed_by_admin_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_designs_admin_manager ON designs;

CREATE TRIGGER trg_designs_admin_manager
  BEFORE INSERT OR UPDATE OF managed_by_admin_id, is_admin_template
  ON designs
  FOR EACH ROW
  EXECUTE FUNCTION ensure_design_manager_is_admin();
