// --- 設定エリア ---
const GEOJSON_FILES = [
    'OSM_relics_of_kinki_38142.geojson',
    'Gov-OSM_Park_30m_merge_17323.geojson',
    'Gov_Public Facilities-Gymnasiums_6278.geojson',
    'Gov_Cultural_Facilities-Libraries_6100.geojson',
    'Gov_cultural_6196.geojson',
    'Local_Toilet_Data_merged_30m_7218_point.geojson'
];
const SCAN_ZOOM_THRESHOLD = 15; 

// --- グローバル変数 ---
let map, userLocationMarker;
let isToiletMode = false;
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const rawDataCache = {}; 
const activeMarkersGroup = L.layerGroup(); 

// --- 🎨 カスタムSVGピンの生成関数 (オフライン最強) ---
function createPinIcon(color) {
    const svg = `<svg width="28" height="41" viewBox="0 0 28 41" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.268 0 0 6.268 0 14c0 9.844 14 27 14 27s14-17.156 14-27C28 6.268 21.732 0 14 0zm0 20c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z" fill="${color}" stroke="#fff" stroke-width="1.5"/></svg>`;
    return L.divIcon({
        className: 'custom-svg-pin',
        html: svg,
        iconSize: [28, 41],
        iconAnchor: [14, 41],
        popupAnchor: [0, -41]
    });
}
const bluePinIcon = createPinIcon('#2196F3');
const greenPinIcon = createPinIcon('#4CAF50');

window.onload = function() {
    map = L.map('map', { zoomControl: false }).setView([34.6937, 135.5022], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    activeMarkersGroup.addTo(map);

    initGeolocation();
    loadGeoJsonData();
    initUiEvents();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
};

function initGeolocation() {
    if (!navigator.geolocation) return;
    const pulsingBlueDot = L.divIcon({ className: 'user-location-marker', html: '<div style="width:16px;height:16px;background:#2196F3;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>', iconSize: [22, 22] });
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude: lat, longitude: lng } = position.coords;
            if (userLocationMarker) userLocationMarker.setLatLng([lat, lng]);
            else userLocationMarker = L.marker([lat, lng], { icon: pulsingBlueDot }).addTo(map);
        },
        (error) => console.error("GPS Error:", error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
}

async function loadGeoJsonData() {
    const promises = GEOJSON_FILES.map(async (fileName) => {
        try {
            const res = await fetch(fileName);
            if (res.ok) rawDataCache[fileName] = await res.json();
        } catch (e) { console.error(fileName, "Error", e); }
    });
    await Promise.all(promises);
    document.getElementById('loading-screen').classList.add('loaded');
}

function scanSurrounding() {
    activeMarkersGroup.clearLayers();
    const bounds = map.getBounds();
    let targetFiles = isToiletMode ? ['Local_Toilet_Data_merged_30m_7218_point.geojson'] : GEOJSON_FILES.filter(f => !f.includes('Toilet'));
    
    // チェックボックス判定 (UI連動)
    const activeFiles = Array.from(document.querySelectorAll('.category-toggle:checked')).map(cb => cb.getAttribute('data-file'));

    let totalMarkers = 0;
    targetFiles.forEach(fileName => {
        if (!isToiletMode && !activeFiles.includes(fileName)) return; // トイレ以外はチェック判定

        const data = rawDataCache[fileName];
        if (!data || !data.features) return;

        data.features.forEach(feature => {
            const coords = feature.geometry?.coordinates;
            if (!coords || !bounds.contains([coords[1], coords[0]])) return;
            
            const marker = createMarkerByFile(fileName, [coords[1], coords[0]], feature.properties);
            if (marker) {
                activeMarkersGroup.addLayer(marker);
                totalMarkers++;
            }
        });
    });
}

