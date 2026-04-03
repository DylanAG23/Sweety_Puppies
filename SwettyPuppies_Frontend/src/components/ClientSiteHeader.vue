<script setup lang="ts">
import { logoutToLogin } from '@/lib/session'

const props = defineProps<{
  currentPath: string
}>()

const navItems = [
  { label: 'Inicio', href: '/cliente' },
  { label: 'Mi perfil', href: '/cliente/perfil' },
  { label: 'Mis mascotas', href: '/cliente/mascotas' },
  { label: 'Agendar cita', href: '/cliente/citas/nueva' },
  { label: 'Historial', href: '/cliente/historial' },
]

function isActive(href: string) {
  if (href === '/cliente') {
    return props.currentPath === '/cliente'
  }

  return props.currentPath === href || props.currentPath.startsWith(`${href}/`)
}

</script>

<template>
  <header class="client-site-header">
    <a href="/cliente" class="header-brand">
      <div class="brand-logo-shell">
        <img src="/img/logo.png" alt="Logo de Sweety Puppies" class="brand-logo">
      </div>
      <div class="brand-copy">
        <strong>Sweety Puppies</strong>
        <small>Portal tierno para consentir a tus peluditos</small>
      </div>
    </a>

    <nav class="header-nav">
      <a
        v-for="item in navItems"
        :key="item.href"
        :href="item.href"
        class="header-nav-link"
        :class="{ active: isActive(item.href) }"
      >
        {{ item.label }}
      </a>
    </nav>

    <div class="header-actions">
      <button type="button" class="header-logout" @click="logoutToLogin">Cerrar sesion</button>
    </div>
  </header>
</template>

<style scoped>
.client-site-header {
  position: sticky;
  top: 12px;
  z-index: 20;
  margin-bottom: 22px;
  padding: 16px 20px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 20px;
  align-items: center;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.985) 0%, rgba(255, 252, 254, 0.985) 100%);
  border: 1px solid rgba(255, 214, 235, 0.98);
  border-radius: 32px;
  box-shadow:
    0 20px 46px rgba(204, 115, 174, 0.16),
    0 8px 18px rgba(155, 214, 232, 0.08);
  backdrop-filter: blur(22px);
  isolation: isolate;
}

.client-site-header::after {
  content: '';
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: -10px;
  height: 18px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 214, 235, 0.36) 0%, rgba(255, 214, 235, 0) 100%);
  pointer-events: none;
  z-index: -1;
}

.client-site-header::before {
  content: '';
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(236, 165, 207, 0.75) 20%, rgba(160, 226, 241, 0.75) 80%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
}

.header-brand {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
  color: inherit;
  min-width: 310px;
}

.brand-logo-shell {
  width: 84px;
  height: 84px;
  border-radius: 28px;
  background: linear-gradient(145deg, rgba(255, 234, 244, 0.96) 0%, rgba(231, 248, 255, 0.96) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 18px 32px rgba(221, 120, 181, 0.14),
    inset 0 0 0 1px rgba(255, 255, 255, 0.88);
}

.brand-logo {
  width: 58px;
  height: auto;
}

.brand-copy strong,
.brand-copy small {
  display: block;
}

.brand-copy strong {
  color: #8f176e;
  font-size: 1.18rem;
}

.brand-copy small {
  margin-top: 4px;
  color: #6f6170;
  font-size: 0.9rem;
}

.header-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.header-nav-link {
  text-decoration: none;
  padding: 13px 17px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff4fb 0%, #ffffff 100%);
  color: #8f176e;
  font-weight: 700;
  font-size: 0.92rem;
  border: 1px solid rgba(243, 203, 228, 0.9);
  box-shadow: 0 10px 22px rgba(219, 126, 183, 0.1);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.header-nav-link:hover,
.header-nav-link.active {
  transform: translateY(-2px);
  box-shadow: 0 16px 28px rgba(233, 90, 219, 0.24);
  background: linear-gradient(135deg, #c1008f 0%, #e95adb 100%);
  color: #fff;
  border-color: rgba(193, 0, 143, 0.9);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
}

.header-logout {
  border: none;
  border-radius: 999px;
  padding: 14px 22px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.header-logout {
  background: linear-gradient(135deg, #2db9c9 0%, #60d7df 100%);
  color: #fff;
  box-shadow: 0 14px 26px rgba(45, 185, 201, 0.26);
}

.header-logout:hover {
  transform: translateY(-2px);
}

@media (max-width: 1180px) {
  .client-site-header {
    grid-template-columns: 1fr;
  }

  .header-nav {
    justify-content: flex-start;
  }

  .header-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}

@media (max-width: 720px) {
  .client-site-header {
    padding: 18px;
    border-radius: 24px;
  }

  .header-brand {
    min-width: 0;
  }

  .header-actions,
  .header-nav {
    flex-direction: column;
    align-items: stretch;
  }

  .header-nav-link,
  .header-logout {
    width: 100%;
    text-align: center;
  }
}
</style>
