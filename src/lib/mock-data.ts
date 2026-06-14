import type {
  AuditLog,
  InventoryMovement,
  Product,
  Sale,
  Supplier,
  User,
} from "./types";

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const seedUsers: User[] = [
  {
    id: "u1",
    fullName: "Amelia Owner",
    email: "owner@pharma.app",
    phone: "+250 780 000 001",
    role: "owner",
    status: "active",
    password: "demo",
    createdAt: iso(now),
  },
  {
    id: "u2",
    fullName: "Marcus Manager",
    email: "manager@pharma.app",
    phone: "+250 780 000 002",
    role: "manager",
    status: "active",
    password: "demo",
    createdAt: iso(now),
  },
  {
    id: "u3",
    fullName: "Clara Cashier",
    email: "cashier@pharma.app",
    phone: "+250 780 000 003",
    role: "cashier",
    status: "active",
    password: "demo",
    createdAt: iso(now),
  },
  {
    id: "u4",
    fullName: "Paul Pharmacist",
    email: "pharmacist@pharma.app",
    phone: "+250 780 000 004",
    role: "pharmacist",
    status: "active",
    password: "demo",
    createdAt: iso(now),
  },
];

export const seedSuppliers: Supplier[] = [
  {
    id: "s1",
    name: "MediCore Distributors",
    contactPerson: "Janet K.",
    phone: "+250 788 100 200",
    email: "sales@medicore.co",
    address: "KN 4 Ave, Kigali",
    createdAt: iso(now),
  },
  {
    id: "s2",
    name: "GlobalPharma Ltd",
    contactPerson: "David O.",
    phone: "+250 788 300 400",
    email: "orders@globalpharma.co",
    address: "Industrial Park, Nyabugogo",
    createdAt: iso(now),
  },
  {
    id: "s3",
    name: "Wellness Supplies",
    contactPerson: "Sara M.",
    phone: "+250 788 500 600",
    email: "hello@wellness.co",
    address: "Remera Plaza",
    createdAt: iso(now),
  },
];

export const categories = [
  "Analgesics",
  "Antibiotics",
  "Antihistamines",
  "Vitamins",
  "Cardiovascular",
  "Dermatology",
  "First Aid",
];

export const seedProducts: Product[] = [
  {
    id: "p1",
    name: "Paracetamol 500mg",
    genericName: "Paracetamol",
    category: "Analgesics",
    supplierId: "s1",
    purchasePrice: 80,
    sellingPrice: 150,
    quantity: 420,
    reorderLevel: 100,
    batchNumber: "PCM-2410",
    expiryDate: daysFromNow(540),
    description: "Pain and fever relief, 10 tablets per strip.",
    createdAt: iso(now),
    updatedAt: iso(now),
  },
  {
    id: "p2",
    name: "Amoxicillin 250mg",
    genericName: "Amoxicillin",
    category: "Antibiotics",
    supplierId: "s2",
    purchasePrice: 300,
    sellingPrice: 550,
    quantity: 35,
    reorderLevel: 50,
    batchNumber: "AMX-3392",
    expiryDate: daysFromNow(60),
    description: "Broad-spectrum antibiotic capsules.",
    createdAt: iso(now),
    updatedAt: iso(now),
  },
  {
    id: "p3",
    name: "Cetirizine 10mg",
    genericName: "Cetirizine HCl",
    category: "Antihistamines",
    supplierId: "s1",
    purchasePrice: 90,
    sellingPrice: 200,
    quantity: 0,
    reorderLevel: 40,
    batchNumber: "CTZ-7711",
    expiryDate: daysFromNow(380),
    description: "Allergy relief tablets.",
    createdAt: iso(now),
    updatedAt: iso(now),
  },
  {
    id: "p4",
    name: "Vitamin C 1000mg",
    genericName: "Ascorbic Acid",
    category: "Vitamins",
    supplierId: "s3",
    purchasePrice: 250,
    sellingPrice: 500,
    quantity: 180,
    reorderLevel: 60,
    batchNumber: "VC-9921",
    expiryDate: daysFromNow(720),
    description: "Effervescent vitamin C tablets.",
    createdAt: iso(now),
    updatedAt: iso(now),
  },
  {
    id: "p5",
    name: "Amlodipine 5mg",
    genericName: "Amlodipine Besylate",
    category: "Cardiovascular",
    supplierId: "s2",
    purchasePrice: 400,
    sellingPrice: 750,
    quantity: 70,
    reorderLevel: 30,
    batchNumber: "AML-2233",
    expiryDate: daysFromNow(-20),
    description: "Hypertension management.",
    createdAt: iso(now),
    updatedAt: iso(now),
  },
  {
    id: "p6",
    name: "Hydrocortisone Cream",
    genericName: "Hydrocortisone 1%",
    category: "Dermatology",
    supplierId: "s3",
    purchasePrice: 600,
    sellingPrice: 1100,
    quantity: 22,
    reorderLevel: 25,
    batchNumber: "HC-5050",
    expiryDate: daysFromNow(200),
    description: "Topical anti-inflammatory cream, 15g.",
    createdAt: iso(now),
    updatedAt: iso(now),
  },
  {
    id: "p7",
    name: "Adhesive Bandages (50)",
    genericName: "Bandages",
    category: "First Aid",
    supplierId: "s1",
    purchasePrice: 700,
    sellingPrice: 1200,
    quantity: 120,
    reorderLevel: 30,
    batchNumber: "BND-8821",
    expiryDate: daysFromNow(900),
    description: "Assorted sterile adhesive bandages.",
    createdAt: iso(now),
    updatedAt: iso(now),
  },
  {
    id: "p8",
    name: "Ibuprofen 400mg",
    genericName: "Ibuprofen",
    category: "Analgesics",
    supplierId: "s2",
    purchasePrice: 120,
    sellingPrice: 250,
    quantity: 260,
    reorderLevel: 80,
    batchNumber: "IBU-4410",
    expiryDate: daysFromNow(45),
    description: "Anti-inflammatory pain relief.",
    createdAt: iso(now),
    updatedAt: iso(now),
  },
];

