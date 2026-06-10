import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';

interface ReceiptUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

export const ReceiptUpload: React.FC<ReceiptUploadProps> = ({
  onFileSelect,
  selectedFile,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    // Validate File Size: Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large. Max limit is 10MB.');
      return;
    }

    // Validate File Type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPG, PNG, and PDF files are supported.');
      return;
    }

    onFileSelect(file);

    // Create image preview if applicable
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={handleChange}
        className="hidden"
      />

      {selectedFile ? (
        <div className="glass-card p-4 border border-glass-border flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Receipt Preview"
                className="w-12 h-12 object-cover rounded-lg border border-glass-border"
              />
            ) : selectedFile.type === 'application/pdf' ? (
              <div className="w-12 h-12 rounded-lg bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red flex-shrink-0">
                <FileText className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent2 flex-shrink-0">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}

            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>

          <button
            onClick={handleRemove}
            className="p-1.5 rounded-lg border border-glass-border text-secondary hover:text-brand-red hover:bg-glass-card transition-all"
            title="Remove attachment"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={openFilePicker}
          className={`upload-zone cursor-pointer py-8 px-6 text-center transition-all ${
            dragActive
              ? 'border-brand-accent bg-brand-accent/10'
              : 'border-glass-border bg-white/[0.02]'
          }`}
        >
          <div className="flex flex-col items-center gap-2.5">
            <Upload className="w-8 h-8 text-muted animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-primary">Drag & drop or click to upload</p>
              <p className="text-xs text-muted mt-1">Accepts JPG, PNG, PDF (Max 10MB)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
