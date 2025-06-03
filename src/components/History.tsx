import { useState, useEffect } from 'react';
import { HistoryItem, ContentType } from '@/types';
import { historyManager } from '@/lib/history';
import { formatDistanceToNow, differenceInMinutes, differenceInHours, differenceInDays, format } from 'date-fns';

interface HistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadItem: (item: HistoryItem) => void;
  currentHistoryId?: string | null;
}

const contentTypeIcons = {
  hooks: '🪝',
  quotes: '💬', 
  'key-insights': '💡',
  statistics: '📊',
  questions: '❓',
  takeaways: '📝'
};

const contentTypeLabels = {
  hooks: 'Hooks',
  quotes: 'Quotes',
  'key-insights': 'Key Insights',
  statistics: 'Statistics', 
  questions: 'Questions',
  takeaways: 'Takeaways'
};

export default function History({ isOpen, onClose, onLoadItem, currentHistoryId }: HistoryProps) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = () => {
    const items = historyManager.getHistory();
    setHistoryItems(items);
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this item?')) {
      historyManager.deleteItem(id);
      loadHistory();
    }
  };

  const handleEditTitle = (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditTitle(item.title);
  };

  const handleSaveTitle = (id: string) => {
    if (editTitle.trim()) {
      historyManager.updateItemTitle(id, editTitle.trim());
      loadHistory();
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleLoadItem = (item: HistoryItem) => {
    onLoadItem(item);
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = differenceInMinutes(now, date);
    const diffHours = differenceInHours(now, date);
    const diffDays = differenceInDays(now, date);
    
    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays === 7) {
      return 'a week ago';
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months === 1 ? '' : 's'} ago`;
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      historyManager.clearHistory();
      loadHistory();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Sidebar */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              <h2 className="text-xl font-semibold">History</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-1 rounded-md hover:bg-white/20"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="mt-2 text-sm text-blue-100">
            {historyItems.length} saved item{historyItems.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto">
          {historyItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-base font-medium mb-1">No saved items yet</p>
              <p className="text-sm text-gray-400">
                Generate some content to see it here
              </p>
            </div>
          ) : (
            <>
              {/* Clear History Button */}
              <div className="p-4 border-b border-gray-100">
                <button
                  onClick={handleClearHistory}
                  className="w-full px-4 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium"
                >
                  Clear All History
                </button>
              </div>

              <div className="p-4 space-y-3">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    className={`group relative bg-white rounded-xl p-4 border transition-all duration-200 cursor-pointer hover:shadow-md ${
                      currentHistoryId === item.id 
                        ? 'ring-2 ring-blue-500 border-blue-200 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleLoadItem(item)}
                  >
                    {/* Main Content */}
                    <div className="flex items-start justify-between mb-3">
                      {editingId === item.id ? (
                        <div className="flex-1 mr-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveTitle(item.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            onBlur={() => handleSaveTitle(item.id)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                              {item.articleTitle}
                            </h3>
                            {currentHistoryId === item.id && (
                              <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full flex-shrink-0 font-medium">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="truncate mr-2 font-medium">{new URL(item.articleUrl).hostname}</span>
                            <span className="flex-shrink-0">{formatDate(item.createdAt)}</span>
                          </div>
                        </div>
                      )}
                      
                      {editingId !== item.id && (
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <button
                            onClick={(e) => handleEditTitle(item, e)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit title"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleDeleteItem(item.id, e)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Posts Status - Only if posts exist */}
                    {item.generatedPosts && (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-700 font-medium">
                          {item.generatedPosts.posts.length} post{item.generatedPosts.posts.length !== 1 ? 's' : ''} generated
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 