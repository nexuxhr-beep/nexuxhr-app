-- NexuxHR Phase 6 Attendance Management
CREATE TABLE IF NOT EXISTS attendance_shifts (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, company_id BIGINT UNSIGNED NOT NULL,
 name VARCHAR(100) NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
 is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX(company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS attendance_policies (
 company_id BIGINT UNSIGNED PRIMARY KEY, required_hours DECIMAL(4,2) NOT NULL DEFAULT 8,
 half_day_hours DECIMAL(4,2) NOT NULL DEFAULT 4, sandwich_leave TINYINT(1) NOT NULL DEFAULT 1,
 calendar_type VARCHAR(10) NOT NULL DEFAULT 'BS', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS attendance_corrections (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, company_id BIGINT UNSIGNED NOT NULL,
 user_id BIGINT UNSIGNED NOT NULL, attendance_date DATE NOT NULL, reason TEXT NOT NULL,
 status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending', review_note TEXT NULL,
 reviewed_by BIGINT UNSIGNED NULL, reviewed_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX(company_id,attendance_date), INDEX(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS attendance_month_locks (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, company_id BIGINT UNSIGNED NOT NULL,
 month_key CHAR(7) NOT NULL, locked_by BIGINT UNSIGNED NOT NULL, locked_at DATETIME NOT NULL,
 UNIQUE KEY uniq_company_month(company_id,month_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO attendance_shifts(company_id,name,start_time,end_time)
SELECT id,'7 AM – 3 PM','07:00:00','15:00:00' FROM companies WHERE NOT EXISTS(SELECT 1 FROM attendance_shifts s WHERE s.company_id=companies.id);
INSERT INTO attendance_shifts(company_id,name,start_time,end_time)
SELECT id,'8 AM – 4 PM','08:00:00','16:00:00' FROM companies;
INSERT INTO attendance_shifts(company_id,name,start_time,end_time)
SELECT id,'9 AM – 5 PM','09:00:00','17:00:00' FROM companies;
INSERT INTO attendance_shifts(company_id,name,start_time,end_time)
SELECT id,'10 AM – 6 PM','10:00:00','18:00:00' FROM companies;
