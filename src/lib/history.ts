import { HistoryItem, HistoryState, ContentResult, SocialPostsResult, PostGenerationPreferences, Language, AnalysisResult } from '@/types';

const STORAGE_KEY = 'thinker-history';
const MAX_HISTORY_ITEMS = 50; // Limit to prevent localStorage bloat

export class HistoryManager {
  private static instance: HistoryManager;
  
  static getInstance(): HistoryManager {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager();
    }
    return HistoryManager.instance;
  }

  private getHistoryState(): HistoryState {
    if (typeof window === 'undefined') {
      return { items: [] };
    }
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { items: [] };
      
      const parsed = JSON.parse(stored);
      return {
        items: parsed.items || [],
        currentItem: parsed.currentItem
      };
    } catch (error) {
      console.error('Failed to load history:', error);
      return { items: [] };
    }
  }

  private saveHistory(history: HistoryState): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Limit the number of items to prevent localStorage overflow
      if (history.items.length > MAX_HISTORY_ITEMS) {
        history.items = history.items.slice(-MAX_HISTORY_ITEMS);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history:', error);
      // If storage is full, try to make space by removing oldest items
      try {
        history.items = history.items.slice(-Math.floor(MAX_HISTORY_ITEMS / 2));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (retryError) {
        console.error('Failed to save history even after cleanup:', retryError);
      }
    }
  }

  generateShortTitle(articleTitle: string, contentType: string): string {
    // Create a short, descriptive title
    const cleanTitle = articleTitle.replace(/[^\w\s]/g, '').trim();
    const words = cleanTitle.split(' ').filter(word => word.length > 3);
    const shortTitle = words.slice(0, 3).join(' ');
    
    const contentTypeLabel = {
      'hooks': 'Hooks',
      'quotes': 'Quotes', 
      'key-insights': 'Insights',
      'statistics': 'Stats',
      'questions': 'Questions',
      'takeaways': 'Takeaways'
    }[contentType] || 'Content';
    
    return `${contentTypeLabel}: ${shortTitle || 'Untitled'}`;
  }

  saveContentGeneration(
    articleUrl: string,
    articleTitle: string,
    contentResult: ContentResult,
    language: Language,
    analysis?: AnalysisResult,
    customTitle?: string
  ): string {
    const history = this.getHistoryState();
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    const item: HistoryItem = {
      id,
      title: customTitle || this.generateShortTitle(articleTitle, contentResult.type),
      articleUrl,
      articleTitle,
      articleAnalysis: analysis,
      contentType: contentResult.type,
      generatedContent: contentResult,
      createdAt: new Date().toISOString(),
      language
    };

    history.items.unshift(item); // Add to beginning
    history.currentItem = item;
    
    this.saveHistory(history);
    console.log(`💾 Saved content generation: ${item.title}`);
    
    return id;
  }

  savePostGeneration(
    itemId: string,
    posts: SocialPostsResult,
    preferences: PostGenerationPreferences,
    selectedIndexes: number[]
  ): void {
    const history = this.getHistoryState();
    const itemIndex = history.items.findIndex(item => item.id === itemId);
    
    if (itemIndex >= 0) {
      history.items[itemIndex].generatedPosts = posts;
      history.items[itemIndex].preferences = preferences;
      history.items[itemIndex].selectedContentIndexes = selectedIndexes;
      history.currentItem = history.items[itemIndex];
      
      this.saveHistory(history);
      console.log(`📝 Updated item with posts: ${history.items[itemIndex].title}`);
    }
  }

  getHistory(): HistoryItem[] {
    return this.getHistoryState().items;
  }

  getCurrentItem(): HistoryItem | undefined {
    return this.getHistoryState().currentItem;
  }

  getHistoryItem(id: string): HistoryItem | undefined {
    const history = this.getHistoryState();
    return history.items.find(item => item.id === id);
  }

  setCurrentItem(id: string): HistoryItem | undefined {
    const history = this.getHistoryState();
    const item = history.items.find(item => item.id === id);
    
    if (item) {
      history.currentItem = item;
      this.saveHistory(history);
      return item;
    }
    
    return undefined;
  }

  deleteItem(id: string): void {
    const history = this.getHistoryState();
    history.items = history.items.filter(item => item.id !== id);
    
    if (history.currentItem?.id === id) {
      history.currentItem = undefined;
    }
    
    this.saveHistory(history);
    console.log(`🗑️  Deleted history item: ${id}`);
  }

  updateItemTitle(id: string, newTitle: string): void {
    const history = this.getHistoryState();
    const item = history.items.find(item => item.id === id);
    
    if (item) {
      item.title = newTitle;
      this.saveHistory(history);
      console.log(`✏️  Updated title: ${newTitle}`);
    }
  }

  clearHistory(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(STORAGE_KEY);
    console.log('🧹 Cleared all history');
  }
}

// Export singleton instance
export const historyManager = HistoryManager.getInstance(); 