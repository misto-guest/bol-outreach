# User Guide - Bol.com Seller Intelligence Platform

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Discovering Sellers](#discovering-sellers)
4. [Managing Sellers](#managing-sellers)
5. [Creating Message Templates](#creating-message-templates)
6. [Running Campaigns](#running-campaigns)
7. [Approval Workflow](#approval-workflow)
8. [Analytics & Reporting](#analytics--reporting)
9. [Settings & Configuration](#settings--configuration)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First Time Setup

1. **Install the platform** (see README.md)

2. **Start the server:**
   ```bash
   node src/server.js
   ```

3. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

4. **You'll see the Dashboard** with overview statistics

### Basic Workflow

```
1. Discover Sellers → 2. Create Template → 3. Create Campaign → 4. Review & Approve → 5. Send Messages
```

---

## Dashboard Overview

The dashboard is your command center. It shows:

### Key Metrics (Top Cards)
- **Total Sellers** - All sellers in database
- **Active Campaigns** - Currently running campaigns
- **Pending Approvals** - Messages awaiting your review
- **Messages Sent** - Total messages sent

### Quick Actions
Fast access to common tasks:
- **Discover Sellers** - Start seller discovery
- **New Campaign** - Create a new campaign
- **Review Queue** - Go to approval queue
- **Manage Templates** - Create/edit templates

### Recent Activity
Shows the last 10 actions:
- Campaigns created/started
- Templates created
- Sellers discovered
- Messages approved/rejected

### System Status
- **Database** - Should show "Connected"
- **AdsPower** - Shows profile count if configured

---

## Discovering Sellers

### What It Does

Automatically searches Bol.com for sellers matching your keywords and extracts their information.

### Step-by-Step

1. **Navigate to Seller Discovery**
   - Click "Seller Discovery" in sidebar

2. **Enter Keywords**
   ```
   electronics, gadgets, computers, phones
   ```
   - Separate keywords with commas
   - Use relevant product categories
   - Start broad, then narrow down

3. **Configure Search Options**
   - ✅ **Extract seller information** - Get detailed data (recommended)
   - ✅ **Save to database** - Store sellers (recommended)
   - ✅ **Deep search** - More results, slower (optional)

4. **Set Maximum Results**
   - 10-25 sellers per keyword is good for testing
   - 50-100 for production campaigns

5. **Click "Start Discovery"**

6. **Monitor Progress**
   - Progress bar shows completion
   - Current keyword displayed
   - Sellers found count updates live

7. **Review Results**
   - See discovered sellers in table
   - Export to CSV if needed
   - Create campaign directly from results

### Tips

- **Start Specific** - "laptop accessories" > "electronics"
- **Use Dutch Terms** - "laptops" > "computers" (Bol.com is Dutch)
- **Test First** - Run with 1-2 keywords to test
- **Check Competition** - See what sellers exist in your niche

---

## Managing Sellers

### View All Sellers

Navigate to **Sellers** in sidebar to see:
- Shop name and URL
- Discovery keyword
- Rating and product count
- Status badge
- Discovery date

### Filter Sellers

Use the filter dropdown:
- **All Status** - Show all sellers
- **New** - Recently discovered
- **Researched** - Manually reviewed
- **Contacted** - Already contacted
- **Responded** - Responded to outreach

### Search Sellers

Type in the search box to find:
- Shop names
- Seller IDs
- Keywords

### Seller Details

Click the 👁️ eye icon to see:
- Full seller information
- Contact details
- Outreach history
- Campaign interactions

### Edit Seller

Click the ✏️ edit icon to:
- Update shop name
- Add contact email
- Change status
- Add notes

### Mark as Researched

For new sellers, click "Mark as Researched" to:
- Move from "new" to "researched" status
- Make them available for campaigns

---

## Creating Message Templates

### Why Templates?

Templates save time and ensure consistent messaging. Use variables to personalize.

### Template Variables

| Variable | Replaced With |
|----------|---------------|
| `{shop_name}` | Seller's shop name |
| `{keyword}` | Discovery keyword |
| `{sender_name}` | Your name (from settings) |
| `{date}` | Today's date |

### Creating a Template

1. **Go to Message Templates**

2. **Click "New Template"**

3. **Fill in Details:**
   - **Template Name** - e.g., "Initial Outreach Q1"
   - **Template Type** - Outreach (default)
   - **Subject Line** - Optional (for email-style messages)

4. **Write Your Message:**
   ```
   Hi {shop_name} team,

   I came across your store while researching {keyword} sellers on Bol.com.
   Impressive collection!

   I'm reaching out because...

   Best regards,
   {sender_name}
   {date}
   ```

5. **Auto-detect Variables**
   - Click to automatically find variables in your message
   - Check detected variables list

6. **Create Template**

### Testing Templates

1. Click **Test** on template card
2. Enter a test seller name
3. Preview shows how message will appear

### Editing Templates

Click **Edit** to modify:
- Change message content
- Update variables
- Modify subject line

### Deleting Templates

Click **Delete** to remove (inactive templates are kept in database).

### Example Templates

**Initial Outreach:**
```
Hi {shop_name},

I'm reaching out because...
[Your value proposition]

Would you be interested in...?

Best,
{sender_name}
```

**Follow-up:**
```
Hi {shop_name},

Just following up on my previous message...
[Any additional info]

Let me know your thoughts.

{sender_name}
```

---

## Running Campaigns

### What is a Campaign?

A campaign organizes your outreach with:
- Target keywords
- Message template
- Daily sending limits
- Performance tracking

### Creating a Campaign

1. **Go to Campaigns**

2. **Click "New Campaign"**

3. **Campaign Details:**
   - **Name** - e.g., "Q1 Electronics Outreach"
   - **Keywords** - Target keywords
   - **Message Template** - Select template
   - **Daily Limit** - Max 10 recommended (for safety)
   - **Notes** - Campaign goals, etc.

4. **Create Campaign**

### Starting a Campaign

1. Find your campaign in the list
2. Click ▶️ **Start** button
3. Campaign status changes to "active"

### Campaign Statuses

- **Draft** - Not yet started
- **Active** - Currently running
- **Paused** - Temporarily stopped
- **Stopped** - Ended
- **Completed** - Finished successfully

### Monitoring Campaigns

On the campaign card:
- **Messages Sent** - Count of sent messages
- **Last Activity** - Recent actions
- **Performance** - Response rate (if tracked)

### Editing Campaigns

Click 👁️ **View** then **Edit** to:
- Change name or keywords
- Update daily limit
- Modify notes
- Switch templates

### Stopping Campaigns

Click ⏹️ **Stop** to:
- Pause outreach
- Keep all data
- Can restart later

---

## Approval Workflow

### Why Manual Approval?

Compliance and quality control:
- Verify message content
- Check seller relevance
- Prevent mistakes
- Maintain professionalism

### The Approval Queue

1. **Navigate to Approval Queue**
   - See all pending messages
   - Count shown in sidebar badge

2. **Review Each Message**
   - Seller name and shop URL
   - Campaign name
   - Message preview
   - Queued date

3. **Actions:**
   - ✅ **Approve & Send** - Approve and send immediately
   - ❌ **Reject** - Skip with optional reason
   - ⏭️ **Skip** - Keep in queue for later
   - 👁️ **View Seller** - See full seller details

### Batch Approval

**Approve All at Once:**
1. Click "Batch Approve All"
2. Confirm action
3. All messages sent immediately

⚠️ **Use carefully** - review first!

### Approval Tips

- **Check Message** - Read before approving
- **Verify Seller** - Click through to shop URL
- **Check Relevance** - Is this seller a good fit?
- **Personalization** - Was the message properly personalized?

### After Approval

- Approved messages are sent via AdsPower
- Status updates to "sent"
- Seller status changes to "contacted"
- Logged in audit trail

---

## Analytics & Reporting

### Dashboard Analytics

Quick overview of:
- Total sellers discovered
- Active campaigns
- Messages sent/delivered
- Pending approvals

### Full Analytics Page

Navigate to **Analytics** for detailed reports.

### Key Metrics

**Seller Metrics:**
- Total sellers in database
- New sellers (discovered)
- Contacted sellers
- Responded sellers

**Campaign Metrics:**
- Total campaigns
- Active campaigns
- Messages per campaign
- Response rates

**Engagement Metrics:**
- Messages sent
- Messages delivered
- Pending approvals
- Failed sends

### Campaign Performance Table

Shows each campaign with:
- Campaign name
- Status
- Sellers contacted
- Messages sent
- Response rate
- Creation date

### Exporting Reports

1. Go to **Analytics**
2. Select time period (7/30/90/365 days)
3. Click **Export Report**
4. Downloads JSON file with all data

### Recent Activity

Timeline of all actions:
- Campaigns created/started/stopped
- Templates created/updated
- Sellers discovered
- Messages approved/rejected/sent

---

## Settings & Configuration

### Platform Settings

Navigate to **Settings** to configure:

**Basic Settings:**
- **Default Sender Name** - Used in `{sender_name}` variable
- **Default Daily Limit** - For new campaigns
- **Cooldown Period** - Days before re-contacting (default: 120)

**Compliance:**
- ✅ **Require Manual Approval** - Always on for compliance
- ✅ **Enable Audit Logging** - Always on for compliance

### AdsPower Integration

**Check Status:**
- See connection status
- View available profiles
- Test connection

**Profiles:**
- Profile ID
- Profile name
- Active status

**Troubleshooting:**
- Click "Test Connection"
- Click "Refresh Profiles"

### Compliance Features

All enabled by default:
- ✅ Manual approval required
- ✅ Rate limiting (2 msgs/profile/day)
- ✅ 120-day cooldown
- ✅ Full audit trail
- ✅ Opt-out mechanisms

### Data Management

**Export Data:**
- Export Sellers
- Export Campaigns
- Export Templates
- Export Audit Log

All downloads as JSON files.

### Danger Zone

**Clear All Data:**
⚠️ **Permanent action** - Deletes all data
- Type "DELETE ALL DATA" to confirm
- Only use if absolutely necessary

---

## Best Practices

### 1. Seller Discovery

✅ **DO:**
- Start with specific keywords
- Use Dutch terms (Bol.com is Dutch)
- Test with small batches first
- Check results quality

❌ **DON'T:**
- Use overly broad terms
- Discover thousands at once
- Ignore seller relevance
- Skip the research step

### 2. Message Templates

✅ **DO:**
- Personalize with variables
- Keep messages concise
- Provide clear value
- Test before using
- Create multiple templates

❌ **DON'T:**
- Send generic messages
- Write novels
- Forget to proofread
- Use all caps
- Skip the test feature

### 3. Campaigns

✅ **DO:**
- Set appropriate daily limits (10/day max)
- Monitor progress regularly
- Use meaningful names
- Add notes for context
- Start small, scale up

❌ **DON'T:**
- Exceed rate limits
- Set and forget
- Use vague names
- Skip approval queue
- Contact same sellers too often

### 4. Approvals

✅ **DO:**
- Review every message
- Check seller URLs
- Verify personalization
- Reject poor quality
- Keep approval queue managed

❌ **DON'T:**
- Batch approve without reviewing
- Skip seller details
- Approve generic messages
- Let queue build up
- Approve when unsure

### 5. Compliance

✅ **DO:**
- Follow all laws (GDPR, etc.)
- Provide opt-out options
- Keep accurate records
- Respect seller preferences
- Maintain professionalism

❌ **DON'T:**
- Spam sellers
- Ignore opt-outs
- Falsify records
- Harass sellers
- Be unprofessional

---

## Troubleshooting

### Common Issues

#### No Sellers Discovered

**Problem:** Discovery returns 0 sellers

**Solutions:**
- Try different keywords
- Use Dutch terms
- Increase max results
- Check if Bol.com changed UI
- Run investigation scripts

#### Messages Not Sending

**Problem:** Approved but not sent

**Solutions:**
- Check AdsPower connection
- Verify profile is active
- Check rate limits
- View audit log for errors

#### Rate Limiting Errors

**Problem:** "Rate limit exceeded"

**Solutions:**
- Wait 24 hours
- Use more profiles
- Reduce daily limit
- Check cooldown status

#### Puppeteer Errors

**Problem:** Browser automation fails

**Solutions:**
- Install Chromium dependencies
- Update Puppeteer: `npm install puppeteer`
- Check system requirements
- Try running investigation script

#### Database Errors

**Problem:** "SQLITE_ERROR" or similar

**Solutions:**
- Delete `data/bol-outreach.db` to reset
- Check file permissions
- Ensure disk space available
- Restart server

### Getting Help

1. **Check the logs** - Terminal output shows errors
2. **Review the docs** - This guide + README.md
3. **Run investigation** - Update selectors if UI changed
4. **Check database** - View data in `data/bol-outreach.db`
5. **Restart server** - Often fixes temporary issues

### Debug Mode

Enable detailed logging:
```javascript
// In src/server.js
const DEBUG = true;
```

---

## FAQ

**Q: How many messages can I send per day?**
A: Maximum 2 per AdsPower profile per day. Use multiple profiles to scale.

**Q: Can I contact the same seller twice?**
A: Only after 120-day cooldown. This is enforced for compliance.

**Q: Do I need AdsPower?**
A: Recommended for multi-accounting. Without it, you can still use the platform with manual sending.

**Q: Is this legal?**
A: For B2B outreach only. Follow all laws (GDPR, etc.) and provide opt-outs.

**Q: Can I customize the UI?**
A: Yes! Edit files in `public/css/` and `public/js/`.

**Q: How do I update Bol.com selectors?**
A: Run `node src/investigate-bol.js` and update `src/seller-research.js`.

**Q: Can I export my data?**
A: Yes, use Settings > Export Data for each data type.

**Q: What if Bol.com blocks me?**
A: Use rate limiting, vary timing, use AdsPower profiles, and respect robots.txt.

---

## Tips for Success

### Start Small
- Test with 10-20 sellers
- One campaign at a time
- Learn what works

### Personalize Everything
- Use template variables
- Reference specific products
- Show you did research

### Follow Up
- Create follow-up templates
- Wait 7-14 days between contacts
- Track response rates

### Stay Compliant
- Always approve manually
- Keep audit trail
- Honor opt-outs
- Be professional

### Monitor Performance
- Check analytics weekly
- A/B test templates
- Adjust keywords based on results
- Learn from responses

---

**Happy outreaching! 🎯**
