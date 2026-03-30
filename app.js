/**
 * --- 『旅人の杖と救いの泉』 Logic Core (Ver 1.1) ---
 * 黄金のCSVデータ & 配色ルール 統合版
 */

// 1. 📂 黄金のデータファイル群 (短縮名に統一)
const GEOJSON_FILES = [
    'rel.geojson',  // 🔵 歴史・宗教・道標
    'park.geojson', // 🔵 公園・遊具
    'com.geojson',  // 🟢 公共施設
    'mus.geojson',  // 🟢 文化施設
    'gym.geojson',  // 🟢 体育館
    'cul.geojson',  // 🟢 文化財
    'wc.geojson'    // 🔴 トイレ (赤丸)
];

const SCAN_ZOOM_THRESHOLD = 15; 
let map, userLocationMarker;
let isToiletMode = false;
const rawDataCache = {}; 
const activeMarkersGroup = L.layerGroup(); 

// 2. 🎨 ピンの生成 (ドロップシャドウ付き)
function createPinIcon(color) {
    // style.css の .custom-svg-pin svg { filter: drop-shadow(...) } が適用される
    const svg = `<svg width="28" height="41" viewBox="0 0 28 41" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.268 0 0 6.268 0 14c0 9.844 14 27 14 27s14-17.156 14-27C28 6.268 21.732 0 14 0zm0 20c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z" fill="${color}" stroke="#fff" stroke-width="1.5"/></svg>`;
    return L.divIcon({ 
        className: 'custom-svg-pin', 
        html: svg, 
        iconSize: [28, 41], 
        iconAnchor: [14, 41], 
        popupAnchor: [0, -41] 
    });
}

// 固定色の定義
const bluePinIcon = createPinIcon('#2196F3');  // 🔵 歴史・公園系
const greenPinIcon = createPinIcon('#4CAF50'); // 🟢 公共・文化系

window.onload = function() {
    // 初期表示：大阪近辺 (適宜変更可)
    map = L.map('map', { zoomControl: false }).setView([34.6937, 135.5022], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        attribution: '© OSM contributors' 
    }).addTo(map);
    
    activeMarkersGroup.addTo(map);
    initGeolocation();
    loadGeoJsonData();
    initUiEvents();
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(() => {
            console.log("👷 SW: 杖の魔力(キャッシュ)が充填された。");
        });
    }
};

// 3. 🛰️ GPS制御
function initGeolocation() {
    if (!navigator.geolocation) return;
    const dot = L.divIcon({ 
        className: 'user-dot', 
        html: '<div style="width:16px;height:16px;background:#2196F3;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>', 
        iconSize: [22, 22] 
    });
    navigator.geolocation.watchPosition((pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (userLocationMarker) {
            userLocationMarker.setLatLng([lat, lng]);
        } else {
            userLocationMarker = L.marker([lat, lng], { icon: dot }).addTo(map);
        }
    }, null, { enableHighAccuracy: true });
}

// 4. 📦 データロード
async function loadGeoJsonData() {
    const promises = GEOJSON_FILES.map(async (f) => {
        try { 
            const res = await fetch(f); 
            if (res.ok) rawDataCache[f] = await res.json(); 
        } catch (e) {
            console.error(`❌ ${f} の召喚に失敗:`, e);
        }
    });
    await Promise.all(promises);
    document.getElementById('loading-screen').classList.add('loaded');
}

// 5. 🔍 スキャンボタンの状態更新
function updateScanButtonState() {
    const scanBtn = document.getElementById('scan-btn');
    if (map.getZoom() < SCAN_ZOOM_THRESHOLD) {
        scanBtn.disabled = true;
        scanBtn.innerText = "もっと近づいてスキャン";
    } else {
        scanBtn.disabled = false;
        scanBtn.innerText = isToiletMode ? "トイレをスキャン" : "周辺をスキャン";
    }
}

