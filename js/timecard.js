/**
 * 勤務時間管理モジュール
 * 
 * このファイルは勤務時間の入力、計算、取得機能を提供する
 * 日毎の勤務記録と月間設定の管理を担当
 */

/**
 * 月間設定を取得する
 * @param {string} userId - ユーザーID
 * @param {number} year - 年
 * @param {number} month - 月
 * @returns {Object|null} 月間設定オブジェクトまたはnull
 */
async function getMonthlySettings(userId, year, month) {
    try {
        const client = getSupabaseClient();
        const { data, error } = await client
            .from('monthly_settings')
            .select('*')
            .eq('user_id', userId)
            .eq('year', year)
            .eq('month', month)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('月間設定取得エラー:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('月間設定取得エラー:', error);
        return null;
    }
}

/**
 * 月間設定を保存する
 * @param {Object} settings - 月間設定オブジェクト
 * @returns {Object} 結果オブジェクト {success: boolean, message: string}
 */
async function saveMonthlySettings(settings) {
    try {
        const client = getSupabaseClient();
        
        // 既存の設定を確認
        const { data: existing } = await client
            .from('monthly_settings')
            .select('id')
            .eq('user_id', settings.user_id)
            .eq('year', settings.year)
            .eq('month', settings.month)
            .single();
        
        let result;
        if (existing) {
            // 更新
            result = await client
                .from('monthly_settings')
                .update(settings)
                .eq('id', existing.id);
        } else {
            // 新規作成
            result = await client
                .from('monthly_settings')
                .insert(settings);
        }
        
        if (result.error) {
            return {
                success: false,
                message: result.error.message
            };
        }
        
        return {
            success: true,
            message: '設定を保存しました'
        };
    } catch (error) {
        return {
            success: false,
            message: '設定の保存に失敗しました: ' + error.message
        };
    }
}

/**
 * 前月の月間設定を取得する
 * @param {string} userId - ユーザーID
 * @param {number} year - 年
 * @param {number} month - 月
 * @returns {Object|null} 前月の月間設定オブジェクトまたはnull
 */
async function getPreviousMonthSettings(userId, year, month) {
    let prevYear = year;
    let prevMonth = month - 1;
    
    if (prevMonth < 1) {
        prevMonth = 12;
        prevYear -= 1;
    }
    
    return await getMonthlySettings(userId, prevYear, prevMonth);
}

/**
 * 日毎の勤務記録を取得する
 * @param {string} userId - ユーザーID
 * @param {number} year - 年
 * @param {number} month - 月
 * @returns {Array} 日毎の勤務記録配列
 */
async function getDailyRecords(userId, year, month) {
    try {
        const client = getSupabaseClient();
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0);
        const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
        
        const { data, error } = await client
            .from('daily_records')
            .select('*')
            .eq('user_id', userId)
            .gte('work_date', startDate)
            .lte('work_date', endDateStr)
            .order('work_date', { ascending: true });
        
        if (error) {
            console.error('日毎記録取得エラー:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('日毎記録取得エラー:', error);
        return [];
    }
}

/**
 * 日毎の勤務記録を保存する
 * @param {Object} record - 勤務記録オブジェクト
 * @returns {Object} 結果オブジェクト {success: boolean, message: string}
 */
async function saveDailyRecord(record) {
    try {
        const client = getSupabaseClient();
        
        // 既存の記録を確認
        const { data: existing } = await client
            .from('daily_records')
            .select('id')
            .eq('user_id', record.user_id)
            .eq('work_date', record.work_date)
            .single();
        
        let result;
        if (existing) {
            // 更新
            result = await client
                .from('daily_records')
                .update(record)
                .eq('id', existing.id);
        } else {
            // 新規作成
            result = await client
                .from('daily_records')
                .insert(record);
        }
        
        if (result.error) {
            return {
                success: false,
                message: result.error.message
            };
        }
        
        return {
            success: true,
            message: '保存しました'
        };
    } catch (error) {
        return {
            success: false,
            message: '保存に失敗しました: ' + error.message
        };
    }
}

/**
 * 時間文字列を分に変換する
 * @param {string} timeStr - 時間文字列 (HH:MM形式)
 * @returns {number} 分
 */
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * 分を時間文字列に変換する
 * @param {number} minutes - 分
 * @returns {string} 時間文字列 (H:MM形式)
 */
function minutesToTimeString(minutes) {
    if (minutes < 0) minutes = 0;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${String(mins).padStart(2, '0')}`;
}

/**
 * 休憩時間の合計を計算する
 * @param {Object} pattern - 勤務パターンオブジェクト
 * @returns {number} 休憩時間（分）
 */
function calculateBreakTime(pattern) {
    let totalBreak = 0;
    
    for (let i = 1; i <= 3; i++) {
        const breakStart = pattern[`break${i}_start`];
        const breakEnd = pattern[`break${i}_end`];
        
        if (breakStart && breakEnd) {
            totalBreak += timeToMinutes(breakEnd) - timeToMinutes(breakStart);
        }
    }
    
    return totalBreak;
}

/**
 * 労働時間を計算する
 * @param {string} startTime - 出勤時刻
 * @param {string} endTime - 退勤時刻
 * @param {Object} pattern - 勤務パターンオブジェクト
 * @returns {number} 労働時間（分）
 */
function calculateWorkTime(startTime, endTime, pattern) {
    if (!startTime || !endTime) return 0;
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const breakMinutes = calculateBreakTime(pattern);
    
    return endMinutes - startMinutes - breakMinutes;
}

/**
 * 残業時間を計算する
 * @param {number} workTime - 労働時間（分）
 * @param {number} standardHours - 標準就労時間（時間）
 * @param {string} workType - 勤務の種類
 * @returns {Object} 残業時間オブジェクト
 */
function calculateOvertime(workTime, standardHours, workType) {
    const standardMinutes = standardHours * 60;
    
    // 休日の場合は全て残業時間として計上
    if (workType === 'legal-holiday' || workType === 'extra-holiday') {
        return {
            total: workTime,
            normal: 0,
            night: 0,
            legalHoliday: workType === 'legal-holiday' ? workTime : 0,
            extraHoliday: workType === 'extra-holiday' ? workTime : 0
        };
    }
    
    const overtime = Math.max(0, workTime - standardMinutes);
    
    return {
        total: overtime,
        normal: overtime,
        night: 0,
        legalHoliday: 0,
        extraHoliday: 0
    };
}

/**
 * 深夜早朝の残業時間を計算する（22:00～5:00）
 * @param {string} startTime - 出勤時刻
 * @param {string} endTime - 退勤時刻
 * @param {number} standardHours - 標準就労時間（時間）
 * @returns {number} 深夜早朝残業時間（分）
 */
function calculateNightOvertime(startTime, endTime, standardHours) {
    if (!startTime || !endTime) return 0;
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    // 深夜早朝時間帯: 22:00(1320分) ～ 翌5:00(300分 + 1440分)
    const nightStart = 22 * 60; // 22:00
    const morningEnd = 5 * 60; // 5:00
    
    let nightMinutes = 0;
    
    // 22:00以降の勤務時間
    if (endMinutes > nightStart) {
        nightMinutes += Math.min(endMinutes, 24 * 60) - Math.max(startMinutes, nightStart);
    }
    
    // 5:00以前の勤務時間
    if (startMinutes < morningEnd) {
        nightMinutes += Math.min(endMinutes, morningEnd) - startMinutes;
    }
    
    return Math.max(0, nightMinutes);
}

/**
 * 遅刻時間を計算する
 * @param {string} actualStart - 実際の出勤時刻
 * @param {string} scheduledStart - 予定の出勤時刻
 * @returns {number} 遅刻時間（分）
 */
function calculateLateTime(actualStart, scheduledStart) {
    if (!actualStart || !scheduledStart) return 0;
    
    const actualMinutes = timeToMinutes(actualStart);
    const scheduledMinutes = timeToMinutes(scheduledStart);
    
    return Math.max(0, actualMinutes - scheduledMinutes);
}

/**
 * 早退時間を計算する
 * @param {string} actualEnd - 実際の退勤時刻
 * @param {string} scheduledEnd - 予定の退勤時刻
 * @returns {number} 早退時間（分）
 */
function calculateEarlyLeaveTime(actualEnd, scheduledEnd) {
    if (!actualEnd || !scheduledEnd) return 0;
    
    const actualMinutes = timeToMinutes(actualEnd);
    const scheduledMinutes = timeToMinutes(scheduledEnd);
    
    return Math.max(0, scheduledMinutes - actualMinutes);
}

/**
 * 月間集計を計算する
 * @param {Array} records - 日毎の勤務記録配列
 * @param {Object} settings - 月間設定
 * @returns {Object} 月間集計オブジェクト
 */
function calculateMonthlySummary(records, settings) {
    const summary = {
        workDays: 0,
        totalWorkMinutes: 0,
        totalOvertime: 0,
        nightOvertime: 0,
        legalHolidayOvertime: 0,
        extraHolidayOvertime: 0
    };
    
    const standardHours = settings?.standard_hours || 8;
    
    for (const record of records) {
        // 出勤日数カウント
        if (record.work_type && !['legal-holiday', 'extra-holiday'].includes(record.work_type)) {
            if (record.start_time && record.end_time) {
                summary.workDays++;
            }
        }
        
        // 労働時間計上
        if (record.start_time && record.end_time) {
            const pattern = getPatternFromSettings(settings, record.work_pattern || 1);
            const workTime = calculateWorkTime(record.start_time, record.end_time, pattern);
            summary.totalWorkMinutes += workTime;
        }
        
        // 残業時間計上
        if (record.overtime) {
            if (record.work_type === 'legal-holiday') {
                summary.legalHolidayOvertime += record.overtime;
            } else if (record.work_type === 'extra-holiday') {
                summary.extraHolidayOvertime += record.overtime;
            } else {
                summary.totalOvertime += record.overtime;
            }
        }
        
        // 深夜残業時間計上
        if (record.night_overtime) {
            summary.nightOvertime += record.night_overtime;
        }
    }
    
    return summary;
}

/**
 * 月間設定から勤務パターンを取得する
 * @param {Object} settings - 月間設定
 * @param {number} patternNumber - パターン番号 (1-3)
 * @returns {Object} 勤務パターンオブジェクト
 */
function getPatternFromSettings(settings, patternNumber) {
    if (!settings) {
        return {
            start: '09:00',
            end: '18:00',
            break1_start: '12:00',
            break1_end: '13:00',
            break2_start: null,
            break2_end: null,
            break3_start: null,
            break3_end: null
        };
    }
    
    const prefix = `pattern${patternNumber}_`;
    
    return {
        start: settings[`${prefix}start`] || '09:00',
        end: settings[`${prefix}end`] || '18:00',
        break1_start: settings[`${prefix}break1_start`],
        break1_end: settings[`${prefix}break1_end`],
        break2_start: settings[`${prefix}break2_start`],
        break2_end: settings[`${prefix}break2_end`],
        break3_start: settings[`${prefix}break3_start`],
        break3_end: settings[`${prefix}break3_end`]
    };
}

/**
 * 月の日数を取得する
 * @param {number} year - 年
 * @param {number} month - 月
 * @returns {number} 日数
 */
function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

/**
 * 曜日を取得する
 * @param {number} year - 年
 * @param {number} month - 月
 * @param {number} day - 日
 * @returns {string} 曜日
 */
function getDayOfWeek(year, month, day) {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const date = new Date(year, month - 1, day);
    return days[date.getDay()];
}

/**
 * 日付が週末かどうかを判定する
 * @param {number} year - 年
 * @param {number} month - 月
 * @param {number} day - 日
 * @returns {Object} {isSaturday: boolean, isSunday: boolean}
 */
function isWeekend(year, month, day) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    return {
        isSaturday: dayOfWeek === 6,
        isSunday: dayOfWeek === 0
    };
}

/**
 * CSVエクスポート用データを生成する
 * @param {Array} records - 日毎の勤務記録配列
 * @param {Object} settings - 月間設定
 * @param {number} year - 年
 * @param {number} month - 月
 * @returns {string} CSV文字列
 */
function generateCSV(records, settings, year, month) {
    const headers = [
        '日付', '曜日', '勤務種類', '出勤時刻', '退勤時刻',
        '遅刻時間', '早退時間', '残業時間', '深夜残業', '休暇種類', '補足'
    ];
    
    const daysInMonth = getDaysInMonth(year, month);
    const recordMap = {};
    
    // 記録をマップに変換
    for (const record of records) {
        const day = new Date(record.work_date).getDate();
        recordMap[day] = record;
    }
    
    const rows = [headers.join(',')];
    
    for (let day = 1; day <= daysInMonth; day++) {
        const record = recordMap[day] || {};
        const dayOfWeek = getDayOfWeek(year, month, day);
        
        const row = [
            `${year}/${month}/${day}`,
            dayOfWeek,
            getWorkTypeLabel(record.work_type),
            record.start_time || '',
            record.end_time || '',
            record.late_time ? `${record.late_time}分` : '',
            record.early_leave_time ? `${record.early_leave_time}分` : '',
            record.overtime ? `${record.overtime}分` : '',
            record.night_overtime ? `${record.night_overtime}分` : '',
            getLeaveTypeLabel(record.leave_type),
            `"${(record.note || '').replace(/"/g, '""')}"`
        ];
        
        rows.push(row.join(','));
    }
    
    return rows.join('\n');
}

