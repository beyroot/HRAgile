import pandas as pd
# Assume a database connector library is imported, e.g., psycopg2 or sqlalchemy
# import psycopg2
# from sqlalchemy import create_engine

# --- Configuration ---
EXPECTED_COLUMNS = {
    'date': 'datetime64[ns]', # Pandas dtype
    'project': 'object',
    'gross_fixed_salary': 'float64',
    'gross_variable_salary': 'float64',
    # 'total_gross_salary' # Calculated
    'total_cost': 'float64',
    'ratio': 'float64'
}
# Database connection details (example)
# DB_CONFIG = {
#     "host": "localhost",
#     "database": "payroll_db",
#     "user": "user",
#     "password": "password"
# }

# --- Helper Functions ---

def connect_db():
    """
    Establishes a database connection.
    Replace with actual database connection logic.
    """
    # Example using psycopg2:
    # conn = psycopg2.connect(**DB_CONFIG)
    # return conn
    print("DB Connection: Replace with actual implementation.")
    return None # Placeholder

def close_db(conn):
    """Closes the database connection."""
    if conn:
        # conn.close()
        print("DB Connection Closed: Replace with actual implementation.")
        pass # Placeholder

def validate_excel_columns(df):
    """
    Validates if the DataFrame contains expected columns and attempts to convert types.
    Returns a validated DataFrame or raises ValueError.
    """
    missing_cols = [col for col in EXPECTED_COLUMNS if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing expected columns in Excel: {', '.join(missing_cols)}")

    validated_df = df.copy()
    for col, dtype in EXPECTED_COLUMNS.items():
        try:
            if dtype == 'datetime64[ns]':
                validated_df[col] = pd.to_datetime(validated_df[col])
            else:
                validated_df[col] = validated_df[col].astype(dtype)
        except Exception as e:
            raise ValueError(f"Error converting column '{col}' to type '{dtype}': {e}")

    # Check for essential non-nullable columns after type conversion
    if validated_df['date'].isnull().any():
        raise ValueError("Column 'date' contains missing values.")
    if validated_df['project'].isnull().any():
        raise ValueError("Column 'project' contains missing values.")

    print("Excel column validation successful.")
    return validated_df

def transform_data(df):
    """
    Calculates derived columns.
    """
    transformed_df = df.copy()
    transformed_df['total_gross_salary'] = transformed_df['gross_fixed_salary'].fillna(0) + \
                                           transformed_df['gross_variable_salary'].fillna(0)

    # variable_pct is not stored in the main table per schema, but calculated in the view.
    # If it were to be stored, it would be:
    # transformed_df['variable_pct'] = transformed_df['gross_variable_salary'].fillna(0) / \
    #                                  transformed_df['total_gross_salary'].replace(0, pd.NA)
    #                                  # Avoid division by zero, result in NA

    print("Data transformation successful (total_gross_salary calculated).")
    return transformed_df

def load_data_to_db(df, conn, mode='append'):
    """
    Loads DataFrame into the payroll table.
    'mode' can be 'append' or 'replace'.
    """
    cursor = None # conn.cursor() # Placeholder

    # For 'replace' mode, typically you'd delete existing data for the affected projects/dates
    # or truncate the table if it's a full refresh. This needs careful handling.
    # For simplicity, this example focuses on append. A true 'replace' might involve:
    # DELETE FROM payroll WHERE project IN (SELECT DISTINCT project FROM new_data_temp_table);
    # Or based on date ranges.
    if mode == 'replace':
        # This is a simplistic replace - truncating the entire table.
        # In a real scenario, this should be more granular.
        # cursor.execute("TRUNCATE TABLE payroll;")
        # print("Table 'payroll' truncated (replace mode).")
        # For a more targeted replace, one might identify overlapping data and delete it first.
        # This example will just append for now, as 'replace' logic can be complex.
        print("Replace mode selected. Actual implementation would require careful data deletion strategy.")
        # A common strategy for replace:
        # 1. Load new data into a temporary staging table.
        # 2. Delete rows from the main table that match keys in the staging table.
        # 3. Insert all rows from the staging table into the main table.
        # This is often done within a transaction.
        pass


    # Using pandas to_sql (if using SQLAlchemy engine) or constructing INSERT statements
    # Example: df.to_sql('payroll', con=engine, if_exists='append', index=False)

    # Manual INSERT (example with psycopg2)
    # query = """
    # INSERT INTO payroll (date, project, gross_fixed_salary, gross_variable_salary,
    #                      total_gross_salary, total_cost, ratio)
    # VALUES (%s, %s, %s, %s, %s, %s, %s)
    # """
    # data_tuples = [tuple(x) for x in df.to_numpy()]
    # cursor.executemany(query, data_tuples)
    # conn.commit()

    print(f"Data loaded to 'payroll' table in '{mode}' mode (conceptual).")
    print(f"DataFrame to load:\n{df.head()}")


# --- Main ETL Function ---

def run_payroll_etl(file_path, upload_mode='append'):
    """
    Main ETL function to process a payroll Excel file.
    :param file_path: Path to the .xlsx file.
    :param upload_mode: 'append' to add new data, 'replace' to overwrite existing data (needs careful implementation).
    """
    conn = None
    try:
        print(f"Starting ETL process for file: {file_path}, mode: {upload_mode}")

        # 1. Extract
        try:
            df = pd.read_excel(file_path, engine='openpyxl')
        except FileNotFoundError:
            print(f"Error: File not found at {file_path}")
            return
        except Exception as e:
            print(f"Error reading Excel file: {e}")
            return

        print("Data extracted from Excel successfully.")

        # 2. Validate (subset of columns for initial validation)
        df_validated = validate_excel_columns(df[['date', 'project', 'gross_fixed_salary', 'gross_variable_salary', 'total_cost', 'ratio']])

        # 3. Transform
        df_transformed = transform_data(df_validated)

        # 4. Load
        # conn = connect_db() # Establish connection
        # if conn:
        #     load_data_to_db(df_transformed, conn, mode=upload_mode)
        # else:
        #     print("ETL Load: Database connection failed (conceptual).")
        #     return

        # Simulate load for now
        load_data_to_db(df_transformed, None, mode=upload_mode)


        print("ETL process completed successfully.")

    except ValueError as ve:
        print(f"ETL process failed: {ve}")
    except Exception as e:
        print(f"An unexpected error occurred during ETL: {e}")
    finally:
        if conn:
            # close_db(conn)
            pass # Placeholder

# --- Example Usage (Conceptual) ---
if __name__ == "__main__":
    # This part would be triggered by the file upload widget in the web application.
    # For testing, you might call it directly:

    # Create a dummy Excel file for testing
    dummy_data = {
        'date': ['2023-01-15', '2023-01-20', '2023-02-10'],
        'project': ['Project Alpha', 'Project Beta', 'Project Alpha'],
        'gross_fixed_salary': [5000, 4500, 5200],
        'gross_variable_salary': [500, 300, 600],
        'total_cost': [7000, 6000, 7500],
        'ratio': [0.14, 0.12, 0.15]
    }
    dummy_df = pd.DataFrame(dummy_data)
    dummy_excel_path = "dummy_payroll.xlsx"
    dummy_df.to_excel(dummy_excel_path, index=False)

    print(f"Dummy Excel file created at: {dummy_excel_path}")

    # Simulate ETL run
    print("\n--- Running ETL in 'append' mode ---")
    run_payroll_etl(dummy_excel_path, upload_mode='append')

    # print("\n--- Running ETL in 'replace' mode (conceptual) ---")
    # run_payroll_etl(dummy_excel_path, upload_mode='replace')

    # Clean up dummy file
    # import os
    # os.remove(dummy_excel_path)
    # print(f"\nDummy Excel file {dummy_excel_path} removed.")
    pass
