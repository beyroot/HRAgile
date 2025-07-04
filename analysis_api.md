# API Endpoints for Payroll Analysis Page

This document outlines the conceptual API endpoints required to power the "Analysis" page of the Payroll Dashboard.

## Base URL

`/api/analysis`

## Global Filters (Common for this page)

Most endpoints on this page will accept the following query parameters:

*   `projects`: Comma-separated list of project names (e.g., `Project Alpha,Project Beta`). If not provided or empty, implies all projects.
*   `startDate`: ISO date string (e.g., `2023-01-01`).
*   `endDate`: ISO date string (e.g., `2023-12-31`).
*   `datePreset`: String indicating a preset range (e.g., `current_month`, `current_quarter`, `current_year`). The backend can use this to calculate `startDate` and `endDate` if they are not explicitly provided. If `startDate` and `endDate` are provided, they take precedence.

## Endpoints

### 1. Get Pivot Table Data

*   **Endpoint:** `GET /api/analysis/pivot-table`
*   **Description:** Fetches data structured for a pivot table displaying Project × Month with Σ Total Cost and Avg Ratio.
*   **Query Parameters:**
    *   `projects` (optional)
    *   `startDate` (required if `datePreset` is 'custom' or not provided)
    *   `endDate` (required if `datePreset` is 'custom' or not provided)
    *   `datePreset` (optional, e.g., `current_month`, `current_quarter`, `current_year`)
*   **Successful Response (200 OK):**
    The structure can vary depending on whether a client-side pivot library is used or if the server pre-aggregates. A simple row-based structure for manual rendering:
    ```json
    {
      "rows": [
        { "project": "Project Alpha", "month": "2023-01", "totalCost": 70000.50, "avgRatio": 0.1401 },
        { "project": "Project Alpha", "month": "2023-02", "totalCost": 72000.00, "avgRatio": 0.1420 },
        { "project": "Project Beta",  "month": "2023-01", "totalCost": 65000.00, "avgRatio": 0.1350 }
        // ... more rows
      ],
      "metadata": { // Optional: For more advanced pivot table controls
        "fields": [
            {"id": "project", "label": "Project", "type": "dimension"},
            {"id": "month", "label": "Month", "type": "dimension"},
            {"id": "totalCost", "label": "Σ Total Cost", "type": "measure", "format": "currency"},
            {"id": "avgRatio", "label": "Avg Ratio", "type": "measure", "format": "decimal(4)"}
        ]
      }
    }
    ```
*   **Backend Logic:**
    *   Utilize the `monthly_payroll_summary` materialized view.
    *   Group data by `project` and `month_start_date` (formatted as 'YYYY-MM').
    *   Select `project`, `month_start_date` (as month), `SUM(total_cost_monthly)` (aliased as `totalCost`), and `AVG(avg_ratio_monthly)` (aliased as `avgRatio`).
    *   Apply filters for `projects` and the date range derived from `startDate`/`endDate` or `datePreset`.
    *   Order results by project and then by month.

### 2. Export Pivot Table Data

*   **Endpoint:** `GET /api/analysis/pivot-table/export`
*   **Description:** Generates and returns the pivot table data in a specified file format (PDF or Excel).
*   **Query Parameters:**
    *   `format`: `pdf` or `excel` (required).
    *   `projects` (optional)
    *   `startDate` (required if `datePreset` is 'custom' or not provided)
    *   `endDate` (required if `datePreset` is 'custom' or not provided)
    *   `datePreset` (optional)
*   **Successful Response (200 OK):**
    *   The response body will be the file itself.
    *   Appropriate `Content-Type` header (e.g., `application/pdf`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
    *   `Content-Disposition` header to suggest a filename (e.g., `attachment; filename="payroll_analysis.pdf"`).
*   **Backend Logic:**
    *   Fetch data similarly to the `GET /api/analysis/pivot-table` endpoint using the provided filters.
    *   Use a server-side library to generate the PDF or Excel file from the data.
        *   For Excel: Libraries like Apache POI (Java), openpyxl (Python), EPPlus (.NET).
        *   For PDF: Libraries like iText/OpenPDF (Java), ReportLab (Python), PDFSharp (.NET).
    *   Stream the generated file back in the HTTP response.

### 3. Drill-Down Data (Conceptual - Links to Data Explorer)

*   **Description:** The "Drill-down Links" functionality mentioned in the requirements would typically not be a separate API endpoint on the Analysis page itself. Instead, the links generated in the pivot table (e.g., on an `Avg Ratio` value) would navigate to the "Data Explorer" page, pre-filling its filters.
*   **Example Link Structure:**
    `/data-explorer?project=Project%20Alpha&month=2023-01`
    Or, if `month` implies a date range:
    `/data-explorer?project=Project%20Alpha&startDate=2023-01-01&endDate=2023-01-31`
*   **Backend Logic:** No specific API for this on the Analysis page. The "Data Explorer" page's API would handle these incoming filter parameters.

## Shared Endpoints (Potentially from `overview_api.md` or a common API module)

*   **Get Projects List:** `GET /api/projects` (as defined in `overview_api.md`) would be used to populate the project filter on this page as well.

## Error Responses

*   Consistent with those defined in `overview_api.md` (e.g., 400 Bad Request, 500 Internal Server Error).

## Notes

*   The choice of server-side or client-side rendering for the pivot table can impact the API design. If a powerful client-side library is used, the API might return more raw or semi-aggregated data. The example above assumes a server-aggregated structure suitable for direct rendering or light client-side manipulation.
*   For complex pivot operations (e.g., user-defined row/column/value fields), the API would need to be much more flexible, potentially accepting a pivot configuration object. The current requirement (Project × Month with fixed measures) is simpler.
*   Export functionality relies heavily on server-side processing to generate the files.
*   The `datePreset` parameter provides user convenience for common date ranges. The backend should have robust logic to interpret these presets into actual `startDate` and `endDate` values.
