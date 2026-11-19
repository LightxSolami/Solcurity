BEGIN;

CREATE TABLE IF NOT EXISTS public.intelligence_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug = lower(btrim(slug)) AND slug <> ''),
  name text NOT NULL CHECK (btrim(name) <> ''),
  source_type text NOT NULL CHECK (source_type IN ('manual', 'provider')),
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  terms_url text CHECK (terms_url IS NULL OR terms_url ~ '^https://'),
  license_basis text NOT NULL CHECK (btrim(license_basis) <> ''),
  authorization_status text NOT NULL DEFAULT 'not_reviewed'
    CHECK (authorization_status IN ('not_reviewed', 'approved', 'rejected', 'revoked')),
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intelligence_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL CHECK (network IN ('solana-mainnet', 'solana-devnet', 'solana-testnet')),
  entity_type text NOT NULL CHECK (
    entity_type IN ('wallet', 'token_mint', 'program', 'transaction_signature', 'funding_relationship')
  ),
  identifier text NOT NULL CHECK (identifier = btrim(identifier) AND identifier <> ''),
  category text NOT NULL CHECK (
    category IN (
      'malicious_wallet', 'scam_token', 'malicious_program', 'drainer',
      'phishing', 'suspicious_funding', 'sanctions_exposure', 'other'
    )
  ),
  evidence jsonb NOT NULL CHECK (
    jsonb_typeof(evidence) = 'array' AND jsonb_array_length(evidence) > 0
  ),
  source_id uuid NOT NULL REFERENCES public.intelligence_sources(id) ON DELETE RESTRICT,
  confidence text NOT NULL CHECK (confidence IN ('LOW', 'MEDIUM', 'HIGH')),
  status text NOT NULL CHECK (status IN ('confirmed', 'suspected', 'disputed', 'revoked')),
  first_observed_at timestamptz NOT NULL,
  last_verified_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  explanation text NOT NULL CHECK (btrim(explanation) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT intelligence_records_observation_order
    CHECK (first_observed_at <= last_verified_at),
  CONSTRAINT intelligence_records_expiration_order
    CHECK (first_observed_at < expires_at),
  CONSTRAINT intelligence_records_fresh_until_expiry
    CHECK (last_verified_at < expires_at)
);

CREATE INDEX IF NOT EXISTS intelligence_records_screening_idx
  ON public.intelligence_records (network, entity_type, identifier, expires_at);
CREATE INDEX IF NOT EXISTS intelligence_records_source_history_idx
  ON public.intelligence_records (network, entity_type, identifier, category, source_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS intelligence_records_status_expiration_idx
  ON public.intelligence_records (status, expires_at, last_verified_at);

CREATE TABLE IF NOT EXISTS public.community_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL CHECK (network IN ('solana-mainnet', 'solana-devnet', 'solana-testnet')),
  entity_type text NOT NULL CHECK (
    entity_type IN ('wallet', 'token_mint', 'program', 'transaction_signature')
  ),
  identifier text NOT NULL CHECK (identifier = btrim(identifier) AND identifier <> ''),
  category text NOT NULL CHECK (
    category IN (
      'malicious_wallet', 'scam_token', 'malicious_program', 'drainer',
      'phishing', 'suspicious_funding', 'other'
    )
  ),
  evidence_kind text NOT NULL CHECK (evidence_kind IN ('url', 'transaction_signature')),
  evidence_value text NOT NULL CHECK (btrim(evidence_value) <> ''),
  explanation text NOT NULL CHECK (char_length(btrim(explanation)) BETWEEN 20 AND 4000),
  dedupe_hash text NOT NULL UNIQUE
    CHECK (char_length(dedupe_hash) = 64 AND dedupe_hash ~ '^[0-9a-f]{64}$'),
  moderation_status text NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'duplicate')),
  reviewed_at timestamptz,
  created_record_id uuid REFERENCES public.intelligence_records(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_submission_review_state
    CHECK ((moderation_status = 'pending' AND reviewed_at IS NULL) OR moderation_status <> 'pending')
);

CREATE INDEX IF NOT EXISTS community_submissions_review_queue_idx
  ON public.community_submissions (moderation_status, created_at);
CREATE INDEX IF NOT EXISTS community_submissions_entity_idx
  ON public.community_submissions (network, entity_type, identifier);

