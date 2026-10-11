import { useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../lib/store';
import {
  Hackathon,
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

    // 1. Sync Hackathons (Admins/HOD see drafts; public/students see published challenges)
    try {
      const qHackathons =
        currentUser?.role === 'ADMIN' || currentUser?.role === 'HOD'
          ? query(collection(db, 'hackathons'))
          : query(collection(db, 'hackathons'), where('status', '!=', 'DRAFT'));
      const unsub = onSnapshot(
        qHackathons,
        (snapshot) => {
          const items: Hackathon[] = [];
          snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() } as Hackathon);
          });
          setHackathons(items);
        },
        (error) => {
          console.warn('Realtime sync warning (hackathons):', error.message);
        }
      );
      unsubscribes.push(unsub);
    } catch (e) {
      console.warn('Failed to attach hackathons listener:', e);
    }

    // 2. Sync public Announcements
    try {
      const qAnnouncements = query(collection(db, 'announcements'));
      const unsub = onSnapshot(
        qAnnouncements,
        (snapshot) => {
          const items: Announcement[] = [];
          snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() } as Announcement);
          });
          setAnnouncements(items);
        },
        (error) => {
          console.warn('Realtime sync warning (announcements):', error.message);
        }
      );
      unsubscribes.push(unsub);
    } catch (e) {
      console.warn('Failed to attach announcements listener:', e);
    }

    // 3. Sync Certificates (Publicly readable)
    try {
      const qCertificates = query(collection(db, 'certificates'));
      const unsub = onSnapshot(
        qCertificates,
        (snapshot) => {
          const items: Certificate[] = [];
          snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() } as Certificate);
          });
          setCertificates(items);
        },
        (error) => {
          console.warn('Realtime sync warning (certificates):', error.message);
        }
      );
      unsubscribes.push(unsub);
    } catch (e) {
      console.warn('Failed to attach certificates listener:', e);
    }

    // Authenticated Collections
    if (currentUser) {
      // 4. Registrations (Students scoped to own records; Administrators see all)
      try {
        const qRegistrations =
          currentUser.role === 'ADMIN' || currentUser.role === 'HOD'
            ? query(collection(db, 'registrations'))
            : query(collection(db, 'registrations'), where('studentId', '==', currentUser.uid));
        const unsub = onSnapshot(
          qRegistrations,
          (snapshot) => {
            const items: Registration[] = [];
            snapshot.forEach((doc) => {
              items.push({ id: doc.id, ...doc.data() } as Registration);
            });
            setRegistrations(items);
          },
          (error) => {
            console.warn('Realtime sync warning (registrations):', error.message);
          }
        );
        unsubscribes.push(unsub);
      } catch (e) {
        console.warn('Failed to attach registrations listener:', e);
      }

      // 5. Teams (Administrators see all; students scoped to own squads)
      try {
        const qTeams =
          currentUser.role === 'ADMIN' || currentUser.role === 'HOD'
            ? query(collection(db, 'teams'))
            : query(collection(db, 'teams'), where('memberIds', 'array-contains', currentUser.uid));
        const unsub = onSnapshot(
          qTeams,
          (snapshot) => {
            const items: Team[] = [];
            snapshot.forEach((doc) => {
              items.push({ id: doc.id, ...doc.data() } as Team);
            });
            setTeams(items);
          },
          (error) => {
            console.warn('Realtime sync warning (teams):', error.message);
          }
        );
        unsubscribes.push(unsub);
      } catch (e) {
        console.warn('Failed to attach teams listener:', e);
      }

      // 6. Submissions (Students scoped to own submissions; Administrators see all)
      try {
        const qSubmissions =
          currentUser.role === 'ADMIN' || currentUser.role === 'HOD'
            ? query(collection(db, 'submissions'))
            : query(collection(db, 'submissions'), where('submittedBy', '==', currentUser.uid));
        const unsub = onSnapshot(
          qSubmissions,
          (snapshot) => {
            const items: Submission[] = [];
            snapshot.forEach((doc) => {
              items.push({ id: doc.id, ...doc.data() } as Submission);
            });
            setSubmissions(items);
          },
          (error) => {
            console.warn('Realtime sync warning (submissions):', error.message);
          }
        );
        unsubscribes.push(unsub);
      } catch (e) {
        console.warn('Failed to attach submissions listener:', e);
      }

      // 7. Notifications (Scoped to current student or broadcast 'ALL' for students; all for administrators)
      try {
        const qNotifications =
          currentUser.role === 'ADMIN' || currentUser.role === 'HOD'
            ? query(collection(db, 'notifications'))
            : query(collection(db, 'notifications'), where('userId', 'in', [currentUser.uid, 'ALL']));
        const unsub = onSnapshot(
          qNotifications,
          (snapshot) => {
            const items: NotificationItem[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data() as NotificationItem;
              // Filter to this user or broadcast 'ALL'
              if (
                currentUser.role === 'ADMIN' ||
                data.userId === currentUser.uid ||
                data.userId === 'ALL' ||
                !data.userId
              ) {
                items.push({ ...data, id: doc.id });
              }
            });
            setNotifications(items);
          },
          (error) => {
            console.warn('Realtime sync warning (notifications):', error.message);
          }
        );
        unsubscribes.push(unsub);
      } catch (e) {
        console.warn('Failed to attach notifications listener:', e);
      }

      // 8. Students (Admin & HOD)
      if (currentUser.role === 'ADMIN' || currentUser.role === 'HOD') {
        try {
          const qStudents = query(collection(db, 'students'));
          const unsub = onSnapshot(
            qStudents,
            (snapshot) => {
              const items: Student[] = [];
              snapshot.forEach((doc) => {
                items.push({ uid: doc.id, ...doc.data() } as unknown as Student);
              });
              setStudents(items);
            },
            (error) => {
              console.warn('Realtime sync warning (students):', error.message);
            }
          );
          unsubscribes.push(unsub);
        } catch (e) {
          console.warn('Failed to attach students listener:', e);
        }

        // 9. Admins list (Admin & HOD)
        try {
          const qAdmins = query(collection(db, 'admins'));
          const unsub = onSnapshot(
            qAdmins,
            (snapshot) => {
              const items: Admin[] = [];
              snapshot.forEach((doc) => {
                items.push({ uid: doc.id, ...doc.data() } as Admin);
              });
              setAdmins(items);
            },
            (error) => {
              console.warn('Realtime sync warning (admins):', error.message);
            }
          );
          unsubscribes.push(unsub);
        } catch (e) {
          console.warn('Failed to attach admins listener:', e);
        }
      }

      // 10. Audit Logs (HOD only)
      if (currentUser.role === 'HOD') {
        try {
          const qAudit = query(collection(db, 'audit_logs'));
          const unsub = onSnapshot(
            qAudit,
            (snapshot) => {
              const items: AuditLog[] = [];
              snapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as AuditLog);
              });
              setAuditLogs(items);
            },
            (error) => {
              console.warn('Realtime sync warning (audit_logs):', error.message);
            }
          );
          unsubscribes.push(unsub);
        } catch (e) {
          console.warn('Failed to attach audit_logs listener:', e);
        }
      }
    }

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
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
    setCertificates
  ]);
}
