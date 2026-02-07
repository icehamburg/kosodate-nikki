const CACHE_NAME = 'kosodate-nikki-v1'

// キャッシュするファイル
const urlsToCache = [
  '/',
  '/auth/',
  '/calendar/',
  '/settings/',
  '/summary/',
  '/export/',
  '/children/new/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// インストール時にキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
  self.skipWaiting()
})

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// ネットワーク優先、失敗時はキャッシュ
self.addEventListener('fetch', (event) => {
  // API リクエストはキャッシュしない
  if (event.request.url.includes('supabase')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功したらキャッシュを更新
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // オフライン時はキャッシュから返す
        return caches.match(event.request)
      })
  )
})
