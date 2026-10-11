import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForCheckingPublicCollections",
  authDomain: "foceye-2546c.firebaseapp.com",
  projectId: "foceye-2546c",
  storageBucket: "foceye-2546c.firebasestorage.app",
  messagingSenderId: "542308731558",
  appId: "1:542308731558:web:7562ad8949392e21ea1b28"
};

// Read from src/lib/firebase.ts config
import fs from 'fs';
const fbTs = fs.readFileSync('src/lib/firebase.ts', 'utf8');
const apiKeyMatch = fbTs.match(/apiKey:\s*['"]([^'"]+)['"]/);
if (apiKeyMatch) firebaseConfig.apiKey = apiKeyMatch[1];

const app = initializeApp(firebaseConfig, 'Inspector');
const db = getFirestore(app);

async function inspect() {
  console.log('Querying hackathons from foceye-2546c...');
  try {
    const snap = await getDocs(collection(db, 'hackathons'));
    console.log(`Total hackathons in Firestore: ${snap.size}`);
    snap.forEach((doc) => {
      const data = doc.data();
      console.log(`- [${doc.id}] ${data.title} (${data.organizer}) status: ${data.status}`);
      console.log(JSON.stringify(data, null, 2));
    });
  } catch (err) {
    console.error('Error fetching hackathons:', err.message);
  }
  process.exit(0);
}

inspect();
