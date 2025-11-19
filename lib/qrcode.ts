import QRCode from 'qrcode'

export async function generateTicketQRCode(ticketId: string): Promise<string> {
  try {
    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(ticketId, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
    
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

export async function generateTicketQRCodeBuffer(ticketId: string): Promise<Buffer> {
  try {
    const buffer = await QRCode.toBuffer(ticketId, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 300,
      margin: 2,
    })
    
    return buffer
  } catch (error) {
    console.error('Error generating QR code buffer:', error)
    throw new Error('Failed to generate QR code')
  }
}
