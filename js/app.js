/**
 * メインアプリケーションモジュール
 * 
 * このファイルはダッシュボードページのメインロジックを提供する
 * 初期化、イベントハンドリング、UI更新を担当
 */

// グローバル状態
let currentUser = null;
let currentProfile = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let monthlySettings = null;
let dailyRecords = [];
let isEditable = true;

/**
 * アプリケーション初期化
 */
async function initApp() {
    // セッション確認
    const session = await checkSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    
    // ユーザー情報取得
    currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    // プロフィール取得
    currentProfile = await getUserProfile(currentUser.id);
    
    // UI初期化
    updateUserInfo();
    updateMonthDisplay();
    setupEventListeners();
    await checkPermissions();
    await loadMonthData();
}

/**
 * ユーザー情報を表示に反映する
 */
function updateUserInfo() {
    const userInfoEl = document.getElementById('user-info');
    if (userInfoEl && currentProfile) {
        userInfoEl.textContent = `${currentProfile.name || currentUser.email} さん`;
    }
}

/**
 * 月表示を更新する
 */
function updateMonthDisplay() {
    const monthEl = document.getElementById('current-month');
    if (monthEl) {
        monthEl.textContent = `${currentYear}年${currentMonth}月`;
    }
}

/**
 * 権限に基づいてUIを更新する
 */
async function checkPermissions() {
    if (!currentProfile) return;
    
    // 承認タブ表示
    const approvalTab = document.getElementById('approval-tab');
    if (approvalTab && currentProfile.is_approver) {
        approvalTab.style.display = 'block';
    }
    
    // 管理タブ表示
    const adminTab = document.getElementById('admin-tab');
    if (adminTab && currentProfile.is_admin) {
        adminTab.style.display = 'block';
    }
}

/**
 * イベントリスナーを設定する
 */
function setupEventListeners() {
    // ログアウト
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await logout();
        window.location.href = 'index.html';
    });
    
    // 月切り替え
    document.getElementById('prev-month')?.addEventListener('click', () => {
        changeMonth(-1);
    });
    
    document.getElementById('next-month')?.addEventListener('click', () => {
        changeMonth(1);
    });
    
    // タブ切り替え
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });
    
    // 月間設定フォーム
    document.getElementById('monthly-settings-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveMonthlySettingsForm();
    });
    
    // 前月コピー
    document.getElementById('copy-previous')?.addEventListener('click', async () => {
        await copyPreviousMonthSettings();
    });
    
    // 日毎入力モーダル
    document.getElementById('close-daily-modal')?.addEventListener('click', closeDailyModal);
    document.getElementById('cancel-daily')?.addEventListener('click', closeDailyModal);
    
    document.getElementById('daily-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveDailyRecordForm();
    });
    
    // 勤務種類変更時のアラート表示
    document.getElementById('work-type')?.addEventListener('change', checkNoteAlert);
    document.getElementById('note')?.addEventListener('input', checkNoteAlert);
    
    // 出退勤時刻変更時の自動計算
    document.getElementById('start-time')?.addEventListener('change', calculateTimesFromInput);
    document.getElementById('end-time')?.addEventListener('change', calculateTimesFromInput);
    
    // CSV出力
    document.getElementById('export-csv')?.addEventListener('click', exportToCSV);
    
    // 承認申請
    document.getElementById('request-approval')?.addEventListener('click', async () => {
        await submitApprovalRequest();
    });
    
    // ユーザー管理モーダル
    document.getElementById('add-user-btn')?.addEventListener('click', () => {
        openUserModal();
    });
    
    document.getElementById('close-user-modal')?.addEventListener('click', closeUserModal);
    document.getElementById('cancel-user')?.addEventListener('click', closeUserModal);
    
    document.getElementById('user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveUserForm();
    });
}

/**
 * 月を変更する
 * @param {number} delta - 変更量（-1 または 1）
 */
