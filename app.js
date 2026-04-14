/**
 * 旅人の杖と救いの泉 Ver 2.1.0
 * 総指揮官専用・MapTilerカスタムマップ完全統合版
 */

// 1. マップの初期化
const map = L.map('map', { center: [34.6937, 135.5023], zoom: 13, maxZoom: 19, zoomControl: false });

// 2. 総指揮官専用のカスタムマップ（真のID: 019d8b1d... を使用）
// 🚨 key= の後ろの【】部分を、ご自身の新しいAPIキーに書き換えてください。
const customMap = L.tileLayer('https://api.maptiler.com/maps/019d8b1d-1989-74cd-b70b-2ba296c30f3e/256/{z}/{x}/{y}.png?key=GloGcr9XQvZ6g4JrFj0x', {
    maxZoom: 19,
    attribution: '© <a href="https://www.maptiler.com/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// カスタムマップを画面に表示
customMap.addTo(map);
map.attributionControl.setPosition('bottomleft');

// 3. アイコンの設定
const icons = {
    blue: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }),
    green: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }),
    purple: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }),
    orange: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] })
};

// 4. 名称取得の補助関数
function getFeatureName(p) {
    if (!p) return "名称未定";
    let name = p.name || p.名称 || p.屋号 || p.地区名 || p.観光資源名 || p.指定名称 || p.文化財名 || p.通称 || "名称未定";
    if (String(name) === "0" || name === "" || name === null) name = "名称未定";
    return name;
}

// 5. ルート（線）のスタイル設定
function getRouteStyle(feature) {
    const name = getFeatureName(feature.properties);
    if (name.includes("東海自然歩道本線以外")) return { color: "#0052cc", weight: 4, opacity: 0.8 }; 
    if (name.includes("東海自然歩道")) return { color: "#27ae60", weight: 6, opacity: 0.9 }; 
    const palettes = { "東海道": "#0052cc", "中山道": "#d91e18", "甲州街道": "#f39c12", "奥州街道": "#8e44ad", "日光街道": "#16a085" };
    for (let key in palettes) { if (name.includes(key)) return { color: palettes[key], weight: 5, opacity: 0.8 }; }
    return { color: "#FF1493", weight: 4, opacity: 0.8 };
}

// 6. レイヤーの定義
const layerDefs = {
    rel: { url: 'rel.geojson', icon: icons.blue }, park: { url: 'park.geojson', icon: icons.blue },
    com: { url: 'com.geojson', icon: icons.green }, mus: { url: 'mus.geojson', icon: icons.green },
    gym: { url: 'gym.geojson', icon: icons.green }, cul: { url: 'cul.geojson', icon: icons.green },
    wc: { url: 'wc.geojson', isCircle: true },
    keikan: { url: 'A35b_景観地区_近畿.geojson', style: {color: '#1E90FF', weight: 2, fillOpacity: 0.3} },
    tree: { url: 'A35c_景観重要建造物樹木_近畿.geojson', style: {color: '#32CD32', weight: 2, fillOpacity: 0.3} },
    fudo: { url: 'A42_歴史的風土保存区域_近畿.geojson', style: {color: '#8B4513', weight: 2, fillOpacity: 0.3} },
    denken: { url: 'A43_伝統的建造物群保存地区_近畿.geojson', style: {color: '#800080', weight: 2, fillOpacity: 0.3} },
    fuchi: { url: 'A44_歴史的風致重点地区_近畿.geojson', style: {color: '#FFD700', weight: 2, fillOpacity: 0.3} },
    kanko: { url: 'P12_観光資源_近畿.geojson', style: {color: '#FF8C00', weight: 2, fillOpacity: 0.3} },
    restaurants: { url: 'restaurant.geojson', icon: icons.orange }, trail: { url: 'OSM_trail.geojson', icon: icons.purple },
    shizenhodo: { url: 'TokaiNatureTrail_Route.geojson', style: getRouteStyle }, gokaido: { url: 'gokaido_routes.geojson', style: getRouteStyle }
};

// 即時読み込みするレイヤー
const immediateLayers = ['keikan', 'tree', 'fudo', 'denken', 'fuchi', 'kanko', 'trail', 'shizenhodo', 'gokaido'];
const rawData = {}; const layers = {};
Object.keys(layerDefs).forEach(key => { layers[key] = L.layerGroup(); });

// 7. GeoJSONのレンダリング
function renderGeoJson(key, bounds = null) {
    layers[key].clearLayers();
    const def = layerDefs[key];
    L.geoJSON(rawData[key], {
        filter: function(feature) {
            if (bounds && feature.geometry && feature.geometry.type === "Point") { return bounds.contains(L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0])); }
            return true;
        },
        pointToLayer: function(feature, latlng) {
            if(def.isCircle) return L.circleMarker(latlng, { radius: 6, fillColor: 'red', color: '#fff', weight: 2, fillOpacity: 0.8 });
            return L.marker(latlng, { icon: def.icon || new L.Icon.Default() });
        },
        style: def.style,
        onEachFeature: function(feature, layer) { layer.bindPopup(`<strong>${getFeatureName(feature.properties)}</strong>`); }
    }).addTo(layers[key]);
}

