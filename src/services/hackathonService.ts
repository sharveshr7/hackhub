import { db, storage } from '../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAppStore } from '../lib/store';
import { Hackathon, HackathonStatus } from '../types';

export const hackathonService = {
  /**
   * Fetch all real hackathon documents from Firestore collection 'hackathons'
   */
  async getAllHackathons(): Promise<Hackathon[]> {
    const currentUser = useAppStore.getState().currentUser;
    const q =
      currentUser?.role === 'ADMIN' || currentUser?.role === 'HOD'
        ? collection(db, 'hackathons')
        : query(collection(db, 'hackathons'), where('status', '!=', 'DRAFT'));
    const snap = await getDocs(q);
    const hackathons = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    })) as Hackathon[];
    
    // Sync into store for state management
    useAppStore.setState({ hackathons });
    return hackathons;
  },

  /**
   * Fetch a single hackathon by its Firestore document ID
   */
  async getHackathonById(id: string): Promise<Hackathon | null> {
    const docSnap = await getDoc(doc(db, 'hackathons', id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Hackathon;
  },

  /**
   * Upload hackathon banner to Firebase Storage
   */
  async uploadBanner(hackathonId: string, file: File): Promise<string> {
    const storageRef = ref(storage, `hackathons/${hackathonId}/banner_${Date.now()}_${file.name}`);
    const snap = await uploadBytes(storageRef, file);
    return getDownloadURL(snap.ref);
  },

  /**
   * Create a real hackathon in Firestore
   */
  async createHackathon(
    data: Omit<Hackathon, 'id' | 'createdAt' | 'updatedAt'>,
    bannerFile?: File
  ): Promise<Hackathon> {
    const id = `hackathon-${Date.now()}`;
    let bannerUrl = data.bannerUrl || '';

    if (bannerFile) {
      try {
        bannerUrl = await this.uploadBanner(id, bannerFile);
      } catch (err) {
        console.warn('Banner upload failed, proceeding with default banner:', err);
      }
    }

    const now = new Date().toISOString();
    const newHackathon: Hackathon = {
      ...data,
      id,
      bannerUrl,
      createdAt: now,
      updatedAt: now
    };

    // Save to Firestore
    await setDoc(doc(db, 'hackathons', id), {
      ...newHackathon,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update in-memory store
    useAppStore.getState().addHackathon(newHackathon);
    return newHackathon;
  },

  /**
   * Update an existing hackathon document in Firestore
   */
  async updateHackathon(id: string, updates: Partial<Hackathon>): Promise<void> {
    await updateDoc(doc(db, 'hackathons', id), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    useAppStore.getState().updateHackathon(id, updates);
  },

  /**
   * Delete hackathon document from Firestore
   */
  async deleteHackathon(id: string): Promise<void> {
    await deleteDoc(doc(db, 'hackathons', id));
    useAppStore.getState().deleteHackathon(id);
  },

  /**
   * Update status (e.g. REGISTRATION_OPEN, LIVE, COMPLETED, ARCHIVED)
   */
  async updateHackathonStatus(id: string, status: HackathonStatus): Promise<void> {
    await this.updateHackathon(id, { status });
  },

  /**
   * Toggle attendance gate check-in
   */
  async toggleAttendance(id: string, isOpen: boolean, securityCode?: string): Promise<void> {
    const updates: Partial<Hackathon> = { attendanceOpen: isOpen };
    if (securityCode) updates.attendanceCode = securityCode;
    await this.updateHackathon(id, updates);
  }
};