async function changeMonth(delta) {
    currentMonth += delta;
    
    if (currentMonth < 1) {
        currentMonth = 12;
        currentYear -= 1;
    } else if (currentMonth > 12) {
        currentMonth = 1;
        currentYear += 1;
    }
    
    updateMonthDisplay();
    await loadMonthData();
}

/**
 * タブを切り替える
 * @param {string} tabName - タブ名
 */
function switchTab(tabName) {
    // タブボタン更新
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // タブコンテンツ更新
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeContent = document.getElementById(`${tabName}-tab-content`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
    
    // タブごとのデータ読み込み
    if (tabName === 'approval') {
        loadApprovalList();
    } else if (tabName === 'admin') {
        loadUserList();
    }
}

/**
 * 月のデータを読み込む
 */
async function loadMonthData() {
    if (!currentUser) return;
    
    // 月間設定取得
    monthlySettings = await getMonthlySettings(currentUser.id, currentYear, currentMonth);
    
    // 日毎記録取得
    dailyRecords = await getDailyRecords(currentUser.id, currentYear, currentMonth);
    
    // 承認状態確認
    isEditable = await isMonthEditable(currentUser.id, currentYear, currentMonth);
    
    // UI更新
    updateApprovalStatusDisplay();
    updateMonthlySettingsForm();
    renderTimecardTable();
    updateSummary();
}

/**
 * 承認状態表示を更新する
 */
async function updateApprovalStatusDisplay() {
    const statusEl = document.getElementById('approval-status');
    if (!statusEl) return;
    
    const approval = await getApprovalStatus(currentUser.id, currentYear, currentMonth);
    
    if (!approval || approval.status === 'draft') {
        statusEl.textContent = '';
        statusEl.className = 'approval-status';
    } else {
        statusEl.textContent = getApprovalStatusLabel(approval.status);
        statusEl.className = `approval-status ${getApprovalStatusClass(approval.status)}`;
    }
    
    // 承認済みの場合は承認申請ボタンを無効化
    const requestBtn = document.getElementById('request-approval');
    if (requestBtn) {
        requestBtn.disabled = !isEditable;
        requestBtn.textContent = isEditable ? '承認申請' : '承認済み';
    }
}

/**
 * 月間設定フォームを更新する
 */
function updateMonthlySettingsForm() {
    if (!monthlySettings && currentProfile) {
        // デフォルト値を設定
        document.getElementById('employee-name').value = currentProfile.name || '';
        document.getElementById('department').value = currentProfile.department || '';
        return;
    }
    
    if (!monthlySettings) return;
    
    // 基本情報
    document.getElementById('employee-name').value = monthlySettings.name || '';
    document.getElementById('department').value = monthlySettings.department || '';
    document.getElementById('standard-hours').value = monthlySettings.standard_hours || 8;
    
    // パターン1
    document.getElementById('pattern1-start').value = monthlySettings.pattern1_start || '09:00';
    document.getElementById('pattern1-end').value = monthlySettings.pattern1_end || '18:00';
    document.getElementById('pattern1-break1-start').value = monthlySettings.pattern1_break1_start || '12:00';
    document.getElementById('pattern1-break1-end').value = monthlySettings.pattern1_break1_end || '13:00';
    document.getElementById('pattern1-break2-start').value = monthlySettings.pattern1_break2_start || '';
    document.getElementById('pattern1-break2-end').value = monthlySettings.pattern1_break2_end || '';
    document.getElementById('pattern1-break3-start').value = monthlySettings.pattern1_break3_start || '';
    document.getElementById('pattern1-break3-end').value = monthlySettings.pattern1_break3_end || '';
    
    // パターン2
    document.getElementById('pattern2-start').value = monthlySettings.pattern2_start || '';
    document.getElementById('pattern2-end').value = monthlySettings.pattern2_end || '';
    document.getElementById('pattern2-break1-start').value = monthlySettings.pattern2_break1_start || '';
    document.getElementById('pattern2-break1-end').value = monthlySettings.pattern2_break1_end || '';
    document.getElementById('pattern2-break2-start').value = monthlySettings.pattern2_break2_start || '';
    document.getElementById('pattern2-break2-end').value = monthlySettings.pattern2_break2_end || '';
    document.getElementById('pattern2-break3-start').value = monthlySettings.pattern2_break3_start || '';
    document.getElementById('pattern2-break3-end').value = monthlySettings.pattern2_break3_end || '';
    
    // パターン3
    document.getElementById('pattern3-start').value = monthlySettings.pattern3_start || '';
    document.getElementById('pattern3-end').value = monthlySettings.pattern3_end || '';
    document.getElementById('pattern3-break1-start').value = monthlySettings.pattern3_break1_start || '';
    document.getElementById('pattern3-break1-end').value = monthlySettings.pattern3_break1_end || '';
    document.getElementById('pattern3-break2-start').value = monthlySettings.pattern3_break2_start || '';
    document.getElementById('pattern3-break2-end').value = monthlySettings.pattern3_break2_end || '';
    document.getElementById('pattern3-break3-start').value = monthlySettings.pattern3_break3_start || '';
    document.getElementById('pattern3-break3-end').value = monthlySettings.pattern3_break3_end || '';
}

/**
 * 月間設定フォームを保存する
 */
async function saveMonthlySettingsForm() {
    if (!isEditable) {
        showToast('承認済みのため編集できません', 'error');
        return;
    }
    
    const settings = {
        user_id: currentUser.id,
        year: currentYear,
        month: currentMonth,
        name: document.getElementById('employee-name').value,
        department: document.getElementById('department').value,
        standard_hours: parseFloat(document.getElementById('standard-hours').value) || 8,
        
        // パターン1
        pattern1_start: document.getElementById('pattern1-start').value || null,
        pattern1_end: document.getElementById('pattern1-end').value || null,
        pattern1_break1_start: document.getElementById('pattern1-break1-start').value || null,
        pattern1_break1_end: document.getElementById('pattern1-break1-end').value || null,
        pattern1_break2_start: document.getElementById('pattern1-break2-start').value || null,
        pattern1_break2_end: document.getElementById('pattern1-break2-end').value || null,
        pattern1_break3_start: document.getElementById('pattern1-break3-start').value || null,
        pattern1_break3_end: document.getElementById('pattern1-break3-end').value || null,
        
        // パターン2
        pattern2_start: document.getElementById('pattern2-start').value || null,
        pattern2_end: document.getElementById('pattern2-end').value || null,
        pattern2_break1_start: document.getElementById('pattern2-break1-start').value || null,
        pattern2_break1_end: document.getElementById('pattern2-break1-end').value || null,
        pattern2_break2_start: document.getElementById('pattern2-break2-start').value || null,
        pattern2_break2_end: document.getElementById('pattern2-break2-end').value || null,
        pattern2_break3_start: document.getElementById('pattern2-break3-start').value || null,
        pattern2_break3_end: document.getElementById('pattern2-break3-end').value || null,
        
        // パターン3
        pattern3_start: document.getElementById('pattern3-start').value || null,
        pattern3_end: document.getElementById('pattern3-end').value || null,
        pattern3_break1_start: document.getElementById('pattern3-break1-start').value || null,
        pattern3_break1_end: document.getElementById('pattern3-break1-end').value || null,
        pattern3_break2_start: document.getElementById('pattern3-break2-start').value || null,
        pattern3_break2_end: document.getElementById('pattern3-break2-end').value || null,
        pattern3_break3_start: document.getElementById('pattern3-break3-start').value || null,
        pattern3_break3_end: document.getElementById('pattern3-break3-end').value || null
    };
    
    const result = await saveMonthlySettings(settings);
    
    if (result.success) {
        showToast(result.message, 'success');
        monthlySettings = settings;
    } else {
        showToast(result.message, 'error');
    }
}

/**
 * 前月の設定をコピーする
 */
async function copyPreviousMonthSettings() {
    const prevSettings = await getPreviousMonthSettings(currentUser.id, currentYear, currentMonth);
    
    if (!prevSettings) {
        showToast('前月の設定がありません', 'info');
        return;
    }
    
    // フォームに反映
    document.getElementById('employee-name').value = prevSettings.name || '';
    document.getElementById('department').value = prevSettings.department || '';
    document.getElementById('standard-hours').value = prevSettings.standard_hours || 8;
    
    // パターン1-3をコピー
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`pattern${i}-start`).value = prevSettings[`pattern${i}_start`] || '';
        document.getElementById(`pattern${i}-end`).value = prevSettings[`pattern${i}_end`] || '';
        document.getElementById(`pattern${i}-break1-start`).value = prevSettings[`pattern${i}_break1_start`] || '';
        document.getElementById(`pattern${i}-break1-end`).value = prevSettings[`pattern${i}_break1_end`] || '';
        document.getElementById(`pattern${i}-break2-start`).value = prevSettings[`pattern${i}_break2_start`] || '';
        document.getElementById(`pattern${i}-break2-end`).value = prevSettings[`pattern${i}_break2_end`] || '';
        document.getElementById(`pattern${i}-break3-start`).value = prevSettings[`pattern${i}_break3_start`] || '';
        document.getElementById(`pattern${i}-break3-end`).value = prevSettings[`pattern${i}_break3_end`] || '';
    }
    
    showToast('前月の設定をコピーしました', 'success');
}

