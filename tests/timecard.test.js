/**
 * 勤務時間管理モジュール テスト
 * 
 * このファイルはtimecard.jsの機能をテストする
 */

// テスト用のモック関数
const getSupabaseClient = () => ({
    from: () => ({
        select: () => ({
            eq: () => ({
                eq: () => ({
                    eq: () => ({
                        single: () => Promise.resolve({ data: null, error: null })
                    }),
                    single: () => Promise.resolve({ data: null, error: null })
                }),
                single: () => Promise.resolve({ data: null, error: null })
            })
        }),
        insert: () => Promise.resolve({ error: null }),
        update: () => ({
            eq: () => Promise.resolve({ error: null })
        })
    })
});

// グローバルにモック関数を設定
if (typeof window === 'undefined') {
    global.getSupabaseClient = getSupabaseClient;
}

// テスト対象の関数をロード
const {
    timeToMinutes,
    minutesToTimeString,
    calculateBreakTime,
    calculateWorkTime,
    calculateOvertime,
    calculateNightOvertime,
    calculateLateTime,
    calculateEarlyLeaveTime,
    getDaysInMonth,
    getDayOfWeek,
    isWeekend,
    getWorkTypeLabel,
    getLeaveTypeLabel,
    getPatternFromSettings
} = require('../js/timecard.js');

/**
 * テストユーティリティ
 */
class TestRunner {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.errors = [];
    }
    
    /**
     * テストを実行する
     * @param {string} name - テスト名
     * @param {Function} testFn - テスト関数
     */
    test(name, testFn) {
        try {
            testFn();
            this.passed++;
            console.log(`✓ ${name}`);
        } catch (error) {
            this.failed++;
            this.errors.push({ name, error });
            console.log(`✗ ${name}`);
            console.log(`  Error: ${error.message}`);
        }
    }
    
    /**
     * 等価性を検証する
     * @param {*} actual - 実際の値
     * @param {*} expected - 期待値
     * @param {string} message - エラーメッセージ
     */
    assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`${message} Expected: ${expected}, Actual: ${actual}`);
        }
    }
    
    /**
     * オブジェクトの等価性を検証する
     * @param {Object} actual - 実際の値
     * @param {Object} expected - 期待値
     * @param {string} message - エラーメッセージ
     */
    assertDeepEqual(actual, expected, message = '') {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
            throw new Error(`${message} Expected: ${expectedStr}, Actual: ${actualStr}`);
        }
    }
    
    /**
     * 真偽値を検証する
     * @param {boolean} condition - 条件
     * @param {string} message - エラーメッセージ
     */
    assertTrue(condition, message = '') {
        if (!condition) {
            throw new Error(message || 'Expected true but got false');
        }
    }
    
    /**
     * テスト結果を表示する
     */
    summary() {
        console.log('\n-------------------');
        console.log(`Tests: ${this.passed + this.failed}`);
        console.log(`Passed: ${this.passed}`);
        console.log(`Failed: ${this.failed}`);
        
        if (this.errors.length > 0) {
            console.log('\nFailed tests:');
            this.errors.forEach(({ name, error }) => {
                console.log(`  - ${name}: ${error.message}`);
            });
        }
        
        return this.failed === 0;
    }
}

// テスト実行
const runner = new TestRunner();

console.log('=== timeToMinutes テスト ===');

runner.test('timeToMinutes: 通常の時刻を変換', () => {
    runner.assertEqual(timeToMinutes('09:00'), 540);
    runner.assertEqual(timeToMinutes('18:00'), 1080);
    runner.assertEqual(timeToMinutes('12:30'), 750);
});

runner.test('timeToMinutes: 深夜時刻を変換', () => {
    runner.assertEqual(timeToMinutes('22:00'), 1320);
    runner.assertEqual(timeToMinutes('23:59'), 1439);
    runner.assertEqual(timeToMinutes('00:00'), 0);
});

runner.test('timeToMinutes: 空文字列は0を返す', () => {
    runner.assertEqual(timeToMinutes(''), 0);
    runner.assertEqual(timeToMinutes(null), 0);
    runner.assertEqual(timeToMinutes(undefined), 0);
});

console.log('\n=== minutesToTimeString テスト ===');

runner.test('minutesToTimeString: 分を時間文字列に変換', () => {
    runner.assertEqual(minutesToTimeString(540), '9:00');
    runner.assertEqual(minutesToTimeString(1080), '18:00');
    runner.assertEqual(minutesToTimeString(750), '12:30');
});

runner.test('minutesToTimeString: 0分は0:00を返す', () => {
    runner.assertEqual(minutesToTimeString(0), '0:00');
});

runner.test('minutesToTimeString: 負の値は0:00を返す', () => {
    runner.assertEqual(minutesToTimeString(-30), '0:00');
});

console.log('\n=== calculateBreakTime テスト ===');

