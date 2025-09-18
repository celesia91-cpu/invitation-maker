-- Adds role support to the users table
ALTER TABLE users
  ADD COLUMN role TEXT NOT NULL DEFAULT 'user';

-- Ensure all existing users receive the default role value
UPDATE users
SET role = 'user'
WHERE role IS NULL OR role = '';

-- Index role for faster filtering by role in queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
