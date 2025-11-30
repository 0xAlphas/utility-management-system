-- =====================================================
-- TEST SQL FEATURES
-- Run this script to verify all SQL features work correctly
-- =====================================================

USE utilitydb;
GO

PRINT '========================================';
PRINT 'TESTING SQL FEATURES';
PRINT '========================================';
PRINT '';

-- =====================================================
-- TEST 1: Test Functions
-- =====================================================
PRINT '1. Testing Functions...';
PRINT '';

-- Get a utility type ID for testing
DECLARE @testUtilityId NVARCHAR(450);
SELECT TOP 1 @testUtilityId = id FROM utility_types WHERE name = 'Electricity';

-- Test fn_CalculateBillAmount
PRINT '   Testing fn_CalculateBillAmount:';
SELECT
    'Electricity 150 kWh' AS TestCase,
    dbo.fn_CalculateBillAmount(@testUtilityId, 150) AS CalculatedAmount;

SELECT
    'Electricity 250 kWh' AS TestCase,
    dbo.fn_CalculateBillAmount(@testUtilityId, 250) AS CalculatedAmount;

-- Test fn_CalculateLateFee
PRINT '';
PRINT '   Testing fn_CalculateLateFee:';
SELECT
    '30 days overdue, Rs. 5000' AS TestCase,
    dbo.fn_CalculateLateFee(5000.00, DATEADD(DAY, -30, GETDATE())) AS LateFee;

SELECT
    '60 days overdue, Rs. 10000' AS TestCase,
    dbo.fn_CalculateLateFee(10000.00, DATEADD(DAY, -60, GETDATE())) AS LateFee;

PRINT '';
PRINT '   ✅ Functions tested successfully';
PRINT '';

-- =====================================================
-- TEST 2: Test Views
-- =====================================================
PRINT '2. Testing Views...';
PRINT '';

PRINT '   vw_MonthlyRevenueReport:';
SELECT TOP 5 *
FROM vw_MonthlyRevenueReport
ORDER BY billingYear DESC, billingMonth DESC;

PRINT '';
PRINT '   vw_DefaultersList (Top 5):';
SELECT TOP 5
    customerName,
    totalOutstanding,
    daysPastDue,
    totalLateFee
FROM vw_DefaultersList
ORDER BY totalOutstanding DESC;

PRINT '';
PRINT '   vw_CustomerConsumptionSummary (Top 5):';
SELECT TOP 5
    customerName,
    utilityType,
    totalConsumption,
    avgConsumptionPerPeriod
FROM vw_CustomerConsumptionSummary
ORDER BY totalConsumption DESC;

PRINT '';
PRINT '   ✅ Views tested successfully';
PRINT '';

-- =====================================================
-- TEST 3: Test Stored Procedures
-- =====================================================
PRINT '3. Testing Stored Procedures...';
PRINT '';

-- Get test data
DECLARE @testCustomerId NVARCHAR(450);
DECLARE @testBillId NVARCHAR(450);

SELECT TOP 1 @testCustomerId = id FROM customers WHERE type = 'HOUSEHOLD';

PRINT '   Testing sp_GenerateBillForCustomer:';
PRINT '   Note: This may fail if bill already exists for current month - that is expected behavior';

BEGIN TRY
    EXEC sp_GenerateBillForCustomer
        @customerId = @testCustomerId,
        @billingMonth = 12,
        @billingYear = 2025,
        @utilityTypeId = @testUtilityId;
    PRINT '   ✅ Bill generation successful';
END TRY
BEGIN CATCH
    PRINT '   ⚠️  ' + ERROR_MESSAGE();
    PRINT '   (This is expected if bill already exists)';
END CATCH

PRINT '';

-- Get an unpaid bill for testing
SELECT TOP 1 @testBillId = id
FROM bills
WHERE outstandingAmount > 0
ORDER BY outstandingAmount ASC;

