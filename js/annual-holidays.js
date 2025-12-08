/**
 * 年間休日設定モジュール
 * 
 * 年間の休日（法定休日、法定外休日、土曜出勤日）を管理する
 */

let currentHolidayYear = new Date().getFullYear();
let annualHolidays = [];

/**
 * 年間休日設定を初期化
 */
async function initAnnualHolidays() {
    updateHolidayYearDisplay();
    await loadAnnualHolidays();
    renderAnnualCalendar();
}

/**
 * 年表示を更新
 */
function updateHolidayYearDisplay() {
    const yearDisplay = document.getElementById('holiday-year');
    if (yearDisplay) {
        yearDisplay.textContent = `${currentHolidayYear}年`;
    }
}

/**
 * 年間休日データを読み込む
 */
async function loadAnnualHolidays() {
    try {
        const { data, error } = await supabase
            .from('annual_holidays')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('year', currentHolidayYear)
            .order('holiday_date');

        if (error) throw error;
        annualHolidays = data || [];
    } catch (error) {
        console.error('年間休日の読み込みエラー:', error);
        showToast('年間休日の読み込みに失敗しました', 'error');
    }
}

/**
 * 年間カレンダーをレンダリング
 */
function renderAnnualCalendar() {
    const container = document.getElementById('annual-calendar');
    if (!container) return;

    container.innerHTML = '';

    // 12ヶ月分のカレンダーを生成
    for (let month = 1; month <= 12; month++) {
        const monthCard = createMonthCalendar(month);
        container.appendChild(monthCard);
    }
}

/**
 * 月別カレンダーを作成
 * @param {number} month - 月（1-12）
 * @returns {HTMLElement} カレンダー要素
 */
function createMonthCalendar(month) {
    const card = document.createElement('div');
    card.className = 'month-card';

    const header = document.createElement('div');
    header.className = 'month-header';
    header.textContent = `${month}月`;
    card.appendChild(header);

    const calendar = document.createElement('div');
    calendar.className = 'calendar-grid';

    // 曜日ヘッダー
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    weekdays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-weekday';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });

    // 月の最初の日と最後の日を取得
    const firstDay = new Date(currentHolidayYear, month - 1, 1);
    const lastDay = new Date(currentHolidayYear, month, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // 空白セルを追加
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendar.appendChild(emptyCell);
    }

    // 日付セルを追加
    for (let day = 1; day <= daysInMonth; day++) {
        const dateCell = createDateCell(currentHolidayYear, month, day);
        calendar.appendChild(dateCell);
    }

    card.appendChild(calendar);
    return card;
}

/**
 * 日付セルを作成
 * @param {number} year - 年
 * @param {number} month - 月
 * @param {number} day - 日
 * @returns {HTMLElement} 日付セル
 */
function createDateCell(year, month, day) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();

    // 日付番号
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);

    // 土日の背景色
    if (dayOfWeek === 0) {
        cell.classList.add('sunday');
    } else if (dayOfWeek === 6) {
        cell.classList.add('saturday');
    }

    // 休日設定を確認
    const holiday = annualHolidays.find(h => h.holiday_date === dateStr);
    if (holiday) {
        cell.classList.add('has-holiday');
        cell.classList.add(`holiday-${holiday.holiday_type}`);
        
        const holidayLabel = document.createElement('div');
        holidayLabel.className = 'holiday-label';
        holidayLabel.textContent = getHolidayTypeLabel(holiday.holiday_type);
        cell.appendChild(holidayLabel);
    }

    // クリックイベント
    cell.addEventListener('click', () => openHolidayDialog(dateStr, holiday));

    return cell;
}

/**
 * 休日タイプのラベルを取得
 * @param {string} type - 休日タイプ
 * @returns {string} ラベル
 */
function getHolidayTypeLabel(type) {
    const labels = {
        'legal-holiday': '法定',
        'extra-holiday': '法定外',
        'saturday-work': '土曜出勤'
    };
    return labels[type] || '';
}

/**
 * 休日設定ダイアログを開く
 * @param {string} dateStr - 日付文字列
 * @param {Object} holiday - 既存の休日設定
 */
function openHolidayDialog(dateStr, holiday) {
    const modal = document.getElementById('holiday-modal');
    const dateDisplay = document.getElementById('holiday-date');
    const typeSelect = document.getElementById('holiday-type');
    const noteInput = document.getElementById('holiday-note');
    const deleteBtn = document.getElementById('delete-holiday');

    if (!modal) return;

    dateDisplay.textContent = dateStr;
    document.getElementById('edit-holiday-date').value = dateStr;

    if (holiday) {
        typeSelect.value = holiday.holiday_type;
        noteInput.value = holiday.note || '';
        deleteBtn.style.display = 'inline-block';
    } else {
        typeSelect.value = '';
        noteInput.value = '';
        deleteBtn.style.display = 'none';
    }

    modal.style.display = 'flex';
}

/**
 * 休日設定ダイアログを閉じる
 */
function closeHolidayDialog() {
    const modal = document.getElementById('holiday-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 休日設定を保存
 */
async function saveHolidaySetting() {
    const dateStr = document.getElementById('edit-holiday-date').value;
    const type = document.getElementById('holiday-type').value;
    const note = document.getElementById('holiday-note').value;

    if (!type) {
        showToast('休日タイプを選択してください', 'error');
        return;
    }

    try {
        const { error } = await supabase
            .from('annual_holidays')
            .upsert({
                user_id: currentUser.id,
                year: currentHolidayYear,
                holiday_date: dateStr,
                holiday_type: type,
                note: note || null
            });

        if (error) throw error;

        showToast('休日設定を保存しました', 'success');
        closeHolidayDialog();
        await loadAnnualHolidays();
        renderAnnualCalendar();
    } catch (error) {
        console.error('休日設定の保存エラー:', error);
        showToast(`休日設定の保存に失敗しました: ${error.message}`, 'error');
    }
}

/**
 * 休日設定を削除
 */
async function deleteHolidaySetting() {
    const dateStr = document.getElementById('edit-holiday-date').value;

    if (!confirm('この休日設定を削除しますか？')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('annual_holidays')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('year', currentHolidayYear)
            .eq('holiday_date', dateStr);

        if (error) throw error;

        showToast('休日設定を削除しました', 'success');
        closeHolidayDialog();
        await loadAnnualHolidays();
        renderAnnualCalendar();
    } catch (error) {
        console.error('休日設定の削除エラー:', error);
        showToast('休日設定の削除に失敗しました', 'error');
    }
}

/**
 * 年を変更
 * @param {number} delta - 変更量
 */
async function changeHolidayYear(delta) {
    currentHolidayYear += delta;
    updateHolidayYearDisplay();
    await loadAnnualHolidays();
    renderAnnualCalendar();
}

/**
 * 指定日の休日設定を取得
 * @param {string} dateStr - 日付文字列
 * @returns {Object|null} 休日設定
 */
function getHolidayForDate(dateStr) {
    return annualHolidays.find(h => h.holiday_date === dateStr) || null;
}
