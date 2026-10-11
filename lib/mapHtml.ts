import type { FishingPoint } from './types';
import { getTodayTides, getTideDescription } from './tide';

export function buildMapHtml(points: FishingPoint[]): string {
  const kakaoKey = process.env.EXPO_PUBLIC_KAKAO_MAP_KEY || '';
  const markersJson = JSON.stringify(
    points.map((p) => ({
      id: p.id,
      name: p.name,
      region: p.region,
      lat: p.lat,
      lon: p.lon,
      description: p.description,
      fish_types: p.fish_types,
      point_type: p.point_type || '갯바위',
      tides: getTodayTides(new Date(), p.lat, p.lon),
      tide_desc: getTideDescription(getTodayTides(new Date(), p.lat, p.lon)),
    }))
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .map-control {
      position: absolute; top: 12px; left: 12px; z-index: 10;
      display: flex; gap: 6px;
    }
    .map-btn {
      padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
      background: #fff; border: 1px solid #cbd5e1; cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-family: -apple-system, 'Noto Sans KR', sans-serif;
    }
    .map-btn.active { background: #0891b2; color: #fff; border-color: #0891b2; }
    .fishing-pin {
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid #fff;
    }
    .fishing-pin span { transform: rotate(45deg); font-size: 16px; }
    .pin-breakwater { background: #2563eb; }
    .pin-rock { background: #0891b2; }
    .pin-dock { background: #059669; }
    .user-location {
      width: 20px; height: 20px; border-radius: 50%;
      background: #2563eb; border: 3px solid #fff;
      box-shadow: 0 0 0 2px rgba(37,99,235,0.3), 0 0 12px rgba(37,99,235,0.5);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 2px rgba(37,99,235,0.3), 0 0 12px rgba(37,99,235,0.5); }
      50% { box-shadow: 0 0 0 8px rgba(37,99,235,0.1), 0 0 20px rgba(37,99,235,0.7); }
    }
    .infowindow-content { padding: 8px 4px; font-family: -apple-system, 'Noto Sans KR', sans-serif; min-width: 180px; }
    .iw-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .iw-region { font-size: 12px; color: #64748b; margin-bottom: 6px; }
    .iw-type { font-size: 11px; color: #475569; margin-bottom: 4px; }
    .iw-fish { font-size: 12px; color: #0891b2; font-weight: 600; margin-bottom: 4px; }
    .iw-tide { font-size: 11px; color: #334155; background: #f1f5f9; border-radius: 6px; padding: 4px 8px; margin-bottom: 6px; }
    .iw-btn { display: inline-block; padding: 6px 14px; background: #0891b2; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }

    #loading-overlay, #error-overlay {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: -apple-system, 'Noto Sans KR', sans-serif; z-index: 5;
      background: #f8fafc;
    }
    #error-overlay { display: none; background: #f8fafc; padding: 20px; }
    .spinner {
      width: 40px; height: 40px; border: 4px solid #e2e8f0;
      border-top-color: #0891b2; border-radius: 50%;
      animation: spin 0.8s linear infinite; margin-bottom: 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text { font-size: 14px; color: #64748b; font-weight: 500; }
    .error-icon { font-size: 48px; margin-bottom: 12px; }
    .error-title { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 8px; text-align: center; }
    .error-msg { font-size: 13px; color: #64748b; text-align: center; line-height: 1.6; max-width: 320px; margin-bottom: 20px; }
    .fallback-list {
      width: 100%; max-width: 400px; max-height: 300px; overflow-y: auto;
      padding: 0 16px;
    }
    .fallback-item {
      display: flex; align-items: center; gap: 10px; padding: 12px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      margin-bottom: 8px; cursor: pointer; transition: background 0.15s;
    }
    .fallback-item:hover { background: #f0f9ff; }
    .fallback-pin {
      width: 32px; height: 32px; border-radius: 50%; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
      border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    }
    .fallback-info { flex: 1; min-width: 0; }
    .fallback-name { font-size: 14px; font-weight: 700; color: #0f172a; }
    .fallback-region { font-size: 12px; color: #64748b; }
    .fallback-tide { font-size: 11px; color: #0891b2; font-weight: 600; margin-top: 2px; }
    .retry-btn {
      padding: 10px 24px; background: #0891b2; color: #fff; border: none;
      border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
      font-family: inherit; margin-top: 12px;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <div id="loading-overlay">
    <div class="spinner"></div>
    <div class="loading-text">지도를 불러오는 중...</div>
  </div>

  <div id="error-overlay">
    <div class="error-icon">🗺️</div>
    <div class="error-title">지도를 불러올 수 없습니다</div>
    <div class="error-msg">
      카카오맵 API 키 또는 도메인 설정을 확인해주세요.<br />
      아래 목록에서 포인트를 선택할 수 있습니다.
    </div>
    <div class="fallback-list" id="fallback-list"></div>
    <button class="retry-btn" onclick="retryLoad()">다시 시도</button>
  </div>

  <div class="map-control">
    <button class="map-btn active" id="btn-default" onclick="switchMap('default')">지도</button>
    <button class="map-btn" id="btn-sky" onclick="switchMap('skyview')">스카이뷰</button>
  </div>

  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}" onerror="handleSdkError()" onload="sdkLoaded=true; initMap();"></script>
  <script>
    var points = ${markersJson};
    var map = null;
    var markers = [];
    var userMarker = null;
    var currentMapType = 'default';
    var sdkLoaded = false;
    var mapReady = false;
    var retryCount = 0;
    var initAttempts = 0;

    function sendToParent(data) {
      var json = JSON.stringify(data);
      if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(json); }
      else if (window.parent && window.parent !== window) { window.parent.postMessage(data, '*'); }
    }

    function hideLoading() {
      var el = document.getElementById('loading-overlay');
      if (el) el.style.display = 'none';
    }

    function showError() {
      hideLoading();
      var el = document.getElementById('error-overlay');
      if (el) el.style.display = 'flex';
      buildFallbackList();
    }

    function buildFallbackList() {
      var container = document.getElementById('fallback-list');
      if (!container) return;
      var typeColorMap = { '방파제': '#2563eb', '갯바위': '#0891b2', '선착장': '#059669' };
      container.innerHTML = '';
      points.forEach(function(p) {
        var color = typeColorMap[p.point_type] || '#0891b2';
        var item = document.createElement('div');
        item.className = 'fallback-item';
        item.onclick = (function(id) { return function() { selectPoint(id); }; })(p.id);
        var tideLine = '';
        if (p.tides && p.tides.length > 0) {
          tideLine = '<div class="fallback-tide">' + p.tide_desc + '</div>';
        }
        item.innerHTML =
          '<div class="fallback-pin" style="background:' + color + '"><span style="font-size:14px;">🎣</span></div>' +
          '<div class="fallback-info">' +
          '<div class="fallback-name">' + p.name + '</div>' +
          '<div class="fallback-region">' + p.region + ' · ' + (p.point_type || '갯바위') + '</div>' +
          tideLine +
          '</div>';
        container.appendChild(item);
      });
    }

    function handleSdkError() {
      sdkLoaded = false;
      showError();
    }

    function initMap() {
      initAttempts++;
      if (!sdkLoaded || typeof kakao === 'undefined' || !kakao.maps) {
        if (initAttempts > 100) { showError(); return; }
        setTimeout(initMap, 100);
        return;
      }
      try {
        kakao.maps.load(function() {
          try {
            var container = document.getElementById('map');
            if (!container) { showError(); return; }
            var options = {
              center: new kakao.maps.LatLng(36.5, 127.8),
              level: 12,
            };
            map = new kakao.maps.Map(container, options);
            mapReady = true;
            hideLoading();
            addMarkers();
          } catch (e) {
            console.error('[KakaoMap] init error:', e);
            showError();
          }
        });
      } catch (e) {
        console.error('[KakaoMap] load error:', e);
        showError();
      }
    }

    function addMarkers() {
      var typeColorMap = { '방파제': '#2563eb', '갯바위': '#0891b2', '선착장': '#059669' };
      points.forEach(function(p) {
        var color = typeColorMap[p.point_type] || '#0891b2';
        var content = '<div class="fishing-pin" style="background:' + color + '"><span>🎣</span></div>';
        var position = new kakao.maps.LatLng(p.lat, p.lon);
        var customOverlay = new kakao.maps.CustomOverlay({
          position: position,
          content: content,
          yAnchor: 1,
        });

        var tideHtml = '';
        if (p.tides && p.tides.length > 0) {
          var tideLines = p.tides.map(function(t) { return t.type + ' ' + t.time + ' (' + t.height + 'cm)'; }).join(' · ');
          tideHtml = '<div class="iw-tide">🌊 ' + p.tide_desc + '<br>' + tideLines + '</div>';
        }
        var iwContent = '<div class="infowindow-content">' +
          '<div class="iw-title">' + p.name + '</div>' +
          '<div class="iw-region">' + p.region + '</div>' +
          '<div class="iw-type">📍 ' + (p.point_type || '갯바위') + '</div>' +
          (p.fish_types ? '<div class="iw-fish">🐟 ' + p.fish_types + '</div>' : '') +
          tideHtml +
          '<button class="iw-btn" onclick="selectPoint(\\'' + p.id + '\\')">상세 정보</button>' +
          '</div>';

        var infowindow = new kakao.maps.InfoWindow({
          content: iwContent,
          removable: true,
        });

        customOverlay.setMap(map);
        markers.push({ overlay: customOverlay, info: infowindow, point: p });

        kakao.maps.event.addListener(customOverlay, 'click', function() {
          infowindow.open(map, customOverlay);
        });
      });
    }

    window.selectPoint = function(id) { sendToParent({ type: 'selectPoint', id: id }); };

    window.retryLoad = function() {
      retryCount = 0;
      initAttempts = 0;
      sdkLoaded = false;
      document.getElementById('error-overlay').style.display = 'none';
      document.getElementById('loading-overlay').style.display = 'flex';
      var existing = document.querySelector('script[src*="dapi.kakao.com"]');
      if (existing) existing.remove();
      var s = document.createElement('script');
      s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}';
      s.onload = function() { sdkLoaded = true; initMap(); };
      s.onerror = handleSdkError;
      document.head.appendChild(s);
    };

    window.switchMap = function(type) {
      currentMapType = type;
      document.getElementById('btn-default').classList.toggle('active', type === 'default');
      document.getElementById('btn-sky').classList.toggle('active', type === 'skyview');
      if (map) {
        if (type === 'skyview') {
          map.setMapTypeId(kakao.maps.MapTypeId.SKYVIEW);
        } else {
          map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
        }
      }
    };

    window.focusRegion = function(regionName, lat, lon) {
      if (map) { map.panTo(new kakao.maps.LatLng(lat, lon)); map.setLevel(5); }
    };

    window.moveToUserLocation = function(lat, lon) {
      if (!map) return;
      if (userMarker) { userMarker.setMap(null); }
      var userContent = '<div class="user-location"></div>';
      userMarker = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(lat, lon),
        content: userContent,
        yAnchor: 0.5,
      });
      userMarker.setMap(map);
      map.panTo(new kakao.maps.LatLng(lat, lon));
      map.setLevel(3);
    };

    window.addEventListener('message', function(event) {
      try {
        var msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (msg.type === 'focusRegion' && msg.lat && msg.lon) { window.focusRegion(msg.region, msg.lat, msg.lon); }
        if (msg.type === 'moveToUser' && msg.lat && msg.lon) { window.moveToUserLocation(msg.lat, msg.lon); }
      } catch (e) {}
    });

    initMap();
  </script>
</body>
</html>`;
}
