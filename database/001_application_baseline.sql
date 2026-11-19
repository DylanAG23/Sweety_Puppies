-- Baseline de la aplicación, fuente: respaldo pg_dumpall del 29/10/2026.
-- SHA-256 del respaldo: d136a2ff9ed64728fc13685f7b2053506667d0e8d5231e9a0a376c1ec953ef7b
-- SOLO esquema; NO restaura datos ni Storage. SOLO para una base nueva.
BEGIN;
SET LOCAL search_path = public, pg_catalog;
DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('administradores','bloqueos_agenda','carrito_items','carritos','categorias','cita_servicios_adicionales','citas','clientes','codigos_verificacion','detalle_orden','historial_citas','horarios_negocio','imagenes','inventario','mascotas','movimientos_inventario','ordenes','producto_imagenes','productos','servicios','servicios_adicionales','tarifas_servicio','tarifas_servicio_adicional','usuarios')) THEN
    RAISE EXCEPTION 'Baseline cancelado: ya existen objetos de la aplicación. Use check; no sobrescriba la base.';
  END IF;
END
$guard$;

-- TYPE: comportamiento_enum
CREATE TYPE public.comportamiento_enum AS ENUM (
    'normal',
    'sensible',
    'agresivo'
);

-- TYPE: dia_semana_enum
CREATE TYPE public.dia_semana_enum AS ENUM (
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado',
    'domingo'
);

-- TYPE: estado_cita_enum
CREATE TYPE public.estado_cita_enum AS ENUM (
    'pendiente',
    'confirmada',
    'en_atencion',
    'completada',
    'cancelada',
    'reprogramada'
);

-- TYPE: estado_orden_enum
CREATE TYPE public.estado_orden_enum AS ENUM (
    'en_espera_pago',
    'pagado',
    'pendiente_recoger',
    'entregado',
    'cancelado'
);

-- TYPE: estado_pelaje_enum
CREATE TYPE public.estado_pelaje_enum AS ENUM (
    'normal',
    'con_nudos',
    'muy_enredado'
);

-- TYPE: metodo_pago_enum
CREATE TYPE public.metodo_pago_enum AS ENUM (
    'tarjeta',
    'nequi',
    'efectivo'
);

-- TYPE: rol_usuario_enum
CREATE TYPE public.rol_usuario_enum AS ENUM (
    'cliente',
    'administrador'
);

-- TYPE: sexo_mascota_enum
CREATE TYPE public.sexo_mascota_enum AS ENUM (
    'macho',
    'hembra'
);

-- TYPE: tamano_mascota_enum
CREATE TYPE public.tamano_mascota_enum AS ENUM (
    'miniatura',
    'pequeno',
    'mediano',
    'grande',
    'extra_grande'
);

-- TYPE: tipo_movimiento_enum
CREATE TYPE public.tipo_movimiento_enum AS ENUM (
    'entrada',
    'salida',
    'ajuste'
);

-- TYPE: tipo_pelaje_enum
CREATE TYPE public.tipo_pelaje_enum AS ENUM (
    'corto',
    'largo'
);

-- FUNCTION: actualizar_fecha_actualizacion()
CREATE FUNCTION public.actualizar_fecha_actualizacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- FUNCTION: bloquear_cambios_movimientos()
CREATE FUNCTION public.bloquear_cambios_movimientos() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Los movimientos de inventario no se pueden editar ni eliminar';
END;
$$;

-- FUNCTION: set_updated_at()
CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- TABLE: administradores
CREATE TABLE public.administradores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    username character varying(50) NOT NULL,
    nombre character varying(100),
    apellido character varying(100),
    telefono character varying(20) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- TABLE: bloqueos_agenda
CREATE TABLE public.bloqueos_agenda (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    administrador_id uuid,
    fecha date NOT NULL,
    hora_inicio time without time zone,
    hora_fin time without time zone,
    motivo character varying(255),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bloqueos_agenda_check CHECK ((((hora_inicio IS NULL) AND (hora_fin IS NULL)) OR ((hora_inicio IS NOT NULL) AND (hora_fin IS NOT NULL) AND (hora_fin > hora_inicio))))
);

-- TABLE: carrito_items
CREATE TABLE public.carrito_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    carrito_id uuid NOT NULL,
    producto_id uuid NOT NULL,
    cantidad integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT carrito_items_cantidad_check CHECK ((cantidad > 0))
);

-- TABLE: carritos
CREATE TABLE public.carritos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- TABLE: categorias
CREATE TABLE public.categorias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    orden integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- TABLE: cita_servicios_adicionales
CREATE TABLE public.cita_servicios_adicionales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cita_id uuid NOT NULL,
    servicio_adicional_id uuid NOT NULL,
    precio_aplicado integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cita_servicios_adicionales_precio_aplicado_check CHECK ((precio_aplicado >= 0))
);

