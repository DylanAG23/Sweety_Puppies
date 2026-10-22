-- Isolated test schema: commerce definitions read from Supabase, no business data.
CREATE TABLE usuarios(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),activo boolean DEFAULT true,rol text,email text);
CREATE TABLE clientes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),usuario_id uuid REFERENCES usuarios(id),nombre text,apellido text,activo boolean DEFAULT true,created_at timestamptz DEFAULT now());
CREATE TABLE administradores(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),usuario_id uuid REFERENCES usuarios(id),nombre text,apellido text,username text);
CREATE TABLE historial_citas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),fecha_servicio timestamptz,precio_final int,precio_calculado int,precio_base int);
CREATE SEQUENCE ordenes_codigo_seq;
CREATE TYPE estado_orden_enum AS ENUM ('en_espera_pago','pagado','pendiente_recoger','entregado','cancelado');
CREATE TYPE metodo_pago_enum AS ENUM ('tarjeta','nequi','efectivo');
CREATE TYPE tipo_movimiento_enum AS ENUM ('entrada','salida','ajuste');
CREATE TABLE categorias (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre character varying(100) NOT NULL,
  descripcion text,
  orden integer DEFAULT 0 NOT NULL,
  activo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE productos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  categoria_id uuid NOT NULL,
  referencia character varying(50) NOT NULL,
  nombre character varying(150) NOT NULL,
  descripcion_corta character varying(255),
  descripcion text,
  precio integer NOT NULL,
  activo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE producto_imagenes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  producto_id uuid NOT NULL,
  url text NOT NULL,
  orden integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE inventario (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  producto_id uuid NOT NULL,
  stock_actual integer DEFAULT 0 NOT NULL,
  stock_minimo integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE carritos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cliente_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE carrito_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  carrito_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  cantidad integer NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE ordenes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  codigo character varying(20) DEFAULT ('SP-'::text || lpad((nextval('ordenes_codigo_seq'::regclass))::text, 6, '0'::text)) NOT NULL,
  cliente_id uuid NOT NULL,
  estado estado_orden_enum DEFAULT 'en_espera_pago'::estado_orden_enum NOT NULL,
  metodo_pago metodo_pago_enum NOT NULL,
  total integer NOT NULL,
  fecha_pago timestamp with time zone,
  motivo_cancelacion text,
  fecha_cancelacion timestamp with time zone,
  observaciones text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE detalle_orden (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  orden_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  producto_nombre character varying(150) NOT NULL,
  cantidad integer NOT NULL,
  precio_unitario integer NOT NULL,
  subtotal integer NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE movimientos_inventario (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  producto_id uuid NOT NULL,
  orden_id uuid,
  usuario_id uuid,
  tipo_movimiento tipo_movimiento_enum NOT NULL,
  cantidad integer NOT NULL,
  stock_anterior integer NOT NULL,
  stock_resultante integer NOT NULL,
  motivo character varying(100) NOT NULL,
  observacion text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE carrito_items ADD CONSTRAINT carrito_items_cantidad_check CHECK ((cantidad > 0));
ALTER TABLE carrito_items ADD CONSTRAINT carrito_items_pkey PRIMARY KEY (id);
ALTER TABLE carritos ADD CONSTRAINT carritos_cliente_id_key UNIQUE (cliente_id);
ALTER TABLE carritos ADD CONSTRAINT carritos_pkey PRIMARY KEY (id);
ALTER TABLE categorias ADD CONSTRAINT categorias_nombre_key UNIQUE (nombre);
ALTER TABLE categorias ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);
ALTER TABLE detalle_orden ADD CONSTRAINT ck_detalle_orden_subtotal CHECK ((subtotal = (cantidad * precio_unitario)));
ALTER TABLE movimientos_inventario ADD CONSTRAINT ck_movimientos_cantidad CHECK (((cantidad <> 0) AND ((tipo_movimiento <> 'entrada'::tipo_movimiento_enum) OR (cantidad > 0)) AND ((tipo_movimiento <> 'salida'::tipo_movimiento_enum) OR (cantidad < 0))));
ALTER TABLE movimientos_inventario ADD CONSTRAINT ck_movimientos_stock CHECK ((stock_resultante = (stock_anterior + cantidad)));
ALTER TABLE ordenes ADD CONSTRAINT ck_ordenes_cancelacion CHECK (((estado <> 'cancelado'::estado_orden_enum) OR (fecha_cancelacion IS NOT NULL)));
ALTER TABLE ordenes ADD CONSTRAINT ck_ordenes_fecha_pago CHECK (((estado = ANY (ARRAY['en_espera_pago'::estado_orden_enum, 'cancelado'::estado_orden_enum])) OR (fecha_pago IS NOT NULL)));
ALTER TABLE ordenes ADD CONSTRAINT ck_ordenes_flujo_efectivo CHECK (((metodo_pago <> 'efectivo'::metodo_pago_enum) OR (estado = ANY (ARRAY['en_espera_pago'::estado_orden_enum, 'entregado'::estado_orden_enum, 'cancelado'::estado_orden_enum]))));
ALTER TABLE detalle_orden ADD CONSTRAINT detalle_orden_cantidad_check CHECK ((cantidad > 0));
ALTER TABLE detalle_orden ADD CONSTRAINT detalle_orden_pkey PRIMARY KEY (id);
ALTER TABLE detalle_orden ADD CONSTRAINT detalle_orden_precio_unitario_check CHECK ((precio_unitario > 0));
ALTER TABLE detalle_orden ADD CONSTRAINT detalle_orden_subtotal_check CHECK ((subtotal > 0));
ALTER TABLE inventario ADD CONSTRAINT inventario_pkey PRIMARY KEY (id);
ALTER TABLE inventario ADD CONSTRAINT inventario_producto_id_key UNIQUE (producto_id);
ALTER TABLE inventario ADD CONSTRAINT inventario_stock_actual_check CHECK ((stock_actual >= 0));
ALTER TABLE inventario ADD CONSTRAINT inventario_stock_minimo_check CHECK ((stock_minimo >= 0));
ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id);
ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_stock_anterior_check CHECK ((stock_anterior >= 0));
ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_stock_resultante_check CHECK ((stock_resultante >= 0));
ALTER TABLE ordenes ADD CONSTRAINT ordenes_codigo_key UNIQUE (codigo);
ALTER TABLE ordenes ADD CONSTRAINT ordenes_pkey PRIMARY KEY (id);
ALTER TABLE ordenes ADD CONSTRAINT ordenes_total_check CHECK ((total > 0));
ALTER TABLE producto_imagenes ADD CONSTRAINT producto_imagenes_orden_check CHECK (((orden >= 1) AND (orden <= 4)));
ALTER TABLE producto_imagenes ADD CONSTRAINT producto_imagenes_pkey PRIMARY KEY (id);
ALTER TABLE productos ADD CONSTRAINT productos_pkey PRIMARY KEY (id);
ALTER TABLE productos ADD CONSTRAINT productos_precio_check CHECK ((precio > 0));
ALTER TABLE productos ADD CONSTRAINT productos_referencia_key UNIQUE (referencia);
ALTER TABLE carrito_items ADD CONSTRAINT uq_carrito_items_producto UNIQUE (carrito_id, producto_id);
ALTER TABLE detalle_orden ADD CONSTRAINT uq_detalle_orden_producto UNIQUE (orden_id, producto_id);
ALTER TABLE producto_imagenes ADD CONSTRAINT uq_producto_imagenes_orden UNIQUE (producto_id, orden);
ALTER TABLE carrito_items ADD CONSTRAINT carrito_items_carrito_id_fkey FOREIGN KEY (carrito_id) REFERENCES carritos(id) ON DELETE CASCADE;
ALTER TABLE carrito_items ADD CONSTRAINT carrito_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;
ALTER TABLE carritos ADD CONSTRAINT carritos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id);
ALTER TABLE detalle_orden ADD CONSTRAINT detalle_orden_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE;
ALTER TABLE detalle_orden ADD CONSTRAINT detalle_orden_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id);
ALTER TABLE inventario ADD CONSTRAINT inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;
ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES ordenes(id);
ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id);
ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE ordenes ADD CONSTRAINT ordenes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id);
ALTER TABLE producto_imagenes ADD CONSTRAINT producto_imagenes_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;
ALTER TABLE productos ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias(id);
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.bloquear_cambios_movimientos()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'Los movimientos de inventario no se pueden editar ni eliminar';
END;
$function$
;
CREATE TRIGGER trg_categorias_updated_at BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventario_updated_at BEFORE UPDATE ON public.inventario FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ordenes_updated_at BEFORE UPDATE ON public.ordenes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_movimientos_inmutables BEFORE DELETE OR UPDATE ON public.movimientos_inventario FOR EACH ROW EXECUTE FUNCTION bloquear_cambios_movimientos();
CREATE TRIGGER trg_carritos_updated_at BEFORE UPDATE ON public.carritos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_carrito_items_updated_at BEFORE UPDATE ON public.carrito_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();