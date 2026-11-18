-- Pulse kullanıcı adı ve mention migration'i

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE public.profiles
SET username = split_part(email, '@', 1)
WHERE username IS NULL;

-- Aynı varsayılan kullanıcı adını çakışan hesaplara ek numara verir.
WITH ranked AS (
    SELECT id, username,
           row_number() OVER (PARTITION BY lower(username) ORDER BY created_at ASC, id ASC) AS rn
    FROM public.profiles
)
UPDATE public.profiles profile
SET username = CASE
    WHEN ranked.rn = 1 THEN lower(ranked.username)
    ELSE lower(ranked.username) || '_' || ranked.rn
END
FROM ranked
WHERE profile.id = ranked.id;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_unique_username_idx
    ON public.profiles ((lower(username)));

ALTER TABLE public.profiles
    ALTER COLUMN username SET NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_profile_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    clean_username TEXT;
BEGIN
    IF NEW.username IS NULL THEN
        clean_username := split_part(NEW.email, '@', 1);
    ELSE
        clean_username := lower(trim(NEW.username));
    END IF;

    clean_username := regexp_replace(clean_username, '[^a-z0-9_]', '', 'g');
    IF clean_username = '' THEN
        clean_username := 'user_' || substr(NEW.id::text, 1, 8);
    END IF;

    NEW.username := clean_username;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_normalize_username ON public.profiles;
CREATE TRIGGER on_profile_normalize_username
BEFORE INSERT OR UPDATE OF username ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.normalize_profile_username();

CREATE OR REPLACE FUNCTION public.handle_chat_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    mentioned_profile RECORD;
BEGIN
    IF NEW.mentions IS NULL THEN
        NEW.mentions := '{}';
    END IF;

    FOR mentioned_profile IN
        SELECT id, username
        FROM public.profiles
        WHERE NEW.content ~* ('(^|[^a-z0-9_])@' || username || '([^a-z0-9_]|$)')
          AND id <> NEW.sender_id
    LOOP
        IF NOT (mentioned_profile.id = ANY(COALESCE(NEW.mentions, '{}'::uuid[]))) THEN
            NEW.mentions := array_append(COALESCE(NEW.mentions, '{}'), mentioned_profile.id);
        END IF;

        INSERT INTO public.notifications (
            user_id, actor_id, type, title, message, entity_type, entity_id
        ) VALUES (
            mentioned_profile.id,
            NEW.sender_id,
            'mention',
            'Bir mesajda mention alındı',
            '@' || mentioned_profile.username || ' mesajda etiketlendi.',
            'chat',
            NEW.id
        );
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_chat_message_mentions ON public.chat_messages;
CREATE TRIGGER on_chat_message_mentions
BEFORE INSERT OR UPDATE OF content, mentions ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_chat_mentions();
