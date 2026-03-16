/**
 * Zod validation schemas for API endpoints
 */

import { z } from 'zod';

// ==================== Common Schemas ====================

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).default(100),
  page: z.coerce.number().int().positive().default(1),
  status: z.string().optional()
});

// ==================== Seller Schemas ====================

export const sellerSchema = z.object({
  shop_name: z.string().nullable().optional(),
  shop_url: z.string().url().nullable().optional(),
  seller_id: z.string().nullable().optional(),
  rating: z.string().nullable().optional(),
  total_products: z.number().int().nonnegative().nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
  keyword: z.string().nullable().optional(),
  status: z.enum(['new', 'researched', 'contacted']).optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional()
});

export const sellerStatusSchema = z.object({
  status: z.enum(['new', 'researched', 'contacted'])
});

// ==================== Campaign Schemas ====================

export const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200),
  message_template_id: z.number().int().positive().nullable().optional(),
  keywords: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'stopped']).optional(),
  daily_limit: z.number().int().positive().max(1000).optional(),
  notes: z.string().max(2000).nullable().optional()
});

export const campaignUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  message_template_id: z.number().int().positive().nullable().optional(),
  keywords: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'stopped']).optional(),
  daily_limit: z.number().int().positive().max(1000).optional(),
  notes: z.string().max(2000).nullable().optional()
});

// ==================== Message Template Schemas ====================

export const messageTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200),
  subject: z.string().max(500).nullable().optional(),
  body: z.string().min(1, 'Message body is required').max(10000),
  template_type: z.enum(['outreach', 'followup']).optional(),
  variables: z.array(z.string()).optional()
});

export const messageTemplateUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().max(500).nullable().optional(),
  body: z.string().min(1).max(10000).optional(),
  template_type: z.enum(['outreach', 'followup']).optional(),
  variables: z.array(z.string()).optional(),
  is_active: z.boolean().optional()
});

// ==================== Outreach Schemas ====================

export const addSellersToCampaignSchema = z.object({
  sellerIds: z.array(z.number().int().positive()).min(1, 'At least one seller ID is required'),
  approvalStatus: z.enum(['pending', 'approved']).optional().default('pending')
});

// ==================== Approval Schemas ====================

export const approveMessageSchema = z.object({
  approvedBy: z.string().min(1).max(100).optional().default('system')
});

export const rejectMessageSchema = z.object({
  rejectedBy: z.string().min(1).max(100).optional().default('system'),
  reason: z.string().max(1000).optional()
});

// ==================== Research Schemas ====================

export const researchStartSchema = z.object({
  keywords: z.array(z.string().min(1)).min(1, 'At least one keyword is required').max(50, 'Maximum 50 keywords allowed'),
  adspowerProfileId: z.string().min(1, 'AdsPower profile ID is required')
});

// ==================== Audit Log Query Schema ====================

export const auditQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).default(100),
  entityType: z.string().optional(),
  entityId: z.coerce.number().int().positive().optional()
});

// ==================== Research Queue Query Schema ====================

export const researchQueueQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional()
});
