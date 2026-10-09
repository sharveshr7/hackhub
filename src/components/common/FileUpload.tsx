import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  FileArchive,
  Film,
  Presentation,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';

interface FileUploadProps {
  label: string;
  accept?: string;
  maxSizeMB?: number;
  helperText?: string;
  onFileSelect?: (file: File | null) => void;
  initialFileName?: string;
  required?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = '.pdf,.ppt,.pptx,.zip,.mp4',
  maxSizeMB = 25,
  helperText,
  onFileSelect,
  initialFileName,
  required = false
}) => {
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    type: string;
  } | null>(
    initialFileName
      ? {
          name: initialFileName,
          size: 'Uploaded',
          type: initialFileName.split('.').pop() || 'file'
        }
      : null
  );
  const [uploadProgress, setUploadProgress] = useState<number | null>(
    initialFileName ? 100 : null
  );
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-rose-600" />;
    if (ext === 'ppt' || ext === 'pptx') return <Presentation className="w-5 h-5 text-amber-600" />;
    if (ext === 'zip' || ext === 'rar') return <FileArchive className="w-5 h-5 text-blue-600" />;
    if (ext === 'mp4' || ext === 'mov' || ext === 'avi') return <Film className="w-5 h-5 text-purple-600" />;
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  const processFile = (file: File) => {
    setError(null);

    // Validate size
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > maxSizeMB) {
      setError(`File size (${sizeInMB.toFixed(1)} MB) exceeds maximum limit of ${maxSizeMB} MB.`);
      return;
    }

    // Simulate quick progressive upload
    setUploadProgress(20);
    const formattedSize =
      file.size > 1024 * 1024
        ? `${sizeInMB.toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;

    setSelectedFile({
      name: file.name,
      size: formattedSize,
      type: file.name.split('.').pop() || 'file'
    });

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          if (onFileSelect) onFileSelect(file);
          return 100;
        }
        return prev + 40;
      });
    }, 100);
  };

  const handleFiles = (files: FileList | null) => {
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setUploadProgress(null);
    setError(null);
    if (onFileSelect) onFileSelect(null);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-slate-700 tracking-wide">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
        <span className="text-[11px] text-slate-400">Max {maxSizeMB}MB</span>
      </div>

      {selectedFile ? (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-xs shrink-0">
                {getFileIcon(selectedFile.name)}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 truncate">{selectedFile.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-slate-500">{selectedFile.size}</span>
                  {uploadProgress === 100 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                      <CheckCircle2 className="w-3 h-3" />
                      Uploaded
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={clearFile}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {uploadProgress !== null && uploadProgress < 100 && (
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 transition-all duration-150 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/40 hover:bg-slate-50'
          }`}
        >
          <input
            type="file"
            accept={accept}
            onChange={(e) => handleFiles(e.target.files)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center pointer-events-none">
            <div className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center mb-2">
              <UploadCloud className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xs font-semibold text-slate-800">
              Click to browse <span className="font-normal text-slate-500">or drag & drop</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports: {accept.replace(/\./g, ' ').toUpperCase()}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {helperText && !error && (
        <p className="mt-1.5 text-[11px] text-slate-500">{helperText}</p>
      )}
    </div>
  );
};
