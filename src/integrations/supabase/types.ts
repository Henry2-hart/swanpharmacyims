export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          detail: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          cost: number | null
          created_at: string
          id: string
          new_qty: number | null
          previous_qty: number | null
          product_id: string | null
          quantity: number
          reason: string
          supplier_id: string | null
          type: Database["public"]["Enums"]["movement_type"]
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          id?: string
          new_qty?: number | null
          previous_qty?: number | null
          product_id?: string | null
          quantity: number
          reason?: string
          supplier_id?: string | null
          type: Database["public"]["Enums"]["movement_type"]
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          id?: string
          new_qty?: number | null
          previous_qty?: number | null
          product_id?: string | null
          quantity?: number
          reason?: string
          supplier_id?: string | null
          type?: Database["public"]["Enums"]["movement_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_settings: {
        Row: {
          address: string
          business_name: string
          created_at: string
          email: string
          id: boolean
          low_stock_threshold: number
          phone: string
          receipt_footer: string
          tax_rate: number
          updated_at: string
        }
        Insert: {
          address?: string
          business_name?: string
          created_at?: string
          email?: string
          id?: boolean
          low_stock_threshold?: number
          phone?: string
          receipt_footer?: string
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          address?: string
          business_name?: string
          created_at?: string
          email?: string
          id?: boolean
          low_stock_threshold?: number
          phone?: string
          receipt_footer?: string
          tax_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_batches: {
        Row: {
          batch_number: string
          created_at: string
          expiry_date: string | null
          id: string
          initial_quantity: number
          manufacture_date: string | null
          notes: string
          product_id: string
          purchase_price: number
          selling_price: number
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          batch_number?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          initial_quantity?: number
          manufacture_date?: string | null
          notes?: string
          product_id: string
          purchase_price?: number
          selling_price?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          initial_quantity?: number
          manufacture_date?: string | null
          notes?: string
          product_id?: string
          purchase_price?: number
          selling_price?: number
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          batch_number: string
          category: string
          created_at: string
          description: string
          dosage_form: string
          expiry_date: string | null
          generic_name: string
          id: string
          manufacturer: string
          name: string
          purchase_price: number
          quantity: number
          reorder_level: number
          selling_price: number
          strength: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          batch_number?: string
          category?: string
          created_at?: string
          description?: string
          dosage_form?: string
          expiry_date?: string | null
          generic_name?: string
          id?: string
          manufacturer?: string
          name: string
          purchase_price?: number
          quantity?: number
          reorder_level?: number
          selling_price?: number
          strength?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          batch_number?: string
          category?: string
          created_at?: string
          description?: string
          dosage_form?: string
          expiry_date?: string | null
          generic_name?: string
          id?: string
          manufacturer?: string
          name?: string
          purchase_price?: number
          quantity?: number
          reorder_level?: number
          selling_price?: number
          strength?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          phone?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          batch_id: string | null
          id: string
          line_total: number
          name: string
          product_id: string | null
          quantity: number
          sale_id: string
          unit_cost: number
          unit_price: number
        }
        Insert: {
          batch_id?: string | null
          id?: string
          line_total: number
          name: string
          product_id?: string | null
          quantity: number
          sale_id: string
          unit_cost?: number
          unit_price: number
        }
        Update: {
          batch_id?: string | null
          id?: string
          line_total?: number
          name?: string
          product_id?: string | null
          quantity?: number
          sale_id?: string
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "product_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cashier_id: string
          created_at: string
          discount: number
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          sale_number: string
          subtotal: number
          tax: number
          total: number
        }
        Insert: {
          cashier_id: string
          created_at?: string
          discount?: number
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          sale_number: string
          subtotal?: number
          tax?: number
          total?: number
        }
        Update: {
          cashier_id?: string
          created_at?: string
          discount?: number
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          sale_number?: string
          subtotal?: number
          tax?: number
          total?: number
        }
        Relationships: []
      }
      stock_transactions: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          quantity_change: number
          reference: string
          transaction_type: Database["public"]["Enums"]["stock_txn_type"]
          unit_cost: number | null
          user_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          quantity_change: number
          reference?: string
          transaction_type: Database["public"]["Enums"]["stock_txn_type"]
          unit_cost?: number | null
          user_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          quantity_change?: number
          reference?: string
          transaction_type?: Database["public"]["Enums"]["stock_txn_type"]
          unit_cost?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "product_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string
          contact_person: string
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          phone?: string
          updated_at?: string
        }
        Update: {
          address?: string
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "owner" | "manager" | "cashier" | "pharmacist"
      movement_type: "in" | "out" | "adjustment"
      payment_method: "cash" | "mobile_money" | "card" | "bank_transfer"
      stock_txn_type:
        | "purchase"
        | "sale"
        | "return"
        | "damage"
        | "expired"
        | "adjustment"
        | "opening"
      user_status: "active" | "disabled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "manager", "cashier", "pharmacist"],
      movement_type: ["in", "out", "adjustment"],
      payment_method: ["cash", "mobile_money", "card", "bank_transfer"],
      stock_txn_type: [
        "purchase",
        "sale",
        "return",
        "damage",
        "expired",
        "adjustment",
        "opening",
      ],
      user_status: ["active", "disabled"],
    },
  },
} as const
