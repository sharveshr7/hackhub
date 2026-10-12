import { db } from '../lib/firebase';
import {
  doc,
  setDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { useAppStore } from '../lib/store';
import { NotificationItem } from '../types';
import { announcementService } from './announcementService';
import { isPlatformAdministrator } from '../utils/access';

export const notificationService = {
  /**
   * Fetch notifications belonging to current user from Firestore
   */
  async getNotifications(userId?: string): Promise<NotificationItem[]> {
    const currentUser = useAppStore.getState().currentUser;
    if (!userId || userId !== currentUser?.uid) return [];
    return useAppStore.getState().notifications;
  },

  /**
   * Send notification to user
   */
  async sendNotification(
    data: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>
  ): Promise<void> {
    if (!isPlatformAdministrator(useAppStore.getState().currentUser)) {
      throw new Error('Only a platform administrator can publish campus-wide notifications.');
    }
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
    const uid = useAppStore.getState().currentUser?.uid;
    if (!uid) throw new Error('Sign in before updating notification status.');
    await setDoc(doc(db, 'notification_reads', `${uid}_${id}`), {
      uid,
      notificationId: id,
      readAt: serverTimestamp()
    });
    useAppStore.getState().markNotificationAsRead(id);
  },

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(userId?: string): Promise<void> {
    const uid = useAppStore.getState().currentUser?.uid;
    if (!uid || (userId && userId !== uid)) throw new Error('Sign in as this user before updating notification status.');
    const unread = useAppStore.getState().notifications.filter((item) => !item.isRead);
    for (let offset = 0; offset < unread.length; offset += 450) {
      const batch = writeBatch(db);
      unread.slice(offset, offset + 450).forEach((item) => {
        batch.set(doc(db, 'notification_reads', `${uid}_${item.id}`), {
          uid,
          notificationId: item.id,
          readAt: serverTimestamp()
        });
      });
      await batch.commit();
    }
    useAppStore.getState().markAllNotificationsAsRead();
  },

  // Delegate announcement operations to announcementService
  getAnnouncements: announcementService.getAnnouncements.bind(announcementService),
  createAnnouncement: announcementService.createAnnouncement.bind(announcementService),
  deleteAnnouncement: announcementService.deleteAnnouncement.bind(announcementService)
};
