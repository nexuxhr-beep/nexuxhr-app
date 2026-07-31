-- NexuxHR Phase 7 — HR Leave Record sheet (manual entry by HR)
--
-- Distinct from `leave_requests`: that table is the employee-submitted approval
-- flow. This one is the register HR fills in by hand from the leave letters they
-- receive, and is what the Attendance Management > Leave Record tab reads.

CREATE TABLE IF NOT EXISTS leave_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,

  -- The 'Date' column of the sheet: when HR recorded the entry.
  record_date DATE NOT NULL,

  leave_type ENUM('Full Day','Half Day','Hourly') NOT NULL DEFAULT 'Full Day',
  leave_start DATE NOT NULL,
  leave_end DATE NOT NULL,
  reason TEXT NULL,
  letter_received ENUM('Yes','No') NOT NULL DEFAULT 'No',

  -- Auto-calculated on save from leave_type and the start/end span.
  leave_days DECIMAL(6,2) NOT NULL DEFAULT 0,

  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_company_record_date (company_id, record_date),
  INDEX idx_company_span (company_id, leave_start, leave_end),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Marks attendance rows that came from a biometric device import, so a re-import
-- can safely overwrite them while manual admin corrections are left alone.
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual' AFTER notes;

CREATE INDEX IF NOT EXISTS idx_attendance_company_date
  ON attendance_records (company_id, attendance_date);

-- NOTE: `IF NOT EXISTS` on ALTER/CREATE INDEX requires MariaDB 10.1.4+ (what most
-- cPanel hosts run). On stock MySQL 8 run these two instead, ignoring error 1060
-- (duplicate column) and 1061 (duplicate key) if the migration is re-applied:
--
--   ALTER TABLE attendance_records ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'manual' AFTER notes;
--   CREATE INDEX idx_attendance_company_date ON attendance_records (company_id, attendance_date);
