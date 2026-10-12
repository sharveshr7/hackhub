import { db, storage, auth } from '../lib/firebase';
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
import { isPlatformAdministrator, isStaffRole } from '../utils/access';
import { sanitizeHackathonDocument } from '../utils/hackathonData';

export const hackathonService = {
  /**
   * Fetch all real hackathon documents from Firestore collection 'hackathons'
   */
  async getAllHackathons(): Promise<Hackathon[]> {
    const currentUser = useAppStore.getState().currentUser;
    const discoverableStatuses: HackathonStatus[] = [
      'PUBLISHED', 'REGISTRATION_OPEN', 'UPCOMING', 'ONGOING', 'COMPLETED', 'REGISTRATION_CLOSED', 'LIVE', 'CANCELLED', 'SUBMISSION_CLOSED',
      'published', 'registration_open', 'upcoming', 'ongoing', 'completed', 'registration_closed', 'live', 'cancelled', 'submission_closed'
    ];
    const snapshots = isPlatformAdministrator(currentUser)
      ? [await getDocs(collection(db, 'hackathons'))]
      : await Promise.all([
          getDocs(query(collection(db, 'hackathons'), where('status', 'in', discoverableStatuses))),
          ...(isStaffRole(currentUser?.role) && currentUser?.adminData?.department
            ? [getDocs(query(collection(db, 'hackathons'), where('department', '==', currentUser.adminData.department)))]
            : [])
        ]);
    const byId = new Map<string, Hackathon>();
    snapshots.forEach((snap) => snap.docs.forEach((document) => byId.set(document.id, sanitizeHackathonDocument(document.id, document.data()))));
    const hackathons = [...byId.values()];
    
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
    return sanitizeHackathonDocument(docSnap.id, docSnap.data());
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

    const currentUser = useAppStore.getState().currentUser;
    const userDept = currentUser?.adminData?.department;
    const platformAdmin = isPlatformAdministrator(currentUser);
    const dept = platformAdmin ? data.department : userDept;
    if (!dept || (platformAdmin && !['Biotechnology', 'Biomedical Engineering'].includes(dept))) {
      throw new Error('Select a supported department for this hackathon.');
    }
    if (!platformAdmin && !userDept) {
      throw new Error('Unauthorized: Your profile must have an assigned department to publish events.');
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

    if (bannerFile) {
      try {
        bannerUrl = await this.uploadBanner(id, bannerFile);
        await updateDoc(doc(db, 'hackathons', id), { bannerUrl, updatedAt: serverTimestamp() });
        newHackathon.bannerUrl = bannerUrl;
      } catch {
        await deleteDoc(doc(db, 'hackathons', id)).catch(() => undefined);
        throw new Error('The hackathon was not created because its banner could not be uploaded. Try again without the banner or choose another file.');
      }
    }

    // Update in-memory store
    useAppStore.getState().addHackathon(newHackathon);
    return newHackathon;
  },

  /**
   * Update an existing hackathon document in Firestore
   */
  async updateHackathon(id: string, updates: Partial<Hackathon>): Promise<void> {
    const currentUser = useAppStore.getState().currentUser;
    const userDept = currentUser?.adminData?.department;
    const existing = useAppStore.getState().hackathons.find((h) => h.id === id);
    if (
      !isPlatformAdministrator(currentUser) &&
      existing &&
      existing.department &&
      existing.department !== userDept &&
      existing.publishedBy !== currentUser?.uid
    ) {
      throw new Error(
        `Unauthorized: You can only edit events within your department scope (${userDept}).`
      );
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
    const existing = useAppStore.getState().hackathons.find((h) => h.id === id);
    const userDept = currentUser?.adminData?.department;
    if (!isPlatformAdministrator(currentUser) && existing && existing.department !== userDept && existing.publishedBy !== currentUser?.uid) {
      throw new Error(
        `Unauthorized: You can only delete events within your department scope (${userDept}).`
      );
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
  async getAttendanceGate(id: string): Promise<{ attendanceOpen: boolean; attendanceCode: string }> {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Sign in before viewing the attendance gate.');
    const response = await fetch('/api/student-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ action: 'get-attendance-gate', hackathonId: id })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || 'Attendance gate could not be loaded.');
    return { attendanceOpen: data.attendanceOpen === true, attendanceCode: data.attendanceCode || '' };
  },

  async toggleAttendance(id: string, isOpen: boolean): Promise<{ attendanceOpen: boolean; attendanceCode: string }> {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Sign in before changing the attendance gate.');
    const response = await fetch('/api/student-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ action: 'toggle-attendance', hackathonId: id, isOpen })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || 'Attendance gate could not be changed.');
    return { attendanceOpen: data.attendanceOpen === true, attendanceCode: data.attendanceCode || '' };
  }
};
