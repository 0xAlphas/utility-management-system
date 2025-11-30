# Entity-Relationship (ER) Diagram and Relationships
## Utility Management System

---

## 1. Entities and Attributes

### 1.1 UTILITY_TYPES
**Strong Entity**

**Attributes:**
- **id** (PK, NVARCHAR(450)) - Primary identifier
- name (NVARCHAR(255), UNIQUE) - Utility name
- description (NVARCHAR(MAX)) - Detailed description
- unit (NVARCHAR(50)) - Measurement unit
- isActive (BIT) - Active status
- createdAt (DATETIME2) - Creation timestamp
- updatedAt (DATETIME2) - Last update timestamp

**Business Purpose:** Defines the types of utilities provided (Electricity, Water, Gas)

---

### 1.2 TARIFFS
**Strong Entity**

**Attributes:**
- **id** (PK, NVARCHAR(450)) - Primary identifier
- name (NVARCHAR(255)) - Tariff slab name
- minUsage (FLOAT) - Minimum consumption for slab
- maxUsage (FLOAT) - Maximum consumption for slab
- rate (FLOAT) - Per-unit rate
- fixedCharge (FLOAT) - Fixed charge amount
- isActive (BIT) - Active status
- effectiveFrom (DATETIME2) - Start date
- effectiveTo (DATETIME2) - End date
- utilityTypeId (FK, NVARCHAR(450)) - Reference to utility type
- createdAt (DATETIME2) - Creation timestamp
- updatedAt (DATETIME2) - Last update timestamp

**Business Purpose:** Stores slab-based pricing for each utility type

---

### 1.3 CUSTOMERS
**Strong Entity**

**Attributes:**
- **id** (PK, NVARCHAR(450)) - Primary identifier
- name (NVARCHAR(255)) - Customer name
- type (NVARCHAR(50)) - Customer category (HOUSEHOLD/BUSINESS/GOVERNMENT)
- contact (NVARCHAR(50)) - Phone number
- email (NVARCHAR(255)) - Email address (optional)
- address (NVARCHAR(MAX)) - Street address
- city (NVARCHAR(100)) - City name
- postalCode (NVARCHAR(20)) - Postal code
- isActive (BIT) - Active status
- createdAt (DATETIME2) - Creation timestamp
- updatedAt (DATETIME2) - Last update timestamp

**Business Purpose:** Stores customer information

---

### 1.4 METERS
**Strong Entity**

**Attributes:**
- **id** (PK, NVARCHAR(450)) - Primary identifier
- meterNumber (NVARCHAR(100), UNIQUE) - Physical meter number
- installationDate (DATETIME2) - Installation date
- lastReadingDate (DATETIME2) - Last reading date
- status (NVARCHAR(50)) - Meter status (ACTIVE/INACTIVE/FAULTY/REMOVED)
- customerId (FK, NVARCHAR(450)) - Reference to customer
- utilityTypeId (FK, NVARCHAR(450)) - Reference to utility type
- createdAt (DATETIME2) - Creation timestamp
- updatedAt (DATETIME2) - Last update timestamp

**Unique Constraint:** (customerId, utilityTypeId) - One meter per utility per customer

**Business Purpose:** Tracks utility meters assigned to customers

---

### 1.5 METER_READINGS
**Strong Entity**

**Attributes:**
- **id** (PK, NVARCHAR(450)) - Primary identifier
- readingValue (FLOAT) - Meter reading
- readingDate (DATETIME2) - Reading date
- remarks (NVARCHAR(MAX)) - Optional notes
- recordedBy (NVARCHAR(100)) - Staff username
- meterId (FK, NVARCHAR(450)) - Reference to meter
- createdAt (DATETIME2) - Creation timestamp
- updatedAt (DATETIME2) - Last update timestamp

**Business Purpose:** Stores meter readings for billing

---

### 1.6 BILLS
**Strong Entity**

