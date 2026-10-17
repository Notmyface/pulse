-- Pulse proje erişimi ve davet migration'i
-- Supabase Dashboard > SQL Editor icinde tek seferde calistirin.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.project_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'manager')),
    token UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_project_member(target_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = target_project_id AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_project_manager(target_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = target_project_id
          AND user_id = auth.uid()
          AND is_manager = TRUE
    ) OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = target_project_id AND created_by = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.add_project_owner_as_manager()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.project_members (project_id, user_id, is_manager)
    VALUES (NEW.id, NEW.created_by, TRUE)
    ON CONFLICT (project_id, user_id) DO UPDATE SET is_manager = TRUE;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_project_created_add_owner ON public.projects;
CREATE TRIGGER on_project_created_add_owner
AFTER INSERT ON public.projects
FOR EACH ROW
WHEN (NEW.created_by IS NOT NULL)
EXECUTE FUNCTION public.add_project_owner_as_manager();

INSERT INTO public.project_members (project_id, user_id, is_manager)
SELECT id, created_by, TRUE
FROM public.projects
WHERE created_by IS NOT NULL
ON CONFLICT (project_id, user_id) DO UPDATE SET is_manager = TRUE;

DROP POLICY IF EXISTS "Profiles readable by auth users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Projects accessible by authenticated" ON public.projects;
DROP POLICY IF EXISTS "Projects readable by members" ON public.projects;
DROP POLICY IF EXISTS "Projects insertable by creator" ON public.projects;
DROP POLICY IF EXISTS "Projects updateable by managers" ON public.projects;
DROP POLICY IF EXISTS "Projects deletable by managers" ON public.projects;
DROP POLICY IF EXISTS "Project members accessible" ON public.project_members;
DROP POLICY IF EXISTS "Project members readable by members" ON public.project_members;
DROP POLICY IF EXISTS "Project members manageable by managers" ON public.project_members;
DROP POLICY IF EXISTS "Project members updateable by managers" ON public.project_members;
DROP POLICY IF EXISTS "Project members deletable by managers" ON public.project_members;
DROP POLICY IF EXISTS "Tasks readable by team" ON public.tasks;
DROP POLICY IF EXISTS "Tasks readable by project members" ON public.tasks;
DROP POLICY IF EXISTS "Tasks insertable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Tasks insertable by project members" ON public.tasks;
DROP POLICY IF EXISTS "Tasks updatable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Tasks updatable by project members" ON public.tasks;
DROP POLICY IF EXISTS "Task comments readable" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments readable by project members" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments insertable" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments insertable by project members" ON public.task_comments;
DROP POLICY IF EXISTS "Chat messages accessible by participants" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat messages insertable by sender" ON public.chat_messages;
DROP POLICY IF EXISTS "Attachments readable" ON public.attachments;
DROP POLICY IF EXISTS "Attachments insertable" ON public.attachments;
DROP POLICY IF EXISTS "Project managers can manage invites" ON public.project_invites;

CREATE POLICY "Profiles readable by auth users" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Projects readable by members" ON public.projects
    FOR SELECT TO authenticated USING (public.is_project_member(id));

CREATE POLICY "Projects insertable by creator" ON public.projects
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Projects updateable by managers" ON public.projects
    FOR UPDATE TO authenticated
    USING (public.is_project_manager(id))
    WITH CHECK (public.is_project_manager(id));

CREATE POLICY "Projects deletable by managers" ON public.projects
    FOR DELETE TO authenticated USING (public.is_project_manager(id));

CREATE POLICY "Project members readable by members" ON public.project_members
    FOR SELECT TO authenticated USING (public.is_project_member(project_id));

CREATE POLICY "Project members manageable by managers" ON public.project_members
    FOR INSERT TO authenticated WITH CHECK (public.is_project_manager(project_id));

CREATE POLICY "Project members updateable by managers" ON public.project_members
    FOR UPDATE TO authenticated
    USING (public.is_project_manager(project_id))
    WITH CHECK (public.is_project_manager(project_id));

CREATE POLICY "Project members deletable by managers" ON public.project_members
    FOR DELETE TO authenticated USING (public.is_project_manager(project_id));

CREATE POLICY "Tasks readable by project members" ON public.tasks
    FOR SELECT TO authenticated USING (public.is_project_member(project_id));

CREATE POLICY "Tasks insertable by project members" ON public.tasks
    FOR INSERT TO authenticated
    WITH CHECK (public.is_project_member(project_id) AND auth.uid() = created_by);

CREATE POLICY "Tasks updatable by project members" ON public.tasks
    FOR UPDATE TO authenticated
    USING (public.is_project_member(project_id))
    WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "Task comments readable by project members" ON public.task_comments
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE id = task_id AND public.is_project_member(project_id)
        )
    );

CREATE POLICY "Task comments insertable by project members" ON public.task_comments
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = user_id AND EXISTS (
            SELECT 1 FROM public.tasks
            WHERE id = task_id AND public.is_project_member(project_id)
        )
    );

CREATE POLICY "Chat messages accessible by participants" ON public.chat_messages
    FOR SELECT TO authenticated USING (
        public.is_project_member(project_id)
        AND (NOT is_direct_message OR recipient_id = auth.uid() OR sender_id = auth.uid())
    );

CREATE POLICY "Chat messages insertable by sender" ON public.chat_messages
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = sender_id AND public.is_project_member(project_id)
    );

CREATE POLICY "Attachments readable" ON public.attachments
    FOR SELECT TO authenticated USING (
        (task_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.tasks
            WHERE id = task_id AND public.is_project_member(project_id)
        ))
        OR (message_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.chat_messages
            WHERE id = message_id AND public.is_project_member(project_id)
        ))
    );

CREATE POLICY "Attachments insertable" ON public.attachments
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = uploaded_by AND (
            (task_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.tasks
                WHERE id = task_id AND public.is_project_member(project_id)
            ))
            OR (message_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.chat_messages
                WHERE id = message_id AND public.is_project_member(project_id)
            ))
        )
    );

CREATE POLICY "Project managers can manage invites" ON public.project_invites
    FOR ALL TO authenticated
    USING (public.is_project_manager(project_id))
    WITH CHECK (public.is_project_manager(project_id) AND auth.uid() = invited_by);

CREATE OR REPLACE FUNCTION public.accept_project_invite(invite_token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    invite_record public.project_invites;
BEGIN
    SELECT * INTO invite_record
    FROM public.project_invites
    WHERE token = invite_token AND accepted_at IS NULL;

    IF invite_record.id IS NULL
       OR lower(invite_record.email) <> lower(auth.jwt() ->> 'email') THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.project_members (project_id, user_id, is_manager)
    VALUES (
        invite_record.project_id,
        auth.uid(),
        invite_record.role = 'manager'
    )
    ON CONFLICT (project_id, user_id)
    DO UPDATE SET is_manager = EXCLUDED.is_manager;

    UPDATE public.project_invites
    SET accepted_at = NOW()
    WHERE id = invite_record.id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_project_invite(UUID) TO authenticated;
