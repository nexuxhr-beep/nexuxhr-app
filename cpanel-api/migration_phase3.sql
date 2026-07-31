-- =============================================================
-- NexuxHR Phase 3 Migration
-- Run ONCE in phpMyAdmin after migration_phase2.sql.
-- Back up your database before running this file.
-- =============================================================

CREATE TABLE IF NOT EXISTS employee_profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  job_title VARCHAR(150) NULL,
  joining_date DATE NULL,
  gender ENUM('Male','Female','Other','Prefer not to say') NULL,
  marital_status ENUM('Single','Married','Divorced','Widowed','Prefer not to say') NULL,
  highest_qualification VARCHAR(200) NULL,
  phone_number VARCHAR(50) NULL,
  permanent_address TEXT NULL,
  temporary_address TEXT NULL,
  father_name VARCHAR(180) NULL,
  mother_name VARCHAR(180) NULL,
  citizenship_number VARCHAR(120) NULL,
  pan_number VARCHAR(120) NULL,
  bank_account_number VARCHAR(120) NULL,
  bank_name_branch VARCHAR(240) NULL,
  contract_date DATE NULL,
  contract_expire_date DATE NULL,
  emergency_contact_name VARCHAR(180) NULL,
  emergency_relationship VARCHAR(100) NULL,
  emergency_phone VARCHAR(50) NULL,
  emergency_address TEXT NULL,
  date_of_birth DATE NULL,
  profile_completion TINYINT UNSIGNED NOT NULL DEFAULT 0,
  updated_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_employee_profile_user (user_id),
  INDEX idx_employee_profile_company (company_id),
  INDEX idx_employee_contract_expiry (company_id, contract_expire_date),
  CONSTRAINT fk_employee_profile_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_profile_updater FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  document_type ENUM('employee_photo','citizenship','pan','qualification','contract','other') NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  file_data LONGTEXT NOT NULL,
  uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employee_documents_user (user_id, document_type),
  INDEX idx_employee_documents_company (company_id),
  CONSTRAINT fk_employee_document_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_document_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_document_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employment_contracts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  office_join_date DATE NULL,
  contract_date DATE NOT NULL,
  contract_expire_date DATE NOT NULL,
  contract_type ENUM('Full-Time','Part-Time','Probation','Consultant','Fixed-Term','Internship') NOT NULL DEFAULT 'Full-Time',
  status ENUM('Active','Pending Renewal','Expired','Terminated') NOT NULL DEFAULT 'Active',
  remark VARCHAR(1000) NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  updated_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contract_company_expiry (company_id, contract_expire_date),
  INDEX idx_contract_user (user_id, contract_date),
  CONSTRAINT fk_contract_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_contract_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_contract_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_contract_updater FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(160) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id BIGINT UNSIGNED NULL,
  details VARCHAR(1500) NOT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_company_time (company_id, created_at),
  INDEX idx_audit_user_time (user_id, created_at),
  CONSTRAINT fk_audit_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