/**
 * 勤務表テーブルをレンダリングする
 */
function renderTimecardTable() {
    const tbody = document.getElementById('timecard-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const recordMap = {};
    
    // 記録をマップに変換
    for (const record of dailyRecords) {
        const day = new Date(record.work_date).getDate();
        recordMap[day] = record;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const record = recordMap[day] || {};
        const dayOfWeek = getDayOfWeek(currentYear, currentMonth, day);
        const weekend = isWeekend(currentYear, currentMonth, day);
        
        const tr = document.createElement('tr');
        
        // 週末のスタイル
        if (weekend.isSunday) {
            tr.classList.add('sunday');
        } else if (weekend.isSaturday) {
            tr.classList.add('saturday');
        }
        
        tr.innerHTML = `
            <td>${day}</td>
            <td>${dayOfWeek}</td>
            <td>${getWorkTypeLabel(record.work_type) || '-'}</td>
            <td>${record.start_time || '-'}</td>
            <td>${record.end_time || '-'}</td>
            <td>${record.late_time ? `${record.late_time}分` : '-'}</td>
            <td>${record.early_leave_time ? `${record.early_leave_time}分` : '-'}</td>
            <td>${record.overtime ? `${record.overtime}分` : '-'}</td>
            <td>${getLeaveTypeLabel(record.leave_type) || '-'}</td>
            <td>${record.note || '-'}</td>
            <td>パターン${record.work_pattern || 1}</td>
            <td>
                <button class="btn btn-small btn-primary edit-btn" data-day="${day}" ${!isEditable ? 'disabled' : ''}>
                    編集
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    }
    
    // 編集ボタンのイベント
    tbody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const day = parseInt(e.target.dataset.day);
            openDailyModal(day);
        });
    });
}

/**
 * 集計を更新する
 */
function updateSummary() {
    const summary = calculateMonthlySummary(dailyRecords, monthlySettings);
    
    document.getElementById('total-work-days').textContent = summary.workDays;
    document.getElementById('total-work-hours').textContent = minutesToTimeString(summary.totalWorkMinutes);
    document.getElementById('total-overtime').textContent = minutesToTimeString(summary.totalOvertime);
    document.getElementById('total-night-overtime').textContent = minutesToTimeString(summary.nightOvertime);
    document.getElementById('total-legal-holiday-overtime').textContent = minutesToTimeString(summary.legalHolidayOvertime);
    document.getElementById('total-extra-holiday-overtime').textContent = minutesToTimeString(summary.extraHolidayOvertime);
}

/**
 * 日毎入力モーダルを開く
 * @param {number} day - 日
 */
function openDailyModal(day) {
    const modal = document.getElementById('daily-modal');
    if (!modal) return;
    
    // 日付設定
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    document.getElementById('edit-date').value = dateStr;
    document.getElementById('modal-date').textContent = `${currentYear}年${currentMonth}月${day}日`;
    
    // 既存記録を取得
    const record = dailyRecords.find(r => {
        const recordDay = new Date(r.work_date).getDate();
        return recordDay === day;
    });
    
    if (record) {
        document.getElementById('work-type').value = record.work_type || 'work';
        document.getElementById('start-time').value = record.start_time || '';
        document.getElementById('end-time').value = record.end_time || '';
        document.getElementById('late-time').value = record.late_time || 0;
        document.getElementById('early-leave-time').value = record.early_leave_time || 0;
        document.getElementById('overtime').value = record.overtime || 0;
        document.getElementById('leave-type').value = record.leave_type || '';
        document.getElementById('work-pattern').value = record.work_pattern || 1;
        document.getElementById('note').value = record.note || '';
    } else {
        // デフォルト値
        document.getElementById('work-type').value = 'work';
        document.getElementById('start-time').value = monthlySettings?.pattern1_start || '09:00';
        document.getElementById('end-time').value = monthlySettings?.pattern1_end || '18:00';
        document.getElementById('late-time').value = 0;
        document.getElementById('early-leave-time').value = 0;
        document.getElementById('overtime').value = 0;
        document.getElementById('leave-type').value = '';
        document.getElementById('work-pattern').value = 1;
        document.getElementById('note').value = '';
    }
    
    checkNoteAlert();
    modal.style.display = 'flex';
}

/**
 * 日毎入力モーダルを閉じる
 */
function closeDailyModal() {
    const modal = document.getElementById('daily-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 補足欄アラートをチェックする
 */
function checkNoteAlert() {
    const workType = document.getElementById('work-type').value;
    const note = document.getElementById('note').value;
    const alertEl = document.getElementById('note-alert');
    
    if (!alertEl) return;
    
    // 出勤以外で補足欄が空の場合にアラート表示
    if (workType !== 'work' && workType !== 'remote' && !note.trim()) {
        alertEl.style.display = 'block';
    } else {
        alertEl.style.display = 'none';
    }
}

/**
 * 入力から時間を計算する
 */
function calculateTimesFromInput() {
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const workType = document.getElementById('work-type').value;
    const patternNum = parseInt(document.getElementById('work-pattern').value) || 1;
    
    if (!startTime || !endTime || !monthlySettings) return;
    
    const pattern = getPatternFromSettings(monthlySettings, patternNum);
    const standardHours = monthlySettings.standard_hours || 8;
    
    // 遅刻時間計算
    const lateTime = calculateLateTime(startTime, pattern.start);
    document.getElementById('late-time').value = lateTime;
    
    // 早退時間計算
    const earlyLeaveTime = calculateEarlyLeaveTime(endTime, pattern.end);
    document.getElementById('early-leave-time').value = earlyLeaveTime;
    
    // 労働時間計算
    const workTime = calculateWorkTime(startTime, endTime, pattern);
    
    // 残業時間計算
    const overtime = calculateOvertime(workTime, standardHours, workType);
    document.getElementById('overtime').value = overtime.total;
}

/**
 * 日毎記録フォームを保存する
 */
async function saveDailyRecordForm() {
    if (!isEditable) {
        showToast('承認済みのため編集できません', 'error');
        closeDailyModal();
        return;
    }
    
    const workDate = document.getElementById('edit-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const workType = document.getElementById('work-type').value;
    const patternNum = parseInt(document.getElementById('work-pattern').value) || 1;
    
    // 深夜残業時間計算
    let nightOvertime = 0;
    if (startTime && endTime) {
        nightOvertime = calculateNightOvertime(startTime, endTime, monthlySettings?.standard_hours || 8);
    }
    
    const record = {
        user_id: currentUser.id,
        work_date: workDate,
        work_type: workType,
        start_time: startTime || null,
        end_time: endTime || null,
        late_time: parseInt(document.getElementById('late-time').value) || 0,
        early_leave_time: parseInt(document.getElementById('early-leave-time').value) || 0,
        overtime: parseInt(document.getElementById('overtime').value) || 0,
        night_overtime: nightOvertime,
        leave_type: document.getElementById('leave-type').value || null,
        work_pattern: patternNum,
        note: document.getElementById('note').value || null
    };
    
    const result = await saveDailyRecord(record);
    
    if (result.success) {
        showToast(result.message, 'success');
        closeDailyModal();
        await loadMonthData();
    } else {
        showToast(result.message, 'error');
    }
}

/**
 * CSVエクスポート
 */
function exportToCSV() {
    const csv = generateCSV(dailyRecords, monthlySettings, currentYear, currentMonth);
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `勤務表_${currentYear}年${currentMonth}月.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('CSVを出力しました', 'success');
}

/**
 * 承認申請を送信する
 */
async function submitApprovalRequest() {
    if (!isEditable) {
        showToast('すでに承認されています', 'error');
        return;
    }
    
    if (!confirm(`${currentYear}年${currentMonth}月の承認申請を送信しますか？`)) {
        return;
    }
    
    const result = await requestApproval(currentUser.id, currentYear, currentMonth);
    
    if (result.success) {
        showToast(result.message, 'success');
        await loadMonthData();
    } else {
        showToast(result.message, 'error');
    }
}

/**
 * 承認リストを読み込む
 */
async function loadApprovalList() {
    const tbody = document.getElementById('approval-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5">読み込み中...</td></tr>';
    
    const approvals = await getAllApprovals();
    
    if (approvals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">承認データがありません</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    for (const approval of approvals) {
        const tr = document.createElement('tr');
        const userName = approval.user_profiles?.name || '不明';
        
        tr.innerHTML = `
            <td>${userName}</td>
            <td>${approval.year}年${approval.month}月</td>
            <td>${formatDate(approval.requested_at)}</td>
            <td>${getApprovalStatusLabel(approval.status)}</td>
            <td>
                ${approval.status === 'pending' ? `
                    <button class="btn btn-small btn-success approve-btn" data-id="${approval.id}">承認</button>
                    <button class="btn btn-small btn-danger reject-btn" data-id="${approval.id}">却下</button>
                ` : ''}
                ${approval.status === 'approved' ? `
                    <button class="btn btn-small btn-secondary cancel-approval-btn" data-id="${approval.id}">取消</button>
                ` : ''}
            </td>
        `;
        
        tbody.appendChild(tr);
    }
    
    // 承認ボタンイベント
    tbody.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (confirm('承認しますか？')) {
                const result = await approve(id, currentUser.id);
                showToast(result.message, result.success ? 'success' : 'error');
                await loadApprovalList();
            }
        });
    });
    
    // 却下ボタンイベント
    tbody.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            const reason = prompt('却下理由を入力してください:');
            if (reason !== null) {
                const result = await reject(id, currentUser.id, reason);
                showToast(result.message, result.success ? 'success' : 'error');
                await loadApprovalList();
            }
        });
    });
    
    // 取消ボタンイベント
    tbody.querySelectorAll('.cancel-approval-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (confirm('承認を取り消しますか？')) {
                const result = await cancelApproval(id, currentUser.id);
                showToast(result.message, result.success ? 'success' : 'error');
                await loadApprovalList();
            }
        });
    });
}

