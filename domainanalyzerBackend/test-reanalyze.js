const fetch = require('node-fetch');

// Test the reanalyze phrase endpoint
async function testReanalyzePhrase() {
  try {
    console.log('Testing reanalyze phrase endpoint...');
    
    // You'll need to replace these with actual values from your database
    const testData = {
      phraseId: 1, // Replace with actual phrase ID
      model: 'GPT-4o',
      domain: 'example.com',
      context: 'Test context'
    };
    
    const response = await fetch('http://localhost:3001/api/ai-queries/reanalyze-phrase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_AUTH_TOKEN_HERE' // Replace with actual token
      },
      body: JSON.stringify(testData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Reanalyze endpoint working!');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Reanalyze endpoint failed:');
      console.log('Status:', response.status);
      console.log('Error:', error);
    }
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
  }
}

// Run the test
testReanalyzePhrase();

