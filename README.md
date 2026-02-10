# Bol.com Seller Intelligence & Outreach Platform

A compliant B2B lead generation tool for discovering and contacting Bol.com marketplace sellers.

## Features

- 🔍 **Seller Discovery** - Automatically find Bol.com sellers by keywords
- 📝 **Message Templates** - Create reusable message templates with variables
- 📢 **Campaign Management** - Organize outreach into campaigns
- ✅ **Manual Approval** - Review all messages before sending
- 🚦 **Rate Limiting** - Enforces 2 messages per profile per day
- ❄️ **Cooldown** - 120-day cooldown between contacts per seller
- 📊 **Analytics** - Track campaign performance and metrics
- 🔒 **Compliance** - Full audit trail and opt-out mechanisms

## Requirements

- Node.js 18+
- npm or yarn
- SQLite3 (included)
- Puppeteer (included)
- AdsPower Desktop (recommended for multi-accounting)

## Installation

1. **Clone or download the repository**
   ```bash
   cd bol-outreach
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure AdsPower (optional but recommended)**

   If you want to use multiple profiles for outreach:

   - Download and install [AdsPower Desktop](https://adspower.net/)
   - Create profiles for your outreach accounts
   - Configure the API in AdsPower settings
   - Update the AdsPower client path in `src/server.js` if needed

4. **Start the server**
   ```bash
   node src/server.js
   ```

5. **Open the dashboard**
   ```
   http://localhost:3000
   ```

## Quick Start

### 1. Discover Sellers

1. Navigate to **Seller Discovery** in the sidebar
2. Enter keywords (e.g., "electronics, gadgets, tech")
3. Configure search options:
   - **Extract seller information** - Get detailed seller data
   - **Save to database** - Store sellers for campaigns
   - **Deep search** - Get more results (slower)
4. Click **Start Discovery**
5. Wait for sellers to be discovered

### 2. Create Message Template

1. Navigate to **Message Templates**
2. Click **New Template**
3. Fill in:
   - **Template Name** - e.g., "Initial Outreach"
   - **Subject Line** - Optional subject for messages
   - **Message Body** - Your message with variables like `{shop_name}`, `{sender_name}`, `{date}`
4. Click **Auto-detect Variables** to find used variables
5. Click **Create Template**

### 3. Create Campaign

1. Navigate to **Campaigns**
2. Click **New Campaign**
3. Configure:
   - **Campaign Name** - e.g., "Q1 Electronics Outreach"
   - **Keywords** - Keywords for targeting
   - **Message Template** - Select your template
   - **Daily Limit** - Max messages per day (default: 10)
   - **Notes** - Campaign notes
4. Click **Create Campaign**
5. Click **Start Campaign** when ready

### 4. Review & Approve Messages

1. Navigate to **Approval Queue**
2. Review each message:
   - Check seller information
   - Verify message content
   - Click **Approve & Send** to send
   - Click **Reject** to skip
3. Or use **Batch Approve All** to approve all at once

### 5. Monitor Progress

1. Check **Dashboard** for overview stats
2. Check **Analytics** for detailed reports
3. Review **Audit Log** for compliance tracking

## Architecture

```
bol-outreach/
├── src/
│   ├── server.js              # Express server & API routes
│   ├── database.js            # SQLite database & queries
│   ├── seller-research.js     # Puppeteer-based seller discovery
│   ├── outreach-engine.js     # Message execution via AdsPower
│   ├── investigate-bol.js     # Bol.com UI investigation script
│   └── investigate-marketplace.js
├── public/
│   ├── index.html             # Main dashboard HTML
│   ├── css/
│   │   └── styles.css         # Application styles
│   └── js/
│       ├── app.js             # Main application logic
│       └── pages/
│           ├── dashboard.js
│           ├── research.js
│           ├── sellers.js
│           ├── campaigns.js
│           ├── approvals.js
│           ├── templates.js
│           ├── analytics.js
│           └── settings.js
├── data/
│   └── bol-outreach.db        # SQLite database (auto-created)
└── docs/
    └── (investigation reports)
