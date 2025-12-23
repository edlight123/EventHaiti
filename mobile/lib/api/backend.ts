import { auth } from '../../config/firebase'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

type FetchInit = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> }

export async function backendFetch(path: string, init: FetchInit = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`

  const currentUser = auth.currentUser
  const token = currentUser ? await currentUser.getIdToken() : null

  const headers: Record<string, string> = {
    ...(init.headers || {}),
  }

  if (!headers['Content-Type'] && init.body) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(url, {
    ...init,
    headers,
  })
}

export async function backendJson<T>(path: string, init: FetchInit = {}): Promise<T> {
  const res = await backendFetch(path, init)
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok) {
    const message = (data as any)?.error || (data as any)?.message || 'Request failed'
    throw new Error(message)
  }
  return data as T
}
