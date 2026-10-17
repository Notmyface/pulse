-- Proje oluşturma RLS düzeltmesi
-- Supabase Dashboard > SQL Editor içinde çalıştırın.

DROP POLICY IF EXISTS "Projects accessible by authenticated" ON public.projects;
DROP POLICY IF EXISTS "Projects insertable by creator" ON public.projects;
DROP POLICY IF EXISTS "Projects readable by members" ON public.projects;

CREATE POLICY "Projects insertable by creator" ON public.projects
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Projects readable by members" ON public.projects
    FOR SELECT TO authenticated
    USING (public.is_project_member(id) OR created_by = auth.uid());