/**
 * 旅人の杖と救いの泉 Ver 2.0.10
 * メインロジック（道標変更 ＆ 独立ヘルプページ版）
 */

const map = L.map('map', { center: [34.6937, 135.5023], zoom: 13, maxZoom: 19, zoomControl: false });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
map.attributionControl.setPosition('bottomleft');

const icons = {
    blue: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }),
    green: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }),
    purple: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }),
    orange: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] })
};

const layerDefs = {
    rel: { url: 'rel.geojson', icon: icons.blue },
    park: { url: 'park.geojson', icon: icons.blue },
    com: { url: 'com.geojson', icon: icons.green },
    mus: { url: 'mus.geojson', icon: icons.green },
    gym: { url: 'gym.geojson', icon: icons.green },
    cul: { url: 'cul.geojson', icon: icons.green },
    wc: { url: 'wc.geojson', isCircle: true },
    keikan: { url: 'A35b_景観地区_近畿.geojson', style: {color: '#1E90FF', weight: 2, fillOpacity: 0.3} },
    tree: { url: 'A35c_景観重要建造物樹木_近畿.geojson', style: {color: '#32CD32', weight: 2, fillOpacity: 0.3} },
    fudo: { url: 'A42_歴史的風土保存区域_近畿.geojson', style: {color: '#8B4513', weight: 2, fillOpacity: 0.3} },
    denken: { url: 'A43_伝統的建造物群保存地区_近畿.geojson', style: {color: '#800080', weight: 2, fillOpacity: 0.3} },
    fuchi: { url: 'A44_歴史的風致重点地区_近畿.geojson', style: {color: '#FFD700', weight: 2, fillOpacity: 0.3} },
    kanko: { url: 'P12_観光資源_近畿.geojson', style: {color: '#FF8C00', weight: 2, fillOpacity: 0.3} },
    restaurants: { url: 'restaurants_0_0_8.geojson', icon: icons.orange, popup: "※10m程度の誤差あり" },
    trail: { url: 'OSM_relics_of_kinki_38142.geojson', icon: icons.purple },
    shizenhodo: { url: 'TokaiNatureTrail_Route.geojson', style: {color: '#2E8B57', weight: 4} },
    gokaido: { url: 'gokaido_routes.geojson', style: {color: '#B22222', weight: 4} }
};

const rawData = {};
const layers = {};
Object.keys(layerDefs).forEach(key => { layers[key] = L.layerGroup(); });

async function fetchAllData() {
    for (const [key, def] of Object.entries(layerDefs)) {
        try {
            const res = await fetch(def.url);
            if(res.ok) rawData[key] = await res.json();
        } catch (e) { console.error(`Failed to load ${key}:`, e); }
    }
}
fetchAllData();

const baseMaps = {};
const overlayMaps = {
    "♟️ 道標": layers.rel, // 🚨 ここを「道標」に変更！
    "🌳 公園・遊具": layers.park, 
    "🏟️ 公共施設": layers.com, 
    "📚 文化施設": layers.mus, 
    "🏃‍♂️ 体育施設": layers.gym,
    "🏯 文化財": layers.cul, 
    "🚾 トイレ (赤丸)": layers.wc,
    "🏞️ 景観地区": layers.keikan,
    "🌲 景観重要建造物樹木": layers.tree, 
    "📜 歴史的風土保存区域": layers.fudo, 
    "🏘️ 伝統的建造物群保存地区": layers.denken,
    "🗺️ 歴史的風致重点地区": layers.fuchi, 
    "🎆 観光資源": layers.kanko, 
    "🍽️ 飲食店データ": layers.restaurants,
    "🐾 トレイル.古道": layers.trail,
    "🛤️ 東海自然歩道": layers.shizenhodo, 
    "🛣️ 五街道": layers.gokaido
};

layers.rel.addTo(map); layers.park.addTo(map); layers.com.addTo(map);
layers.mus.addTo(map); layers.gym.addTo(map); layers.cul.addTo(map);

const layerControl = L.control.layers(baseMaps, overlayMaps, {collapsed: false, position: 'topleft'}).addTo(map);

