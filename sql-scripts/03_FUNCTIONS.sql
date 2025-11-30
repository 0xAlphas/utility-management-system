-- =====================================================
-- Utility Management System - User Defined Functions
-- =====================================================

-- Drop existing functions if they exist
IF OBJECT_ID('dbo.fn_CalculateBillAmount', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_CalculateBillAmount;
GO

IF OBJECT_ID('dbo.fn_CalculateLateFee', 'FN') IS NOT NULL
    DROP FUNCTION dbo.fn_CalculateLateFee;
GO

-- =====================================================
-- FUNCTION 1: fn_CalculateBillAmount
-- Description: Calculates total bill amount based on consumption and tariff slabs
-- Parameters:
--   @utilityTypeId - The utility type (Electricity, Water, Gas)
--   @consumption - The consumption amount
-- Returns: Total bill amount (including fixed charges and slab-based rates)
-- Business Logic:
--   - Applies slab-based pricing (progressive tariffs)
--   - Adds fixed charges from applicable tariff slabs
--   - Returns 0 if no tariffs found
-- =====================================================
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

    -- Get all active tariffs for the utility type, ordered by minUsage
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
        -- Add fixed charge (only for the first applicable slab)
        IF @consumption >= @slabMin
        BEGIN
            SET @totalAmount = @totalAmount + @fixedCharge;
        END

        -- Calculate consumption for this slab
        IF @slabMax IS NULL
        BEGIN
            -- Unlimited upper limit
            SET @slabConsumption = @remainingConsumption;
        END
        ELSE
        BEGIN
            -- Limited upper limit
            SET @slabConsumption = CASE
                WHEN @remainingConsumption > (@slabMax - @slabMin)
                THEN (@slabMax - @slabMin)
                ELSE @remainingConsumption
            END;
        END

        -- Add amount for this slab
        SET @totalAmount = @totalAmount + (@slabConsumption * @slabRate);
        SET @remainingConsumption = @remainingConsumption - @slabConsumption;

        FETCH NEXT FROM tariff_cursor INTO @slabRate, @slabMin, @slabMax, @fixedCharge;
    END;

    CLOSE tariff_cursor;
    DEALLOCATE tariff_cursor;

    RETURN ROUND(@totalAmount, 2);
END;
GO

-- =====================================================
-- FUNCTION 2: fn_CalculateLateFee
-- Description: Calculates late payment fee based on outstanding amount and days overdue
-- Parameters:
--   @outstandingAmount - The unpaid amount
--   @dueDate - The bill's due date
-- Returns: Late fee amount
-- Business Logic:
--   - Charges 2% penalty for first 30 days overdue
--   - Charges additional 1% per month after 30 days
--   - Maximum late fee capped at 25% of outstanding amount
--   - Returns 0 if not overdue
-- =====================================================
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

    -- Calculate days overdue
    SET @daysOverdue = DATEDIFF(DAY, @dueDate, GETDATE());

    -- Only calculate if overdue
    IF @daysOverdue > 0 AND @outstandingAmount > 0
    BEGIN
        -- First 30 days: 2% penalty
        IF @daysOverdue <= 30
        BEGIN
            SET @lateFee = @outstandingAmount * 0.02;
        END
        ELSE
        BEGIN
            -- After 30 days: 2% base + 1% per additional month
            SET @monthsOverdue = @daysOverdue / 30;
            SET @lateFee = @outstandingAmount * (0.02 + ((@monthsOverdue - 1) * 0.01));
        END

        -- Cap at 25% of outstanding amount
        IF @lateFee > (@outstandingAmount * 0.25)
        BEGIN
            SET @lateFee = @outstandingAmount * 0.25;
        END
    END

    RETURN ROUND(@lateFee, 2);
END;
GO

-- =====================================================
-- Test Functions
-- =====================================================

PRINT '';
PRINT '=== FUNCTIONS CREATED SUCCESSFULLY ===';
PRINT '';
PRINT 'Function 1: fn_CalculateBillAmount';
PRINT '  - Calculates total bill based on slab-based tariffs';
PRINT '  - Parameters: @utilityTypeId, @consumption';
PRINT '  - Returns: Total amount (FLOAT)';
PRINT '';
PRINT 'Function 2: fn_CalculateLateFee';
PRINT '  - Calculates late payment penalty';
PRINT '  - Parameters: @outstandingAmount, @dueDate';
PRINT '  - Returns: Late fee amount (FLOAT)';
PRINT '  - Business rule: 2% first 30 days, +1% per month, max 25%';
PRINT '';
GO

-- Example usage (commented out):
-- SELECT dbo.fn_CalculateBillAmount('utility-type-id', 250.5) as BillAmount;
-- SELECT dbo.fn_CalculateLateFee(1000.00, '2024-10-01') as LateFee;
