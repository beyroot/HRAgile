// Main JavaScript file for the HR Compensation & Payroll Dashboard
console.log("Script loaded successfully");

let allEmployees = [];
let filteredEmployees = [];

// Helper function to format currency
function formatCurrency(value, precisionForM = 2) {
    if (isNaN(value) || value === null || typeof value === 'undefined') return "$---";
    if (value === 0) return "$0";

    if (Math.abs(value) >= 1000000) {
        return "$" + (value / 1000000).toFixed(precisionForM) + "M";
    } else if (Math.abs(value) >= 1000) {
        // For values like 85000, toFixed(1) would be 85.0k.
        // If we want whole numbers for thousands (e.g. 85k), use toFixed(0)
        // Or adjust precision based on specific needs. Let's use 1 decimal for 'k' for now.
        return "$" + (value / 1000).toFixed(1) + "k";
    } else {
        return "$" + value.toFixed(0); // No decimals for values under 1000
    }
}

// Helper function to calculate median
function calculateMedian(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sortedNumbers.length / 2);
    if (sortedNumbers.length % 2 === 0) { // Even number of elements
        return (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2;
    } else { // Odd number of elements
        return sortedNumbers[mid];
    }
}

// Function to update KPI cards
function updateKPIs() {
    if (!filteredEmployees) {
        console.warn("updateKPIs called with no filteredEmployees data.");
        return;
    }

    // Total Headcount
    const totalHeadcount = filteredEmployees.length;
    const totalHeadcountValueEl = document.querySelector('#kpi-total-headcount .kpi-value');
    const totalHeadcountTrendEl = document.querySelector('#kpi-total-headcount .kpi-trend');
    if (totalHeadcountValueEl) totalHeadcountValueEl.textContent = totalHeadcount;
    if (totalHeadcountTrendEl) totalHeadcountTrendEl.textContent = ''; // Placeholder

    // Total Annual Payroll
    const totalPayroll = filteredEmployees.reduce((sum, emp) => sum + emp.annualSalary, 0);
    const totalPayrollValueEl = document.querySelector('#kpi-total-payroll .kpi-value');
    const totalPayrollTrendEl = document.querySelector('#kpi-total-payroll .kpi-trend');
    if (totalPayrollValueEl) totalPayrollValueEl.textContent = formatCurrency(totalPayroll);
    if (totalPayrollTrendEl) totalPayrollTrendEl.textContent = '';

    // Average Salary
    const averageSalary = totalHeadcount > 0 ? totalPayroll / totalHeadcount : 0;
    const averageSalaryValueEl = document.querySelector('#kpi-average-salary .kpi-value');
    const averageSalaryTrendEl = document.querySelector('#kpi-average-salary .kpi-trend');
    if (averageSalaryValueEl) averageSalaryValueEl.textContent = formatCurrency(averageSalary);
    if (averageSalaryTrendEl) averageSalaryTrendEl.textContent = '';

    // Median Salary
    const salaries = filteredEmployees.map(emp => emp.annualSalary);
    const medianSalary = calculateMedian(salaries);
    const medianSalaryValueEl = document.querySelector('#kpi-median-salary .kpi-value');
    const medianSalaryTrendEl = document.querySelector('#kpi-median-salary .kpi-trend');
    if (medianSalaryValueEl) medianSalaryValueEl.textContent = formatCurrency(medianSalary);
    if (medianSalaryTrendEl) medianSalaryTrendEl.textContent = '';

    // Gender Pay Gap
    const maleEmployees = filteredEmployees.filter(emp => emp.gender === 'Male');
    const femaleEmployees = filteredEmployees.filter(emp => emp.gender === 'Female');

    const avgMaleSalary = maleEmployees.length > 0 ? maleEmployees.reduce((sum, emp) => sum + emp.annualSalary, 0) / maleEmployees.length : 0;
    const avgFemaleSalary = femaleEmployees.length > 0 ? femaleEmployees.reduce((sum, emp) => sum + emp.annualSalary, 0) / femaleEmployees.length : 0;

    let payGapText = "N/A";
    if (avgMaleSalary > 0 && avgFemaleSalary > 0) {
        const gap = ((avgMaleSalary - avgFemaleSalary) / avgMaleSalary) * 100;
        payGapText = gap.toFixed(1) + "%";
         // Optionally, indicate which gender earns more if not obvious by positive/negative
        // if (gap > 0) payGapText += " (Men higher)"; else if (gap < 0) payGapText += " (Women higher)";
    } else if (maleEmployees.length === 0 && femaleEmployees.length > 0) {
        payGapText = "No Male Data";
    } else if (femaleEmployees.length === 0 && maleEmployees.length > 0) {
        payGapText = "No Female Data";
    } else if (maleEmployees.length === 0 && femaleEmployees.length === 0 && filteredEmployees.length > 0) {
        payGapText = "No M/F Data";
    }


    const genderPayGapValueEl = document.querySelector('#kpi-gender-pay-gap .kpi-value');
    const genderPayGapTrendEl = document.querySelector('#kpi-gender-pay-gap .kpi-trend');
    if (genderPayGapValueEl) genderPayGapValueEl.textContent = payGapText;
    if (genderPayGapTrendEl) genderPayGapTrendEl.textContent = '';

    console.log("KPIs updated.");
}


