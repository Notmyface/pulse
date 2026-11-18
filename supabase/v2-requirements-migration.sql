-- ==============================================================================
-- PULSE V2 - MOBİL İŞ VE PROJE YÖNETİM SİSTEMİ MİGRASYONU ($0 EK MALİYET & RLS)
-- ==============================================================================

-- 1. KATEGORİLER TABLOSU (Açık uçlu, dinamik kategori yönetimi)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'folder',
    order_index INT DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kategori RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes aktif kategorileri görebilir" ON public.categories;
DROP POLICY IF EXISTS "Kategoriler giriş yapmış kullanıcılar tarafından okunabilir" ON public.categories;
CREATE POLICY "Herkes aktif kategorileri görebilir"
    ON public.categories FOR SELECT
    TO authenticated
    USING (is_archived IS FALSE);

DROP POLICY IF EXISTS "Kullanıcılar kategori oluşturabilir" ON public.categories;
CREATE POLICY "Kullanıcılar kategori oluşturabilir"
    ON public.categories FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Kullanıcılar kategorileri güncelleyebilir" ON public.categories;
CREATE POLICY "Kullanıcılar kategorileri güncelleyebilir"
    ON public.categories FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Varsayılan örnek kategoriler (Dokümanda geçenler)
INSERT INTO public.categories (name, color, icon, order_index)
VALUES 
    ('İnşaat', '#f97316', 'hard-hat', 1),
    ('Mimari', '#8b5cf6', 'drafting-compass', 2),
    ('Emlak', '#10b981', 'building', 3),
    ('Belediye', '#3b82f6', 'landmark', 4),
    ('Finans', '#eab308', 'wallet', 5)
ON CONFLICT DO NOTHING;

-- 2. LİSTELER (PROJECTS tablosunu genişletme: Kategori & Modül bayrakları & Dokümantasyon)
ALTER TABLE public.projects 
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS module_todo BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS module_docs BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS module_files BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS module_kanban BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS module_gantt BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS module_chat BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS documentation_content TEXT DEFAULT '';

-- 3. GÖREVLER (TASKS tablosunu genişletme: Başlangıç tarihi & Bağımsız görev rengi)
ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS task_color TEXT DEFAULT '#6366f1';

-- 4. ÇOKLU GÖREV ATAMALARI (TASK ASSIGNEES)
CREATE TABLE IF NOT EXISTS public.task_assignees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

-- Var olan assigned_to kayıtlarını task_assignees tablosuna aktar
INSERT INTO public.task_assignees (task_id, user_id)
SELECT id, assigned_to 
FROM public.tasks 
WHERE assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;

-- Task Assignees RLS
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Görev sorumlularını yetkili kullanıcılar görebilir" ON public.task_assignees;
DROP POLICY IF EXISTS "Görev sorumlusu ekleme yetkisi" ON public.task_assignees;
DROP POLICY IF EXISTS "Görev sorumlusu silme yetkisi" ON public.task_assignees;

CREATE POLICY "Görev sorumlularını yetkili kullanıcılar görebilir"
    ON public.task_assignees FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_assignees.task_id
              AND (
                  public.is_project_manager(tasks.project_id)
                  OR tasks.assigned_to = auth.uid()
                  OR task_assignees.user_id = auth.uid()
              )
        )
    );

CREATE POLICY "Görev sorumlusu ekleme yetkisi"
    ON public.task_assignees FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_assignees.task_id
              AND public.is_project_manager(tasks.project_id)
        )
    );

CREATE POLICY "Görev sorumlusu silme yetkisi"
    ON public.task_assignees FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_assignees.task_id
              AND public.is_project_manager(tasks.project_id)
        )
    );

-- 5. PROFİLLER GENİŞLETME (Takvim rengi, emojisi ve aktiflik durumu)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS user_emoji TEXT DEFAULT '👤',
    ADD COLUMN IF NOT EXISTS user_color TEXT DEFAULT '#3b82f6',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 6. LİSTE VE MODÜL BAZLI ÖZEL YETKİLER (Dış firmalar veya 3. yetki seviyesi için)
CREATE TABLE IF NOT EXISTS public.list_module_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    can_todo BOOLEAN DEFAULT TRUE,
    can_docs BOOLEAN DEFAULT FALSE,
    can_files BOOLEAN DEFAULT FALSE,
    can_kanban BOOLEAN DEFAULT TRUE,
    can_gantt BOOLEAN DEFAULT FALSE,
    can_chat BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

ALTER TABLE public.list_module_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Modül izinlerini yetkili kullanıcılar görebilir" ON public.list_module_permissions;
DROP POLICY IF EXISTS "Modül izinlerini yöneticiler düzenleyebilir" ON public.list_module_permissions;

CREATE POLICY "Modül izinlerini yetkili kullanıcılar görebilir"
    ON public.list_module_permissions FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_members.project_id = list_module_permissions.project_id
              AND project_members.user_id = auth.uid()
              AND project_members.is_manager = TRUE
        )
    );

