-- 機能追加のためのスキーマ更新
-- 実行日: 2025-12-04

-- 1. 年間休日設定テーブルの追加
CREATE TABLE IF NOT EXISTS annual_holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_type TEXT CHECK (holiday_type IN ('legal-holiday', 'extra-holiday', 'saturday-work')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, year, holiday_date)
);

-- 2. パスワード変更フラグの追加
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT FALSE;

-- 3. インデックスの追加
CREATE INDEX IF NOT EXISTS idx_annual_holidays_user_id ON annual_holidays(user_id);
CREATE INDEX IF NOT EXISTS idx_annual_holidays_year ON annual_holidays(year);
CREATE INDEX IF NOT EXISTS idx_annual_holidays_date ON annual_holidays(holiday_date);

-- 4. RLS設定
ALTER TABLE annual_holidays ENABLE ROW LEVEL SECURITY;

-- 5. annual_holidays ポリシー
-- ユーザーは自分の年間休日設定を操作可能
CREATE POLICY "Users can manage own annual holidays" ON annual_holidays
    FOR ALL USING (auth.uid() = user_id);

-- 管理者は全ユーザーの年間休日設定を閲覧可能
CREATE POLICY "Admins can view all annual holidays" ON annual_holidays
    FOR SELECT USING (is_admin());

-- 6. updated_at 自動更新トリガー
CREATE TRIGGER update_annual_holidays_updated_at
    BEFORE UPDATE ON annual_holidays
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
