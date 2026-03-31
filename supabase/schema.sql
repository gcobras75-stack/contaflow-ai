-- ============================================================
-- ContaFlow AI — Schema inicial
-- ============================================================

-- TABLA 1: Despachos contables
CREATE TABLE despachos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  rfc TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefono TEXT,
  plan TEXT DEFAULT 'basico',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA 2: Empresas clientes
CREATE TABLE empresas_clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  rfc TEXT UNIQUE NOT NULL,
  giro TEXT,
  email TEXT,
  despacho_id UUID REFERENCES despachos(id),
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA 3: Usuarios
CREATE TABLE usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('contador','empresa')),
  despacho_id UUID REFERENCES despachos(id),
  empresa_id UUID REFERENCES empresas_clientes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA 4: CFDIs
CREATE TABLE cfdis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas_clientes(id),
  uuid_sat TEXT UNIQUE,
  tipo TEXT CHECK (tipo IN ('ingreso','egreso','nomina','traslado')),
  subtotal NUMERIC(12,2),
  iva NUMERIC(12,2),
  total NUMERIC(12,2),
  fecha_emision DATE,
  xml_url TEXT,
  status TEXT DEFAULT 'pendiente'
    CHECK (status IN ('pendiente','aprobado','rechazado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA 5: Estados de cuenta bancarios
CREATE TABLE estados_cuenta (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas_clientes(id),
  banco TEXT,
  periodo TEXT,
  archivo_url TEXT,
  status TEXT DEFAULT 'pendiente'
    CHECK (status IN ('pendiente','procesado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA 6: Pagos de suscripción
CREATE TABLE pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  despacho_id UUID REFERENCES despachos(id),
  monto NUMERIC(10,2),
  metodo TEXT,
  referencia_mp TEXT,
  status TEXT DEFAULT 'pendiente'
    CHECK (status IN ('pendiente','completado','fallido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA 7: Notificaciones
CREATE TABLE notificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id),
  tipo TEXT,
  mensaje TEXT,
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA 8: Patrones por giro
CREATE TABLE patrones_giro (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  giro TEXT NOT NULL,
  descripcion_sat TEXT,
  cuenta_contable TEXT,
  tipo_deduccion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
