-- RLS無限再帰エラー修正用SQL
-- このスクリプトをSupabaseのSQLエディタで実行してください。

-- 1. 権限チェック用関数を作成 (SECURITY DEFINERを使用することで無限再帰を回避)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_approver()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_approver = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 既存のポリシーを削除して再作成

-- user_profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles" ON user_profiles
    FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
CREATE POLICY "Admins can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (is_admin());

-- monthly_settings
DROP POLICY IF EXISTS "Approvers can view all monthly settings" ON monthly_settings;
CREATE POLICY "Approvers can view all monthly settings" ON monthly_settings
    FOR SELECT USING (is_approver());

-- daily_records
DROP POLICY IF EXISTS "Approvers can view all daily records" ON daily_records;
CREATE POLICY "Approvers can view all daily records" ON daily_records
    FOR SELECT USING (is_approver());

-- approvals
DROP POLICY IF EXISTS "Approvers can manage all approvals" ON approvals;
CREATE POLICY "Approvers can manage all approvals" ON approvals
    FOR ALL USING (is_approver());

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE 'RLSポリシーの修正が完了しました。無限再帰エラーは解消されました。';
END $$;
