-- ==============================================================================
-- PULSE - POSTGRESQL & SUPABASE PRODUCTION SCHEMA (0$ TIER)
-- 20-25 Kişilik Ekip İçin Hızlı, Güvenli (RLS) ve Bildirim Tetikleyicili Şema
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFİLLER TABLOSU (Supabase auth.users ile eşleşen profil tablosu)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yeni kayıt olan her Supabase kullanıcısı için uygulama profili oluştur.
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

-- Şema sonradan uygulandığında daha önce kayıt olmuş kullanıcıları da tamamla.
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. PROJELER TABLOSU
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    color_code TEXT DEFAULT '#6366f1',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PROJE ÜYELERİ & YÖNETİCİLERİ TABLOSU
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_manager BOOLEAN DEFAULT FALSE, -- Görev dağıtma ve yönetme yetkisi
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- 4.1 PROJE DAVETLERİ (Kayıtlı olmayan kullanıcılar için paylaşılabilir davet)
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

-- 5. GÖREVLER (TASKS / TO-DO) TABLOSU
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Yöneticinin atadığı kişi
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ,
    archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.1 KİŞİSEL TODO'LAR (Yalnızca sahibinin görebileceği işler)
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

-- 6. GÖREV İÇİ YORUMLAR (TASK COMMENTS / THREADS)
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MESAJLAŞMA (CHAT MESSAGES: PROJE ODASI VEYA 1-E-1 ÖZEL DM)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- NULL ise genel ekip odası
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Dolu ise 1-e-1 Özel DM
    content TEXT NOT NULL,
    mentions UUID[] DEFAULT '{}', -- Mesajda etiketlenen (@mention) kullanıcı ID'leri
    is_direct_message BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. DOSYA EKLERİ (ATTACHMENTS - Cloudflare R2 / S3)
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BİLDİRİMLER (NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Bildirimi alacak kişi
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Olayı tetikleyen kişi
    type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_completed', 'mention', 'new_comment', 'direct_message')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'chat', 'project')),
    entity_id UUID NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. WEB PUSH SUBSCRIPTIONS (Mobil / Tarayıcı Push Bildirimleri)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- GÖREV TAMAMLANDIĞINDA OTOMATİK BİLDİRİM TETİKLEYİCİSİ (TRIGGER)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_task_completion_notification()
RETURNS TRIGGER AS $$
DECLARE
    mgr RECORD;
BEGIN
    -- Görev durumu 'done' yapıldıysa ve önceden 'done' değilse
    IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done') THEN
        -- 1. Görevi açan kişiye bildir (kendisi tamamlamadıysa)
        IF NEW.created_by != NEW.completed_by THEN
            INSERT INTO public.notifications (user_id, actor_id, type, title, message, entity_type, entity_id)
            VALUES (
                NEW.created_by,
                NEW.completed_by,
                'task_completed',
                'Görev Tamamlandı',
                '"' || NEW.title || '" başlıklı görev tamamlandı.',
                'task',
                NEW.id
            );
        END IF;

        -- 2. Projenin yöneticilerine bildir (görevi tamamlayan yönetici değilse)
        FOR mgr IN 
            SELECT user_id FROM public.project_members 
            WHERE project_id = NEW.project_id AND is_manager = TRUE AND user_id != NEW.completed_by AND user_id != NEW.created_by
        LOOP
            INSERT INTO public.notifications (user_id, actor_id, type, title, message, entity_type, entity_id)
            VALUES (
                mgr.user_id,
                NEW.completed_by,
                'task_completed',
                'Proje Görevi Tamamlandı',
                '"' || NEW.title || '" başlıklı görev tamamlandı.',
                'task',
                NEW.id
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_task_status_change
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_task_completion_notification();

CREATE OR REPLACE FUNCTION public.prevent_task_archive_by_non_manager()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.archived_at IS DISTINCT FROM OLD.archived_at
       AND NOT public.is_project_manager(NEW.project_id) THEN
        RAISE EXCEPTION 'Only project managers can archive or restore tasks';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_archive_permission ON public.tasks;
CREATE TRIGGER on_task_archive_permission
BEFORE UPDATE OF archived_at ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.prevent_task_archive_by_non_manager();

CREATE OR REPLACE FUNCTION public.prevent_task_details_edit_by_non_manager()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_project_manager(NEW.project_id)
       AND (
           NEW.title IS DISTINCT FROM OLD.title
           OR NEW.description IS DISTINCT FROM OLD.description
           OR NEW.due_date IS DISTINCT FROM OLD.due_date
           OR NEW.priority IS DISTINCT FROM OLD.priority
           OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
           OR NEW.project_id IS DISTINCT FROM OLD.project_id
       ) THEN
        RAISE EXCEPTION 'Only project managers can edit task details';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_details_permission ON public.tasks;
CREATE TRIGGER on_task_details_permission
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.prevent_task_details_edit_by_non_manager();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLİTİKALARI (Veri Güvenliği)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Proje üyeliği bütün erişim kurallarının temelidir.
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
        WHERE project_id = target_project_id AND user_id = auth.uid() AND is_manager = TRUE
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

-- Eski projelerin sahiplerini de proje yöneticisi olarak tamamla.
INSERT INTO public.project_members (project_id, user_id, is_manager)
SELECT id, created_by, TRUE FROM public.projects WHERE created_by IS NOT NULL
ON CONFLICT (project_id, user_id) DO UPDATE SET is_manager = TRUE;

-- Mevcut açık politikaları kaldırıp proje üyeliği tabanlı politikaları kur.
DROP POLICY IF EXISTS "Profiles readable by auth users" ON public.profiles;
DROP POLICY IF EXISTS "Projects accessible by authenticated" ON public.projects;
DROP POLICY IF EXISTS "Project members accessible" ON public.project_members;
DROP POLICY IF EXISTS "Tasks readable by team" ON public.tasks;
DROP POLICY IF EXISTS "Tasks insertable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Tasks updatable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Personal todos readable by owner" ON public.personal_todos;
DROP POLICY IF EXISTS "Personal todos insertable by owner" ON public.personal_todos;
DROP POLICY IF EXISTS "Personal todos updateable by owner" ON public.personal_todos;
DROP POLICY IF EXISTS "Personal todos deletable by owner" ON public.personal_todos;
DROP POLICY IF EXISTS "Task comments readable" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments insertable" ON public.task_comments;
DROP POLICY IF EXISTS "Chat messages accessible by participants" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat messages insertable by sender" ON public.chat_messages;
DROP POLICY IF EXISTS "Attachments readable" ON public.attachments;
DROP POLICY IF EXISTS "Attachments insertable" ON public.attachments;

-- Profiller: kayıtlı kullanıcılar davet için aranabilir.
CREATE POLICY "Profiles readable by auth users" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Projeler: yalnızca üye olunan projeler okunabilir; herkes kendi projesini açabilir.
CREATE POLICY "Projects readable by members" ON public.projects
    FOR SELECT TO authenticated USING (public.is_project_member(id));
CREATE POLICY "Projects insertable by creator" ON public.projects
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Projects updateable by managers" ON public.projects
    FOR UPDATE TO authenticated USING (public.is_project_manager(id)) WITH CHECK (public.is_project_manager(id));
CREATE POLICY "Projects deletable by managers" ON public.projects
    FOR DELETE TO authenticated USING (public.is_project_manager(id));

-- Proje üyeleri: üyeler görebilir, yalnızca yöneticiler üye/yetki yönetebilir.
CREATE POLICY "Project members readable by members" ON public.project_members
    FOR SELECT TO authenticated USING (public.is_project_member(project_id));
CREATE POLICY "Project members manageable by managers" ON public.project_members
    FOR INSERT TO authenticated WITH CHECK (public.is_project_manager(project_id));
CREATE POLICY "Project members updateable by managers" ON public.project_members
    FOR UPDATE TO authenticated USING (public.is_project_manager(project_id)) WITH CHECK (public.is_project_manager(project_id));
CREATE POLICY "Project members deletable by managers" ON public.project_members
    FOR DELETE TO authenticated USING (public.is_project_manager(project_id));

-- Görevler ve yorumlar yalnızca ilgili projenin üyelerine açıktır.
CREATE POLICY "Tasks readable by project members" ON public.tasks
    FOR SELECT TO authenticated USING (public.is_project_member(project_id));

CREATE POLICY "Tasks insertable by project members" ON public.tasks
    FOR INSERT TO authenticated WITH CHECK (public.is_project_member(project_id) AND auth.uid() = created_by);

CREATE POLICY "Tasks updatable by project members" ON public.tasks
    FOR UPDATE TO authenticated USING (public.is_project_member(project_id)) WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "Personal todos readable by owner" ON public.personal_todos
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Personal todos insertable by owner" ON public.personal_todos
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Personal todos updateable by owner" ON public.personal_todos
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Personal todos deletable by owner" ON public.personal_todos
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Task comments readable by project members" ON public.task_comments
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND public.is_project_member(project_id))
    );

