-- Extend session_profiles with identity attributes for "assign to me" and profile settings.
ALTER TABLE session_profiles ADD COLUMN email TEXT;
ALTER TABLE session_profiles ADD COLUMN display_name TEXT;
ALTER TABLE session_profiles ADD COLUMN provider TEXT;
ALTER TABLE session_profiles ADD COLUMN provider_user_id TEXT;