/**
 * ユーザーリストを読み込む
 */
async function loadUserList() {
    const tbody = document.getElementById('users-body');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6">読み込み中...</td></tr>';
    
    const users = await getAllUsers();
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">ユーザーがいません</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    for (const user of users) {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${user.email}</td>
            <td>${user.name || '-'}</td>
            <td>${user.department || '-'}</td>
            <td>${user.is_approver ? '○' : '-'}</td>
            <td>${user.is_admin ? '○' : '-'}</td>
            <td>
                <button class="btn btn-small btn-primary edit-user-btn" data-id="${user.user_id}">編集</button>
                <button class="btn btn-small btn-danger delete-user-btn" data-id="${user.user_id}">削除</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    }
    
    // 編集ボタンイベント
    tbody.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.id;
            const user = users.find(u => u.user_id === userId);
            if (user) {
                openUserModal(user);
            }
        });
    });
    
    // 削除ボタンイベント
    tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.id;
            if (confirm('このユーザーを削除しますか？')) {
                const result = await deleteUser(userId);
                showToast(result.message, result.success ? 'success' : 'error');
                await loadUserList();
            }
        });
    });
}

/**
 * ユーザーモーダルを開く
 * @param {Object} user - 編集対象ユーザー（新規の場合はnull）
 */
