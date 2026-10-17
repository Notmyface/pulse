-- Pulse görev arşivleme migration'i
-- Görevler silinmez; yöneticiler tarafından arşivlenir.

ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_project_archive_idx
    ON public.tasks (project_id, archived_at);

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