/**
 * 勤務種類のラベルを取得する
 * @param {string} workType - 勤務種類コード
 * @returns {string} 勤務種類ラベル
 */
function getWorkTypeLabel(workType) {
    const labels = {
        'work': '出勤',
        'remote': '出勤（リモート）',
        'late': '遅刻',
        'early-leave': '早退',
        'late-early': '遅刻＋早退',
        'legal-holiday': '休日（法定）',
        'extra-holiday': '休日（法定外）'
    };
    return labels[workType] || '';
}

/**
 * 休暇種類のラベルを取得する
 * @param {string} leaveType - 休暇種類コード
 * @returns {string} 休暇種類ラベル
 */
function getLeaveTypeLabel(leaveType) {
    const labels = {
        'paid': '有休',
        'absent': '欠勤',
        'special': '特休',
        'congratulation': '慶弔'
    };
    return labels[leaveType] || '';
}

// モジュールエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getMonthlySettings,
        saveMonthlySettings,
        getPreviousMonthSettings,
        getDailyRecords,
        saveDailyRecord,
        timeToMinutes,
        minutesToTimeString,
        calculateBreakTime,
        calculateWorkTime,
        calculateOvertime,
        calculateNightOvertime,
        calculateLateTime,
        calculateEarlyLeaveTime,
        calculateMonthlySummary,
        getPatternFromSettings,
        getDaysInMonth,
        getDayOfWeek,
        isWeekend,
        generateCSV,
        getWorkTypeLabel,
        getLeaveTypeLabel
    };
}
