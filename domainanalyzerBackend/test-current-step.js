// Simple test script to verify the current step API endpoint
const fetch = require('node-fetch');

async function testCurrentStepAPI() {
  const baseUrl = 'http://localhost:3001';
  
  // You would need to replace this with a valid token from your auth system
  const testToken = 'your-test-token-here';
  const testDomainId = 1; // Replace with an actual domain ID
  
  try {
    console.log('Testing current step API endpoint...');
    
    // Test updating current step
    const updateResponse = await fetch(`${baseUrl}/api/domain/${testDomainId}/current-step`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentStep: 2 }),
    });
    
    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log('✅ Update current step successful:', result);
    } else {
      console.log('❌ Update current step failed:', updateResponse.status, await updateResponse.text());
    }
    
    // Test getting domain info
    const getResponse = await fetch(`${baseUrl}/api/domain/${testDomainId}`, {
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (getResponse.ok) {
      const domainData = await getResponse.json();
      console.log('✅ Get domain info successful:', domainData);
    } else {
      console.log('❌ Get domain info failed:', getResponse.status, await getResponse.text());
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testCurrentStepAPI();
}

module.exports = { testCurrentStepAPI };

