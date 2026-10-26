import { db } from '../lib/firebase';
import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAppStore } from '../lib/store';
import { Announcement } from '../types';
import { isPlatformAdministrator, isStaffRole } from '../utils/access';
import { sanitizeForFirestore } from '../utils/firestoreSerializer';

export const announcementService = {
  /**
   * Fetch all official campus announcements from Firestore
   */
  async getAnnouncements(hackathonId?: string): Promise<Announcement[]> {
    const all = useAppStore.getState().announcements;
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
    const currentUser = useAppStore.getState().currentUser;
    if (!currentUser || !isStaffRole(currentUser.role)) throw new Error('Authorized staff access is required.');
    const platformAdministrator = isPlatformAdministrator(currentUser);
    const department = platformAdministrator ? data.department : currentUser.adminData?.department;
    if (platformAdministrator && data.target !== 'ALL') throw new Error('Campus announcements can only target all students.');
    if (!platformAdministrator && !department) throw new Error('Your staff profile must have a department before publishing announcements.');
    if (!platformAdministrator && data.target !== 'DEPT') throw new Error('Faculty announcements are limited to their own department.');
    const id = `ann_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const newAnn: Announcement = {
      ...data,
      ...(department ? { department } : {}),
      ...(!platformAdministrator ? { target: 'DEPT' as const } : {}),
      id,
      publishedAt: now,
      status: 'ACTIVE'
    };

    const cleanAnn = sanitizeForFirestore(newAnn);

    await setDoc(doc(db, 'announcements', id), {
      ...cleanAnn,
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
