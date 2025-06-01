import React from 'react';
import './LoadingSpinner.css';

/**
 * A simple loading spinner component
 * 
 * @returns Loading spinner UI
 */
export const LoadingSpinner: React.FC = () => {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <div className="loading-text">Loading...</div>
    </div>
  );
};
