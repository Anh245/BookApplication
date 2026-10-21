import { useEffect, useState } from 'react';

/**
 * useDarkMode Hook
 * Manages dark mode with localStorage persistence
 */
export const useDarkMode = () => {
  const [isDark, setIsDark] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    // Delay slightly để đảm bảo DOM đã ready
    const timer = setTimeout(() => {
      const savedMode = localStorage.getItem('darkMode');

      if (savedMode !== null) {
        const dark = savedMode === 'true';
        setIsDark(dark);
        applyDarkMode(dark);
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDark(true);
        applyDarkMode(true);
      } else {
        setIsDark(false);
        applyDarkMode(false);
      }

      setIsLoaded(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const applyDarkMode = (dark) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleDarkMode = () => {
    setIsDark(prev => {
      const newValue = !prev;
      applyDarkMode(newValue);
      localStorage.setItem('darkMode', String(newValue));
      return newValue;
    });
  };

  return { isDark, toggleDarkMode, isLoaded };
};
