// scripts/verify-live-deployment.mjs
const LIVE_URL = 'https://foceye-2546c.web.app/student-login';

async function testLiveDeployment() {
  console.log('Fetching live student login page:', LIVE_URL);
  const pageRes = await fetch(LIVE_URL);
  const pageHtml = await pageRes.text();
  
  const bundleMatch = pageHtml.match(/\/assets\/index-[a-zA-Z0-9_-]+\.js/);
  if (!bundleMatch) {
    console.error('❌ Could not find main bundle script in live page HTML');
    process.exit(1);
  }
  
  const bundleUrl = 'https://foceye-2546c.web.app' + bundleMatch[0];
  console.log('Found deployed bundle:', bundleUrl);
  
  const bundleRes = await fetch(bundleUrl);
  const bundleCode = await bundleRes.text();
  
  const hasLabel = bundleCode.includes('COLLEGE EMAIL OR REGISTRATION NUMBER');
  const hasPlaceholder = bundleCode.includes('Enter college email or registration number');
  const hasTypeText = bundleCode.includes('COLLEGE EMAIL OR REGISTRATION NUMBER`,type:`text`') || 
                      bundleCode.includes('COLLEGE EMAIL OR REGISTRATION NUMBER",type:"text"');
  
  console.log('Checks:');
  console.log('  1. Has updated label (COLLEGE EMAIL OR REGISTRATION NUMBER):', hasLabel ? '✅ YES' : '❌ NO');
  console.log('  2. Has updated placeholder (Enter college email or registration number):', hasPlaceholder ? '✅ YES' : '❌ NO');
  console.log('  3. Has input type="text":', hasTypeText ? '✅ YES' : '❌ NO');
  
  if (hasLabel && hasPlaceholder && hasTypeText) {
    console.log('🎉 Live deployment verified successfully on https://foceye-2546c.web.app!');
  } else {
    console.error('❌ Verification failed on live deployment');
    process.exit(1);
  }
}

testLiveDeployment().catch(err => {
  console.error('Network or execution error:', err);
  process.exit(1);
});