CREATE POLICY "Task comments insertable by project members" ON public.task_comments
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND public.is_project_member(project_id))
    );

-- Bildirimler: Yalnızca kendi bildirimini okuma ve yönetme
CREATE POLICY "Notifications only viewable by recipient" ON public.notifications
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Mesajlar: kanal mesajı aynı projenin üyelerine, DM ise aynı projedeki iki kişiye açıktır.
CREATE POLICY "Chat messages accessible by participants" ON public.chat_messages
    FOR SELECT TO authenticated USING (
        public.is_project_member(project_id) AND
        (NOT is_direct_message OR recipient_id = auth.uid() OR sender_id = auth.uid())
    );

CREATE POLICY "Chat messages insertable by sender" ON public.chat_messages
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = sender_id AND
        public.is_project_member(project_id) AND
        (NOT is_direct_message OR public.is_project_member(project_id))
    );

-- Ekler: yalnızca mesajın veya görevin projesinin üyeleri erişebilir.
CREATE POLICY "Attachments readable" ON public.attachments
    FOR SELECT TO authenticated USING (
        (task_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND public.is_project_member(project_id))) OR
        (message_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.chat_messages WHERE id = message_id AND public.is_project_member(project_id)))
    );

CREATE POLICY "Attachments insertable" ON public.attachments
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = uploaded_by AND (
            (task_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND public.is_project_member(project_id))) OR
            (message_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.chat_messages WHERE id = message_id AND public.is_project_member(project_id)))
        )
    );

-- Davetler: yalnızca proje yöneticileri oluşturup görebilir.
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;
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
DECLARE invite_record public.project_invites;
BEGIN
    SELECT * INTO invite_record FROM public.project_invites
    WHERE token = invite_token AND accepted_at IS NULL;
    IF invite_record.id IS NULL OR lower(invite_record.email) <> lower(auth.jwt() ->> 'email') THEN
        RETURN FALSE;
    END IF;
    INSERT INTO public.project_members (project_id, user_id, is_manager)
    VALUES (invite_record.project_id, auth.uid(), invite_record.role = 'manager')
    ON CONFLICT (project_id, user_id) DO UPDATE SET is_manager = EXCLUDED.is_manager;
    UPDATE public.project_invites SET accepted_at = NOW() WHERE id = invite_record.id;
    RETURN TRUE;
END;
$$;

-- Push abonelikleri: Kişiye özel
CREATE POLICY "Push subscriptions manage own" ON public.push_subscriptions
    FOR ALL TO authenticated USING (auth.uid() = user_id);
