/**
 * TYPES SUPABASE - MODULES CORE NANASORE
 * 1. Studio E-mailing (email_campaigns)
 * 2. Validation & Modération (verification_requests)
 * 3. Stock & Mouvements POS (inventory_movements)
 */

// ==============================================================================
// 1. MODULE E-MAILING
// ==============================================================================
export type EmailCampaignStatus = 
  | 'draft' 
  | 'scheduled' 
  | 'sending' 
  | 'sent' 
  | 'paused' 
  | 'failed';

export interface EmailCampaign {
  id: string;
  tenant_id?: string | null;
  subject: string;
  html_content?: string | null;
  plain_text?: string | null;
  sender_name?: string | null;
  sender_email?: string | null;
  status: EmailCampaignStatus;
  target_segment: string;
  recipients_count: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  brevo_campaign_id?: string | null;
  metadata?: Record<string, any>;
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ==============================================================================
// 2. MODULE VALIDATION COMPTES & MODÉRATION ADMIN
// ==============================================================================
export type VerificationRequestType = 
  | 'ACCOUNT_CREATION' 
  | 'KYC_VERIFICATION' 
  | 'SUBSCRIPTION_UPGRADE' 
  | 'STORE_ACTIVATION';

export type VerificationStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'in_review';

export interface VerificationRequest {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  request_type: VerificationRequestType;
  status: VerificationStatus;
  pricing_model?: 'commission' | 'subscription' | null;
  activity_domain?: string | null;
  brief_description?: string | null;
  submitted_data: Record<string, any>;
  documents: Array<{
    name: string;
    url: string;
    type: string;
    uploaded_at?: string;
  }>;
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  reviewer_notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ==============================================================================
// 3. MODULE STOCK & TRAÇABILITÉ POS
// ==============================================================================
export type InventoryMovementType = 
  | 'SALE_POS' 
  | 'STOCK_IN' 
  | 'STOCK_OUT' 
  | 'INVENTORY_AUDIT' 
  | 'RETURN' 
  | 'DAMAGE_LOSS' 
  | 'TRANSFER';

export interface InventoryMovement {
  id: string;
  tenant_id?: string | null;
  product_id: string;
  product_name?: string | null;
  movement_type: InventoryMovementType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  unit_price?: number | null;
  unit_cost?: number | null;
  reference_sale_id?: string | null;
  performed_by?: string | null;
  operator_name?: string | null;
  notes?: string | null;
  created_at: string;
}
