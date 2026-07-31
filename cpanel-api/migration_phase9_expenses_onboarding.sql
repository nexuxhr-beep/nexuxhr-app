-- ===========================================================================
-- NexuxHR Phase 9 — Office Expenses (Phase 4) + onboarding profile setup (Phase 5)
-- ===========================================================================
--
-- TAKE A DATABASE BACKUP FIRST.
--
-- Prerequisites, in order:
--   migration_phase7_leave_records.sql
--   migration_phase8_phase3.sql   <- section 0 of that file widens the role
--                                    ENUMs; the operation manager and accountant
--                                    roles this module depends on cannot exist
--                                    without it.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Office expenses
-- ---------------------------------------------------------------------------
-- Entered by the operation manager. Amounts stay in DECIMAL, never FLOAT —
-- money in floating point accumulates rounding error across a month of bills.
--
-- Dates are stored as AD. Nepali-month grouping happens in the frontend using
-- the Phase 1 calendar, so a BS month that straddles two AD months still totals
-- correctly.

CREATE TABLE IF NOT EXISTS office_expenses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,

  expense_date DATE NOT NULL,
  store_name VARCHAR(150) NOT NULL,

  bill_type ENUM('PAN bill','VAT bill','Local bill','No bill cash credit')
    NOT NULL DEFAULT 'Local bill',

  items TEXT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  qty DECIMAL(10,2) NOT NULL DEFAULT 1,
  net_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

  payment_method ENUM('Fonepay','ConnectIPS','Cash') NOT NULL DEFAULT 'Cash',
  bill_received ENUM('Yes','No') NOT NULL DEFAULT 'No',

  purchase_group ENUM('Kitchen','Entertainment','Stationaries','Electronic','Operation','Other')
    NOT NULL DEFAULT 'Other',
  -- Free text, only used when purchase_group = 'Other'.
  purchase_group_other VARCHAR(120) NULL,

  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_company_date (company_id, expense_date),
  INDEX idx_company_group (company_id, purchase_group),
  INDEX idx_store (company_id, store_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bill photos live in their own table, same pattern as asset_photos.
-- A LONGTEXT base64 column on the main table would be pulled into every list
-- query and make the monthly grid crawl.
CREATE TABLE IF NOT EXISTS office_expense_photos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  expense_id BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NULL,
  mime_type VARCHAR(100) NULL,
  photo_data LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_expense (expense_id),
  CONSTRAINT fk_expense_photo FOREIGN KEY (expense_id)
    REFERENCES office_expenses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ---------------------------------------------------------------------------
-- 2. Onboarding: profile setup completion flag
-- ---------------------------------------------------------------------------
-- After OTP verification a new joiner is sent through "Setup my profile" before
-- reaching their dashboard. Everyone who already exists is marked complete, so
-- current staff are not suddenly locked out behind a wizard.

ALTER TABLE users
  ADD COLUMN profile_setup_complete TINYINT(1) NOT NULL DEFAULT 0 AFTER status;

UPDATE users SET profile_setup_complete = 1;

-- From here on, new rows default to 0 and must pass through the wizard.
ALTER TABLE users
  MODIFY COLUMN profile_setup_complete TINYINT(1) NOT NULL DEFAULT 0;


-- ---------------------------------------------------------------------------
-- 3. Profile fields the correction document asks for
-- ---------------------------------------------------------------------------
-- The banking section is specified as four separate fields (account number,
-- account name, bank name, branch) but the schema only had `bank_name_branch`.
-- Two columns are added; `bank_name_branch` keeps its existing data and is now
-- treated as the bank name.
--
-- NID card is listed as fill-later, and had no column at all.

ALTER TABLE employee_profiles
  ADD COLUMN bank_account_name VARCHAR(150) NULL AFTER bank_account_number,
  ADD COLUMN bank_branch VARCHAR(150) NULL AFTER bank_name_branch,
  ADD COLUMN nid_number VARCHAR(80) NULL AFTER pan_number;


-- ===========================================================================
-- Notes
-- ===========================================================================
--
-- * Section 2 is written in two steps on purpose. The column is added with
--   DEFAULT 0, every existing row is set to 1, and the default stays 0 for new
--   rows. Adding it with DEFAULT 1 would silently mark future joiners complete
--   and skip the wizard entirely.
--
-- * `CREATE INDEX` / `ADD COLUMN` have no IF NOT EXISTS on stock MySQL 8. On a
--   re-run, error 1060 (duplicate column) and 1061 (duplicate key) are safe to
--   ignore. On MariaDB 10.1.4+ you may add IF NOT EXISTS.
--
-- * Purchase groups are an ENUM rather than a lookup table because the six
--   values come straight from the correction document and are not user-editable.
--   If they ever need to be editable, this becomes a table.
