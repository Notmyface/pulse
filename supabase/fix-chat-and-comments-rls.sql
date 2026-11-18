-- ==============================================================================
-- FIX CHAT & TASK COMMENTS RLS POLICIES
-- Tek ekip için mesajların ve görev yorumlarının kalıcı olmasını ve RLS tarafından engellenmemesini sağlar.
-- ==============================================================================

-- 1. TASK COMMENTS (GÖREV YORUMLARI) RLS DÜZELTMESİ
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Eski kısıtlayıcı politikaları kaldır
DROP POLICY IF EXISTS "Task comments readable" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments insertable" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments readable by project members" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments insertable by project members" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments readable by managers or assignee" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments insertable by managers or assignee" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments insertable by author" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments deletable by author or admin" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments readable by authenticated" ON public.task_comments;

-- Yalnızca görevin yöneticisi veya atanmış kişisi yorumları görebilir
CREATE POLICY "Task comments readable by managers or assignee" ON public.task_comments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks task
            WHERE task.id = task_comments.task_id
              AND (
                  public.is_project_manager(task.project_id)
                  OR task.assigned_to = auth.uid()
                  OR task.created_by = auth.uid()
              )
        )
    );

-- Yalnızca görevin erişim yetkisi olan kullanıcı kendi adıyla yorum ekleyebilir
CREATE POLICY "Task comments insertable by author" ON public.task_comments
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.tasks task
            WHERE task.id = task_comments.task_id
              AND (
                  public.is_project_manager(task.project_id)
                  OR task.assigned_to = auth.uid()
                  OR task.created_by = auth.uid()
              )
        )
    );

-- Kullanıcı kendi yorumunu silebilir
CREATE POLICY "Task comments deletable by author or admin" ON public.task_comments
    FOR DELETE TO authenticated
    USING (
        auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- 2. CHAT MESSAGES (SOHBET MESAJLARI) RLS DÜZELTMESİ
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Eski kısıtlayıcı politikaları kaldır
DROP POLICY IF EXISTS "Chat messages accessible by participants" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat messages insertable by sender" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat messages accessible by participants" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat messages insertable by sender" ON public.chat_messages;

-- Mesajları Okuma Politikası:
-- 1) Birebir DM: yalnızca gönderen veya alıcı
-- 2) Proje mesajı: ilgili proje üyesi
-- 3) Özel kanal mesajı: kanal üyesi veya kurucu
CREATE POLICY "Chat messages accessible by participants" ON public.chat_messages
    FOR SELECT TO authenticated
    USING (
        (is_direct_message = TRUE AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
        OR
        (is_direct_message IS NOT TRUE AND channel_id IS NULL AND project_id IS NOT NULL AND public.is_project_member(project_id))
        OR
        (is_direct_message IS NOT TRUE AND channel_id IS NOT NULL AND public.is_channel_member(channel_id))
    );

-- Mesaj Gönderme Politikası:
-- Kullanıcı kendi adına; DM ise alıcılı, kanal/proje mesajı ise üyelikli gönderir.
CREATE POLICY "Chat messages insertable by sender" ON public.chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND (
            (is_direct_message = TRUE AND recipient_id IS NOT NULL)
            OR (is_direct_message IS NOT TRUE AND channel_id IS NULL AND project_id IS NOT NULL AND public.is_project_member(project_id))
            OR (is_direct_message IS NOT TRUE AND channel_id IS NOT NULL AND public.is_channel_member(channel_id))
        )
    );

-- 3. PERFORMANS İÇİN İNDEKSLER
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments (task_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id ON public.chat_messages (project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_id ON public.chat_messages (recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages (created_at);