**Attributes:**
- **id** (PK, NVARCHAR(450)) - Primary identifier
- billNumber (NVARCHAR(100), UNIQUE) - Human-readable bill number
- billingMonth (INT) - Billing month (1-12)
- billingYear (INT) - Billing year
- issueDate (DATETIME2) - Bill issue date
- dueDate (DATETIME2) - Payment due date
- previousReading (FLOAT) - Previous meter reading
- currentReading (FLOAT) - Current meter reading
- consumption (FLOAT) - Calculated consumption
- totalAmount (FLOAT) - Total bill amount
- paidAmount (FLOAT) - Amount paid
- outstandingAmount (FLOAT) - Remaining balance
- status (NVARCHAR(50)) - Bill status (UNPAID/PARTIALLY_PAID/PAID/OVERDUE)
- remarks (NVARCHAR(MAX)) - Optional notes
- customerId (FK, NVARCHAR(450)) - Reference to customer
- createdAt (DATETIME2) - Creation timestamp
- updatedAt (DATETIME2) - Last update timestamp

**Unique Constraint:** (customerId, billingMonth, billingYear) - One bill per customer per month

**Business Purpose:** Stores billing information

---

### 1.7 PAYMENTS
**Strong Entity**

**Attributes:**
- **id** (PK, NVARCHAR(450)) - Primary identifier
- amount (FLOAT) - Payment amount
- paymentDate (DATETIME2) - Payment date
- paymentMethod (NVARCHAR(50)) - Payment method (CASH/CARD/ONLINE/BANK_TRANSFER)
- referenceNumber (NVARCHAR(100)) - Payment reference
- remarks (NVARCHAR(MAX)) - Optional notes
- recordedBy (NVARCHAR(100)) - Staff username
- billId (FK, NVARCHAR(450)) - Reference to bill
- createdAt (DATETIME2) - Creation timestamp
- updatedAt (DATETIME2) - Last update timestamp

**Business Purpose:** Records customer payments

---

### 1.8 COMPLAINTS
**Strong Entity**

**Attributes:**
- **id** (PK, NVARCHAR(450)) - Primary identifier
- subject (NVARCHAR(255)) - Complaint subject
- description (NVARCHAR(MAX)) - Detailed description
- status (NVARCHAR(50)) - Status (OPEN/IN_PROGRESS/RESOLVED/CLOSED)
- priority (NVARCHAR(50)) - Priority (LOW/MEDIUM/HIGH/URGENT)
- resolution (NVARCHAR(MAX)) - Resolution notes
- createdAt (DATETIME2) - Filing date
- resolvedAt (DATETIME2) - Resolution date
- updatedAt (DATETIME2) - Last update timestamp
- customerId (FK, NVARCHAR(450)) - Reference to customer

**Business Purpose:** Tracks customer complaints

---

### 1.9 STAFF
**Strong Entity**

**Attributes:**
- **id** (PK, NVARCHAR(450)) - Primary identifier
- username (NVARCHAR(100), UNIQUE) - Login username
- passwordHash (NVARCHAR(255)) - Hashed password
- name (NVARCHAR(255)) - Full name
- email (NVARCHAR(255), UNIQUE) - Email address
- role (NVARCHAR(50)) - Role (ADMIN/MANAGER/CLERK/METER_READER)
- isActive (BIT) - Active status
- createdAt (DATETIME2) - Creation timestamp
- updatedAt (DATETIME2) - Last update timestamp

**Business Purpose:** Stores staff information for system access

---

## 2. Relationships

### 2.1 UTILITY_TYPES ←→ TARIFFS
**Type:** One-to-Many (1:M)

**Relationship Name:** "has tariff slabs"

**Description:**
- One utility type can have **multiple tariff slabs**
- Each tariff belongs to **one utility type**

**Cardinality:** 1:M
- Minimum: One utility type must have at least 1 tariff (partial participation)
- Maximum: Unlimited tariffs per utility type

**Foreign Key:** tariffs.utilityTypeId → utility_types.id

**Delete Rule:** RESTRICT (cannot delete utility type if tariffs exist)

