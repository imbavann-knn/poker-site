-- Wholesome ALL IN — Database Schema
-- Run this once after creating the Railway PostgreSQL plugin

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  alias VARCHAR(100),
  emoji VARCHAR(10) DEFAULT '♠',
  joined_date DATE DEFAULT CURRENT_DATE,
  created_by VARCHAR(100) DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time VARCHAR(10) DEFAULT '20:00',
  venue VARCHAR(200),
  host VARCHAR(100),
  blinds VARCHAR(20) DEFAULT '0.10/0.20',
  status VARCHAR(20) DEFAULT 'planned',
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  added_by VARCHAR(100),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, player_id)
);

CREATE TABLE IF NOT EXISTS session_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  profit_loss DECIMAL(10,2) NOT NULL DEFAULT 0,
  entered_by VARCHAR(100),
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, player_id)
);

CREATE TABLE IF NOT EXISTS changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  editor_name VARCHAR(100) NOT NULL,
  description TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
