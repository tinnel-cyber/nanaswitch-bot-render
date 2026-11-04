export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface Product {
  id: string;
  organization_id?: string;
  vendor_id?: string | null;
  title?: string | null;
  name: string;
  price: number;
  stock?: number;
  file_key?: string | null;
  file_type?: string | null;
  file_size?: string | null;
  category?: string | null;
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

export interface SupabasePlan {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
  billing_type: 'FREE' | 'COMMISSION' | 'SUBSCRIPTION' | 'PAY_AS_YOU_GO';
  default_commission_rate: number;
  subscription_price_monthly?: number | null;
  subscription_price_yearly?: number | null;
  currency: string;
  is_active: boolean;
  is_popular?: boolean;
  badge?: string | null;
  features?: string[];
  limits?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceCommissionRule {
  id?: string;
  service_code: string;
  service_name: string;
  commission_rate: number;
  escrow_period_hours: number;
  min_commission_amount: number;
  currency: string;
  is_active: boolean;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UsageServiceRate {
  id?: string;
  usage_code: string;
  service_name: string;
  rate_per_unit: number;
  credit_units_per_act: number;
  unit_label: string;
  currency: string;
  is_active: boolean;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PlanModularPillar {
  pillar_id: 'caisse_pos' | 'vitrine_web' | 'formateur_lms';
  name: string;
  category: 'PHYSICAL_POS' | 'ONLINE_STORE' | 'INSTRUCTOR_LMS';
  description: string;
  starter_monthly_price: number;
  business_monthly_price: number;
  enterprise_monthly_price: number;
  included_modules: string[];
  features_highlight: string[];
}

export interface AcademicUpload {
  id?: string;
  user_id: string;
  role: 'professeur' | 'etudiant';
  upload_type: 'cours' | 'rendu';
  file_key: string;
  file_size: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}


