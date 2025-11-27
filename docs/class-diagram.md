# クラス図

勤務月報システムのクラス構造を示します。

```mermaid
classDiagram
    %% エンティティクラス
    class User {
        +String id
        +String email
        +String password
        +login()
        +logout()
    }
    
    class UserProfile {
        +String id
        +String user_id
        +String email
        +String name
        +String department
        +Boolean is_approver
        +Boolean is_admin
        +DateTime created_at
        +DateTime updated_at
    }
    
    class MonthlySettings {
        +String id
        +String user_id
        +Integer year
        +Integer month
        +String name
        +String department
        +Decimal standard_hours
        +WorkPattern pattern1
        +WorkPattern pattern2
        +WorkPattern pattern3
        +DateTime created_at
        +DateTime updated_at
    }
    
    class WorkPattern {
        +Time start
        +Time end
        +Break break1
        +Break break2
        +Break break3
    }
    
    class Break {
        +Time start
        +Time end
    }
    
    class DailyRecord {
        +String id
        +String user_id
        +Date work_date
        +String work_type
        +Time start_time
        +Time end_time
        +Integer late_time
        +Integer early_leave_time
        +Integer overtime
        +Integer night_overtime
        +String leave_type
        +Integer work_pattern
        +String note
        +DateTime created_at
        +DateTime updated_at
    }
    
    class Approval {
        +String id
        +String user_id
        +Integer year
        +Integer month
        +String status
        +DateTime requested_at
        +String approved_by
        +DateTime approved_at
        +String rejection_reason
        +DateTime created_at
        +DateTime updated_at
    }
    
    %% モジュールクラス
    class AuthModule {
        +login(email, password)
        +logout()
        +checkSession()
        +getCurrentUser()
        +getUserProfile(userId)
        +checkUserPermissions(userId)
        +onAuthStateChange(callback)
    }
    
    class TimecardModule {
        +getMonthlySettings(userId, year, month)
        +saveMonthlySettings(settings)
        +getPreviousMonthSettings(userId, year, month)
        +getDailyRecords(userId, year, month)
        +saveDailyRecord(record)
        +calculateWorkTime(startTime, endTime, pattern)
        +calculateOvertime(workTime, standardHours, workType)
        +calculateNightOvertime(startTime, endTime, standardHours)
        +calculateLateTime(actualStart, scheduledStart)
        +calculateEarlyLeaveTime(actualEnd, scheduledEnd)
        +calculateMonthlySummary(records, settings)
        +generateCSV(records, settings, year, month)
    }
    
    class AdminModule {
        +getAllUsers()
        +createUser(userData)
        +updateUserProfile(userId, profileData)
        +deleteUser(userId)
        +updateUserPermissions(userId, isApprover, isAdmin)
        +getUserById(userId)
    }
    
    class ApprovalModule {
        +getApprovalStatus(userId, year, month)
        +requestApproval(userId, year, month)
        +getPendingApprovals()
        +getAllApprovals()
        +approve(approvalId, approverId)
        +reject(approvalId, approverId, reason)
        +cancelApproval(approvalId, approverId)
        +isMonthEditable(userId, year, month)
    }
    
    class AppModule {
        -User currentUser
        -UserProfile currentProfile
        -Integer currentYear
        -Integer currentMonth
        -MonthlySettings monthlySettings
        -DailyRecord[] dailyRecords
        -Boolean isEditable
        +initApp()
        +updateUserInfo()
        +updateMonthDisplay()
        +checkPermissions()
        +setupEventListeners()
        +changeMonth(delta)
        +switchTab(tabName)
        +loadMonthData()
        +renderTimecardTable()
        +updateSummary()
        +openDailyModal(day)
        +closeDailyModal()
        +exportToCSV()
        +submitApprovalRequest()
        +loadApprovalList()
        +loadUserList()
    }
    
    %% リレーションシップ
    User "1" -- "1" UserProfile : has
    User "1" -- "*" MonthlySettings : has
    User "1" -- "*" DailyRecord : has
    User "1" -- "*" Approval : requests
    MonthlySettings "1" -- "3" WorkPattern : contains
    WorkPattern "1" -- "3" Break : contains
    
    AuthModule ..> User : uses
    AuthModule ..> UserProfile : uses
    TimecardModule ..> MonthlySettings : uses
    TimecardModule ..> DailyRecord : uses
    AdminModule ..> UserProfile : uses
    ApprovalModule ..> Approval : uses
    
    AppModule ..> AuthModule : uses
    AppModule ..> TimecardModule : uses
    AppModule ..> AdminModule : uses
    AppModule ..> ApprovalModule : uses
```

## クラス説明

### エンティティクラス

| クラス名 | 説明 |
|---------|------|
| User | Supabase Authのユーザー情報 |
| UserProfile | ユーザーのプロフィール情報と権限 |
| MonthlySettings | 月間の勤務設定（勤務パターン、標準就労時間など） |
| WorkPattern | 勤務パターン（始業・終業時刻と休憩時間） |
| Break | 休憩時間（開始・終了時刻） |
| DailyRecord | 日毎の勤務記録 |
| Approval | 承認状態 |

### モジュールクラス

| クラス名 | 説明 |
|---------|------|
| AuthModule | 認証機能を提供 |
| TimecardModule | 勤務時間の入力・計算機能を提供 |
| AdminModule | ユーザー管理機能を提供 |
| ApprovalModule | 承認機能を提供 |
| AppModule | メインアプリケーションロジック |

### 権限レベル

```mermaid
classDiagram
    class Permission {
        <<enumeration>>
        GENERAL
        APPROVER
        ADMIN
    }
    
    class GeneralUser {
        +入力可能
        +閲覧可能
        +承認申請可能
        +CSVエクスポート可能
    }
    
    class Approver {
        +承認可能
        +却下可能
        +承認取消可能
        +全ユーザー閲覧可能
    }
    
    class Administrator {
        +ユーザー追加可能
        +ユーザー編集可能
        +ユーザー削除可能
        +権限変更可能
    }
    
    GeneralUser <|-- Approver : extends
    GeneralUser <|-- Administrator : extends
```
