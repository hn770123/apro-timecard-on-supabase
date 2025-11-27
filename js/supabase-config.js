/**
 * Supabase設定ファイル
 * 
 * このファイルはSupabaseクライアントの初期化と設定を行う
 * GitHub Pagesにデプロイするため、環境変数ではなく設定ファイルを使用
 */

// Supabase設定
// 注意: 本番環境では適切な値に置き換えてください
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

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
