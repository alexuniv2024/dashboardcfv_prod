-- ============================================================
-- SISTEMA DE GESTIÓN Y DASHBOARD CFV
-- Script de creación de base de datos (PostgreSQL)
-- Autor: Neisbel Avendaño - UNETI
-- ============================================================
-- INSTRUCCIONES:
-- 1) Crear la base de datos (como superusuario):
--    CREATE DATABASE dashboard_cfv;
-- 2) Conectarse a dashboard_cfv y ejecutar este script completo.
-- ============================================================

-- ============================================================
-- 1. USUARIOS (cuentas de acceso al sistema)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    nombre        VARCHAR(100) NOT NULL,
    rol           VARCHAR(20)  NOT NULL DEFAULT 'CONSULTOR',
    creado_en     TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_usuarios_rol CHECK (rol IN ('ADMIN', 'GERENTE', 'CONSULTOR'))
);

-- ============================================================
-- 2. AUDITORÍA (trazabilidad de acciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS auditoria_logs (
    id         SERIAL PRIMARY KEY,
    usuario_id INTEGER     NOT NULL,
    accion     VARCHAR(50) NOT NULL,
    detalle    TEXT,
    creado_en  TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE
);

-- ============================================================
-- 3. SNAPSHOT DE STOCK (copia sincronizada desde Profit)
--    producto_id = código co_art del ERP (clave natural)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_snapshot (
    producto_id    VARCHAR(30)   PRIMARY KEY,
    descripcion    VARCHAR(120),
    stock_actual   DECIMAL(18,2) NOT NULL DEFAULT 0,
    actualizado_en TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. CONFIGURACIÓN DE STOCK CRÍTICO (monitoreo por umbral)
-- ============================================================
CREATE TABLE IF NOT EXISTS config_stock (
    id              SERIAL PRIMARY KEY,
    producto_id     VARCHAR(30)   NOT NULL,
    nombre_producto VARCHAR(120),
    umbral_minimo   DECIMAL(18,2) NOT NULL DEFAULT 0,
    activo          BOOLEAN       NOT NULL DEFAULT TRUE,
    usuario_id      INTEGER       NOT NULL,
    CONSTRAINT fk_config_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_config_stock_activo ON config_stock (activo);

-- ============================================================
-- 5. NOTIFICACIONES (campana de alertas internas)
-- ============================================================
CREATE TABLE IF NOT EXISTS notificaciones (
    id         SERIAL PRIMARY KEY,
    usuario_id INTEGER,
    producto_id VARCHAR(30),                      -- NULL en alertas de reportes
    tipo       VARCHAR(50)  NOT NULL,             -- STOCK_BAJO / REPORTE_CXP / REPORTE_MENSUAL
    mensaje    TEXT         NOT NULL,
    estado     VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    creado_en  TIMESTAMP    NOT NULL DEFAULT NOW(),
    visto_en   TIMESTAMP,
    CONSTRAINT fk_notificaciones_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notificaciones_estado ON notificaciones (usuario_id, estado);

-- ============================================================
-- 6. HISTORIAL DE REPORTES DE CUENTAS POR PAGAR
-- ============================================================
CREATE TABLE IF NOT EXISTS reportes_cxp (
    id                   SERIAL PRIMARY KEY,
    usuario_id           INTEGER       NOT NULL,
    fecha_generacion     TIMESTAMP     NOT NULL DEFAULT NOW(),
    total_cuentas        INTEGER       NOT NULL,
    monto_total_usd      DECIMAL(18,2) NOT NULL,
    cuentas_vencidas     INTEGER       NOT NULL,
    monto_vencido_usd    DECIMAL(18,2) NOT NULL,
    cuentas_por_vencer   INTEGER       NOT NULL,
    monto_por_vencer_usd DECIMAL(18,2) NOT NULL,
    CONSTRAINT fk_reportes_cxp_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE
);

-- ============================================================
-- 7. HISTORIAL DE REPORTES MENSUALES DE VENTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS reportes_mensuales (
    id                        SERIAL PRIMARY KEY,
    usuario_id                INTEGER       NOT NULL,
    fecha_generacion          TIMESTAMP     NOT NULL DEFAULT NOW(),
    anio                      INTEGER       NOT NULL,
    mes                       INTEGER       NOT NULL,
    ventas_totales_usd        DECIMAL(18,2) NOT NULL,
    total_facturas            INTEGER       NOT NULL,
    total_articulos           DECIMAL(18,2) NOT NULL,   -- DECIMAL: cantidades fraccionadas
    variacion_vs_mes_anterior DECIMAL(10,2),
    CONSTRAINT fk_reportes_mensuales_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE,
    CONSTRAINT chk_reportes_mes CHECK (mes BETWEEN 1 AND 12)
);
CREATE INDEX IF NOT EXISTS idx_reportes_mensuales_periodo ON reportes_mensuales (anio, mes);

-- ============================================================
-- 8. FILTROS DE EXCLUSIÓN DEL INVENTARIO
-- ============================================================
CREATE TABLE IF NOT EXISTS filtro_marcas (
    id    SERIAL PRIMARY KEY,
    valor VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS filtro_lineas (
    id    SERIAL PRIMARY KEY,
    valor VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS filtro_sub_lineas (
    id    SERIAL PRIMARY KEY,
    valor VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS filtro_proveedores (
    id    SERIAL PRIMARY KEY,
    valor VARCHAR(60) NOT NULL UNIQUE
);

-- ============================================================
-- USUARIO INICIAL (seed)
-- Generar el hash con:
--   node -e "console.log(require('bcryptjs').hashSync('Admin123!', 10))"
-- y pegar el resultado entre comillas en password_hash.
-- ============================================================
INSERT INTO usuarios (email, password_hash, nombre, rol)
VALUES ('admin@dashboard.com', '<PEGAR_AQUI_EL_HASH_BCRYPT>', 'Administrador', 'ADMIN')
ON CONFLICT (email) DO NOTHING;