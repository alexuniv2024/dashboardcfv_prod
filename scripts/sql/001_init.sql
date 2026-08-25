BEGIN;

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('ADMIN', 'GERENTE', 'CONSULTOR')),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLA: config_stock
-- ============================================
CREATE TABLE IF NOT EXISTS config_stock (
    id SERIAL PRIMARY KEY,
    producto_id VARCHAR(30) NOT NULL UNIQUE,
    umbral_minimo INTEGER NOT NULL DEFAULT 0,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLA: notificaciones
-- ============================================
CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    producto_id VARCHAR(30) NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'STOCK_BAJO',
    mensaje TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'VISTA', 'RESUELTA')),
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    visto_en TIMESTAMP NULL,
    usuario_id INTEGER NULL,
    CONSTRAINT fk_notificaciones_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
);

-- ============================================
-- TABLA: auditoria_logs
-- ============================================
CREATE TABLE IF NOT EXISTS auditoria_logs (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NULL,
    accion VARCHAR(100) NOT NULL,
    descripcion TEXT NULL,
    ip_origen VARCHAR(45) NULL,
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL
);

-- ============================================
-- INDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notificaciones_producto_id
ON notificaciones(producto_id);

CREATE INDEX IF NOT EXISTS idx_notificaciones_estado
ON notificaciones(estado);

CREATE INDEX IF NOT EXISTS idx_notificaciones_creado_en
ON notificaciones(creado_en);

CREATE INDEX IF NOT EXISTS idx_auditoria_logs_usuario_id
ON auditoria_logs(usuario_id);

CREATE INDEX IF NOT EXISTS idx_auditoria_logs_fecha
ON auditoria_logs(fecha);

CREATE INDEX IF NOT EXISTS idx_auditoria_logs_accion
ON auditoria_logs(accion);

-- ============================================
-- FUNCION PARA ACTUALIZAR actualizado_en
-- ============================================
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS trg_usuarios_actualizado_en ON usuarios;
CREATE TRIGGER trg_usuarios_actualizado_en
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION set_actualizado_en();

DROP TRIGGER IF EXISTS trg_config_stock_actualizado_en ON config_stock;
CREATE TRIGGER trg_config_stock_actualizado_en
BEFORE UPDATE ON config_stock
FOR EACH ROW
EXECUTE FUNCTION set_actualizado_en();

COMMIT;