import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tguffyzmkjkxqmmosfhf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRndWZmeXpta2preHFtbW9zZmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTE0NTcsImV4cCI6MjA4Njg4NzQ1N30.qZjkFMXfsGW9wFsUChcmDB8ujf6_cPC_beyv_r12kbM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignUp(email, password) {
  console.log(`[Test] Attempting to sign up with email: ${email}`);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'noia2://auth/callback'
      }
    });

    if (error) {
      console.error('[Test] Sign up failed:', error.message);
      return { success: false, error: error.message };
    }

    console.log('[Test] Sign up response:', {
      user: data.user?.email,
      session: data.session ? 'Session created' : 'No session (needs email confirmation)',
      userIdentities: data.user?.identities?.length
    });

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      console.log('[Test] User created but needs email confirmation. Check your email!');
    }

    return { 
      success: true, 
      message: 'Check your email for confirmation link' 
    };
  } catch (err) {
    console.error('[Test] Unexpected error:', err);
    return { success: false, error: err.message };
  }
}

const email = '154392@qq.com';
const password = '1231512315';

testSignUp(email, password).then(result => {
  console.log('[Test] Result:', result);
  process.exit(result.success ? 0 : 1);
});