/**
 * 旅人の杖と救いの泉 Ver 2.0.1 (UI・バグ修正版)
 */

const map = L.map('map', { center: [34.6937, 135.5023], zoom: 13, maxZoom: 19, zoomControl: false });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);

const icons = {
    blue: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }),
    green: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }),
    purple: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }),
    orange: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] })
};

const layers = {
    rel: L.layerGroup(), park: L.layerGroup(), com: L.layerGroup(), mus: L.layerGroup(),
    gym: L.layerGroup(), cul: L.layerGroup(), wc: L.layerGroup(), keikan: L.layerGroup(),
    tree: L.layerGroup(), fudo: L.layerGroup(), denken: L.layerGroup(), fuchi: L.layerGroup(),
    kanko: L.layerGroup(), restaurants: L.layerGroup(), trail: L.layerGroup(),
    shizenhodo: L.layerGroup(), gokaido: L.layerGroup()
};

// 🚨 トイレバグ修正
async function loadPointData(url, layerGroup, icon, popupTemplate) {
    try {
        const res = await fetch(url);
        const data = await res.json();
        L.geoJSON(data, {
            pointToLayer: (feature, latlng) => {
                if (url.includes('wc.geojson')) {
                    return L.circleMarker(latlng, { radius: 6, fillColor: 'red', color: '#fff', weight: 2, fillOpacity: 0.8 });
                }
                // iconが指定されていない場合のエラー回避
                return L.marker(latlng, { icon: icon || new L.Icon.Default() }); 
            },
            onEachFeature: (feature, layer) => {
                let name = feature.properties.name || feature.properties.名称 || "名称未定";
                layer.bindPopup(`<strong>${name}</strong><br>${popupTemplate || ""}`);
            }
        }).addTo(layerGroup);
    } catch (e) { console.error(`Failed to load ${url}:`, e); }
}

async function loadGeometryData(url, layerGroup, style) {
    try {
        const res = await fetch(url);
        const data = await res.json();
        L.geoJSON(data, {
            style: style,
            onEachFeature: (feature, layer) => {
                let name = feature.properties.name || feature.properties.名称 || "指定区域";
                layer.bindPopup(`<strong>${name}</strong>`);
            }
        }).addTo(layerGroup);
    } catch (e) { console.error(`Failed to load ${url}:`, e); }
}

// データ読み込み
loadPointData('data/rel.geojson', layers.rel, icons.blue);
loadPointData('data/park.geojson', layers.park, icons.blue);
loadPointData('data/com.geojson', layers.com, icons.green);
loadPointData('data/mus.geojson', layers.mus, icons.green);
loadPointData('data/gym.geojson', layers.gym, icons.green);
loadPointData('data/cul.geojson', layers.cul, icons.green);
loadPointData('data/wc.geojson', layers.wc); // トイレ修正完了
loadGeometryData('data/A35b_景観地区_近畿.geojson', layers.keikan, {color: '#1E90FF', weight: 2, fillOpacity: 0.3});
loadGeometryData('data/A35c_景観重要建造物樹木_近畿.geojson', layers.tree, {color: '#32CD32', weight: 2, fillOpacity: 0.3});
loadGeometryData('data/A42_歴史的風土保存区域_近畿.geojson', layers.fudo, {color: '#8B4513', weight: 2, fillOpacity: 0.3});
loadGeometryData('data/A43_伝統的建造物群保存地区_近畿.geojson', layers.denken, {color: '#800080', weight: 2, fillOpacity: 0.3});
loadGeometryData('data/A44_歴史的風致重点地区_近畿.geojson', layers.fuchi, {color: '#FFD700', weight: 2, fillOpacity: 0.3});
loadGeometryData('data/P12_観光資源_近畿.geojson', layers.kanko, {color: '#FF8C00', weight: 2, fillOpacity: 0.3});
loadPointData('data/restaurants_0_0_8.geojson', layers.restaurants, icons.orange, "※10m程度の誤差あり");
loadPointData('data/OSM_trail_ancient-road.geojson', layers.trail, icons.purple);
loadGeometryData('data/TokaiNatureTrail_Route.geojson', layers.shizenhodo, {color: '#2E8B57', weight: 4});
loadGeometryData('data/gokaido_routes.geojson', layers.gokaido, {color: '#B22222', weight: 4});

