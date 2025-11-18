// src/middleware.ts - versión simple
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith('/admin')) {
    
    // En desarrollo, bypass automático
    if (import.meta.env.DEV) {
      context.locals.user = {
        email: 'dev@local.test',
        sub: 'dev-123',
        isValid: true
      };
      return next();
    }
    
    // En producción, Cloudflare Access ya validó antes de llegar aquí
    // Solo extraemos el usuario del JWT que ya fue validado por CF Access
    const cfJWT = context.request.headers.get('Cf-Access-Jwt-Assertion');
    
    if (!cfJWT) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Cloudflare Access ya validó, solo decodificamos
    try {
      const payload = JSON.parse(atob(cfJWT.split('.')[1]));
      context.locals.user = {
        email: payload.email,
        sub: payload.sub,
        isValid: true
      };
    } catch {
      return new Response('Invalid token', { status: 403 });
    }
  }
  
  return next();
});