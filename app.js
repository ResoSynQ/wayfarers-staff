// --- 📱 『旅人の杖と救いの泉』 アプリ・ロジック ---

// === 📂 設定エリア ===
const GEOJSON_FILES = [
    'OSM_relics_of_kinki_38142.geojson',
    'Gov-OSM_Park_30m_merge_17323.geojson',
    'Gov_Public Facilities-Gymnasiums_6278.geojson',
    'Gov_Cultural_Facilities-Libraries_6100.geojson',
    'Gov_cultural_6196.geojson',
    'Local_Toilet_Data_merged_30m_7218_point.geojson'
];

const SCAN_ZOOM_THRESHOLD = 15; // スマホでのスキャン制限ズームレベル (これより近づかないと押せない)
const GAS_WC_REPORT_URL = "ここに無料ツールGASのURLを貼る"; // 【救いの泉】現地調査投稿用

// === 🛠️ グローバル変数 ===
let map, userLocationMarker;
let isToiletMode = false;
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// 各ファイルのGeoJSONデータ (まだ画面には描画しない)
const rawDataCache = {}; 
// マップ上に展開されているピンのレイヤーグループ
const activeMarkersGroup = L.layerGroup(); 

// === 🚀 初期錬成 (アプリケーション起動) ===
window.onload = function() {
    console.log("⚔️ システム起動...");

    // 1. 地図の初期化 (近畿の中心、例えば京都・大阪あたり)
    map = L.map('map', {
        zoomControl: false // スマホでは片手操作の邪魔なのでOFF
    }).setView([34.6937, 135.5022], 12);

    // 2. 🗺️ OSMベースマップとライセンス表示（自動）
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // ピンを展開するグループをマップに追加
    activeMarkersGroup.addTo(map);

    // 3. 📍 現在地表示 (Geolocation API)
    initGeolocation();

    // 4. 📂 巨大データのバックグラウンド読み込み
    loadGeoJsonData();

    // 5. イベントリスナーの登録
    initUiEvents();

    // PWA Service Workerの登録
    registerServiceWorker();

    console.log("⚔️ 初期錬成 完了。");
};

