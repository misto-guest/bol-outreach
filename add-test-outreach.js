/**
 * Add test sellers to campaign
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/bol-outreach.db');
const db = new sqlite3.Database(dbPath);

async function addOutreachRecords() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Add outreach records for sellers 1-5 to campaign 1
      const sellers = [1, 2, 3, 4, 5];

      sellers.forEach(sellerId => {
        db.run(`
          INSERT INTO outreach_log (seller_id, campaign_id, status, approval_status, message_sent)
          VALUES (?, ?, ?, ?, ?)
        `, [sellerId, 1, 'pending', 'approved', 'Test message prepared'], (err) => {
          if (err) {
            console.error(`Error adding seller ${sellerId}:`, err.message);
          } else {
            console.log(`✓ Added seller ${sellerId} to campaign`);
          }
        });
      });

      // Wait a bit for all inserts to complete
      setTimeout(() => {
        db.close();
        resolve();
      }, 500);
    });
  });
}

addOutreachRecords()
  .then(() => console.log('Done!'))
  .catch(err => console.error('Error:', err));