// Helper function to get selected options from a multi-select element
function getSelectedOptions(selectElement) {
    if (!selectElement) return [];
    return Array.from(selectElement.selectedOptions).map(option => option.value);
}

// Main Filtering Function
function applyFilters() {
    let currentFilteredData = [...allEmployees];

    const dateRangeElement = document.getElementById('date-range-filter');
    const dateRangeValue = dateRangeElement ? dateRangeElement.value : null;
    const customStartDateElement = document.getElementById('custom-date-start');
    const customStartDate = customStartDateElement ? customStartDateElement.value : null;
    const customEndDateElement = document.getElementById('custom-date-end');
    const customEndDate = customEndDateElement ? customEndDateElement.value : null;
    // Normalize current date to UTC midnight so comparisons are consistent
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (dateRangeValue) {
        currentFilteredData = currentFilteredData.filter(emp => {
            const hireDate = new Date(emp.hireDate);
            hireDate.setUTCHours(0,0,0,0);

            if (dateRangeValue === "ytd") {
                // Use UTC dates for range boundaries
                const startOfYear = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
                return hireDate >= startOfYear && hireDate <= today;
            } else if (dateRangeValue === "last12months") {
                const twelveMonthsAgo = new Date(today);
                twelveMonthsAgo.setUTCMonth(today.getUTCMonth() - 12);
                return hireDate >= twelveMonthsAgo && hireDate <= today;
            } else if (dateRangeValue === "q1_2025") {
                const q1Start = new Date(Date.UTC(2025, 0, 1));
                const q1End = new Date(Date.UTC(2025, 2, 31));
                return hireDate >= q1Start && hireDate <= q1End;
            } else if (dateRangeValue === "custom") {
                const startDate = customStartDate ? new Date(customStartDate) : null;
                if(startDate) startDate.setUTCHours(0,0,0,0);
                const endDate = customEndDate ? new Date(customEndDate) : null;
                if(endDate) endDate.setUTCHours(0,0,0,0);

                if (startDate && endDate) return hireDate >= startDate && hireDate <= endDate;
                if (startDate && !endDate) return hireDate >= startDate;
                if (!startDate && endDate) return hireDate <= endDate;
                return true;
            }
            return true;
        });
    }

    const deptFilterElement = document.getElementById('department-filter');
    const selectedDepartments = getSelectedOptions(deptFilterElement);
    if (selectedDepartments.length > 0) {
        currentFilteredData = currentFilteredData.filter(emp => selectedDepartments.includes(emp.department));
    }

    const jobLevelFilterElement = document.getElementById('job-level-filter');
    const selectedJobLevels = getSelectedOptions(jobLevelFilterElement);
    if (selectedJobLevels.length > 0) {
        currentFilteredData = currentFilteredData.filter(emp => selectedJobLevels.includes(emp.jobLevel));
    }

    filteredEmployees = currentFilteredData;
    console.log("Filters applied. Filtered data count:", filteredEmployees.length);
    updateDashboardComponents();
}


