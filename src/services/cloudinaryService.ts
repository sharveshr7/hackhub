import { CloudinaryUploadResult } from '../types';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'tq99nsky';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'hackhub_submissions';

// 60 MB limit for project artifacts
export const MAX_FILE_SIZE_BYTES = 60 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = [
  'zip',
  'pdf',
  'ppt',
  'pptx',
  'doc',
  'docx',
  'png',
  'jpg',
  'jpeg',
  'mp4',
  'webm'
];

export interface CloudinaryUploadOptions {
  hackathonId?: string;
  teamId?: string;
  onProgress?: (progressPercent: number) => void;
}

export interface CloudinaryUploadResponse {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: string;
  originalFilename: string;
  fileName: string;
  bytes: number;
  fileSize: string;
  format?: string;
}

/**
 * Validate file before uploading to Cloudinary
 */
export function validateSubmissionFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected for upload.' };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the allowed limit of 60 MB.`
    };
  }

  // Check file extension
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File type .${ext || 'unknown'} is not supported. Allowed formats: .zip, .pdf, .ppt, .pptx, .doc, .docx, .png, .jpg, .jpeg, .mp4, .webm`
    };
  }

  return { valid: true };
}

/**
 * Upload a file to Cloudinary using unsigned upload
 */
export async function uploadToCloudinary(
  file: File,
  options?: CloudinaryUploadOptions
): Promise<CloudinaryUploadResponse> {
  // 1. Validate file
  const validation = validateSubmissionFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file.');
  }

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration is missing. Please check your environment variables.');
  }

  // 2. Safely construct destination folder: hackhub/submissions/{hackathonId}/{teamId}
  let targetFolder = 'hackhub/submissions';
  if (options?.hackathonId && options?.teamId) {
    const safeHackathonId = options.hackathonId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeTeamId = options.teamId.replace(/[^a-zA-Z0-9_-]/g, '_');
    targetFolder = `hackhub/submissions/${safeHackathonId}/${safeTeamId}`;
  } else if (options?.hackathonId) {
    const safeHackathonId = options.hackathonId.replace(/[^a-zA-Z0-9_-]/g, '_');
    targetFolder = `hackhub/submissions/${safeHackathonId}`;
  }

  // 3. Prepare FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', targetFolder);

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUD_NAME)}/auto/upload`;

  // 4. Perform upload with XMLHttpRequest to support accurate progress callbacks
  return new Promise<CloudinaryUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);

    // Progress handler
    if (options?.onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          options.onProgress?.(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res: CloudinaryUploadResult = JSON.parse(xhr.responseText);
          const sizeMb = (res.bytes / (1024 * 1024)).toFixed(2) + ' MB';

          options?.onProgress?.(100);

          resolve({
            url: res.secure_url,
            secureUrl: res.secure_url,
            publicId: res.public_id,
            resourceType: res.resource_type || 'auto',
            originalFilename: res.original_filename || file.name,
            fileName: file.name,
            bytes: res.bytes || file.size,
            fileSize: sizeMb,
            format: res.format
          });
        } catch {
          reject(new Error('Failed to parse Cloudinary response.'));
        }
      } else {
        let errorMsg = 'Upload failed. Please try again.';
        try {
          const errRes = JSON.parse(xhr.responseText);
          if (errRes.error?.message) {
            errorMsg = errRes.error.message;
          }
        } catch {
          // ignore parsing error
        }
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred during file upload. Please check your connection.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out. Please try again with a faster connection.'));
    };

    // 2 minute timeout for larger files
    xhr.timeout = 120000;

    xhr.send(formData);
  });
}

export const cloudinaryService = {
  validateSubmissionFile,
  uploadToCloudinary
};
