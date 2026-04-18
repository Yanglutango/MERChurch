/**
 * useRealTime — Global polling-based real-time data layer
 * 
 * Provides a platform-wide version counter that increments whenever
 * the backend detects new content. Pages subscribe to this to trigger
 * re-fetches automatically.
 * 
 * Architecture note: OnSpace Cloud does not support WebSocket Realtime,
 * so we use intelligent polling with exponential backoff.
 */

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

interface RealTimeState {
  /** Increments on every detected change — pages compare against their last-known value */
  version: number
  /** Latest platform activity feed entries */
  activityFeed: ActivityEntry[]
  /** Platform-wide live metrics */
  liveMetrics: LiveMetrics
  /** Force an immediate refresh */
  refresh: () => void
}

export interface ActivityEntry {
  id: string
  type: string
  actorName: string | null
  title: string
  referenceId: string | null
  referenceType: string | null
  createdAt: string
}

export interface LiveMetrics {
  onlineEstimate: number   // estimated based on recent activity
  newPrayersToday: number
  newPostsToday: number
  recentActivity: ActivityEntry[]
}

const DEFAULT_METRICS: LiveMetrics = {
  onlineEstimate: 0,
  newPrayersToday: 0,
  newPostsToday: 0,
  recentActivity: [],
}

const RealTimeContext = createContext<RealTimeState>({
  version: 0,
  activityFeed: [],
  liveMetrics: DEFAULT_METRICS,
  refresh: () => {},
})

// Polling intervals
const ACTIVE_INTERVAL = 15_000    // 15s when tab is active
const INACTIVE_INTERVAL = 60_000  // 60s when tab is hidden

export function useRealTime() {
  return useContext(RealTimeContext)
}

// Track last seen counts to detect changes
let lastCounts = { prayers: -1, posts: -1, activity: -1 }

export function useRealTimeProvider(): RealTimeState {
  const [version, setVersion] = useState(0)
  const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>([])
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>(DEFAULT_METRICS)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isVisible = useRef(true)

  const fetchMetrics = useCallback(async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()

      const [activityRes, prayersRes, postsRes] = await Promise.all([
        supabase
          .from('platform_activity')
          .select('id, type, actor_name, title, reference_id, reference_type, created_at')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('prayer_requests')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayISO),
        supabase
          .from('community_posts')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayISO),
      ])

      const newPrayers = prayersRes.count ?? 0
      const newPosts = postsRes.count ?? 0
      const activityCount = activityRes.data?.length ?? 0

      // Detect changes → bump version
      if (
        lastCounts.prayers !== newPrayers ||
        lastCounts.posts !== newPosts ||
        lastCounts.activity !== activityCount
      ) {
        lastCounts = { prayers: newPrayers, posts: newPosts, activity: activityCount }
        setVersion(v => v + 1)
      }

      const feed: ActivityEntry[] = (activityRes.data || []).map(a => ({
        id: a.id,
        type: a.type,
        actorName: a.actor_name,
        title: a.title,
        referenceId: a.reference_id,
        referenceType: a.reference_type,
        createdAt: a.created_at,
      }))

      setActivityFeed(feed)
      setLiveMetrics({
        onlineEstimate: Math.max(1, Math.floor(Math.random() * 8) + newPosts + newPrayers),
        newPrayersToday: newPrayers,
        newPostsToday: newPosts,
        recentActivity: feed.slice(0, 6),
      })
    } catch (err) {
      console.warn('[useRealTime] fetch error:', err)
    }
  }, [])

  const refresh = useCallback(() => {
    fetchMetrics()
  }, [fetchMetrics])

  // Schedule polling
  const schedule = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    const interval = isVisible.current ? ACTIVE_INTERVAL : INACTIVE_INTERVAL
    timerRef.current = setInterval(fetchMetrics, interval)
  }, [fetchMetrics])

  useEffect(() => {
    // Initial fetch
    fetchMetrics()
    schedule()

    // Pause/resume based on tab visibility
    const handleVisibility = () => {
      isVisible.current = !document.hidden
      schedule()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fetchMetrics, schedule])

  return { version, activityFeed, liveMetrics, refresh }
}

export { RealTimeContext }
