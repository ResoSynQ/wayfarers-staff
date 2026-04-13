/**
 * 旅人の杖と救いの泉 Ver 2.0.1
 * メインロジック（スキャン描画制御版）
 */

const map = L.map('map', { center: [34.6937, 135.5023], zoom: 13, maxZoom: 19, zoomControl: false });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);

// --- アイコン定義 ---
const icons = {
    blue: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }),
    green: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }),
    purple: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] }),
    orange: new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] })
};

// --- データ設計図（読み込みURLと描画設定） ---
const layerDefs = {
    rel: { url: 'data/rel.geojson', icon: icons.blue },
    park: { url: 'data/park.geojson', icon: icons.blue },
    com: { url: 'data/com.geojson', icon: icons.green },
    mus: { url: 'data/mus.geojson', icon: icons.green },
    gym: { url: 'data/gym.geojson', icon: icons.green },
    cul: { url: 'data/cul.geojson', icon: icons.green },
    wc: { url: 'data/wc.geojson', isCircle: true },
    keikan: { url: 'data/A35b_景観地区_近畿.geojson', style: {color: '#1E90FF', weight: 2, fillOpacity: 0.3} },
    tree: { url: 'data/A35c_景観重要建造物樹木_近畿.geojson', style: {color: '#32CD32', weight: 2, fillOpacity: 0.3} },
    fudo: { url: 'data/A42_歴史的風土保存区域_近畿.geojson', style: {color: '#8B4513', weight: 2, fillOpacity: 0.3} },
    denken: { url: 'data/A43_伝統的建造物群保存地区_近畿.geojson', style: {color: '#800080', weight: 2, fillOpacity: 0.3} },
    fuchi: { url: 'data/A44_歴史的風致重点地区_近畿.geojson', style: {color: '#FFD700', weight: 2, fillOpacity: 0.3} },
    kanko: { url: 'data/P12_観光資源_近畿.geojson', style: {color: '#FF8C00', weight: 2, fillOpacity: 0.3} },
    restaurants: { url: 'data/restaurants_0_0_8.geojson', icon: icons.orange, popup: "※10m程度の誤差あり" },
    trail: { url: 'data/OSM_trail_ancient-road.geojson', icon: icons.purple },
    shizenhodo: { url: 'data/TokaiNatureTrail_Route.geojson', style: {color: '#2E8B57', weight: 4} },
    gokaido: { url: 'data/gokaido_routes.geojson', style: {color: '#B22222', weight: 4} }
};

const rawData = {}; // 読み込んだ元データを格納
const layers = {};  // マップに表示するレイヤーグループ

// 空のレイヤーグループを準備
Object.keys(layerDefs).forEach(key => { layers[key] = L.layerGroup(); });

// データのバックグラウンド読み込み
async function fetchAllData() {
    for (const [key, def] of Object.entries(layerDefs)) {
        try {
            const res = await fetch(def.url);
            rawData[key] = await res.json();
        } catch (e) { console.error(`Failed to load ${key}:`, e); }
    }
}
fetchAllData();

// --- メニューの構築 ---
// ヘルプとライセンス用の「ダミーレイヤー」を作成
const dummyHelp = L.layerGroup();
const dummyLicense = L.layerGroup();

const baseMaps = {};
const overlayMaps = {
    "<span style='font-size:1.05em; font-weight:bold; color:#1565C0;'>【基本探索】</span><br>♟️ 探索地点": layers.rel,
    "🌳 公園・遊具": layers.park, "🏟️ 公共施設": layers.com, "📚 文化施設": layers.mus, "🏃‍♂️ 体育施設": layers.gym,
    "🏯 文化財": layers.cul, "🚾 トイレ (赤丸)": layers.wc,
    "<hr style='margin:6px 0;'><span style='font-size:1.05em; font-weight:bold; color:#E65100;'>【広域地域データ】</span><br>🏞️ 景観地区": layers.keikan,
    "🌲 景観重要建造物樹木": layers.tree, "📜 歴史的風土保存区域": layers.fudo, "🏘️ 伝統的建造物群保存地区": layers.denken,
    "🗺️ 歴史的風致重点地区": layers.fuchi, "🎆 観光資源": layers.kanko, "🍽️ 飲食店データ": layers.restaurants,
    "<hr style='margin:6px 0;'><span style='font-size:1.05em; font-weight:bold; color:#2E7D32;'>【上級者向け】</span><br>🐾 トレイル.古道": layers.trail,
    "🛤️ 東海自然歩道": layers.shizenhodo, "🛣️ 五街道": layers.gokaido,
    "<hr style='margin:6px 0;'><span style='font-size:1.05em; font-weight:bold; color:#444;'>【その他】</span><br>❓ ヘルプ": dummyHelp,
    "🗺️ ライセンス": dummyLicense
};

