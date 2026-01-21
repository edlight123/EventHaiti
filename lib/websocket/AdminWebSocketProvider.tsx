'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

export interface AdminMetricsUpdate {
  type: 'metrics_update'
  data: {
    usersCount?: number
    eventsCount?: number
    tickets7d?: number
    gmv7d?: number
    refunds7d?: number
    pendingCount?: number
    timestamp: string
  }
}

export interface AdminActivityEvent {
  type: 'activity_event'
  data: {
    id: string
    activityType: 'verification' | 'payment' | 'event' | 'security' | 'user_action' | 'system'
    title: string
    description: string
    timestamp: string
    actor?: {
      name: string
      email?: string
      role: string
    }
    metadata?: {
      amount?: number
      currency?: string
      eventId?: string
      userId?: string
      severity?: 'low' | 'medium' | 'high' | 'critical'
    }
    link?: string
  }
}

export interface SystemStatusUpdate {
  type: 'system_status'
  data: {
    status: 'online' | 'degraded' | 'offline'
    services: {
      payments: boolean
      analytics: boolean
      notifications: boolean
    }
    timestamp: string
  }
}

export type WebSocketMessage = AdminMetricsUpdate | AdminActivityEvent | SystemStatusUpdate

export interface WebSocketContextValue {
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastMessage: WebSocketMessage | null
  sendMessage: (message: any) => void
  subscribe: (eventType: string, callback: (data: any) => void) => () => void
  reconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

interface AdminWebSocketProviderProps {
  children: React.ReactNode
  enabled?: boolean
}

export function AdminWebSocketProvider({ children, enabled = true }: AdminWebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<WebSocketContextValue['connectionStatus']>('disconnected')
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map())
  const isIntentionalCloseRef = useRef(false)

  const MAX_RECONNECT_ATTEMPTS = 10
  const BASE_RECONNECT_DELAY = 1000 // 1 second

  const getReconnectDelay = useCallback(() => {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      30000 // Max 30 seconds
    )
    const jitter = Math.random() * 1000 // Add up to 1 second of jitter
    return exponentialDelay + jitter
  }, [])

  const notifySubscribers = useCallback((type: string, data: any) => {
    const subscribers = subscribersRef.current.get(type)
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in WebSocket subscriber callback:', error)
        }
      })
    }
    
    // Also notify 'all' subscribers
    const allSubscribers = subscribersRef.current.get('all')
    if (allSubscribers) {
      allSubscribers.forEach(callback => {
        try {
          callback({ type, data })
        } catch (error) {
          console.error('Error in WebSocket subscriber callback:', error)
        }
      })
    }
  }, [])

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      setConnectionStatus('connecting')
      
      // Determine WebSocket URL based on environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/admin/ws`
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('Admin WebSocket connected')
        setIsConnected(true)
        setConnectionStatus('connected')
        reconnectAttemptsRef.current = 0
        
        // Send authentication token
        const token = localStorage.getItem('auth_token')
        if (token) {
          ws.send(JSON.stringify({ type: 'auth', token }))
        }
        
        // Request initial data
        ws.send(JSON.stringify({ type: 'subscribe', channels: ['metrics', 'activities', 'system'] }))
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)
          
          // Notify type-specific subscribers
          notifySubscribers(message.type, message.data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('error')
      }

      ws.onclose = (event) => {
        console.log('Admin WebSocket disconnected', event.code, event.reason)
        setIsConnected(false)
        setConnectionStatus('disconnected')
        wsRef.current = null

        // Attempt to reconnect if not intentionally closed
        if (!isIntentionalCloseRef.current && enabled) {
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = getReconnectDelay()
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`)
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++
              connect()
            }, delay)
          } else {
            console.error('Max reconnection attempts reached')
            setConnectionStatus('error')
          }
        }
      }
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      setConnectionStatus('error')
    }
  }, [enabled, getReconnectDelay, notifySubscribers])

  const disconnect = useCallback(() => {
    isIntentionalCloseRef.current = true
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
    setConnectionStatus('disconnected')
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message)
    }
  }, [])

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    if (!subscribersRef.current.has(eventType)) {
      subscribersRef.current.set(eventType, new Set())
    }
    subscribersRef.current.get(eventType)!.add(callback)

    // Return unsubscribe function
    return () => {
      const subscribers = subscribersRef.current.get(eventType)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          subscribersRef.current.delete(eventType)
        }
      }
    }
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    isIntentionalCloseRef.current = false
    reconnectAttemptsRef.current = 0
    setTimeout(() => connect(), 100)
  }, [connect, disconnect])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      isIntentionalCloseRef.current = false
      connect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected) return

    const heartbeatInterval = setInterval(() => {
      sendMessage({ type: 'ping' })
    }, 30000) // Send ping every 30 seconds

    return () => clearInterval(heartbeatInterval)
  }, [isConnected, sendMessage])

  const value: WebSocketContextValue = {
    isConnected,
    connectionStatus,
    lastMessage,
    sendMessage,
    subscribe,
    reconnect
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useAdminWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useAdminWebSocket must be used within AdminWebSocketProvider')
  }
  return context
}

// Specialized hooks for specific data types
export function useAdminMetrics(callback: (data: AdminMetricsUpdate['data']) => void) {
  const { subscribe } = useAdminWebSocket()
  
  useEffect(() => {
    return subscribe('metrics_update', callback)
  }, [subscribe, callback])
}

export function useAdminActivities(callback: (data: AdminActivityEvent['data']) => void) {
  const { subscribe } = useAdminWebSocket()
  
  useEffect(() => {
    return subscribe('activity_event', callback)
  }, [subscribe, callback])
}

export function useSystemStatus(callback: (data: SystemStatusUpdate['data']) => void) {
  const { subscribe } = useAdminWebSocket()
  
  useEffect(() => {
    return subscribe('system_status', callback)
  }, [subscribe, callback])
}
