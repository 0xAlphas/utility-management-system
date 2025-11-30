-- =====================================================
-- Utility Management System - Database Schema
-- SQL Server Implementation
-- =====================================================

-- Drop existing tables if they exist (in correct order due to FK constraints)
IF OBJECT_ID('payments', 'U') IS NOT NULL DROP TABLE payments;
IF OBJECT_ID('bills', 'U') IS NOT NULL DROP TABLE bills;
IF OBJECT_ID('meter_readings', 'U') IS NOT NULL DROP TABLE meter_readings;
IF OBJECT_ID('meters', 'U') IS NOT NULL DROP TABLE meters;
IF OBJECT_ID('complaints', 'U') IS NOT NULL DROP TABLE complaints;
IF OBJECT_ID('customers', 'U') IS NOT NULL DROP TABLE customers;
IF OBJECT_ID('tariffs', 'U') IS NOT NULL DROP TABLE tariffs;
IF OBJECT_ID('utility_types', 'U') IS NOT NULL DROP TABLE utility_types;
IF OBJECT_ID('staff', 'U') IS NOT NULL DROP TABLE staff;
GO

-- =====================================================
-- Table: utility_types
-- Description: Stores different types of utilities (Electricity, Water, Gas)
-- =====================================================
CREATE TABLE utility_types (
    id NVARCHAR(450) PRIMARY KEY,
    name NVARCHAR(255) UNIQUE NOT NULL,
    description NVARCHAR(MAX),
    unit NVARCHAR(50) NOT NULL,
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

-- =====================================================
-- Table: tariffs
-- Description: Stores tariff/pricing information for utilities
-- Supports slab-based pricing (min-max usage ranges)
-- =====================================================
CREATE TABLE tariffs (
    id NVARCHAR(450) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    minUsage FLOAT NOT NULL DEFAULT 0,
    maxUsage FLOAT,
    rate FLOAT NOT NULL,
    fixedCharge FLOAT NOT NULL DEFAULT 0,
    isActive BIT NOT NULL DEFAULT 1,
    effectiveFrom DATETIME2 NOT NULL DEFAULT GETDATE(),
    effectiveTo DATETIME2,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    utilityTypeId NVARCHAR(450) NOT NULL,
    CONSTRAINT FK_tariffs_utilityTypes FOREIGN KEY (utilityTypeId)
        REFERENCES utility_types(id),
    CONSTRAINT CHK_tariffs_rate CHECK (rate >= 0),
    CONSTRAINT CHK_tariffs_minUsage CHECK (minUsage >= 0),
    CONSTRAINT CHK_tariffs_fixedCharge CHECK (fixedCharge >= 0)
);
GO

-- =====================================================
-- Table: customers
-- Description: Stores customer information
-- Types: HOUSEHOLD, BUSINESS, GOVERNMENT
-- =====================================================
CREATE TABLE customers (
    id NVARCHAR(450) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    type NVARCHAR(50) NOT NULL,
    contact NVARCHAR(50) NOT NULL,
    email NVARCHAR(255),
    address NVARCHAR(MAX) NOT NULL,
    city NVARCHAR(100),
    postalCode NVARCHAR(20),
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CHK_customers_type CHECK (type IN ('HOUSEHOLD', 'BUSINESS', 'GOVERNMENT'))
);
GO

-- =====================================================
-- Table: meters
-- Description: Stores utility meters assigned to customers
-- Each customer can have one meter per utility type
-- =====================================================
CREATE TABLE meters (
    id NVARCHAR(450) PRIMARY KEY,
    meterNumber NVARCHAR(100) UNIQUE NOT NULL,
    installationDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    lastReadingDate DATETIME2,
    status NVARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    customerId NVARCHAR(450) NOT NULL,
    utilityTypeId NVARCHAR(450) NOT NULL,
    CONSTRAINT FK_meters_customers FOREIGN KEY (customerId)
        REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT FK_meters_utilityTypes FOREIGN KEY (utilityTypeId)
        REFERENCES utility_types(id),
    CONSTRAINT UQ_meters_customer_utility UNIQUE (customerId, utilityTypeId),
    CONSTRAINT CHK_meters_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'FAULTY', 'REMOVED'))
);
GO

-- =====================================================
-- Table: meter_readings
-- Description: Stores periodic meter readings
-- Used for billing calculation
-- =====================================================
CREATE TABLE meter_readings (
    id NVARCHAR(450) PRIMARY KEY,
    readingValue FLOAT NOT NULL,
    readingDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    remarks NVARCHAR(MAX),
    recordedBy NVARCHAR(100),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    meterId NVARCHAR(450) NOT NULL,
    CONSTRAINT FK_meterReadings_meters FOREIGN KEY (meterId)
        REFERENCES meters(id) ON DELETE CASCADE,
    CONSTRAINT CHK_meterReadings_value CHECK (readingValue >= 0)
);
GO

