/**
 * Create Test Pod Members
 *
 * Creates test data for testing pod amplification
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createTestPodMembers() {
  console.log('🔧 Creating test pod members...\n');

  try {
    // 1. Get or create test client (temporary "pod")
    let { data: existingClient } = await supabase
      .from('client')
      .select('id')
      .limit(1)
      .single();

    let testClientId = existingClient?.id;

    if (!testClientId) {
      const { data: newClient, error } = await supabase
        .from('client')
        .insert({
          name: 'Test Pod - Courageous Bear',
          agency_id: 'c3ae8595-ba0a-44c8-aa44-db0bdfc3f951',
          slug: 'test-pod-courageous-bear'
        })
        .select()
        .single();

      if (error) throw error;
      testClientId = newClient.id;
      console.log('✅ Created test client (pod):', testClientId);
    } else {
      console.log('✅ Using existing client as pod:', testClientId);
    }

    // 2. Create test users via Supabase Auth Admin API
    const testUsers = [
      {
        email: 'test-pod-member-1@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Member One',
        linkedinUrl: 'https://www.linkedin.com/in/test-member-1',
        unipileAccountId: 'UNIPILE_TEST_ACCOUNT_1'
      },
      {
        email: 'test-pod-member-2@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Member Two',
        linkedinUrl: 'https://www.linkedin.com/in/test-member-2',
        unipileAccountId: 'UNIPILE_TEST_ACCOUNT_2'
      }
    ];

    for (const testUser of testUsers) {
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true,
        user_metadata: {
          email_verified: true
        }
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
          console.log(`⚠️  User already exists: ${testUser.email}`);

          // Get existing user
          const { data: existingUser } = await supabase.auth.admin.listUsers();
          const user = existingUser.users.find(u => u.email === testUser.email);

          if (user) {
            // Create users table entry
            await supabase
              .from('user')
              .upsert({
                id: user.id,
                email: testUser.email,
                client_id: testClientId,
                agency_id: 'c3ae8595-ba0a-44c8-aa44-db0bdfc3f951',
                first_name: testUser.firstName,
                last_name: testUser.lastName
              });

            // Create pod_member entry
            await supabase
              .from('pod_member')
              .upsert({
                client_id: testClientId,
                user_id: user.id,
                name: `${testUser.firstName} ${testUser.lastName}`,
                linkedin_url: testUser.linkedinUrl,
                unipile_account_id: testUser.unipileAccountId,
                is_active: true,
                onboarding_status: 'active',
                invite_token: `test-token-${Date.now()}`,
                invite_sent_at: new Date().toISOString()
              });

            console.log(`✅ Updated pod member: ${testUser.email}`);
          }
          continue;
        } else {
          throw authError;
        }
      }

      console.log(`✅ Created auth user: ${testUser.email}`);

      // Create users table entry
      const { error: userError } = await supabase
        .from('user')
        .insert({
          id: authUser.user.id,
          email: testUser.email,
          client_id: testClientId,
          agency_id: 'c3ae8595-ba0a-44c8-aa44-db0bdfc3f951',
          first_name: testUser.firstName,
          last_name: testUser.lastName
        });

      if (userError && !userError.message.includes('duplicate')) {
        throw userError;
      }

      console.log(`✅ Created users record: ${testUser.email}`);

      // Create pod_member entry
      const { error: memberError } = await supabase
        .from('pod_member')
        .insert({
          client_id: testClientId,
          user_id: authUser.user.id,
          name: `${testUser.firstName} ${testUser.lastName}`,
          linkedin_url: testUser.linkedinUrl,
          unipile_account_id: testUser.unipileAccountId,
          is_active: true,
          onboarding_status: 'active',
          invite_token: `test-token-${Date.now()}`,
          invite_sent_at: new Date().toISOString()
        });

      if (memberError && !memberError.message.includes('duplicate')) {
        throw memberError;
      }

      console.log(`✅ Created pod member: ${testUser.email}`);
    }

    // 3. Add Roderic to the pod
    const rodericUserId = '5ccd18cd-476a-4923-a6c4-b6cc7b4c5b84';

    const { error: rodericError } = await supabase
      .from('pod_member')
      .insert({
        client_id: testClientId,
        user_id: rodericUserId,
        name: 'Roderic Andrews',
        linkedin_url: 'https://www.linkedin.com/in/rodericandrews',
        unipile_account_id: 'YOUR_REAL_UNIPILE_ACCOUNT_ID',
        is_active: true,
        onboarding_status: 'active',
        invite_token: 'roderic-token',
        invite_sent_at: new Date().toISOString()
      });

    if (rodericError && !rodericError.message.includes('duplicate')) {
      throw rodericError;
    }

    console.log('✅ Added Roderic to pod');

    // 4. Verify creation
    const { data: podMembers } = await supabase
      .from('pod_member')
      .select('id, name, linkedin_url, is_active, onboarding_status, client_id')
      .eq('is_active', true)
      .eq('onboarding_status', 'active');

    console.log('\n✅ Test pod members created successfully!\n');
    console.log('Pod Members:');
    console.table(podMembers);

    console.log('\n🎯 Ready to test! Run:');
    console.log('curl -X POST http://localhost:3000/api/pod/trigger-amplification \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"postId": "test-123", "postUrl": "https://www.linkedin.com/feed/update/urn:li:activity:7264445887826038784"}\'');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestPodMembers();
