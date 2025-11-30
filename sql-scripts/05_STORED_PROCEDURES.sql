-- =====================================================
-- Utility Management System - Stored Procedures
-- =====================================================

-- Drop existing procedures if they exist
IF OBJECT_ID('sp_GenerateBillForCustomer', 'P') IS NOT NULL
    DROP PROCEDURE sp_GenerateBillForCustomer;
GO

IF OBJECT_ID('sp_ProcessPayment', 'P') IS NOT NULL
    DROP PROCEDURE sp_ProcessPayment;
GO

-- =====================================================
-- PROCEDURE 1: sp_GenerateBillForCustomer
-- Description: Generates a bill for a customer for a specific billing period
-- Parameters:
--   @customerId - Customer ID
--   @billingMonth - Month (1-12)
--   @billingYear - Year
--   @utilityTypeId - Utility type (Electricity, Water, Gas)
-- Business Logic:
--   - Gets latest two meter readings for the period
--   - Calculates consumption (current - previous reading)
--   - Uses fn_CalculateBillAmount to calculate total
--   - Generates unique bill number
--   - Sets due date to 15 days from issue date
--   - Creates bill record
-- Returns: Bill ID or error message
-- =====================================================
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

        -- Check if customer exists and is active
        IF NOT EXISTS (SELECT 1 FROM customers WHERE id = @customerId AND isActive = 1)
        BEGIN
            SET @errorMsg = 'Customer not found or inactive: ' + @customerId;
            THROW 50001, @errorMsg, 1;
        END

        -- Check if bill already exists for this period
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

        -- Get meter for this customer and utility type
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

        -- Get the latest two readings
        SELECT TOP 2
            @currentReading = CASE WHEN ROW_NUMBER() OVER (ORDER BY readingDate DESC) = 1 THEN readingValue ELSE @currentReading END,
            @previousReading = CASE WHEN ROW_NUMBER() OVER (ORDER BY readingDate DESC) = 2 THEN readingValue ELSE @previousReading END
        FROM meter_readings
        WHERE meterId = @meterId
        ORDER BY readingDate DESC;

        -- Check if we have readings
        IF @currentReading IS NULL
        BEGIN
            SET @errorMsg = 'No meter readings found for this meter';
            THROW 50004, @errorMsg, 1;
        END

        -- If no previous reading, set to 0
        IF @previousReading IS NULL
            SET @previousReading = 0;

        -- Calculate consumption
        SET @consumption = @currentReading - @previousReading;

        -- Validate consumption
        IF @consumption < 0
        BEGIN
            SET @errorMsg = 'Invalid consumption: Current reading is less than previous reading';
            THROW 50005, @errorMsg, 1;
        END

        -- Calculate total amount using UDF
        SET @totalAmount = dbo.fn_CalculateBillAmount(@utilityTypeId, @consumption);

        -- Generate bill number (format: BILL-YYYYMM-XXXXX)
        DECLARE @billCount INT;
        SELECT @billCount = COUNT(*) + 1
        FROM bills
        WHERE billingYear = @billingYear AND billingMonth = @billingMonth;

        SET @billNumber = 'BILL' + CAST(@billingYear AS NVARCHAR(4)) +
                         RIGHT('0' + CAST(@billingMonth AS NVARCHAR(2)), 2) +
                         RIGHT('00000' + CAST(@billCount AS NVARCHAR(5)), 5);

        -- Set due date (15 days from issue date)
        SET @dueDate = DATEADD(DAY, 15, @issueDate);

        -- Generate new bill ID
        SET @billId = LOWER(NEWID());

        -- Create bill
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

        -- Return success message
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

-- =====================================================
-- PROCEDURE 2: sp_ProcessPayment
-- Description: Processes a payment for a bill
-- Parameters:
--   @billId - Bill ID
--   @amount - Payment amount
--   @paymentMethod - CASH, CARD, ONLINE, BANK_TRANSFER
--   @referenceNumber - Optional payment reference
--   @recordedBy - Staff username who recorded the payment
--   @remarks - Optional remarks
-- Business Logic:
--   - Validates bill exists and is not fully paid
--   - Validates payment amount doesn't exceed outstanding
--   - Creates payment record
--   - Updates bill amounts via trigger (automatic)
-- Returns: Payment ID and updated bill status
-- =====================================================
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

        -- Validate payment method
        IF @paymentMethod NOT IN ('CASH', 'CARD', 'ONLINE', 'BANK_TRANSFER')
        BEGIN
            SET @errorMsg = 'Invalid payment method. Must be: CASH, CARD, ONLINE, or BANK_TRANSFER';
            THROW 50011, @errorMsg, 1;
        END

        -- Validate amount
        IF @amount <= 0
        BEGIN
            SET @errorMsg = 'Payment amount must be greater than zero';
            THROW 50012, @errorMsg, 1;
        END

        -- Get bill details
        SELECT
            @outstandingAmount = b.outstandingAmount,
            @billNumber = b.billNumber,
            @customerName = c.name
        FROM bills b
        INNER JOIN customers c ON b.customerId = c.id
        WHERE b.id = @billId;

        -- Check if bill exists
        IF @billNumber IS NULL
        BEGIN
            SET @errorMsg = 'Bill not found: ' + @billId;
            THROW 50013, @errorMsg, 1;
        END

        -- Check if bill is already fully paid
        IF @outstandingAmount <= 0
        BEGIN
            SET @errorMsg = 'Bill ' + @billNumber + ' is already fully paid';
            THROW 50014, @errorMsg, 1;
        END

        -- Validate payment doesn't exceed outstanding (allow overpayment warning)
        IF @amount > @outstandingAmount
        BEGIN
            SET @remarks = ISNULL(@remarks, '') + ' [WARNING: Payment exceeds outstanding amount by ' +
                          CAST((@amount - @outstandingAmount) AS NVARCHAR(50)) + ']';
        END

        -- Generate payment ID
        SET @paymentId = LOWER(NEWID());

        -- Create payment record
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

        -- Note: Bill amounts and status are updated automatically by trigger trg_UpdateBillOnPayment

        COMMIT TRANSACTION;

        -- Return success with updated bill info
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

-- =====================================================
-- Test Stored Procedures
-- =====================================================

PRINT '';
PRINT '=== STORED PROCEDURES CREATED SUCCESSFULLY ===';
PRINT '';
PRINT 'Procedure 1: sp_GenerateBillForCustomer';
PRINT '  - Generates bill for a customer for specific period';
PRINT '  - Parameters: @customerId, @billingMonth, @billingYear, @utilityTypeId';
PRINT '  - Returns: Bill details';
PRINT '  - Usage Example:';
PRINT '    EXEC sp_GenerateBillForCustomer';
PRINT '      @customerId = ''customer-id'',';
PRINT '      @billingMonth = 11,';
PRINT '      @billingYear = 2025,';
PRINT '      @utilityTypeId = ''utility-type-id'';';
PRINT '';
PRINT 'Procedure 2: sp_ProcessPayment';
PRINT '  - Processes payment for a bill';
PRINT '  - Parameters: @billId, @amount, @paymentMethod, @referenceNumber, @recordedBy, @remarks';
PRINT '  - Returns: Payment confirmation and updated bill status';
PRINT '  - Usage Example:';
PRINT '    EXEC sp_ProcessPayment';
PRINT '      @billId = ''bill-id'',';
PRINT '      @amount = 1500.00,';
PRINT '      @paymentMethod = ''CASH'',';
PRINT '      @recordedBy = ''clerk01'';';
PRINT '';
GO
