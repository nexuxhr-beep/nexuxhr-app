-- NexuxHR Phase 4
ALTER TABLE employee_profiles ADD COLUMN profile_photo LONGTEXT NULL AFTER date_of_birth;
CREATE INDEX idx_auth_sessions_user_active ON auth_sessions(user_id, revoked_at, expires_at);