-- TABLE: citas
CREATE TABLE public.citas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    mascota_id uuid NOT NULL,
    servicio_id uuid NOT NULL,
    administrador_id uuid,
    fecha date NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin_estimada time without time zone NOT NULL,
    estado public.estado_cita_enum DEFAULT 'pendiente'::public.estado_cita_enum NOT NULL,
    estado_pelaje_reportado public.estado_pelaje_enum DEFAULT 'normal'::public.estado_pelaje_enum NOT NULL,
    comportamiento_reportado public.comportamiento_enum DEFAULT 'normal'::public.comportamiento_enum NOT NULL,
    foto_estado_actual_url text,
    observaciones_cliente text,
    estado_pelaje_real public.estado_pelaje_enum,
    comportamiento_observado public.comportamiento_enum,
    observaciones_admin text,
    precio_base integer DEFAULT 0 NOT NULL,
    precio_calculado integer DEFAULT 0 NOT NULL,
    precio_final integer,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT citas_check CHECK ((hora_fin_estimada > hora_inicio)),
    CONSTRAINT citas_precio_base_check CHECK ((precio_base >= 0)),
    CONSTRAINT citas_precio_calculado_check CHECK ((precio_calculado >= 0)),
    CONSTRAINT citas_precio_final_check CHECK (((precio_final IS NULL) OR (precio_final >= 0)))
);

-- TABLE: clientes
CREATE TABLE public.clientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    cedula character varying(20) NOT NULL,
    telefono character varying(20) NOT NULL,
    telefono_secundario character varying(20),
    direccion character varying(255),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- TABLE: codigos_verificacion
CREATE TABLE public.codigos_verificacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying NOT NULL,
    codigo character varying NOT NULL,
    tipo character varying NOT NULL,
    payload jsonb,
    expiracion timestamp with time zone NOT NULL,
    usado boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT codigos_verificacion_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['registro'::character varying, 'recuperacion'::character varying])::text[])))
);

-- TABLE: detalle_orden
CREATE TABLE public.detalle_orden (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    orden_id uuid NOT NULL,
    producto_id uuid NOT NULL,
    producto_nombre character varying(150) NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario integer NOT NULL,
    subtotal integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_detalle_orden_subtotal CHECK ((subtotal = (cantidad * precio_unitario))),
    CONSTRAINT detalle_orden_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT detalle_orden_precio_unitario_check CHECK ((precio_unitario > 0)),
    CONSTRAINT detalle_orden_subtotal_check CHECK ((subtotal > 0))
);

-- TABLE: historial_citas
CREATE TABLE public.historial_citas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cita_id uuid NOT NULL,
    cliente_id uuid NOT NULL,
    mascota_id uuid NOT NULL,
    fecha_servicio timestamp with time zone DEFAULT now() NOT NULL,
    cliente_nombre_completo character varying(250) NOT NULL,
    cliente_cedula character varying(20) NOT NULL,
    cliente_email character varying(150) NOT NULL,
    cliente_telefono character varying(20) NOT NULL,
    mascota_nombre character varying(100) NOT NULL,
    mascota_raza character varying(100),
    mascota_tamano public.tamano_mascota_enum NOT NULL,
    mascota_tipo_pelaje public.tipo_pelaje_enum NOT NULL,
    servicio_principal_nombre character varying(150) NOT NULL,
    servicios_adicionales_resumen text,
    resumen_servicio_realizado text,
    estado_pelaje_real public.estado_pelaje_enum,
    comportamiento_observado public.comportamiento_enum,
    observaciones_finales text,
    recomendaciones text,
    precio_base integer NOT NULL,
    precio_calculado integer NOT NULL,
    precio_final integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT historial_servicios_precio_base_check CHECK ((precio_base >= 0)),
    CONSTRAINT historial_servicios_precio_calculado_check CHECK ((precio_calculado >= 0)),
    CONSTRAINT historial_servicios_precio_final_check CHECK ((precio_final >= 0))
);

-- TABLE: horarios_negocio
CREATE TABLE public.horarios_negocio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dia public.dia_semana_enum NOT NULL,
    hora_apertura time without time zone,
    hora_cierre time without time zone,
    ultima_cita time without time zone,
    duracion_base_minutos integer DEFAULT 150 NOT NULL,
    abierto boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT horarios_negocio_duracion_base_minutos_check CHECK ((duracion_base_minutos > 0))
);

-- TABLE: imagenes
CREATE TABLE public.imagenes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo character varying(150) NOT NULL,
    descripcion text,
    ruta text NOT NULL,
    categoria character varying(100) DEFAULT 'carrusel'::character varying NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- TABLE: inventario
