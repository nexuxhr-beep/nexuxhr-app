-- ==================================================
-- NexuxHR Assets Register Migration
-- Run this in phpMyAdmin AFTER migration_multitenant.sql
-- Safe to run once. Do not run twice.
-- ==================================================

CREATE TABLE assets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  assigned_to_user_id BIGINT UNSIGNED NOT NULL,
  asset_type ENUM('mobile','laptop','pc') NOT NULL,
  model_name VARCHAR(150) NULL,
  imei1 VARCHAR(50) NULL,
  imei2 VARCHAR(50) NULL,
  device_type VARCHAR(100) NULL,
  brand_model VARCHAR(150) NULL,
  processor VARCHAR(150) NULL,
  device_id VARCHAR(150) NULL,
  operating_system VARCHAR(100) NULL,
  issued_date DATE NOT NULL,
  return_date DATE NULL,
  renewal_interval_days INT NULL,
  purpose VARCHAR(255) NULL,
  accessories VARCHAR(500) NULL,
  acknowledged TINYINT(1) NOT NULL DEFAULT 0,
  signature_data LONGTEXT NULL,
  status ENUM('active','returned','lost','damaged') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_asset_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_user FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE asset_photos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id BIGINT UNSIGNED NOT NULL,
  photo_type VARCHAR(20) NOT NULL,
  photo_data LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_photo_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