function insertCategoryHeaders() {
    document.querySelectorAll('.custom-layer-header').forEach(el => el.remove());
    const labels = document.querySelectorAll('.leaflet-control-layers-overlays label');
    labels.forEach(label => {
        const text = label.textContent.trim();
        let headerHtml = "";
        
        // 🚨 ここも「道標」に反応して見出しをつけるように変更！
        if (text.includes("道標")) {
            headerHtml = "<div class='custom-layer-header' style='font-size:1.05em; font-weight:bold; color:#1565C0; margin-top:5px; margin-bottom:10px;'>【基本探索】</div>";
        } else if (text.includes("景観地区")) {
            headerHtml = "<div class='custom-layer-header' style='margin:18px 0 10px 0;'><hr style='margin:0 0 12px 0; border:0; border-top:1px solid #ddd;'><div style='font-size:1.05em; font-weight:bold; color:#E65100;'>【広域地域データ】</div></div>";
        } else if (text.includes("トレイル.古道")) {
            headerHtml = "<div class='custom-layer-header' style='margin:18px 0 10px 0;'><hr style='margin:0 0 12px 0; border:0; border-top:1px solid #ddd;'><div style='font-size:1.05em; font-weight:bold; color:#2E7D32;'>【上級者向け】</div></div>";
        }
        if (headerHtml) label.insertAdjacentHTML('beforebegin', headerHtml);
    });
}
insertCategoryHeaders();
map.on('layeradd layerremove', () => setTimeout(insertCategoryHeaders, 10));

// --- スキャン機能 ---
const SCAN_ZOOM = 15;
const scanBtn = document.getElementById('scan-btn');

function updateScanBtn() {
    if (map.getZoom() >= SCAN_ZOOM) {
        scanBtn.classList.remove('disabled');
        scanBtn.disabled = false;
        scanBtn.innerText = "📡 周囲をスキャン";
    } else {
        scanBtn.classList.add('disabled');
        scanBtn.disabled = true;
        scanBtn.innerText = "もっと近づいてスキャン";
    }
}
map.on('zoomend', updateScanBtn);
updateScanBtn();

scanBtn.addEventListener('click', () => {
    if (map.getZoom() < SCAN_ZOOM) return;
    scanBtn.innerText = "🔄 スキャン中...";
    scanBtn.classList.add('disabled');
    const bounds = map.getBounds();

    setTimeout(() => {
        Object.keys(layerDefs).forEach(key => {
            if (map.hasLayer(layers[key]) && rawData[key]) {
                layers[key].clearLayers();
                const def = layerDefs[key];
                L.geoJSON(rawData[key], {
                    filter: function(feature) {
                        if(feature.geometry && feature.geometry.type === "Point") {
                            const latlng = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
                            return bounds.contains(latlng);
                        }
                        return true;
                    },
                    pointToLayer: function(feature, latlng) {
                        if(def.isCircle) return L.circleMarker(latlng, { radius: 6, fillColor: 'red', color: '#fff', weight: 2, fillOpacity: 0.8 });
                        return L.marker(latlng, { icon: def.icon || new L.Icon.Default() });
                    },
                    style: def.style,
                    onEachFeature: function(feature, layer) {
                        let name = feature.properties.name || feature.properties.名称 || "名称未定";
                        layer.bindPopup(`<strong>${name}</strong><br>${def.popup || ""}`);
                    }
                }).addTo(layers[key]);
            }
        });
        scanBtn.innerText = "📡 周囲をスキャン";
        scanBtn.classList.remove('disabled');
    }, 600);
});

// --- UI / アラート ---
let advanceWarningShown = false;
map.on('overlayadd', function(e) {
    if (e.name.includes('飲食店データ')) alert("このデータは変換による誤差、および閉店の可能性があります。");
    if (e.name.includes('トレイル') || e.name.includes('東海自然歩道') || e.name.includes('五街道')) {
        if (!advanceWarningShown) { alert("【上級者向け警告】\n難易度の高いルートが含まれます。事前に計画を立てましょう。"); advanceWarningShown = true; }
    }
});

document.getElementById('menu-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.body.classList.toggle('menu-open');
});

// 🚨 ❓ボタンを押したら、総指揮官が作った help.html にジャンプ！
document.getElementById('help-btn').addEventListener('click', () => {
    window.location.href = "help.html";
});
document.getElementById('license-btn').addEventListener('click', () => {
    window.location.href = "license.html";
});

window.addEventListener('load', () => { setTimeout(() => { const s = document.getElementById('loading-screen'); if(s){ s.style.opacity = '0'; setTimeout(()=> s.style.display='none', 800); } }, 3000); });

// 🧭 現在地取得
document.getElementById('location-btn').addEventListener('click', () => { map.locate({setView: true, maxZoom: 16}); });
map.on('locationfound', (e) => { L.circleMarker(e.latlng, {radius: 8, fillColor: '#007BFF', color: '#fff', weight: 2, fillOpacity: 1}).addTo(map).bindPopup("現在地").openPopup(); });
map.on('locationerror', () => { alert("現在地を取得できませんでした。端末の位置情報設定を確認してください。"); });
