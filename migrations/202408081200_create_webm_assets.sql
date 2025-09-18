-- Creates tables to store WebM media assets linked to designs
CREATE TABLE IF NOT EXISTS webm_files (
  id SERIAL PRIMARY KEY,
  design_id INTEGER NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  storage_uri TEXT NOT NULL,
  duration_seconds NUMERIC(10, 3) CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webm_files_design_id ON webm_files(design_id);
CREATE INDEX IF NOT EXISTS idx_webm_files_uploaded_by ON webm_files(uploaded_by);

-- Support efficient lookup of WebM assets for a user's designs via joins
CREATE INDEX IF NOT EXISTS idx_webm_files_design_id_created_at
  ON webm_files(design_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_webm_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_webm_files_updated_at ON webm_files;

CREATE TRIGGER trg_webm_files_updated_at
  BEFORE UPDATE ON webm_files
  FOR EACH ROW
  EXECUTE FUNCTION set_webm_files_updated_at();
