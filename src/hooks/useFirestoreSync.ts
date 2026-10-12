import { useEffect } from 'react';
import { collection, onSnapshot, query, where, type DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../lib/store';
import {
  Hackathon,
  HackathonStatus,
  Student,
  Admin,
  Team,
  Registration,
  Submission,
  Announcement,
  NotificationItem,
  Certificate,
  AuditLog
} from '../types';
import { isPlatformAdministrator, isStaffRole } from '../utils/access';
import { normalizeAcademicYear } from '../constants/departments';
import { sanitizeHackathonDocument } from '../utils/hackathonData';

export function useFirestoreSync() {
  const currentUser = useAppStore((state) => state.currentUser);
  const setHackathons = useAppStore((state) => state.setHackathons);
  const setStudents = useAppStore((state) => state.setStudents);
  const setAdmins = useAppStore((state) => state.setAdmins);
  const setTeams = useAppStore((state) => state.setTeams);
  const setRegistrations = useAppStore((state) => state.setRegistrations);
  const setSubmissions = useAppStore((state) => state.setSubmissions);
  const setAnnouncements = useAppStore((state) => state.setAnnouncements);
  const setNotifications = useAppStore((state) => state.setNotifications);
  const setCertificates = useAppStore((state) => state.setCertificates);
  const setAuditLogs = useAppStore((state) => state.setAuditLogs);

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];
    const listen = <T>(
      source: ReturnType<typeof collection> | ReturnType<typeof query>,
      onItems: (items: T[]) => void,
      label: string,
      mapDocument: (id: string, data: DocumentData) => T
    ) => {
      try {
        const unsubscribe = onSnapshot(source, (snapshot) => {
          onItems(snapshot.docs.map((document) => mapDocument(document.id, document.data() as DocumentData)));
        }, (error) => console.warn(`Realtime sync warning (${label}):`, error.message));
        unsubscribes.push(unsubscribe);
      } catch (error) {
        console.warn(`Failed to attach ${label} listener:`, error);
      }
    };

    const staff = isStaffRole(currentUser?.role);
    const platformAdmin = isPlatformAdministrator(currentUser);
    const department = staff ? currentUser?.adminData?.department : undefined;
    const authorizedYears = staff
      ? (currentUser?.adminData?.authorizedYears || []).map(normalizeAcademicYear).filter(Boolean) as string[]
      : [];

    // Never leave one user's private records visible while another account's listeners load.
    setStudents([]);
    setAdmins([]);
    setTeams([]);
    setRegistrations([]);
    setSubmissions([]);
    setNotifications([]);
    setCertificates([]);
    setAuditLogs([]);

    // Published events remain discoverable; staff also receive their department's drafts.
    const discoverableStatuses: HackathonStatus[] = [
      'PUBLISHED', 'REGISTRATION_OPEN', 'UPCOMING', 'ONGOING', 'COMPLETED', 'REGISTRATION_CLOSED', 'LIVE', 'CANCELLED', 'SUBMISSION_CLOSED',
      'published', 'registration_open', 'upcoming', 'ongoing', 'completed', 'registration_closed', 'live', 'cancelled', 'submission_closed'
    ];
    const publishedHackathons = new Map<string, Hackathon>();
    const departmentHackathons = new Map<string, Hackathon>();
    const refreshHackathons = () => setHackathons([...new Map([...publishedHackathons, ...departmentHackathons]).values()]);
    const storeHackathons = (target: Map<string, Hackathon>, rows: Hackathon[]) => {
      target.clear();
      rows.forEach((item) => target.set(item.id, item));
      refreshHackathons();
    };
    if (platformAdmin) {
      listen(collection(db, 'hackathons'), (items) => storeHackathons(publishedHackathons, items as Hackathon[]), 'hackathons', (id, data) => sanitizeHackathonDocument(id, data));
    } else {
      listen(query(collection(db, 'hackathons'), where('status', 'in', discoverableStatuses)), (items) => storeHackathons(publishedHackathons, items as Hackathon[]), 'published hackathons', (id, data) => sanitizeHackathonDocument(id, data));
      if (staff && department) {
        listen(query(collection(db, 'hackathons'), where('department', '==', department)), (items) => storeHackathons(departmentHackathons, items as Hackathon[]), 'department hackathons', (id, data) => sanitizeHackathonDocument(id, data));
      }
    }

    // Anonymous visitors see only the public notice board. Staff add their department's notices.
    const publicAnnouncements = new Map<string, Announcement>();
    const departmentAnnouncements = new Map<string, Announcement>();
    const refreshAnnouncements = () => setAnnouncements([...new Map([...publicAnnouncements, ...departmentAnnouncements]).values()]);
    const storeAnnouncements = (target: Map<string, Announcement>, rows: Announcement[]) => {
      target.clear();
      rows.forEach((item) => target.set(item.id, item));
      refreshAnnouncements();
    };
    if (platformAdmin) {
      listen(collection(db, 'announcements'), (items) => storeAnnouncements(publicAnnouncements, items as Announcement[]), 'announcements', (id, data) => ({ id, ...data } as Announcement));
    } else {
      listen(query(collection(db, 'announcements'), where('target', '==', 'ALL')), (items) => storeAnnouncements(publicAnnouncements, items as Announcement[]), 'public announcements', (id, data) => ({ id, ...data } as Announcement));
      if (staff && department) {
        listen(query(collection(db, 'announcements'), where('department', '==', department)), (items) => storeAnnouncements(departmentAnnouncements, items as Announcement[]), 'department announcements', (id, data) => ({ id, ...data } as Announcement));
      } else if (currentUser?.studentData?.department) {
        const studentDepartment = currentUser.studentData.department;
        listen(
          query(collection(db, 'announcements'), where('target', '==', 'DEPT'), where('department', '==', studentDepartment)),
          (items) => storeAnnouncements(departmentAnnouncements, items as Announcement[]),
          'student department announcements',
          (id, data) => ({ id, ...data } as Announcement)
        );
      }
    }

    if (!currentUser) {
    } else {
      const registrationQuery = platformAdmin
        ? collection(db, 'registrations')
        : staff
          ? authorizedYears.length
            ? query(collection(db, 'registrations'), where('department', '==', department || ''), where('academicYear', 'in', authorizedYears.slice(0, 10)))
            : query(collection(db, 'registrations'), where('department', '==', department || ''))
          : query(collection(db, 'registrations'), where('studentId', '==', currentUser.uid));
      listen(registrationQuery, (items) => setRegistrations(items as Registration[]), 'registrations', (id, data) => ({ id, ...data } as Registration));

      const teamQuery = platformAdmin
        ? collection(db, 'teams')
        : staff
          ? authorizedYears.length
            ? query(collection(db, 'teams'), where('department', '==', department || ''), where('academicYear', 'in', authorizedYears.slice(0, 10)))
            : query(collection(db, 'teams'), where('department', '==', department || ''))
          : query(collection(db, 'teams'), where('memberIds', 'array-contains', currentUser.uid));
      listen(teamQuery, (items) => setTeams(items as Team[]), 'teams', (id, data) => ({ id, ...data } as Team));

      if (platformAdmin || staff) {
        const submissionQuery = platformAdmin
          ? collection(db, 'submissions')
          : authorizedYears.length
            ? query(collection(db, 'submissions'), where('department', '==', department || ''), where('academicYear', 'in', authorizedYears.slice(0, 10)))
            : query(collection(db, 'submissions'), where('department', '==', department || ''));
        listen(submissionQuery, (items) => setSubmissions(items as Submission[]), 'submissions', (id, data) => ({ id, ...data } as Submission));
      } else {
        const submittedByStudent = new Map<string, Submission>();
        const teamSubmissions = new Map<string, Submission>();
        const refreshStudentSubmissions = () => setSubmissions([...new Map([...submittedByStudent, ...teamSubmissions]).values()]);
        listen<Submission>(query(collection(db, 'submissions'), where('submittedBy', '==', currentUser.uid)), (items) => {
          submittedByStudent.clear();
          items.forEach((item) => submittedByStudent.set(item.id, item));
          refreshStudentSubmissions();
        }, 'student submissions', (id, data) => ({ id, ...data } as Submission));
        listen<Submission>(query(collection(db, 'submissions'), where('memberIds', 'array-contains', currentUser.uid)), (items) => {
          teamSubmissions.clear();
          items.forEach((item) => teamSubmissions.set(item.id, item));
          refreshStudentSubmissions();
        }, 'team submissions', (id, data) => ({ id, ...data } as Submission));
      }

      const notificationItems = new Map<string, NotificationItem>();
      const readNotificationIds = new Set<string>();
      const refreshNotifications = () => setNotifications(
        [...notificationItems.values()].map((item) => ({ ...item, isRead: readNotificationIds.has(item.id) }))
      );
      const notificationQuery = platformAdmin
        ? collection(db, 'notifications')
        : query(collection(db, 'notifications'), where('userId', 'in', [currentUser.uid, 'ALL']));
      listen<NotificationItem>(notificationQuery, (items) => {
        notificationItems.clear();
        items.forEach((item) => notificationItems.set(item.id, item));
        refreshNotifications();
      }, 'notifications', (id, data) => ({ id, ...data } as NotificationItem));
      listen<{ notificationId: string }>(
        query(collection(db, 'notification_reads'), where('uid', '==', currentUser.uid)),
        (items) => {
          readNotificationIds.clear();
          items.forEach((item) => readNotificationIds.add(item.notificationId));
          refreshNotifications();
        },
        'notification read markers',
        (id, data) => ({ notificationId: String(data.notificationId || '') })
      );

      const certificateQuery = platformAdmin
        ? collection(db, 'certificates')
        : staff
          ? query(collection(db, 'certificates'), where('department', '==', department || ''))
          : query(collection(db, 'certificates'), where('studentId', '==', currentUser.uid));
      listen(certificateQuery, (items) => setCertificates(items as Certificate[]), 'certificates', (id, data) => ({ id, ...data } as Certificate));

      if (staff) {
        const studentQuery = platformAdmin
          ? collection(db, 'students')
          : authorizedYears.length
            ? query(collection(db, 'students'), where('department', '==', department || ''), where('year', 'in', authorizedYears.slice(0, 10)))
            : query(collection(db, 'students'), where('department', '==', department || ''));
        listen(studentQuery, (items) => setStudents(items as Student[]), 'students', (id, data) => ({ uid: id, ...data } as unknown as Student));

        const adminQuery = platformAdmin
          ? collection(db, 'admins')
          : query(collection(db, 'admins'), where('department', '==', department || ''));
        listen(adminQuery, (items) => setAdmins(items as Admin[]), 'admins', (id, data) => ({ uid: id, ...data } as Admin));
      } else {
      }

      if (platformAdmin) {
        listen(query(collection(db, 'audit_logs')), (items) => setAuditLogs(items as AuditLog[]), 'audit logs', (id, data) => ({ id, ...data } as AuditLog));
      } else {
        setAuditLogs([]);
      }
    }

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [
    currentUser,
    setHackathons,
    setStudents,
    setAdmins,
    setTeams,
    setRegistrations,
    setSubmissions,
    setAnnouncements,
    setNotifications,
    setCertificates,
    setAuditLogs
  ]);
}