CREATE TABLE public.inventario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    producto_id uuid NOT NULL,
    stock_actual integer DEFAULT 0 NOT NULL,
    stock_minimo integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventario_stock_actual_check CHECK ((stock_actual >= 0)),
    CONSTRAINT inventario_stock_minimo_check CHECK ((stock_minimo >= 0))
);

-- TABLE: mascotas
CREATE TABLE public.mascotas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    nombre character varying(100) NOT NULL,
    raza character varying(100),
    tamano public.tamano_mascota_enum NOT NULL,
    sexo public.sexo_mascota_enum,
    edad integer NOT NULL,
    tipo_pelaje public.tipo_pelaje_enum NOT NULL,
    comportamiento_habitual public.comportamiento_enum DEFAULT 'normal'::public.comportamiento_enum NOT NULL,
    alergias text,
    enfermedades text,
    cosas_no_le_gustan text,
    fecha_ultimo_bano date,
    vacunacion_al_dia boolean DEFAULT false NOT NULL,
    desparasitacion_interna_al_dia boolean DEFAULT false NOT NULL,
    desparasitacion_externa_al_dia boolean DEFAULT false NOT NULL,
    foto_mascota_url text,
    foto_carnet_vacunacion_url text,
    observaciones text,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mascotas_edad_check CHECK ((edad >= 0))
);

-- TABLE: movimientos_inventario
CREATE TABLE public.movimientos_inventario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    producto_id uuid NOT NULL,
    orden_id uuid,
    usuario_id uuid,
    tipo_movimiento public.tipo_movimiento_enum NOT NULL,
    cantidad integer NOT NULL,
    stock_anterior integer NOT NULL,
    stock_resultante integer NOT NULL,
    motivo character varying(100) NOT NULL,
    observacion text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_movimientos_cantidad CHECK (((cantidad <> 0) AND ((tipo_movimiento <> 'entrada'::public.tipo_movimiento_enum) OR (cantidad > 0)) AND ((tipo_movimiento <> 'salida'::public.tipo_movimiento_enum) OR (cantidad < 0)))),
    CONSTRAINT ck_movimientos_stock CHECK ((stock_resultante = (stock_anterior + cantidad))),
    CONSTRAINT movimientos_inventario_stock_anterior_check CHECK ((stock_anterior >= 0)),
    CONSTRAINT movimientos_inventario_stock_resultante_check CHECK ((stock_resultante >= 0))
);

-- SEQUENCE: ordenes_codigo_seq
CREATE SEQUENCE public.ordenes_codigo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- TABLE: ordenes
CREATE TABLE public.ordenes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(20) DEFAULT ('SP-'::text || lpad((nextval('public.ordenes_codigo_seq'::regclass))::text, 6, '0'::text)) NOT NULL,
    cliente_id uuid NOT NULL,
    estado public.estado_orden_enum DEFAULT 'en_espera_pago'::public.estado_orden_enum NOT NULL,
    metodo_pago public.metodo_pago_enum NOT NULL,
    total integer NOT NULL,
    fecha_pago timestamp with time zone,
    motivo_cancelacion text,
    fecha_cancelacion timestamp with time zone,
    observaciones text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_ordenes_cancelacion CHECK (((estado <> 'cancelado'::public.estado_orden_enum) OR (fecha_cancelacion IS NOT NULL))),
    CONSTRAINT ck_ordenes_fecha_pago CHECK (((estado = ANY (ARRAY['en_espera_pago'::public.estado_orden_enum, 'cancelado'::public.estado_orden_enum])) OR (fecha_pago IS NOT NULL))),
    CONSTRAINT ck_ordenes_flujo_efectivo CHECK (((metodo_pago <> 'efectivo'::public.metodo_pago_enum) OR (estado = ANY (ARRAY['en_espera_pago'::public.estado_orden_enum, 'entregado'::public.estado_orden_enum, 'cancelado'::public.estado_orden_enum])))),
    CONSTRAINT ordenes_total_check CHECK ((total > 0))
);

-- TABLE: producto_imagenes
CREATE TABLE public.producto_imagenes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    producto_id uuid NOT NULL,
    url text NOT NULL,
    orden integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT producto_imagenes_orden_check CHECK (((orden >= 1) AND (orden <= 4)))
);

-- TABLE: productos
CREATE TABLE public.productos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    categoria_id uuid NOT NULL,
    referencia character varying(50) NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion_corta character varying(255),
    descripcion text,
    precio integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT productos_precio_check CHECK ((precio > 0))
);

