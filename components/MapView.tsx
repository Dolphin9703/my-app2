import { useRef, useEffect, useCallback } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

interface MapViewProps {
  html: string;
  onMessage: (data: { type: string; id?: string; region?: string }) => void;
  regionFocus: { region: string; lat: number; lon: number; nonce: number } | null;
  gpsFocus: { lat: number; lon: number; nonce: number } | null;
}

export default function MapView({ html, onMessage, regionFocus, gpsFocus }: MapViewProps) {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleMessage = useCallback(
    (rawData: string) => {
      try {
        const msg = JSON.parse(rawData);
        onMessage(msg);
      } catch {
        // ignore
      }
    },
    [onMessage]
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (typeof event.data === 'string') handleMessage(event.data);
      else if (event.data && typeof event.data === 'object') handleMessage(JSON.stringify(event.data));
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [handleMessage]);

  useEffect(() => {
    if (!regionFocus) return;
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: 'focusRegion', region: regionFocus.region, lat: regionFocus.lat, lon: regionFocus.lon }), '*'
      );
    } else {
      webViewRef.current?.injectJavaScript(`window.focusRegion('${regionFocus.region}', ${regionFocus.lat}, ${regionFocus.lon}); true;`);
    }
  }, [regionFocus]);

  useEffect(() => {
    if (!gpsFocus) return;
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: 'moveToUser', lat: gpsFocus.lat, lon: gpsFocus.lon }), '*'
      );
    } else {
      webViewRef.current?.injectJavaScript(`window.moveToUserLocation(${gpsFocus.lat}, ${gpsFocus.lon}); true;`);
    }
  }, [gpsFocus]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          ref={iframeRef as any}
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="낚시 지도"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: 'https://dapi.kakao.com' }}
        style={styles.webview}
        onMessage={(e: WebViewMessageEvent) => handleMessage(e.nativeEvent.data)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        allowsInlineMediaPlayback={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});
