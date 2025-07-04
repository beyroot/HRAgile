# API Endpoints for Admin / Data Management Page

This document outlines the conceptual API endpoints required for the "Admin / Data Management" page.

## Base URL

`/api/admin`

## Schema Dependencies

These APIs assume the existence of tables like `etl_upload_history` and `system_logs` as defined in `admin_schema_extensions.sql`, and `application_settings` from `settings_schema_extension.sql`.

## Endpoints

### 1. Get ETL Upload History

*   **Endpoint:** `GET /api/admin/upload-history`
*   **Description:** Fetches a paginated list of ETL file upload history records.
*   **Query Parameters:**
    *   `page`: Integer, current page number (Default: `1`).
    *   `limit`: Integer, items per page (Default: `10`).
    *   `status`: String, filter by upload status (e.g., `Success`, `Failed`, `Partial Success`).
    *   `sortBy`: String, column to sort by (Default: `upload_timestamp`).
    *   `sortDir`: String, `asc` or `desc` (Default: `desc`).
*   **Successful Response (200 OK):**
    ```json
    {
      "data": [
        {
          "upload_id": 101,
          "file_name": "payroll_jan_2023.xlsx",
          "upload_timestamp": "2023-02-01T10:00:00Z",
          "user_who_uploaded": "j.doe",
          "status": "Success",
          "upload_mode": "Append",
          "records_processed": 150,
          "records_failed": 0,
          "notes": "Upload completed.",
          "data_snapshot_reference": "backup_xyz_20230201" // If available
        }
        // ... more history items
      ],
      "pagination": {
        "currentPage": 1,
        "totalPages": 5,
        "totalItems": 48,
        "limit": 10
      }
    }
    ```
*   **Backend Logic:**
    *   Query the `etl_upload_history` table.
    *   Apply filters for `status`.
    *   Apply sorting and pagination.
    *   Calculate `totalItems` for pagination.

### 2. Attempt to Rollback an Upload

*   **Endpoint:** `POST /api/admin/upload-history/{upload_id}/rollback`
*   **Description:** Initiates a rollback process for a given upload. The exact nature of rollback depends on the strategy implemented (e.g., deleting records associated with the `upload_id` from `payroll` table, restoring a snapshot).
*   **Path Parameters:**
    *   `upload_id`: Integer, the ID of the upload to rollback.
*   **Request Body:** (Optional)
    ```json
    {
      "reason": "User requested rollback due to incorrect data."
    }
    ```
