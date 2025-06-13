import { assetPath } from '@/utils/assetPath'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  alt?: string
}

export function Logo ({
  className = '',
  size = 'md',
  alt = 'Clickomator Logo'
}: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <img
      src={assetPath('logo.png')}
      alt={alt}
      className={`${sizeClasses[size]} ${className}`}
    />
  )
}
