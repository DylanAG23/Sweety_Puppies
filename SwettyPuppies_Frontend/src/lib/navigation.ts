export function navigateTo(path: string) {
  if (window.location.pathname === path) {
    window.dispatchEvent(new PopStateEvent('popstate'))
    return
  }

  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export type NavItem = {
  label: string
  href: string
  // Codigo de dos letras que se muestra como icono (convencion del sistema).
  icon: string
  // Etiqueta corta, por ejemplo "Nuevo".
  badge?: string
  // Otras rutas que tambien activan este enlace.
  matches?: string[]
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

// La tienda está habilitada por defecto; false permite ocultarla en un despliegue.
export const isStoreEnabled = import.meta.env.VITE_ENABLE_STORE !== 'false'

const clientStoreItems: NavItem[] = [
  { label: 'Tienda', href: '/cliente/tienda', icon: 'TD', badge: 'Nuevo' },
  { label: 'Carrito', href: '/cliente/carrito', icon: 'CR' },
  { label: 'Mis pedidos', href: '/cliente/pedidos', icon: 'PD', badge: 'Nuevo' },
]

export const clientNavGroups: NavGroup[] = [
  {
    label: 'Tu espacio',
    items: [
      { label: 'Inicio', href: '/cliente', icon: 'IN' },
      { label: 'Mi perfil', href: '/cliente/perfil', icon: 'PF' },
      { label: 'Mis mascotas', href: '/cliente/mascotas', icon: 'MS' },
      { label: 'Agendar cita', href: '/cliente/citas/nueva', icon: 'CT' },
      { label: 'Historial', href: '/cliente/historial', icon: 'HC' },
      ...(isStoreEnabled ? clientStoreItems : []),
    ],
  },
]

export const adminNavGroups: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { label: 'Inicio', href: '/admin', icon: 'IN' },
      { label: 'Agenda', href: '/admin/agenda', icon: 'AG', matches: ['/admin/bloqueos'] },
      { label: 'Clientes', href: '/admin/clientes', icon: 'CL' },
      { label: 'Mascotas', href: '/admin/mascotas', icon: 'MS' },
      { label: 'Gestión de citas', href: '/admin/gestion', icon: 'GC', matches: ['/admin/historial'] },
      { label: 'Servicios', href: '/admin/servicios', icon: 'SV', matches: ['/admin/adicionales'] },
      { label: 'Contenido', href: '/admin/contenido', icon: 'CT', matches: ['/admin/galeria'] },
      { label: 'Reportes', href: '/admin/reportes', icon: 'RP' },
    ],
  },
  ...(isStoreEnabled
    ? [
        {
          label: 'Tienda',
          items: [
            { label: 'Productos', href: '/admin/productos', icon: 'PR' },
            { label: 'Categorías', href: '/admin/categorias', icon: 'CA' },
            { label: 'Inventario', href: '/admin/inventario', icon: 'IV' },
            { label: 'Pedidos', href: '/admin/pedidos', icon: 'PE' },
            { label: 'Ingresos', href: '/admin/ingresos', icon: 'IG' },
          ],
        },
      ]
    : []),
]

// Un enlace esta activo en su ruta exacta y en sus subrutas
// (salvo el inicio, que solo es exacto).
export function isNavItemActive(item: NavItem, currentPath: string, homeHref: string) {
  const candidates = [item.href, ...(item.matches ?? [])]

  return candidates.some((href) => {
    if (href === homeHref) {
      return currentPath === homeHref
    }

    return currentPath === href || currentPath.startsWith(`${href}/`)
  })
}
