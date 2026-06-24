import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Users, Edit2, Trash2, UserPlus, LogIn, Loader2 } from 'lucide-react'
import type { Ministry } from '../../types'

interface MinistryCardProps {
  ministry: Ministry & { memberCount?: number; leader?: { username: string; avatar_url?: string } }
  isJoined: boolean
  isPending: boolean
  isGuest: boolean
  canManage: boolean
  isAdmin: boolean
  onToggleJoin: (id: string) => void
  onEdit: (ministry: Ministry) => void
  onDelete: (id: string) => void
  onAuthNavigate: () => void
}

export function MinistryCard({
  ministry,
  isJoined,
  isPending,
  isGuest,
  canManage,
  isAdmin,
  onToggleJoin,
  onEdit,
  onDelete,
  onAuthNavigate,
}: MinistryCardProps) {
  const color = ministry.color || '#4A90A4'
  const activities = (ministry as any).activities as string | undefined
  const activityTags = activities
    ? activities.split(',').map(a => a.trim()).filter(Boolean).slice(0, 4)
    : []

  return (
    <Card className="group relative flex flex-col overflow-hidden border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-200 rounded-xl bg-card">
      {/* Color Bar / Image Header */}
      <div
        className="relative h-28 flex-shrink-0 overflow-hidden"
        style={{ backgroundColor: color + '22' }}
      >
        {ministry.imageUrl ? (
          <img
            src={ministry.imageUrl}
            alt={ministry.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: color + '33' }}
          >
            <span className="text-4xl font-black opacity-40 select-none" style={{ color }}>
              {ministry.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Color accent stripe */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: color }}
        />

        {/* Admin Controls */}
        {canManage && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm p-1 rounded-lg border border-white/10">
            <button
              onClick={() => onEdit(ministry)}
              className="p-1 hover:bg-white/20 rounded text-white transition-colors"
              title="Editar"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            {isAdmin && (
              <button
                onClick={() => onDelete(ministry.id)}
                className="p-1 hover:bg-red-500/40 rounded text-red-300 transition-colors"
                title="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2">
            {ministry.name}
          </h3>
          {ministry.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {ministry.description}
            </p>
          )}
        </div>

        {/* Activity Tags */}
        {activityTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activityTags.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] font-semibold rounded-full border"
                style={{
                  backgroundColor: color + '18',
                  color: color,
                  borderColor: color + '40',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 mt-auto">
          {/* Member Count */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium">{ministry.memberCount ?? 0} membros</span>
          </div>

          {/* Join / Auth Button */}
          {isGuest ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onAuthNavigate}
              className="h-7 text-[11px] font-bold px-3"
            >
              <LogIn className="h-3 w-3 mr-1" /> Entrar
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => onToggleJoin(ministry.id)}
              className={`h-7 text-[11px] font-bold px-3 transition-all ${
                isJoined
                  ? 'bg-emerald-600 hover:bg-red-600 text-white'
                  : 'bg-transparent border border-border text-foreground hover:bg-muted'
              }`}
              style={!isJoined ? { borderColor: color + '80', color } : {}}
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isJoined ? (
                'Participando'
              ) : (
                <>
                  <UserPlus className="h-3 w-3 mr-1" /> Participar
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
