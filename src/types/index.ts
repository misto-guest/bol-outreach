/**
 * Type definitions for Bol.com Seller Intelligence Platform
 */

import { Database as SqlJsDatabase } from 'sql.js';

// ============= Database Types =============

export interface Seller {
  id?: number;
  shop_name: string | null;
  shop_url: string | null;
  discovered_at?: string;
  keyword: string | null;
  status: 'new' | 'researched' | 'contacted';
  seller_id: string | null;
  rating: string | null;
  total_products: number | null;
  contact_email: string | null;
  last_checked_at?: string;
  metadata?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Campaign {
  id?: number;
  name: string;
  message_template_id?: number | null;
  keywords: string | null;
  status: 'draft' | 'active' | 'stopped';
  created_at?: string;
  updated_at?: string;
  start_date?: string | null;
  end_date?: string | null;
  daily_limit?: number;
  total_sent?: number;
  notes?: string | null;
}

export interface MessageTemplate {
  id?: number;
  name: string;
  subject?: string | null;
  body: string;
  template_type?: 'outreach' | 'followup';
  variables?: string | null;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
}

export interface OutreachLog {
  id?: number;
  seller_id: number;
  campaign_id: number;
  contacted_at?: string;
  adspower_profile_id?: string | null;
  status: 'pending' | 'sent' | 'failed';
  message_sent?: string | null;
  response_received?: string | null;
  response_at?: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by?: string | null;
  approved_at?: string | null;
  error_message?: string | null;
  created_at?: string;
}

export interface AdsPowerUsage {
  profile_id: string;
  last_used: string;
  messages_sent_today: number;
  total_messages_sent: number;
  cooldown_until?: string | null;
  last_reset: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id?: number;
  action: string;
  entity_type?: string | null;
  entity_id?: number | null;
  user_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  created_at?: string;
}

export interface ResearchQueue {
  id?: number;
  keyword: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  products_found?: number;
  sellers_found?: number;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  created_at?: string;
}

// ============= Dashboard Stats =============

export interface DashboardStats {
  totalSellers: number;
  newSellers: number;
  researchedSellers: number;
  contactedSellers: number;
  totalCampaigns: number;
  activeCampaigns: number;
  pendingApprovals: number;
  messagesSent: number;
  messagesDelivered: number;
  adspowerProfiles: number;
  activeProfiles: number;
}

// ============= AdsPower Types =============

export interface AdsPowerProfile {
  user_id: string;
  user_name?: string;
  group_id?: string;
  status?: string;
  browser_type?: string;
  [key: string]: any;
}

export interface AdsPowerStartOptions {
  headless?: boolean;
  [key: string]: any;
}

export interface AdsPowerStartResult {
  success: boolean;
  profileId: string;
  wsEndpoint?: string;
  ws?: {
    puppeteer?: string;
  };
  puppeteerEndpoint?: string;
  data?: any;
  error?: string;
}

export interface AdsPowerApiResponse {
  code?: number;
  ret_code?: number;
  msg?: string;
  message?: string;
  data?: any;
}

// ============= Seller Research Types =============

export interface SellerInfo {
  shopName: string | null;
  shopUrl: string | null;
  sellerId: string | null;
  rating: string | null;
  totalProducts: string | null;
  isBolCom: boolean;
  businessInfo: string | null;
  contactEmail?: string | null;
  businessName?: string | null;
  kvkNumber?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  keyword?: string;
  status?: string;
  productUrl?: string;
}

export interface ResearchOptions {
  maxResults?: number;
  extractSellers?: boolean;
  saveToDb?: boolean;
  deepSearch?: boolean;
  onProgress?: (progress: ResearchProgress) => void;
  useAdsPowerProfile?: string | null;
}

export interface ResearchProgress {
  current: number;
  total: number;
  keyword?: string;
  found: number;
  seller?: string;
  status: 'searching' | 'found' | 'extracted' | 'error';
}

export interface ResearchResults {
  totalFound: number;
  sellers: SellerInfo[];
  keywords: string[];
  errors: Array<{ keyword?: string; seller?: string; error: string }>;
}

// ============= Outreach Types =============

export interface OutreachMessage {
  id: number;
  seller_id: number;
  campaign_id: number;
  shop_name: string;
  shop_url?: string;
  campaign_name: string;
  message_sent?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  status: 'pending' | 'sent' | 'failed';
  contacted_at?: string;
  adspower_profile_id?: string | null;
}

export interface OutreachExecutionResults {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface OutreachProgress {
  current: number;
  total: number;
  seller?: string;
}

// ============= API Response Types =============

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  stack?: string;
}

// ============= Database Interface =============

export interface DatabaseInterface {
  db: SqlJsDatabase | null;
  SQL: any;
  dbPath: string;
  init(): Promise<void>;
  saveToFile(): void;
  createTables(): Promise<void>;
  run(sql: string, params?: any[]): { id: number | null; changes: number } | Promise<{ id: number | null; changes: number }>;
  get(sql: string, params?: any[]): any;
  all(sql: string, params?: any[]): any[];
  insertSeller(sellerData: Partial<Seller>): Promise<{ id: number | null; changes: number }>;
  getSellersByStatus(status: string, limit?: number): Promise<any[]>;
  getSellersForOutreach(limit?: number): Promise<any[]>;
  createCampaign(campaignData: Partial<Campaign>): Promise<{ id: number | null; changes: number }>;
  createTemplate(templateData: Partial<MessageTemplate>): Promise<{ id: number | null; changes: number }>;
  addToApprovalQueue(outreachData: any): Promise<{ id: number | null; changes: number }>;
  getPendingApprovals(): Promise<any[]>;
  updateApproval(logId: number, status: string, approvedBy?: string | null): Promise<{ id: number | null; changes: number }>;
  checkAdsPowerUsage(profileId: string): Promise<{ canSend: boolean; messagesToday: number; cooldown: boolean; cooldownUntil?: string }>;
  recordMessageSent(profileId: string): Promise<void>;
  logAudit(action: string, entityType: string, entityId: number | null, userId: string, details?: any): Promise<void>;
  getDashboardStats(): Promise<DashboardStats>;
  close(): void;
}