CREATE TABLE IF NOT EXISTS public.funding_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL CHECK (network IN ('solana-mainnet', 'solana-devnet', 'solana-testnet')),
  from_address text NOT NULL CHECK (from_address = btrim(from_address) AND from_address <> ''),
  to_address text NOT NULL CHECK (to_address = btrim(to_address) AND to_address <> ''),
  transaction_signature text NOT NULL CHECK (btrim(transaction_signature) <> ''),
  category text NOT NULL DEFAULT 'suspicious_funding'
    CHECK (category = 'suspicious_funding'),
  evidence jsonb NOT NULL CHECK (
    jsonb_typeof(evidence) = 'array' AND jsonb_array_length(evidence) > 0
  ),
  source_id uuid NOT NULL REFERENCES public.intelligence_sources(id) ON DELETE RESTRICT,
  confidence text NOT NULL CHECK (confidence IN ('LOW', 'MEDIUM', 'HIGH')),
  status text NOT NULL CHECK (status IN ('confirmed', 'suspected', 'disputed', 'revoked')),
  first_observed_at timestamptz NOT NULL,
  last_verified_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  explanation text NOT NULL CHECK (btrim(explanation) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT funding_relationship_distinct_addresses CHECK (from_address <> to_address),
  CONSTRAINT funding_relationship_observation_order CHECK (first_observed_at <= last_verified_at),
  CONSTRAINT funding_relationship_expiration_order CHECK (first_observed_at < expires_at),
  CONSTRAINT funding_relationship_fresh_until_expiry CHECK (last_verified_at < expires_at),
  CONSTRAINT funding_relationship_transaction_unique
    UNIQUE (network, transaction_signature, from_address, to_address)
);

CREATE INDEX IF NOT EXISTS funding_relationships_source_idx
  ON public.funding_relationships (network, from_address, to_address, expires_at);

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.community_submissions(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (
    action IN ('approved', 'rejected', 'marked_duplicate', 'requested_changes', 'reopened')
  ),
  actor_id text NOT NULL CHECK (btrim(actor_id) <> ''),
  notes text NOT NULL DEFAULT '',
  created_record_id uuid REFERENCES public.intelligence_records(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_actions_submission_idx
  ON public.moderation_actions (submission_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.source_health (
  source_id uuid PRIMARY KEY REFERENCES public.intelligence_sources(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'unavailable', 'disabled')),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_record_at timestamptz,
  records_seen integer NOT NULL DEFAULT 0 CHECK (records_seen >= 0),
  detail text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.threat_intel_submission_rate_limits (
  key_hash text PRIMARY KEY
    CHECK (char_length(key_hash) = 64 AND key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0)
);

CREATE INDEX IF NOT EXISTS threat_intel_rate_limit_window_idx
  ON public.threat_intel_submission_rate_limits (window_started_at);

CREATE OR REPLACE FUNCTION public.threat_intel_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'intelligence_sources',
    'intelligence_records',
    'community_submissions',
    'funding_relationships',
    'source_health'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON public.%I',
      table_name || '_set_updated_at',
      table_name
    );
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.threat_intel_set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_threat_intel_submission_slot(
  p_key_hash text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_count integer;
BEGIN
  IF p_key_hash IS NULL
    OR p_key_hash !~ '^[0-9a-f]{64}$'
    OR p_max_requests IS NULL
    OR p_max_requests < 1
    OR p_window_seconds IS NULL
    OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate-limit parameters';
  END IF;

  DELETE FROM public.threat_intel_submission_rate_limits
  WHERE window_started_at <= now() - make_interval(secs => p_window_seconds * 2);

  INSERT INTO public.threat_intel_submission_rate_limits AS existing (
    key_hash, window_started_at, request_count
  )
  VALUES (p_key_hash, now(), 1)
  ON CONFLICT (key_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN existing.window_started_at <= now() - make_interval(secs => p_window_seconds)
        THEN now()
      ELSE existing.window_started_at
    END,
    request_count = CASE
      WHEN existing.window_started_at <= now() - make_interval(secs => p_window_seconds)
        THEN 1
      ELSE existing.request_count + 1
    END
  RETURNING request_count INTO new_count;

  RETURN new_count <= p_max_requests;
END;
$$;

CREATE OR REPLACE FUNCTION public.screen_threat_intel_targets(p_targets jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  matched_records jsonb;
BEGIN
  IF p_targets IS NULL OR jsonb_typeof(p_targets) <> 'array' THEN
    RAISE EXCEPTION 'Targets must be a JSON array';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', intel_record.id,
        'network', intel_record.network,
        'entity_type', intel_record.entity_type,
        'identifier', intel_record.identifier,
        'category', intel_record.category,
        'evidence', intel_record.evidence,
        'source_id', intel_record.source_id,
        'confidence', intel_record.confidence,
        'status', intel_record.status,
        'first_observed_at', intel_record.first_observed_at,
        'last_verified_at', intel_record.last_verified_at,
        'expires_at', intel_record.expires_at,
        'explanation', intel_record.explanation,
        'updated_at', intel_record.updated_at,
        'source', jsonb_build_object(
          'id', intel_source.id,
          'name', intel_source.name,
          'source_url', intel_source.source_url,
          'authorization_status', intel_source.authorization_status,
          'enabled', intel_source.enabled
        )
      )
      ORDER BY intel_record.updated_at DESC
    ),
    '[]'::jsonb
  )
  INTO matched_records
  FROM public.intelligence_records AS intel_record
  JOIN public.intelligence_sources AS intel_source ON intel_source.id = intel_record.source_id
  WHERE intel_source.authorization_status = 'approved'
    AND intel_source.enabled = true
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_targets) AS targets(target)
      WHERE target->>'network' = intel_record.network
        AND target->>'entityType' = intel_record.entity_type
        AND target->>'identifier' = intel_record.identifier
    );

  RETURN matched_records;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_threat_intel_submission(
  p_submission_id uuid,
  p_action text,
  p_actor_id text,
  p_notes text,
  p_source_id uuid DEFAULT NULL,
  p_record_status text DEFAULT NULL,
  p_confidence text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  submission public.community_submissions%ROWTYPE;
  resulting_record_id uuid := NULL;
BEGIN
  IF p_action IS NULL
    OR p_action NOT IN ('approved', 'rejected', 'marked_duplicate')
    OR p_actor_id IS NULL
    OR btrim(p_actor_id) = ''
    OR p_notes IS NULL
    OR btrim(p_notes) = ''
    OR char_length(p_notes) > 4000 THEN
    RAISE EXCEPTION 'Invalid moderation action';
  END IF;

  SELECT * INTO submission
  FROM public.community_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND OR submission.moderation_status <> 'pending' THEN
    RAISE EXCEPTION 'Submission not found or no longer pending';
  END IF;

  IF p_action = 'approved' THEN
    IF p_source_id IS NULL
      OR p_record_status IS NULL
      OR p_record_status NOT IN ('confirmed', 'suspected')
      OR p_confidence IS NULL
      OR p_confidence NOT IN ('LOW', 'MEDIUM', 'HIGH')
      OR p_expires_at IS NULL
      OR p_expires_at <= now()
      OR p_expires_at > now() + interval '90 days' THEN
      RAISE EXCEPTION 'Approval requires a valid source, status, confidence and expiry';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.intelligence_sources
      WHERE id = p_source_id
        AND authorization_status = 'approved'
        AND enabled = true
    ) THEN
      RAISE EXCEPTION 'The selected intelligence source is not approved and enabled';
    END IF;

    INSERT INTO public.intelligence_records (
      network, entity_type, identifier, category, evidence, source_id,
      confidence, status, first_observed_at, last_verified_at, expires_at,
      explanation
    )
    VALUES (
      submission.network,
      submission.entity_type,
      submission.identifier,
      submission.category,
      jsonb_build_array(jsonb_build_object(
        'kind', submission.evidence_kind,
        'value', submission.evidence_value
      )),
      p_source_id,
      p_confidence,
      p_record_status,
      LEAST(submission.created_at, now()),
      now(),
      p_expires_at,
      'Moderator assessment: ' || btrim(p_notes) ||
        E'\nReporter context: ' || submission.explanation
    )
    RETURNING id INTO resulting_record_id;

    UPDATE public.community_submissions
    SET moderation_status = 'approved',
        reviewed_at = now(),
        created_record_id = resulting_record_id
    WHERE id = p_submission_id;
  ELSE
    UPDATE public.community_submissions
    SET moderation_status = CASE
          WHEN p_action = 'rejected' THEN 'rejected'
          ELSE 'duplicate'
        END,
        reviewed_at = now()
    WHERE id = p_submission_id;
  END IF;

  INSERT INTO public.moderation_actions (
    submission_id, action, actor_id, notes, created_record_id
  )
  VALUES (
    p_submission_id, p_action, p_actor_id, btrim(p_notes), resulting_record_id
  );

  RETURN resulting_record_id;
