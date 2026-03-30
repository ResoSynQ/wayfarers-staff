// --- 『旅人の杖と救いの泉』 Service Worker (Ver 1.0) ---

// キャッシュの名前 (バージョンが変わったらここを書き換えることでデータを更新させる)
const CACHE_NAME = 'wayfarers-staff-cache-v17';

// 【初回アクセス時】に絶対にキャッシュする命のファイルたち
const CACHE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './image_3.webp', // ローディング画面の背景画像
    './icon-512.jpg' // 👈 追加！最強のアプリアイコン
];

// GeoJSONファイルをCACHE_ASSETSに追加
const GEOJSON_FILES = [
    'OSM_relics_of_kinki_38142.geojson',
    'Gov-OSM_Park_30m_merge_17323.geojson',
    'Gov_Public Facilities-Gymnasiums_6278.geojson',
    'Gov_Cultural_Facilities-Libraries_6100.geojson',
    'Gov_cultural_6196.geojson',
    'Local_Toilet_Data_merged_30m_7218_point.geojson'
];
GEOJSON_FILES.forEach(file => CACHE_ASSETS.push(`./${file}`));

// 1. 🪄 [インストール・イベント] (キャッシュへの強制書き込み)
self.addEventListener('install', event => {
    console.log('👷 SW: キャッシュ魔法を詠唱中...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('👷 SW: アセットとGeoJSONデータをキャッシュに強制保存した。これで圏外でも索敵可能だ。');
                return cache.addAll(CACHE_ASSETS);
            })
            .then(() => self.skipWaiting()) // 古いSWを待たずに即座にアクティベート
    );
});

// 2. 🧹 [アクティベート・イベント] (古いキャッシュの証拠隠滅)
self.addEventListener('activate', event => {
    console.log('👷 SW: 古い魔力を証拠隠滅中...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('👷 SW: 古いキャッシュ ' + cache + ' を塵へ還した。');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. 🛡️ [フェッチ・イベント] (圏外での魔法の発動)
self.addEventListener('fetch', event => {
    // 巨大データの読み込み（fetch）が発生した時、通信より先にキャッシュを見に行く
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // キャッシュがあったらそれを返す (これで爆速＆圏外でも動く)
                if (response) {
                    // console.log('👷 SW: キャッシュから魔力を供給したぜ。 Request:', event.request.url);
                    return response;
                }
                // キャッシュがなかったら、仕方なく通信しに行く
                // console.log('👷 SW: キャッシュがねえ！通信魔法を使用する。 Request:', event.request.url);
                return fetch(event.request);
            })
    );
});
