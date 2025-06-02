// src/components/UrlInput.tsx
'use client';

import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isProcessing: boolean;
}

export default function UrlInput({ onSubmit, isProcessing }: UrlInputProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isProcessing) {
      onSubmit(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-6">
      <input
        type="url"
        placeholder="Paste article URL here..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={isProcessing}
        className={`
          border border-gray-300 px-4 py-2 rounded-lg w-full
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all duration-200
          ${isProcessing 
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
            : 'bg-white hover:border-gray-400'
          }
        `}
      />
      <button 
        type="submit" 
        disabled={!url.trim() || isProcessing}
        className={`
          px-6 py-2 rounded-lg font-medium transition-all duration-200
          flex items-center space-x-2 min-w-[120px] justify-center
          ${(!url.trim() || isProcessing)
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
          }
        `}
      >
        {isProcessing ? (
          <>
            <LoadingSpinner size="sm" />
            <span>Processing</span>
          </>
        ) : (
          <span>Summarize</span>
        )}
      </button>
    </form>
  );
}