# System Design Assumptions - Utility Management System

## Overview
This document outlines the key assumptions made during the design and implementation of the Utility Management System for a Sri Lankan utility provider.

---

## 1. Business Context Assumptions

### 1.1 Organization Type
- **Assumption:** The system is designed for a government-owned or private utility provider operating in Sri Lanka
- **Rationale:** Supports typical Sri Lankan utility management workflows and billing cycles
- **Impact:** Influences currency (LKR), address formats, and business rules

### 1.2 Utility Types
- **Assumption:** The system manages three primary utilities: Electricity, Water, and Gas
- **Rationale:** These are the most common utilities managed by providers in Sri Lanka
- **Impact:** Database schema allows for future expansion to additional utility types

### 1.3 Customer Categories
- **Assumption:** Customers are categorized into three types:
  - **HOUSEHOLD:** Residential customers
  - **BUSINESS:** Commercial entities
  - **GOVERNMENT:** Government organizations and public institutions
- **Rationale:** Different customer types may have different billing rates and priority levels
- **Impact:** Enables targeted reporting and differential pricing in the future

---

## 2. Billing and Tariff Assumptions

### 2.1 Billing Frequency
- **Assumption:** Bills are generated **monthly** for each customer
- **Rationale:** Monthly billing is standard practice in Sri Lanka
- **Impact:** Bills table has billingMonth and billingYear fields
- **Constraint:** One bill per customer per month (enforced by unique constraint)

### 2.2 Tariff Structure
- **Assumption:** Tariffs follow a **slab-based (progressive) pricing model**
  - Different rates for different consumption ranges
  - Fixed charges may apply at certain slabs
  - Example: 0-100 units @ Rs. 25/unit, 101-300 units @ Rs. 35/unit
- **Rationale:** This is the standard tariff model used by Ceylon Electricity Board (CEB) and National Water Supply & Drainage Board (NWSDB)
- **Impact:** Tariffs table has minUsage, maxUsage, rate, and fixedCharge fields

### 2.3 Bill Calculation
- **Assumption:** Bills are calculated based on:
  - Consumption (current reading - previous reading)
  - Applicable tariff slabs
  - Fixed charges
- **Rationale:** Standard utility billing practice
- **Impact:** Implemented via `fn_CalculateBillAmount` function

### 2.4 Payment Terms
- **Assumption:** Payment due date is **15 days** from bill issue date
- **Rationale:** Standard payment terms for Sri Lankan utilities
- **Impact:** Due date calculated automatically in `sp_GenerateBillForCustomer`

### 2.5 Late Payment Penalties
- **Assumption:** Late fees are calculated as:
  - 2% penalty for first 30 days overdue
  - Additional 1% per month thereafter
  - Maximum 25% of outstanding amount
- **Rationale:** Common practice for utilities in Sri Lanka
- **Impact:** Implemented in `fn_CalculateLateFee` function

### 2.6 Bill Status Lifecycle
- **Assumption:** Bills have four statuses:
  - **UNPAID:** No payment received
  - **PARTIALLY_PAID:** Partial payment received
  - **PAID:** Fully paid
  - **OVERDUE:** Past due date with outstanding balance
- **Rationale:** Covers all possible payment states
- **Impact:** Triggers automatically update status based on payments and due dates

---

## 3. Meter Management Assumptions

### 3.1 Meter Assignment
- **Assumption:** Each customer can have **one meter per utility type**
  - A household can have one electricity meter, one water meter, one gas meter
  - Cannot have multiple electricity meters for the same customer
- **Rationale:** Simplifies billing and meter reading processes
- **Impact:** Unique constraint on (customerId, utilityTypeId)
- **Future Enhancement:** Could be extended to support multiple meters per utility type

### 3.2 Meter Reading Frequency
- **Assumption:** Meter readings are recorded **monthly** by field officers
- **Rationale:** Aligns with monthly billing cycle
- **Impact:** One reading per meter per month expected

### 3.3 Meter Status
- **Assumption:** Meters can be in one of four states:
  - **ACTIVE:** Currently in use
  - **INACTIVE:** Temporarily disabled
  - **FAULTY:** Requires maintenance
  - **REMOVED:** Permanently removed
- **Rationale:** Covers meter lifecycle and maintenance scenarios
- **Impact:** Only ACTIVE meters are used for billing

### 3.4 Cumulative Readings
- **Assumption:** Meter readings are **cumulative** (always increasing)
  - Current reading must be >= previous reading
  - Consumption = current - previous
- **Rationale:** Standard practice for utility meters
- **Impact:** Validation in stored procedures

---

## 4. Payment Processing Assumptions

