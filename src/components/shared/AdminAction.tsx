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
  // Puxamos a role consolidada do seu useAuth (que corrigiremos no passo 5 para ser a única fonte da verdade)
  const { role } = useAuth()
  
  // Normalizando para caixa alta ou baixa dependendo de como salvou no banco (ex: 'admin' ou 'ADMIN')
  const isAdmin = role?.toLowerCase() === 'admin'
  
  if (!isAdmin) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}
