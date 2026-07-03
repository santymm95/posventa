-- ============================================================================
-- SQL PARA CREAR LAS TABLAS FALTANTES EN SUPABASE (POSTGRESQL)
-- ============================================================================
-- Instrucciones:
-- 1. Ve a la consola de Supabase (https://supabase.com/dashboard)
-- 2. Entra a tu proyecto (posventa)
-- 3. En el menú de la izquierda, haz clic en "SQL Editor"
-- 4. Haz clic en "New query" (Nueva consulta)
-- 5. Pega todo este código y haz clic en "Run" (Ejecutar)
-- ============================================================================

-- 1. Crear Tabla: dailybalance (Consolidados diarios)
CREATE TABLE IF NOT EXISTS dailybalance (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP NOT NULL,
  totalsales INTEGER DEFAULT 0 NOT NULL,
  cashsales INTEGER DEFAULT 0 NOT NULL,
  transfersales INTEGER DEFAULT 0 NOT NULL,
  creditsales INTEGER DEFAULT 0 NOT NULL,
  notes TEXT,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexar fecha
CREATE INDEX IF NOT EXISTS idx_dailybalance_date ON dailybalance(date);

-- 2. Crear Tabla: cashclosings (Cierres de caja)
CREATE TABLE IF NOT EXISTS cashclosings (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP NOT NULL,
  totalsales INTEGER DEFAULT 0 NOT NULL,
  cashsales INTEGER DEFAULT 0 NOT NULL,
  transfersales INTEGER DEFAULT 0 NOT NULL,
  creditsales INTEGER DEFAULT 0 NOT NULL,
  expectedcash INTEGER DEFAULT 0 NOT NULL,
  actualcash INTEGER DEFAULT 0 NOT NULL,
  difference INTEGER DEFAULT 0 NOT NULL,
  notes TEXT,
  closedby INTEGER,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexar fecha
CREATE INDEX IF NOT EXISTS idx_cashclosings_date ON cashclosings(date);

-- 3. Crear Tabla: settings (Configuraciones de la App)
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  userid INTEGER NOT NULL,
  apptitle VARCHAR(255) DEFAULT 'Asados Ventas' NOT NULL,
  applogo TEXT,
  primarycolor VARCHAR(7) DEFAULT '#dc2626' NOT NULL,
  secondarycolor VARCHAR(7) DEFAULT '#f97316' NOT NULL,
  theme VARCHAR(50) DEFAULT 'light' NOT NULL,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexar userid
CREATE INDEX IF NOT EXISTS idx_settings_userid ON settings(userid);