function createMarkerByFile(fileName, latlng, properties) {
    let marker, category = "その他";
    const name = properties.name || "名称不明";

    if (fileName.includes('relics') || fileName.includes('merge_17323')) {
        // 緑のピン (公園・オブジェクト)
        marker = L.marker(latlng, { icon: greenPinIcon });
        // 👇 公園か遊具か未確定のため「/」で表記！
        category = fileName.includes('relics') ? "史跡・オブジェクト" : "公園/遊具"; 
    } else if (fileName.includes('Gymnasiums') || fileName.includes('Libraries') || fileName.includes('cultural')) {
        // 青のピン (施設)
        marker = L.marker(latlng, { icon: bluePinIcon });
        if (fileName.includes('Gymnasiums')) category = "公共施設";
        if (fileName.includes('Libraries')) category = "図書館";
        if (fileName.includes('cultural')) category = "文化財";
    } else if (fileName.includes('Local_Toilet_Data')) {
        // トイレは赤丸
        marker = L.circleMarker(latlng, { color: 'red', fillColor: '#F44336', fillOpacity: 0.9, radius: 10, weight: 2 });
        // 👇 お行儀よく「トイレ」に統一！
        category = "トイレ"; 
    } else {
        return null;
    }

    marker.bindPopup(`<strong>${name}</strong><br>[${category}]`);
    return marker;
}

function updateScanButtonState() {
    if (!isMobile) return;
    const scanBtn = document.getElementById('scan-btn');
    if (map.getZoom() < SCAN_ZOOM_THRESHOLD) {
        scanBtn.disabled = true;
        scanBtn.innerHTML = `近づいてスキャン`;
    } else {
        scanBtn.disabled = false;
        scanBtn.innerHTML = isToiletMode ? `トイレをスキャン` : `周辺をスキャン`;
    }
}

function initUiEvents() {
    const sidebar = document.getElementById('sidebar');
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    document.getElementById('locate-btn').addEventListener('click', () => {
        if (userLocationMarker) map.setView(userLocationMarker.getLatLng(), map.getZoom());
    });

    document.getElementById('scan-btn').addEventListener('click', scanSurrounding);
    map.on('zoomend', updateScanButtonState);
    updateScanButtonState();

    document.getElementById('toilet-mode-toggle').addEventListener('change', (e) => {
        isToiletMode = e.target.checked;
        const scanBtn = document.getElementById('scan-btn');
        const reportBtn = document.getElementById('report-wc-btn');
        const toggleText = document.querySelector('.toggle-text');
        
        activeMarkersGroup.clearLayers();
        
        if (isToiletMode) {
            toggleText.innerText = "ON";
            scanBtn.innerHTML = "トイレをスキャン";
            scanBtn.style.backgroundColor = "#F44336"; // 赤
            reportBtn.classList.remove('hidden');
        } else {
            toggleText.innerText = "OFF";
            scanBtn.innerHTML = "周辺をスキャン";
            scanBtn.style.backgroundColor = "#2196F3"; // 青
            reportBtn.classList.add('hidden');
        }
        updateScanButtonState();
    });

document.getElementById('report-wc-btn').addEventListener('click', () => {
         if (!navigator.onLine) { alert("圏外だ！電波のある場所で送ってくれ！"); return; }
         if (!userLocationMarker) { alert("GPS待機中だ！"); return; }
         const pos = userLocationMarker.getLatLng();
         // 👇 メールの件名も「救いの泉 レポート」からお行儀よく修正！
         window.location.href = `mailto:reso.synq+toilet@gmail.com?subject=トイレに関する連絡&body=緯度:${pos.lat} 経度:${pos.lng}`;
    });
    
    const licenseOverlay = document.getElementById('license-overlay');
    document.getElementById('license-btn').addEventListener('click', () => {
        sidebar.classList.remove('open');
        licenseOverlay.classList.remove('hidden');
    });
    document.getElementById('license-close-btn').addEventListener('click', () => {
        licenseOverlay.classList.add('hidden');
    });
}
