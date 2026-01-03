// Test script to verify Supabase connection
// Run with: node scripts/test-supabase-connection.js

const { createClient } = require('@supabase/supabase-js')

// Your Supabase credentials
const SUPABASE_URL = 'https://jjhggmbrdtscgdqyirwd.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_iojbf1uwRiXE5AkbZE5S1g_awoB09pf'

async function testConnection() {
  console.log('🔍 Testing Supabase connection...')
  console.log('📋 URL:', SUPABASE_URL)
  console.log('🔑 Key format:', SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...')
  
  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Test 1: Check if we can query the contracts table
    console.log('\n📊 Test 1: Querying contracts table...')
    const { data, error } = await supabase
      .from('contracts')
      .select('count')
      .limit(1)
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️  Table "contracts" does not exist yet')
        console.log('💡 You need to run the SQL from DATABASE_SETUP_GUIDE.md to create the table')
      } else {
        console.error('❌ Error querying contracts:', error.message)
        console.error('   Code:', error.code)
        console.error('   Details:', error)
      }
    } else {
      console.log('✅ Successfully connected to contracts table!')
      console.log('   Data:', data)
    }
    
    // Test 2: Try to insert a test record (then delete it)
    console.log('\n📝 Test 2: Testing insert capability...')
    const testContractId = `test-${Date.now()}`
    const { data: insertData, error: insertError } = await supabase
      .from('contracts')
      .insert({
        contract_id: testContractId,
        template_id: 'test:Template:Test',
        payload: { test: true },
        party: 'test-party',
        status: 'Test'
      })
      .select()
      .single()
    
    if (insertError) {
      if (insertError.code === 'PGRST116') {
        console.log('⚠️  Table "contracts" does not exist - cannot test insert')
      } else {
        console.error('❌ Error inserting test contract:', insertError.message)
        console.error('   Code:', insertError.code)
      }
    } else {
      console.log('✅ Successfully inserted test contract!')
      console.log('   Contract ID:', insertData.contract_id)
      
      // Clean up: delete the test contract
      console.log('\n🧹 Cleaning up test contract...')
      const { error: deleteError } = await supabase
        .from('contracts')
        .delete()
        .eq('contract_id', testContractId)
      
      if (deleteError) {
        console.warn('⚠️  Could not delete test contract:', deleteError.message)
      } else {
        console.log('✅ Test contract deleted successfully')
      }
    }
    
    console.log('\n✅ Connection test complete!')
    console.log('💡 If you see errors about table not existing, run the SQL from DATABASE_SETUP_GUIDE.md')
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message)
    console.error('   This might mean:')
    console.error('   1. The URL is incorrect')
    console.error('   2. The key is incorrect or has wrong permissions')
    console.error('   3. Network connectivity issues')
    process.exit(1)
  }
}

testConnection()