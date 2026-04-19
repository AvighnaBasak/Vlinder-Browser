import { forwardRef } from 'react'
import { Tab as Platform } from '@/app/types/tab'
import { getSessionPartition } from '@/app/utils/session-helpers'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string
          useragent?: string
          partition?: string
          allowpopups?: string
        },
        HTMLElement
      >
    }
  }
}

interface WebviewSurfaceProps {
  platform: Platform
  className?: string
}

const WebviewSurface = forwardRef<HTMLElement, WebviewSurfaceProps>(({ platform, className }, ref) => {
  return (
    <webview
      ref={ref}
      src={platform.url}
      useragent={platform.userAgent}
      partition={getSessionPartition(platform)}
      className={className}
      {...({ allowpopups: 'true' } as any)}
    />
  )
})

WebviewSurface.displayName = 'WebviewSurface'

export default WebviewSurface
