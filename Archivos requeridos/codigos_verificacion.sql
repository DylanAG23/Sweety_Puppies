CREATE TABLE IF NOT EXISTS public.codigos_verificacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email character varying NOT NULL,
  codigo character varying NOT NULL,
  tipo character varying NOT NULL CHECK (tipo IN ('registro', 'recuperacion')),
  payload jsonb,
  expiracion timestamp with time zone NOT NULL,
  usado boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_codigos_verificacion_email_tipo
  ON public.codigos_verificacion (lower(email), tipo, usado);

CREATE INDEX IF NOT EXISTS idx_codigos_verificacion_expiracion
  ON public.codigos_verificacion (expiracion);
