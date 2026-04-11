-- ============================================================
-- Migración 006 — Chat persistente con historial y rate limit
-- ============================================================
-- Tabla chat_messages: historial de conversaciones contador/cliente con Claude.
-- Una fila por mensaje (rol user o assistant). Append-only desde UI;
-- el botón "limpiar historial" hace DELETE (no soft-delete — es un chat,
-- no un registro legal).
--
-- RLS: cada usuario ve/borra solo sus propios mensajes.
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  despacho_id     UUID REFERENCES despachos(id)         ON DELETE SET NULL,
  empresa_id      UUID REFERENCES empresas_clientes(id) ON DELETE SET NULL,
  rol_chat        TEXT NOT NULL CHECK (rol_chat IN ('contador','cliente')),
  role            TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content         TEXT NOT NULL,
  tokens_input    INTEGER,
  tokens_output   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_user_created
  ON chat_messages(user_id, rol_chat, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_msg_user_empresa_created
  ON chat_messages(user_id, empresa_id, created_at DESC)
  WHERE empresa_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_msg_rate_limit
  ON chat_messages(user_id, created_at)
  WHERE role = 'user';

COMMENT ON TABLE chat_messages IS 'Historial de mensajes de chat con IA. rol_chat distingue entre chat-contador (CPC Ricardo) y chat-cliente (Asesor ContaFlow). role distingue user/assistant.';
COMMENT ON COLUMN chat_messages.rol_chat      IS 'Qué persona del chat: contador (CPC Ricardo Morales) o cliente (Asesor ContaFlow).';
COMMENT ON COLUMN chat_messages.tokens_input  IS 'Tokens de input consumidos por el request a Claude (solo en rows role=assistant).';
COMMENT ON COLUMN chat_messages.tokens_output IS 'Tokens de output generados por Claude (solo en rows role=assistant).';

-- ── Función de rate limit ────────────────────────────────────
CREATE OR REPLACE FUNCTION chat_msgs_count_window(
  p_user_id UUID,
  p_minutes INT DEFAULT 60
)
  RETURNS INT
  LANGUAGE SQL
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM chat_messages
  WHERE user_id = p_user_id
    AND role = 'user'
    AND created_at > NOW() - (p_minutes || ' minutes')::INTERVAL;
$$;

REVOKE EXECUTE ON FUNCTION chat_msgs_count_window(UUID, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION chat_msgs_count_window(UUID, INT) TO authenticated, service_role;

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='chat_messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON chat_messages', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "service_role_all" ON chat_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "admin_all" ON chat_messages
  FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "self_chat_select" ON chat_messages
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "self_chat_delete" ON chat_messages
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Nota: inserts solo vía service_role (API routes). Los usuarios
-- no pueden insertar directamente desde el cliente (garantiza
-- que cada mensaje va por el flujo del endpoint con rate limit).
