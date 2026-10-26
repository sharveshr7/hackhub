import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAppStore } from '../lib/store';
import { Certificate } from '../types';
import { sanitizeForFirestore } from '../utils/firestoreSerializer';

export const certificateService = {
  /**
   * Fetch certificates for current student from Firestore
   */
  async getStudentCertificates(studentId: string): Promise<Certificate[]> {
    if (!studentId) return [];
    const q = query(collection(db, 'certificates'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    const certificates = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Certificate));
    
    useAppStore.setState({ certificates });
    return certificates;
  },

  /**
   * Issue certificate (Admin/Convenor desk)
   */
  async issueCertificate(
    data: Omit<Certificate, 'id' | 'issueDate'> & { id?: string }
  ): Promise<Certificate> {
    const id = data.id || `cert_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const cert: Certificate = {
      ...data,
      id,
      issueDate: now
    };

    const cleanCert = sanitizeForFirestore(cert);

    await setDoc(doc(db, 'certificates', id), {
      ...cleanCert,
      createdAt: serverTimestamp()
    });

    useAppStore.setState((state) => ({
      certificates: [cert, ...state.certificates]
    }));
    return cert;
  }
};
