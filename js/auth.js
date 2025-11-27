/**
 * 認証モジュール
 * 
 * このファイルはユーザー認証機能を提供する
 * ログイン、ログアウト、セッション管理を担当
 */

/**
 * ユーザーログイン処理
 * @param {string} email - メールアドレス
 * @param {string} password - パスワード
 * @returns {Object} 結果オブジェクト {success: boolean, message: string, user?: Object}
 */
async function login(email, password) {
    try {
        const client = getSupabaseClient();
        
        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            return {
                success: false,
                message: error.message
            };
        }
        
        return {
            success: true,
            message: 'ログインに成功しました',
            user: data.user
        };
    } catch (error) {
        return {
            success: false,
            message: 'ログイン処理中にエラーが発生しました: ' + error.message
        };
    }
}

/**
 * ユーザーログアウト処理
 * @returns {Object} 結果オブジェクト {success: boolean, message: string}
 */
async function logout() {
    try {
        const client = getSupabaseClient();
        const { error } = await client.auth.signOut();
        
        if (error) {
            return {
                success: false,
                message: error.message
            };
        }
        
        return {
            success: true,
            message: 'ログアウトしました'
        };
    } catch (error) {
        return {
            success: false,
            message: 'ログアウト処理中にエラーが発生しました: ' + error.message
        };
    }
}

/**
 * 現在のセッションを確認する
 * @returns {Object|null} セッションオブジェクトまたはnull
 */
async function checkSession() {
    try {
        const client = getSupabaseClient();
        const { data: { session }, error } = await client.auth.getSession();
        
        if (error || !session) {
            return null;
        }
        
        return session;
    } catch (error) {
        console.error('セッション確認エラー:', error);
        return null;
    }
}

/**
 * 現在ログインしているユーザーを取得する
 * @returns {Object|null} ユーザーオブジェクトまたはnull
 */
async function getCurrentUser() {
    try {
        const client = getSupabaseClient();
        const { data: { user }, error } = await client.auth.getUser();
        
        if (error || !user) {
            return null;
        }
        
        return user;
    } catch (error) {
        console.error('ユーザー取得エラー:', error);
        return null;
    }
}

/**
 * ユーザーのプロフィール情報を取得する
 * @param {string} userId - ユーザーID
 * @returns {Object|null} プロフィールオブジェクトまたはnull
 */
async function getUserProfile(userId) {
    try {
        const client = getSupabaseClient();
        const { data, error } = await client
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            console.error('プロフィール取得エラー:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('プロフィール取得エラー:', error);
        return null;
    }
}

/**
 * ユーザーの権限を確認する
 * @param {string} userId - ユーザーID
 * @returns {Object} 権限オブジェクト {isApprover: boolean, isAdmin: boolean}
 */
async function checkUserPermissions(userId) {
    try {
        const profile = await getUserProfile(userId);
        
        if (!profile) {
            return {
                isApprover: false,
                isAdmin: false
            };
        }
        
        return {
            isApprover: profile.is_approver || false,
            isAdmin: profile.is_admin || false
        };
    } catch (error) {
        console.error('権限確認エラー:', error);
        return {
            isApprover: false,
            isAdmin: false
        };
    }
}

/**
 * 認証状態の変化を監視する
 * @param {Function} callback - 認証状態変化時のコールバック関数
 * @returns {Object} サブスクリプションオブジェクト
 */
function onAuthStateChange(callback) {
    const client = getSupabaseClient();
    return client.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// モジュールエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        login,
        logout,
        checkSession,
        getCurrentUser,
        getUserProfile,
        checkUserPermissions,
        onAuthStateChange
    };
}
