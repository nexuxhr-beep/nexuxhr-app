-- =============================================================
-- NexuxHR Phase 2 Migration
-- Run ONCE in phpMyAdmin after migration_multitenant.sql and
-- migration_assets.sql. Back up the database before running.
-- =============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  notes TEXT NULL,
  status ENUM('not_started','in_progress','completed','overdue') NOT NULL DEFAULT 'not_started',
  priority ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
  due_date DATE NOT NULL,
  assigned_to_user_id BIGINT UNSIGNED NOT NULL,
  assigned_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tasks_company_status (company_id, status),
  INDEX idx_tasks_assignee (assigned_to_user_id, due_date),
  CONSTRAINT fk_task_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_assignee FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_assigner FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  request_type ENUM(
    'Leave','Salary Slip','Appointment','Attendance Correction',
    'Asset Issue / Repair','Employment Letter','Document Request',
    'Work From Home','Reimbursement','Other'
  ) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  amount DECIMAL(12,2) NULL,
  status ENUM('Pending','In Progress','Approved','Rejected','Completed') NOT NULL DEFAULT 'Pending',
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  review_comment VARCHAR(1000) NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_requests_company_status (company_id, status),
  INDEX idx_requests_user (user_id, submitted_at),
  CONSTRAINT fk_request_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_request_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_request_reviewer FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  notification_type ENUM('task','request','attendance','notice','system') NOT NULL DEFAULT 'system',
  entity_type VARCHAR(40) NULL,
  entity_id BIGINT UNSIGNED NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user_read (user_id, is_read, created_at),
  INDEX idx_notifications_company (company_id, created_at),
  CONSTRAINT fk_notification_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  check_in TIME NULL,
  check_out TIME NULL,
  status ENUM('Present','Absent','Late','Half Day','On Leave') NOT NULL DEFAULT 'Present',
  work_hours DECIMAL(5,2) NULL,
  notes VARCHAR(500) NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_user_date (user_id, attendance_date),
  INDEX idx_attendance_company_date (company_id, attendance_date),
  CONSTRAINT fk_attendance_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
