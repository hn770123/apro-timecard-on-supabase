/**
 * Supabase設定ファイル
 * 
 * このファイルはSupabaseクライアントの初期化と設定を行う
 * GitHub Pagesにデプロイするため、環境変数ではなく設定ファイルを使用
 * 
 * 重要: 本番環境では以下の手順で設定を行ってください
 * 1. Supabaseプロジェクトを作成
 * 2. プロジェクトのURLとAnon Keyを取得
 * 3. 下記のプレースホルダーを実際の値に置き換え
 * 
 * セキュリティ注意:
 * - SUPABASE_ANON_KEYは公開されても安全な匿名キーです
 * - Row Level Security (RLS)を適切に設定することでデータを保護します
 * - 機密性の高い操作はEdge Functionsで実装してください
 */

// Supabase設定（プレースホルダー - 本番環境で置き換えてください）
// 設定方法の詳細はREADME.mdを参照
const SUPABASE_URL = 'https://zwpjvfnekpqgxfsltpnz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3cGp2Zm5la3BxZ3hmc2x0cG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDMzMTUsImV4cCI6MjA3OTgxOTMxNX0.WLABRojy9VBAdiHp3J9uk1QrCAL7ifJtc567dXrYhtI';

// Supabaseクライアントの初期化
let supabase = null;

/**
 * Supabaseクライアントを初期化する
 * @returns {Object} Supabaseクライアントインスタンス
 */
function initSupabase() {
    if (!supabase && typeof window !== 'undefined' && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabase;
}

/**
 * Supabaseクライアントを取得する
 * @returns {Object} Supabaseクライアントインスタンス
 */
function getSupabaseClient() {
    if (!supabase) {
        initSupabase();
    }
    return supabase;
}

// ページ読み込み時にSupabaseを初期化
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        initSupabase();
    });
}

// モジュールエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        initSupabase,
        getSupabaseClient
    };
}
