import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface UserIdBadgeProps {
  code: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const UserIdBadge: React.FC<UserIdBadgeProps> = ({ code, className = '', size = 'md' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card clicks if nested
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  const fontSizes = {
    sm: 'text-xs tracking-wider',
    md: 'text-sm font-semibold tracking-widest',
    lg: 'text-lg font-bold tracking-widest',
  };

  return (
    <div className={`inline-flex items-center gap-2 bg-black/30 border border-glass-border rounded-lg ${sizeClasses[size]} ${className}`}>
      <code className={`font-mono text-brand-accent2 ${fontSizes[size]}`}>{code}</code>
      <button
        onClick={handleCopy}
        className="p-1 rounded hover:bg-glass-card text-brand-accent2 hover:text-white transition-all duration-200"
        title="Copy User ID"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-brand-green" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
};
