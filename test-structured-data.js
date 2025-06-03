// Test script for structured data parsing
// Run with: node test-structured-data.js

const testUrls = [
  // News sites with good structured data
  'https://www.bbc.com/news/technology',
  'https://techcrunch.com/latest',
  'https://www.theverge.com',
  
  // Content platforms
  'https://medium.com',
  'https://dev.to',
  
  // Academic/tech sites
  'https://stackoverflow.com/questions',
  'https://github.com'
];

async function testStructuredDataExtraction() {
  console.log('🧪 Testing Structured Data Extraction vs Traditional Parsing\n');
  
  for (const url of testUrls) {
    console.log(`\n📄 Testing: ${url}`);
    console.log('=' .repeat(60));
    
    try {
      // Test the hybrid parsing endpoint
      const response = await fetch('http://localhost:3000/api/parse-hybrid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: url,
          mode: 'benchmark' 
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.benchmark) {
          const b = result.benchmark;
          console.log(`📊 Benchmark Results:`);
          console.log(`   Structured Data: ${b.structuredTime}ms (${b.structuredSuccess ? '✅' : '❌'})`);
          console.log(`   Traditional:     ${b.traditionalTime}ms (${b.traditionalSuccess ? '✅' : '❌'})`);
          console.log(`   Hybrid:          ${b.hybridTime}ms (${b.hybridSuccess ? '✅' : '❌'})`);
          console.log(`   Winner: ${b.winner.toUpperCase()}`);
        }
        
        if (result.recommendations) {
          const r = result.recommendations;
          console.log(`\n🎯 Recommendations:`);
          console.log(`   Has Structured Data: ${r.likelyHasStructuredData ? '✅' : '❌'}`);
          console.log(`   Strategy: ${r.recommendedStrategy}`);
          console.log(`   Reason: ${r.reason}`);
        }
      } else {
        console.log(`❌ Failed to test: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  testStructuredDataExtraction()
    .then(() => {
      console.log('\n✅ Testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testStructuredDataExtraction }; 