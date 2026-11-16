import { createRouter, createWebHistory } from 'vue-router';
import MenuView from '../views/MenuView.vue';

const routes = [
  {
    path: '/',
    name: 'menu',
    component: MenuView,
    meta: { title: 'Menú & Pedidos · AromaPOS PWA' }
  },
  {
    path: '/menu/:id',
    name: 'menu-detail',
    component: () => import('../views/MenuItemDetailView.vue'),
    meta: { title: 'Detalle de Carta · AromaPOS PWA' }
  },
  {
    path: '/carta',
    name: 'carta-admin',
    component: () => import('../views/CartaAdminView.vue'),
    meta: { title: 'Gestión de Carta · AromaPOS PWA' }
  },
  {
    path: '/pedidos',
    name: 'pedidos-pos',
    component: () => import('../views/PedidosPosView.vue'),
    meta: { title: 'Pedidos POS & Cocina · AromaPOS PWA' }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: 'Turno Barista · AromaPOS PWA' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: { title: '404 · AromaPOS PWA' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

router.afterEach((to) => {
  if (typeof document !== 'undefined' && to.meta?.title) {
    document.title = to.meta.title;
  }
});

export default router;
