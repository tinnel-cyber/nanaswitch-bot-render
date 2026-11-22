-- ==============================================================================
-- Migration Chantier 4 : Livraisons Numériques, Téléchargements Sécurisés
-- (/download/:orderId) et Distinction Campus Privé vs Fichiers Téléchargeables
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.digital_deliveries (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  product_id TEXT,
  product_name TEXT NOT NULL,
  delivery_mode TEXT NOT NULL DEFAULT 'download_file', -- 'download_file' | 'campus_private' | 'vip_room'
  allow_download BOOLEAN NOT NULL DEFAULT TRUE,
  file_key TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  store_name TEXT,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_deliveries_order ON public.digital_deliveries (order_id);
CREATE INDEX IF NOT EXISTS idx_digital_deliveries_email ON public.digital_deliveries (customer_email);
