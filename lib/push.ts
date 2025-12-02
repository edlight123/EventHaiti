"use client"

function base64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i)
  return output
}

export async function subscribeToPush(publicKey: string, topics: string[] = [], userId?: string) {
  console.log('[push] subscribeToPush called', { publicKey: publicKey?.substring(0, 20), topics, userId })
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[push] Push not supported')
    return null
  }
  console.log('[push] Requesting permission...')
  const permission = await Notification.requestPermission()
  console.log('[push] Permission result:', permission)
  if (permission !== 'granted') return null
  console.log('[push] Waiting for service worker...')
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker timeout')), 10000))
  ]) as ServiceWorkerRegistration
  console.log('[push] Service worker ready')
  const existing = await reg.pushManager.getSubscription()
  console.log('[push] Existing subscription:', existing?.endpoint?.substring(0, 50))
  function extractKeys(sub: PushSubscription) {
    const p256dhArray = sub.getKey && sub.getKey('p256dh')
    const authArray = sub.getKey && sub.getKey('auth')
    const encode = (buf: ArrayBuffer | null) => {
      if (!buf) return ''
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      return btoa(binary)
    }
    return { p256dh: encode(p256dhArray), auth: encode(authArray) }
  }

  if (existing) {
    const keys = extractKeys(existing)
    // If keys missing, re-subscribe fresh to ensure viable encryption keys
    if (!keys.p256dh || !keys.auth) {
      console.log('[push] Keys missing, unsubscribing...')
      try { await existing.unsubscribe() } catch {}
    } else {
      console.log('[push] Updating existing subscription...')
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: existing.endpoint, keys, topics, userId })
      })
      console.log('[push] Update response:', response.status)
      if (!response.ok) {
        console.error('[push] Subscribe failed:', await response.text())
      }
      return existing
    }
  }
  console.log('[push] Creating new subscription...')
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8Array(publicKey)
  })
  console.log('[push] Subscription created:', sub.endpoint.substring(0, 50))
  const newKeys = extractKeys(sub)
  console.log('[push] Sending to server...')
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint, keys: newKeys, topics, userId })
  })
  console.log('[push] Server response:', response.status)
  if (!response.ok) {
    console.error('[push] Subscribe failed:', await response.text())
  }
  return sub
}

export async function sendTestNotification() {
  await fetch('/api/push/test', { method: 'POST' })
}

export async function sendUserNotification(userId: string, title?: string, body?: string, url?: string, data?: Record<string, any>) {
  await fetch('/api/push/send-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, title, body, url, data })
  })
}

export async function unsubscribePush(endpoint: string) {
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint })
  })
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
}
