/**
 * 管理者モジュール
 * 
 * このファイルはシステム管理者向けの機能を提供する
 * ユーザーの追加、変更、削除を担当
 */

/**
 * 全ユーザーリストを取得する
 * @returns {Array} ユーザー配列
 */
async function getAllUsers() {
    try {
        const client = getSupabaseClient();
        const { data, error } = await client
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('ユーザー一覧取得エラー:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('ユーザー一覧取得エラー:', error);
        return [];
    }
}

/**
 * 新規ユーザーを作成する
 * @param {Object} userData - ユーザーデータ
 * @returns {Object} 結果オブジェクト {success: boolean, message: string, user?: Object}
 */
async function createUser(userData) {
    try {
        const client = getSupabaseClient();
        
        // Supabase Authでユーザー作成
        // 注意: これは管理者APIを使用する必要があるため、
        // 実際の実装ではSupabase Edge Functionsを使用することを推奨
        const { data: authData, error: authError } = await client.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true
        });
        
        if (authError) {
            return {
                success: false,
                message: 'ユーザー作成に失敗しました: ' + authError.message
            };
        }
        
        // プロフィール作成
        const { error: profileError } = await client
            .from('user_profiles')
            .insert({
                user_id: authData.user.id,
                email: userData.email,
                name: userData.name,
                department: userData.department,
                is_approver: userData.isApprover || false,
                is_admin: userData.isAdmin || false
            });
        
        if (profileError) {
            return {
                success: false,
                message: 'プロフィール作成に失敗しました: ' + profileError.message
            };
        }
        
        return {
            success: true,
            message: 'ユーザーを作成しました',
            user: authData.user
        };
    } catch (error) {
        return {
            success: false,
            message: 'ユーザー作成中にエラーが発生しました: ' + error.message
        };
    }
}

/**
 * ユーザープロフィールを更新する
 * @param {string} userId - ユーザーID
 * @param {Object} profileData - プロフィールデータ
 * @returns {Object} 結果オブジェクト {success: boolean, message: string}
 */
async function updateUserProfile(userId, profileData) {
    try {
        const client = getSupabaseClient();
        
        const { error } = await client
            .from('user_profiles')
            .update({
                name: profileData.name,
                department: profileData.department,
                is_approver: profileData.isApprover || false,
                is_admin: profileData.isAdmin || false,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        
        if (error) {
            return {
                success: false,
                message: 'プロフィール更新に失敗しました: ' + error.message
            };
        }
        
        return {
            success: true,
            message: 'プロフィールを更新しました'
        };
    } catch (error) {
        return {
            success: false,
            message: 'プロフィール更新中にエラーが発生しました: ' + error.message
        };
    }
}

/**
 * ユーザーを削除する
 * @param {string} userId - ユーザーID
 * @returns {Object} 結果オブジェクト {success: boolean, message: string}
 */
async function deleteUser(userId) {
    try {
        const client = getSupabaseClient();
        
        // プロフィール削除
        const { error: profileError } = await client
            .from('user_profiles')
            .delete()
            .eq('user_id', userId);
        
        if (profileError) {
            return {
                success: false,
                message: 'ユーザー削除に失敗しました: ' + profileError.message
            };
        }
        
        // 注意: Supabase Authユーザーの削除は管理者APIが必要
        // 実際の実装ではSupabase Edge Functionsを使用することを推奨
        
        return {
            success: true,
            message: 'ユーザーを削除しました'
        };
    } catch (error) {
        return {
            success: false,
            message: 'ユーザー削除中にエラーが発生しました: ' + error.message
        };
    }
}

/**
 * ユーザーの権限を更新する
 * @param {string} userId - ユーザーID
 * @param {boolean} isApprover - 承認権限
 * @param {boolean} isAdmin - 管理者権限
 * @returns {Object} 結果オブジェクト {success: boolean, message: string}
 */
async function updateUserPermissions(userId, isApprover, isAdmin) {
    try {
        const client = getSupabaseClient();
        
        const { error } = await client
            .from('user_profiles')
            .update({
                is_approver: isApprover,
                is_admin: isAdmin,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        
        if (error) {
            return {
                success: false,
                message: '権限更新に失敗しました: ' + error.message
            };
        }
        
        return {
            success: true,
            message: '権限を更新しました'
        };
    } catch (error) {
        return {
            success: false,
            message: '権限更新中にエラーが発生しました: ' + error.message
        };
    }
}

/**
 * ユーザー情報を取得する
 * @param {string} userId - ユーザーID
 * @returns {Object|null} ユーザー情報またはnull
 */
async function getUserById(userId) {
    try {
        const client = getSupabaseClient();
        const { data, error } = await client
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            console.error('ユーザー取得エラー:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('ユーザー取得エラー:', error);
        return null;
    }
}

// モジュールエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAllUsers,
        createUser,
        updateUserProfile,
        deleteUser,
        updateUserPermissions,
        getUserById
    };
}
