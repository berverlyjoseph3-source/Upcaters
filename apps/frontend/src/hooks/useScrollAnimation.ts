// file: apps/frontend/src/hooks/useScrollAnimation.ts
import { useEffect, useRef, useState, useCallback } from 'react';

interface ScrollAnimationOptions {
  threshold ? : number;
  rootMargin ? : string;
  triggerOnce ? : boolean;
  onEnter ? : () => void;
  onExit ? : () => void;
}

interface ScrollAnimationReturn {
  ref: React.RefObject < HTMLElement > ;
  isInView: boolean;
  scrollProgress: number;
  entryCount: number;
}

export const useScrollAnimation = (
  options: ScrollAnimationOptions = {}
): ScrollAnimationReturn => {
  const {
    threshold = 0.2,
      rootMargin = '0px 0px -50px 0px',
      triggerOnce = true,
      onEnter,
      onExit,
  } = options;
  
  const ref = useRef < HTMLElement > (null!);
  const [isInView, setIsInView] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [entryCount, setEntryCount] = useState(0);
  const hasTriggered = useRef(false);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isIntersecting = entry.isIntersecting;
          
          if (isIntersecting) {
            if (!hasTriggered.current || !triggerOnce) {
              setIsInView(true);
              setEntryCount((prev) => prev + 1);
              onEnter?.();
              
              if (triggerOnce) {
                hasTriggered.current = true;
              }
            }
            
            setScrollProgress(entry.intersectionRatio);
          } else {
            if (!triggerOnce) {
              setIsInView(false);
              onExit?.();
            }
            
            if (triggerOnce && hasTriggered.current) {
              // Keep isInView true if triggerOnce is enabled
            } else {
              setScrollProgress(0);
            }
          }
        });
      },
      {
        threshold: Array.from({ length: 21 }, (_, i) => i * 0.05),
        rootMargin,
      }
    );
    
    observer.observe(element);
    
    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, onEnter, onExit]);
  
  return {
    ref: ref as React.RefObject < HTMLElement > ,
    isInView,
    scrollProgress,
    entryCount,
  };
};

// Parallax scroll hook
interface ParallaxOptions {
  speed ? : number;
  direction ? : 'up' | 'down' | 'left' | 'right';
  disabled ? : boolean;
}

export const useParallaxScroll = (
  options: ParallaxOptions = {}
): {
  ref: React.RefObject < HTMLElement > ;
  offset: number;
} => {
  const {
    speed = 0.5,
      direction = 'up',
      disabled = false,
  } = options;
  
  const ref = useRef < HTMLElement > (null!);
  const [offset, setOffset] = useState(0);
  
  useEffect(() => {
    if (disabled) return;
    
    const handleScroll = () => {
      if (!ref.current) return;
      
      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = windowHeight / 2;
      const distanceFromCenter = elementCenter - viewportCenter;
      
      const maxOffset = windowHeight * 0.3;
      const rawOffset = (distanceFromCenter / viewportCenter) * maxOffset * speed;
      
      const multiplier = direction === 'down' ? 1 : direction === 'left' ? 1 : direction === 'right' ? -1 : -1;
      setOffset(rawOffset * multiplier);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed, direction, disabled]);
  
  return {
    ref: ref as React.RefObject < HTMLElement > ,
    offset,
  };
};

// Stagger children animation helper
export const useStaggerAnimation = (
  totalItems: number,
  baseDelay: number = 0.1,
  initialDelay: number = 0
): number[] => {
  return Array.from({ length: totalItems }, (_, i) => initialDelay + i * baseDelay);
};

// Scroll to section helper
export const useScrollToSection = () => {
  const scrollToSection = useCallback((sectionId: string, offset: number = 80) => {
    const element = document.querySelector(sectionId);
    if (!element) return;
    
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  }, []);
  
  return scrollToSection;
};

// Active section tracker
export const useActiveSection = (
  sectionIds: string[],
  offset: number = 100
): string | null => {
  const [activeSection, setActiveSection] = useState < string | null > (null);
  
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + offset;
      
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const section = document.querySelector(sectionIds[i]);
        if (!section) continue;
        
        const sectionTop = (section as HTMLElement).offsetTop;
        
        if (scrollPosition >= sectionTop) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sectionIds, offset]);
  
  return activeSection;
};