runner.test('calculateBreakTime: 1つの休憩時間を計算', () => {
    const pattern = {
        break1_start: '12:00',
        break1_end: '13:00',
        break2_start: null,
        break2_end: null,
        break3_start: null,
        break3_end: null
    };
    runner.assertEqual(calculateBreakTime(pattern), 60);
});

runner.test('calculateBreakTime: 複数の休憩時間を計算', () => {
    const pattern = {
        break1_start: '12:00',
        break1_end: '13:00',
        break2_start: '15:00',
        break2_end: '15:15',
        break3_start: null,
        break3_end: null
    };
    runner.assertEqual(calculateBreakTime(pattern), 75);
});

runner.test('calculateBreakTime: 休憩なしは0を返す', () => {
    const pattern = {
        break1_start: null,
        break1_end: null,
        break2_start: null,
        break2_end: null,
        break3_start: null,
        break3_end: null
    };
    runner.assertEqual(calculateBreakTime(pattern), 0);
});

console.log('\n=== calculateWorkTime テスト ===');

runner.test('calculateWorkTime: 通常の労働時間を計算', () => {
    const pattern = {
        break1_start: '12:00',
        break1_end: '13:00',
        break2_start: null,
        break2_end: null,
        break3_start: null,
        break3_end: null
    };
    // 9:00-18:00 - 1時間休憩 = 8時間 = 480分
    runner.assertEqual(calculateWorkTime('09:00', '18:00', pattern), 480);
});

runner.test('calculateWorkTime: 残業ありの労働時間を計算', () => {
    const pattern = {
        break1_start: '12:00',
        break1_end: '13:00',
        break2_start: null,
        break2_end: null,
        break3_start: null,
        break3_end: null
    };
    // 9:00-20:00 - 1時間休憩 = 10時間 = 600分
    runner.assertEqual(calculateWorkTime('09:00', '20:00', pattern), 600);
});

runner.test('calculateWorkTime: 時刻がない場合は0を返す', () => {
    const pattern = {
        break1_start: null,
        break1_end: null,
        break2_start: null,
        break2_end: null,
        break3_start: null,
        break3_end: null
    };
    runner.assertEqual(calculateWorkTime('', '18:00', pattern), 0);
    runner.assertEqual(calculateWorkTime('09:00', '', pattern), 0);
    runner.assertEqual(calculateWorkTime('', '', pattern), 0);
});

console.log('\n=== calculateOvertime テスト ===');

runner.test('calculateOvertime: 通常勤務で残業なし', () => {
    const result = calculateOvertime(480, 8, 'work');
    runner.assertEqual(result.total, 0);
    runner.assertEqual(result.normal, 0);
});

runner.test('calculateOvertime: 通常勤務で残業あり', () => {
    const result = calculateOvertime(600, 8, 'work');
    runner.assertEqual(result.total, 120);
    runner.assertEqual(result.normal, 120);
});

runner.test('calculateOvertime: 法定休日出勤', () => {
    const result = calculateOvertime(480, 8, 'legal-holiday');
    runner.assertEqual(result.total, 480);
    runner.assertEqual(result.legalHoliday, 480);
    runner.assertEqual(result.normal, 0);
});

runner.test('calculateOvertime: 法定外休日出勤', () => {
    const result = calculateOvertime(360, 8, 'extra-holiday');
    runner.assertEqual(result.total, 360);
    runner.assertEqual(result.extraHoliday, 360);
    runner.assertEqual(result.normal, 0);
});

console.log('\n=== calculateLateTime テスト ===');

runner.test('calculateLateTime: 遅刻時間を計算', () => {
    runner.assertEqual(calculateLateTime('09:30', '09:00'), 30);
    runner.assertEqual(calculateLateTime('10:00', '09:00'), 60);
});

runner.test('calculateLateTime: 遅刻なし', () => {
    runner.assertEqual(calculateLateTime('09:00', '09:00'), 0);
    runner.assertEqual(calculateLateTime('08:50', '09:00'), 0);
});

runner.test('calculateLateTime: 時刻がない場合は0を返す', () => {
    runner.assertEqual(calculateLateTime('', '09:00'), 0);
    runner.assertEqual(calculateLateTime('09:30', ''), 0);
});

console.log('\n=== calculateEarlyLeaveTime テスト ===');

runner.test('calculateEarlyLeaveTime: 早退時間を計算', () => {
    runner.assertEqual(calculateEarlyLeaveTime('17:30', '18:00'), 30);
    runner.assertEqual(calculateEarlyLeaveTime('17:00', '18:00'), 60);
});

runner.test('calculateEarlyLeaveTime: 早退なし', () => {
    runner.assertEqual(calculateEarlyLeaveTime('18:00', '18:00'), 0);
    runner.assertEqual(calculateEarlyLeaveTime('18:30', '18:00'), 0);
});

runner.test('calculateEarlyLeaveTime: 時刻がない場合は0を返す', () => {
    runner.assertEqual(calculateEarlyLeaveTime('', '18:00'), 0);
    runner.assertEqual(calculateEarlyLeaveTime('17:30', ''), 0);
});