CREATE POLICY "Modül izinlerini yöneticiler düzenleyebilir"
    ON public.list_module_permissions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        ) 
        OR 
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_members.project_id = list_module_permissions.project_id 
              AND project_members.user_id = auth.uid() 
              AND project_members.is_manager = TRUE
        )
    );

-- 7. TAKVİM GİZLİLİK VE ALAN BAZLI İZİNLER
CREATE TABLE IF NOT EXISTS public.calendar_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    granter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Takvim sahibi
    viewer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,  -- Görüntüleyecek kişi
    show_title BOOLEAN DEFAULT TRUE,
    show_dates BOOLEAN DEFAULT TRUE,
    show_priority BOOLEAN DEFAULT FALSE,
    show_assignees BOOLEAN DEFAULT FALSE,
    show_description BOOLEAN DEFAULT FALSE,
    show_list_name BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(granter_user_id, viewer_user_id)
);

ALTER TABLE public.calendar_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Takvim izinlerini taraflar ve yöneticiler görebilir" ON public.calendar_permissions;
DROP POLICY IF EXISTS "Takvim izinlerini admin veya kullanıcı yönetebilir" ON public.calendar_permissions;

CREATE POLICY "Takvim izinlerini taraflar ve yöneticiler görebilir"
    ON public.calendar_permissions FOR SELECT
    TO authenticated
    USING (
        granter_user_id = auth.uid() 
        OR viewer_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

CREATE POLICY "Takvim izinlerini admin veya kullanıcı yönetebilir"
    ON public.calendar_permissions FOR ALL
    TO authenticated
    USING (
        granter_user_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- 8. GÜVENLİ TAKVİM GÖREV ÇEKME FONKSİYONU (DATA MASKING RPC)
-- Kullanıcının diğer ekip üyelerinin takvimini görüntülerken alan bazlı yetkilere göre filtrelenmiş veri almasını sağlar.
CREATE OR REPLACE FUNCTION public.get_calendar_tasks(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    start_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    status TEXT,
    priority TEXT,
    description TEXT,
    task_color TEXT,
    project_id UUID,
    project_name TEXT,
    assignee_ids UUID[],
    is_masked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_viewer_id UUID := auth.uid();
    v_is_admin BOOLEAN;
BEGIN
    SELECT (role = 'admin') INTO v_is_admin FROM public.profiles WHERE id = v_viewer_id;

    RETURN QUERY
    WITH task_info AS (
        SELECT 
            t.id,
            t.title,
            t.start_date,
            t.due_date,
            t.status,
            t.priority,
            t.description,
            t.task_color,
            t.project_id,
            p.name AS project_name,
            ARRAY_AGG(ta.user_id) FILTER (WHERE ta.user_id IS NOT NULL) AS assignee_ids,
            -- Viewer görevde yetkili mi?
            (v_is_admin OR v_viewer_id = ANY(ARRAY_AGG(ta.user_id)) OR t.created_by = v_viewer_id) AS has_full_access
        FROM public.tasks t
        LEFT JOIN public.projects p ON p.id = t.project_id
        LEFT JOIN public.task_assignees ta ON ta.task_id = t.id
        WHERE (t.due_date BETWEEN p_start_date AND p_end_date OR t.start_date BETWEEN p_start_date AND p_end_date)
          AND t.archived_at IS NULL
        GROUP BY t.id, p.name
    )
    SELECT 
        ti.id,
        CASE 
            WHEN ti.has_full_access THEN ti.title
            WHEN cp.show_title IS TRUE THEN ti.title
            ELSE 'Görev'
        END AS title,
        ti.start_date,
        ti.due_date,
        ti.status,
        CASE 
            WHEN ti.has_full_access OR cp.show_priority IS TRUE THEN ti.priority 
            ELSE 'normal' 
        END AS priority,
        CASE 
            WHEN ti.has_full_access OR cp.show_description IS TRUE THEN ti.description 
            ELSE NULL 
        END AS description,
        ti.task_color,
        ti.project_id,
        CASE 
            WHEN ti.has_full_access OR cp.show_list_name IS TRUE THEN ti.project_name 
            ELSE NULL 
        END AS project_name,
        CASE 
            WHEN ti.has_full_access OR cp.show_assignees IS TRUE THEN ti.assignee_ids 
            ELSE ARRAY[]::UUID[] 
        END AS assignee_ids,
        NOT ti.has_full_access AS is_masked
    FROM task_info ti
    LEFT JOIN LATERAL (
        -- Takvim sahibi ile viewer arasındaki izin
        SELECT 
            bool_or(cp.show_title) AS show_title,
            bool_or(cp.show_priority) AS show_priority,
            bool_or(cp.show_description) AS show_description,
            bool_or(cp.show_list_name) AS show_list_name,
            bool_or(cp.show_assignees) AS show_assignees
        FROM public.calendar_permissions cp
        WHERE cp.viewer_user_id = v_viewer_id 
          AND cp.granter_user_id = ANY(ti.assignee_ids)
    ) cp ON TRUE
    WHERE ti.has_full_access OR cp.show_title IS NOT NULL;
END;
$$;
