-- 勤務月報システム データベーススキーマ
-- Supabase用SQLスクリプト

-- ユーザープロフィールテーブル
-- ユーザーの基本情報と権限を管理
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    department TEXT,
    is_approver BOOLEAN DEFAULT FALSE,  -- 承認権限
    is_admin BOOLEAN DEFAULT FALSE,     -- 管理者権限
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 月間設定テーブル
-- 月ごとの勤務パターンと標準就労時間を管理
CREATE TABLE IF NOT EXISTS monthly_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    name TEXT,          -- 氏名
    department TEXT,    -- 所属
    standard_hours DECIMAL(4,2) DEFAULT 8,  -- 1日標準就労時間
    
    -- 勤務パターン1
    pattern1_start TIME,
    pattern1_end TIME,
    pattern1_break1_start TIME,
    pattern1_break1_end TIME,
    pattern1_break2_start TIME,
    pattern1_break2_end TIME,
    pattern1_break3_start TIME,
    pattern1_break3_end TIME,
    
    -- 勤務パターン2
    pattern2_start TIME,
    pattern2_end TIME,
    pattern2_break1_start TIME,
    pattern2_break1_end TIME,
    pattern2_break2_start TIME,
    pattern2_break2_end TIME,
    pattern2_break3_start TIME,
    pattern2_break3_end TIME,
    
    -- 勤務パターン3
    pattern3_start TIME,
    pattern3_end TIME,
    pattern3_break1_start TIME,
    pattern3_break1_end TIME,
    pattern3_break2_start TIME,
    pattern3_break2_end TIME,
    pattern3_break3_start TIME,
    pattern3_break3_end TIME,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, year, month)
);

-- 日毎勤務記録テーブル
-- 日ごとの勤務情報を管理
CREATE TABLE IF NOT EXISTS daily_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    work_date DATE NOT NULL,
    work_type TEXT CHECK (work_type IN ('work', 'remote', 'late', 'early-leave', 'late-early', 'legal-holiday', 'extra-holiday')),
    start_time TIME,        -- 出勤時刻
    end_time TIME,          -- 退勤時刻
    late_time INTEGER DEFAULT 0,            -- 遅刻時間（分）
    early_leave_time INTEGER DEFAULT 0,     -- 早退時間（分）
    overtime INTEGER DEFAULT 0,             -- 残業時間（分）
    night_overtime INTEGER DEFAULT 0,       -- 深夜残業時間（分）
    leave_type TEXT CHECK (leave_type IS NULL OR leave_type IN ('paid', 'absent', 'special', 'congratulation')),
    work_pattern INTEGER DEFAULT 1 CHECK (work_pattern >= 1 AND work_pattern <= 3),
    note TEXT,              -- 補足欄
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, work_date)
);

-- 承認テーブル
-- 月ごとの承認状態を管理
CREATE TABLE IF NOT EXISTS approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, year, month)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_settings_user_id ON monthly_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_settings_year_month ON monthly_settings(year, month);
CREATE INDEX IF NOT EXISTS idx_daily_records_user_id ON daily_records(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_work_date ON daily_records(work_date);
CREATE INDEX IF NOT EXISTS idx_approvals_user_id ON approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);

-- Row Level Security (RLS) 設定
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- user_profiles ポリシー
-- ユーザーは自分のプロフィールを読み取り可能
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分のプロフィールを更新可能
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- 管理者は全ユーザーのプロフィールを表示可能
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- 管理者は全ユーザーのプロフィールを更新可能
CREATE POLICY "Admins can update all profiles" ON user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- 管理者はプロフィールを作成可能
CREATE POLICY "Admins can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- monthly_settings ポリシー
-- ユーザーは自分の月間設定を操作可能
CREATE POLICY "Users can manage own monthly settings" ON monthly_settings
    FOR ALL USING (auth.uid() = user_id);

-- 承認者は全ユーザーの月間設定を閲覧可能
CREATE POLICY "Approvers can view all monthly settings" ON monthly_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND is_approver = true
        )
    );

-- daily_records ポリシー
-- ユーザーは自分の勤務記録を操作可能（承認済み以外）
CREATE POLICY "Users can manage own daily records" ON daily_records
    FOR ALL USING (
        auth.uid() = user_id
        AND NOT EXISTS (
            SELECT 1 FROM approvals
            WHERE approvals.user_id = daily_records.user_id
            AND approvals.year = EXTRACT(YEAR FROM daily_records.work_date)
            AND approvals.month = EXTRACT(MONTH FROM daily_records.work_date)
            AND approvals.status = 'approved'
        )
    );

-- ユーザーは自分の承認済み記録も閲覧可能
CREATE POLICY "Users can view own approved records" ON daily_records
    FOR SELECT USING (auth.uid() = user_id);

-- 承認者は全ユーザーの勤務記録を閲覧可能
CREATE POLICY "Approvers can view all daily records" ON daily_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND is_approver = true
        )
    );

-- approvals ポリシー
-- ユーザーは自分の承認申請を作成・閲覧可能
CREATE POLICY "Users can manage own approvals" ON approvals
    FOR ALL USING (auth.uid() = user_id);

-- 承認者は全承認を閲覧・更新可能
CREATE POLICY "Approvers can manage all approvals" ON approvals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid() AND is_approver = true
        )
    );

-- 新規ユーザー作成時にプロフィールを自動作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email)
    VALUES (new.id, new.email);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_monthly_settings_updated_at
    BEFORE UPDATE ON monthly_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_daily_records_updated_at
    BEFORE UPDATE ON daily_records
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_approvals_updated_at
    BEFORE UPDATE ON approvals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
