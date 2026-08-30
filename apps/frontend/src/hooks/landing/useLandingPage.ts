import { useState, useEffect, useCallback } from 'react';

export function useLandingPage() {
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => { setIsPageLoaded(true); }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      let current = 'hero';
      sections.forEach((s) => {
        if (window.scrollY >= (s as HTMLElement).offsetTop - 100) current = s.id;
      });
      setActiveSection(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return { isPageLoaded, activeSection, scrollToSection };
}
