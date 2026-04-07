'use client'

import { cn, getAssetUrl } from '@/lib/utils'

const sizeClasses = {
  xs: 'h-6 w-6 text-[0.5rem]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-16 w-16 text-base',
}

export interface UserAvatarProps {
  src?: string | null
  firstName?: string | null
  lastName?: string | null
  alt?: string
  size?: keyof typeof sizeClasses
  /** Show green online indicator */
  showOnline?: boolean
  className?: string
}

export function UserAvatar({
  src,
  firstName,
  lastName,
  alt,
  size = 'md',
  showOnline = false,
  className,
}: UserAvatarProps) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`
  const resolvedAlt = alt ?? (`${firstName ?? ''} ${lastName ?? ''}`.trim() || 'User')

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700 overflow-hidden',
        sizeClasses[size],
        className,
      )}
    >
      {src ? (
        <img
          src={getAssetUrl(src)}
          alt={resolvedAlt}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
      {showOnline && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
      )}
    </div>
  )
}
