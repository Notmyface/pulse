-- Pulse kisisel todo migration'i
-- Supabase Dashboard > SQL Editor icinde calistirin.

CREATE TABLE IF NOT EXISTS public.personal_todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    note TEXT,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'done')),
    due_at TIMESTAMPTZ,
    remind_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS personal_todos_user_due_idx
    ON public.personal_todos (user_id, due_at);

ALTER TABLE public.personal_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal todos readable by owner" ON public.personal_todos;
DROP POLICY IF EXISTS "Personal todos insertable by owner" ON public.personal_todos;
DROP POLICY IF EXISTS "Personal todos updateable by owner" ON public.personal_todos;
DROP POLICY IF EXISTS "Personal todos deletable by owner" ON public.personal_todos;

CREATE POLICY "Personal todos readable by owner" ON public.personal_todos
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Personal todos insertable by owner" ON public.personal_todos
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Personal todos updateable by owner" ON public.personal_todos
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Personal todos deletable by owner" ON public.personal_todos
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
