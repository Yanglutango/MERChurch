/**
 * Activity Logger — platform-wide event logging utility
 * 
 * Call logActivity() from any page to record user actions in the
 * platform_activity table. Dashboard and HomePage consume this feed.
 */

import { supabase } from './supabase'

export type ActivityType =
  | 'sermon_published'
  | 'prayer_created'
  | 'post_created'
  | 'event_created'
  | 'member_joined'
  | 'course_started'
  | 'testimony_submitted'
  | 'group_created'
  | 'ministry_joined'
  | 'donation_made'

export interface LogActivityParams {
  type: ActivityType
  actorId: string
  actorName: string
  title: string
  referenceId?: string
  referenceType?: string
  metadata?: Record<string, unknown>
}

/**
 * Log a platform activity event.
 * Fails silently — never blocks user flow.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await supabase.from('platform_activity').insert({
      type: params.type,
      actor_id: params.actorId,
      actor_name: params.actorName,
      title: params.title,
      reference_id: params.referenceId || null,
      reference_type: params.referenceType || null,
      metadata: params.metadata || {},
    })
  } catch (err) {
    // Silently fail — activity logging should never block the user
    console.warn('[logActivity] Failed to log activity:', err)
  }
}

/**
 * Returns a human-readable label for an activity type
 */
export function getActivityLabel(type: ActivityType | string): string {
  const labels: Record<string, string> = {
    sermon_published: '📖 Sermão publicado',
    prayer_created: '🙏 Pedido de oração',
    post_created: '💬 Publicação na comunidade',
    event_created: '📅 Evento criado',
    member_joined: '👤 Novo membro',
    course_started: '🎓 Curso iniciado',
    testimony_submitted: '✨ Testemunho compartilhado',
    group_created: '👥 Grupo criado',
    ministry_joined: '⛪ Entrou num ministério',
    donation_made: '💰 Contribuição realizada',
  }
  return labels[type] || `📌 ${type}`
}

/**
 * Returns an icon color class for an activity type
 */
export function getActivityColor(type: ActivityType | string): string {
  const colors: Record<string, string> = {
    sermon_published: 'text-purple-600 dark:text-purple-400',
    prayer_created: 'text-rose-600 dark:text-rose-400',
    post_created: 'text-blue-600 dark:text-blue-400',
    event_created: 'text-indigo-600 dark:text-indigo-400',
    member_joined: 'text-green-600 dark:text-green-400',
    course_started: 'text-amber-600 dark:text-amber-400',
    testimony_submitted: 'text-teal-600 dark:text-teal-400',
    group_created: 'text-violet-600 dark:text-violet-400',
    ministry_joined: 'text-emerald-600 dark:text-emerald-400',
    donation_made: 'text-yellow-600 dark:text-yellow-400',
  }
  return colors[type] || 'text-muted-foreground'
}