function openUserModal(user = null) {
    const modal = document.getElementById('user-modal');
    if (!modal) return;
    
    const title = document.getElementById('user-modal-title');
    const passwordGroup = document.getElementById('password-group');
    
    if (user) {
        title.textContent = 'ユーザー編集';
        document.getElementById('edit-user-id').value = user.user_id;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-email').disabled = true;
        document.getElementById('user-password').value = '';
        document.getElementById('user-password').required = false;
        passwordGroup.querySelector('label').textContent = 'パスワード（変更する場合のみ）';
        document.getElementById('user-name').value = user.name || '';
        document.getElementById('user-department').value = user.department || '';
        document.getElementById('is-approver').checked = user.is_approver || false;
        document.getElementById('is-admin').checked = user.is_admin || false;
    } else {
        title.textContent = 'ユーザー追加';
        document.getElementById('edit-user-id').value = '';
        document.getElementById('user-email').value = '';
        document.getElementById('user-email').disabled = false;
        document.getElementById('user-password').value = '';
        document.getElementById('user-password').required = true;
        passwordGroup.querySelector('label').textContent = 'パスワード';
        document.getElementById('user-name').value = '';
        document.getElementById('user-department').value = '';
        document.getElementById('is-approver').checked = false;
        document.getElementById('is-admin').checked = false;
    }
    
    modal.style.display = 'flex';
}

