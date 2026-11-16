/**
 * Servicio de Autenticación conectado a /api/auth/* de la API PW2.
 */

import { httpRequest } from './httpClient.js';

export const authService = {
  async login(credenciales) {
    const res = await httpRequest('/auth/login', {
      method: 'POST',
      body: {
        username: String(credenciales.username ?? '').trim(),
        password: String(credenciales.password ?? '')
      }
    });
    return res.data;
  },

  async obtenerSesionActual() {
    const res = await httpRequest('/auth/me', {
      method: 'GET'
    });
    return res.data;
  },

  async logout() {
    const res = await httpRequest('/auth/logout', {
      method: 'POST'
    });
    return res.data;
  }
};