*   **Successful Response (200 OK or 202 Accepted):**
    ```json
    {
      "message": "Rollback process initiated for upload ID 101.",
      "status": "Pending/InProgress/Completed_With_Warning", // More detailed status if async
      "details": "Records associated with this upload will be removed. Data snapshot 'backup_xyz_20230201' can be used for full restore if needed."
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: If `upload_id` does not exist.
    *   `400 Bad Request`: If rollback is not possible for this upload (e.g., no snapshot, already rolled back).
    *   `500 Internal Server Error`: If rollback process fails.
*   **Backend Logic:**
    *   **Crucial:** This is a critical and potentially destructive operation. Requires careful implementation.
    *   Identify the `upload_id`.
    *   If `payroll` table has `upload_id_fk`:
        *   Delete rows from `payroll` where `payroll.upload_id_fk = {upload_id}`. This is a "soft" rollback (removes data from that upload).
        *   This should be done transactionally.
    *   If using snapshots/backups referenced by `data_snapshot_reference`:
        *   This might trigger an automated restore process or provide instructions for manual restore.
    *   Log the rollback attempt and its outcome in `system_logs` and potentially update the `etl_upload_history` record's notes.
    *   Return a meaningful response to the user.

### 3. Get System Logs

*   **Endpoint:** `GET /api/admin/system-logs`
*   **Description:** Fetches a paginated list of system logs (errors, warnings, info).
*   **Query Parameters:**
    *   `page`: Integer, current page number (Default: `1`).
    *   `limit`: Integer, items per page (Default: `15`).
    *   `log_level`: String, filter by log level (e.g., `ERROR`, `WARNING`, `INFO`).
    *   `source`: String, filter by log source (e.g., `ETL`, `API`).
    *   `startDate`: ISO date string, filter logs from this date.
    *   `endDate`: ISO date string, filter logs up to this date.
    *   `sortBy`: String, column to sort by (Default: `log_timestamp`).
    *   `sortDir`: String, `asc` or `desc` (Default: `desc`).
*   **Successful Response (200 OK):**
    ```json
    {
      "data": [
        {
          "log_id": 505,
          "log_timestamp": "2023-03-01T11:00:05Z",
          "log_level": "ERROR",
          "source": "ETL",
          "message": "Failed to process row 25 in payroll_feb_2023.xlsx",
          "details": { "error": "ValueError", "file_row": 25, "column": "date" }
        }
        // ... more log items
      ],
      "pagination": {
        "currentPage": 1,
        "totalPages": 3,
        "totalItems": 40,
        "limit": 15
      }
    }
    ```
*   **Backend Logic:**
    *   Query the `system_logs` table.
    *   Apply filters for `log_level`, `source`, and date range.
    *   Apply sorting and pagination.

## Security Considerations

*   All endpoints under `/api/admin` **MUST** be protected and accessible only by authorized administrative users.
*   Rollback functionality, in particular, needs strict access control and possibly an audit trail beyond the basic `system_logs`.

## Notes on Rollback Implementation

*   A simple rollback could be deleting data associated with a specific `upload_id` from the `payroll` table. This requires that the `payroll` table has a foreign key to `etl_upload_history.upload_id`.
*   A more robust rollback might involve restoring from database backups or using point-in-time recovery (PITR) features if the database supports it. The `data_snapshot_reference` field in `etl_upload_history` could store information needed for such restores.
*   The ETL process itself should ideally be transactional. If an Excel file processing fails mid-way, the transaction should roll back, leaving the database in its previous state. The "rollback" feature here is more for undoing a *successfully completed* upload that was later found to be erroneous.
*   Consider a "soft delete" mechanism (e.g., an `is_deleted` flag on `payroll` records) instead of hard deletes for easier reversal of a mistaken rollback, though this adds complexity to all other queries.

### 4. Get Application Setting

*   **Endpoint:** `GET /api/admin/settings/{setting_key}`
*   **Description:** Fetches a specific application setting by its key.
*   **Path Parameters:**
    *   `setting_key`: String, the unique key for the setting (e.g., `payroll_ratio_thresholds`).
*   **Successful Response (200 OK):**
    ```json
    {
      "setting_key": "payroll_ratio_thresholds",
      "setting_name": "Payroll Ratio Conditional Formatting Thresholds",
      "setting_value": {
        "low_threshold_upper_bound": 0.10,
        "medium_threshold_upper_bound": 0.15
      },
      "description": "Defines the upper bounds for payroll ratio categories...",
      "last_updated_by": "admin_user",
      "last_updated_at": "2023-05-01T12:00:00Z"
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: If `setting_key` does not exist.
*   **Backend Logic:**
    *   Query the `application_settings` table for the given `setting_key`.

### 5. Update Application Setting

*   **Endpoint:** `PUT /api/admin/settings/{setting_key}`
*   **Description:** Updates an existing application setting or creates it if it doesn't exist (upsert behavior can be useful).
*   **Path Parameters:**
    *   `setting_key`: String, the unique key for the setting.
*   **Request Body:**
    ```json
    {
      "setting_name": "Payroll Ratio Conditional Formatting Thresholds", // Optional if only updating value
      "setting_value": {
        "low_threshold_upper_bound": 0.12,
        "medium_threshold_upper_bound": 0.18
      },
      "description": "Updated description." // Optional
    }
    ```
*   **Successful Response (200 OK or 201 Created):**
    The updated or created setting object (similar to GET response).
    ```json
    {
      "setting_key": "payroll_ratio_thresholds",
      "setting_name": "Payroll Ratio Conditional Formatting Thresholds",
      "setting_value": {
        "low_threshold_upper_bound": 0.12,
        "medium_threshold_upper_bound": 0.18
      },
      "description": "Updated description.",
      "last_updated_by": "current_admin_user", // Should be set by the backend
      "last_updated_at": "2023-05-15T10:30:00Z" // Should be set by the backend
    }
    ```
*   **Backend Logic:**
    *   Use an `INSERT ... ON CONFLICT ... DO UPDATE` (upsert) statement for the `application_settings` table.
    *   Update `setting_value`, and optionally `setting_name` and `description`.
    *   Record `last_updated_by` (from the authenticated user session) and `last_updated_at`.
    *   Validate the structure of `setting_value` if necessary (e.g., ensure thresholds are numbers).

### 6. List Application Settings (Optional)

*   **Endpoint:** `GET /api/admin/settings`
*   **Description:** Fetches a list of all available application settings (or a subset, e.g., by category if settings grow numerous).
*   **Successful Response (200 OK):**
    ```json
    {
      "settings": [
        {
          "setting_key": "payroll_ratio_thresholds",
          "setting_name": "Payroll Ratio Conditional Formatting Thresholds",
          "description": "Defines the upper bounds for payroll ratio categories..."
        }
        // ... other settings
      ]
    }
    ```
*   **Backend Logic:**
    *   Query the `application_settings` table, possibly returning only keys, names, and descriptions for a summary list.