// 1. Fetch Data Function
async function loadEmployeeData() {
    try {
        const response = await fetch('data/employees.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allEmployees = data;
        console.log("Employee data loaded:", allEmployees);
        initializeDashboard();
    } catch (error) {
        console.error('Error loading employee data:', error);
        const kpiContainer = document.getElementById('kpi-cards-container');
        if (kpiContainer) {
            kpiContainer.innerHTML = `<p style="color: red; text-align: center; width: 100%;">Failed to load employee data. Please check the console for details.</p>`;
        }
    }
}

// 2. Update Last Data Refresh Timestamp Function
function updateLastRefreshTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const formattedTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    const timestampElement = document.getElementById('last-data-refresh');
    if (timestampElement) {
        timestampElement.textContent = formattedTimestamp;
    } else {
        console.warn("last-data-refresh element not found");
    }
}

// 3. Populate Filter Dropdowns
function populateFilterDropdowns() {
    if (allEmployees.length === 0) {
        console.warn("No employee data available to populate filters.");
        return;
    }
    const departments = [...new Set(allEmployees.map(emp => emp.department))].sort();
    const jobLevels = [...new Set(allEmployees.map(emp => emp.jobLevel))].sort();
    const deptFilter = document.getElementById('department-filter');
    const jobLevelFilter = document.getElementById('job-level-filter');

    if (deptFilter) {
        const loadingDeptOption = deptFilter.querySelector('option[value=""]');
        if (loadingDeptOption) loadingDeptOption.remove();
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            deptFilter.appendChild(option);
        });
    } else {
        console.warn("Department filter dropdown not found.");
    }

    if (jobLevelFilter) {
        const loadingJobLevelOption = jobLevelFilter.querySelector('option[value=""]');
        if (loadingJobLevelOption) loadingJobLevelOption.remove();
        jobLevels.forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = level;
            jobLevelFilter.appendChild(option);
        });
    } else {
        console.warn("Job level filter dropdown not found.");
    }
}

// Update all dashboard components based on filtered data
function updateDashboardComponents() {
    console.log("Calling functions to update KPIs, Charts, Table with new data. Count:", filteredEmployees.length);
    updateKPIs();
    // renderCharts(filteredEmployees); // Step 10 - Will be added next
    // renderTable(filteredEmployees); // Step 11 - Will be added later
}


// 4. Initial Dashboard Setup Function
function initializeDashboard() {
    updateLastRefreshTimestamp();
    populateFilterDropdowns();

    const dateRangeFilter = document.getElementById('date-range-filter');
    const customDateStart = document.getElementById('custom-date-start');
    const customDateEnd = document.getElementById('custom-date-end');
    const departmentFilter = document.getElementById('department-filter');
    const jobLevelFilter = document.getElementById('job-level-filter');
    const customDateInputs = document.getElementById('custom-date-inputs');

    if (dateRangeFilter) {
        dateRangeFilter.addEventListener('change', () => {
            if (customDateInputs) {
                 customDateInputs.style.display = dateRangeFilter.value === 'custom' ? 'flex' : 'none';
            }
            applyFilters();
        });
        if (customDateInputs) {
            customDateInputs.style.display = dateRangeFilter.value === 'custom' ? 'flex' : 'none';
        }
    }
    if (customDateStart) customDateStart.addEventListener('change', applyFilters);
    if (customDateEnd) customDateEnd.addEventListener('change', applyFilters);
    if (departmentFilter) departmentFilter.addEventListener('change', applyFilters);
    if (jobLevelFilter) jobLevelFilter.addEventListener('change', applyFilters);

    applyFilters();
    console.log("Dashboard initialized. Initial filtered data count:", filteredEmployees.length);
}

// 5. Initial Call / Event Listener
document.addEventListener('DOMContentLoaded', () => {
    loadEmployeeData();
});
