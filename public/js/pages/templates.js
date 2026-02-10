/**
 * Message Templates Page
 * Create and manage message templates for outreach
 */

App.Pages.templates = {
    currentTemplates: [],

    async load() {
        const content = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Message Templates</h3>
                    <button class="btn btn-primary" onclick="App.Pages.templates.createNewTemplate()">
                        <i class="fas fa-plus"></i> New Template
                    </button>
                </div>
                <div class="card-body">
                    <div class="template-grid" id="templatesGrid">
                        <div class="empty-state">
                            <i class="fas fa-spinner"></i>
                            <p>Loading templates...</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Available Variables</h3>
                </div>
                <div class="card-body">
                    <p style="margin-bottom: 15px;">Use these variables in your templates. They will be automatically replaced when sending messages.</p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                        <div style="padding: 10px; background: var(--bg-color); border-radius: 4px;">
                            <code>{shop_name}</code>
                            <small class="text-muted" style="display: block; margin-top: 5px;">Seller's shop name</small>
                        </div>
                        <div style="padding: 10px; background: var(--bg-color); border-radius: 4px;">
                            <code>{keyword}</code>
                            <small class="text-muted" style="display: block; margin-top: 5px;">Search keyword</small>
                        </div>
                        <div style="padding: 10px; background: var(--bg-color); border-radius: 4px;">
                            <code>{sender_name}</code>
                            <small class="text-muted" style="display: block; margin-top: 5px;">Your name</small>
                        </div>
                        <div style="padding: 10px; background: var(--bg-color); border-radius: 4px;">
                            <code>{date}</code>
                            <small class="text-muted" style="display: block; margin-top: 5px;">Current date</small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;

        await this.loadTemplates();
    },

    async loadTemplates() {
        try {
            const response = await App.API.get('/templates');
            this.currentTemplates = response.data;
            this.displayTemplates(this.currentTemplates);
        } catch (error) {
            console.error('Failed to load templates:', error);
            document.getElementById('templatesGrid').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load templates</p>
                </div>
            `;
        }
    },

    displayTemplates(templates) {
        const grid = document.getElementById('templatesGrid');

        if (templates.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>No message templates</h3>
                    <p>Create your first template to use in campaigns.</p>
                    <button class="btn btn-primary" onclick="App.Pages.templates.createNewTemplate()">
                        <i class="fas fa-plus"></i> Create Template
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">
                ${templates.map(template => this.renderTemplateCard(template)).join('')}
            </div>
        `;
    },

    renderTemplateCard(template) {
        return `
            <div class="template-card" style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
                <div class="card-header" style="padding: 15px;">
                    <h4 style="margin: 0;">${template.name}</h4>
                    <small class="text-muted">${template.template_type || 'outreach'}</small>
                </div>
                <div style="padding: 15px;">
                    ${template.subject ? `
                        <div style="margin-bottom: 10px;">
                            <strong>Subject:</strong><br>
                            ${template.subject}
                        </div>
                    ` : ''}

                    <div style="margin-bottom: 15px;">
                        <strong>Message:</strong>
                        <div style="margin-top: 8px; padding: 10px; background: var(--bg-color); border-radius: 4px; max-height: 150px; overflow-y: auto;">
                            ${App.Utils.truncate(template.body, 200)}
                        </div>
                    </div>

                    ${template.variables && template.variables.length > 0 ? `
                        <div style="margin-bottom: 15px;">
                            <strong>Variables used:</strong><br>
                            ${template.variables.map(v => `<code style="background: var(--primary-light); padding: 2px 6px; border-radius: 4px; margin-right: 5px;">{${v}}</code>`).join('')}
                        </div>
                    ` : ''}

                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-primary btn-sm" onclick="App.Pages.templates.editTemplate(${template.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-info btn-sm" onclick="App.Pages.templates.previewTemplate(${template.id})">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                        <button class="btn btn-success btn-sm" onclick="App.Pages.templates.testTemplate(${template.id})">
                            <i class="fas fa-paper-plane"></i> Test
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="App.Pages.templates.deleteTemplate(${template.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    async createNewTemplate() {
        const content = `
            <form id="templateForm" style="max-height: 70vh; overflow-y: auto;">
                <div class="form-group">
                    <label for="templateName">Template Name *</label>
                    <input type="text" id="templateName" class="form-control" placeholder="e.g., Initial Outreach" required>
                </div>

                <div class="form-group">
                    <label for="templateType">Template Type</label>
                    <select id="templateType" class="form-control">
                        <option value="outreach">Outreach</option>
                        <option value="followup">Follow-up</option>
                        <option value="response">Response</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="templateSubject">Subject Line (optional)</label>
                    <input type="text" id="templateSubject" class="form-control" placeholder="e.g., Partnership Inquiry">
                </div>

                <div class="form-group">
                    <label for="templateBody">Message Body *</label>
                    <textarea id="templateBody" class="form-control" rows="10" placeholder="Enter your message here. Use variables like {shop_name}, {sender_name}, etc." required></textarea>
                    <small class="text-muted">
                        Tip: Use {shop_name} for the seller's name, {sender_name} for your name, {date} for today's date
                    </small>
                </div>

                <div class="form-group">
                    <button type="button" class="btn btn-outline btn-sm" onclick="App.Pages.templates.detectVariables()">
                        <i class="fas fa-magic"></i> Auto-detect Variables
                    </button>
                    <small class="text-muted" style="margin-left: 10px;">Scan message for variables</small>
                </div>

                <div class="form-group" id="detectedVariables" style="display: none;">
                    <label>Detected Variables:</label>
                    <div id="variablesList" style="padding: 10px; background: var(--primary-light); border-radius: 4px;"></div>
                </div>
            </form>
        `;

        App.Utils.showModal('Create Message Template', content);

        // Setup auto-detect button
        document.getElementById('templateBody').addEventListener('input', () => {
            this.detectVariables();
        });

        // Handle form submission
        document.getElementById('templateForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const templateData = {
                name: document.getElementById('templateName').value,
                template_type: document.getElementById('templateType').value,
                subject: document.getElementById('templateSubject').value || null,
                body: document.getElementById('templateBody').value,
                variables: this.extractVariables(document.getElementById('templateBody').value)
            };

            try {
                App.Utils.showLoading('Creating template...');
                await App.API.post('/templates', templateData);
                App.Utils.hideLoading();
                App.Utils.hideModal();
                App.Utils.showToast('Template created successfully!');
                this.loadTemplates();
            } catch (error) {
                App.Utils.hideLoading();
                console.error('Failed to create template:', error);
                App.Utils.showToast('Failed to create template: ' + (error.message || 'Unknown error'), 'error');
            }
        });
    },

    async editTemplate(id) {
        try {
            const response = await App.API.get(`/templates/${id}`);
            const template = response.data;

            const content = `
                <form id="editTemplateForm" style="max-height: 70vh; overflow-y: auto;">
                    <div class="form-group">
                        <label for="editTemplateName">Template Name *</label>
                        <input type="text" id="editTemplateName" class="form-control" value="${template.name}" required>
                    </div>

                    <div class="form-group">
                        <label for="editTemplateType">Template Type</label>
                        <select id="editTemplateType" class="form-control">
                            <option value="outreach" ${template.template_type === 'outreach' ? 'selected' : ''}>Outreach</option>
                            <option value="followup" ${template.template_type === 'followup' ? 'selected' : ''}>Follow-up</option>
                            <option value="response" ${template.template_type === 'response' ? 'selected' : ''}>Response</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="editTemplateSubject">Subject Line (optional)</label>
                        <input type="text" id="editTemplateSubject" class="form-control" value="${template.subject || ''}">
                    </div>

                    <div class="form-group">
                        <label for="editTemplateBody">Message Body *</label>
                        <textarea id="editTemplateBody" class="form-control" rows="10" required>${template.body}</textarea>
                    </div>

                    <div class="form-group">
                        <button type="button" class="btn btn-outline btn-sm" onclick="App.Pages.templates.detectVariablesEdit()">
                            <i class="fas fa-magic"></i> Auto-detect Variables
                        </button>
                    </div>

                    <div class="form-group" id="detectedVariablesEdit" style="display: none;">
                        <label>Detected Variables:</label>
                        <div id="variablesListEdit" style="padding: 10px; background: var(--primary-light); border-radius: 4px;"></div>
                    </div>
                </form>
            `;

            App.Utils.showModal('Edit Message Template', content);

            document.getElementById('editTemplateForm').addEventListener('submit', async (e) => {
                e.preventDefault();

                const updates = {
                    name: document.getElementById('editTemplateName').value,
                    template_type: document.getElementById('editTemplateType').value,
                    subject: document.getElementById('editTemplateSubject').value || null,
                    body: document.getElementById('editTemplateBody').value,
                    variables: this.extractVariables(document.getElementById('editTemplateBody').value)
                };

                try {
                    App.Utils.showLoading('Updating template...');
                    await App.API.patch(`/templates/${id}`, updates);
                    App.Utils.hideLoading();
                    App.Utils.hideModal();
                    App.Utils.showToast('Template updated successfully!');
                    this.loadTemplates();
                } catch (error) {
                    App.Utils.hideLoading();
                    console.error('Failed to update template:', error);
                    App.Utils.showToast('Failed to update template: ' + (error.message || 'Unknown error'), 'error');
                }
            });
        } catch (error) {
            App.Utils.showToast('Failed to load template', 'error');
        }
    },

    async previewTemplate(id) {
        try {
            const response = await App.API.get(`/templates/${id}`);
            const template = response.data;

            // Preview with sample data
            const preview = this.renderTemplate(template.body, {
                shop_name: 'Sample Electronics Store',
                keyword: 'electronics',
                sender_name: 'John Doe',
                date: new Date().toLocaleDateString()
            });

            const content = `
                <div style="margin-bottom: 20px;">
                    <h4>${template.name}</h4>
                    ${template.subject ? `<p><strong>Subject:</strong> ${template.subject}</p>` : ''}
                </div>

                <div style="padding: 20px; background: var(--bg-color); border-radius: 8px; border-left: 4px solid var(--primary-color);">
                    ${preview}
                </div>

                <p style="margin-top: 15px; font-size: 12px; color: var(--text-secondary);">
                    * This is a preview with sample data
                </p>
            `;

            App.Utils.showModal('Template Preview', content);
        } catch (error) {
            App.Utils.showToast('Failed to load template', 'error');
        }
    },

    async testTemplate(id) {
        const sellerName = prompt('Enter a test seller name:', 'Test Store');

        if (!sellerName) {
            return;
        }

        try {
            const response = await App.API.get(`/templates/${id}`);
            const template = response.data;

            const testMessage = this.renderTemplate(template.body, {
                shop_name: sellerName,
                keyword: 'test',
                sender_name: App.State.user.name,
                date: new Date().toLocaleDateString()
            });

            const content = `
                <h4>Test Message</h4>
                <div style="padding: 20px; background: var(--bg-color); border-radius: 8px; border-left: 4px solid var(--success-color); margin: 15px 0;">
                    ${testMessage}
                </div>
                <p class="text-muted">This is how your message will appear when sent.</p>
            `;

            App.Utils.showModal('Test Template', content);
        } catch (error) {
            App.Utils.showToast('Failed to test template', 'error');
        }
    },

    async deleteTemplate(id) {
        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }

        try {
            App.Utils.showLoading('Deleting template...');
            await App.API.delete(`/templates/${id}`);
            App.Utils.hideLoading();
            App.Utils.showToast('Template deleted successfully!');
            this.loadTemplates();
        } catch (error) {
            App.Utils.hideLoading();
            App.Utils.showToast('Failed to delete template', 'error');
        }
    },

    extractVariables(text) {
        const regex = /\{([a-z_]+)\}/gi;
        const matches = text.match(regex);
        return matches ? [...new Set(matches.map(m => m.replace(/[{}]/g, '')))] : [];
    },

    detectVariables() {
        const body = document.getElementById('templateBody').value;
        const variables = this.extractVariables(body);

        if (variables.length > 0) {
            document.getElementById('detectedVariables').style.display = 'block';
            document.getElementById('variablesList').innerHTML = variables.map(v =>
                `<code style="background: white; padding: 4px 8px; border-radius: 4px; margin-right: 5px;">{${v}}</code>`
            ).join('');
        } else {
            document.getElementById('detectedVariables').style.display = 'none';
        }
    },

    detectVariablesEdit() {
        const body = document.getElementById('editTemplateBody').value;
        const variables = this.extractVariables(body);

        if (variables.length > 0) {
            document.getElementById('detectedVariablesEdit').style.display = 'block';
            document.getElementById('variablesListEdit').innerHTML = variables.map(v =>
                `<code style="background: white; padding: 4px 8px; border-radius: 4px; margin-right: 5px;">{${v}}</code>`
            ).join('');
        } else {
            document.getElementById('detectedVariablesEdit').style.display = 'none';
        }
    },

    renderTemplate(template, data) {
        let rendered = template;

        Object.keys(data).forEach(key => {
            rendered = rendered.replace(new RegExp(`{${key}}`, 'gi'), data[key]);
        });

        return rendered.replace(/\n/g, '<br>');
    }
};
