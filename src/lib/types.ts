export type Role = "owner" | "manager" | "cashier" | "pharmacist";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: "active" | "disabled";
  password?: string; // unused with real auth; kept for UI compatibility
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

export interface Product {
  id: string;
  name: string;
  genericName: string;
  category: string;
  supplierId: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  batchNumber: string;
  expiryDate: string; // ISO date
  description: string;
  createdAt: string;
  updatedAt: string;
}

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
  name: string;
  quantity: number;
  unitPrice: number;
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
