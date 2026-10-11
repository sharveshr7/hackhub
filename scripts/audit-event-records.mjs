/**
 * HackHub Event Records Hygiene Audit
 * Audits all production hackathon documents for missing, misplaced, or inconsistent fields.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDola5Yv45cq2h4OgmBPrFar5dUcRUh_as",
  authDomain: "foceye-2546c.firebaseapp.com",
  projectId: "foceye-2546c",
  storageBucket: "foceye-2546c.firebasestorage.app"
};

const app = initializeApp(FIREBASE_CONFIG, `EventAudit_${Date.now()}`);
const db = getFirestore(app);

async function audit() {
  console.log('================================================================');
  console.log('  HACKHUB — PRODUCTION EVENT RECORDS HYGIENE AUDIT');
  console.log('  Database: foceye-2546c • Collection: hackathons');
  console.log('================================================================\n');

  const snap = await getDocs(collection(db, 'hackathons'));
  console.log(`Found ${snap.size} total event document(s) in production.\n`);

  const reviewList = [];

  snap.forEach((d) => {
    const data = d.data();
    const id = d.id;
    const issues = [];
    const notices = [];

    // Check mandatory fields
    if (!data.title || !data.title.trim()) issues.push('Missing "title"');
    if (!data.organizer || !data.organizer.trim()) issues.push('Missing "organizer"');
    if (!data.category || !data.category.trim()) issues.push('Missing "category"');
    if (!data.shortDescription && !data.description) issues.push('Missing description/shortDescription');

    // Check URL attribution
    const hasOfficialUrl = Boolean(data.officialUrl && data.officialUrl.trim());
    const hasExtUrl = Boolean(data.externalRegistrationUrl && data.externalRegistrationUrl.trim());
    if (!hasOfficialUrl && !hasExtUrl) {
      if (data.isExternal) {
        issues.push('External opportunity missing officialUrl / externalRegistrationUrl');
      } else {
        notices.push('Internal collegiate sprint: official external URL intentionally omitted');
      }
    }

    // Check date consistency
    if (data.eventStart && data.eventEnd) {
      const start = new Date(data.eventStart);
      const end = new Date(data.eventEnd);
      if (end < start) {
        issues.push('Event end date is earlier than start date');
      }
    }

    if (data.registrationDeadline && data.eventStart) {
      const reg = new Date(data.registrationDeadline);
      const start = new Date(data.eventStart);
      if (reg > start) {
        issues.push('Registration deadline is later than event start date');
      }
    }

    // Check misplaced bannerUrl
    if (data.bannerUrl && data.bannerUrl.includes('hiretoday.in')) {
      issues.push('Misplaced URL: Registration link found in bannerUrl');
    }

    // Check status
    if (!data.status) {
      issues.push('Missing "status" field');
    }

    console.log(`• Document ID: ${id}`);
    console.log(`  Title: "${data.title}"`);
    console.log(`  Organizer: "${data.organizer}"`);
    console.log(`  Organizer Type: ${data.organizerType || 'Not specified'}`);
    console.log(`  Category: ${data.category} | Mode: ${data.mode || 'ONLINE'}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Official URL: ${data.officialUrl || data.externalRegistrationUrl || 'None'}`);
    console.log(`  Banner Image: ${data.bannerUrl || 'None'}`);
    console.log(`  Dates: Start: ${data.eventStart || 'N/A'}, End: ${data.eventEnd || 'N/A'}`);
    console.log(`  Team Limits: Min: ${data.minTeamSize || 'N/A'}, Max: ${data.maxTeamSize || 'N/A'}`);
    console.log(`  Attendance Code: ${data.attendanceCode || 'None'}`);

    if (issues.length > 0) {
      console.log(`  ⚠️ Action Items:`);
      issues.forEach(i => console.log(`     - ${i}`));
    } else {
      console.log(`  ✅ Clean: All standard schema fields valid`);
    }
    if (notices.length > 0) {
      notices.forEach(n => console.log(`  ℹ️ Note: ${n}`));
    }
    console.log('----------------------------------------------------------------\n');

    reviewList.push({
      id,
      title: data.title,
      organizer: data.organizer,
      status: data.status,
      issues,
      notices
    });
  });

  return reviewList;
}

audit().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
