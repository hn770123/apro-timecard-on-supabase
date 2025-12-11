-- 年間休日設定テーブルのRLSポリシー修正スクリプト
-- このスクリプトをSupabaseのSQLエディタで実行してください

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can manage own annual holidays" ON annual_holidays;
DROP POLICY IF EXISTS "Admins can view all annual holidays" ON annual_holidays;

-- ユーザーが自分の年間休日設定を閲覧できるポリシー
CREATE POLICY "Users can view own annual holidays" ON annual_holidays
    FOR SELECT USING (auth.uid() = user_id);

-- ユーザーが自分の年間休日設定を作成できるポリシー
CREATE POLICY "Users can insert own annual holidays" ON annual_holidays
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーが自分の年間休日設定を更新できるポリシー
CREATE POLICY "Users can update own annual holidays" ON annual_holidays
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ユーザーが自分の年間休日設定を削除できるポリシー
CREATE POLICY "Users can delete own annual holidays" ON annual_holidays
    FOR DELETE USING (auth.uid() = user_id);

-- 管理者が全ユーザーの年間休日設定を閲覧できるポリシー
CREATE POLICY "Admins can view all annual holidays" ON annual_holidays
    FOR SELECT USING (is_admin());

-- 管理者が全ユーザーの年間休日設定を更新できるポリシー
CREATE POLICY "Admins can update all annual holidays" ON annual_holidays
    FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- 管理者が全ユーザーの年間休日設定を削除できるポリシー
CREATE POLICY "Admins can delete all annual holidays" ON annual_holidays
    FOR DELETE USING (is_admin());

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '年間休日設定テーブルのRLSポリシー修正が完了しました。';
END $$;
