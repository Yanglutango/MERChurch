-- ============================================================================
-- 📚 LMS COMPLETE MIGRATION - Create all necessary tables for Learning Management
-- ============================================================================

-- ✅ 1. COURSE_PROGRESS - Track user progress per course
CREATE TABLE IF NOT EXISTS course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completed_lessons_count INT DEFAULT 0 CHECK (completed_lessons_count >= 0),
  total_lessons_count INT DEFAULT 0 CHECK (total_lessons_count >= 0),
  progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- ✅ 2. LESSON_PROGRESS - Track which lessons user completed
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMP,
  video_watched_percentage INT DEFAULT 0 CHECK (video_watched_percentage >= 0 AND video_watched_percentage <= 100),
  time_spent_minutes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- ✅ 3. QUIZ - Quizzes for lessons
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  passing_score INT DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
  attempts_allowed INT DEFAULT 3,
  time_limit_minutes INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ✅ 4. QUIZ_QUESTIONS - Questions within quiz
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'multiple_choice', -- multiple_choice, true_false, short_answer
  options JSONB, -- Array of options for multiple choice
  correct_answer INT, -- Index or text
  explanation TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ✅ 5. QUIZ_ATTEMPTS - Track quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score INT,
  passed BOOLEAN,
  answers JSONB, -- User's answers
  attempt_number INT DEFAULT 1,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ 6. COURSE_CERTIFICATES - Issued certificates
CREATE TABLE IF NOT EXISTS course_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  certificate_url VARCHAR(500),
  verification_code VARCHAR(100) UNIQUE NOT NULL,
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- ✅ 7. USER_LEARNING_STATS - Gamification stats
CREATE TABLE IF NOT EXISTS user_learning_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points_earned INT DEFAULT 0,
  courses_completed INT DEFAULT 0,
  lessons_completed INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_at TIMESTAMP,
  badges JSONB DEFAULT '[]'::jsonb, -- Array of badge IDs
  rank VARCHAR(50) DEFAULT 'iniciante', -- iniciante, aprendiz, estudioso, mestre
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ✅ 8. BADGES - Achievement badges
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_url VARCHAR(500),
  color VARCHAR(20), -- hex color
  requirement_type VARCHAR(50), -- lessons_completed, points_earned, courses_completed, streak_days
  requirement_value INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ 9. USER_BADGES - User earned badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- ✅ 10. COURSE_DISCUSSIONS - Forum discussions per course
CREATE TABLE IF NOT EXISTS course_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  likes_count INT DEFAULT 0,
  replies_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ✅ 11. DISCUSSION_REPLIES - Replies to discussions
CREATE TABLE IF NOT EXISTS discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES course_discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ✅ 12. COURSE_RESOURCES - Additional resources per course
CREATE TABLE IF NOT EXISTS course_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  resource_type VARCHAR(50), -- pdf, video, link, file
  url VARCHAR(500),
  file_size_mb DECIMAL(10,2),
  downloads_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 📊 INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_course_progress_user_course ON course_progress(user_id, course_id);
CREATE INDEX idx_course_progress_user ON course_progress(user_id);
CREATE INDEX idx_course_progress_course ON course_progress(course_id);

CREATE INDEX idx_lesson_progress_user_lesson ON lesson_progress(user_id, lesson_id);
CREATE INDEX idx_lesson_progress_course ON lesson_progress(course_id);
CREATE INDEX idx_lesson_progress_completed ON lesson_progress(completed_at) WHERE completed_at IS NOT NULL;

CREATE INDEX idx_quiz_lesson ON quizzes(lesson_id);

CREATE INDEX idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id);
CREATE INDEX idx_quiz_attempts_completed ON quiz_attempts(completed_at) WHERE completed_at IS NOT NULL;

CREATE INDEX idx_certificates_user_course ON course_certificates(user_id, course_id);
CREATE INDEX idx_certificates_verification ON course_certificates(verification_code);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);

CREATE INDEX idx_discussions_course ON course_discussions(course_id);
CREATE INDEX idx_discussions_user ON course_discussions(user_id);

CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);

-- ============================================================================
-- 🔄 UPDATE EXISTING TABLES
-- ============================================================================

-- Add columns to enrollments table if they don't exist
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS certificate_id UUID REFERENCES course_certificates(id);

