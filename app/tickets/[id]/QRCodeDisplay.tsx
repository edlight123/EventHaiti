'use client'

import { QRCodeSVG } from 'qrcode.react'

interface QRCodeDisplayProps {
  value: string
  size?: number
}

export default function QRCodeDisplay({ value, size = 256 }: QRCodeDisplayProps) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="H"
      includeMargin={true}
    />
  )
}