END;
$$;

ALTER TABLE public.intelligence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_intel_submission_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.intelligence_sources FROM anon, authenticated;
REVOKE ALL ON public.intelligence_records FROM anon, authenticated;
REVOKE ALL ON public.community_submissions FROM anon, authenticated;
REVOKE ALL ON public.funding_relationships FROM anon, authenticated;
REVOKE ALL ON public.moderation_actions FROM anon, authenticated;
REVOKE ALL ON public.source_health FROM anon, authenticated;
REVOKE ALL ON public.threat_intel_submission_rate_limits FROM anon, authenticated;
GRANT ALL ON public.intelligence_sources TO service_role;
GRANT ALL ON public.intelligence_records TO service_role;
GRANT ALL ON public.community_submissions TO service_role;
GRANT ALL ON public.funding_relationships TO service_role;
GRANT ALL ON public.moderation_actions TO service_role;
GRANT ALL ON public.source_health TO service_role;
GRANT ALL ON public.threat_intel_submission_rate_limits TO service_role;

REVOKE ALL ON FUNCTION public.reserve_threat_intel_submission_slot(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_threat_intel_submission_slot(text, integer, integer)
  TO service_role;
REVOKE ALL ON FUNCTION public.screen_threat_intel_targets(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.screen_threat_intel_targets(jsonb)
  TO service_role;
REVOKE ALL ON FUNCTION public.moderate_threat_intel_submission(
  uuid, text, text, text, uuid, text, text, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_threat_intel_submission(
  uuid, text, text, text, uuid, text, text, timestamptz
) TO service_role;

COMMIT;
