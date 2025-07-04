-- Extension to schema for storing configurable application settings, including ratio thresholds

CREATE TABLE application_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_name VARCHAR(255) NOT NULL, -- User-friendly name for the setting
    setting_value JSONB NOT NULL,       -- Store complex values like thresholds as JSON
    description TEXT,
    last_updated_by VARCHAR(100),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Example initial data for ratio thresholds
INSERT INTO application_settings (setting_key, setting_name, setting_value, description)
VALUES
(
    'payroll_ratio_thresholds',
    'Payroll Ratio Conditional Formatting Thresholds',
    '{
        "low_threshold_upper_bound": 0.10,  -- Values <= this are "low" (e.g., green)
        "medium_threshold_upper_bound": 0.15 -- Values > low_threshold_upper_bound AND <= this are "medium" (e.g., yellow)
                                            -- Values > medium_threshold_upper_bound are "high" (e.g., red)
    }',
    'Defines the upper bounds for payroll ratio categories (low, medium, high) used in conditional formatting. "low_threshold_upper_bound" defines the max for the "low" category. "medium_threshold_upper_bound" defines the max for the "medium" category.'
)
ON CONFLICT (setting_key) DO NOTHING; -- Avoid error if already inserted

-- Ensure last_updated_at is updated on change
CREATE OR REPLACE FUNCTION update_last_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.last_updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_settings_last_updated
BEFORE UPDATE ON application_settings
FOR EACH ROW
EXECUTE FUNCTION update_last_updated_at_column();
