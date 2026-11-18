-- Kategori tekrarlarını kaldırır ve kategori adlarını benzersiz yapar.

WITH ranked_categories AS (
    SELECT
        id,
        lower(btrim(name)) AS normalized_name,
        row_number() OVER (PARTITION BY lower(btrim(name)) ORDER BY created_at ASC, id ASC) AS row_number
    FROM public.categories
)
UPDATE public.projects
SET category_id = kept.id
FROM ranked_categories removed
JOIN ranked_categories kept
  ON kept.normalized_name = removed.normalized_name
 AND kept.row_number = 1
WHERE removed.row_number > 1
  AND public.projects.category_id = removed.id;

DELETE FROM public.categories
WHERE id IN (
    SELECT id
    FROM (
        SELECT id, row_number() OVER (PARTITION BY lower(btrim(name)) ORDER BY created_at ASC, id ASC) AS row_number
        FROM public.categories
    ) duplicates
    WHERE row_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_unique_normalized_name_idx
    ON public.categories ((lower(btrim(name))));