/**
 * ユーザーモーダルを閉じる
 */
function closeUserModal() {
    const modal = document.getElementById('user-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * ユーザーフォームを保存する
 */
async function saveUserForm() {
    const userId = document.getElementById('edit-user-id').value;
    
    if (userId) {
        // 更新
        const result = await updateUserProfile(userId, {
            name: document.getElementById('user-name').value,
            department: document.getElementById('user-department').value,
            isApprover: document.getElementById('is-approver').checked,
            isAdmin: document.getElementById('is-admin').checked
        });
        
        showToast(result.message, result.success ? 'success' : 'error');
        
        if (result.success) {
            closeUserModal();
            await loadUserList();
        }
    } else {
        // 新規作成
        const result = await createUser({
            email: document.getElementById('user-email').value,
            password: document.getElementById('user-password').value,
            name: document.getElementById('user-name').value,
            department: document.getElementById('user-department').value,
            isApprover: document.getElementById('is-approver').checked,
            isAdmin: document.getElementById('is-admin').checked
        });
        
        showToast(result.message, result.success ? 'success' : 'error');
        
        if (result.success) {
            closeUserModal();
            await loadUserList();
        }
    }
}

/**
 * 日付をフォーマットする
 * @param {string} dateStr - ISO形式の日付文字列
 * @returns {string} フォーマットされた日付
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * トースト通知を表示する
 * @param {string} message - メッセージ
 * @param {string} type - タイプ ('success', 'error', 'info')
 */
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', initApp);
