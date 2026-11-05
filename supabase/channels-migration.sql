-- ==============================================================================
-- PULSE SOHBET KANALLARI & DİREKT MESAJLAR (DM) MİGRASYONU
-- ==============================================================================

-- 1. KANALLAR TABLOSU (CHANNELS)
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('project', 'custom')),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_project_channel UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS channels_type_idx ON public.channels (type);
CREATE INDEX IF NOT EXISTS channels_project_id_idx ON public.channels (project_id);

-- 2. KANAL ÜYELERİ TABLOSU (CHANNEL MEMBERS - Özel Davetli Kanallar İçin)
CREATE TABLE IF NOT EXISTS public.channel_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_channel_user UNIQUE (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS channel_members_channel_user_idx ON public.channel_members (channel_id, user_id);
CREATE INDEX IF NOT EXISTS channel_members_user_idx ON public.channel_members (user_id);

-- 3. CHAT_MESSAGES TABLOSUNA KANAL VE BELGE PAYLAŞIM ALANLARINI EKLE
ALTER TABLE public.chat_messages 
    ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS attachment_url TEXT,
    ADD COLUMN IF NOT EXISTS attachment_name TEXT,
    ADD COLUMN IF NOT EXISTS attachment_size BIGINT,
    ADD COLUMN IF NOT EXISTS attachment_mime TEXT;

CREATE INDEX IF NOT EXISTS chat_messages_channel_id_idx ON public.chat_messages (channel_id);
CREATE INDEX IF NOT EXISTS chat_messages_recipient_idx ON public.chat_messages (recipient_id);
CREATE INDEX IF NOT EXISTS chat_messages_dm_idx ON public.chat_messages (sender_id, recipient_id, is_direct_message);

-- 4. KANAL ÜYELİĞİ KONTROL FONKSİYONU
CREATE OR REPLACE FUNCTION public.is_channel_member(target_channel_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        -- A) Proje kanalı ise: Kullanıcı ilgili projenin üyesi veya yöneticisi mi?
        SELECT 1 FROM public.channels c
        WHERE c.id = target_channel_id
          AND c.type = 'project'
          AND c.project_id IS NOT NULL
          AND public.is_project_member(c.project_id)
    ) OR EXISTS (
        -- B) Özel kanal ise: channel_members tablosunda kayıtlı mı?
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = target_channel_id
          AND cm.user_id = auth.uid()
    ) OR EXISTS (
        -- C) Kanalı bizzat oluşturan kişi mi?
        SELECT 1 FROM public.channels c
        WHERE c.id = target_channel_id
          AND c.created_by = auth.uid()
    );
$$;

-- 5. KANAL YÖNETİM YETKİSİ FONKSİYONU (Davet / Düzenleme için)
CREATE OR REPLACE FUNCTION public.can_manage_channel(target_channel_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        -- Kanal kurucusu
        SELECT 1 FROM public.channels c
        WHERE c.id = target_channel_id AND c.created_by = auth.uid()
    ) OR EXISTS (
        -- Kanal yöneticisi
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = target_channel_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('owner', 'admin')
    ) OR EXISTS (
        -- Proje kanalı ise proje yöneticisi
        SELECT 1 FROM public.channels c
        WHERE c.id = target_channel_id
          AND c.type = 'project'
          AND c.project_id IS NOT NULL
          AND public.is_project_manager(c.project_id)
    );
$$;

-- 6. OTOMATİK PROJE KANALI TRIGGER'I (Proje açıldığında otomatik kanal oluşturur)
CREATE OR REPLACE FUNCTION public.handle_new_project_channel()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.channels (name, description, type, project_id, created_by)
    VALUES (
        NEW.name,
        NEW.name || ' proje sohbet kanalı',
        'project',
        NEW.id,
        COALESCE(NEW.created_by, auth.uid())
    )
    ON CONFLICT (project_id) DO UPDATE SET name = EXCLUDED.name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_created_channel ON public.projects;
CREATE TRIGGER on_project_created_channel
AFTER INSERT OR UPDATE OF name ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_project_channel();

