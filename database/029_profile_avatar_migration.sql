-- Add column to track custom user avatars
ALTER TABLE profiles ADD COLUMN has_custom_avatar BOOLEAN DEFAULT FALSE;

-- Create index for efficient queries
CREATE INDEX idx_profiles_has_custom_avatar ON profiles(has_custom_avatar);
