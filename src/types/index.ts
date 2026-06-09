export interface AuthUser {
  id: string
  email: string
  username: string
  avatar?: string
  role: 'member' | 'admin' | 'guest'
  phone?: string
  congregation?: string
  themeMode?: 'light' | 'dark' | 'system'
  accentColor?: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'sermon' | 'event' | 'announcement' | 'prayer' | 'counseling'
  isRead: boolean
  createdAt: string
}

export interface Sermon {
  id: string
  title: string
  description?: string
  speaker: string
  videoUrl?: string
  audioUrl?: string
  thumbnailUrl?: string
  date: string
  category?: string
  views: number
  createdAt: string
}

export interface Event {
  id: string
  title: string
  description?: string
  date: string
  endDate?: string
  location?: string
  imageUrl?: string
  category?: string
  maxAttendees?: number
  createdBy?: string
  createdAt: string
}

export interface Ministry {
  id: string
  name: string
  description?: string
  leaderId?: string
  imageUrl?: string
  color?: string
  createdAt: string
}

export interface PrayerRequest {
  id: string
  userId: string
  title: string
  description: string
  isAnonymous: boolean
  isAnswered: boolean
  prayerCount: number
  createdAt: string
  user?: {
    username: string
    avatar?: string
    avatar_url?: string
  }
}

export interface CounselingRequest {
  id: string
  userId: string
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  status: 'pending' | 'in_progress' | 'resolved'
  adminResponse?: string
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  userId?: string
  amount: number
  type: 'tithe' | 'offering' | 'donation' | 'project'
  method: 'credit_card' | 'debit_card' | 'pix' | 'transfer' | 'multicaixa'
  status: 'pending' | 'completed' | 'failed'
  paymentReference?: string
  multicaixaTransactionId?: string
  description?: string
  projectId?: string
  createdAt: string
}

export interface Course {
  id: string
  title: string
  description?: string
  instructorId?: string
  thumbnailUrl?: string
  durationHours?: number
  level?: 'beginner' | 'intermediate' | 'advanced'
  isPublished: boolean
  createdAt: string
}

export interface Enrollment {
  id: string
  userId: string
  courseId: string
  enrolledAt: string
  completedAt?: string
}

export interface Lesson {
  id: string
  courseId: string
  title: string
  content?: string
  videoUrl?: string
  orderIndex: number
  durationMinutes?: number
  createdAt: string
}

export interface CourseProgress {
  id: string
  userId: string
  courseId: string
  completedLessonsCount: number
  totalLessonsCount: number
  progressPercentage: number
  lastAccessedAt: string
}

export interface LessonProgress {
  id: string
  courseId: string
  lessonId: string
  userId: string
  completedAt?: string
  videoWatchedPercentage?: number
}

export interface CourseCertificate {
  id: string
  userId: string
  courseId: string
  issuedAt: string
  certificateUrl: string
  verificationCode: string
}

export interface Quiz {
  id: string
  lessonId: string
  title: string
  passingScore: number
  createdAt: string
}

export interface QuizQuestion {
  id: string
  quizId: string
  question: string
  options: string[]
  correctAnswer: number
  orderIndex: number
}

export interface QuizAttempt {
  id: string
  quizId: string
  userId: string
  score: number
  attempts: number
  completedAt?: string
}

export interface UserLearningStats {
  userId: string
  totalPointsEarned: number
  coursesCompleted: number
  lessonsCompleted: number
  currentStreak: number
  badges: string[]
  lastActivityAt?: string
}

export interface CourseDiscussion {
  id: string
  courseId: string
  userId: string
  title: string
  message: string
  createdAt: string
  user?: {
    username: string
    avatar?: string
  }
}

export interface CommunityPost {
  id: string
  userId: string
  content: string
  imageUrl?: string
  likesCount: number
  commentsCount: number
  createdAt: string
  user?: {
    username: string
    avatar?: string
    avatar_url?: string
  }
}

export interface LiveMessage {
  id: string
  userId: string
  message: string
  createdAt: string
  user?: {
    username: string
    avatar?: string
  }
}

export interface Testimony {
  id: string
  userId: string
  title: string
  content: string
  category?: string
  isAnonymous: boolean
  isApproved: boolean
  approvedBy?: string
  createdAt: string
  user?: {
    username: string
    avatar_url?: string
  }
}

export interface SpiritualResource {
  id: string
  title: string
  description?: string
  category: 'ebook' | 'study' | 'devotional' | 'discipleship' | 'other'
  fileUrl: string
  fileType?: string
  fileSize?: number
  downloadsCount: number
  tags?: string[]
  createdBy?: string
  createdAt: string
}

export interface SmallGroup {
  id: string
  name: string
  description?: string
  category?: string
  region?: string
  leaderId?: string
  maxMembers?: number
  meetingSchedule?: string
  isActive: boolean
  createdAt: string
  leader?: {
    username: string
    avatar?: string
  }
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string
  role: 'leader' | 'co-leader' | 'member'
  joinedAt: string
}

export interface GroupMessage {
  id: string
  groupId: string
  userId: string
  message: string
  createdAt: string
  user?: {
    username: string
    avatar?: string
  }
}

export interface GroupMeeting {
  id: string
  groupId: string
  title: string
  description?: string
  meetingDate: string
  location?: string
  createdBy?: string
  createdAt: string
}

export interface Badge {
  id: string
  name: string
  description: string
  icon_url?: string
  color?: string
  points_required?: number
  created_at?: string
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  badge?: Badge
}
