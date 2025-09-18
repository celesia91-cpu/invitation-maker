-- Creates a join table linking designs to their owners
CREATE TABLE IF NOT EXISTS design_owners (
  design_id INTEGER PRIMARY KEY REFERENCES designs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_owners_user_id ON design_owners(user_id);

CREATE OR REPLACE FUNCTION set_design_owners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_design_owners_updated_at ON design_owners;

CREATE TRIGGER trg_design_owners_updated_at
  BEFORE UPDATE ON design_owners
  FOR EACH ROW
  EXECUTE FUNCTION set_design_owners_updated_at();

INSERT INTO design_owners (design_id, user_id, created_at, updated_at)
SELECT id, user_id, COALESCE(updated_at, NOW()), COALESCE(updated_at, NOW())
FROM designs
WHERE user_id IS NOT NULL
ON CONFLICT (design_id) DO UPDATE
SET user_id = EXCLUDED.user_id,
    updated_at = NOW();

ALTER TABLE designs
  DROP COLUMN IF EXISTS user_id;