-- =====================================================
-- Table: bills
-- Description: Stores billing information
-- Status: UNPAID, PARTIALLY_PAID, PAID, OVERDUE
-- =====================================================
CREATE TABLE bills (
    id NVARCHAR(450) PRIMARY KEY,
    billNumber NVARCHAR(100) UNIQUE NOT NULL,
    billingMonth INT NOT NULL,
    billingYear INT NOT NULL,
    issueDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    dueDate DATETIME2 NOT NULL,
    previousReading FLOAT,
    currentReading FLOAT,
    consumption FLOAT NOT NULL DEFAULT 0,
    totalAmount FLOAT NOT NULL,
    paidAmount FLOAT NOT NULL DEFAULT 0,
    outstandingAmount FLOAT NOT NULL DEFAULT 0,
    status NVARCHAR(50) NOT NULL DEFAULT 'UNPAID',
    remarks NVARCHAR(MAX),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    customerId NVARCHAR(450) NOT NULL,
    CONSTRAINT FK_bills_customers FOREIGN KEY (customerId)
        REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT UQ_bills_customer_period UNIQUE (customerId, billingMonth, billingYear),
    CONSTRAINT CHK_bills_month CHECK (billingMonth BETWEEN 1 AND 12),
    CONSTRAINT CHK_bills_year CHECK (billingYear >= 2000 AND billingYear <= 2100),
    CONSTRAINT CHK_bills_consumption CHECK (consumption >= 0),
    CONSTRAINT CHK_bills_totalAmount CHECK (totalAmount >= 0),
    CONSTRAINT CHK_bills_paidAmount CHECK (paidAmount >= 0),
    CONSTRAINT CHK_bills_outstandingAmount CHECK (outstandingAmount >= 0),
    CONSTRAINT CHK_bills_status CHECK (status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'))
);
GO

-- =====================================================
-- Table: payments
-- Description: Stores payment records for bills
-- Methods: CASH, CARD, ONLINE, BANK_TRANSFER
-- =====================================================
CREATE TABLE payments (
    id NVARCHAR(450) PRIMARY KEY,
    amount FLOAT NOT NULL,
    paymentDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    paymentMethod NVARCHAR(50) NOT NULL,
    referenceNumber NVARCHAR(100),
    remarks NVARCHAR(MAX),
    recordedBy NVARCHAR(100),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    billId NVARCHAR(450) NOT NULL,
    CONSTRAINT FK_payments_bills FOREIGN KEY (billId)
        REFERENCES bills(id) ON DELETE CASCADE,
    CONSTRAINT CHK_payments_amount CHECK (amount > 0),
    CONSTRAINT CHK_payments_method CHECK (paymentMethod IN ('CASH', 'CARD', 'ONLINE', 'BANK_TRANSFER'))
);
GO

-- =====================================================
-- Table: complaints
-- Description: Stores customer complaints
-- Status: OPEN, IN_PROGRESS, RESOLVED, CLOSED
-- Priority: LOW, MEDIUM, HIGH, URGENT
-- =====================================================
CREATE TABLE complaints (
    id NVARCHAR(450) PRIMARY KEY,
    subject NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'OPEN',
    priority NVARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    resolution NVARCHAR(MAX),
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    resolvedAt DATETIME2,
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    customerId NVARCHAR(450) NOT NULL,
    CONSTRAINT FK_complaints_customers FOREIGN KEY (customerId)
        REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT CHK_complaints_status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    CONSTRAINT CHK_complaints_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))
);
GO

-- =====================================================
-- Table: staff
-- Description: Stores staff/employee information
-- Roles: ADMIN, MANAGER, CLERK, METER_READER
-- =====================================================
CREATE TABLE staff (
    id NVARCHAR(450) PRIMARY KEY,
    username NVARCHAR(100) UNIQUE NOT NULL,
    passwordHash NVARCHAR(255) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) UNIQUE,
    role NVARCHAR(50) NOT NULL,
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CHK_staff_role CHECK (role IN ('ADMIN', 'MANAGER', 'CLERK', 'METER_READER'))
);
GO

-- =====================================================
-- Create Indexes for Performance Optimization
-- =====================================================

-- Index on customer lookups
CREATE INDEX IDX_customers_type ON customers(type);
CREATE INDEX IDX_customers_city ON customers(city);
CREATE INDEX IDX_customers_isActive ON customers(isActive);

-- Index on meter lookups
CREATE INDEX IDX_meters_customerId ON meters(customerId);
CREATE INDEX IDX_meters_utilityTypeId ON meters(utilityTypeId);
CREATE INDEX IDX_meters_status ON meters(status);

-- Index on meter readings
CREATE INDEX IDX_meterReadings_meterId ON meter_readings(meterId);
CREATE INDEX IDX_meterReadings_date ON meter_readings(readingDate);

-- Index on bills
CREATE INDEX IDX_bills_customerId ON bills(customerId);
CREATE INDEX IDX_bills_status ON bills(status);
CREATE INDEX IDX_bills_period ON bills(billingYear, billingMonth);
CREATE INDEX IDX_bills_dueDate ON bills(dueDate);

-- Index on payments
CREATE INDEX IDX_payments_billId ON payments(billId);
CREATE INDEX IDX_payments_date ON payments(paymentDate);
CREATE INDEX IDX_payments_method ON payments(paymentMethod);

-- Index on complaints
CREATE INDEX IDX_complaints_customerId ON complaints(customerId);
CREATE INDEX IDX_complaints_status ON complaints(status);
CREATE INDEX IDX_complaints_priority ON complaints(priority);

-- Index on tariffs
CREATE INDEX IDX_tariffs_utilityTypeId ON tariffs(utilityTypeId);
CREATE INDEX IDX_tariffs_active ON tariffs(isActive);

GO

PRINT 'Database schema created successfully!';
GO
