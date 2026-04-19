import * as React from 'react'

import { cn } from '@/lib/utils'

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

function Switch({ checked = false, onCheckedChange, className, disabled, ...props }: SwitchProps) {
  const [hasChanged, setHasChanged] = React.useState(false)
  const prevCheckedRef = React.useRef(checked)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled && onCheckedChange) {
      setHasChanged(true)
      onCheckedChange(e.target.checked)
    }
  }

  React.useEffect(() => {
    if (prevCheckedRef.current !== checked) {
      setHasChanged(true)
    }
    prevCheckedRef.current = checked
  }, [checked])

  return (
    <>
      <svg style={{ display: 'none' }}>
        <filter id="mini-liquid-lens" x="-50%" y="-50%" width="200%" height="200%">
          <feImage
            x="20"
            y="-66"
            result="normalMap"
            href="data:image/svg+xml;utf8,
              <svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>
                <radialGradient id='invmap' cx='50%' cy='90%' r='50%'>
                  <stop offset='0%' stop-color='rgb(255,255,255)'/>
                  <stop offset='100%' stop-color='rgb(128,128,255)'/>
                </radialGradient>
                <rect width='100%' height='100%' fill='url(#invmap)'/>
              </svg>"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="normalMap"
            scale="8"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feMerge>
            <feMergeNode in="displaced" />
          </feMerge>
        </filter>
      </svg>
      <label className={cn('switch', className, disabled && 'switch-disabled')}>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          {...props}
        />
        <div className="switch-slider"></div>
        <div className={cn('switch-dot-glass', hasChanged && 'switch-dot-glass-animated')}>
          <div className="switch-dot-glass-filter"></div>
          <div className="switch-dot-glass-overlay"></div>
          <div className="switch-dot-glass-specular"></div>
        </div>
      </label>
    </>
  )
}

export { Switch }