**Business Rule:** Tariffs are slab-based (e.g., 0-100 kWh, 101-300 kWh)

---

### 2.2 UTILITY_TYPES ←→ METERS
**Type:** One-to-Many (1:M)

**Relationship Name:** "is measured by meters of type"

**Description:**
- One utility type can have **many meters**
- Each meter measures **one utility type**

**Cardinality:** 1:M
- Minimum: One utility type can have 0 or more meters
- Maximum: Unlimited meters per utility type

**Foreign Key:** meters.utilityTypeId → utility_types.id

**Delete Rule:** RESTRICT (cannot delete utility type if meters exist)

**Business Rule:** Each meter measures a specific utility (electricity, water, or gas)

---

### 2.3 CUSTOMERS ←→ METERS
**Type:** One-to-Many (1:M)

**Relationship Name:** "has meters"

**Description:**
- One customer can have **multiple meters** (one per utility type)
- Each meter belongs to **one customer**

**Cardinality:** 1:M
- Minimum: A customer must have at least 1 meter
- Maximum: One meter per utility type per customer (enforced by unique constraint)

**Foreign Key:** meters.customerId → customers.id

**Delete Rule:** CASCADE (deleting customer deletes all their meters)

**Business Rule:** One customer can have maximum 3 meters (1 electricity + 1 water + 1 gas)

**Unique Constraint:** (customerId, utilityTypeId)

---

### 2.4 METERS ←→ METER_READINGS
**Type:** One-to-Many (1:M)

**Relationship Name:** "has readings"

**Description:**
- One meter can have **many readings** over time
- Each reading belongs to **one meter**

**Cardinality:** 1:M
- Minimum: A meter can have 0 or more readings
- Maximum: Unlimited readings (typically monthly)

**Foreign Key:** meter_readings.meterId → meters.id

**Delete Rule:** CASCADE (deleting meter deletes all its readings)

**Business Rule:** Readings are typically taken monthly for billing

---

### 2.5 CUSTOMERS ←→ BILLS
**Type:** One-to-Many (1:M)

**Relationship Name:** "receives bills"

**Description:**
- One customer can have **many bills** over time
- Each bill belongs to **one customer**

**Cardinality:** 1:M
- Minimum: A customer can have 0 or more bills
- Maximum: Unlimited bills (typically monthly)

**Foreign Key:** bills.customerId → customers.id

**Delete Rule:** CASCADE (deleting customer deletes all their bills)

**Business Rule:** One bill per customer per month (enforced by unique constraint)

**Unique Constraint:** (customerId, billingMonth, billingYear)

---

### 2.6 BILLS ←→ PAYMENTS
**Type:** One-to-Many (1:M)

**Relationship Name:** "has payments"

**Description:**
- One bill can have **many payments** (supports partial payments)
- Each payment is for **one bill**

**Cardinality:** 1:M
- Minimum: A bill can have 0 or more payments
- Maximum: Unlimited payments per bill

**Foreign Key:** payments.billId → bills.id

**Delete Rule:** CASCADE (deleting bill deletes all its payments)

**Business Rule:** Multiple payments allowed for partial payment scenarios

---

### 2.7 CUSTOMERS ←→ COMPLAINTS
**Type:** One-to-Many (1:M)

**Relationship Name:** "files complaints"

**Description:**
- One customer can file **many complaints**
- Each complaint is filed by **one customer**

**Cardinality:** 1:M
- Minimum: A customer can have 0 or more complaints
- Maximum: Unlimited complaints

**Foreign Key:** complaints.customerId → customers.id

**Delete Rule:** CASCADE (deleting customer deletes all their complaints)

**Business Rule:** Customers can file complaints about billing, service, etc.

---

## 3. ER Diagram (Textual Representation)