export const seedMovements: InventoryMovement[] = [
  {
    id: "m1",
    productId: "p1",
    type: "in",
    quantity: 200,
    supplierId: "s1",
    cost: 80,
    date: daysFromNow(-10),
    userId: "u2",
  },
  {
    id: "m2",
    productId: "p2",
    type: "out",
    quantity: 15,
    reason: "Damaged stock",
    date: daysFromNow(-3),
    userId: "u4",
  },
  {
    id: "m3",
    productId: "p4",
    type: "adjustment",
    quantity: -5,
    previousQty: 185,
    newQty: 180,
    reason: "Stocktake correction",
    date: daysFromNow(-1),
    userId: "u2",
  },
];

export const seedSales: Sale[] = (() => {
  const sales: Sale[] = [];
  for (let i = 0; i < 12; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() - Math.floor(i / 2));
    const qty = 1 + (i % 4);
    const unit = 150 + (i % 3) * 100;
    const subtotal = qty * unit;
    const tax = Math.round(subtotal * 0.05);
    sales.push({
      id: `sl${i + 1}`,
      saleNumber: `INV-${1000 + i}`,
      date: day.toISOString(),
      cashierId: "u3",
      items: [
        {
          productId: i % 2 === 0 ? "p1" : "p4",
          name: i % 2 === 0 ? "Paracetamol 500mg" : "Vitamin C 1000mg",
          quantity: qty,
          unitPrice: unit,
          lineTotal: subtotal,
        },
      ],
      subtotal,
      discount: 0,
      tax,
      total: subtotal + tax,
      paymentMethod: (["cash", "mobile_money", "card", "bank_transfer"] as const)[i % 4],
    });
  }
  return sales;
})();

export const seedAudit: AuditLog[] = [
  {
    id: "a1",
    userId: "u1",
    action: "LOGIN",
    detail: "Owner signed in",
    timestamp: daysFromNow(-1),
  },
  {
    id: "a2",
    userId: "u2",
    action: "PRODUCT_UPDATE",
    detail: "Updated Paracetamol 500mg",
    timestamp: daysFromNow(-1),
  },
  {
    id: "a3",
    userId: "u3",
    action: "SALE_CREATE",
    detail: "Created sale INV-1001",
    timestamp: daysFromNow(0),
  },
];