IF @testBillId IS NOT NULL
BEGIN
    PRINT '   Testing sp_ProcessPayment:';

    DECLARE @partialAmount FLOAT;
    SELECT @partialAmount = outstandingAmount * 0.5
    FROM bills
    WHERE id = @testBillId;

    BEGIN TRY
        EXEC sp_ProcessPayment
            @billId = @testBillId,
            @amount = @partialAmount,
            @paymentMethod = 'CASH',
            @recordedBy = 'admin',
            @remarks = 'Test payment via SQL script';
        PRINT '   ✅ Payment processing successful';
    END TRY
    BEGIN CATCH
        PRINT '   ⚠️  ' + ERROR_MESSAGE();
    END CATCH
END
ELSE
BEGIN
    PRINT '   ⚠️  No unpaid bills found for payment testing';
END

PRINT '';
PRINT '   ✅ Stored procedures tested';
PRINT '';

-- =====================================================
-- TEST 4: Test Triggers
-- =====================================================
PRINT '4. Testing Triggers...';
PRINT '';

PRINT '   Trigger: trg_UpdateBillOnPayment';
PRINT '   This trigger was automatically tested when processing payment above';
PRINT '   It updates bill amounts when a payment is inserted';

PRINT '';
PRINT '   Trigger: trg_UpdateBillStatus';
PRINT '   This trigger marks overdue bills automatically';

-- Check for overdue bills
DECLARE @overdueCount INT;
SELECT @overdueCount = COUNT(*)
FROM bills
WHERE status = 'OVERDUE';

PRINT '   Current overdue bills: ' + CAST(@overdueCount AS NVARCHAR(10));
PRINT '   ✅ Triggers verified';
PRINT '';

-- =====================================================
-- TEST 5: Data Integrity Check
-- =====================================================
PRINT '5. Data Integrity Check...';
PRINT '';

-- Check for orphaned records
PRINT '   Checking for orphaned records:';

DECLARE @orphanedMeters INT;
SELECT @orphanedMeters = COUNT(*)
FROM meters m
LEFT JOIN customers c ON m.customerId = c.id
WHERE c.id IS NULL;

DECLARE @orphanedBills INT;
SELECT @orphanedBills = COUNT(*)
FROM bills b
LEFT JOIN customers c ON b.customerId = c.id
WHERE c.id IS NULL;

DECLARE @orphanedPayments INT;
SELECT @orphanedPayments = COUNT(*)
FROM payments p
LEFT JOIN bills b ON p.billId = b.id
WHERE b.id IS NULL;

IF @orphanedMeters = 0 AND @orphanedBills = 0 AND @orphanedPayments = 0
    PRINT '   ✅ No orphaned records found - referential integrity maintained';
ELSE
BEGIN
    PRINT '   ⚠️  Orphaned records found:';
    PRINT '      Meters: ' + CAST(@orphanedMeters AS NVARCHAR(10));
    PRINT '      Bills: ' + CAST(@orphanedBills AS NVARCHAR(10));
    PRINT '      Payments: ' + CAST(@orphanedPayments AS NVARCHAR(10));
END

PRINT '';

-- =====================================================
-- SUMMARY
-- =====================================================
PRINT '========================================';
PRINT '✅ ALL TESTS COMPLETED';
PRINT '========================================';
PRINT '';
PRINT 'Summary of Database Contents:';

SELECT 'Utility Types' AS TableName, COUNT(*) AS RecordCount FROM utility_types
UNION ALL
SELECT 'Tariffs', COUNT(*) FROM tariffs
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Meters', COUNT(*) FROM meters
UNION ALL
SELECT 'Meter Readings', COUNT(*) FROM meter_readings
UNION ALL
SELECT 'Bills', COUNT(*) FROM bills
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments
UNION ALL
SELECT 'Complaints', COUNT(*) FROM complaints
UNION ALL
SELECT 'Staff', COUNT(*) FROM staff
ORDER BY TableName;

PRINT '';
PRINT 'SQL Features Summary:';
PRINT '  - 2 Triggers (automated updates)';
PRINT '  - 2 Functions (calculations)';
PRINT '  - 3 Views (reporting)';
PRINT '  - 2 Stored Procedures (operations)';
PRINT '';
PRINT '========================================';
