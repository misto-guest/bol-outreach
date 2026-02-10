/**
 * Test script for template creation
 */

const Database = require('./src/database');

async function testTemplateCreation() {
  const db = new Database();

  try {
    console.log('Initializing database...');
    await db.init();

    console.log('\nCreating test template...');
    const templateData = {
      name: 'Test Template',
      subject: 'Test Subject',
      body: 'Hoi! Ik heb recent 2 verkopers geholpen met het verdubbelen van hun verkoo p met onze Bol rank ing service. Zou dat ook iets voor julie zijn? Jaap Verwal BolBoosting BV',
      template_type: 'outreach'
    };

    const result = await db.createTemplate(templateData);
    console.log('✓ Template created successfully!');
    console.log('  ID:', result.id);
    console.log('  Name:', templateData.name);
    console.log('  Body length:', templateData.body.length);

    console.log('\nRetrieving template from database...');
    const templates = await db.all('SELECT * FROM message_templates WHERE id = ?', [result.id]);
    console.log('✓ Template retrieved:', templates[0]);

    console.log('\n✅ SUCCESS: Template saving works correctly!');
    return templates[0];

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    db.close();
  }
}

// Run the test
testTemplateCreation()
  .then(() => {
    console.log('\nTest completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTest failed:', error.message);
    process.exit(1);
  });