### 4.1 Payment Methods
- **Assumption:** Four payment methods are supported:
  - **CASH:** Physical cash payment at office
  - **CARD:** Credit/debit card payment
  - **ONLINE:** Online banking or payment gateway
  - **BANK_TRANSFER:** Direct bank transfer
- **Rationale:** Common payment channels in Sri Lanka
- **Impact:** Payment method tracked for reconciliation

### 4.2 Partial Payments
- **Assumption:** Customers can make **partial payments**
  - Multiple payments allowed for a single bill
  - Bill status updates automatically based on total paid
- **Rationale:** Flexibility for customers facing financial difficulties
- **Impact:** Bills can have PARTIALLY_PAID status

### 4.3 Overpayment Handling
- **Assumption:** Payments can **exceed outstanding amount**
  - Overpayment is allowed (may be credit for future bills)
  - Warning added to payment remarks
- **Rationale:** Real-world scenario where customers pay more than owed
- **Impact:** Handled in `sp_ProcessPayment` with warning

### 4.4 Payment Recording
- **Assumption:** All payments are recorded by staff members
  - Payment includes `recordedBy` field
  - Links to staff username
- **Rationale:** Accountability and audit trail
- **Impact:** Requires staff authentication in application

---

## 5. User and Access Control Assumptions

### 5.1 Staff Roles
- **Assumption:** Four staff roles with different permissions:
  - **ADMIN:** Full system access, user management
  - **MANAGER:** Reports, analytics, oversight
  - **CLERK:** Billing, payments, customer service
  - **METER_READER:** Meter readings only
- **Rationale:** Role-based access control for security
- **Impact:** Application-level authorization (not database-level)

### 5.2 Customer Access
- **Assumption:** Customers do **not** have direct system access in this version
  - Customers are "indirect users"
  - All interactions through staff
- **Rationale:** Simplified prototype for internal use
- **Future Enhancement:** Customer portal for viewing bills and making payments

### 5.3 Password Security
- **Assumption:** Passwords are stored as **bcrypt hashes**
  - Minimum 10 salt rounds
  - Never stored in plain text
- **Rationale:** Industry-standard security practice
- **Impact:** Implemented in application layer (Next.js)

---

## 6. Complaint Management Assumptions

### 6.1 Complaint Lifecycle
- **Assumption:** Complaints go through four stages:
  - **OPEN:** Newly filed
  - **IN_PROGRESS:** Being investigated
  - **RESOLVED:** Solution provided
  - **CLOSED:** Completed and archived
- **Rationale:** Standard issue tracking workflow
- **Impact:** Status field with check constraint

### 6.2 Priority Levels
- **Assumption:** Complaints have four priority levels:
  - **LOW:** Non-urgent issues
  - **MEDIUM:** Standard priority
  - **HIGH:** Important issues
  - **URGENT:** Critical issues requiring immediate attention
- **Rationale:** Enables prioritization for staff
- **Impact:** Used for sorting and filtering in application

### 6.3 Resolution Tracking
- **Assumption:** Resolution is **optional** until complaint is resolved
  - Resolution field is NULL for OPEN/IN_PROGRESS
  - Required for RESOLVED/CLOSED status
- **Rationale:** Enforces documentation of solutions
- **Impact:** Application-level validation

---

## 7. Data Integrity Assumptions

### 7.1 Cascade Deletes
- **Assumption:** When a customer is deleted:
  - All meters are deleted
  - All bills are deleted
  - All payments are deleted (via bills)
  - All meter readings are deleted (via meters)
  - All complaints are deleted
- **Rationale:** Maintains referential integrity
- **Impact:** ON DELETE CASCADE on foreign keys
- **Caution:** Deletion is permanent; soft deletes may be implemented in future

### 7.2 Audit Trail
- **Assumption:** All tables include:
  - `createdAt`: When record was created
  - `updatedAt`: When record was last modified
- **Rationale:** Provides basic audit trail
- **Impact:** Automatically managed by application (Prisma)

### 7.3 Soft Deletes
- **Assumption:** Customers and staff use `isActive` flag instead of deletion
  - Setting to false effectively "deletes" the account
  - Data retained for historical purposes
- **Rationale:** Prevents accidental data loss
- **Impact:** Queries must filter by isActive = true

---

## 8. Data Format Assumptions

### 8.1 Currency
- **Assumption:** All monetary values in **Sri Lankan Rupees (LKR)**
  - No currency field needed
  - All rates, amounts, charges in LKR
- **Rationale:** System operates in Sri Lanka
- **Impact:** Display formatting in application shows "Rs." or "LKR"

### 8.2 Units of Measurement
- **Assumption:** Standard units for each utility:
  - **Electricity:** kWh (kilowatt-hours)
  - **Water:** m³ (cubic meters)
  - **Gas:** m³ (cubic meters)
- **Rationale:** Standard units used in Sri Lanka
- **Impact:** Stored in utility_types.unit field

