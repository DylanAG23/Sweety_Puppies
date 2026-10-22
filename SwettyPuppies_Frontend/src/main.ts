import { createApp } from 'vue'
import App from './App.vue'
import { vDialog } from './lib/dialog'

// Orden de estilos: tokens -> estilos heredados -> estructura -> capa base.
// La capa base va al final para unificar estados de botones, foco y modales.
// carrusel-estilos.css ya no se carga: solo estilaba el carrusel heredado
// (src/legacy), que la SPA no usa.
import './styles/tokens.css'
import './styles/legacy/styles.css'
import './styles/legacy/login.css'
import './styles/legacy/cliente-dashboard.css'
import './styles/legacy/servicios-estilos.css'
import './styles/legacy/clientes.css'
import './styles/legacy/mascotas.css'
import './styles/legacy/citas.css'
import './styles/legacy/servicios.css'
import './styles/legacy/imagenes.css'
import './styles/legacy/reportes.css'
import './styles/app.css'
import './styles/base.css'
import './styles/theme-legacy.css'
import './styles/theme.css'

createApp(App).directive('dialog', vDialog).mount('#app')
