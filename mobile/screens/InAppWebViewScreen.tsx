import React, { useCallback, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { WebView } from 'react-native-webview'

import { COLORS } from '../config/brand'

type Params = {
  url: string
}

export default function InAppWebViewScreen() {
  const route = useRoute<any>()
  const { url } = (route.params || {}) as Params

  const webViewRef = useRef<WebView>(null)
  const [loading, setLoading] = useState(true)

  const source = useMemo(() => ({ uri: url }), [url])

  const onLoadEnd = useCallback(() => {
    setLoading(false)
  }, [])

  if (!url) {
    return <View style={styles.center} />
  }

  return (
    <View style={styles.container}>
      <WebView ref={webViewRef} source={source} onLoadEnd={onLoadEnd} />
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
})
