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

    const currentUser = useAppStore.getState().currentUser;
    const isHod = currentUser?.role === 'HOD' || currentUser?.adminData?.isHod === true;
    let dept = data.department;
    if (!isHod) {
      const userDept = currentUser?.adminData?.department;
      if (!userDept) {
        throw new Error('Unauthorized: Your profile must have an assigned department to publish events.');
      }
      dept = userDept;
    } else if (!dept) {
      dept = 'ALL';
    }

    const now = new Date().toISOString();
    const newHackathon: Hackathon = {
      ...data,
      department: dept,
      id,
      bannerUrl,
      publishedBy: data.publishedBy || currentUser?.uid,
      publisherName: data.publisherName || currentUser?.adminData?.name || 'Faculty Coordinator',
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
    const currentUser = useAppStore.getState().currentUser;
    const isHod = currentUser?.role === 'HOD' || currentUser?.adminData?.isHod === true;
    if (!isHod && currentUser?.adminData?.department) {
      const existing = useAppStore.getState().hackathons.find((h) => h.id === id);
      if (
        existing &&
        existing.department &&
        existing.department !== 'ALL' &&
        existing.department !== currentUser.adminData.department &&
        existing.publishedBy !== currentUser.uid
      ) {
        throw new Error(
          `Unauthorized: You can only edit events within your department scope (${currentUser.adminData.department}).`
        );
      }
    }

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
    const currentUser = useAppStore.getState().currentUser;
    const isHod = currentUser?.role === 'HOD' || currentUser?.adminData?.isHod === true;
    if (!isHod) {
      const existing = useAppStore.getState().hackathons.find((h) => h.id === id);
      const userDept = currentUser?.adminData?.department;
      if (existing && existing.department !== userDept && existing.publishedBy !== currentUser?.uid) {
        throw new Error(
          `Unauthorized: You can only delete events within your department scope (${userDept}).`
        );
      }
    }
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