-- TABLE: servicios
CREATE TABLE public.servicios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    duracion_minutos integer NOT NULL,
    requiere_tamano boolean DEFAULT true NOT NULL,
    requiere_tipo_pelaje boolean DEFAULT true NOT NULL,
    aplica_recargo_nudos boolean DEFAULT false NOT NULL,
    aplica_recargo_comportamiento boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT servicios_duracion_minutos_check CHECK ((duracion_minutos > 0))
);

-- TABLE: servicios_adicionales
CREATE TABLE public.servicios_adicionales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- TABLE: tarifas_servicio
CREATE TABLE public.tarifas_servicio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    servicio_id uuid NOT NULL,
    tamano public.tamano_mascota_enum NOT NULL,
    tipo_pelaje public.tipo_pelaje_enum NOT NULL,
    precio_base integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tarifas_servicio_precio_base_check CHECK ((precio_base >= 0))
);

-- TABLE: tarifas_servicio_adicional
CREATE TABLE public.tarifas_servicio_adicional (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    servicio_adicional_id uuid NOT NULL,
    tamano public.tamano_mascota_enum NOT NULL,
    precio integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tarifas_servicio_adicional_precio_check CHECK ((precio >= 0))
);

-- TABLE: usuarios
CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol public.rol_usuario_enum NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- CONSTRAINT: administradores administradores_pkey
ALTER TABLE ONLY public.administradores
    ADD CONSTRAINT administradores_pkey PRIMARY KEY (id);

-- CONSTRAINT: administradores administradores_username_key
ALTER TABLE ONLY public.administradores
    ADD CONSTRAINT administradores_username_key UNIQUE (username);

-- CONSTRAINT: administradores administradores_usuario_id_key
ALTER TABLE ONLY public.administradores
    ADD CONSTRAINT administradores_usuario_id_key UNIQUE (usuario_id);

-- CONSTRAINT: bloqueos_agenda bloqueos_agenda_pkey
ALTER TABLE ONLY public.bloqueos_agenda
    ADD CONSTRAINT bloqueos_agenda_pkey PRIMARY KEY (id);

-- CONSTRAINT: carrito_items carrito_items_pkey
ALTER TABLE ONLY public.carrito_items
    ADD CONSTRAINT carrito_items_pkey PRIMARY KEY (id);

-- CONSTRAINT: carritos carritos_cliente_id_key
ALTER TABLE ONLY public.carritos
    ADD CONSTRAINT carritos_cliente_id_key UNIQUE (cliente_id);

-- CONSTRAINT: carritos carritos_pkey
ALTER TABLE ONLY public.carritos
    ADD CONSTRAINT carritos_pkey PRIMARY KEY (id);

-- CONSTRAINT: categorias categorias_nombre_key
ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_nombre_key UNIQUE (nombre);

-- CONSTRAINT: categorias categorias_pkey
ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);

-- CONSTRAINT: cita_servicios_adicionales cita_servicios_adicionales_cita_id_servicio_adicional_id_key
ALTER TABLE ONLY public.cita_servicios_adicionales
    ADD CONSTRAINT cita_servicios_adicionales_cita_id_servicio_adicional_id_key UNIQUE (cita_id, servicio_adicional_id);

-- CONSTRAINT: cita_servicios_adicionales cita_servicios_adicionales_pkey
ALTER TABLE ONLY public.cita_servicios_adicionales
    ADD CONSTRAINT cita_servicios_adicionales_pkey PRIMARY KEY (id);

-- CONSTRAINT: citas citas_pkey
ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_pkey PRIMARY KEY (id);

-- CONSTRAINT: clientes clientes_cedula_key
ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_cedula_key UNIQUE (cedula);

-- CONSTRAINT: clientes clientes_pkey
ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);

-- CONSTRAINT: clientes clientes_usuario_id_key
ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_usuario_id_key UNIQUE (usuario_id);

-- CONSTRAINT: codigos_verificacion codigos_verificacion_pkey
ALTER TABLE ONLY public.codigos_verificacion
    ADD CONSTRAINT codigos_verificacion_pkey PRIMARY KEY (id);

-- CONSTRAINT: detalle_orden detalle_orden_pkey
ALTER TABLE ONLY public.detalle_orden
    ADD CONSTRAINT detalle_orden_pkey PRIMARY KEY (id);

-- CONSTRAINT: historial_citas historial_servicios_cita_id_key
ALTER TABLE ONLY public.historial_citas
    ADD CONSTRAINT historial_servicios_cita_id_key UNIQUE (cita_id);

-- CONSTRAINT: historial_citas historial_servicios_pkey
ALTER TABLE ONLY public.historial_citas
    ADD CONSTRAINT historial_servicios_pkey PRIMARY KEY (id);