```
┌─────────────────┐
│  UTILITY_TYPES  │
│─────────────────│
│ • id (PK)       │
│   name          │
│   description   │
│   unit          │
│   isActive      │
└────────┬────────┘
         │ 1
         │
         │ has
         │
         │ M
    ┌────┴─────────┐                    ┌────────────────┐
    │   TARIFFS    │                    │    METERS      │
    │──────────────│                    │────────────────│
    │ • id (PK)    │                    │ • id (PK)      │
    │   name       │                    │   meterNumber  │
    │   minUsage   │                    │   status       │
    │   maxUsage   │                    │ ○ customerId   │◄──┐
    │   rate       │                    │ ○ utilityTypeId│   │
    │   fixedCharge│                    └────────┬───────┘   │
    │ ○ utilityTypeId                            │ 1         │
    └──────────────┘                             │           │
                                                 │ has       │
                                                 │           │
                                                 │ M         │
                                        ┌────────┴────────┐  │
                                        │ METER_READINGS  │  │
                                        │─────────────────│  │
                                        │ • id (PK)       │  │
                                        │   readingValue  │  │
                                        │   readingDate   │  │
                                        │   recordedBy    │  │
                                        │ ○ meterId       │  │
                                        └─────────────────┘  │
                                                             │
                                                             │ M
┌──────────────┐                                            │
│  CUSTOMERS   │────────────────────────────────────────────┘
│──────────────│                has meters
│ • id (PK)    │                1
│   name       │
│   type       │────────┬───────────────┬──────────────┐
│   contact    │        │ 1             │ 1            │ 1
│   email      │        │               │              │
│   address    │        │ receives      │ files        │
│   city       │        │               │              │
│   isActive   │        │ M             │ M            │
└──────────────┘        │               │              │
                   ┌────┴──────┐  ┌─────┴────────┐    │
                   │   BILLS   │  │  COMPLAINTS  │    │
                   │───────────│  │──────────────│    │
                   │ • id (PK) │  │ • id (PK)    │    │
                   │   billNum │  │   subject    │    │
                   │   month   │  │   description│    │
                   │   year    │  │   status     │    │
                   │   total   │  │   priority   │    │
                   │   paid    │  │   resolution │    │
                   │   status  │  │ ○ customerId │    │
                   │ ○ custId  │  └──────────────┘    │
                   └─────┬─────┘                      │
                         │ 1                          │
                         │                            │
                         │ has                        │
                         │                            │
                         │ M                          │
                   ┌─────┴────────┐                   │
                   │   PAYMENTS   │                   │
                   │──────────────│                   │
                   │ • id (PK)    │                   │
                   │   amount     │                   │
                   │   date       │                   │
                   │   method     │                   │
                   │   reference  │                   │
                   │ ○ billId     │                   │
                   └──────────────┘                   │
                                                      │
                                                      │
┌──────────────┐                                     │
│    STAFF     │ (Referenced by recordedBy fields)   │
│──────────────│                                     │
│ • id (PK)    │                                     │
│   username   │◄────────────────────────────────────┘
│   password   │      recorded by
│   name       │
│   email      │
│   role       │
│   isActive   │
└──────────────┘
```

**Legend:**
- `•` Primary Key (PK)
- `○` Foreign Key (FK)
- `1` One (cardinality)
- `M` Many (cardinality)

---

## 4. Cardinality and Participation

| Relationship | Entity A | Participation A | Cardinality | Entity B | Participation B |
|-------------|----------|-----------------|-------------|----------|-----------------|
| has tariff slabs | utility_types | Partial (0..M) | 1:M | tariffs | Total (1..1) |
| is measured by | utility_types | Partial (0..M) | 1:M | meters | Total (1..1) |
| has meters | customers | Total (1..M) | 1:M | meters | Total (1..1) |
| has readings | meters | Partial (0..M) | 1:M | meter_readings | Total (1..1) |
| receives bills | customers | Partial (0..M) | 1:M | bills | Total (1..1) |
| has payments | bills | Partial (0..M) | 1:M | payments | Total (1..1) |
| files complaints | customers | Partial (0..M) | 1:M | complaints | Total (1..1) |

