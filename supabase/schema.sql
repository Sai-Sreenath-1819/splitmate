-- Profiles (public, one per auth user)
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text NOT NULL,
  user_code     varchar(7) UNIQUE NOT NULL,
  created_at    timestamptz DEFAULT now()
);

-- Auto-generate user_code on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  text := 'SM-';
  i     int;
  attempts int := 0;
-- Note: User code is SM- + 4 random characters (total 7 chars)
BEGIN
  LOOP
    code := 'SM-';
    FOR i IN 1..4 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_code = code);
    attempts := attempts + 1;
    EXIT WHEN attempts > 100;
  END LOOP;
  INSERT INTO public.profiles (id, display_name, user_code)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'New User'), code);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  emoji       varchar(8) DEFAULT '💸',
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- Group membership
CREATE TABLE IF NOT EXISTS group_members (
  group_id    uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at   timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid REFERENCES groups(id) ON DELETE CASCADE,
  title         text NOT NULL,
  amount        numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_by       uuid REFERENCES profiles(id),
  created_by    uuid REFERENCES profiles(id),
  date          date DEFAULT CURRENT_DATE,
  split_method  text DEFAULT 'equal' CHECK (split_method IN ('equal','percentage','custom')),
  receipt_url   text,
  created_at    timestamptz DEFAULT now()
);

-- Expense splits
CREATE TABLE IF NOT EXISTS expense_splits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id    uuid REFERENCES expenses(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES profiles(id),
  amount_owed   numeric(12,2) NOT NULL
);

-- Settlements
CREATE TABLE IF NOT EXISTS settlements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid REFERENCES groups(id) ON DELETE CASCADE,
  from_user     uuid REFERENCES profiles(id),
  to_user       uuid REFERENCES profiles(id),
  amount        numeric(12,2) NOT NULL CHECK (amount > 0),
  note          text,
  settled_at    timestamptz DEFAULT now(),
  created_by    uuid REFERENCES profiles(id)
);

-- Enable RLS on all tables
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements      ENABLE ROW LEVEL SECURITY;

-- Helper function to check group membership (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_group_member(group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.group_members 
    WHERE public.group_members.group_id = is_group_member.group_id 
    AND public.group_members.user_id = auth.uid()
  );
END;
$$;

-- RLS POLICIES

-- profiles: anyone authenticated can read; only you can write your own
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

-- groups: only members can view
CREATE POLICY "groups_select" ON groups FOR SELECT TO authenticated
  USING (public.is_group_member(id) OR (select auth.uid()) = created_by);
CREATE POLICY "groups_insert" ON groups FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);
CREATE POLICY "groups_update" ON groups FOR UPDATE TO authenticated
  USING ((select auth.uid()) = created_by);

-- group_members: members can see their group's member list; members can add others
CREATE POLICY "group_members_select" ON group_members FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));
CREATE POLICY "group_members_insert" ON group_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_group_member(group_id) 
    OR (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.groups g 
      WHERE g.id = group_id AND g.created_by = (select auth.uid())
    )
  );
CREATE POLICY "group_members_delete" ON group_members FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- expenses: only group members
CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated
  WITH CHECK (public.is_group_member(group_id));
CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated
  USING (created_by = (select auth.uid()));
CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated
  USING (created_by = (select auth.uid()));

-- expense_splits: group members can see
CREATE POLICY "splits_select" ON expense_splits FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.id = expense_id AND public.is_group_member(e.group_id)
  ));
CREATE POLICY "splits_insert" ON expense_splits FOR INSERT TO authenticated WITH CHECK (true);

-- settlements: group members
CREATE POLICY "settlements_select" ON settlements FOR SELECT TO authenticated
  USING (public.is_group_member(group_id));
CREATE POLICY "settlements_insert" ON settlements FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);