-- CONSTRAINT: horarios_negocio horarios_negocio_dia_key
ALTER TABLE ONLY public.horarios_negocio
    ADD CONSTRAINT horarios_negocio_dia_key UNIQUE (dia);

-- CONSTRAINT: horarios_negocio horarios_negocio_pkey
ALTER TABLE ONLY public.horarios_negocio
    ADD CONSTRAINT horarios_negocio_pkey PRIMARY KEY (id);

-- CONSTRAINT: imagenes imagenes_pkey
ALTER TABLE ONLY public.imagenes
    ADD CONSTRAINT imagenes_pkey PRIMARY KEY (id);

-- CONSTRAINT: inventario inventario_pkey
ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (id);

-- CONSTRAINT: inventario inventario_producto_id_key
ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_producto_id_key UNIQUE (producto_id);

-- CONSTRAINT: mascotas mascotas_pkey
ALTER TABLE ONLY public.mascotas
    ADD CONSTRAINT mascotas_pkey PRIMARY KEY (id);

-- CONSTRAINT: movimientos_inventario movimientos_inventario_pkey
ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id);

-- CONSTRAINT: ordenes ordenes_codigo_key
ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_codigo_key UNIQUE (codigo);

-- CONSTRAINT: ordenes ordenes_pkey
ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_pkey PRIMARY KEY (id);

-- CONSTRAINT: producto_imagenes producto_imagenes_pkey
ALTER TABLE ONLY public.producto_imagenes
    ADD CONSTRAINT producto_imagenes_pkey PRIMARY KEY (id);

-- CONSTRAINT: productos productos_pkey
ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);

-- CONSTRAINT: productos productos_referencia_key
ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_referencia_key UNIQUE (referencia);

-- CONSTRAINT: servicios_adicionales servicios_adicionales_nombre_key
ALTER TABLE ONLY public.servicios_adicionales
    ADD CONSTRAINT servicios_adicionales_nombre_key UNIQUE (nombre);

-- CONSTRAINT: servicios_adicionales servicios_adicionales_pkey
ALTER TABLE ONLY public.servicios_adicionales
    ADD CONSTRAINT servicios_adicionales_pkey PRIMARY KEY (id);

-- CONSTRAINT: servicios servicios_nombre_key
ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_nombre_key UNIQUE (nombre);

-- CONSTRAINT: servicios servicios_pkey
ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_pkey PRIMARY KEY (id);

-- CONSTRAINT: tarifas_servicio_adicional tarifas_servicio_adicional_pkey
ALTER TABLE ONLY public.tarifas_servicio_adicional
    ADD CONSTRAINT tarifas_servicio_adicional_pkey PRIMARY KEY (id);

-- CONSTRAINT: tarifas_servicio_adicional tarifas_servicio_adicional_servicio_adicional_id_tamano_key
ALTER TABLE ONLY public.tarifas_servicio_adicional
    ADD CONSTRAINT tarifas_servicio_adicional_servicio_adicional_id_tamano_key UNIQUE (servicio_adicional_id, tamano);

-- CONSTRAINT: tarifas_servicio tarifas_servicio_pkey
ALTER TABLE ONLY public.tarifas_servicio
    ADD CONSTRAINT tarifas_servicio_pkey PRIMARY KEY (id);

-- CONSTRAINT: tarifas_servicio tarifas_servicio_servicio_id_tamano_tipo_pelaje_key
ALTER TABLE ONLY public.tarifas_servicio
    ADD CONSTRAINT tarifas_servicio_servicio_id_tamano_tipo_pelaje_key UNIQUE (servicio_id, tamano, tipo_pelaje);

-- CONSTRAINT: carrito_items uq_carrito_items_producto
ALTER TABLE ONLY public.carrito_items
    ADD CONSTRAINT uq_carrito_items_producto UNIQUE (carrito_id, producto_id);

-- CONSTRAINT: detalle_orden uq_detalle_orden_producto
ALTER TABLE ONLY public.detalle_orden
    ADD CONSTRAINT uq_detalle_orden_producto UNIQUE (orden_id, producto_id);

-- CONSTRAINT: producto_imagenes uq_producto_imagenes_orden
ALTER TABLE ONLY public.producto_imagenes
    ADD CONSTRAINT uq_producto_imagenes_orden UNIQUE (producto_id, orden);

-- CONSTRAINT: usuarios usuarios_email_key
ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);

-- CONSTRAINT: usuarios usuarios_pkey
ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);

-- INDEX: idx_bloqueos_agenda_fecha
CREATE INDEX idx_bloqueos_agenda_fecha ON public.bloqueos_agenda USING btree (fecha);

-- INDEX: idx_carrito_items_producto_id
CREATE INDEX idx_carrito_items_producto_id ON public.carrito_items USING btree (producto_id);

