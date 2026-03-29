const GEOJSON_FILES = [
    'OSM_relics_of_kinki_38142.geojson',
    'Gov-OSM_Park_30m_merge_17323.geojson',
    'Gov_Public Facilities-Gymnasiums_6278.geojson',
    'Gov_Cultural_Facilities-Libraries_6100.geojson',
    'Gov_cultural_6196.geojson',
    'Local_Toilet_Data_merged_30m_7218_point.geojson'
];
const SCAN_ZOOM_THRESHOLD = 15; 
let map, userLocationMarker;
let isToiletMode = false;
const rawDataCache = {}; 
const activeMarkersGroup = L.layerGroup(); 

function createPinIcon(color) {
    const svg = `<svg width="28" height="41" viewBox="0 0 28 41" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.268 0 0 6.268 0 14c0 9.844 14 27 14 27s14-17.156 14-27C28 6.268 21.732 0 14 0zm0 20c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z" fill="${color}" stroke="#fff" stroke-width="1.5"/></svg>`;
    return L.divIcon({ className: 'custom-svg-pin', html: svg, iconSize: [28, 41], iconAnchor: [14, 41], popupAnchor: [0, -41] });
}
const bluePinIcon = createPinIcon('#2196F3');
const greenPinIcon = createPinIcon('#4CAF50');

window.onload = function() {
    map = L.map('map', { zoomControl: false }).setView([34.6937, 135.5022], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM contributors' }).addTo(map);
    activeMarkersGroup.addTo(map);
    initGeolocation();
    loadGeoJsonData();
    initUiEvents();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
};

function initGeolocation() {
    if (!navigator.geolocation) return;
    const dot = L.divIcon({ className: 'user-dot', html: '<div style="width:16px;height:16px;background:#2196F3;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>', iconSize: [22, 22] });
    navigator.geolocation.watchPosition((pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (userLocationMarker) userLocationMarker.setLatLng([lat, lng]);
        else userLocationMarker = L.marker([lat, lng], { icon: dot }).addTo(map);
    }, null, { enableHighAccuracy: true });
}

async function loadGeoJsonData() {
    const promises = GEOJSON_FILES.map(async (f) => {
        try { const res = await fetch(f); if (res.ok) rawDataCache[f] = await res.json(); } catch (e) {}
    });
    await Promise.all(promises);
    document.getElementById('loading-screen').classList.add('loaded');
}

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

function scanSurrounding() {
    activeMarkersGroup.clearLayers();
    const bounds = map.getBounds();
    const activeFiles = Array.from(document.querySelectorAll('.category-toggle:checked')).map(cb => cb.getAttribute('data-file'));
    const targetFiles = isToiletMode ? ['Local_Toilet_Data_merged_30m_7218_point.geojson'] : GEOJSON_FILES.filter(f => !f.includes('Toilet'));

    targetFiles.forEach(f => {
        if (!isToiletMode && !activeFiles.includes(f)) return;
        const data = rawDataCache[f];
        if (!data || !data.features) return;
        data.features.forEach(feature => {
            const c = feature.geometry.coordinates;
            if (bounds.contains([c[1], c[0]])) {
                const m = createMarkerByFile(f, [c[1], c[0]], feature.properties);
                if (m) activeMarkersGroup.addLayer(m);
            }
        });
    });
}

function createMarkerByFile(fileName, latlng, props) {
    let marker, category = "その他";
    const name = props.name || "名称不明";
    if (fileName.includes('relics') || fileName.includes('merge_17323')) {
        marker = L.marker(latlng, { icon: greenPinIcon });
        category = fileName.includes('relics') ? "史跡・オブジェクト" : "公園/遊具";
    } else if (fileName.includes('Gymnasiums') || fileName.includes('Libraries') || fileName.includes('cultural')) {
        marker = L.marker(latlng, { icon: bluePinIcon });
        category = fileName.includes('Gymnasiums') ? "公共施設" : (fileName.includes('Libraries') ? "図書館" : "文化財");
    } else if (fileName.includes('Local_Toilet_Data')) {
        marker = L.circleMarker(latlng, { color: 'red', fillColor: '#F44336', fillOpacity: 0.9, radius: 10, weight: 2 });
        category = "トイレ";
    } else return null;
    marker.bindPopup(`<strong>${name}</strong><br>[${category}]`);
    return marker;
}

function initUiEvents() {
    document.getElementById('sidebar-toggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('locate-btn').addEventListener('click', () => { if (userLocationMarker) map.setView(userLocationMarker.getLatLng(), map.getZoom()); });
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
            scanBtn.style.backgroundColor = "#F44336";
            reportBtn.classList.remove('hidden');
        } else {
            toggleText.innerText = "OFF";
            scanBtn.style.backgroundColor = "#2196F3";
            reportBtn.classList.add('hidden');
        }
        updateScanButtonState();
    });

    document.getElementById('report-wc-btn').addEventListener('click', () => {
         if (!userLocationMarker) return;
         const p = userLocationMarker.getLatLng();
         window.location.href = `mailto:info@resosynq.com?subject=トイレに関する連絡&body=緯度:${p.lat} 経度:${p.lng}`;
    });

    document.getElementById('license-btn').addEventListener('click', () => document.getElementById('license-overlay').classList.remove('hidden'));
    document.getElementById('license-close-btn').addEventListener('click', () => document.getElementById('license-overlay').classList.add('hidden'));
}
