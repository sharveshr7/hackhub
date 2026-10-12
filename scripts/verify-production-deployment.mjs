/**
 * Verification of Vercel Production Deployment:
 * URL: https://hackhub-nu.vercel.app
 */

import fs from 'node:fs';

const PROD_URL = 'https://hackhub-nu.vercel.app';

async function checkDeployment() {
  console.log('========================================================================');
  console.log('  HACKHUB — VERCEL PRODUCTION DEPLOYMENT AUDIT');
  console.log(`  Target URL: ${PROD_URL}`);
  console.log('========================================================================\n');

  // 1. Fetch live production HTML
  console.log('[1. Production HTML & Assets Inspection]');
  const htmlRes = await fetch(`${PROD_URL}/?_t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache, no-store' }
  });
  console.log(`  HTTP Status: ${htmlRes.status} ${htmlRes.statusText}`);
  console.log(`  x-vercel-id: ${htmlRes.headers.get('x-vercel-id')}`);
  console.log(`  x-vercel-cache: ${htmlRes.headers.get('x-vercel-cache')}`);

  const html = await htmlRes.text();
  const scriptMatches = [...html.matchAll(/src=["'](\/assets\/[^"']+)["']/g)].map(m => m[1]);
  console.log(`  Referenced Scripts in HTML: ${JSON.stringify(scriptMatches)}`);

  const indexScript = scriptMatches.find(s => s.includes('index-'));
  if (!indexScript) {
    console.error('  ❌ No index script found in production HTML!');
    return;
  }
  console.log(`  Main Bundle: ${indexScript}`);

  // 2. Fetch and inspect main bundle
  console.log('\n[2. JavaScript Bundle Analysis]');
  const bundleRes = await fetch(`${PROD_URL}${indexScript}`);
  console.log(`  Bundle HTTP Status: ${bundleRes.status}`);
  const bundleText = await bundleRes.text();
  console.log(`  Bundle Size: ${(bundleText.length / 1024).toFixed(1)} KB`);

  const checks = [
    { label: 'COLLEGE EMAIL OR REGISTRATION NUMBER', pass: bundleText.includes('COLLEGE EMAIL OR REGISTRATION NUMBER') },
    { label: 'Enter college email or registration number', pass: bundleText.includes('Enter college email or registration number') },
    { label: 'Input type="text"', pass: bundleText.includes('type:"text"') || bundleText.includes('type:`text`') },
    { label: 'Export Teams (Excel)', pass: bundleText.includes('Export Teams (Excel)') },
    { label: 'resolveHackathonReference', pass: bundleText.includes('resolveHackathonReference') },
    { label: 'Registration number login API caller', pass: bundleText.includes('/api/student-auth') }
  ];

  for (const c of checks) {
    console.log(`  ${c.pass ? '✅' : '❌'} Feature in bundle: "${c.label}" -> ${c.pass}`);
  }

  // Check local dist for comparison
  let localBundle = null;
  try {
    const distFiles = fs.readdirSync('dist/assets');
    localBundle = distFiles.find(f => f.startsWith('index-') && f.endsWith('.js'));
    console.log(`\n  Local build bundle: /assets/${localBundle}`);
    console.log(`  Matches live bundle exactly: ${indexScript === `/assets/${localBundle}`}`);
  } catch (err) {
    console.log('  Local dist not checked:', err.message);
  }

  // 3. API route status
  console.log('\n[3. Production API Route Inspection (/api/student-auth)]');
  const apiGetRes = await fetch(`${PROD_URL}/api/student-auth`);
  console.log(`  GET /api/student-auth Status: ${apiGetRes.status}`);
  const apiGetData = await apiGetRes.json();
  console.log(`  GET Response: ${JSON.stringify(apiGetData)}`);

  const apiPostBadPass = await fetch(`${PROD_URL}/api/student-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '711525BBM009', password: 'BadPasswordTest999!' })
  });
  console.log(`  POST with Reconciled RegNo 711525BBM009 (bad pass) Status: ${apiPostBadPass.status}`);
  const apiPostBadPassData = await apiPostBadPass.json();
  console.log(`  POST Response: ${JSON.stringify(apiPostBadPassData)}`);

  const apiPostNonExistent = await fetch(`${PROD_URL}/api/student-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '711525BBM999', password: 'BadPasswordTest999!' })
  });
  console.log(`  POST with Nonexistent RegNo (bad pass) Status: ${apiPostNonExistent.status}`);
  const apiPostNonExistentData = await apiPostNonExistent.json();
  console.log(`  POST Response: ${JSON.stringify(apiPostNonExistentData)}`);
  console.log(`  Generic Error Parity: ${apiPostBadPassData.error === apiPostNonExistentData.error}`);

  console.log('\n========================================================================');
}

checkDeployment().catch(console.error);