-- INDEX: idx_cita_servicios_adicionales_cita_id
CREATE INDEX idx_cita_servicios_adicionales_cita_id ON public.cita_servicios_adicionales USING btree (cita_id);

-- INDEX: idx_cita_servicios_adicionales_servicio_adicional_id
CREATE INDEX idx_cita_servicios_adicionales_servicio_adicional_id ON public.cita_servicios_adicionales USING btree (servicio_adicional_id);

-- INDEX: idx_citas_administrador_id
CREATE INDEX idx_citas_administrador_id ON public.citas USING btree (administrador_id);

-- INDEX: idx_citas_cliente_id
CREATE INDEX idx_citas_cliente_id ON public.citas USING btree (cliente_id);

-- INDEX: idx_citas_estado
CREATE INDEX idx_citas_estado ON public.citas USING btree (estado);

-- INDEX: idx_citas_fecha
CREATE INDEX idx_citas_fecha ON public.citas USING btree (fecha);

-- INDEX: idx_citas_mascota_id
CREATE INDEX idx_citas_mascota_id ON public.citas USING btree (mascota_id);

-- INDEX: idx_citas_servicio_id
CREATE INDEX idx_citas_servicio_id ON public.citas USING btree (servicio_id);

-- INDEX: idx_codigos_verificacion_email_tipo
CREATE INDEX idx_codigos_verificacion_email_tipo ON public.codigos_verificacion USING btree (lower((email)::text), tipo, usado);

-- INDEX: idx_codigos_verificacion_expiracion
CREATE INDEX idx_codigos_verificacion_expiracion ON public.codigos_verificacion USING btree (expiracion);

-- INDEX: idx_detalle_orden_orden_id
CREATE INDEX idx_detalle_orden_orden_id ON public.detalle_orden USING btree (orden_id);

-- INDEX: idx_detalle_orden_producto_id
CREATE INDEX idx_detalle_orden_producto_id ON public.detalle_orden USING btree (producto_id);

-- INDEX: idx_historial_servicios_cliente_id
CREATE INDEX idx_historial_servicios_cliente_id ON public.historial_citas USING btree (cliente_id);

-- INDEX: idx_historial_servicios_fecha
CREATE INDEX idx_historial_servicios_fecha ON public.historial_citas USING btree (fecha_servicio);

-- INDEX: idx_historial_servicios_mascota_id
CREATE INDEX idx_historial_servicios_mascota_id ON public.historial_citas USING btree (mascota_id);

-- INDEX: idx_imagenes_categoria
CREATE INDEX idx_imagenes_categoria ON public.imagenes USING btree (categoria);

-- INDEX: idx_imagenes_orden
CREATE INDEX idx_imagenes_orden ON public.imagenes USING btree (orden);

-- INDEX: idx_mascotas_cliente_id
CREATE INDEX idx_mascotas_cliente_id ON public.mascotas USING btree (cliente_id);

-- INDEX: idx_mascotas_nombre
CREATE INDEX idx_mascotas_nombre ON public.mascotas USING btree (nombre);

-- INDEX: idx_movimientos_created_at
CREATE INDEX idx_movimientos_created_at ON public.movimientos_inventario USING btree (created_at DESC);

-- INDEX: idx_movimientos_orden_id
CREATE INDEX idx_movimientos_orden_id ON public.movimientos_inventario USING btree (orden_id);

-- INDEX: idx_movimientos_producto_id
CREATE INDEX idx_movimientos_producto_id ON public.movimientos_inventario USING btree (producto_id);

-- INDEX: idx_ordenes_cliente_id
CREATE INDEX idx_ordenes_cliente_id ON public.ordenes USING btree (cliente_id);

-- INDEX: idx_ordenes_created_at
CREATE INDEX idx_ordenes_created_at ON public.ordenes USING btree (created_at DESC);

-- INDEX: idx_ordenes_estado
CREATE INDEX idx_ordenes_estado ON public.ordenes USING btree (estado);

-- INDEX: idx_ordenes_fecha_pago
CREATE INDEX idx_ordenes_fecha_pago ON public.ordenes USING btree (fecha_pago);

-- INDEX: idx_productos_activo
CREATE INDEX idx_productos_activo ON public.productos USING btree (activo);

-- INDEX: idx_productos_categoria_id
CREATE INDEX idx_productos_categoria_id ON public.productos USING btree (categoria_id);

-- INDEX: idx_tarifas_servicio_adicional_id
CREATE INDEX idx_tarifas_servicio_adicional_id ON public.tarifas_servicio_adicional USING btree (servicio_adicional_id);

-- INDEX: idx_tarifas_servicio_servicio_id
CREATE INDEX idx_tarifas_servicio_servicio_id ON public.tarifas_servicio USING btree (servicio_id);

