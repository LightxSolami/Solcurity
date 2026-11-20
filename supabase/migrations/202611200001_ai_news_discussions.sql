BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_news_discussions (
  id text PRIMARY KEY CHECK (id <> ''),
  session_data text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_news_discussions_created_at_idx
  ON public.ai_news_discussions (created_at DESC);

ALTER TABLE public.ai_news_discussions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_news_discussions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_news_discussions TO service_role;

COMMIT;
