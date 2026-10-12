import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { Link } from 'react-router-dom';
import { isStaffRole } from '../../utils/access';
import { notificationService } from '../../services/notificationService';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = useAppStore((state) => state.notifications);
  const currentUser = useAppStore((state) => state.currentUser);

  // Filter for current user or global
  const userNotifications = notifications.filter(
    (n) => !n.userId || n.userId === 'ALL' || (currentUser && n.userId === currentUser.uid)
  );
  const unreadCount = userNotifications.filter((n) => !n.isRead).length;

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(currentUser?.uid);
    } catch (error) {
      console.warn('Unable to mark notifications as read:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
    } catch (error) {
      console.warn('Unable to mark notification as read:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-elevated border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => void markAllAsRead()}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {userNotifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No notifications yet.</div>
            ) : (
              userNotifications.slice(0, 5).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => void markAsRead(notif.id)}
                  className={`p-3.5 text-xs transition-colors hover:bg-slate-50 cursor-pointer ${
                    !notif.isRead ? 'bg-cyan-50/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
                      {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />}
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed line-clamp-2">{notif.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <Link
              to={isStaffRole(currentUser?.role) ? '/admin/notifications' : '/student/notifications'}
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
