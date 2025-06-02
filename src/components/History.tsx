import { useState, useEffect } from 'react';
import { HistoryItem, ContentType } from '@/types';
import { historyManager } from '@/lib/history';

interface HistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadItem: (item: HistoryItem) => void;
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

export default function History({ isOpen, onClose, onLoadItem }: HistoryProps) {
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
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      historyManager.clearHistory();
      loadHistory();
    }
  };

  const handleExportHistory = () => {
    const exported = historyManager.exportHistory();
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `thinker-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (historyManager.importHistory(content)) {
        loadHistory();
        alert('History imported successfully!');
      } else {
        alert('Failed to import history. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Sidebar */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              <h2 className="text-lg font-semibold">History</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="mt-2 text-sm text-blue-100">
            {historyItems.length} saved item{historyItems.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* History Management */}
        <div className="border-b border-gray-200 p-3">
          <div className="flex gap-2">
            <button
              onClick={handleExportHistory}
              className="flex-1 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              disabled={historyItems.length === 0}
            >
              Export
            </button>
            <label className="flex-1 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors cursor-pointer text-center">
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportHistory}
                className="hidden"
              />
            </label>
            <button
              onClick={handleClearHistory}
              className="flex-1 px-3 py-2 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              disabled={historyItems.length === 0}
            >
              Clear All
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto">
          {historyItems.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm">No saved items yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Generate some content to see it here
              </p>
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer group"
                  onClick={() => handleLoadItem(item)}
                >
                  {/* Title */}
                  <div className="flex items-start justify-between mb-2">
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
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center flex-1">
                        <span className="text-lg mr-2">
                          {contentTypeIcons[item.contentType]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 text-sm truncate">
                            {item.title}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            {item.articleTitle}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {editingId !== item.id && (
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleEditTitle(item, e)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Edit title"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                        {contentTypeLabels[item.contentType]}
                      </span>
                      <span className="ml-2">
                        {item.generatedContent.items.length} items
                      </span>
                    </div>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>

                  {/* Posts indicator */}
                  {item.generatedPosts && (
                    <div className="mt-2 flex items-center text-xs text-green-600">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {item.generatedPosts.posts.length} post{item.generatedPosts.posts.length !== 1 ? 's' : ''} generated
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 