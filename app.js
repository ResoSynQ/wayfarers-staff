/**
 * 旅人の杖と救いの泉 Ver 2.0
 * 心臓部：app.js (アイコン・色分け完全分離版)
 */

// --- 1. マップの初期化 ---
const map = L.map('map', {
    center: [34.6937, 135.5023], // 大阪周辺
    zoom: 13,
    maxZoom: 19, // ズーム限界突破
    zoomControl: false // 標準コントロールを消して独自ボタンに合わせる
});

// ベースマップ（OpenStreetMap）
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// --- 2. アイコンの定義 ---
const icons = {
    blue: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    }),
    green: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    }),
    purple: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    }),
    orange: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    })
};

// --- 3. データレイヤーの準備 (全ファイル独立) ---
const layers = {
    // 【基本探索】
    rel: L.layerGroup(),
    park: L.layerGroup(),
    com: L.layerGroup(),
    mus: L.layerGroup(),
    gym: L.layerGroup(),
    cul: L.layerGroup(),
    wc: L.layerGroup(),

    // 【探索候補・広域地域データ】
    keikan: L.layerGroup(),
    tree: L.layerGroup(),
    fudo: L.layerGroup(),
    denken: L.layerGroup(),
    fuchi: L.layerGroup(),
    kanko: L.layerGroup(),
    restaurants: L.layerGroup(),

    // 【上級者向け】
    trail: L.layerGroup(),
    shizenhodo: L.layerGroup(),
    gokaido: L.layerGroup()
};