-- TRIGGER: administradores trg_administradores_updated_at
CREATE TRIGGER trg_administradores_updated_at BEFORE UPDATE ON public.administradores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: bloqueos_agenda trg_bloqueos_agenda_updated_at
CREATE TRIGGER trg_bloqueos_agenda_updated_at BEFORE UPDATE ON public.bloqueos_agenda FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: carrito_items trg_carrito_items_updated_at
CREATE TRIGGER trg_carrito_items_updated_at BEFORE UPDATE ON public.carrito_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: carritos trg_carritos_updated_at
CREATE TRIGGER trg_carritos_updated_at BEFORE UPDATE ON public.carritos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: categorias trg_categorias_updated_at
CREATE TRIGGER trg_categorias_updated_at BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: citas trg_citas_updated_at
CREATE TRIGGER trg_citas_updated_at BEFORE UPDATE ON public.citas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: clientes trg_clientes_updated_at
CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: horarios_negocio trg_horarios_negocio_updated_at
CREATE TRIGGER trg_horarios_negocio_updated_at BEFORE UPDATE ON public.horarios_negocio FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: imagenes trg_imagenes_updated_at
CREATE TRIGGER trg_imagenes_updated_at BEFORE UPDATE ON public.imagenes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: inventario trg_inventario_updated_at
CREATE TRIGGER trg_inventario_updated_at BEFORE UPDATE ON public.inventario FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: mascotas trg_mascotas_updated_at
CREATE TRIGGER trg_mascotas_updated_at BEFORE UPDATE ON public.mascotas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: movimientos_inventario trg_movimientos_inmutables
CREATE TRIGGER trg_movimientos_inmutables BEFORE DELETE OR UPDATE ON public.movimientos_inventario FOR EACH ROW EXECUTE FUNCTION public.bloquear_cambios_movimientos();

-- TRIGGER: ordenes trg_ordenes_updated_at
CREATE TRIGGER trg_ordenes_updated_at BEFORE UPDATE ON public.ordenes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: productos trg_productos_updated_at
CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: servicios_adicionales trg_servicios_adicionales_updated_at
CREATE TRIGGER trg_servicios_adicionales_updated_at BEFORE UPDATE ON public.servicios_adicionales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: servicios trg_servicios_updated_at
CREATE TRIGGER trg_servicios_updated_at BEFORE UPDATE ON public.servicios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: tarifas_servicio_adicional trg_tarifas_servicio_adicional_updated_at
CREATE TRIGGER trg_tarifas_servicio_adicional_updated_at BEFORE UPDATE ON public.tarifas_servicio_adicional FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: tarifas_servicio trg_tarifas_servicio_updated_at
CREATE TRIGGER trg_tarifas_servicio_updated_at BEFORE UPDATE ON public.tarifas_servicio FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRIGGER: usuarios trg_usuarios_updated_at
CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FK CONSTRAINT: administradores administradores_usuario_id_fkey
ALTER TABLE ONLY public.administradores
    ADD CONSTRAINT administradores_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- FK CONSTRAINT: bloqueos_agenda bloqueos_agenda_administrador_id_fkey
ALTER TABLE ONLY public.bloqueos_agenda
    ADD CONSTRAINT bloqueos_agenda_administrador_id_fkey FOREIGN KEY (administrador_id) REFERENCES public.administradores(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- FK CONSTRAINT: carrito_items carrito_items_carrito_id_fkey
ALTER TABLE ONLY public.carrito_items
    ADD CONSTRAINT carrito_items_carrito_id_fkey FOREIGN KEY (carrito_id) REFERENCES public.carritos(id) ON DELETE CASCADE;

-- FK CONSTRAINT: carrito_items carrito_items_producto_id_fkey
ALTER TABLE ONLY public.carrito_items
    ADD CONSTRAINT carrito_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;

-- FK CONSTRAINT: carritos carritos_cliente_id_fkey
ALTER TABLE ONLY public.carritos
    ADD CONSTRAINT carritos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);

