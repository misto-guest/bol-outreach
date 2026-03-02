/**
 * Message Variator
 * Manages message templates and AI-powered variations
 */

import { randomInt } from 'crypto';

export interface MessageTemplate {
    id: string;
    subject: string;
    body: string;
    category?: string;
    createdAt: Date;
    usageCount: number;
    lastUsed?: Date;
}

export interface MessageVariation {
    originalId: string;
    subject: string;
    body: string;
    generatedAt: Date;
}

export class MessageVariator {
    private templates: Map<string, MessageTemplate> = new Map();
    private variations: Map<string, MessageVariation[]> = new Map();
    private maxVariationsPerMonth: number = 20;

    /**
     * Add a message template
     */
    addTemplate(template: Omit<MessageTemplate, 'id' | 'createdAt' | 'usageCount'>): string {
        const id = `tpl-${Date.now()}-${randomInt(1000, 9999)}`;
        const fullTemplate: MessageTemplate = {
            ...template,
            id,
            createdAt: new Date(),
            usageCount: 0
        };

        this.templates.set(id, fullTemplate);
        return id;
    }

    /**
     * Get template by ID
     */
    getTemplate(id: string): MessageTemplate | undefined {
        return this.templates.get(id);
    }

    /**
     * Get all templates
     */
    getAllTemplates(): MessageTemplate[] {
        return Array.from(this.templates.values());
    }

    /**
     * Get templates by category
     */
    getTemplatesByCategory(category: string): MessageTemplate[] {
        return Array.from(this.templates.values()).filter(t => t.category === category);
    }

    /**
     * Generate AI variation of message
     * This integrates with AI service to rewrite message
     */
    async generateVariation(templateId: string, aiService?: (text: string) => Promise<string>): Promise<MessageVariation> {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }

        // Check if we've hit the monthly limit
        const existingVariations = this.variations.get(templateId) || [];
        if (existingVariations.length >= this.maxVariationsPerMonth) {
            throw new Error(`Monthly variation limit reached (${this.maxVariationsPerMonth})`);
        }

        let newSubject = template.subject;
        let newBody = template.body;

        // Use AI service if provided
        if (aiService) {
            try {
                // Rewrite subject
                newSubject = await aiService(`Rewrite this email subject with a different tone, keep it professional and concise: "${template.subject}"`);

                // Rewrite body
                newBody = await aiService(`Rewrite this email message with slight variations, keep the core message and professional tone: "${template.body}"`);
            } catch (error) {
                console.warn('AI service failed, using original template:', error);
            }
        }

        const variation: MessageVariation = {
            originalId: templateId,
            subject: newSubject,
            body: newBody,
            generatedAt: new Date()
        };

        // Store variation
        if (!this.variations.has(templateId)) {
            this.variations.set(templateId, []);
        }
        this.variations.get(templateId)!.push(variation);

        // Update template usage
        template.usageCount++;
        template.lastUsed = new Date();

        return variation;
    }

    /**
     * Get random variation for template
     * Falls back to original if no variations exist
     */
    getRandomVariation(templateId: string): { subject: string; body: string } {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }

        const variations = this.variations.get(templateId) || [];

        if (variations.length === 0) {
            // Return original
            return {
                subject: template.subject,
                body: template.body
            };
        }

        // Return random variation
        const randomIndex = Math.floor(Math.random() * variations.length);
        const variation = variations[randomIndex];

        return {
            subject: variation.subject,
            body: variation.body
        };
    }

    /**
     * Get least recently used template
     */
    getLeastUsedTemplate(category?: string): MessageTemplate | undefined {
        let templates = Array.from(this.templates.values());

        if (category) {
            templates = templates.filter(t => t.category === category);
        }

        if (templates.length === 0) return undefined;

        // Sort by usage count, then by last used
        templates.sort((a, b) => {
            if (a.usageCount !== b.usageCount) {
                return a.usageCount - b.usageCount;
            }
            if (!a.lastUsed) return -1;
            if (!b.lastUsed) return 1;
            return a.lastUsed.getTime() - b.lastUsed.getTime();
        });

        return templates[0];
    }

    /**
     * Clean up old variations (older than 1 month)
     */
    cleanupOldVariations(): void {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        for (const [templateId, variations] of this.variations.entries()) {
            const activeVariations = variations.filter(v => v.generatedAt > oneMonthAgo);
            this.variations.set(templateId, activeVariations);
        }
    }

    /**
     * Get statistics
     */
    getStats(): {
        totalTemplates: number;
        totalVariations: number;
        templatesByCategory: Record<string, number>;
    } {
        const templates = Array.from(this.templates.values());
        const variations = Array.from(this.variations.values()).flat();

        const templatesByCategory: Record<string, number> = {};
        templates.forEach(t => {
            const cat = t.category || 'uncategorized';
            templatesByCategory[cat] = (templatesByCategory[cat] || 0) + 1;
        });

        return {
            totalTemplates: templates.length,
            totalVariations: variations.length,
            templatesByCategory
        };
    }
}

export default MessageVariator;