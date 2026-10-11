import { auth, db } from '../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAppStore } from '../lib/store';
import { Submission, SubmissionStatus, Hackathon } from '../types';
import { uploadToCloudinary } from './cloudinaryService';

export const submissionService = {
  /**
   * Upload submission artifact (ZIP, PDF, PPT, Word, Image) to Cloudinary
   */
  async uploadSubmissionFile(
    teamId: string,
    file: File,
    hackathonId?: string,
    onProgress?: (percent: number) => void
  ): Promise<{
    name: string;
    url: string;
    size: string;
    path: string;
    cloudinaryPublicId: string;
    resourceType: string;
  }> {
    const res = await uploadToCloudinary(file, {
      teamId,
      hackathonId,
      onProgress
    });

    return {
      name: res.fileName,
      url: res.secureUrl,
      path: res.publicId,
      size: res.fileSize,
      cloudinaryPublicId: res.publicId,
      resourceType: res.resourceType
    };
  },

  /**
   * Fetch submission for a team from Firestore
   */
  async getSubmissionByTeam(hackathonId: string, teamId: string): Promise<Submission | null> {
    const q = query(
      collection(db, 'submissions'),
      where('hackathonId', '==', hackathonId),
      where('teamId', '==', teamId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Submission;
  },

  /**
   * Fetch all submissions (or filtered by hackathon) from Firestore
   */
  async getAllSubmissions(hackathonId?: string): Promise<Submission[]> {
    let q = query(collection(db, 'submissions'));
    if (hackathonId) {
      q = query(collection(db, 'submissions'), where('hackathonId', '==', hackathonId));
    }
    const snap = await getDocs(q);
    const submissions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
    useAppStore.setState({ submissions });
    return submissions;
  },

  /**
   * Save submission draft or final submission to Firestore
   */
  async saveSubmission(
    data: Partial<Submission> & {
      hackathonId: string;
      teamId: string;
      teamName: string;
      isDraft?: boolean;
    }
  ): Promise<Submission> {
    // 1. If final submission, validate submission deadline
    if (!data.isDraft) {
      const hSnap = await getDoc(doc(db, 'hackathons', data.hackathonId));
      if (hSnap.exists()) {
        const hackathon = hSnap.data() as Hackathon;
        const deadlineStr = hackathon.submissionDeadline || hackathon.eventEnd;
        if (deadlineStr) {
          const deadline = new Date(deadlineStr);
          if (!isNaN(deadline.getTime()) && new Date() > deadline) {
            throw new Error('Project submission deadline has officially elapsed for this challenge.');
          }
        }
      }
    }

    const subId = data.id || `sub_${data.hackathonId}_${data.teamId}`;
    const nowIso = new Date().toISOString();

    const submissionDoc: Submission = {
      id: subId,
      hackathonId: data.hackathonId,
      teamId: data.teamId,
      teamName: data.teamName,
      projectTitle: data.projectTitle || 'Untitled Prototype',
      problemStatementId: data.problemStatementId || '',
      problemStatementTitle: data.problemStatementTitle || 'General Track',
      tagline: data.tagline || '',
      description: data.description || '',
      technologies: data.technologies || data.techStack || [],
      techStack: data.techStack || data.technologies || [],
      githubUrl: data.githubUrl || '',
      demoUrl: data.demoUrl || data.liveDemoUrl || '',
      liveDemoUrl: data.liveDemoUrl || data.demoUrl || '',
      videoDemoUrl: data.videoDemoUrl || '',
      presentationUrl: data.presentationUrl || '',
      files: data.files || [],
      projectName: data.projectName || data.projectTitle || 'Untitled Prototype',
      fileName: data.fileName || (data.files && data.files[0]?.name) || '',
      fileUrl: data.fileUrl || (data.files && data.files[0]?.url) || '',
      cloudinaryPublicId: data.cloudinaryPublicId || (data.files && (data.files[0]?.cloudinaryPublicId || data.files[0]?.path)) || '',
      fileSize: data.fileSize || (data.files && data.files[0]?.size) || '',
      resourceType: data.resourceType || (data.files && data.files[0]?.resourceType) || '',
      submittedBy: data.submittedBy || auth.currentUser?.uid || '',
      status: data.isDraft ? 'DRAFT' : 'SUBMITTED',
      isDraft: Boolean(data.isDraft),
      ...(data.isDraft ? {} : { submittedAt: nowIso }),
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const cleanSubmission = Object.fromEntries(
      Object.entries({
        ...submissionDoc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).filter(([_, v]) => v !== undefined)
    );

    await setDoc(doc(db, 'submissions', subId), cleanSubmission);

    useAppStore.getState().saveSubmission(submissionDoc);
    return submissionDoc;
  },

  async saveDraft(
    data: Partial<Submission> & { hackathonId: string; teamId: string; teamName: string }
  ): Promise<Submission> {
    return this.saveSubmission({ ...data, isDraft: true });
  },

  async submitFinal(
    data: Partial<Submission> & { hackathonId: string; teamId: string; teamName: string }
  ): Promise<Submission> {
    return this.saveSubmission({ ...data, isDraft: false });
  },

  /**
   * Evaluate submission (Faculty / Judge scoring)
   */
  async evaluateSubmission(
    submissionId: string,
    score: number,
    feedback: string,
    rank?: string,
    status: SubmissionStatus = 'EVALUATED'
  ): Promise<void> {
    await updateDoc(doc(db, 'submissions', submissionId), {
      evaluationScore: score,
      evaluationFeedback: feedback,
      rank: rank || null,
      status,
      updatedAt: serverTimestamp()
    });

    useAppStore.getState().evaluateSubmission(submissionId, score, feedback, rank, status);
  }
};
