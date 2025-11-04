// Enum types for use in API routes
// Since SQL Server doesn't support native enums, we define them here for TypeScript

export enum StaffRole {
  ADMIN = 'ADMIN',
  METER_READER = 'METER_READER',
  CLERK = 'CLERK',
  MANAGER = 'MANAGER',
}

export enum CustomerType {
  HOUSEHOLD = 'HOUSEHOLD',
  BUSINESS = 'BUSINESS',
  GOVERNMENT = 'GOVERNMENT',
}

export enum MeterStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  FAULTY = 'FAULTY',
  DISCONNECTED = 'DISCONNECTED',
}

export enum BillStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  ONLINE = 'ONLINE',
  CHEQUE = 'CHEQUE',
  MOBILE_PAYMENT = 'MOBILE_PAYMENT',
}

export enum ComplaintStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REJECTED = 'REJECTED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}
