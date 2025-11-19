// Test script for competitor detection
const { detectDomainPresence } = require('./src/services/aiQueryService.ts');

// Test data
const testResponse = `
Here are some great alternatives to consider:

1. **GitHub** (github.com) - Excellent for code hosting and collaboration
2. **GitLab** (gitlab.com) - Great CI/CD integration
3. **Bitbucket** (bitbucket.org) - Good for small teams
4. **AWS CodeCommit** (aws.amazon.com/codecommit) - Enterprise solution

For enterprise needs, I'd recommend checking out **Microsoft Azure DevOps** and **Atlassian Bitbucket**.

You can also consider **GitHub Enterprise** for large organizations.
`;

const testDomain = 'github.com';

console.log('Testing competitor detection...');
console.log('Test response:', testResponse);
console.log('Target domain:', testDomain);

try {
  const result = detectDomainPresence(testResponse, testDomain);
  console.log('\nDetection result:');
  console.log('Presence:', result.presence);
  console.log('Rank:', result.rank);
  console.log('Competitors found:', result.competitors.names.length);
  console.log('Competitor names:', result.competitors.names);
  console.log('Competitor mentions:', result.competitors.mentions.length);
  console.log('First 3 competitor mentions:', result.competitors.mentions.slice(0, 3));
} catch (error) {
  console.error('Error testing competitor detection:', error);
} 