import { auth, db } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAppStore } from '../lib/store';
import { Submission, SubmissionStatus, Hackathon } from '../types';
import { uploadToCloudinary } from './cloudinaryService';
import { sanitizeForFirestore } from '../utils/firestoreSerializer';

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
    return useAppStore.getState().submissions.find(
      (submission) => submission.hackathonId === hackathonId && submission.teamId === teamId
    ) || null;
  },

  /**
   * Fetch all submissions (or filtered by hackathon) from Firestore
   */
  async getAllSubmissions(hackathonId?: string): Promise<Submission[]> {
    const submissions = useAppStore.getState().submissions;
    return hackathonId ? submissions.filter((submission) => submission.hackathonId === hackathonId) : submissions;
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
    const currentStudent = useAppStore.getState().currentUser?.studentData;

    const teamInStore = useAppStore.getState().teams.find((t) => t.id === data.teamId);
    let leaderId = data.leaderId || teamInStore?.leaderId;
    let memberIds = data.memberIds || teamInStore?.memberIds || (teamInStore?.members ? teamInStore.members.map((m) => m.studentId) : undefined);
    let department = data.department || teamInStore?.department || currentStudent?.department || '';
    let academicYear = data.academicYear || teamInStore?.academicYear || currentStudent?.year || '';

    if (data.teamId) {
      try {
        const teamSnap = await getDoc(doc(db, 'teams', data.teamId));
        if (teamSnap.exists()) {
          const tData = teamSnap.data();
          if (tData.leaderId) leaderId = tData.leaderId;
          if (tData.memberIds) memberIds = tData.memberIds;
          if (tData.department) department = tData.department;
          if (tData.academicYear) academicYear = tData.academicYear;
        }
      } catch {
        // Non-blocking
      }
    }

    const submissionDoc: Submission = {
      id: subId,
      hackathonId: data.hackathonId,
      teamId: data.teamId,
      teamName: data.teamName,
      leaderId,
      memberIds,
      department,
      academicYear,
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

    const subDocRef = doc(db, 'submissions', subId);
    let existingCreatedAt: any = null;
    try {
      const existingSnap = await getDoc(subDocRef);
      if (existingSnap.exists()) {
        existingCreatedAt = existingSnap.data()?.createdAt;
      }
    } catch {
      // Non-blocking
    }

    const cleanSubmission = sanitizeForFirestore({
      ...submissionDoc,
      ...(existingCreatedAt ? { createdAt: existingCreatedAt } : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp()
    });

    await setDoc(subDocRef, cleanSubmission, { merge: true });

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
    const evalPayload = sanitizeForFirestore({
      evaluationScore: score,
      evaluationFeedback: feedback,
      rank: rank || null,
      status,
      updatedAt: serverTimestamp()
    });
    await updateDoc(doc(db, 'submissions', submissionId), evalPayload);

    useAppStore.getState().evaluateSubmission(submissionId, score, feedback, rank, status);
  }
};
