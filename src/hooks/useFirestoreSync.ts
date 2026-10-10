import { useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
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
  Certificate
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

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    // 1. Sync public Hackathons
    try {
      const qHackathons = query(collection(db, 'hackathons'));
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
      // 4. Registrations
      try {
        const qRegistrations = query(collection(db, 'registrations'));
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

      // 5. Teams
      try {
        const qTeams = query(collection(db, 'teams'));
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

      // 6. Submissions
      try {
        const qSubmissions = query(collection(db, 'submissions'));
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

      // 7. Notifications
      try {
        const qNotifications = query(collection(db, 'notifications'));
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

      // 8. Students (Admin only)
      if (currentUser.role === 'ADMIN') {
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

        // 9. Admins list (Admin only)
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
