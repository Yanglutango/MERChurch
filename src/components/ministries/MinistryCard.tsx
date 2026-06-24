import React from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Users, Edit2, Trash2, Crown, Tag, HandHeart, Loader2, UserPlus, UserMinus, Activity } from 'lucide-react'
import type { Ministry } from '../../types'

// Definição estendida para suportar a árvore de dados do Supabase com perfis dos membros
interface MemberRelation {
  user_profiles: {
    username: string
    avatar_url: string | null
  }
}

interface MinistryCardProps {
  ministry: Ministry & { 
    memberCount: number; 
    leader?: { username: string; avatar_url?: string }
    membersList: MemberRelation[]
  }
  isJoined: boolean
  isPending: boolean
  isGuest: boolean
  canManage: boolean
  isAdmin: boolean
  onToggleJoin: (id: string) => void
  onEdit: (m: any) => void
  onDelete: (id: string) => void
  onAuthNavigate: () => void
}

export const MinistryCard: React.FC<MinistryCardProps> = React.memo(({
  ministry,
  isJoined,
  isPending,
  isGuest,
  canManage,
  isAdmin,
  onToggleJoin,
  onEdit,
  onDelete,
  onAuthNavigate
}) => {
  // Limita a exibição visual a no máximo 4 avatares para manter a UI limpa
  const maxDisplayMembers = 4
  const displayMembers = ministry.membersList?.slice(0, maxDisplayMembers) || []
  const remainingMembersCount = Math.max(0, ministry.memberCount - maxDisplayMembers)

  return (
    <Card className="group relative overflow-hidden border bg-card text-card-foreground shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
      {/* Banner Superior Decorativo */}
      <div 
        className="h-28 relative flex items-center justify-center overflow-hidden"
        style={ministry.imageUrl ? undefined : { backgroundColor: `${ministry.color}12` }}
      >
        {ministry.imageUrl ? (
          <img 
            src={ministry.imageUrl} 
            alt={ministry.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="p-4 rounded-full bg-background/50 backdrop-blur-sm shadow-inner">
            <Users className="h-10 w-10 transition-transform duration-300 group-hover:rotate-3" style={{ color: ministry.color }} />
          </div>
        )}
        
        {isJoined && !isGuest && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600/95 text-white rounded-full shadow-md backdrop-blur-sm">
            <Activity className="h-3 w-3 animate-pulse" />
            <span className="text-[10px] font-bold tracking-wider uppercase">Membro Ativo</span>
          </div>
        )}
      </div>

      {/* Corpo do Cartão */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Título e Ações */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-lg text-foreground leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-1">
              {ministry.name}
            </h3>
            {canManage && (
              <div className="flex gap-1 bg-muted/60 p-0.5 rounded-md backdrop-blur-sm opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  size="sm" variant="ghost" onClick={() => onEdit(ministry)}
                  className="h-7 w-7 p-0 hover:bg-background" aria-label={`Editar ${ministry.name}`}
                >
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </Button>
                {isAdmin && (
                  <Button
                    size="sm" variant="ghost" onClick={() => onDelete(ministry.id)}
                    className="h-7 w-7 p-0 hover:bg-destructive/10" aria-label={`Excluir ${ministry.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Área do Líder */}
          {ministry.leader?.username && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-1.5 rounded-lg border border-border/40">
              {ministry.leader.avatar_url ? (
                <img src={ministry.leader.avatar_url} alt={ministry.leader.username} className="h-4 w-4 rounded-full object-cover" />
              ) : (
                <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
              )}
              <span className="truncate">Liderado por <span className="font-semibold text-foreground">{ministry.leader.username}</span></span>
            </div>
          )}

          {/* Descrição */}
          {ministry.description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 min-h-[4.5em]">
              {ministry.description}
            </p>
          )}

          {/* Atividades / Tags */}
          {(ministry as any).activities && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/40 px-2 py-1 rounded-md w-fit max-w-full">
              <Tag className="h-3 w-3 flex-shrink-0" style={{ color: ministry.color }} />
              <span className="truncate text-[11px] font-medium">{(ministry as any).activities}</span>
            </div>
          )}
        </div>

        {/* Rodapé Dinâmico com Facepile de Perfis (Add Member Profiles) */}
        <div className="space-y-3 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <HandHeart className="h-4 w-4" style={{ color: ministry.color }} />
              <span className="font-semibold text-foreground">
                {ministry.memberCount} {ministry.memberCount === 1 ? 'voluntário' : 'voluntários'}
              </span>
            </div>

            {/* Renderização do Facepile dos Membros do Ministério */}
            {displayMembers.length > 0 && (
              <div className="flex -space-x-2 overflow-hidden items-center">
                {displayMembers.map((member, idx) => {
                  const profile = member.user_profiles;
                  if (!profile) return null;
                  return profile.avatar_url ? (
                    <img
                      key={idx}
                      className="inline-block h-6 w-6 rounded-full ring-2 ring-background object-cover"
                      src={profile.avatar_url}
                      alt={profile.username || 'Membro'}
                      title={profile.username}
                    />
                  ) : (
                    <div
                      key={idx}
                      className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-[#0A2E4A] text-[9px] font-bold text-white flex items-center justify-center uppercase"
                      title={profile.username}
                    >
                      {profile.username?.slice(0, 2) || 'MB'}
                    </div>
                  );
                })}
                {remainingMembersCount > 0 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground ring-2 ring-background">
                    +{remainingMembersCount}
                  </div>
                )}
              </div>
            )}
          </div>

          {isGuest ? (
            <Button 
              onClick={onAuthNavigate} 
              size="sm" 
              className="w-full text-white font-bold tracking-wide shadow-sm" 
              style={{ backgroundColor: ministry.color }}
            >
              <UserPlus className="h-3.5 w-3.5 mr-2" />Unir-se ao Ministério
            </Button>
          ) : isJoined ? (
            <Button
              onClick={() => onToggleJoin(ministry.id)}
              disabled={isPending}
              size="sm"
              variant="outline"
              className="w-full font-bold tracking-wide border-red-200/60 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <UserMinus className="h-3.5 w-3.5 mr-2" />}
              Deixar Ministério
            </Button>
          ) : (
            <Button
              onClick={() => onToggleJoin(ministry.id)}
              disabled={isPending}
              size="sm"
              variant="outline"
              className="w-full font-bold tracking-wide"
              style={{ borderColor: ministry.color, color: ministry.color }}
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-2" />}
              Quero Participar
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
})

MinistryCard.displayName = 'MinistryCard'