const baseMaps = {};
const overlayMaps = {
    "<span style='font-size:1.05em; font-weight:bold; color:#1565C0;'>【基本探索】</span><br>♟️ 探索地点": layers.rel,
    "🌳 公園・遊具": layers.park, "🏟️ 公共施設": layers.com, "📚 文化施設": layers.mus, "🏃‍♂️ 体育施設": layers.gym,
    "🏯 文化財": layers.cul, "🚾 トイレ (赤丸)": layers.wc,
    "<hr style='margin:6px 0;'><span style='font-size:1.05em; font-weight:bold; color:#E65100;'>【広域地域データ】</span><br>🏞️ 景観地区": layers.keikan,
    "🌲 景観重要建造物樹木": layers.tree, "📜 歴史的風土保存区域": layers.fudo, "🏘️ 伝統的建造物群保存地区": layers.denken,
    "🗺️ 歴史的風致重点地区": layers.fuchi, "🎆 観光資源": layers.kanko, "🍽️ 飲食店データ": layers.restaurants,
    "<hr style='margin:6px 0;'><span style='font-size:1.05em; font-weight:bold; color:#2E7D32;'>【上級者向け】</span><br>🐾 トレイル.古道": layers.trail,
    "🛤️ 東海自然歩道": layers.shizenhodo, "🛣️ 五街道": layers.gokaido
};

layers.rel.addTo(map); layers.park.addTo(map); layers.com.addTo(map);
layers.mus.addTo(map); layers.gym.addTo(map); layers.cul.addTo(map);

// メニューを左上に配置
const layerControl = L.control.layers(baseMaps, overlayMaps, {collapsed: true, position: 'topleft'}).addTo(map);

let advanceWarningShown = false;
map.on('overlayadd', function(e) {
    if (e.name.includes('飲食店データ')) alert("このデータは変換による誤差、および閉店の可能性があります。");
    if (e.name.includes('トレイル.古道') || e.name.includes('東海自然歩道') || e.name.includes('五街道')) {
        if (!advanceWarningShown) { alert("【上級者向け警告】\n難易度の高いルートが含まれます。事前に計画を立てましょう。"); advanceWarningShown = true; }
    }
});

// UIイベント
window.addEventListener('load', () => { setTimeout(() => { const s = document.getElementById('loading-screen'); if(s){ s.style.opacity = '0'; setTimeout(()=> s.style.display='none', 800); } }, 3000); });
document.getElementById('menu-btn').addEventListener('click', (e) => { e.stopPropagation(); const c = document.querySelector('.leaflet-control-layers'); c.classList.contains('leaflet-control-layers-expanded') ? layerControl.collapse() : layerControl.expand(); });

// ヘルプモーダル
const helpModal = document.getElementById('help-modal');
document.getElementById('help-btn').addEventListener('click', () => helpModal.style.display = "block");
document.getElementById('close-help').onclick = () => helpModal.style.display = "none";
window.onclick = (e) => { if (e.target == helpModal) helpModal.style.display = "none"; };

// 🧭 現在地スキャン
document.getElementById('scan-btn').addEventListener('click', () => {
    map.locate({setView: true, maxZoom: 16});
});
map.on('locationfound', (e) => {
    L.circleMarker(e.latlng, {radius: 8, fillColor: '#007BFF', color: '#fff', weight: 2, fillOpacity: 1}).addTo(map).bindPopup("現在地").openPopup();
});
map.on('locationerror', () => { alert("現在地を取得できませんでした。端末の位置情報設定を確認してください。"); });

// 📜 ライセンスボタン（別ページを開く）
const LicenseControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd: function() {
        const btn = L.DomUtil.create('button', 'license-info-btn');
        btn.innerHTML = "📜 規約・出典";
        btn.style.padding = "5px"; btn.style.cursor = "pointer"; btn.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
        // 🚨ここがポイント：新しいページ（license.html）を開く
        btn.onclick = () => window.location.href = "license.html";
        return btn;
    }
});
map.addControl(new LicenseControl());
