-- Adds tables for designs and categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS designs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  title TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_tokens (
  user_id TEXT PRIMARY KEY,
  tokens INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_purchases (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
