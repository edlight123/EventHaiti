'use client'

import { useEffect } from 'react'

type PurchasePopupBridgeProps =
  | {
      status: 'success'
      ticketId?: string | null
    }
  | {
      status: 'failed'
      reason?: string | null
    }

export default function PurchasePopupBridge(props: PurchasePopupBridgeProps) {
  useEffect(() => {
    // Only run when opened as a popup.
    if (!window.opener) return

    try {
      window.opener.postMessage(
        {
          source: 'eventhaiti',
          type: 'purchase_result',
          ...props,
        },
        window.location.origin
      )
    } catch {
      // Ignore cross-window errors and still attempt to close.
    }

    // Give the browser a tick to dispatch the message.
    const timer = window.setTimeout(() => {
      window.close()
    }, 100)

    return () => window.clearTimeout(timer)
  }, [props])

  return null
}
