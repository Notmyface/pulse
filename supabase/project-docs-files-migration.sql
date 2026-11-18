-- Pulse proje dökümantasyonu ve dosya listeleri

ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS documentation_content TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS module_docs BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS module_files BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS module_todo BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS module_kanban BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS module_gantt BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS module_chat BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.project_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS project_attachments_project_idx
    ON public.project_attachments(project_id, created_at DESC);

ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project attachments readable by members" ON public.project_attachments;
CREATE POLICY "Project attachments readable by members" ON public.project_attachments
    FOR SELECT TO authenticated
    USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS "Project attachments insertable by members" ON public.project_attachments;
CREATE POLICY "Project attachments insertable by members" ON public.project_attachments
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = uploaded_by
        AND public.is_project_member(project_id)
    );

DROP POLICY IF EXISTS "Project attachments deletable by managers or uploader" ON public.project_attachments;
CREATE POLICY "Project attachments deletable by managers or uploader" ON public.project_attachments
    FOR DELETE TO authenticated
    USING (
        auth.uid() = uploaded_by
        OR public.is_project_manager(project_id)
    );
