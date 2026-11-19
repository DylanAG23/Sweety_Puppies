export const money = (n: number | string) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(n));
export const dateTime = (s: string) =>
  new Date(s).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
export const states: Record<string, string> = {
  en_espera_pago: 'Sin pagar',
  pagado: 'Pagado',
  pendiente_recoger: 'Listo para recoger',
  entregado: 'Entregado',
  cancelado: 'Cancelado'
};
export interface Category {
  id: string;
  nombre: string;
  descripcion: string;
  orden: number;
  activo: boolean;
}
export interface Product {
  id: string;
  nombre: string;
  referencia: string;
  categoria_id: string;
  categoria_nombre: string;
  descripcion_corta: string;
  descripcion: string;
  precio: number;
  activo: boolean;
  categoria_activa: boolean;
  stock_actual: number;
  stock_minimo: number;
  imagenes: { id: string; url: string; orden: number }[];
}
export interface CartLine {
  id: string;
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  stock_actual: number;
  activo: boolean;
  categoria_activa: boolean;
  imagen: string;
}
export interface Cart {
  items: CartLine[];
  total: number;
  cantidad: number;
}
export interface Order {
  id: string;
  codigo: string;
  cliente_nombre?: string;
  estado: string;
  metodo_pago: string;
  total: number;
  created_at: string;
  fecha_pago?: string;
  motivo_cancelacion?: string;
  eventos: { id: string; accion: string; resultado: string; fecha: string; metodo: string }[];
}
export interface OrderLine {
  id: string;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}
export function query(values: Record<string, string | number>) {
  return new URLSearchParams(
    Object.entries(values)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString();
}
