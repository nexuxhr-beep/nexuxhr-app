-- ===========================================================================
-- NexuxHR Phase 8 — supports Phase 3 (dashboards, notices, request statuses)
-- ===========================================================================
--
-- DRAFT. Do not run until PHASE3-DECISIONS.md D3 is answered — the request
-- status section below assumes "Accepted" (D3 option A). If you choose to keep
-- "Approved", delete section 2 entirely and only narrow the ENUM.
--
-- TAKE A DATABASE BACKUP FIRST. Section 2 rewrites existing request rows.
--
-- Prerequisite: migration_phase7_leave_records.sql has been applied.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 0. Role ENUMs — REQUIRED, this is a Phase 1 gap
-- ---------------------------------------------------------------------------
-- Phase 1 added `operation_manager` and `accountant` to the frontend, but the
-- database ENUMs were never widened. Until this runs, those roles cannot be
-- saved at all: an invitation or user row using them is rejected by MySQL, so
-- the new sidebars exist with nobody able to hold the role.

ALTER TABLE users
  MODIFY COLUMN role
  ENUM('superadmin','admin','hr_manager','operation_manager','accountant','team_member')
  NOT NULL DEFAULT 'team_member';

ALTER TABLE invitations
  MODIFY COLUMN role
  ENUM('admin','hr_manager','operation_manager','accountant','team_member')
  NOT NULL DEFAULT 'team_member';


-- ---------------------------------------------------------------------------
-- 1. Urgent notice acknowledgements
-- ---------------------------------------------------------------------------
-- Without this table the urgent popup would reappear on every page load,
-- forever. One row per (notice, user) records that the person dismissed it.

CREATE TABLE IF NOT EXISTS notice_acknowledgements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  notice_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  acknowledged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_notice_user (notice_id, user_id),
  INDEX idx_user (user_id),

  CONSTRAINT fk_ack_notice FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
  CONSTRAINT fk_ack_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The popup query filters on priority + recency, so index those together.
CREATE INDEX idx_notices_company_priority_created
  ON notices (company_id, priority, created_at);


-- ---------------------------------------------------------------------------
-- 2. Employee request statuses: five values down to three
-- ---------------------------------------------------------------------------
-- Narrowing an ENUM while rows still hold the removed values makes MySQL coerce
-- them to '' and emit a warning, not an error — the data is quietly lost. So
-- this runs in three steps: widen, remap, narrow.

-- 2a. Widen to a superset so both old and new spellings are legal at once.
ALTER TABLE employee_requests
  MODIFY COLUMN status
  ENUM('Pending','In Progress','Approved','Rejected','Completed','Accepted')
  NOT NULL DEFAULT 'Pending';

-- 2b. Remap the retired values.
--     'In Progress' is still open work        -> Pending
--     'Completed'   finished favourably       -> Accepted
--     'Approved'    same meaning, new name    -> Accepted
UPDATE employee_requests SET status = 'Pending'  WHERE status = 'In Progress';
UPDATE employee_requests SET status = 'Accepted' WHERE status IN ('Completed', 'Approved');

-- 2c. Narrow to the final three.
ALTER TABLE employee_requests
  MODIFY COLUMN status
  ENUM('Pending','Accepted','Rejected')
  NOT NULL DEFAULT 'Pending';

-- Verification — every row must now be one of the three. Expect 0.
-- SELECT COUNT(*) AS invalid_rows FROM employee_requests
--   WHERE status NOT IN ('Pending','Accepted','Rejected');


-- ---------------------------------------------------------------------------
-- 3. Birthday lookup
-- ---------------------------------------------------------------------------
-- list_upcoming_birthdays filters on date_of_birth IS NOT NULL for a whole
-- company. This index keeps that cheap as headcount grows.

CREATE INDEX idx_profiles_dob
  ON employee_profiles (date_of_birth);


-- ===========================================================================
-- Notes
-- ===========================================================================
--
-- * `notices.priority` keeps 'Important' in its ENUM. Phase 3 stops offering it
--   in the UI, but existing rows must stay readable, so it is not removed.
--
-- * `renewal_interval_days` on `assets` is intentionally left alone
--   (PHASE3-DECISIONS.md D5) — Phase 3 derives the value from
--   returnDate - issuedDate but keeps writing the column for legacy rows.
--
-- * Section 0 must run before anyone is invited as an operation manager or
--   accountant. It only widens the ENUMs, so it is safe on existing rows.
--
-- * The `tasks` table is intentionally left alone (D6). "My Task" is gone from
--   the UI, but dropping the table is irreversible and gains nothing.
--
-- * `CREATE INDEX` has no IF NOT EXISTS on stock MySQL 8. If you re-run this
--   file, error 1061 (duplicate key name) on sections 1 and 3 is safe to ignore.
--   On MariaDB 10.1.4+ you may add IF NOT EXISTS to both CREATE INDEX lines.
