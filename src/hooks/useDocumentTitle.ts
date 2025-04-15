import { useEffect } from 'react';

/**
 * A hook to set the document title
 * @param title The title to set for the document
 */
export const useDocumentTitle = (title: string) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    
    // Cleanup function to restore the previous title when component unmounts
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}; 