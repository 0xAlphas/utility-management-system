-- =====================================================
-- Utility Management System - Triggers
-- =====================================================

-- Drop existing triggers if they exist
IF OBJECT_ID('trg_UpdateBillOnPayment', 'TR') IS NOT NULL
    DROP TRIGGER trg_UpdateBillOnPayment;
GO

IF OBJECT_ID('trg_UpdateBillStatus', 'TR') IS NOT NULL
    DROP TRIGGER trg_UpdateBillStatus;
GO

-- =====================================================
-- TRIGGER 1: trg_UpdateBillOnPayment
-- Description: Automatically updates bill amounts and status when a payment is added
-- Business Logic:
--   - Updates paidAmount by adding the new payment
--   - Recalculates outstandingAmount (totalAmount - paidAmount)
--   - Updates bill status based on payment:
--     * PAID if fully paid
--     * PARTIALLY_PAID if partially paid
-- =====================================================
CREATE TRIGGER trg_UpdateBillOnPayment
ON payments
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- Update bill with new payment information
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

    PRINT 'Trigger: Bill payment amounts and status updated successfully';
END;
GO

-- =====================================================
-- TRIGGER 2: trg_UpdateBillStatus
-- Description: Automatically updates bill status to OVERDUE if past due date
-- Business Logic:
--   - Checks if bill's due date has passed
--   - Changes status from UNPAID or PARTIALLY_PAID to OVERDUE
--   - Only affects bills that are not fully paid
-- Note: This trigger fires on bill INSERT or UPDATE
-- =====================================================
CREATE TRIGGER trg_UpdateBillStatus
ON bills
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Update bills to OVERDUE if past due date and not fully paid
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

    IF @@ROWCOUNT > 0
        PRINT 'Trigger: Overdue bills status updated';
END;
GO

-- =====================================================
-- Test Trigger Functionality
-- =====================================================

PRINT '';
PRINT '=== TRIGGERS CREATED SUCCESSFULLY ===';
PRINT '';
PRINT 'Trigger 1: trg_UpdateBillOnPayment';
PRINT '  - Automatically updates bill amounts when payment is added';
PRINT '  - Updates paidAmount, outstandingAmount, and status';
PRINT '';
PRINT 'Trigger 2: trg_UpdateBillStatus';
PRINT '  - Automatically marks bills as OVERDUE when past due date';
PRINT '  - Only affects unpaid or partially paid bills';
PRINT '';
GO