-- Add columns to courses table if they don't exist
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_id UUID;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ============================================================================
-- 🔐 ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- course_progress - Users can only see their own progress
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own course progress"
  ON course_progress FOR SELECT
  USING (auth.uid() = user_id OR 
         auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can update own course progress"
  ON course_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- lesson_progress - Users can only see their own progress
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lesson progress"
  ON lesson_progress FOR SELECT
  USING (auth.uid() = user_id OR 
         auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can update own lesson progress"
  ON lesson_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- quiz_attempts - Users can only see their own attempts
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz attempts"
  ON quiz_attempts FOR SELECT
  USING (auth.uid() = user_id OR 
         auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can create quiz attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- course_certificates - Users can only see their own certificates
ALTER TABLE course_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificates"
  ON course_certificates FOR SELECT
  USING (auth.uid() = user_id OR 
         auth.jwt() ->> 'role' = 'admin');

-- course_discussions - Anyone can view, users can manage their own
ALTER TABLE course_discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course discussions"
  ON course_discussions FOR SELECT
  USING (true);

CREATE POLICY "Users can create discussions"
  ON course_discussions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own discussions"
  ON course_discussions FOR UPDATE
  USING (auth.uid() = user_id OR 
         auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- 📝 INITIAL BADGES SEED
-- ============================================================================

INSERT INTO badges (name, description, icon_url, color, requirement_type, requirement_value) VALUES
('Primeiros Passos', 'Complete seu primeiro curso', 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=first', '#4CAF50', 'courses_completed', 1),
('Aprendiz Dedicado', 'Complete 5 cursos', 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=student', '#2196F3', 'courses_completed', 5),
('Mestre dos Estudos', 'Complete 10 cursos', 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=master', '#FFB300', 'courses_completed', 10),
('Consistente', 'Mantenha uma sequência de 7 dias', 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=streak', '#FF6F00', 'streak_days', 7),
('Pontuação 100', 'Ganhe 100 pontos', 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=points100', '#9C27B0', 'points_earned', 100),
('Pontuação 500', 'Ganhe 500 pontos', 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=points500', '#FF1744', 'points_earned', 500),
('50 Lições Concluídas', 'Complete 50 lições', 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=lessons50', '#00BCD4', 'lessons_completed', 50),
('100 Lições Concluídas', 'Complete 100 lições', 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=lessons100', '#673AB7', 'lessons_completed', 100)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 📌 FUNCTIONS FOR AUTO-UPDATING PROGRESS
-- ============================================================================

-- Function to update course progress when lesson is completed
CREATE OR REPLACE FUNCTION update_course_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE course_progress
  SET 
    completed_lessons_count = (
      SELECT COUNT(*) FROM lesson_progress 
      WHERE user_id = NEW.user_id AND course_id = NEW.course_id AND completed_at IS NOT NULL
    ),
    progress_percentage = ROUND(
      (
        SELECT COUNT(*) FROM lesson_progress 
        WHERE user_id = NEW.user_id AND course_id = NEW.course_id AND completed_at IS NOT NULL
      )::numeric / 
      (
        SELECT COUNT(*) FROM lessons WHERE course_id = NEW.course_id
      ) * 100
    )::int,
    updated_at = NOW()
  WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER trigger_update_course_progress
AFTER INSERT OR UPDATE ON lesson_progress
FOR EACH ROW
EXECUTE FUNCTION update_course_progress();

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  badge_id UUID;
  badge_exists BOOLEAN;
BEGIN
  -- Loop through all badges and check if user qualifies
  FOR badge_id IN SELECT id FROM badges LOOP
    SELECT EXISTS(
      SELECT 1 FROM user_badges 
      WHERE user_id = NEW.user_id AND badges.id = badge_id
    ) INTO badge_exists;
    
    IF NOT badge_exists THEN
      -- Check each badge requirement
      CASE (SELECT requirement_type FROM badges WHERE id = badge_id)
        WHEN 'courses_completed' THEN
          IF (SELECT COUNT(*) FROM enrollments WHERE user_id = NEW.user_id AND completed_at IS NOT NULL) >= 
             (SELECT requirement_value FROM badges WHERE id = badge_id) THEN
            INSERT INTO user_badges (user_id, badge_id) VALUES (NEW.user_id, badge_id)
            ON CONFLICT DO NOTHING;
          END IF;
        WHEN 'lessons_completed' THEN
          IF (SELECT COUNT(*) FROM lesson_progress WHERE user_id = NEW.user_id AND completed_at IS NOT NULL) >= 
             (SELECT requirement_value FROM badges WHERE id = badge_id) THEN
            INSERT INTO user_badges (user_id, badge_id) VALUES (NEW.user_id, badge_id)
            ON CONFLICT DO NOTHING;
          END IF;
      END CASE;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for badge awarding
CREATE TRIGGER trigger_check_badges
AFTER INSERT OR UPDATE ON user_learning_stats
FOR EACH ROW
EXECUTE FUNCTION check_and_award_badges();
