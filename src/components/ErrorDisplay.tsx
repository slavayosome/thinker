import React from 'react';

interface ErrorDisplayProps {
  error: string;
  errorType?: 'paywall' | 'no-content' | 'parsing-failed' | 'network' | 'unknown';
  suggestions?: string[];
  metadata?: {
    title?: string;
    author?: string;
    date_published?: string;
    domain?: string;
    publisher?: string;
  };
  onRetry?: () => void;
  onStartOver?: () => void;
}

export default function ErrorDisplay({ 
  error, 
  errorType = 'unknown', 
  suggestions = [], 
  metadata,
  onRetry,
  onStartOver 
}: ErrorDisplayProps) {
  const getErrorIcon = () => {
    switch (errorType) {
      case 'paywall':
        return '🔒';
      case 'no-content':
        return '📄';
      case 'parsing-failed':
        return '❌';
      case 'network':
        return '🌐';
      default:
        return '⚠️';
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'paywall':
        return 'Article Behind Paywall';
      case 'no-content':
        return 'Content Not Found';
      case 'parsing-failed':
        return 'Parsing Failed';
      case 'network':
        return 'Connection Error';
      default:
        return 'Article Not Accessible';
    }
  };

  const getErrorColor = () => {
    switch (errorType) {
      case 'paywall':
        return 'border-yellow-200 bg-yellow-50';
      case 'no-content':
        return 'border-blue-200 bg-blue-50';
      case 'parsing-failed':
        return 'border-red-200 bg-red-50';
      case 'network':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className={`rounded-lg border-l-4 p-6 ${getErrorColor()}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-2xl" role="img" aria-label="Error icon">
            {getErrorIcon()}
          </span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-medium text-gray-900">
            {getErrorTitle()}
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {error}
          </p>

          {/* Show article metadata if available (for paywall cases) */}
          {metadata && (metadata.title || metadata.author) && (
            <div className="mt-4 p-3 bg-white rounded border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Article Information</h4>
              {metadata.title && (
                <p className="text-sm text-gray-600"><strong>Title:</strong> {metadata.title}</p>
              )}
              {metadata.author && (
                <p className="text-sm text-gray-600"><strong>Author:</strong> {metadata.author}</p>
              )}
              {metadata.publisher && (
                <p className="text-sm text-gray-600"><strong>Publisher:</strong> {metadata.publisher}</p>
              )}
              {metadata.domain && (
                <p className="text-sm text-gray-600"><strong>Source:</strong> {metadata.domain}</p>
              )}
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">💡 What you can try:</h4>
              <ul className="list-disc list-inside space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-gray-600">
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended sources for paywall errors */}
          {errorType === 'paywall' && (
            <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
              <h4 className="text-sm font-medium text-green-900 mb-2">✅ Try these reliable sources:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                <li><strong>BBC News</strong> - <span className="text-green-600">bbc.com/news</span></li>
                <li><strong>Reuters</strong> - <span className="text-green-600">reuters.com</span></li>
                <li><strong>Associated Press</strong> - <span className="text-green-600">apnews.com</span></li>
                <li><strong>TechCrunch</strong> - <span className="text-green-600">techcrunch.com</span> (for tech articles)</li>
                <li><strong>Ars Technica</strong> - <span className="text-green-600">arstechnica.com</span> (for tech articles)</li>
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex space-x-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                🔄 Try Again
              </button>
            )}
            {onStartOver && (
              <button
                onClick={onStartOver}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                🆕 Start Over
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 