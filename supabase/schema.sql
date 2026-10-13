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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLİTİKALARI (Veri Güvenliği)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiller: Kimliği doğrulanmış kullanıcılar listeyi görebilir
CREATE POLICY "Profiles readable by auth users" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Projeler: Giriş yapmış herkes projeleri listeleyebilir
CREATE POLICY "Projects accessible by authenticated" ON public.projects
    FOR ALL TO authenticated USING (true);

-- Proje üyeleri
CREATE POLICY "Project members accessible" ON public.project_members
    FOR ALL TO authenticated USING (true);

-- Görevler: Tüm ekip okuyabilir
CREATE POLICY "Tasks readable by team" ON public.tasks
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tasks insertable by authenticated" ON public.tasks
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Tasks updatable by authenticated" ON public.tasks
    FOR UPDATE TO authenticated USING (true);

-- Görev Yorumları
CREATE POLICY "Task comments readable" ON public.task_comments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Task comments insertable" ON public.task_comments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Bildirimler: Yalnızca kendi bildirimini okuma ve yönetme
CREATE POLICY "Notifications only viewable by recipient" ON public.notifications
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Mesajlar: Genel sohbet veya ilgili DM katılımcıları
CREATE POLICY "Chat messages accessible by participants" ON public.chat_messages
    FOR SELECT TO authenticated USING (
        recipient_id IS NULL OR 
        recipient_id = auth.uid() OR 
        sender_id = auth.uid()
    );

CREATE POLICY "Chat messages insertable by sender" ON public.chat_messages
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Ekler: Kimliği doğrulanmış kullanıcılar okuyabilir ve yükleyebilir
CREATE POLICY "Attachments readable" ON public.attachments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Attachments insertable" ON public.attachments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

-- Push abonelikleri: Kişiye özel
CREATE POLICY "Push subscriptions manage own" ON public.push_subscriptions
    FOR ALL TO authenticated USING (auth.uid() = user_id);