// 初期表示でONにするレイヤー（※データ自体はスキャンするまで表示されない）
layers.rel.addTo(map); layers.park.addTo(map); layers.com.addTo(map);
layers.mus.addTo(map); layers.gym.addTo(map); layers.cul.addTo(map);

const layerControl = L.control.layers(baseMaps, overlayMaps, {collapsed: true, position: 'topleft'}).addTo(map);

// --- スキャン機能（ズーム制御と描画） ---
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
updateScanBtn(); // 初期化

// スキャン実行
scanBtn.addEventListener('click', () => {
    if (map.getZoom() < SCAN_ZOOM) return;

    // アニメーション
    const originalText = scanBtn.innerText;
    scanBtn.innerText = "🔄 スキャン中...";
    scanBtn.classList.add('disabled');
    
    const bounds = map.getBounds();

    // 0.6秒後に描画（スキャンしてる感を演出）
    setTimeout(() => {
        Object.keys(layerDefs).forEach(key => {
            // メニューでチェックが入っている（mapに追加されている）レイヤーのみ処理
            if (map.hasLayer(layers[key]) && rawData[key]) {
                layers[key].clearLayers(); // 古いピンを消去
                const def = layerDefs[key];

                L.geoJSON(rawData[key], {
                    filter: function(feature) {
                        // 点データは画面内（Bounds）にあるものだけを抽出して軽くする！
                        if(feature.geometry.type === "Point") {
                            const latlng = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
                            return bounds.contains(latlng);
                        }
                        return true; // 面や線はそのまま描画
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

// --- 安全装置＆メニューハック ---
let advanceWarningShown = false;

map.on('overlayadd', function(e) {
    // 飲食・上級者ルートの警告
    if (e.name.includes('飲食店データ')) alert("このデータは変換による誤差、および閉店の可能性があります。");
    if (e.name.includes('トレイル') || e.name.includes('東海自然歩道') || e.name.includes('五街道')) {
        if (!advanceWarningShown) { alert("【上級者向け警告】\n難易度の高いルートが含まれます。事前に計画を立てましょう。"); advanceWarningShown = true; }
    }
    
    // 【魔法】メニュー内の「ヘルプ」「ライセンス」をクリックした時の処理
    if (e.layer === dummyHelp) {
        map.removeLayer(dummyHelp); // チェックを即座に外す
        document.getElementById('help-modal').style.display = "block";
    }
    if (e.layer === dummyLicense) {
        map.removeLayer(dummyLicense); // チェックを即座に外す
        window.location.href = "license.html";
    }
});

// --- UI操作 ---
window.addEventListener('load', () => { setTimeout(() => { const s = document.getElementById('loading-screen'); if(s){ s.style.opacity = '0'; setTimeout(()=> s.style.display='none', 800); } }, 3000); });
document.getElementById('menu-btn').addEventListener('click', (e) => { e.stopPropagation(); const c = document.querySelector('.leaflet-control-layers'); c.classList.contains('leaflet-control-layers-expanded') ? layerControl.collapse() : layerControl.expand(); });
const helpModal = document.getElementById('help-modal');
document.getElementById('close-help').onclick = () => helpModal.style.display = "none";
window.onclick = (e) => { if (e.target == helpModal) helpModal.style.display = "none"; };

// 🧭 現在地取得
document.getElementById('location-btn').addEventListener('click', () => { map.locate({setView: true, maxZoom: 16}); });
map.on('locationfound', (e) => { L.circleMarker(e.latlng, {radius: 8, fillColor: '#007BFF', color: '#fff', weight: 2, fillOpacity: 1}).addTo(map).bindPopup("現在地").openPopup(); });
map.on('locationerror', () => { alert("現在地を取得できませんでした。端末の位置情報設定を確認してください。"); });
