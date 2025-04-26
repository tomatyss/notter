import React, { useState, useEffect } from 'react';

// Add TypeScript declaration for the __TAURI__ property on window
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

/**
 * MobileLayout component that provides responsive layout for iOS devices
 * 
 * @param props - Component props
 * @param props.children - Child components to render within the mobile layout
 * @returns A responsive layout component for mobile devices
 */
const MobileLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Detect if running on iOS
  useEffect(() => {
    // Simple detection based on user agent and screen size
    // This is a fallback method when Tauri API is not available
    const checkPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isMobileSize = window.innerWidth <= 768;
      
      // For Tauri mobile apps, we can also check for specific environment variables
      // that might be set by the Tauri runtime
      const isTauriMobile = typeof window.__TAURI__ !== 'undefined' && isMobileSize;
      
      setIsMobile(isIOS || isTauriMobile);
    };

    checkPlatform();
  }, []);

  // Handle orientation changes
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };

    // Set initial orientation
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobile]);

  // If not on mobile, just render children normally
  if (!isMobile) {
    return <>{children}</>;
  }

  // Mobile-specific styles
  const mobileStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: orientation === 'portrait' ? 'column' : 'row',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    touchAction: 'manipulation', // Optimize for touch
  };

  return (
    <div style={mobileStyles} className="mobile-container">
      {children}
    </div>
  );
};

export default MobileLayout;
