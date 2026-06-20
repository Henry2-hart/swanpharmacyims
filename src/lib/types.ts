export type Role = "owner" | "manager" | "cashier" | "pharmacist";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: "active" | "disabled";
  password?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
}

/**
 * Product = the medicine identity. Stock and prices are owned by batches.
 * The following fields are DERIVED from the product's batches at load time:
 *   quantity, purchasePrice (weighted avg cost), sellingPrice (latest batch),
 *   expiryDate (earliest non-expired batch), batchNumber (latest batch number).
 */
export interface Product {
  id: string;
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  dosageForm: string;
  strength: string;
  supplierId: string;
  reorderLevel: number;
  active: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
  // Derived from batches:
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  expiryDate: string;
  batchNumber: string;
  stockValue: number;
}

export interface Batch {
  id: string;
  productId: string;
  supplierId: string;
  batchNumber: string;
  manufactureDate: string;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  initialQuantity: number;
  availableQuantity: number; // computed from transactions
  notes: string;
  createdAt: string;
}

export type StockTxnType =
  | "purchase"
  | "sale"
  | "return"
  | "damage"
  | "expired"
  | "adjustment"
  | "opening";

export interface StockTransaction {
  id: string;
  batchId: string;
  productId: string; // resolved client-side via batch
  transactionType: StockTxnType;
  quantityChange: number;
  unitCost: number | null;
  reference: string;
  userId: string;
  createdAt: string;
}

// Legacy compat — surfaced from stock_transactions for UI continuity
export type MovementType = "in" | "out" | "adjustment";
export interface InventoryMovement {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number;
  previousQty?: number;
  newQty?: number;
  reason?: string;
  supplierId?: string;
  cost?: number;
  date: string;
  userId: string;
}

export type PaymentMethod = "cash" | "mobile_money" | "card" | "bank_transfer";
export interface SaleItem {
  productId: string;
  batchId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  lineTotal: number;
}
export interface Sale {
  id: string;
  saleNumber: string;
  date: string;
  cashierId: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  detail?: string;
  timestamp: string;
}

export interface PharmacySettings {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  taxRate: number;
  receiptFooter: string;
  lowStockThreshold: number;
}