// --- 📍 現在地表示機能 (Geolocation API) ---
function initGeolocation() {
    if (!navigator.geolocation) {
        console.error("❌ この端末はGPSに対応してねえ！");
        return;
    }

    // 青い丸（パルス）のアイコン定義
    const pulsingBlueDot = L.divIcon({
        className: 'user-location-marker',
        html: '<div class="dot"></div><div class="pulse"></div>',
        iconSize: [20, 20]
    });

    // 位置追跡を開始
    navigator.geolocation.watchPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            if (userLocationMarker) {
                userLocationMarker.setLatLng([lat, lng]);
            } else {
                userLocationMarker = L.marker([lat, lng], { icon: pulsingBlueDot }).addTo(map);
                userLocationMarker.bindPopup("汝の現在地 (精度:約" + accuracy + "m)");
            }
        },
        (error) => {
            console.error("❌ GPSエラー:", error.message);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

// --- 📂 巨大データのバックグラウンド読み込み ---
async function loadGeoJsonData() {
    console.log("📂 データ読み込み開始...");

    // 全てのファイルを一気に並列ダウンロード
    const promises = GEOJSON_FILES.map(async (fileName) => {
        try {
            const response = await fetch(fileName);
            if (!response.ok) throw new Error("ネットワークエラー");
            const data = await response.json();
            rawDataCache[fileName] = data; // キャッシュに保存
            console.log(`✅ ${fileName} 読み込み完了 (${data.features.length}件)`);
        } catch (error) {
            console.error(`❌ ${fileName} の読み込みに失敗した！:`, error.message);
        }
    });

    // 全てのデータの読み込みが終わるのを待つ
    await Promise.all(promises);

    console.log("📂 全データの読み込みが完了！探索可能だ。");

    // 🐉 🐉 ローディング画面を消し去る 🐉 🐉
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.classList.add('loaded'); // CSSで非表示にするクラスを追加

    // 🍎 iOSインストール誘導の判定
    checkIosInstallPrompt();
}

// --- 🌐 「周辺をスキャン」機能 (索敵レーダーの本体) ---
function scanSurrounding() {
    console.log("🌐 索敵レーダー 起動！");

    // 一旦、マップ上の既存のピンを全て消し去る
    activeMarkersGroup.clearLayers();

    // 今、画面に映っている範囲を取得
    const bounds = map.getBounds();

    // トイレモードかどうかで読み込むファイルを分ける
    let targetFiles = [];
    if (isToiletMode) {
        // トイレパックのみ
        targetFiles = ['Local_Toilet_Data_merged_30m_7218_point.geojson'];
    } else {
        // トイレ以外の全てのパック
        targetFiles = GEOJSON_FILES.filter(file => file !== 'Local_Toilet_Data_merged_30m_7218_point.geojson');
    }

    // ✅ メニューでチェックが入っているジャンルだけを抽出する
    // (※このベースコードでは、ファイル単位でのオンオフのみ実装。タグによる細かい振り分けは後ほどJSで追加する)
    const activeToggles = document.querySelectorAll('.category-toggle:checked');
    const filesToScan = new Set(); // 重複を防ぐためにSetを使う
    activeToggles.forEach(toggle => {
        filesToScan.add(toggle.getAttribute('data-file'));
    });

    let totalMarkers = 0;

    // キャッシュの中から、映っている範囲内のデータだけを抜き出す
    targetFiles.forEach(fileName => {
        const data = rawDataCache[fileName];
        if (!data || !data.features) return;

        data.features.forEach(feature => {
            if (!feature.geometry || !feature.geometry.coordinates) return;

            const lat = feature.geometry.coordinates[1];
            const lng = feature.geometry.coordinates[0];

            // 映っている範囲内にあるか判定
            if (bounds.contains([lat, lng])) {
                // 映っているならピンを作成
                const marker = createMarkerByFile(fileName, [lat, lng], feature.properties);
                if (marker) {
                    activeMarkersGroup.addLayer(marker);
                    totalMarkers++;
                }
            }
        });
    });

    console.log(`✅ 索敵完了。${totalMarkers} 件の候補をマップに展開した。`);
    if (totalMarkers === 0) {
        alert("周辺に候補はねえ！もっと歩くか、ズームアウトしてスキャンしてみろ！");
    }
}

// --- 🎨 ファイル名に基づいてピンのカラー・形状・ポップアップを決める ---
function createMarkerByFile(fileName, latlng, properties) {
    let style;
    const name = properties.name || "名称不明";
    let category = "その他";

    // ファイル名に応じてスタイルを変える
    if (fileName.includes('relics')) {
        style = { color: 'green', fillColor: 'green', fillOpacity: 0.8 }; // 緑
        category = "史跡・道標";
    } else if (fileName.includes('merge_17323')) {
        style = { color: 'green', fillColor: '#8BC34A', fillOpacity: 0.8 }; // 緑 (公園)
        category = "公園・遊具";
    } else if (fileName.includes('Gymnasiums')) {
        style = { color: 'blue', fillColor: '#2196F3', fillOpacity: 0.8 }; // 青 (体育館)
        category = "体育館";
    } else if (fileName.includes('Libraries')) {
        style = { color: 'blue', fillColor: '#03A9F4', fillOpacity: 0.8 }; // 青 (図書館)
        category = "図書館";
    } else if (fileName.includes('cultural')) {
        style = { color: 'blue', fillColor: '#00BCD4', fillOpacity: 0.8 }; // 青 (文化財)
        category = "文化財建造物";
    } else if (fileName.includes('Local_Toilet_Data')) {
        style = { color: 'red', fillColor: '#F44336', fillOpacity: 0.9, weight: 2 }; // 赤丸
        category = "救いの泉 (トイレ)";
    } else {
        return null;
    }

    // 形状とポップアップを錬成
    const marker = L.circleMarker(latlng, {
        ...style,
        radius: (category.includes("トイレ") ? 10 : 8) // トイレは少し大きくする
    });

    // ４）詳細ポップアップ機能
    const popupContent = `
        <div class="wayfarer-popup">
            <strong>${name}</strong><br>
            [${category}]
        </div>
    `;
    marker.bindPopup(popupContent);

    return marker;
}

// --- 🚾 「新たな泉」位置情報取得・投稿機能 ---
function reportNewToilet() {
    // 【オフライン時のフェイルセーフ】
    if (!navigator.onLine) {
        alert("**「今は圏外だ！電波のある場所で再度送ってくれ！」**");
        return;
    }

    // 1. 位置情報を取得
    if (!userLocationMarker) {
        alert("汝の現在地が分からぬ！GPSの受信を待ってくれ！");
        return;
    }
    const pos = userLocationMarker.getLatLng();
    const lat = pos.lat;
    const lng = pos.lng;

    // 2. メール本文に入力するためのメッセージプロンプト (簡易版)
    const reportType = prompt("調査内容を選べ：\n1. トイレがあった (新たな泉)\n2. トイレがなかった・使えなかった\n3. その他", "1");
    if (!reportType) return; // キャンセル

    let subject = "救いの泉 現地調査レポート";
    let body = `【位置情報】\n緯度: ${lat}\n経度: ${lng}\nhttps://www.google.com/maps/search/?api=1&query=${lat},${lng}\n\n【調査内容】\n`;

    if (reportType === "1") { subject += ": 新たな泉を発見"; body += "公共で使えるトイレをみつけた"; }
    else if (reportType === "2") { subject += ": トイレ消失・故障"; body += "トイレがなかった、または使えなかった"; }
    else { subject += ": その他情報"; body += "その他 (本文に入力)"; }

    // 3. GAS/メールアプリへ飛ばす (メールベースの投稿)
    // ここではGASのURLを噛ませず、直接メールアプリを立ち上げる方式で実装する (無料のGAS方式への切り替えは別途可能)
    const mailtoUrl = `mailto:reso.synq+toilet@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;

    console.log("🚾 調査報告の呪文を唱えた。");
}

// --- 💥 スマホ環境での広域スキャン防止 (クラッシュ防止) ---
function updateScanButtonState() {
    // PC環境なら制限なし
    if (!isMobile) return;

    const currentZoom = map.getZoom();
    const scanBtn = document.getElementById('scan-btn');

    if (currentZoom < SCAN_ZOOM_THRESHOLD) {
        // ズームアウトしすぎなら無効化
        scanBtn.disabled = true;
        scanBtn.innerHTML = `もっと近づけ (ズームイン)`; // 【警告メッセージ】
    } else {
        // 索敵可能
        scanBtn.disabled = false;
        scanBtn.innerHTML = isToiletMode ? `救いの泉を索敵する` : `周辺をスキャン`;
    }
}

// --- 🛠️ イベントリスナーとUIイベントの初期化 ---
function initUiEvents() {
    // サイドバーのトグル (片手操作用)
    const sidebar = document.getElementById('sidebar');
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // 🎯 現在地復帰ボタン
    document.getElementById('locate-btn').addEventListener('click', () => {
        if (userLocationMarker) {
            map.setView(userLocationMarker.getLatLng(), map.getZoom()); // ズームレベルは維持
        } else {
            alert("現在地を索敵中だ！GPSの受信を待ってくれ！");
        }
    });

    // 🌐 「周辺をスキャン」ボタン
    document.getElementById('scan-btn').addEventListener('click', scanSurrounding);

    // 💥 スマホのズーム変更に合わせてスキャンボタンの状態を更新
    map.on('zoomend', updateScanButtonState);
    updateScanButtonState(); // 初期状態を設定

    // 🚻 トイレモードスイッチ
    document.getElementById('toilet-mode-toggle').addEventListener('change', (e) => {
        isToiletMode = e.target.checked;
        const scanBtn = document.getElementById('scan-btn');
        const reportBtn = document.getElementById('report-wc-btn');

        if (isToiletMode) {
            // トイレモード ON
            activeMarkersGroup.clearLayers(); // 既存の候補を全て消去
            scanBtn.innerHTML = "救いの泉を索敵する";
            scanBtn.style.backgroundColor = "#F44336"; // ボタンを赤へ
            scanBtn.style.boxShadow = "0 4px 15px rgba(244, 67, 54, 0.5)";
            reportBtn.classList.remove('hidden'); // 「新たな泉」ボタンを表示
        } else {
            // トイレモード OFF
            activeMarkersGroup.clearLayers(); // トイレピンを消去
            scanBtn.innerHTML = "周辺をスキャン";
            scanBtn.style.backgroundColor = "#FF5722"; // ボタンをオレンジへ
            scanBtn.style.boxShadow = "0 4px 15px rgba(255, 87, 34, 0.5)";
            reportBtn.classList.add('hidden'); // 「新たな泉」ボタンを隠す
        }
        updateScanButtonState(); // ズーム制限の状態も更新
    });

    // 🚾 「新たな泉」現地調査ボタン
    document.getElementById('report-wc-btn').addEventListener('click', reportNewToilet);

    // 📜 ライセンスオーバーレイの制御
    const licenseOverlay = document.getElementById('license-overlay');
    document.getElementById('license-btn').addEventListener('click', () => {
        sidebar.classList.remove('open'); // サイドバーは閉じる
        licenseOverlay.classList.remove('hidden'); // オーバーレイを表示
    });
    document.getElementById('license-close-btn').addEventListener('click', () => {
        licenseOverlay.classList.add('hidden'); // オーバーレイを隠す
        sidebar.classList.add('open'); // サイドバーへ戻る
    });
}

// --- PWA Service Workerの登録 (キャッシュ魔法) ---
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('✅ Service Worker 登録完了！キャッシュの魔法がかかったぜ。Scope:', registration.scope);
                })
                .catch(error => {
                    console.error('❌ Service Worker 登録失敗！通信環境を確認しろ。:', error);
                });
        });
    }
}

// --- 🍎 iPhoneユーザー用 インストール誘導吹き出し ---
function checkIosInstallPrompt() {
    // iOS/Safari かつ ホーム画面から起動していない (standaloneでない) 場合
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true;

    if (isIos && !isStandalone) {
        // 誘導吹き出しを表示 (5秒後に表示して少し時間差を設ける)
        setTimeout(() => {
            document.getElementById('ios-install-prompt').classList.remove('hidden');
        }, 5000);

        // 誘導吹き出しはワンタップで消えるようにする
        document.getElementById('ios-install-prompt').addEventListener('click', (e) => {
            e.currentTarget.classList.add('hidden');
        });
    }
}