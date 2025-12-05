-- Restrict system cloud service management to admin/CEO roles
-- This migration adds role-based restrictions for system connections

-- Drop existing system connection policies
DROP POLICY IF EXISTS "Admins can manage system connections" ON cloud_services;
DROP POLICY IF EXISTS "Admins can insert system connections" ON cloud_services;
DROP POLICY IF EXISTS "Admins can update system connections" ON cloud_services;
DROP POLICY IF EXISTS "Admins can delete system connections" ON cloud_services;

-- Create function to check if user is admin or CEO
CREATE OR REPLACE FUNCTION is_admin_or_ceo(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = user_uuid
        AND role IN ('admin', 'ceo')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy: Only admins/CEOs can view system connections for management
-- (Note: Regular users can still view them read-only via the existing policy)
CREATE POLICY "Admins can view system connections for management" ON cloud_services
    FOR SELECT
    USING (
        connection_type = 'system' 
        AND user_id IS NULL
        AND is_admin_or_ceo(auth.uid())
    );

-- RLS Policy: Only admins/CEOs can insert system connections
CREATE POLICY "Admins can insert system connections" ON cloud_services
    FOR INSERT
    WITH CHECK (
        connection_type = 'system' 
        AND user_id IS NULL
        AND is_admin_or_ceo(auth.uid())
    );

-- RLS Policy: Only admins/CEOs can update system connections
CREATE POLICY "Admins can update system connections" ON cloud_services
    FOR UPDATE
    USING (
        connection_type = 'system' 
        AND user_id IS NULL
        AND is_admin_or_ceo(auth.uid())
    );

-- RLS Policy: Only admins/CEOs can delete system connections
CREATE POLICY "Admins can delete system connections" ON cloud_services
    FOR DELETE
    USING (
        connection_type = 'system' 
        AND user_id IS NULL
        AND is_admin_or_ceo(auth.uid())
    );

-- Add comment
COMMENT ON FUNCTION is_admin_or_ceo IS 'Checks if a user has admin or CEO role';

