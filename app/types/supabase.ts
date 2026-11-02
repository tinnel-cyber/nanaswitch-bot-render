export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  price: number;
  stock: number;
  category: string | null;
  created_at?: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  full_name: string | null;
  role: string | null;
}

export interface AppRegistryItem {
  id?: string;
  key: string;
  name: string;
  description?: string | null;
  category?: string | null;
  is_public?: boolean;
  created_at?: string;
}

export interface OrganizationBlock {
  id?: string;
  organization_id: string;
  block_key: string;
  is_active: boolean;
  settings?: Record<string, unknown>;
  updated_at?: string;
}

export interface Sale {
  id?: string;
  organization_id?: string | null;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  source: 'pos' | 'storefront' | 'funnel' | 'api' | 'manual';
  customer_name?: string | null;
  customer_phone?: string | null;
  payment_method?: string | null;
  seller_name?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface ProcessSaleParams {
  p_product_id: string;
  p_quantity?: number;
  p_source?: 'pos' | 'storefront' | 'funnel' | 'api' | 'manual';
  p_org_id?: string | null;
  p_unit_price?: number | null;
  p_customer_name?: string | null;
  p_customer_phone?: string | null;
  p_payment_method?: string | null;
  p_seller_name?: string | null;
  p_metadata?: Record<string, unknown>;
}
