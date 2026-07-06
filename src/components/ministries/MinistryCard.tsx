import React from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Users, Edit2, Trash2, Crown, Tag, HandHeart, Loader2, UserPlus, UserMinus, Activity, Eye } from 'lucide-react'

interface MemberRelation {
  user_profiles: {
    username: string
    avatar_url: string | null
  }
}

interface MinistryCardProps {
  ministry: any
  isJoined: boolean
  isPending: boolean
  isGuest: boolean
  canManage: boolean
  isAdmin: boolean
  /** True when the user has already reached the 3-ministry limit and is NOT a member of this one */
  atLimit?: boolean
  onToggleJoin: (id: string) => void
  onEdit: (m: any) => void
  onDelete: (id: string) => void
  onAuthNavigate: () => void
  onViewDetails: (m: any) => void
}

export const MinistryCard: React.FC<MinistryCardProps> = React.memo(({
  ministry,
  isJoined,
  isPending,
  isGuest,
  canManage,
  isAdmin,
  atLimit = false,
  onToggleJoin,
  onEdit,
  onDelete,
  onAuthNavigate,
  onViewDetails
}) => {
  const maxDisplayMembers = 4
  const displayMembers = ministry.membersList?.slice(0, maxDisplayMembers) || []
  const remainingMembersCount = Math.max(0, ministry.memberCount - maxDisplayMembers)

  return (
    <Card className="group relative overflow-hidden border bg-card text-card-foreground shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
      {/* Banner */}
      <div
        className="h-28 relative flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={() => onViewDetails(ministry)}
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
            <Users className="h-10 w-10 text-muted-foreground" style={{ color: ministry.color }} />
          </div>
        )}

        {isJoined && !isGuest && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600/95 text-white rounded-full shadow-md backdrop-blur-sm">
            <Activity className="h-3 w-3 animate-pulse" />
            <span className="text-[10px] font-bold tracking-wider uppercase">Membro Ativo</span>
          </div>
        )}

        {atLimit && !isJoined && (
          <div className="absolute top-3 left-3 px-2 py-0.5 bg-amber-500/90 text-white rounded-full text-[10px] font-bold">
            Limite
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-white text-xs font-bold flex items-center gap-1 bg-background/20 backdrop-blur-md px-3 py-1.5 rounded-full">
            <Eye className="h-3.5 w-3.5" /> Detalhes
          </span>
        </div>
      </div>

      {/* Corpo */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={() => onViewDetails(ministry)}
              className="font-bold text-lg text-foreground leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-1 cursor-pointer"
            >
              {ministry.name}
            </h3>
            {canManage && (
              <div className="flex gap-1 bg-muted/60 p-0.5 rounded-md backdrop-blur-sm opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button size="sm" variant="ghost" onClick={() => onEdit(ministry)} className="h-7 w-7 p-0 hover:bg-background">
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </Button>
                {isAdmin && (
                  <Button size="sm" variant="ghost" onClick={() => onDelete(ministry.id)} className="h-7 w-7 p-0 hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                )}
              </div>
            )}
          </div>

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

          {ministry.description && (
            <p
              onClick={() => onViewDetails(ministry)}
              className="text-xs text-muted-foreground leading-relaxed line-clamp-3 min-h-[4.5em] cursor-pointer"
            >
              {ministry.description}
            </p>
          )}

          {(ministry as any).activities && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/40 px-2 py-1 rounded-md w-fit max-w-full">
              <Tag className="h-3 w-3 flex-shrink-0" style={{ color: ministry.color }} />
              <span className="truncate text-[11px] font-medium">{(ministry as any).activities}</span>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="space-y-3 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <HandHeart className="h-4 w-4" style={{ color: ministry.color }} />
              <span className="font-semibold text-foreground">
                {ministry.memberCount} {ministry.memberCount === 1 ? 'voluntário' : 'voluntários'}
              </span>
            </div>

            {displayMembers.length > 0 && (
              <div className="flex -space-x-2 overflow-hidden items-center">
                {displayMembers.map((member: any, idx: number) => {
                  const profile = member.user_profiles
                  if (!profile) return null
                  return profile.avatar_url ? (
                    <img key={idx} className="inline-block h-6 w-6 rounded-full ring-2 ring-background object-cover" src={profile.avatar_url} alt={profile.username} />
                  ) : (
                    <div key={idx} className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-[#0A2E4A] text-[9px] font-bold text-white flex items-center justify-center uppercase">
                      {profile.username?.slice(0, 2) || 'MB'}
                    </div>
                  )
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
            <Button onClick={onAuthNavigate} size="sm" className="w-full text-white font-bold tracking-wide shadow-sm" style={{ backgroundColor: ministry.color }}>
              <UserPlus className="h-3.5 w-3.5 mr-2" />Unir-se ao Ministério
            </Button>
          ) : isJoined ? (
            <Button onClick={() => onToggleJoin(ministry.id)} disabled={isPending} size="sm" variant="outline"
              className="w-full font-bold tracking-wide border-red-200/60 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/30">
              {isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <UserMinus className="h-3.5 w-3.5 mr-2" />}
              Deixar Ministério
            </Button>
          ) : atLimit ? (
            <Button size="sm" variant="outline" disabled className="w-full font-bold tracking-wide opacity-60 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
              Limite de 3 atingido
            </Button>
          ) : (
            <Button onClick={() => onToggleJoin(ministry.id)} disabled={isPending} size="sm" variant="outline"
              className="w-full font-bold tracking-wide" style={{ borderColor: ministry.color, color: ministry.color }}>
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
