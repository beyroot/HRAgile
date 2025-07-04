# API Endpoints for Payroll Overview Page

This document outlines the conceptual API endpoints required to power the "Overview" page of the Payroll Dashboard.

## Base URL

`/api/overview`

## Global Filters

All relevant endpoints should accept the following query parameters for filtering:

*   `projects`: Comma-separated list of project names (e.g., `Project Alpha,Project Beta`). If not provided or empty, implies all projects.
*   `startDate`: ISO date string (e.g., `2023-01-01`).
*   `endDate`: ISO date string (e.g., `2023-12-31`).

## Endpoints

### 1. Get KPI Data

*   **Endpoint:** `GET /api/overview/kpis`
*   **Description:** Fetches data for all KPI cards on the Overview page.
*   **Query Parameters:**
    *   `projects` (optional)
    *   `startDate` (optional, defaults to current month start if not provided for some KPIs)
    *   `endDate` (optional, defaults to current month end if not provided for some KPIs)
*   **Successful Response (200 OK):**
    ```json
    {
      "totalGrossCurrentMonth": { // Calculated for the current calendar month, ignores date filters
        "value": 125000.50,
        "currency": "USD" // Or other currency code
      },
      "totalCostFiltered": { // Respects project and date filters
        "value": 180000.75,
        "currency": "USD"
      },
      "avgRatioFiltered": { // Respects project and date filters
        "value": 0.1532
      },
      "variablePctOfGrossFiltered": { // Respects project and date filters
        "value": 12.5, // Percentage
        "calculation_note": "Gross Variable / Total Gross"
      }
    }
    ```
*   **Backend Logic:**
    *   `totalGrossCurrentMonth`: Query `payroll` table (or `monthly_payroll_summary`) for sum of `total_gross_salary` for the current calendar month, across all projects.
    *   `totalCostFiltered`: Query `payroll` table (or `monthly_payroll_summary`) for sum of `total_cost` based on active filters.
    *   `avgRatioFiltered`: Query `payroll` table (or `monthly_payroll_summary`) for average of `ratio` based on active filters.
    *   `variablePctOfGrossFiltered`: Calculate `SUM(gross_variable_salary) / SUM(total_gross_salary) * 100` from `payroll` table (or use `monthly_payroll_summary` aggregates) based on active filters. Ensure `NULLIF` for denominator to prevent division by zero.

### 2. Get Monthly Trend - Total Gross Salary

*   **Endpoint:** `GET /api/overview/charts/monthly-gross-salary`
*   **Description:** Fetches data for the "Monthly Trend - Total Gross Salary" line chart.
*   **Query Parameters:**
    *   `projects` (optional)
    *   `startDate` (required)
    *   `endDate` (required)
*   **Successful Response (200 OK):**
    ```json
    {
      "labels": ["2023-01", "2023-02", "2023-03", "2023-04"], // Month labels (e.g., YYYY-MM)
      "datasets": [
        {
          "label": "Total Gross Salary",
          "data": [50000, 52000, 48000, 55000],
          "currency": "USD"
        }
        // Potentially more datasets if comparing projects side-by-side on the same chart
      ]
    }
    ```
*   **Backend Logic:**
    *   Use the `monthly_payroll_summary` materialized view.
    *   Group by `month_start_date`, sum `total_gross_salary_monthly`.
    *   Filter by `project` (if provided) and date range.
    *   Format labels as month representations.

### 3. Get Monthly Trend - Total Cost

*   **Endpoint:** `GET /api/overview/charts/monthly-total-cost`
*   **Description:** Fetches data for the "Monthly Trend - Total Cost" bar chart.
*   **Query Parameters:**
    *   `projects` (optional)
    *   `startDate` (required)
    *   `endDate` (required)
*   **Successful Response (200 OK):**
    ```json
    {
      "labels": ["2023-01", "2023-02", "2023-03", "2023-04"],
      "datasets": [
        {
          "label": "Total Cost",
          "data": [70000, 72000, 68000, 75000],
          "currency": "USD"
        }
      ]
    }
    ```
*   **Backend Logic:**
    *   Use the `monthly_payroll_summary` materialized view.
    *   Group by `month_start_date`, sum `total_cost_monthly`.
    *   Filter by `project` (if provided) and date range.

### 4. Get Monthly Fixed vs. Variable Salary

*   **Endpoint:** `GET /api/overview/charts/monthly-fixed-variable`
*   **Description:** Fetches data for the "Monthly Fixed vs. Variable Salary" stacked bar chart.
*   **Query Parameters:**
    *   `projects` (optional)
    *   `startDate` (required)
    *   `endDate` (required)
*   **Successful Response (200 OK):**
    ```json
    {
      "labels": ["2023-01", "2023-02", "2023-03", "2023-04"],
      "datasets": [
        {
          "label": "Fixed Salary",
          "data": [40000, 41000, 38000, 43000],
          "currency": "USD"
        },
        {
          "label": "Variable Salary",
          "data": [10000, 11000, 10000, 12000],
          "currency": "USD"
        }
      ]
    }
    ```
*   **Backend Logic:**
    *   Use the `monthly_payroll_summary` materialized view.
    *   For each month in the range, provide `total_fixed_salary_monthly` and `total_variable_salary_monthly`.
    *   Filter by `project` (if provided) and date range.

### 5. Get Projects List (for filter population)

*   **Endpoint:** `GET /api/projects`
*   **Description:** Fetches a list of unique project names to populate the project filter dropdown.
*   **Query Parameters:** None
*   **Successful Response (200 OK):**
    ```json
    {
      "projects": ["Project Alpha", "Project Beta", "Project Gamma", "Project Delta"]
    }
    ```
*   **Backend Logic:**
    *   `SELECT DISTINCT project FROM payroll ORDER BY project;` (or from `monthly_payroll_summary`).

## Error Responses

*   **400 Bad Request:** If required parameters are missing or invalid (e.g., invalid date format).
    ```json
    {
      "error": "Invalid date format for startDate. Use YYYY-MM-DD."
    }
    ```
*   **500 Internal Server Error:** For general server-side errors.
    ```json
    {
      "error": "An unexpected error occurred."
    }
    ```

## Notes

*   The API should be designed to efficiently query the database, leveraging the `monthly_payroll_summary` materialized view wherever possible for aggregated monthly data.
*   Consider pagination for chart data if the number of data points (months) can become very large, though for typical dashboard views this might not be immediately necessary.
*   Authentication and authorization mechanisms are not detailed here but would be essential in a production system.
*   The `currency` field in responses is good practice, especially if the system might handle multiple currencies in the future. For now, it can be a fixed value if only one currency is used.
