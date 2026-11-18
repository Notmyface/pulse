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

-- Giriş yapmış tüm ekip üyeleri görev yorumlarını okuyabilir
CREATE POLICY "Task comments readable by authenticated" ON public.task_comments
    FOR SELECT TO authenticated
    USING (TRUE);

-- Giriş yapmış kullanıcı kendi adıyla yorum ekleyebilir
CREATE POLICY "Task comments insertable by author" ON public.task_comments
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

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

-- Mesajları Okuma Politikası:
-- 1) Birebir DM ise: yalnızca gönderen veya alıcı okuyabilir.
-- 2) Proje/İş sohbeti ise: tüm giriş yapmış ekip üyeleri okuyabilir.
CREATE POLICY "Chat messages accessible by participants" ON public.chat_messages
    FOR SELECT TO authenticated
    USING (
        (is_direct_message = TRUE AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
        OR
        (is_direct_message IS NOT TRUE)
    );

-- Mesaj Gönderme Politikası:
-- Giriş yapmış kullanıcı kendi adına mesaj gönderebilir.
CREATE POLICY "Chat messages insertable by sender" ON public.chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = sender_id);

-- 3. PERFORMANS İÇİN İNDEKSLER
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments (task_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_project_id ON public.chat_messages (project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_id ON public.chat_messages (recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages (created_at);
