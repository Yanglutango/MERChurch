import { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'

interface AdminActionProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Wrapper component that only renders children if user is admin
 * Provides contextual admin actions without fragmenting UI
 */
export const AdminAction = ({ children, fallback = null }: AdminActionProps) => {
  const { user } = useAuth()
  
  if (user?.role !== 'admin') {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}
