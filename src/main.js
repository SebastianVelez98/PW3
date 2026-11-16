import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import router from './router/index.js';
import { attachNetworkAndPwaListeners } from './composables/useNetworkStatus.js';
import { registerServiceWorker } from './pwa/registerSw.js';

attachNetworkAndPwaListeners();

createApp(App).use(router).mount('#app');

registerServiceWorker();
