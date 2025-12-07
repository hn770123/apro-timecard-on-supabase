/**
 * パスワード変更モジュール
 * 
 * ユーザーのパスワード変更機能を提供
 */

/**
 * パスワード変更の初期化
 */
function initPasswordChange() {
    checkPasswordChanged();
}

/**
 * パスワード変更状態をチェック
 */
async function checkPasswordChanged() {
    if (!currentProfile) return;

    // パスワードが変更されていない場合、警告を表示
    if (!currentProfile.password_changed) {
        showPasswordChangeWarning();
    }
}

/**
 * パスワード変更警告を表示
 */
function showPasswordChangeWarning() {
    const warningBanner = document.createElement('div');
    warningBanner.id = 'password-warning-banner';
    warningBanner.className = 'alert alert-warning password-warning';
    warningBanner.innerHTML = `
        <strong>⚠️ パスワードを変更してください</strong>
        <p>セキュリティのため、初期パスワードから変更することを強く推奨します。</p>
        <button id="change-password-from-warning" class="btn btn-primary btn-sm">今すぐ変更</button>
        <button id="dismiss-warning" class="btn btn-secondary btn-sm">後で</button>
    `;

    const container = document.querySelector('.container main');
    if (container) {
        container.insertBefore(warningBanner, container.firstChild);

        document.getElementById('change-password-from-warning').addEventListener('click', () => {
            openPasswordChangeModal();
        });

        document.getElementById('dismiss-warning').addEventListener('click', () => {
            warningBanner.remove();
        });
    }
}

/**
 * パスワード変更モーダルを開く
 */
function openPasswordChangeModal() {
    const modal = document.getElementById('password-change-modal');
    if (!modal) return;

    // フォームをリセット
    document.getElementById('password-change-form').reset();
    document.getElementById('password-error').style.display = 'none';

    modal.style.display = 'flex';
}

/**
 * パスワード変更モーダルを閉じる
 */
function closePasswordChangeModal() {
    const modal = document.getElementById('password-change-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * パスワードを変更
 */
async function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorDiv = document.getElementById('password-error');

    // バリデーション
    if (!currentPassword || !newPassword || !confirmPassword) {
        errorDiv.textContent = 'すべてのフィールドを入力してください';
        errorDiv.style.display = 'block';
        return;
    }

    if (newPassword.length < 10) {
        errorDiv.textContent = 'パスワードは10文字以上で入力してください';
        errorDiv.style.display = 'block';
        return;
    }

    if (newPassword !== confirmPassword) {
        errorDiv.textContent = '新しいパスワードが一致しません';
        errorDiv.style.display = 'block';
        return;
    }

    if (currentPassword === newPassword) {
        errorDiv.textContent = '新しいパスワードは現在のパスワードと異なるものにしてください';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        // 現在のパスワードで再認証
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: currentPassword
        });

        if (signInError) {
            errorDiv.textContent = '現在のパスワードが正しくありません';
            errorDiv.style.display = 'block';
            return;
        }

        // パスワードを更新
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (updateError) throw updateError;

        // password_changedフラグを更新
        const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ password_changed: true })
            .eq('user_id', currentUser.id);

        if (profileError) throw profileError;

        // プロフィールを再読み込み
        currentProfile.password_changed = true;

        // 警告バナーを削除
        const warningBanner = document.getElementById('password-warning-banner');
        if (warningBanner) {
            warningBanner.remove();
        }

        showToast('パスワードを変更しました', 'success');
        closePasswordChangeModal();
    } catch (error) {
        console.error('パスワード変更エラー:', error);
        errorDiv.textContent = 'パスワードの変更に失敗しました';
        errorDiv.style.display = 'block';
    }
}

/**
 * パスワード強度をチェック
 */
function checkPasswordStrength() {
    const password = document.getElementById('new-password').value;
    const strengthDiv = document.getElementById('password-strength');

    if (!strengthDiv) return;

    if (password.length === 0) {
        strengthDiv.style.display = 'none';
        return;
    }

    let strength = 0;
    let feedback = [];

    // 長さチェック
    if (password.length >= 10) strength++;
    if (password.length >= 14) strength++;

    // 文字種チェック
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    // フィードバック
    if (password.length < 10) {
        feedback.push('10文字以上必要です');
    }
    if (!/[a-z]/.test(password)) {
        feedback.push('小文字を含めることを推奨');
    }
    if (!/[A-Z]/.test(password)) {
        feedback.push('大文字を含めることを推奨');
    }
    if (!/[0-9]/.test(password)) {
        feedback.push('数字を含めることを推奨');
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
        feedback.push('記号を含めることを推奨');
    }

    // 強度表示
    strengthDiv.style.display = 'block';
    strengthDiv.className = 'password-strength';

    if (strength <= 2) {
        strengthDiv.classList.add('weak');
        strengthDiv.textContent = '弱い: ' + feedback.join(', ');
    } else if (strength <= 4) {
        strengthDiv.classList.add('medium');
        strengthDiv.textContent = '普通: ' + feedback.join(', ');
    } else {
        strengthDiv.classList.add('strong');
        strengthDiv.textContent = '強い';
    }
}
