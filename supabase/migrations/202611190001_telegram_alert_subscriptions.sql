BEGIN;

CREATE TABLE IF NOT EXISTS public.telegram_alert_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text NOT NULL CHECK (telegram_user_id ~ '^[0-9]+$'),
  telegram_chat_id text NOT NULL CHECK (telegram_chat_id ~ '^-?[0-9]+$'),
  address text NOT NULL CHECK (
    address = btrim(address) AND address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
  ),
  new_transactions boolean NOT NULL DEFAULT true,
  risk_change boolean NOT NULL DEFAULT true,
  large_transfers boolean NOT NULL DEFAULT true,
  program_interactions boolean NOT NULL DEFAULT true,
  last_signature text,
  risk_level text CHECK (risk_level IS NULL OR risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
  last_risk_checked_at timestamptz,
  next_check_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telegram_alert_subscriptions_user_address_unique
    UNIQUE (telegram_user_id, address)
);

CREATE INDEX IF NOT EXISTS telegram_alert_subscriptions_due_idx
  ON public.telegram_alert_subscriptions (next_check_at, created_at);

ALTER TABLE public.telegram_alert_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.telegram_alert_subscriptions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.telegram_alert_subscriptions TO service_role;

COMMIT;
