CREATE TYPE public.lesson_kind AS ENUM ('video', 'text', 'quiz', 'survey');

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS is_prerequisite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pass_threshold_pct integer NOT NULL DEFAULT 80;

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_kind_check;

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_kind_check CHECK (kind IN ('video', 'text', 'quiz', 'survey'));

ALTER TABLE public.survey_responses
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_survey_responses_lesson ON public.survey_responses(lesson_id);

ALTER TABLE public.survey_responses
  ADD CONSTRAINT survey_responses_user_question_unique UNIQUE (user_id, question_id);