import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { useAppStore } from '../lib/store';
import { NotificationItem, Announcement } from '../types';
import { announcementService } from './announcementService';

export const notificationService = {
  /**
   * Fetch notifications belonging to current user from Firestore
   */
  async getNotifications(userId?: string): Promise<NotificationItem[]> {
    if (!userId) return [];
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationItem));
    
    useAppStore.setState({ notifications });
    return notifications;
  },

  /**
   * Send notification to user
   */
  async sendNotification(
    data: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>
  ): Promise<void> {
    const id = `notif_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const notifItem: NotificationItem = {
      ...data,
      userId: data.userId || 'ALL',
      id,
      createdAt: now,
      isRead: false
    };

    await setDoc(doc(db, 'notifications', id), {
      ...notifItem,
      createdAt: serverTimestamp()
    });

    useAppStore.setState((state) => ({
      notifications: [notifItem, ...state.notifications]
    }));
  },

  /**
   * Mark single notification as read
   */
  async markAsRead(id: string): Promise<void> {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
    useAppStore.getState().markNotificationAsRead(id);
  },

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(userId?: string): Promise<void> {
    if (userId) {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((d) => {
          batch.update(d.ref, { isRead: true });
        });
        await batch.commit();
      }
    }
    useAppStore.getState().markAllNotificationsAsRead();
  },

  // Delegate announcement operations to announcementService
  getAnnouncements: announcementService.getAnnouncements.bind(announcementService),
  createAnnouncement: announcementService.createAnnouncement.bind(announcementService),
  deleteAnnouncement: announcementService.deleteAnnouncement.bind(announcementService)
};
