# API Endpoints for Payroll Data Explorer Page

This document outlines the conceptual API endpoints required to power the "Data Explorer" page of the Payroll Dashboard. This page provides interactive access to the raw `payroll` table data.

## Base URL

`/api/data-explorer`

## Endpoints

### 1. Get Payroll Data Items (Paginated, Filterable, Sortable)

*   **Endpoint:** `GET /api/data-explorer/payroll-items`
*   **Description:** Fetches a paginated, filterable, and sortable list of items from the `payroll` table.
*   **Query Parameters:**
    *   `page`: Integer, the current page number (e.g., `1`). Default: `1`.
    *   `limit`: Integer, number of items per page (e.g., `20`). Default: `20`.
    *   `sortBy`: String, the column name to sort by (e.g., `date`, `project`). Default: `date`.
    *   `sortDir`: String, sort direction `asc` or `desc`. Default: `desc`.
    *   `columns`: Comma-separated list of column names to include in the response (e.g., `id,date,project,total_cost`). If not provided, server can default to all or a predefined set.
    *   `globalSearch`: String, a search term to apply across multiple searchable fields (e.g., project name, potentially parts of amounts if converted to string).
    *   **Column-specific filters:**
        *   `project`: String, filter by project name (e.g., `Project Alpha`).
        *   `dateStart`: ISO date string (e.g., `2023-01-01`), filter for items on or after this date.
        *   `dateEnd`: ISO date string (e.g., `2023-12-31`), filter for items on or before this date.
        *   Other columns could also be made filterable (e.g., `total_cost_min`, `total_cost_max`).
*   **Successful Response (200 OK):**
    ```json
    {
      "data": [
        {
          "id": 1,
          "date": "2023-01-15",
          "project": "Project Alpha",
          "gross_fixed_salary": 5000.00,
          "gross_variable_salary": 500.00,
          "total_gross_salary": 5500.00,
          "total_cost": 7000.00,
          "ratio": 0.0800
        }
        // ... more items
      ],
      "pagination": {
        "currentPage": 1,
        "totalPages": 10,
        "totalItems": 195,
        "limit": 20
      },
      "appliedFilters": { // Echo back applied filters for clarity/debugging
        "sortBy": "date",
        "sortDir": "desc",
        // ... other active filters
      },
      "columnInfo": [ // Optional: metadata about returned columns
        { "id": "id", "name": "ID", "type": "integer" },
        { "id": "date", "name": "Date", "type": "date" }
        // ...
      ]
    }
    ```
*   **Backend Logic:**
    *   Construct a dynamic SQL query against the `payroll` table.
    *   Apply `WHERE` clauses based on `globalSearch` (using `ILIKE` or `LOWER()` for case-insensitive search on string fields) and specific column filters.
    *   Apply `ORDER BY` clause based on `sortBy` and `sortDir`.
    *   Apply `LIMIT` and `OFFSET` for pagination.
    *   Execute a separate `COUNT(*)` query with the same filters (but no pagination/ordering on count) to get `totalItems` for pagination calculation.
    *   Select only the `columns` requested if the parameter is provided and valid.

### 2. Export Payroll Data

*   **Endpoint:** `GET /api/data-explorer/export`
*   **Description:** Exports the (potentially filtered and sorted) payroll data to CSV or PDF format. This should export the entire dataset matching the filters, not just the current page.
*   **Query Parameters:**
    *   `format`: `csv` or `pdf` (required).
    *   `sortBy`, `sortDir`, `columns`, `globalSearch`, and other column-specific filters (same as for `GET /api/data-explorer/payroll-items`). These define the dataset to be exported.
*   **Successful Response (200 OK):**
    *   The response body will be the file content.
    *   `Content-Type`: `text/csv` for CSV, `application/pdf` for PDF.
    *   `Content-Disposition`: `attachment; filename="payroll_data_export.csv"` (or `.pdf`).
*   **Backend Logic:**
    *   Fetch all data matching the provided filters and sort order from the `payroll` table (without pagination limits).
    *   Use server-side libraries to generate the CSV or PDF file from this dataset.
        *   For CSV: Standard CSV writing libraries (e.g., Python's `csv` module).
        *   For PDF: Libraries that can render tabular data to PDF (e.g., ReportLab, WeasyPrint for Python).
    *   Stream the generated file in the response.

### 3. Get Column Configuration / Metadata (Optional)

*   **Endpoint:** `GET /api/data-explorer/columns`
*   **Description:** Provides metadata about the available columns in the `payroll` table, such as their data types, if they are sortable, filterable, and default visibility. This can help the frontend build its controls dynamically.
*   **Successful Response (200 OK):**
    ```json
    {
      "columns": [
        { "id": "id", "name": "ID", "type": "integer", "sortable": true, "filterable": false, "defaultVisible": true },
        { "id": "date", "name": "Date", "type": "date", "sortable": true, "filterable": true, "defaultVisible": true },
        { "id": "project", "name": "Project", "type": "string", "sortable": true, "filterable": true, "defaultVisible": true },
        { "id": "gross_fixed_salary", "name": "Gross Fixed Salary", "type": "currency", "sortable": true, "filterable": false, "defaultVisible": true },
        { "id": "gross_variable_salary", "name": "Gross Variable Salary", "type": "currency", "sortable": true, "filterable": false, "defaultVisible": true },
        { "id": "total_gross_salary", "name": "Total Gross Salary", "type": "currency", "sortable": true, "filterable": false, "defaultVisible": true },
        { "id": "total_cost", "name": "Total Cost", "type": "currency", "sortable": true, "filterable": false, "defaultVisible": true },
        { "id": "ratio", "name": "Ratio", "type": "decimal", "sortable": true, "filterable": false, "defaultVisible": true, "conditionalFormatThresholds": {"low": 0.10, "medium": 0.15} }
      ]
    }
    ```
*   **Backend Logic:**
    *   This could be a static configuration on the backend or derived from database schema inspection (though that might be overkill for this specific need).
    *   Include information relevant for frontend rendering and interaction logic.

## Error Responses

*   Consistent with previously defined error responses (e.g., 400 Bad Request for invalid parameters, 500 Internal Server Error).

## Notes

*   The `globalSearch` functionality requires careful implementation on the backend to search across multiple relevant columns efficiently and securely (avoid SQL injection).
*   Conditional formatting thresholds for the `ratio` column are included in the column metadata endpoint. These could also be fetched from a general settings/configuration API if they are globally configurable.
*   For performance, especially with large datasets, ensure database indexes are well-utilized by the queries generated from filters and sorting.
*   The `columns` parameter in the GET request for data items is an optimization to reduce data transfer if not all columns are needed by the client for display.
*   The "Drill-down" from the "Analysis" page would navigate to the Data Explorer URL with query parameters pre-filled (e.g., `/data-explorer?project=XYZ&dateStart=2023-01-01&dateEnd=2023-01-31`). The Data Explorer's frontend JavaScript would then parse these URL parameters and apply them as initial filters.
