import React from 'react'
import { cn } from '@/lib/utils'

/**
 * Badge de Ministério - Componente customizado para exibir ministérios
 * 
 * Exibe um ministério com cor customizada, ícone e nome
 */

export interface MinistryBadgeProps {
  name: string
  color?: string
  icon: React.ReactNode
  count?: number
  isActive?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

export const MinistryBadge = React.forwardRef<HTMLButtonElement, MinistryBadgeProps>(
  ({
    name,
    color = '#0A2E4A',
    icon,
    count,
    isActive,
    onClick,
    size = 'md',
  }, ref) => {
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-3 text-base gap-2.5',
    }

    return (
      <button
        ref={ref}
        onClick={onClick}
        className={cn(
          'inline-flex items-center font-medium rounded-full transition-all duration-200',
          'border-2 hover:shadow-md',
          isActive ? 'border-current shadow-md' : 'border-current/30 hover:border-current/60',
          sizeClasses[size],
        )}
        style={{
          backgroundColor: isActive ? `${color}15` : 'transparent',
          color: color,
          borderColor: color,
        }}
        title={name}
      >
        <span className="flex-shrink-0">{icon}</span>
        <span className="truncate">{name}</span>
        {count !== undefined && (
          <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-current/20">
            {count}
          </span>
        )}
      </button>
    )
  },
)

MinistryBadge.displayName = 'MinistryBadge'