console.log('\n=== getDaysInMonth テスト ===');

runner.test('getDaysInMonth: 各月の日数を取得', () => {
    runner.assertEqual(getDaysInMonth(2024, 1), 31);
    runner.assertEqual(getDaysInMonth(2024, 2), 29); // うるう年
    runner.assertEqual(getDaysInMonth(2023, 2), 28); // 通常年
    runner.assertEqual(getDaysInMonth(2024, 4), 30);
    runner.assertEqual(getDaysInMonth(2024, 12), 31);
});

console.log('\n=== getDayOfWeek テスト ===');

runner.test('getDayOfWeek: 曜日を取得', () => {
    // 2024年1月1日は月曜日
    runner.assertEqual(getDayOfWeek(2024, 1, 1), '月');
    // 2024年1月7日は日曜日
    runner.assertEqual(getDayOfWeek(2024, 1, 7), '日');
    // 2024年1月6日は土曜日
    runner.assertEqual(getDayOfWeek(2024, 1, 6), '土');
});

console.log('\n=== isWeekend テスト ===');

runner.test('isWeekend: 土曜日を判定', () => {
    const result = isWeekend(2024, 1, 6);
    runner.assertTrue(result.isSaturday);
    runner.assertTrue(!result.isSunday);
});

runner.test('isWeekend: 日曜日を判定', () => {
    const result = isWeekend(2024, 1, 7);
    runner.assertTrue(!result.isSaturday);
    runner.assertTrue(result.isSunday);
});

runner.test('isWeekend: 平日を判定', () => {
    const result = isWeekend(2024, 1, 8); // 月曜日
    runner.assertTrue(!result.isSaturday);
    runner.assertTrue(!result.isSunday);
});

console.log('\n=== getWorkTypeLabel テスト ===');

runner.test('getWorkTypeLabel: 勤務種類ラベルを取得', () => {
    runner.assertEqual(getWorkTypeLabel('work'), '出勤');
    runner.assertEqual(getWorkTypeLabel('remote'), '出勤（リモート）');
    runner.assertEqual(getWorkTypeLabel('late'), '遅刻');
    runner.assertEqual(getWorkTypeLabel('early-leave'), '早退');
    runner.assertEqual(getWorkTypeLabel('late-early'), '遅刻＋早退');
    runner.assertEqual(getWorkTypeLabel('legal-holiday'), '休日（法定）');
    runner.assertEqual(getWorkTypeLabel('extra-holiday'), '休日（法定外）');
});

runner.test('getWorkTypeLabel: 未定義は空文字を返す', () => {
    runner.assertEqual(getWorkTypeLabel('unknown'), '');
    runner.assertEqual(getWorkTypeLabel(''), '');
    runner.assertEqual(getWorkTypeLabel(null), '');
});

console.log('\n=== getLeaveTypeLabel テスト ===');

runner.test('getLeaveTypeLabel: 休暇種類ラベルを取得', () => {
    runner.assertEqual(getLeaveTypeLabel('paid'), '有休');
    runner.assertEqual(getLeaveTypeLabel('absent'), '欠勤');
    runner.assertEqual(getLeaveTypeLabel('special'), '特休');
    runner.assertEqual(getLeaveTypeLabel('congratulation'), '慶弔');
});

runner.test('getLeaveTypeLabel: 未定義は空文字を返す', () => {
    runner.assertEqual(getLeaveTypeLabel('unknown'), '');
    runner.assertEqual(getLeaveTypeLabel(''), '');
    runner.assertEqual(getLeaveTypeLabel(null), '');
});

console.log('\n=== getPatternFromSettings テスト ===');

runner.test('getPatternFromSettings: 設定からパターンを取得', () => {
    const settings = {
        pattern1_start: '09:00',
        pattern1_end: '18:00',
        pattern1_break1_start: '12:00',
        pattern1_break1_end: '13:00',
        pattern1_break2_start: null,
        pattern1_break2_end: null,
        pattern1_break3_start: null,
        pattern1_break3_end: null
    };
    
    const pattern = getPatternFromSettings(settings, 1);
    runner.assertEqual(pattern.start, '09:00');
    runner.assertEqual(pattern.end, '18:00');
    runner.assertEqual(pattern.break1_start, '12:00');
    runner.assertEqual(pattern.break1_end, '13:00');
});

runner.test('getPatternFromSettings: 設定がない場合はデフォルト値を返す', () => {
    const pattern = getPatternFromSettings(null, 1);
    runner.assertEqual(pattern.start, '09:00');
    runner.assertEqual(pattern.end, '18:00');
});

// テスト結果のサマリー
const success = runner.summary();

// 終了コード（CI環境では終了コードで結果を判定）
if (typeof process !== 'undefined' && process.exit) {
    process.exit(success ? 0 : 1);
}
