import { getResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Включает «сервер в браузере».
 * Основной путь — MSW через Service Worker. Если воркер недоступен (приватный режим
 * Firefox, открытие с file://), те же обработчики подключаются напрямую к fetch.
 */
export async function enableMocking(): Promise<'worker' | 'fetch'> {
  const base = new URL('./', document.baseURI);
  try {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) throw new Error('no service worker');
    const worker = setupWorker(...handlers);
    await worker.start({
      serviceWorker: { url: new URL('mockServiceWorker.js', base).pathname, options: { scope: base.pathname } },
      onUnhandledRequest: 'bypass',
      quiet: true,
    });
    return 'worker';
  } catch {
    const original = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      if (new URL(request.url).pathname.includes('/api/')) {
        const response = await getResponse(handlers, request);
        if (response) return response;
      }
      return original(input, init);
    };
    return 'fetch';
  }
}