// 6. 🪄 周辺スキャン実行
function scanSurrounding() {
    activeMarkersGroup.clearLayers();
    const bounds = map.getBounds();
    
    // サイドバーのチェックボックス状態を取得
    const activeFiles = Array.from(document.querySelectorAll('.category-toggle:checked'))
                            .map(cb => cb.getAttribute('data-file'));
    
    // トイレモードか通常モードかで対象を切り替え
    const targetFiles = isToiletMode ? ['wc.geojson'] : GEOJSON_FILES.filter(f => f !== 'wc.geojson');

    targetFiles.forEach(f => {
        if (!isToiletMode && !activeFiles.includes(f)) return;
        
        const data = rawDataCache[f];
        if (!data || !data.features) return;

        data.features.forEach(feature => {
            const c = feature.geometry.coordinates;
            // GeoJSONは [lng, lat] なので [1, 0] で判定
            if (bounds.contains([c[1], c[0]])) {
                const m = createMarkerByFile(f, [c[1], c[0]], feature.properties);
                if (m) activeMarkersGroup.addLayer(m);
            }
        });
    });
}

// 7. 📍 マーカー生成 (配色統合ロジック)
function createMarkerByFile(fileName, latlng, props) {
    let marker, category = "";
    const name = props.name || "名称不明の地点";

    // A. トイレ (赤い丸)
    if (fileName === 'wc.geojson') {
        marker = L.circleMarker(latlng, { 
            color: 'red', 
            fillColor: '#F44336', 
            fillOpacity: 0.9, 
            radius: 10, 
            weight: 2 
        });
        category = "公衆トイレ";
    } 
    // B. 歴史・宗教・公園系 (青ピン)
    else if (fileName === 'rel.geojson' || fileName === 'park.geojson') {
        marker = L.marker(latlng, { icon: bluePinIcon });
        category = fileName === 'rel.geojson' ? "歴史・宗教・道標" : "公園・遊具";
    } 
    // C. 公共・体育・文化系 (緑ピン)
    else {
        marker = L.marker(latlng, { icon: greenPinIcon });
        if(fileName === 'gym.geojson') category = "体育施設";
        else if(fileName === 'mus.geojson') category = "文化・図書館";
        else if(fileName === 'cul.geojson') category = "文化財";
        else category = "公共施設";
    }

    marker.bindPopup(`
        <div style="text-align:center;">
            <strong style="font-size:1.1rem;">${name}</strong><br>
            <span style="font-size:0.8rem; color:#666;">[${category}]</span>
        </div>
    `);
    return marker;
}

// 8. 📱 UIイベント
function initUiEvents() {
    document.getElementById('sidebar-toggle').addEventListener('click', () => 
        document.getElementById('sidebar').classList.toggle('open')
    );
    
    document.getElementById('locate-btn').addEventListener('click', () => { 
        if (userLocationMarker) map.setView(userLocationMarker.getLatLng(), map.getZoom()); 
    });
    
    document.getElementById('scan-btn').addEventListener('click', scanSurrounding);
    map.on('zoomend', updateScanButtonState);
    updateScanButtonState();

    // トイレモード切替
    document.getElementById('toilet-mode-toggle').addEventListener('change', (e) => {
        isToiletMode = e.target.checked;
        const scanBtn = document.getElementById('scan-btn');
        const reportBtn = document.getElementById('report-wc-btn');
        const toggleText = document.querySelector('.toggle-text');
        
        activeMarkersGroup.clearLayers();
        
        if (isToiletMode) {
            toggleText.innerText = "ON";
            scanBtn.style.backgroundColor = "#F44336";
            reportBtn.classList.remove('hidden');
        } else {
            toggleText.innerText = "OFF";
            scanBtn.style.backgroundColor = "#2196F3";
            reportBtn.classList.add('hidden');
        }
        updateScanButtonState();
    });

    // 通報ボタン
    document.getElementById('report-wc-btn').addEventListener('click', () => {
         if (!userLocationMarker) return;
         const p = userLocationMarker.getLatLng();
         window.location.href = `mailto:info@resosynq.com?subject=トイレに関する連絡&body=緯度:${p.lat} 経度:${p.lng}`;
    });

    // ライセンス
    document.getElementById('license-btn').addEventListener('click', () => 
        document.getElementById('license-overlay').classList.remove('hidden')
    );
    document.getElementById('license-close-btn').addEventListener('click', () => 
        document.getElementById('license-overlay').classList.add('hidden')
    );
}