**Participation Types:**
- **Total Participation:** Entity must participate in relationship (shown by double line in ER diagrams)
- **Partial Participation:** Entity may or may not participate (shown by single line)

---

## 5. Relational Mapping from ER Model

### Step 1: Map Strong Entities
Each strong entity becomes a table with all attributes.

**Result:** 9 tables created
- utility_types
- tariffs
- customers
- meters
- meter_readings
- bills
- payments
- complaints
- staff

### Step 2: Map 1:M Relationships
Add foreign key to the "many" side of the relationship.

**Mappings:**
1. `tariffs.utilityTypeId` → `utility_types.id`
2. `meters.utilityTypeId` → `utility_types.id`
3. `meters.customerId` → `customers.id`
4. `meter_readings.meterId` → `meters.id`
5. `bills.customerId` → `customers.id`
6. `payments.billId` → `bills.id`
7. `complaints.customerId` → `customers.id`

### Step 3: Map Unique Constraints
Enforce business rules via unique constraints.

**Constraints:**
1. `meters` - UNIQUE(customerId, utilityTypeId)
2. `bills` - UNIQUE(customerId, billingMonth, billingYear)
3. `utility_types.name` - UNIQUE
4. `meters.meterNumber` - UNIQUE
5. `bills.billNumber` - UNIQUE
6. `staff.username` - UNIQUE
7. `staff.email` - UNIQUE

### Step 4: Map Check Constraints
Enforce domain integrity via check constraints.

**Constraints:**
- Customer types: HOUSEHOLD, BUSINESS, GOVERNMENT
- Bill status: UNPAID, PARTIALLY_PAID, PAID, OVERDUE
- Payment methods: CASH, CARD, ONLINE, BANK_TRANSFER
- Meter status: ACTIVE, INACTIVE, FAULTY, REMOVED
- Complaint status: OPEN, IN_PROGRESS, RESOLVED, CLOSED
- Complaint priority: LOW, MEDIUM, HIGH, URGENT
- All monetary amounts >= 0
- Billing months 1-12
- Billing years 2000-2100

---

## 6. Extended Entity Features

### 6.1 Weak Entities
**None** - All entities in this system are strong entities with their own primary keys.

### 6.2 Composite Attributes
**address** in customers table could be broken down into:
- street
- city (already separate)
- postalCode (already separate)

**Current Design:** address is a single field for flexibility

### 6.3 Derived Attributes
**consumption** in bills table is derived:
- `consumption = currentReading - previousReading`
- Stored for performance and historical accuracy

**outstandingAmount** in bills table is derived:
- `outstandingAmount = totalAmount - paidAmount`
- Updated automatically by triggers

### 6.4 Multi-valued Attributes
**None** - All attributes are single-valued (1NF compliance)

---

## 7. Referential Integrity Rules

| Foreign Key | On Delete | On Update | Justification |
|------------|-----------|-----------|---------------|
| meters.customerId | CASCADE | CASCADE | Remove meters when customer deleted |
| meters.utilityTypeId | RESTRICT | CASCADE | Prevent deleting used utility types |
| meter_readings.meterId | CASCADE | CASCADE | Remove readings when meter deleted |
| bills.customerId | CASCADE | CASCADE | Remove bills when customer deleted |
| payments.billId | CASCADE | CASCADE | Remove payments when bill deleted |
| complaints.customerId | CASCADE | CASCADE | Remove complaints when customer deleted |
| tariffs.utilityTypeId | RESTRICT | CASCADE | Prevent deleting used utility types |

**CASCADE:** Automatically delete/update dependent records
**RESTRICT:** Prevent deletion if dependent records exist

---

## Conclusion

This ER model provides a comprehensive, normalized database design for the Utility Management System with:

✅ Clear entity definitions with appropriate attributes
✅ Well-defined relationships with proper cardinalities
✅ Referential integrity through foreign keys
✅ Business rule enforcement via constraints
✅ Scalable design supporting multiple utilities and customer types
✅ Proper normalization (3NF) eliminating redundancy
