-- Main table for payroll data
CREATE TABLE payroll (
  id                   SERIAL PRIMARY KEY,
  date                 DATE        NOT NULL,
  project              VARCHAR(100) NOT NULL,
  gross_fixed_salary   NUMERIC(18,2),
  gross_variable_salary NUMERIC(18,2),
  total_gross_salary   NUMERIC(18,2), -- Will be calculated: gross_fixed_salary + gross_variable_salary
  total_cost           NUMERIC(18,2), -- Assuming this is a distinct value provided or calculated elsewhere
  ratio                NUMERIC(6,4)   -- Assuming this is a distinct value provided or calculated elsewhere
);

-- Indexes for performance
CREATE INDEX idx_payroll_date_project ON payroll(date, project);

-- Materialized view for monthly aggregated data to speed up KPI queries
-- This view also calculates total_gross_salary and variable_pct
CREATE MATERIALIZED VIEW monthly_payroll_summary AS
SELECT
  date_trunc('month', date)::date AS month_start_date,
  project,
  SUM(gross_fixed_salary) AS total_fixed_salary_monthly,
  SUM(gross_variable_salary) AS total_variable_salary_monthly,
  SUM(gross_fixed_salary + gross_variable_salary) AS total_gross_salary_monthly,
  AVG(COALESCE(gross_variable_salary / NULLIF(gross_fixed_salary + gross_variable_salary, 0), 0)) AS avg_variable_pct_monthly,
  SUM(total_cost) AS total_cost_monthly,
  AVG(ratio) AS avg_ratio_monthly
FROM
  payroll
GROUP BY
  date_trunc('month', date),
  project
ORDER BY
  month_start_date,
  project;

-- Index for the materialized view
CREATE UNIQUE INDEX idx_monthly_payroll_summary_month_project ON monthly_payroll_summary(month_start_date, project);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_monthly_payroll_summary()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_payroll_summary;
  RETURN NULL;
END $$;

-- Trigger to automatically refresh the materialized view after changes to the payroll table
CREATE TRIGGER refresh_payroll_summary_trigger
AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON payroll
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_monthly_payroll_summary();

-- Note on total_gross_salary and variable_pct in the payroll table vs. the view:
-- The problem description mentions:
-- total_gross_salary = gross_fixed_salary + gross_variable_salary;
-- variable_pct        = gross_variable_salary / NULLIF(total_gross_salary,0);
-- These can be calculated either during ETL and stored in the `payroll` table,
-- or calculated on the fly using a regular view or within queries.
-- For the `payroll` table definition, `total_gross_salary` is included as a column.
-- If calculated during ETL, it would be populated then.
-- The `monthly_payroll_summary` materialized view calculates these aggregates.
-- `variable_pct` is not stored in the `payroll` table per the schema, but calculated in the view.
-- `ratio` is also in the `payroll` table; its calculation method isn't specified but it's averaged in the view.

-- To initially populate the view:
-- REFRESH MATERIALIZED VIEW monthly_payroll_summary;
