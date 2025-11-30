-- =====================================================
-- Utility Management System - Views
-- =====================================================

-- Drop existing views if they exist
IF OBJECT_ID('vw_MonthlyRevenueReport', 'V') IS NOT NULL
    DROP VIEW vw_MonthlyRevenueReport;
GO

IF OBJECT_ID('vw_DefaultersList', 'V') IS NOT NULL
    DROP VIEW vw_DefaultersList;
GO

-- =====================================================
-- VIEW 1: vw_MonthlyRevenueReport
-- Description: Provides monthly revenue summary with payment statistics
-- Purpose: Used by managers for financial reporting and analysis
-- Columns:
--   - billingYear, billingMonth: Period
--   - totalBills: Number of bills issued
--   - totalBilledAmount: Total amount billed
--   - totalCollectedAmount: Total payments received
--   - totalOutstandingAmount: Total unpaid amount
--   - collectionRate: Percentage of bills collected
--   - paidBills: Count of fully paid bills
--   - unpaidBills: Count of unpaid bills
--   - partiallyPaidBills: Count of partially paid bills
-- =====================================================
CREATE VIEW vw_MonthlyRevenueReport
AS
SELECT
    b.billingYear,
    b.billingMonth,
    COUNT(b.id) AS totalBills,
    SUM(b.totalAmount) AS totalBilledAmount,
    SUM(b.paidAmount) AS totalCollectedAmount,
    SUM(b.outstandingAmount) AS totalOutstandingAmount,
    CASE
        WHEN SUM(b.totalAmount) > 0
        THEN ROUND((SUM(b.paidAmount) / SUM(b.totalAmount)) * 100, 2)
        ELSE 0
    END AS collectionRatePercentage,
    SUM(CASE WHEN b.status = 'PAID' THEN 1 ELSE 0 END) AS paidBills,
    SUM(CASE WHEN b.status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaidBills,
    SUM(CASE WHEN b.status = 'PARTIALLY_PAID' THEN 1 ELSE 0 END) AS partiallyPaidBills,
    SUM(CASE WHEN b.status = 'OVERDUE' THEN 1 ELSE 0 END) AS overdueBills
FROM bills b
GROUP BY b.billingYear, b.billingMonth;
GO

-- =====================================================
-- VIEW 2: vw_DefaultersList
-- Description: Lists customers with overdue payments
-- Purpose: Used for collection follow-up and credit management
-- Columns:
--   - customerId, customerName, customerType: Customer details
--   - contact, email: Contact information
--   - city: Location
--   - totalOutstanding: Total amount owed
--   - overdueCount: Number of overdue bills
--   - oldestDueDate: Earliest unpaid due date
--   - daysPastDue: Days since oldest due date
--   - lateFee: Calculated late payment penalty
-- =====================================================
CREATE VIEW vw_DefaultersList
AS
SELECT
    c.id AS customerId,
    c.name AS customerName,
    c.type AS customerType,
    c.contact,
    c.email,
    c.city,
    c.address,
    SUM(b.outstandingAmount) AS totalOutstanding,
    COUNT(b.id) AS overdueCount,
    MIN(b.dueDate) AS oldestDueDate,
    DATEDIFF(DAY, MIN(b.dueDate), GETDATE()) AS daysPastDue,
    SUM(dbo.fn_CalculateLateFee(b.outstandingAmount, b.dueDate)) AS totalLateFee,
    MAX(b.updatedAt) AS lastBillUpdate
FROM customers c
INNER JOIN bills b ON c.id = b.customerId
WHERE b.status IN ('OVERDUE', 'UNPAID', 'PARTIALLY_PAID')
    AND b.outstandingAmount > 0
    AND b.dueDate < GETDATE()
GROUP BY c.id, c.name, c.type, c.contact, c.email, c.city, c.address
HAVING SUM(b.outstandingAmount) > 0;
GO

-- =====================================================
-- Additional Useful View: vw_CustomerConsumptionSummary
-- Description: Summarizes utility consumption per customer
-- Purpose: Usage pattern analysis and customer profiling
-- =====================================================
IF OBJECT_ID('vw_CustomerConsumptionSummary', 'V') IS NOT NULL
    DROP VIEW vw_CustomerConsumptionSummary;
GO

CREATE VIEW vw_CustomerConsumptionSummary
AS
SELECT
    c.id AS customerId,
    c.name AS customerName,
    c.type AS customerType,
    ut.name AS utilityType,
    ut.unit AS unit,
    m.meterNumber,
    m.status AS meterStatus,
    COUNT(mr.id) AS totalReadings,
    MIN(mr.readingValue) AS firstReading,
    MAX(mr.readingValue) AS lastReading,
    MAX(mr.readingValue) - MIN(mr.readingValue) AS totalConsumption,
    ROUND(
        CASE
            WHEN COUNT(mr.id) > 1
            THEN (MAX(mr.readingValue) - MIN(mr.readingValue)) / NULLIF(COUNT(mr.id) - 1, 0)
            ELSE 0
        END,
        2
    ) AS avgConsumptionPerPeriod,
    MIN(mr.readingDate) AS firstReadingDate,
    MAX(mr.readingDate) AS lastReadingDate
FROM customers c
INNER JOIN meters m ON c.id = m.customerId
INNER JOIN utility_types ut ON m.utilityTypeId = ut.id
LEFT JOIN meter_readings mr ON m.id = mr.meterId
GROUP BY c.id, c.name, c.type, ut.name, ut.unit, m.meterNumber, m.status;
GO

-- =====================================================
-- Test Views
-- =====================================================

PRINT '';
PRINT '=== VIEWS CREATED SUCCESSFULLY ===';
PRINT '';
PRINT 'View 1: vw_MonthlyRevenueReport';
PRINT '  - Monthly revenue and collection statistics';
PRINT '  - Grouped by year and month';
PRINT '  - Usage: SELECT * FROM vw_MonthlyRevenueReport ORDER BY billingYear DESC, billingMonth DESC;';
PRINT '';
PRINT 'View 2: vw_DefaultersList';
PRINT '  - Customers with overdue payments';
PRINT '  - Includes late fee calculation';
PRINT '  - Usage: SELECT * FROM vw_DefaultersList ORDER BY totalOutstanding DESC;';
PRINT '';
PRINT 'View 3: vw_CustomerConsumptionSummary (Bonus)';
PRINT '  - Customer consumption patterns';
PRINT '  - Per utility type analysis';
PRINT '  - Usage: SELECT * FROM vw_CustomerConsumptionSummary;';
PRINT '';
GO