// 8. データのフェッチ
async function fetchAllData() {
    for (const [key, def] of Object.entries(layerDefs)) {
        try {
            const res = await fetch(def.url);
            if(res.ok) { rawData[key] = await res.json(); if (immediateLayers.includes(key)) renderGeoJson(key); }
        } catch (e) { console.error(`Failed to load ${key}:`, e); }
    }
}
fetchAllData();

// 9. レイヤーコントロールの設定（背景切り替えなし、オーバーレイのみ）
const overlayMaps = {
    "♟️ 道標": layers.rel, "🌳 公園・遊具": layers.park, "🏟️ 公共施設": layers.com, "📚 文化施設": layers.mus, "🏃‍♂️ 体育施設": layers.gym, "🏯 文化財": layers.cul, "🚾 トイレ (赤丸)": layers.wc,
    "🏞️ 景観地区": layers.keikan, "🌲 景観重要建造物樹木": layers.tree, "📜 歴史的風土保存区域": layers.fudo, "🏘️ 伝統的建造物群保存地区": layers.denken, "🗺️ 歴史的風致重点地区": layers.fuchi, "🎆 観光資源": layers.kanko, 
    "🍽️ 喫茶店・レストラン": layers.restaurants, "🐾 トレイル.古道": layers.trail, "🛤️ 東海自然歩道": layers.shizenhodo, "🛣️ 五街道": layers.gokaido
};

// 初期表示するオーバーレイ
layers.rel.addTo(map); layers.park.addTo(map); layers.com.addTo(map);
layers.mus.addTo(map); layers.gym.addTo(map); layers.cul.addTo(map);

// コントロールを追加（第一引数を null にすることで背景切り替えを非表示にする）
L.control.layers(null, overlayMaps, {collapsed: false, position: 'topleft'}).addTo(map);

// 10. 見出しの挿入ロジック
function insertCategoryHeaders() {
    document.querySelectorAll('.custom-layer-header').forEach(el => el.remove());
    document.querySelectorAll('.leaflet-control-layers-overlays label').forEach(label => {
        const text = label.textContent.trim();
        let headerHtml = "";
        if (text.includes("道標")) headerHtml = "<div class='custom-layer-header' style='font-size:1.05em; font-weight:bold; color:#1565C0; margin-top:5px; margin-bottom:10px;'>【基本探索】</div>";
        else if (text.includes("景観地区")) headerHtml = "<div class='custom-layer-header' style='margin:18px 0 10px 0;'><hr style='margin:0 0 12px 0; border:0; border-top:1px solid #ddd;'><div style='font-size:1.05em; font-weight:bold; color:#E65100;'>【広域地域データ】</div></div>";
        else if (text.includes("喫茶店")) headerHtml = "<div class='custom-layer-header' style='margin:18px 0 10px 0;'><hr style='margin:0 0 12px 0; border:0; border-top:1px solid #ddd;'><div style='font-size:1.05em; font-weight:bold; color:#2E7D32;'>【上級者向け】</div></div>";
        if (headerHtml) label.insertAdjacentHTML('beforebegin', headerHtml);
    });
}
insertCategoryHeaders();
map.on('layeradd layerremove', () => setTimeout(insertCategoryHeaders, 10));

// 11. スキャンボタンの設定
const SCAN_ZOOM = 15;
const scanBtn = document.getElementById('scan-btn');
function updateScanBtn() {
    if(!scanBtn) return;
    if (map.getZoom() >= SCAN_ZOOM) { scanBtn.classList.remove('disabled'); scanBtn.disabled = false; scanBtn.innerText = "📡 周囲をスキャン"; }
    else { scanBtn.classList.add('disabled'); scanBtn.disabled = true; scanBtn.innerText = "もっと近づいてスキャン"; }
}
map.on('zoomend', updateScanBtn);
updateScanBtn();

scanBtn?.addEventListener('click', () => {
    if (map.getZoom() < SCAN_ZOOM) return;
    scanBtn.innerText = "🔄 スキャン中..."; scanBtn.classList.add('disabled');
    const bounds = map.getBounds();
    setTimeout(() => {
        Object.keys(layerDefs).forEach(key => { if (!immediateLayers.includes(key) && map.hasLayer(layers[key]) && rawData[key]) renderGeoJson(key, bounds); });
        scanBtn.innerText = "📡 周囲をスキャン"; scanBtn.classList.remove('disabled');
    }, 600);
});

// 12. UIボタン類
document.getElementById('menu-btn')?.addEventListener('click', (e) => { e.stopPropagation(); document.body.classList.toggle('menu-open'); });
document.getElementById('help-btn')?.addEventListener('click', () => { window.location.href = "help.html"; });
document.getElementById('license-btn')?.addEventListener('click', () => { window.location.href = "license.html"; });
document.getElementById('location-btn')?.addEventListener('click', () => { map.locate({setView: true, maxZoom: 16}); });

// 13. ローディング画面の制御
function hideLoadingScreen() {
    const s = document.getElementById('loading-screen');
    if(s && s.style.display !== 'none') { s.style.opacity = '0'; setTimeout(() => s.style.display = 'none', 800); }
}
window.addEventListener('load', () => setTimeout(hideLoadingScreen, 1500));
setTimeout(hideLoadingScreen, 4000);

// 14. 位置情報の取得
map.on('locationfound', (e) => { L.circleMarker(e.latlng, {radius: 8, fillColor: '#007BFF', color: '#fff', weight: 2, fillOpacity: 1}).addTo(map).bindPopup("現在地").openPopup(); });
