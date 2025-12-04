const CACHE_NAME = 'neurorehab-v5.4'; // Atualizado para alinhar com a versão do App
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  // Dependências Externas (CDNs)
  // Nota: Se algum destes links estiver offline ou incorreto, o SW falhará ao instalar.
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/vue@3/dist/vue.global.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn-icons-png.flaticon.com/512/3063/3063176.png'
];

// Instalação: Cacheia os arquivos estáticos ("App Shell")
self.addEventListener('install', (event) => {
  // Força o SW a ativar imediatamente, não esperando o usuário fechar a aba
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Instalando e cacheando dependências...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch((error) => {
        console.error('[Service Worker] Falha ao registrar cache:', error);
      })
  );
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // Garante que o SW controle a página imediatamente
  self.clients.claim();
});

// Interceptação de Requisições (Fetch)
self.addEventListener('fetch', (event) => {
  // 1. Ignora requisições que não são GET (ex: POST para salvar dados)
  if (event.request.method !== 'GET') return;

  // 2. Ignora requisições para APIs do Google/Firebase e Extensões (não devem ser cacheadas aqui)
  const url = event.request.url;
  if (url.includes('firestore.googleapis.com') || 
      url.includes('googleapis.com') || 
      url.startsWith('chrome-extension')) {
    return;
  }

  // 3. Estratégia: Cache First, falling back to Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Se estiver no cache, retorna o cache
      if (cachedResponse) {
        return cachedResponse;
      }

      // Se não, busca na rede
      return fetch(event.request)
        .then((networkResponse) => {
          // Verifica se a resposta é válida
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
            return networkResponse;
          }

          // Opcional: Cachear dinamicamente novas requisições (Runtime Caching)
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Se estiver offline e não tiver no cache:
          // Aqui você poderia retornar uma página de "Você está offline" customizada se quisesse.
          // return caches.match('./offline.html');
        });
    })
  );
});
