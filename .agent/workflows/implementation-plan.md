---
description: タイムカードシステム機能追加の実装計画
---

# タイムカードシステム機能追加実装計画

## 概要
以下の機能を追加します：
1. 年間休日設定画面
2. パスワード変更機能
3. 月間一覧画面のデザイン変更（スマートフォン対応）
4. 日ごとの入力画面の初期値改善
5. Supabase構成チェック機能

## 実装手順

### 1. データベーススキーマの更新

#### 1.1 年間休日設定テーブルの追加
```sql
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
```

#### 1.2 パスワード変更フラグの追加
```sql
ALTER TABLE user_profiles ADD COLUMN password_changed BOOLEAN DEFAULT FALSE;
```

#### 1.3 RLSポリシーの追加
- annual_holidays テーブルへのRLS設定
- ユーザーは自分の年間休日設定を管理可能
- 管理者は全ユーザーの設定を閲覧可能

### 2. 年間休日設定画面の実装

#### 2.1 HTMLの追加 (dashboard.html)
- 新しいタブ「年間休日設定」を追加
- カレンダー形式で年間の休日を設定できるUI
- 法定休日、法定外休日、土曜出勤日を色分けして表示

#### 2.2 JavaScriptの実装 (js/annual-holidays.js)
- 年間カレンダーの表示
- 休日の追加・削除機能
- データの保存・読み込み機能

### 3. パスワード変更機能の実装

#### 3.1 パスワード変更画面の追加
- ヘッダーにパスワード変更ボタンを追加
- モーダルダイアログでパスワード変更フォームを表示

#### 3.2 初回ログイン時の警告
- ログイン後、password_changedフラグをチェック
- falseの場合、警告バナーを表示
- パスワード変更後、フラグをtrueに更新

#### 3.3 パスワードバリデーション
- 10文字以上の制約を追加
- 現在のパスワードの確認
- 新しいパスワードの確認入力

### 4. 月間一覧画面のデザイン変更

#### 4.1 レスポンシブデザインの実装 (css/style.css)
- スマートフォン向けのメディアクエリを追加
- テーブルを横スクロール可能に
- カード形式での表示オプション

#### 4.2 警告表示機能
- 年間休日設定と入力の矛盾をチェック
- 矛盾がある場合、該当行に警告アイコンを表示
- ツールチップで詳細を表示

### 5. 日ごとの入力画面の初期値改善

#### 5.1 初期値設定ロジックの追加 (js/app.js)
- 選択された日付の年間休日設定を取得
- 法定休日の場合、work_typeを'legal-holiday'に設定
- 法定外休日の場合、work_typeを'extra-holiday'に設定
- 土曜出勤日の場合、work_typeを'work'に設定

### 6. Supabase構成チェック機能

#### 6.1 チェック機能の実装 (js/supabase-check.js)
- テーブルの存在確認
- RLSポリシーの確認
- 必要なインデックスの確認
- トリガーの確認

#### 6.2 管理画面への統合
- 管理者タブに「システムチェック」ボタンを追加
- チェック結果を表示するモーダル
- 問題がある場合、修正方法を提示

## 実装順序

1. データベーススキーマの更新
2. 年間休日設定画面の実装
3. パスワード変更機能の実装
4. 月間一覧画面のデザイン変更
5. 日ごとの入力画面の初期値改善
6. Supabase構成チェック機能の実装
7. 統合テスト

## 注意事項

- 既存の機能に影響を与えないよう注意
- RLSポリシーの無限再帰に注意
- スマートフォンでの操作性を重視
- データの整合性を保つ
