-- CodeCraft Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- ===========================================
-- ENUMS
-- ===========================================

CREATE TYPE user_role AS ENUM ('host', 'student');
CREATE TYPE test_status AS ENUM ('draft', 'scheduled', 'active', 'completed');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE participant_status AS ENUM ('registered', 'started', 'submitted');
CREATE TYPE event_type AS ENUM ('tab_switch', 'copy_paste', 'paste', 'window_blur', 'right_click');


-- ===========================================
-- TABLES
-- ===========================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tests table
CREATE TABLE public.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    languages TEXT[] NOT NULL DEFAULT ARRAY['python'],
    status test_status NOT NULL DEFAULT 'draft',
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty difficulty_level NOT NULL DEFAULT 'medium',
    points INTEGER NOT NULL DEFAULT 100,
    order_index INTEGER NOT NULL DEFAULT 0
);

-- Testcases table
CREATE TABLE public.testcases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0
);

-- Participants table
CREATE TABLE public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    status participant_status NOT NULL DEFAULT 'registered',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    UNIQUE(user_id, test_id)
);

-- Submissions table
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language TEXT NOT NULL,
    testcases_passed INTEGER DEFAULT 0,
    total_testcases INTEGER DEFAULT 0,
    rule_based_score FLOAT DEFAULT 0,
    ai_evaluation JSONB,
    final_score FLOAT DEFAULT 0,
    execution_time TEXT,
    memory_used TEXT,
    runtime_error TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrity events table
CREATE TABLE public.integrity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    event_type event_type NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ===========================================
-- LEADERBOARD VIEW
-- ===========================================

CREATE VIEW public.leaderboard AS
SELECT 
    ROW_NUMBER() OVER (
        PARTITION BY p.test_id 
        ORDER BY COALESCE(SUM(s.final_score), 0) DESC, 
                 p.submitted_at ASC NULLS LAST
    ) as rank,
    p.test_id,
    p.id as participant_id,
    u.id as user_id,
    u.full_name as student_name,
    COALESCE(SUM(s.final_score), 0) as total_score,
    COALESCE(SUM(s.testcases_passed), 0) as total_testcases_passed,
    COALESCE(SUM(s.total_testcases), 0) as total_testcases,
    p.submitted_at - p.started_at as time_taken,
    p.submitted_at
FROM public.participants p
JOIN public.users u ON p.user_id = u.id
LEFT JOIN public.submissions s ON s.participant_id = p.id
WHERE p.status = 'submitted'
GROUP BY p.test_id, p.id, u.id, u.full_name, p.submitted_at, p.started_at;


-- ===========================================
-- INDEXES
-- ===========================================

CREATE INDEX idx_tests_host ON public.tests(host_id);
CREATE INDEX idx_tests_status ON public.tests(status);
CREATE INDEX idx_questions_test ON public.questions(test_id);
CREATE INDEX idx_testcases_question ON public.testcases(question_id);
CREATE INDEX idx_participants_test ON public.participants(test_id);
CREATE INDEX idx_participants_user ON public.participants(user_id);
CREATE INDEX idx_submissions_participant ON public.submissions(participant_id);
CREATE INDEX idx_submissions_question ON public.submissions(question_id);
CREATE INDEX idx_integrity_events_participant ON public.integrity_events(participant_id);


-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_events ENABLE ROW LEVEL SECURITY;


-- USERS POLICIES
CREATE POLICY "Users can read own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);


-- TESTS POLICIES
CREATE POLICY "Hosts can manage own tests" ON public.tests
    FOR ALL USING (auth.uid() = host_id);

CREATE POLICY "Students can view active/completed tests" ON public.tests
    FOR SELECT USING (status IN ('active', 'completed'));


-- QUESTIONS POLICIES
CREATE POLICY "Hosts can manage their test questions" ON public.questions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.tests WHERE id = test_id AND host_id = auth.uid())
    );

CREATE POLICY "Participants can view questions" ON public.questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.participants p
            JOIN public.tests t ON p.test_id = t.id
            WHERE t.id = test_id AND p.user_id = auth.uid()
        )
    );


-- TESTCASES POLICIES
CREATE POLICY "Hosts can manage testcases" ON public.testcases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.questions q
            JOIN public.tests t ON q.test_id = t.id
            WHERE q.id = question_id AND t.host_id = auth.uid()
        )
    );

CREATE POLICY "Participants can view sample testcases" ON public.testcases
    FOR SELECT USING (
        is_hidden = false AND
        EXISTS (
            SELECT 1 FROM public.questions q
            JOIN public.participants p ON q.test_id = p.test_id
            WHERE q.id = question_id AND p.user_id = auth.uid()
        )
    );


-- PARTICIPANTS POLICIES
CREATE POLICY "Users can manage own participation" ON public.participants
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Hosts can view their test participants" ON public.participants
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.tests WHERE id = test_id AND host_id = auth.uid())
    );


-- SUBMISSIONS POLICIES
CREATE POLICY "Users can manage own submissions" ON public.submissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.participants WHERE id = participant_id AND user_id = auth.uid())
    );

CREATE POLICY "Hosts can view submissions for their tests" ON public.submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.participants p
            JOIN public.tests t ON p.test_id = t.id
            WHERE p.id = participant_id AND t.host_id = auth.uid()
        )
    );


-- INTEGRITY EVENTS POLICIES
CREATE POLICY "Users can insert own integrity events" ON public.integrity_events
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.participants WHERE id = participant_id AND user_id = auth.uid())
    );

CREATE POLICY "Hosts can view integrity events for their tests" ON public.integrity_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.participants p
            JOIN public.tests t ON p.test_id = t.id
            WHERE p.id = participant_id AND t.host_id = auth.uid()
        )
    );


-- ===========================================
-- FUNCTIONS & TRIGGERS
-- ===========================================

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
