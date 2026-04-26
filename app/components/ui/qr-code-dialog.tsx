import { useState, useEffect, useRef } from 'react'
import { X, Download, Copy, Check } from 'lucide-react'
import QRCode from 'qrcode'

interface QRCodeDialogProps {
  url: string
  title?: string
  onClose: () => void
}

export function QRCodeDialog({ url, title, onClose }: QRCodeDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 240,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
    }
  }, [url])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleDownload = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `qr-${new URL(url).hostname}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  const handleCopy = async () => {
    if (!canvasRef.current) return
    try {
      const blob = await new Promise<Blob>((resolve) =>
        canvasRef.current!.toBlob((b) => resolve(b!), 'image/png')
      )
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: copy URL as text
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center">
          <h3 className="text-sm font-medium text-white mb-1">QR Code</h3>
          {title && (
            <p className="text-xs text-gray-400 mb-4 truncate px-4">{title}</p>
          )}
          {!title && <div className="mb-4" />}

          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-xl p-3">
              <canvas ref={canvasRef} />
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-4 truncate px-2">{url}</p>

          <div className="flex gap-2 justify-center">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Save PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