```

## Database Schema

### Sellers
- `id` - Primary key
- `shop_name` - Seller's shop name
- `shop_url` - Link to seller page
- `seller_id` - Unique seller identifier
- `keyword` - Keyword used to discover
- `rating` - Seller rating
- `total_products` - Number of products
- `contact_email` - Contact email
- `status` - new, researched, contacted, responded, opted_out
- `discovered_at` - Discovery timestamp

### Campaigns
- `id` - Primary key
- `name` - Campaign name
- `message_template_id` - Associated template
- `keywords` - Target keywords
- `status` - draft, active, paused, completed
- `daily_limit` - Max messages per day
- `total_sent` - Total messages sent
- `created_at` - Creation timestamp

### Message Templates
- `id` - Primary key
- `name` - Template name
- `subject` - Subject line
- `body` - Message body with variables
- `variables` - JSON array of variables used
- `is_active` - Active status

### Outreach Log
- `id` - Primary key
- `seller_id` - FK to sellers
- `campaign_id` - FK to campaigns
- `message_sent` - Message content
- `status` - pending, sent, failed
- `approval_status` - pending, approved, rejected
- `contacted_at` - Sent timestamp

### AdsPower Usage
- `profile_id` - Profile ID
- `messages_sent_today` - Daily message count
- `cooldown_until` - Cooldown end date
- `last_used` - Last use date

## API Endpoints

### Stats
- `GET /api/stats` - Dashboard statistics

### Sellers
- `GET /api/sellers` - List all sellers
- `GET /api/sellers/:id` - Get seller details
- `POST /api/sellers` - Add/update seller
- `PATCH /api/sellers/:id/status` - Update seller status

### Campaigns
- `GET /api/campaigns` - List all campaigns
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns` - Create campaign
- `PATCH /api/campaigns/:id` - Update campaign
- `POST /api/campaigns/:id/start` - Start campaign
- `POST /api/campaigns/:id/stop` - Stop campaign

### Templates
- `GET /api/templates` - List all templates
- `GET /api/templates/:id` - Get template
- `POST /api/templates` - Create template
- `PATCH /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

### Approvals
- `GET /api/approvals` - Get pending approvals
- `POST /api/approvals/:id/approve` - Approve message
- `POST /api/approvals/:id/reject` - Reject message

### Research
- `POST /api/research/start` - Start seller discovery
- `GET /api/research/queue` - Get research queue
- `GET /api/research/status` - Get research status

### Outreach
- `POST /api/outreach/execute` - Execute approved messages
- `GET /api/outreach/status` - Get outreach status

### AdsPower
- `GET /api/adspower/profiles` - List profiles
- `GET /api/adspower/profiles/:profileId/status` - Get profile usage
- `POST /api/adspower/profiles/:profileId/start` - Start profile
- `POST /api/adspower/profiles/:profileId/stop` - Stop profile

### Audit
- `GET /api/audit` - Get audit log

## Compliance Features

### Rate Limiting
- Maximum 2 messages per AdsPower profile per day
- Automatic cooldown enforcement (120 days)
- Tracks usage per profile

### Manual Approval
- All messages require approval before sending
- Review seller info + message content
- Approve individually or batch approve

### Audit Logging
- Every action is logged
- Track who, what, when
- Full compliance history

### Opt-Out
- Clear opt-out mechanisms
- Respect seller preferences
- Easy to exclude sellers

## Configuration

### Server Settings
Edit `src/server.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

### AdsPower Integration
Update the path if needed:
```javascript
const AdsPowerClient = require('/path/to/adspower-client.js');
```

### Environment Variables
```bash
PORT=3000              # Server port
NODE_ENV=production    # Environment
```

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Verify all dependencies are installed (`npm install`)
- Check Node.js version (18+ required)

### Puppeteer errors
- Ensure Chromium dependencies are installed
- On Ubuntu: `apt-get install chromium-browser`
- On macOS: Should work out of the box

### AdsPower not connecting
- Verify AdsPower Desktop is running
- Check API is enabled in AdsPower settings
- Confirm profile IDs are correct

### No sellers discovered
- Bol.com may have changed their UI
- Run investigation scripts to update selectors
- Check `docs/` for investigation reports

## Development

### Run investigation scripts
To investigate Bol.com's current UI:
```bash
node src/investigate-bol.js
node src/investigate-marketplace.js
```

### Update selectors
If Bol.com changes their UI:
1. Run investigation scripts
2. Check generated reports in `docs/`
3. Update selectors in `src/seller-research.js`

## Best Practices

1. **Start Small** - Test with 10-20 sellers first
2. **Personalize Messages** - Use variables effectively
3. **Follow Up** - Create follow-up templates
4. **Respect Limits** - Don't exceed rate limits
5. **Monitor Performance** - Check analytics regularly
6. **Stay Compliant** - Always approve messages manually
7. **Test Templates** - Use the test feature before sending

## Legal & Ethical Considerations

⚠️ **Important:** This tool is for B2B outreach only. Always:

- Comply with GDPR and local regulations
- Provide clear opt-out mechanisms
- Respect seller preferences
- Don't spam or harass sellers
- Keep messages professional and relevant
- Maintain accurate records (audit log helps)

## Support & Contributing

This is a compliance-focused B2B lead generation tool. Use responsibly.

## License

ISC

## Changelog

### v1.0.0 (2025-02-10)
- Initial release
- Seller discovery by keywords
- Message template system
- Campaign management
- Manual approval workflow
- Rate limiting and cooldown
- Full dashboard UI
- Analytics and reporting
- Audit logging
