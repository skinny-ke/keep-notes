import { useEffect } from 'react';

interface ShortcutHandlers {
  onNewNote?: () => void;
  onSearch?: () => void;
  onExport?: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + N: New note
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        handlers.onNewNote?.();
      }

      // Ctrl/Cmd + K: Search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        handlers.onSearch?.();
      }

      // Ctrl/Cmd + E: Export
      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        handlers.onExport?.();
      }

      // ESC: Clear search or close dialogs
      if (event.key === 'Escape') {
        // Let other components handle this
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};
