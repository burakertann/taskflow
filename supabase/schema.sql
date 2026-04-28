-- TaskFlow — Veritabanı Şeması
-- Supabase SQL Editor'da çalıştırarak tüm tabloları,
-- RLS policy'lerini ve fonksiyonları oluşturabilirsiniz.

-- ============================================================
-- TABLOLAR
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  bio        text,
  email      text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.boards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      text NOT NULL,
  is_public  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.columns (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title      text NOT NULL,
  position   float8 NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id   uuid NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  priority    text DEFAULT 'Medium',
  position    float8 NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.board_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   uuid REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (board_id, user_id)
);

-- ============================================================
-- RLS AKTİFLEŞTİRME
-- ============================================================

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES POLİCY'LERİ
-- ============================================================

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- BOARDS POLİCY'LERİ
-- ============================================================

CREATE POLICY "boards_select"
  ON public.boards FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Members can view board"
  ON public.boards FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.board_members
      WHERE board_members.board_id = boards.id
        AND board_members.user_id = auth.uid()
    )
  );

CREATE POLICY "boards_insert"
  ON public.boards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "boards_update"
  ON public.boards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "boards_delete"
  ON public.boards FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- COLUMNS POLİCY'LERİ
-- ============================================================

CREATE POLICY "columns_select"
  ON public.columns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE boards.id = columns.board_id
        AND boards.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.board_members
      WHERE board_members.board_id = columns.board_id
        AND board_members.user_id = auth.uid()
    )
  );

CREATE POLICY "columns_modify"
  ON public.columns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE boards.id = columns.board_id
        AND boards.user_id = auth.uid()
    )
  );

-- ============================================================
-- CARDS POLİCY'LERİ
-- ============================================================

CREATE POLICY "cards_select"
  ON public.cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.columns
      WHERE columns.id = cards.column_id
        AND (
          EXISTS (
            SELECT 1 FROM public.boards
            WHERE boards.id = columns.board_id
              AND boards.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.board_members
            WHERE board_members.board_id = columns.board_id
              AND board_members.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "cards_modify"
  ON public.cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.columns
      JOIN public.boards ON boards.id = columns.board_id
      WHERE columns.id = cards.column_id
        AND boards.user_id = auth.uid()
    )
  );

-- ============================================================
-- COMMENTS POLİCY'LERİ
-- ============================================================

CREATE POLICY "comments_select"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cards
      JOIN public.columns ON columns.id = cards.column_id
      JOIN public.boards ON boards.id = columns.board_id
      WHERE cards.id = comments.card_id
        AND (
          boards.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.board_members
            WHERE board_members.board_id = boards.id
              AND board_members.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "comments_insert"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- BOARD_MEMBERS POLİCY'LERİ
-- ============================================================

CREATE POLICY "Members can view memberships"
  ON public.board_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owner can add members"
  ON public.board_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE boards.id = board_members.board_id
        AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can remove members"
  ON public.board_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE boards.id = board_members.board_id
        AND boards.user_id = auth.uid()
    )
  );

-- ============================================================
-- SECURITY DEFINER FONKSİYONLARI
-- ============================================================

-- Sütun pozisyonlarını yeniden dengele (fractional indexing overflow)
CREATE OR REPLACE FUNCTION public.rebalance_column(col_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE cards
  SET position = sub.new_pos
  FROM (
    SELECT id, (row_number() OVER (ORDER BY position) * 1000)::float AS new_pos
    FROM cards WHERE column_id = col_id
  ) sub
  WHERE cards.id = sub.id;
$$;

-- Pano üyelerini getir (RLS döngüsünü aşmak için SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_board_members(p_board_id uuid)
RETURNS TABLE(id uuid, user_id uuid, full_name text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM boards WHERE boards.id = p_board_id AND boards.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT bm.id, bm.user_id, p.full_name, p.email
  FROM board_members bm
  LEFT JOIN profiles p ON p.id = bm.user_id
  WHERE bm.board_id = p_board_id;
END;
$$;

-- Pano üyesini kaldır (RLS döngüsünü aşmak için SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.remove_board_member(p_board_id uuid, p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM boards WHERE boards.id = p_board_id AND boards.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM board_members WHERE id = p_member_id AND board_id = p_board_id;
END;
$$;

-- ============================================================
-- TRIGGER: Kayıt olunca profiles tablosuna otomatik ekle
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