// --- 4. GeoJSON読み込み・描写関数 ---
async function loadPointData(url, layerGroup, icon, popupTemplate) {
    try {
        const res = await fetch(url);
        const data = await res.json();
        L.geoJSON(data, {
            pointToLayer: (feature, latlng) => {
                if (url.includes('wc.geojson')) {
                    // トイレは赤丸
                    return L.circleMarker(latlng, { radius: 6, fillColor: 'red', color: '#fff', weight: 2, fillOpacity: 0.8 });
                }
                return L.marker(latlng, { icon: icon });
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

// --- 5. データの流し込み（完全指定通りの色・アイコン） ---

// 🔵🟢🔴 基本探索 (Ver1.0継続)
loadPointData('data/rel.geojson', layers.rel, icons.blue);
loadPointData('data/park.geojson', layers.park, icons.blue);
loadPointData('data/com.geojson', layers.com, icons.green);
loadPointData('data/mus.geojson', layers.mus, icons.green);
loadPointData('data/gym.geojson', layers.gym, icons.green);
loadPointData('data/cul.geojson', layers.cul, icons.green);
loadPointData('data/wc.geojson', layers.wc); // 赤丸

// 🔲 面・ポリゴン (新設データ)
loadGeometryData('data/A35b_景観地区_近畿.geojson', layers.keikan, {color: '#1E90FF', weight: 2, fillOpacity: 0.3}); // 🟦 青
loadGeometryData('data/A35c_景観重要建造物樹木_近畿.geojson', layers.tree, {color: '#32CD32', weight: 2, fillOpacity: 0.3}); // 🟩 緑
loadGeometryData('data/A42_歴史的風土保存区域_近畿.geojson', layers.fudo, {color: '#8B4513', weight: 2, fillOpacity: 0.3}); // 🟫 茶
loadGeometryData('data/A43_伝統的建造物群保存地区_近畿.geojson', layers.denken, {color: '#800080', weight: 2, fillOpacity: 0.3}); // 🟪 紫
loadGeometryData('data/A44_歴史的風致重点地区_近畿.geojson', layers.fuchi, {color: '#FFD700', weight: 2, fillOpacity: 0.3}); // 🟨 黄
loadGeometryData('data/P12_観光資源_近畿.geojson', layers.kanko, {color: '#FF8C00', weight: 2, fillOpacity: 0.3}); // 🟧 オレンジ

// 📍 新設ピンデータ
loadPointData('data/restaurants_0_0_8.geojson', layers.restaurants, icons.orange, "※10m程度の誤差あり"); // 🍽️ オレンジピン
loadPointData('data/OSM_trail_ancient-road.geojson', layers.trail, icons.purple); // 🐾 紫ピン

// 〰️ 線・ルートデータ
loadGeometryData('data/TokaiNatureTrail_Route.geojson', layers.shizenhodo, {color: '#2E8B57', weight: 4}); // 緑の線
loadGeometryData('data/gokaido_routes.geojson', layers.gokaido, {color: '#B22222', weight: 4}); // 赤の線

// --- 6. メニューの構築（仕切り線＆独立表示） ---
const baseMaps = {};
const overlayMaps = {
    // CSSを流し込んで擬似的な見出しを作るプロの技！
    "<span style='font-size:1.05em; font-weight:bold; color:#1565C0;'>【基本探索】</span><br>♟️ 探索地点 (道標/史跡等)": layers.rel,
    "🌳 公園・遊具": layers.park,
    "🏟️ 公共施設": layers.com,
    "📚 文化施設": layers.mus,
    "🏃‍♂️ 体育施設": layers.gym,
    "🏯 文化財": layers.cul,
    "🚾 トイレ (赤丸)": layers.wc,

    "<hr style='margin:6px 0;'><span style='font-size:1.05em; font-weight:bold; color:#E65100;'>【探索候補・広域地域データ】</span><br>🏞️ 景観地区 (青枠)": layers.keikan,
    "🌲 景観重要建造物樹木 (緑枠)": layers.tree,
    "📜 歴史的風土保存区域 (茶枠)": layers.fudo,
    "🏘️ 伝統的建造物群保存地区 (紫枠)": layers.denken,
    "🗺️ 歴史的風致重点地区 (黄枠)": layers.fuchi,
    "🎆 観光資源 (オレンジ枠)": layers.kanko,
    "🍽️ 飲食店データ (オレンジピン)": layers.restaurants,

    "<hr style='margin:6px 0;'><span style='font-size:1.05em; font-weight:bold; color:#2E7D32;'>【上級者向け・長距離踏破】</span><br>🐾 トレイル.古道 (紫ピン)": layers.trail,
    "🛤️ 東海自然歩道 (緑線)": layers.shizenhodo,
    "🛣️ 五街道 (赤線)": layers.gokaido
};

// 基本探索ピンのみ、初期状態からマップ上にONにしておく
layers.rel.addTo(map);
layers.park.addTo(map);
layers.com.addTo(map);
layers.mus.addTo(map);
layers.gym.addTo(map);
layers.cul.addTo(map);

const layerControl = L.control.layers(baseMaps, overlayMaps, {collapsed: true}).addTo(map);

// --- 7. 安全装置（警告ポップアップ） ---
let advanceWarningShown = false;

map.on('overlayadd', function(e) {
    // 文字列の一部が含まれているかで判定（HTMLタグを無視するため）
    if (e.name.includes('飲食店データ')) {
        alert("このデータはジオコーディング変換による10m前後の誤差、および閉店の可能性があります。訪問の際はご注意ください。");
    }
    if (e.name.includes('トレイル.古道') || e.name.includes('東海自然歩道') || e.name.includes('五街道')) {
        if (!advanceWarningShown) {
            alert("【上級者向け警告】\n難易度の高い登山ルートや長距離トレイルが含まれます。事前に計画を立て、予定を周囲に伝えてから出発しましょう。");
            advanceWarningShown = true;
        }
    }
});

// --- 8. UI制御（ローディング・メニュー・ライセンス） ---
// 3秒間ローディング画面を維持
window.addEventListener('load', () => {
    setTimeout(() => {
        const screen = document.getElementById('loading-screen');
        if (screen) {
            screen.style.opacity = '0';
            setTimeout(() => screen.style.display = 'none', 800);
        }
    }, 3000);
});

// 三本線ボタンでレイヤーコントロールを強制的に開閉
const menuBtn = document.getElementById('menu-btn');
if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const controlContainer = document.querySelector('.leaflet-control-layers');
        if (controlContainer.classList.contains('leaflet-control-layers-expanded')) {
            layerControl.collapse();
        } else {
            layerControl.expand();
        }
    });
}

// ライセンスモーダル制御
const modal = document.getElementById('license-modal');
const closeBtn = document.querySelector('.close-btn');
if(closeBtn) closeBtn.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; }

// ライセンスボタン追加
const LicenseControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd: function() {
        const btn = L.DomUtil.create('button', 'license-info-btn');
        btn.innerHTML = "📜 規約・出典";
        btn.style.padding = "5px";
        btn.style.cursor = "pointer";
        btn.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
        btn.style.border = "2px solid rgba(0,0,0,0.2)";
        btn.style.borderRadius = "4px";
        btn.onclick = () => modal.style.display = "block";
        return btn;
    }
});
map.addControl(new LicenseControl());