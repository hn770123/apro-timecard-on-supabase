/**
 * 承認モジュール
 * 
 * このファイルは勤務表の承認機能を提供する
 * 承認申請、承認、却下、承認取り消しを担当
 */

/**
 * 承認状態の定数
 */
const APPROVAL_STATUS = {
    DRAFT: 'draft',           // 未申請
    PENDING: 'pending',       // 承認待ち
    APPROVED: 'approved',     // 承認済み
    REJECTED: 'rejected'      // 却下
};

/**
 * 承認状態を取得する
 * @param {string} userId - ユーザーID
 * @param {number} year - 年
 * @param {number} month - 月
 * @returns {Object|null} 承認状態オブジェクトまたはnull
 */
async function getApprovalStatus(userId, year, month) {
    try {
        const client = getSupabaseClient();
        const { data, error } = await client
            .from('approvals')
            .select('*')
            .eq('user_id', userId)
            .eq('year', year)
            .eq('month', month)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('承認状態取得エラー:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('承認状態取得エラー:', error);
        return null;
    }
}

/**
 * 承認申請を行う
 * @param {string} userId - ユーザーID
 * @param {number} year - 年
 * @param {number} month - 月
 * @returns {Object} 結果オブジェクト {success: boolean, message: string}
 */
async function requestApproval(userId, year, month) {
    try {
        const client = getSupabaseClient();
        
        // 既存の承認状態を確認
        const { data: existing } = await client
            .from('approvals')
            .select('id, status')
            .eq('user_id', userId)
            .eq('year', year)
            .eq('month', month)
            .single();
        
        const now = new Date().toISOString();
        
        if (existing) {
            // すでに承認済みの場合はエラー
            if (existing.status === APPROVAL_STATUS.APPROVED) {
                return {
                    success: false,
                    message: 'すでに承認されています'
                };
            }
            
            // 更新
            const { error } = await client
                .from('approvals')
                .update({
                    status: APPROVAL_STATUS.PENDING,
                    requested_at: now,
                    updated_at: now
                })
                .eq('id', existing.id);
            
            if (error) {
                return {
                    success: false,
                    message: '承認申請に失敗しました: ' + error.message
                };
            }
        } else {
            // 新規作成
            const { error } = await client
                .from('approvals')
                .insert({
                    user_id: userId,
                    year: year,
                    month: month,
                    status: APPROVAL_STATUS.PENDING,
                    requested_at: now,
                    created_at: now,
                    updated_at: now
                });
            
            if (error) {
                return {
                    success: false,
                    message: '承認申請に失敗しました: ' + error.message
                };
            }
        }
        
        return {
            success: true,
            message: '承認申請を送信しました'
        };
    } catch (error) {
        return {
            success: false,
            message: '承認申請中にエラーが発生しました: ' + error.message
        };
    }
}

/**
 * 承認待ちリストを取得する（承認者向け）
 * @returns {Array} 承認待ちリスト
 */
async function getPendingApprovals() {
    try {
        const client = getSupabaseClient();
        const { data, error } = await client
            .from('approvals')
            .select(`
                *,
                user_profiles:user_id (name, department)
            `)
            .eq('status', APPROVAL_STATUS.PENDING)
            .order('requested_at', { ascending: true });
        
        if (error) {
            console.error('承認待ちリスト取得エラー:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('承認待ちリスト取得エラー:', error);
        return [];
    }
}

/**
 * 全承認リストを取得する（承認者向け）
 * @returns {Array} 承認リスト
 */
async function getAllApprovals() {
    try {
        const client = getSupabaseClient();
        const { data, error } = await client
            .from('approvals')
            .select(`
                *,
                user_profiles:user_id (name, department)
            `)
            .order('year', { ascending: false })
            .order('month', { ascending: false });
        
        if (error) {
            console.error('承認リスト取得エラー:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('承認リスト取得エラー:', error);
        return [];
    }
}

/**
 * 承認を行う
 * @param {string} approvalId - 承認ID
 * @param {string} approverId - 承認者ID
 * @returns {Object} 結果オブジェクト {success: boolean, message: string}
 */
async function approve(approvalId, approverId) {
    try {
        const client = getSupabaseClient();
        const now = new Date().toISOString();
        
        const { error } = await client
            .from('approvals')
            .update({
                status: APPROVAL_STATUS.APPROVED,
                approved_by: approverId,
                approved_at: now,
                updated_at: now
            })
            .eq('id', approvalId);
        
        if (error) {
            return {
                success: false,
                message: '承認に失敗しました: ' + error.message
            };
        }
        
        return {
            success: true,
            message: '承認しました'
        };
    } catch (error) {
        return {
            success: false,
            message: '承認中にエラーが発生しました: ' + error.message
        };
    }
}

/**
 * 却下を行う
 * @param {string} approvalId - 承認ID
 * @param {string} approverId - 承認者ID
 * @param {string} reason - 却下理由
 * @returns {Object} 結果オブジェクト {success: boolean, message: string}
 */
async function reject(approvalId, approverId, reason) {
    try {
        const client = getSupabaseClient();
        const now = new Date().toISOString();
        
        const { error } = await client
            .from('approvals')
            .update({
                status: APPROVAL_STATUS.REJECTED,
                approved_by: approverId,
                approved_at: now,
                rejection_reason: reason,
                updated_at: now
            })
            .eq('id', approvalId);
        
        if (error) {
            return {
                success: false,
                message: '却下に失敗しました: ' + error.message
            };
        }
        
        return {
            success: true,
            message: '却下しました'
        };
    } catch (error) {
        return {
            success: false,
            message: '却下中にエラーが発生しました: ' + error.message
        };
    }
}

/**
 * 承認取り消しを行う
 * @param {string} approvalId - 承認ID
 * @param {string} approverId - 承認者ID
 * @returns {Object} 結果オブジェクト {success: boolean, message: string}
 */
async function cancelApproval(approvalId, approverId) {
    try {
        const client = getSupabaseClient();
        const now = new Date().toISOString();
        
        const { error } = await client
            .from('approvals')
            .update({
                status: APPROVAL_STATUS.DRAFT,
                approved_by: null,
                approved_at: null,
                rejection_reason: null,
                updated_at: now
            })
            .eq('id', approvalId);
        
        if (error) {
            return {
                success: false,
                message: '承認取り消しに失敗しました: ' + error.message
            };
        }
        
        return {
            success: true,
            message: '承認を取り消しました'
        };
    } catch (error) {
        return {
            success: false,
            message: '承認取り消し中にエラーが発生しました: ' + error.message
        };
    }
}

/**
 * 月が編集可能かどうかを確認する
 * @param {string} userId - ユーザーID
 * @param {number} year - 年
 * @param {number} month - 月
 * @returns {boolean} 編集可能な場合はtrue
 */
async function isMonthEditable(userId, year, month) {
    const approval = await getApprovalStatus(userId, year, month);
    
    if (!approval) {
        return true;
    }
    
    return approval.status !== APPROVAL_STATUS.APPROVED;
}

/**
 * 承認状態のラベルを取得する
 * @param {string} status - 承認状態コード
 * @returns {string} 承認状態ラベル
 */
function getApprovalStatusLabel(status) {
    const labels = {
        [APPROVAL_STATUS.DRAFT]: '未申請',
        [APPROVAL_STATUS.PENDING]: '承認待ち',
        [APPROVAL_STATUS.APPROVED]: '承認済み',
        [APPROVAL_STATUS.REJECTED]: '却下'
    };
    return labels[status] || '不明';
}

/**
 * 承認状態のCSSクラスを取得する
 * @param {string} status - 承認状態コード
 * @returns {string} CSSクラス名
 */
function getApprovalStatusClass(status) {
    const classes = {
        [APPROVAL_STATUS.DRAFT]: '',
        [APPROVAL_STATUS.PENDING]: 'pending',
        [APPROVAL_STATUS.APPROVED]: 'approved',
        [APPROVAL_STATUS.REJECTED]: 'rejected'
    };
    return classes[status] || '';
}

// モジュールエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        APPROVAL_STATUS,
        getApprovalStatus,
        requestApproval,
        getPendingApprovals,
        getAllApprovals,
        approve,
        reject,
        cancelApproval,
        isMonthEditable,
        getApprovalStatusLabel,
        getApprovalStatusClass
    };
}
