-- =====================================================
-- APPLY ALL SQL FEATURES TO EXISTING DATABASE
-- Run this script after database schema exists and is populated
-- =====================================================

USE utilitydb;
GO

PRINT '========================================';
PRINT 'Applying SQL Features to Utility Management System';
PRINT '========================================';
PRINT '';

-- =====================================================
-- STEP 1: DROP EXISTING OBJECTS (if they exist)
-- =====================================================
PRINT '1. Cleaning up existing objects...';

-- Drop procedures
IF OBJECT_ID('sp_GenerateBillForCustomer', 'P') IS NOT NULL
    DROP PROCEDURE sp_GenerateBillForCustomer;
IF OBJECT_ID('sp_ProcessPayment', 'P') IS NOT NULL
    DROP PROCEDURE sp_ProcessPayment;

-- Drop views
IF OBJECT_ID('vw_MonthlyRevenueReport', 'V') IS NOT NULL
    DROP VIEW vw_MonthlyRevenueReport;
IF OBJECT_ID('vw_DefaultersList', 'V') IS NOT NULL
    DROP VIEW vw_DefaultersList;
IF OBJECT_ID('vw_CustomerConsumptionSummary', 'V') IS NOT NULL
    DROP VIEW vw_CustomerConsumptionSummary;

-- Drop functions
IF OBJECT_ID('dbo.fn_CalculateBillAmount', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_CalculateBillAmount;
IF OBJECT_ID('dbo.fn_CalculateLateFee', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_CalculateLateFee;

-- Drop triggers
IF OBJECT_ID('trg_UpdateBillOnPayment', 'TR') IS NOT NULL
    DROP TRIGGER trg_UpdateBillOnPayment;
IF OBJECT_ID('trg_UpdateBillStatus', 'TR') IS NOT NULL
    DROP TRIGGER trg_UpdateBillStatus;

PRINT '   ✓ Cleanup completed';
PRINT '';

-- =====================================================
-- STEP 2: CREATE TRIGGERS
-- =====================================================
PRINT '2. Creating triggers...';

-- Trigger 1: Update Bill on Payment
CREATE TRIGGER trg_UpdateBillOnPayment
ON payments
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE b
    SET
        b.paidAmount = b.paidAmount + i.amount,
        b.outstandingAmount = b.totalAmount - (b.paidAmount + i.amount),
        b.status = CASE
            WHEN b.totalAmount - (b.paidAmount + i.amount) <= 0 THEN 'PAID'
            WHEN b.paidAmount + i.amount > 0 AND b.totalAmount - (b.paidAmount + i.amount) > 0 THEN 'PARTIALLY_PAID'
            ELSE b.status
        END,
        b.updatedAt = GETDATE()
    FROM bills b
    INNER JOIN inserted i ON b.id = i.billId;
END;
GO

PRINT '   ✓ trg_UpdateBillOnPayment created';

-- Trigger 2: Update Bill Status to Overdue
CREATE TRIGGER trg_UpdateBillStatus
ON bills
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE b
    SET
        b.status = 'OVERDUE',
        b.updatedAt = GETDATE()
    FROM bills b
    INNER JOIN inserted i ON b.id = i.id
    WHERE
        b.dueDate < GETDATE()
        AND b.outstandingAmount > 0
        AND b.status IN ('UNPAID', 'PARTIALLY_PAID');
END;
GO

PRINT '   ✓ trg_UpdateBillStatus created';
PRINT '';

-- =====================================================
-- STEP 3: CREATE FUNCTIONS
-- =====================================================
PRINT '3. Creating functions...';

-- Function 1: Calculate Bill Amount
CREATE FUNCTION dbo.fn_CalculateBillAmount
(
    @utilityTypeId NVARCHAR(450),
    @consumption FLOAT
)
RETURNS FLOAT
AS
BEGIN
    DECLARE @totalAmount FLOAT = 0;
    DECLARE @remainingConsumption FLOAT = @consumption;
    DECLARE @slabRate FLOAT;
    DECLARE @slabMin FLOAT;
    DECLARE @slabMax FLOAT;
    DECLARE @fixedCharge FLOAT;
    DECLARE @slabConsumption FLOAT;

    DECLARE tariff_cursor CURSOR FOR
    SELECT rate, minUsage, maxUsage, fixedCharge
    FROM tariffs
    WHERE utilityTypeId = @utilityTypeId
        AND isActive = 1
        AND effectiveFrom <= GETDATE()
        AND (effectiveTo IS NULL OR effectiveTo >= GETDATE())
    ORDER BY minUsage;

    OPEN tariff_cursor;
    FETCH NEXT FROM tariff_cursor INTO @slabRate, @slabMin, @slabMax, @fixedCharge;

    WHILE @@FETCH_STATUS = 0 AND @remainingConsumption > 0
    BEGIN
        IF @consumption >= @slabMin
        BEGIN
            SET @totalAmount = @totalAmount + @fixedCharge;
        END

        IF @slabMax IS NULL
        BEGIN
            SET @slabConsumption = @remainingConsumption;
        END
        ELSE
        BEGIN
            SET @slabConsumption = CASE
                WHEN @remainingConsumption > (@slabMax - @slabMin)
                THEN (@slabMax - @slabMin)
                ELSE @remainingConsumption
            END;
        END

        SET @totalAmount = @totalAmount + (@slabConsumption * @slabRate);
        SET @remainingConsumption = @remainingConsumption - @slabConsumption;

        FETCH NEXT FROM tariff_cursor INTO @slabRate, @slabMin, @slabMax, @fixedCharge;
    END;

    CLOSE tariff_cursor;
    DEALLOCATE tariff_cursor;

    RETURN ROUND(@totalAmount, 2);
END;
GO

PRINT '   ✓ fn_CalculateBillAmount created';

-- Function 2: Calculate Late Fee
CREATE FUNCTION dbo.fn_CalculateLateFee
(
    @outstandingAmount FLOAT,
    @dueDate DATETIME2
)
RETURNS FLOAT
AS
BEGIN
    DECLARE @lateFee FLOAT = 0;
    DECLARE @daysOverdue INT;
    DECLARE @monthsOverdue INT;

    SET @daysOverdue = DATEDIFF(DAY, @dueDate, GETDATE());

    IF @daysOverdue > 0 AND @outstandingAmount > 0
    BEGIN
        IF @daysOverdue <= 30
        BEGIN
            SET @lateFee = @outstandingAmount * 0.02;
        END
        ELSE
        BEGIN
            SET @monthsOverdue = @daysOverdue / 30;
            SET @lateFee = @outstandingAmount * (0.02 + ((@monthsOverdue - 1) * 0.01));
        END

        IF @lateFee > (@outstandingAmount * 0.25)
        BEGIN
            SET @lateFee = @outstandingAmount * 0.25;
        END
    END

    RETURN ROUND(@lateFee, 2);
END;
GO

PRINT '   ✓ fn_CalculateLateFee created';
PRINT '';

-- =====================================================
-- STEP 4: CREATE VIEWS
-- =====================================================
PRINT '4. Creating views...';

-- View 1: Monthly Revenue Report
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

PRINT '   ✓ vw_MonthlyRevenueReport created';

-- View 2: Defaulters List
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

PRINT '   ✓ vw_DefaultersList created';

-- View 3: Customer Consumption Summary
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

PRINT '   ✓ vw_CustomerConsumptionSummary created';
PRINT '';

-- =====================================================
-- STEP 5: CREATE STORED PROCEDURES
-- =====================================================
PRINT '5. Creating stored procedures...';

-- Procedure 1: Generate Bill for Customer
CREATE PROCEDURE sp_GenerateBillForCustomer
    @customerId NVARCHAR(450),
    @billingMonth INT,
    @billingYear INT,
    @utilityTypeId NVARCHAR(450)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @billId NVARCHAR(450);
    DECLARE @meterId NVARCHAR(450);
    DECLARE @previousReading FLOAT;
    DECLARE @currentReading FLOAT;
    DECLARE @consumption FLOAT;
    DECLARE @totalAmount FLOAT;
    DECLARE @billNumber NVARCHAR(100);
    DECLARE @issueDate DATETIME2 = GETDATE();
    DECLARE @dueDate DATETIME2;
    DECLARE @errorMsg NVARCHAR(500);

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM customers WHERE id = @customerId AND isActive = 1)
        BEGIN
            SET @errorMsg = 'Customer not found or inactive: ' + @customerId;
            THROW 50001, @errorMsg, 1;
        END

        IF EXISTS (
            SELECT 1 FROM bills
            WHERE customerId = @customerId
                AND billingMonth = @billingMonth
                AND billingYear = @billingYear
        )
        BEGIN
            SET @errorMsg = 'Bill already exists for this customer and period';
            THROW 50002, @errorMsg, 1;
        END

        SELECT @meterId = id
        FROM meters
        WHERE customerId = @customerId
            AND utilityTypeId = @utilityTypeId
            AND status = 'ACTIVE';

        IF @meterId IS NULL
        BEGIN
            SET @errorMsg = 'No active meter found for this customer and utility type';
            THROW 50003, @errorMsg, 1;
        END

        SELECT TOP 2
            @currentReading = CASE WHEN ROW_NUMBER() OVER (ORDER BY readingDate DESC) = 1 THEN readingValue ELSE @currentReading END,
            @previousReading = CASE WHEN ROW_NUMBER() OVER (ORDER BY readingDate DESC) = 2 THEN readingValue ELSE @previousReading END
        FROM meter_readings
        WHERE meterId = @meterId
        ORDER BY readingDate DESC;

        IF @currentReading IS NULL
        BEGIN
            SET @errorMsg = 'No meter readings found for this meter';
            THROW 50004, @errorMsg, 1;
        END

        IF @previousReading IS NULL
            SET @previousReading = 0;

        SET @consumption = @currentReading - @previousReading;

        IF @consumption < 0
        BEGIN
            SET @errorMsg = 'Invalid consumption: Current reading is less than previous reading';
            THROW 50005, @errorMsg, 1;
        END

        SET @totalAmount = dbo.fn_CalculateBillAmount(@utilityTypeId, @consumption);

        DECLARE @billCount INT;
        SELECT @billCount = COUNT(*) + 1
        FROM bills
        WHERE billingYear = @billingYear AND billingMonth = @billingMonth;

        SET @billNumber = 'BILL' + CAST(@billingYear AS NVARCHAR(4)) +
                         RIGHT('0' + CAST(@billingMonth AS NVARCHAR(2)), 2) +
                         RIGHT('00000' + CAST(@billCount AS NVARCHAR(5)), 5);

        SET @dueDate = DATEADD(DAY, 15, @issueDate);
        SET @billId = LOWER(NEWID());

        INSERT INTO bills (
            id, billNumber, customerId, billingMonth, billingYear,
            issueDate, dueDate, previousReading, currentReading,
            consumption, totalAmount, paidAmount, outstandingAmount,
            status, createdAt, updatedAt
        )
        VALUES (
            @billId, @billNumber, @customerId, @billingMonth, @billingYear,
            @issueDate, @dueDate, @previousReading, @currentReading,
            @consumption, @totalAmount, 0, @totalAmount,
            'UNPAID', @issueDate, @issueDate
        );

        COMMIT TRANSACTION;

        SELECT
            @billId AS billId,
            @billNumber AS billNumber,
            @consumption AS consumption,
            @totalAmount AS totalAmount,
            'Bill generated successfully' AS message;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO

PRINT '   ✓ sp_GenerateBillForCustomer created';

-- Procedure 2: Process Payment
CREATE PROCEDURE sp_ProcessPayment
    @billId NVARCHAR(450),
    @amount FLOAT,
    @paymentMethod NVARCHAR(50),
    @referenceNumber NVARCHAR(100) = NULL,
    @recordedBy NVARCHAR(100) = NULL,
    @remarks NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @paymentId NVARCHAR(450);
    DECLARE @outstandingAmount FLOAT;
    DECLARE @billNumber NVARCHAR(100);
    DECLARE @customerName NVARCHAR(255);
    DECLARE @errorMsg NVARCHAR(500);
    DECLARE @paymentDate DATETIME2 = GETDATE();

    BEGIN TRY
        BEGIN TRANSACTION;

        IF @paymentMethod NOT IN ('CASH', 'CARD', 'ONLINE', 'BANK_TRANSFER')
        BEGIN
            SET @errorMsg = 'Invalid payment method. Must be: CASH, CARD, ONLINE, or BANK_TRANSFER';
            THROW 50011, @errorMsg, 1;
        END

        IF @amount <= 0
        BEGIN
            SET @errorMsg = 'Payment amount must be greater than zero';
            THROW 50012, @errorMsg, 1;
        END

        SELECT
            @outstandingAmount = b.outstandingAmount,
            @billNumber = b.billNumber,
            @customerName = c.name
        FROM bills b
        INNER JOIN customers c ON b.customerId = c.id
        WHERE b.id = @billId;

        IF @billNumber IS NULL
        BEGIN
            SET @errorMsg = 'Bill not found: ' + @billId;
            THROW 50013, @errorMsg, 1;
        END

        IF @outstandingAmount <= 0
        BEGIN
            SET @errorMsg = 'Bill ' + @billNumber + ' is already fully paid';
            THROW 50014, @errorMsg, 1;
        END

        IF @amount > @outstandingAmount
        BEGIN
            SET @remarks = ISNULL(@remarks, '') + ' [WARNING: Payment exceeds outstanding amount by ' +
                          CAST((@amount - @outstandingAmount) AS NVARCHAR(50)) + ']';
        END

        SET @paymentId = LOWER(NEWID());

        INSERT INTO payments (
            id, billId, amount, paymentMethod, paymentDate,
            referenceNumber, recordedBy, remarks,
            createdAt, updatedAt
        )
        VALUES (
            @paymentId, @billId, @amount, @paymentMethod, @paymentDate,
            @referenceNumber, @recordedBy, @remarks,
            @paymentDate, @paymentDate
        );

        COMMIT TRANSACTION;

        SELECT
            @paymentId AS paymentId,
            @billNumber AS billNumber,
            @customerName AS customerName,
            @amount AS amountPaid,
            b.outstandingAmount AS newOutstandingAmount,
            b.status AS newBillStatus,
            'Payment processed successfully' AS message
        FROM bills b
        WHERE b.id = @billId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO

PRINT '   ✓ sp_ProcessPayment created';
PRINT '';

-- =====================================================
-- VERIFICATION
-- =====================================================
PRINT '========================================';
PRINT 'VERIFICATION - SQL Objects Created:';
PRINT '========================================';
PRINT '';

PRINT 'TRIGGERS (2):';
SELECT '  ✓ ' + name AS TriggerName
FROM sys.triggers
WHERE parent_class_desc = 'OBJECT_OR_COLUMN'
    AND name IN ('trg_UpdateBillOnPayment', 'trg_UpdateBillStatus');
PRINT '';

PRINT 'FUNCTIONS (2):';
SELECT '  ✓ ' + name AS FunctionName
FROM sys.objects
WHERE type IN ('FN')
    AND name IN ('fn_CalculateBillAmount', 'fn_CalculateLateFee');
PRINT '';

PRINT 'VIEWS (3):';
SELECT '  ✓ ' + TABLE_NAME AS ViewName
FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_NAME IN ('vw_MonthlyRevenueReport', 'vw_DefaultersList', 'vw_CustomerConsumptionSummary');
PRINT '';

PRINT 'STORED PROCEDURES (2):';
SELECT '  ✓ ' + name AS ProcedureName
FROM sys.procedures
WHERE name IN ('sp_GenerateBillForCustomer', 'sp_ProcessPayment');
PRINT '';

PRINT '========================================';
PRINT '✅ ALL SQL FEATURES APPLIED SUCCESSFULLY!';
PRINT '========================================';
PRINT '';
PRINT 'You can now use:';
PRINT '  - Triggers: Automatic bill updates and status management';
PRINT '  - Functions: Bill calculation and late fee calculation';
PRINT '  - Views: Revenue reports, defaulters list, consumption summary';
PRINT '  - Procedures: Generate bills and process payments';
PRINT '';