### 8.3 Phone Numbers
- **Assumption:** Contact numbers stored as strings with country code
  - Format: +94XXXXXXXXX (Sri Lankan numbers)
  - No format validation at database level
- **Rationale:** Flexibility for international numbers
- **Impact:** Formatting handled in application

### 8.4 Email Addresses
- **Assumption:** Email is **optional** for customers
  - Not all Sri Lankan customers have email
  - Contact phone is mandatory
- **Rationale:** Reflects reality in Sri Lanka
- **Impact:** Email field is nullable

---

## 9. Reporting and Analytics Assumptions

### 9.1 Revenue Reporting
- **Assumption:** Revenue reports are generated **monthly**
  - Grouped by year and month
  - Includes collection rate percentage
- **Rationale:** Management needs monthly financial summaries
- **Impact:** Implemented as `vw_MonthlyRevenueReport` view

### 9.2 Defaulter Tracking
- **Assumption:** Defaulters are customers with:
  - Overdue bills (past due date)
  - Outstanding balance > 0
- **Rationale:** Collection follow-up
- **Impact:** Implemented as `vw_DefaultersList` view

### 9.3 Historical Data
- **Assumption:** All historical data is **retained**
  - Old bills, payments, readings kept indefinitely
  - Enables trend analysis
- **Rationale:** Compliance and analytics
- **Impact:** No automatic data purging

---

## 10. Technical Assumptions

### 10.1 Database Platform
- **Assumption:** System uses **Microsoft SQL Server**
  - DATETIME2 data type for timestamps
  - NVARCHAR for Unicode string support (Sinhala/Tamil names)
- **Rationale:** Enterprise-grade RDBMS suitable for government use
- **Impact:** SQL syntax specific to SQL Server

### 10.2 Primary Key Strategy
- **Assumption:** All tables use **UUID (GUID) primary keys**
  - Format: NVARCHAR(450)
  - Generated by application (not database)
- **Rationale:**
  - Prevents sequential ID guessing
  - Better for distributed systems
  - Easier data merging
- **Impact:** Larger index size compared to INT keys

### 10.3 Transaction Management
- **Assumption:** Critical operations use **database transactions**
  - Bill generation is transactional
  - Payment processing is transactional
- **Rationale:** Ensures data consistency
- **Impact:** Implemented in stored procedures

### 10.4 Concurrency
- **Assumption:** Standard SQL Server locking mechanisms
  - Optimistic concurrency via `updatedAt` timestamp
  - No special distributed locking
- **Rationale:** Sufficient for expected load
- **Impact:** Application handles concurrency conflicts

---

## 11. Limitations and Future Enhancements

### Current Limitations (By Design)
1. **One meter per utility type per customer**
   - Cannot handle multiple electricity meters for same customer
   - Future: Extend to support sub-metering

2. **No customer self-service**
   - Customers cannot view bills or pay online directly
   - Future: Customer portal with authentication

3. **Single currency (LKR)**
   - Cannot handle multi-currency scenarios
   - Future: Add currency field if operating internationally

4. **Fixed tariff calculation logic**
   - Slab-based only
   - Future: Support time-of-use (TOU) tariffs

5. **No workflow automation**
   - Bill generation must be manually triggered
   - Future: Scheduled automatic billing

6. **Limited audit trail**
   - Only createdAt/updatedAt timestamps
   - Future: Full audit log of all changes

### Planned Enhancements
1. Integration with mobile app for meter readers
2. SMS/email notifications for bills and payments
3. Integration with payment gateways
4. IoT smart meter integration
5. Advanced analytics dashboard
6. GIS-based customer mapping
7. Outage and service interruption management

---

## 12. Compliance and Legal Assumptions

### 12.1 Data Privacy
- **Assumption:** Customer data is **confidential**
  - Access restricted by role
  - No public API exposure
- **Rationale:** Compliance with data protection regulations
- **Impact:** Application-level access control

### 12.2 Bill Disputes
- **Assumption:** Complaints system handles **billing disputes**
  - Customer can file complaint about bill
  - Staff investigates and resolves
- **Rationale:** Legal requirement for dispute resolution
- **Impact:** Complaint resolution tracked

### 12.3 Data Retention
- **Assumption:** Bill and payment data retained **indefinitely**
  - Required for tax and legal purposes
  - No automatic deletion
- **Rationale:** Legal and regulatory compliance
- **Impact:** Database size grows over time

---

## Conclusion

These assumptions form the foundation of the Utility Management System design. They are based on:
- Standard practices in the Sri Lankan utility sector
- Common database design principles
- Regulatory and compliance requirements
- Practical operational workflows

Any deviations from these assumptions in a production deployment would require corresponding schema and application logic modifications.
