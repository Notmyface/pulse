-- Pulse proje merkezli görev görünürlüğü migration'i
-- Proje yöneticileri tüm proje görevlerini, üyeler yalnızca kendi görevlerini görür.

INSERT INTO public.project_members (project_id, user_id, is_manager)
SELECT id, created_by, TRUE
FROM public.projects
WHERE created_by IS NOT NULL
ON CONFLICT (project_id, user_id) DO UPDATE SET is_manager = TRUE;

DROP POLICY IF EXISTS "Project members readable by members" ON public.project_members;
DROP POLICY IF EXISTS "Tasks readable by project members" ON public.tasks;
DROP POLICY IF EXISTS "Tasks insertable by project members" ON public.tasks;
DROP POLICY IF EXISTS "Tasks updatable by project members" ON public.tasks;
DROP POLICY IF EXISTS "Task comments readable by project members" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments insertable by project members" ON public.task_comments;
DROP POLICY IF EXISTS "Project members readable by managers or self" ON public.project_members;
DROP POLICY IF EXISTS "Tasks readable by managers or assignee" ON public.tasks;
DROP POLICY IF EXISTS "Tasks insertable by project managers" ON public.tasks;
DROP POLICY IF EXISTS "Tasks updatable by managers or assignee" ON public.tasks;
DROP POLICY IF EXISTS "Task comments readable by managers or assignee" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments insertable by managers or assignee" ON public.task_comments;

CREATE POLICY "Project members readable by managers or self" ON public.project_members
    FOR SELECT TO authenticated
    USING (public.is_project_member(project_id));

CREATE POLICY "Tasks readable by managers or assignee" ON public.tasks
    FOR SELECT TO authenticated
    USING (public.is_project_manager(project_id) OR assigned_to = auth.uid());

CREATE POLICY "Tasks insertable by project managers" ON public.tasks
    FOR INSERT TO authenticated
    WITH CHECK (public.is_project_manager(project_id) AND auth.uid() = created_by);

CREATE POLICY "Tasks updatable by managers or assignee" ON public.tasks
    FOR UPDATE TO authenticated
    USING (public.is_project_manager(project_id) OR assigned_to = auth.uid())
    WITH CHECK (public.is_project_manager(project_id) OR assigned_to = auth.uid());

CREATE POLICY "Task comments readable by managers or assignee" ON public.task_comments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE id = task_id
              AND (public.is_project_manager(project_id) OR assigned_to = auth.uid())
        )
    );

CREATE POLICY "Task comments insertable by managers or assignee" ON public.task_comments
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.tasks
            WHERE id = task_id
              AND (public.is_project_manager(project_id) OR assigned_to = auth.uid())
        )
    );
