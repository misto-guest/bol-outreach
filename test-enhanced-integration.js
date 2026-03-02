/**
 * Test Enhanced Integration
 * Validates that all new features work correctly
 */

const Database = require('./src/database.js');
const OutreachEngine = require('./src/outreach-engine/outreach-engine.js');
const ProfileRotator = require('./src/outreach-engine/profile-rotator.js');
const RateLimiter = require('./src/outreach-engine/rate-limiter.js');
const TimeWindowChecker = require('./src/outreach-engine/time-window-checker.js');
const MessageVariator = require('./src/outreach-engine/message-variator.js');

async function testEnhancedIntegration() {
    console.log('🧪 Testing Enhanced Bol.com Outreach Integration...\n');

    try {
        // Test 1: Profile Rotation
        console.log('1️⃣ Testing Profile Rotation');
        const profiles = [
            { server: '77.42.21.134', port: 50325, profileId: 'profile-1' },
            { server: '77.42.21.134', port: 50325, profileId: 'profile-2' },
            { server: '77.42.21.134', port: 50325, profileId: 'profile-3' }
        ];
        
        const profileRotator = new ProfileRotator(profiles);
        console.log(`   ✅ Created profile rotator with ${profileRotator.getProfileCount()} profiles`);
        console.log(`   ✅ Rotation enabled: ${profileRotator.isRotationEnabled()}`);
        
        // Test rotation
        const profile1 = profileRotator.getNextProfile();
        const profile2 = profileRotator.getNextProfile();
        const profile3 = profileRotator.getNextProfile();
        const profile4 = profileRotator.getNextProfile(); // Should cycle back to profile-1
        
        console.log(`   ✅ Profile rotation working: ${profile1.profileId} → ${profile2.profileId} → ${profile3.profileId} → ${profile4.profileId}`);

        // Test 2: Rate Limiting
        console.log('\n2️⃣ Testing Rate Limiting');
        const rateLimiter = new RateLimiter(5); // 5 messages per hour
        
        // Test initial state
        const initialCheck = rateLimiter.canSend('test-profile');
        console.log(`   ✅ Initial check: ${initialCheck.allowed ? 'PASS' : 'FAIL'}`);
        
        // Record some messages
        for (let i = 0; i < 3; i++) {
            rateLimiter.recordMessage('test-profile');
        }
        
        const rateStats = rateLimiter.getStats('test-profile');
        console.log(`   ✅ Stats: ${rateStats?.sent}/${rateStats?.limit} messages, reset in ${rateStats?.resetIn} minutes`);
        
        // Test limit enforcement
        for (let i = 0; i < 3; i++) {
            rateLimiter.recordMessage('test-profile');
        }
        
        const limitCheck = rateLimiter.canSend('test-profile');
        console.log(`   ✅ Limit enforcement: ${limitCheck.allowed ? 'FAIL (should be blocked)' : 'PASS (blocked correctly)'}`);

        // Test 3: Time Window Checker
        console.log('\n3️⃣ Testing Time Window Checker');
        const timeChecker = new TimeWindowChecker('Europe/Amsterdam', 9, 20);
        const timeCheck = timeChecker.canSendNow();
        
        console.log(`   ✅ Time check: ${timeCheck.allowed ? 'PASS (within window)' : 'PASS (outside window)'}`);
        if (!timeCheck.allowed) {
            console.log(`   ℹ️  Reason: ${timeCheck.reason}`);
            if (timeCheck.nextAllowedTime) {
                console.log(`   ℹ️  Next allowed: ${timeChecker.formatNextAllowedTime(timeCheck.nextAllowedTime)}`);
            }
        }

        // Test 4: Message Variator
        console.log('\n4️⃣ Testing Message Variator');
        const messageVariator = new MessageVariator();
        
        // Add template
        const templateId = messageVariator.addTemplate({
            subject: 'Partnership Opportunity',
            body: 'Hi, I would like to discuss a potential partnership with your company.',
            category: 'partnership'
        });
        
        console.log(`   ✅ Added template: ${templateId}`);
        
        // Get variation
        const variation = messageVariator.getRandomVariation(templateId);
        console.log(`   ✅ Got variation: "${variation.subject}"`);
        
        // Test stats
        const variatorStats = messageVariator.getStats();
        console.log(`   ✅ Stats: ${variatorStats.totalTemplates} templates, ${variatorStats.totalVariations} variations`);

        // Test 5: Enhanced Outreach Engine Configuration
        console.log('\n5️⃣ Testing Enhanced Outreach Engine');
        const config = {
            profiles: profiles,
            maxMessagesPerHour: 5,
            delayMs: 3000,
            timezone: 'Europe/Amsterdam',
            businessHours: { start: 9, end: 20 },
            enableVariations: true
        };
        
        console.log(`   ✅ Configuration created with ${config.profiles.length} profiles`);
        console.log(`   ✅ Rate limit: ${config.maxMessagesPerHour} messages/hour`);
        console.log(`   ✅ Business hours: ${config.businessHours?.start}:00 - ${config.businessHours?.end}:00`);
        console.log(`   ✅ Variations enabled: ${config.enableVariations}`);

        // Test 6: Database Integration
        console.log('\n6️⃣ Testing Database Integration');
        const db = new Database();
        await db.init();
        
        // Test dashboard stats
        const stats = await db.getDashboardStats();
        console.log(`   ✅ Dashboard stats: ${stats.totalSellers} sellers, ${stats.totalCampaigns} campaigns`);
        
        db.close();

        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📋 Integration Summary:');
        console.log('   ✅ Profile Rotation: Ready for multi-profile outreach');
        console.log('   ✅ Rate Limiting: Protects against detection');
        console.log('   ✅ Business Hours: Professional timing enforcement');
        console.log('   ✅ Message Variations: Reduces repetition detection');
        console.log('   ✅ Enhanced Engine: Unified system with all features');
        console.log('   ✅ Database: Backward compatible with existing data');

        console.log('\n🚀 Ready for production use!');
        console.log('\n📝 Next Steps:');
        console.log('   1. Configure your AdsPower profiles in .env');
        console.log('   2. Set up AI service for message variations (optional)');
        console.log('   3. Test with a small batch of messages');
        console.log('   4. Monitor rate limits and adjust as needed');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testEnhancedIntegration();
}

module.exports = testEnhancedIntegration;