-- FK CONSTRAINT: cita_servicios_adicionales cita_servicios_adicionales_cita_id_fkey
ALTER TABLE ONLY public.cita_servicios_adicionales
    ADD CONSTRAINT cita_servicios_adicionales_cita_id_fkey FOREIGN KEY (cita_id) REFERENCES public.citas(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: cita_servicios_adicionales cita_servicios_adicionales_servicio_adicional_id_fkey
ALTER TABLE ONLY public.cita_servicios_adicionales
    ADD CONSTRAINT cita_servicios_adicionales_servicio_adicional_id_fkey FOREIGN KEY (servicio_adicional_id) REFERENCES public.servicios_adicionales(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- FK CONSTRAINT: citas citas_administrador_id_fkey
ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_administrador_id_fkey FOREIGN KEY (administrador_id) REFERENCES public.administradores(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- FK CONSTRAINT: citas citas_cliente_id_fkey
ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- FK CONSTRAINT: citas citas_mascota_id_fkey
ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_mascota_id_fkey FOREIGN KEY (mascota_id) REFERENCES public.mascotas(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- FK CONSTRAINT: citas citas_servicio_id_fkey
ALTER TABLE ONLY public.citas
    ADD CONSTRAINT citas_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- FK CONSTRAINT: clientes clientes_usuario_id_fkey
ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- FK CONSTRAINT: detalle_orden detalle_orden_orden_id_fkey
ALTER TABLE ONLY public.detalle_orden
    ADD CONSTRAINT detalle_orden_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes(id) ON DELETE CASCADE;

-- FK CONSTRAINT: detalle_orden detalle_orden_producto_id_fkey
ALTER TABLE ONLY public.detalle_orden
    ADD CONSTRAINT detalle_orden_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);

-- FK CONSTRAINT: historial_citas historial_servicios_cita_id_fkey
ALTER TABLE ONLY public.historial_citas
    ADD CONSTRAINT historial_servicios_cita_id_fkey FOREIGN KEY (cita_id) REFERENCES public.citas(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- FK CONSTRAINT: historial_citas historial_servicios_cliente_id_fkey
ALTER TABLE ONLY public.historial_citas
    ADD CONSTRAINT historial_servicios_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- FK CONSTRAINT: historial_citas historial_servicios_mascota_id_fkey
ALTER TABLE ONLY public.historial_citas
    ADD CONSTRAINT historial_servicios_mascota_id_fkey FOREIGN KEY (mascota_id) REFERENCES public.mascotas(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- FK CONSTRAINT: inventario inventario_producto_id_fkey
ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;

-- FK CONSTRAINT: mascotas mascotas_cliente_id_fkey
ALTER TABLE ONLY public.mascotas
    ADD CONSTRAINT mascotas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- FK CONSTRAINT: movimientos_inventario movimientos_inventario_orden_id_fkey
ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes(id);

-- FK CONSTRAINT: movimientos_inventario movimientos_inventario_producto_id_fkey
ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);

-- FK CONSTRAINT: movimientos_inventario movimientos_inventario_usuario_id_fkey
ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);

-- FK CONSTRAINT: ordenes ordenes_cliente_id_fkey
ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);

-- FK CONSTRAINT: producto_imagenes producto_imagenes_producto_id_fkey
ALTER TABLE ONLY public.producto_imagenes
    ADD CONSTRAINT producto_imagenes_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;

-- FK CONSTRAINT: productos productos_categoria_id_fkey
ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);

-- FK CONSTRAINT: tarifas_servicio_adicional tarifas_servicio_adicional_servicio_adicional_id_fkey
ALTER TABLE ONLY public.tarifas_servicio_adicional
    ADD CONSTRAINT tarifas_servicio_adicional_servicio_adicional_id_fkey FOREIGN KEY (servicio_adicional_id) REFERENCES public.servicios_adicionales(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- FK CONSTRAINT: tarifas_servicio tarifas_servicio_servicio_id_fkey
ALTER TABLE ONLY public.tarifas_servicio
    ADD CONSTRAINT tarifas_servicio_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicios(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- ROW SECURITY: administradores
ALTER TABLE public.administradores ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: bloqueos_agenda
ALTER TABLE public.bloqueos_agenda ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: carrito_items
ALTER TABLE public.carrito_items ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: carritos
ALTER TABLE public.carritos ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: categorias
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: cita_servicios_adicionales
ALTER TABLE public.cita_servicios_adicionales ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: citas
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: codigos_verificacion
ALTER TABLE public.codigos_verificacion ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: detalle_orden
ALTER TABLE public.detalle_orden ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: historial_citas
ALTER TABLE public.historial_citas ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: horarios_negocio
ALTER TABLE public.horarios_negocio ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: imagenes
ALTER TABLE public.imagenes ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: inventario
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: mascotas
ALTER TABLE public.mascotas ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: movimientos_inventario
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: ordenes
ALTER TABLE public.ordenes ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: producto_imagenes
ALTER TABLE public.producto_imagenes ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: productos
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: servicios
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: servicios_adicionales
ALTER TABLE public.servicios_adicionales ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: tarifas_servicio
ALTER TABLE public.tarifas_servicio ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: tarifas_servicio_adicional
ALTER TABLE public.tarifas_servicio_adicional ENABLE ROW LEVEL SECURITY;

-- ROW SECURITY: usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

COMMIT;
