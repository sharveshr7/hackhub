import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAppStore } from '../lib/store';
import { Announcement } from '../types';

export const announcementService = {
  /**
   * Fetch all official campus announcements from Firestore
   */
  async getAnnouncements(hackathonId?: string): Promise<Announcement[]> {
    const snap = await getDocs(collection(db, 'announcements'));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));
    
    useAppStore.setState({ announcements: all });
    if (hackathonId) {
      return all.filter((a) => !a.hackathonId || a.hackathonId === hackathonId);
    }
    return all;
  },

  /**
   * Create and broadcast announcement to Firestore
   */
  async createAnnouncement(
    data: Omit<Announcement, 'id' | 'publishedAt'>
  ): Promise<Announcement> {
    const id = `ann_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const newAnn: Announcement = {
      ...data,
      id,
      publishedAt: now,
      status: 'ACTIVE'
    };

    await setDoc(doc(db, 'announcements', id), {
      ...newAnn,
      createdAt: serverTimestamp()
    });

    useAppStore.setState((state) => ({
      announcements: [newAnn, ...state.announcements]
    }));
    return newAnn;
  },

  /**
   * Delete announcement
   */
  async deleteAnnouncement(id: string): Promise<void> {
    await deleteDoc(doc(db, 'announcements', id));
    useAppStore.getState().deleteAnnouncement(id);
  }
};