-- 7. ÖZEL KANAL AÇILDIĞINDA KURUCUYU 'owner' OLARAK EKLEME TRIGGER'I
CREATE OR REPLACE FUNCTION public.handle_new_custom_channel_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'custom' THEN
        INSERT INTO public.channel_members (channel_id, user_id, role)
        VALUES (NEW.id, NEW.created_by, 'owner')
        ON CONFLICT (channel_id, user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_custom_channel_created_owner ON public.channels;
CREATE TRIGGER on_custom_channel_created_owner
AFTER INSERT ON public.channels
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_custom_channel_owner();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- ==============================================================================

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- Channels RLS
DROP POLICY IF EXISTS "Channels readable by members" ON public.channels;
CREATE POLICY "Channels readable by members" ON public.channels
    FOR SELECT TO authenticated
    USING (public.is_channel_member(id));

DROP POLICY IF EXISTS "Channels insertable by auth users" ON public.channels;
CREATE POLICY "Channels insertable by auth users" ON public.channels
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Channels updateable by managers" ON public.channels;
CREATE POLICY "Channels updateable by managers" ON public.channels
    FOR UPDATE TO authenticated
    USING (public.can_manage_channel(id))
    WITH CHECK (public.can_manage_channel(id));

DROP POLICY IF EXISTS "Channels deletable by creator" ON public.channels;
CREATE POLICY "Channels deletable by creator" ON public.channels
    FOR DELETE TO authenticated
    USING (auth.uid() = created_by);

-- Channel Members RLS
DROP POLICY IF EXISTS "Channel members readable" ON public.channel_members;
CREATE POLICY "Channel members readable" ON public.channel_members
    FOR SELECT TO authenticated
    USING (public.is_channel_member(channel_id));

DROP POLICY IF EXISTS "Channel members insertable by managers" ON public.channel_members;
CREATE POLICY "Channel members insertable by managers" ON public.channel_members
    FOR INSERT TO authenticated
    WITH CHECK (public.can_manage_channel(channel_id) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Channel members deletable" ON public.channel_members;
CREATE POLICY "Channel members deletable" ON public.channel_members
    FOR DELETE TO authenticated
    USING (public.can_manage_channel(channel_id) OR auth.uid() = user_id);

-- Chat Messages RLS Güncellemesi
DROP POLICY IF EXISTS "Chat messages accessible by participants" ON public.chat_messages;
CREATE POLICY "Chat messages accessible by participants" ON public.chat_messages
    FOR SELECT TO authenticated
    USING (
        (channel_id IS NOT NULL AND public.is_channel_member(channel_id))
        OR
        (is_direct_message = TRUE AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
        OR
        (channel_id IS NULL AND project_id IS NOT NULL AND public.is_project_member(project_id) AND (NOT is_direct_message OR recipient_id = auth.uid() OR sender_id = auth.uid()))
    );

DROP POLICY IF EXISTS "Chat messages insertable by sender" ON public.chat_messages;
CREATE POLICY "Chat messages insertable by sender" ON public.chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = sender_id AND (
            (channel_id IS NOT NULL AND public.is_channel_member(channel_id))
            OR
            (is_direct_message = TRUE)
            OR
            (channel_id IS NULL AND project_id IS NOT NULL AND public.is_project_member(project_id))
        )
    );

-- Attachments RLS Güncellemesi (Kanal mesajı ekleri)
DROP POLICY IF EXISTS "Attachments readable" ON public.attachments;
CREATE POLICY "Attachments readable" ON public.attachments
    FOR SELECT TO authenticated
    USING (
        (task_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.tasks WHERE id = task_id AND public.is_project_member(project_id)
        ))
        OR
        (message_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.chat_messages 
            WHERE id = message_id AND (
                (channel_id IS NOT NULL AND public.is_channel_member(channel_id))
                OR (is_direct_message AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
                OR (project_id IS NOT NULL AND public.is_project_member(project_id))
            )
        ))
    );

-- Realtime yayınına ekle
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

-- ==============================================================================
-- MEVCUT VERİLERİ GERİYE DÖNÜK UYUMLU TAŞIMA (BACKFILL)
-- ==============================================================================

-- Mevcut projelerin her biri için proje kanalı oluştur
INSERT INTO public.channels (name, description, type, project_id, created_by)
SELECT 
    p.name, 
    p.name || ' proje sohbet kanalı', 
    'project', 
    p.id, 
    COALESCE(p.created_by, (SELECT id FROM public.profiles LIMIT 1))
FROM public.projects p
ON CONFLICT (project_id) DO NOTHING;

-- Mevcut kanal mesajlarını ilgili proje kanallarıyla eşleştir
UPDATE public.chat_messages cm
SET channel_id = c.id
FROM public.channels c
WHERE cm.project_id = c.project_id
  AND cm.channel_id IS NULL
  AND (cm.is_direct_message IS FALSE OR cm.is_direct_message IS NULL);
