-- ==============================================================================
-- PULSE GÖREV BAĞIMLILIKLARI (TASK DEPENDENCIES) & ZAMAN ÇİZELGESİ MİGRASYONU
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, -- Ardıl görev (Bekleyen iş)
    depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, -- Öncül görev (Beklenen iş)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_task_dependency UNIQUE (task_id, depends_on_task_id),
    CONSTRAINT prevent_self_dependency CHECK (task_id <> depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS task_deps_task_id_idx ON public.task_dependencies (task_id);
CREATE INDEX IF NOT EXISTS task_deps_depends_on_idx ON public.task_dependencies (depends_on_task_id);
CREATE INDEX IF NOT EXISTS task_deps_project_id_idx ON public.task_dependencies (project_id);

-- RLS Güvenlik Politikaları
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Task dependencies readable by project members" ON public.task_dependencies;
CREATE POLICY "Task dependencies readable by project members" ON public.task_dependencies
    FOR SELECT TO authenticated
    USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS "Task dependencies insertable by project members" ON public.task_dependencies;
CREATE POLICY "Task dependencies insertable by project managers" ON public.task_dependencies
    FOR INSERT TO authenticated
    WITH CHECK (public.is_project_manager(project_id));

DROP POLICY IF EXISTS "Task dependencies deletable by project members" ON public.task_dependencies;
CREATE POLICY "Task dependencies deletable by project managers" ON public.task_dependencies
    FOR DELETE TO authenticated
    USING (public.is_project_manager(project_id));

DROP POLICY IF EXISTS "Task dependencies insertable by project managers" ON public.task_dependencies;
DROP POLICY IF EXISTS "Task dependencies deletable by project managers" ON public.task_dependencies;
CREATE POLICY "Task dependencies insertable by project managers" ON public.task_dependencies
    FOR INSERT TO authenticated
    WITH CHECK (public.is_project_manager(project_id));
CREATE POLICY "Task dependencies deletable by project managers" ON public.task_dependencies
    FOR DELETE TO authenticated
    USING (public.is_project_manager(project_id));

CREATE OR REPLACE FUNCTION public.prevent_task_dependency_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (
        WITH RECURSIVE dependency_chain(task_id) AS (
            SELECT NEW.depends_on_task_id
            UNION
            SELECT dependency.depends_on_task_id
            FROM public.task_dependencies dependency
            JOIN dependency_chain chain ON dependency.task_id = chain.task_id
        )
        SELECT 1 FROM dependency_chain WHERE task_id = NEW.task_id
    ) THEN
        RAISE EXCEPTION 'Task dependency cycle is not allowed';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_dependency_cycle ON public.task_dependencies;
CREATE TRIGGER on_task_dependency_cycle
BEFORE INSERT ON public.task_dependencies
FOR EACH ROW
EXECUTE FUNCTION public.prevent_task_dependency_cycle();

-- Realtime soket yayınına ekle
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.task_dependencies;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
