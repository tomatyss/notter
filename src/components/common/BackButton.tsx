import React, { useState, useEffect } from 'react';
import { Icon, IconName } from './Icon';
import './BackButton.css';

/**
 * Props for the BackButton component
 */
interface BackButtonProps {
  /**
   * Whether the back button is disabled
   */
  disabled?: boolean;
  
  /**
   * Callback when the back button is clicked
   */
  onClick?: () => void;
  
  /**
   * Optional tooltip text to show on hover
   */
  tooltip?: string;
  
  /**
   * Whether the button is in a loading state
   */
  loading?: boolean;
  
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * Size of the button
   */
  size?: 'small' | 'medium' | 'large';
}

/**
 * BackButton component with smooth animations and micro-interactions
 * 
 * @param props Component props
 * @returns Back button UI component
 */
export const BackButton: React.FC<BackButtonProps> = ({
  disabled = false,
  onClick,
  tooltip,
  loading = false,
  className = '',
  size = 'medium'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  // Handle click with ripple effect
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    // Create ripple effect
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rippleId = Date.now();

    setRipples(prev => [...prev, { id: rippleId, x, y }]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== rippleId));
    }, 600);

    // Call the onClick handler
    if (onClick) {
      onClick();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsPressed(true);
      handleClick(event as any);
    }
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      setIsPressed(false);
    }
  };

  // Tooltip management
  useEffect(() => {
    let timeoutId: number;
    
    if (isHovered && tooltip && !disabled) {
      timeoutId = setTimeout(() => {
        setShowTooltip(true);
      }, 500); // Show tooltip after 500ms hover
    } else {
      setShowTooltip(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isHovered, tooltip, disabled]);

  // Get size-specific values
  const getSizeValues = () => {
    switch (size) {
      case 'small':
        return { buttonSize: 28, iconSize: 14 };
      case 'large':
        return { buttonSize: 44, iconSize: 20 };
      default:
        return { buttonSize: 36, iconSize: 16 };
    }
  };

  const { buttonSize, iconSize } = getSizeValues();

  const buttonClasses = [
    'back-button',
    `back-button--${size}`,
    disabled && 'back-button--disabled',
    loading && 'back-button--loading',
    isHovered && 'back-button--hovered',
    isPressed && 'back-button--pressed',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="back-button-container">
      <button
        className={buttonClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        disabled={disabled || loading}
        aria-label={tooltip || 'Go back to previous note'}
        title={tooltip}
        style={{
          width: buttonSize,
          height: buttonSize
        }}
      >
        {/* Icon */}
        <Icon
          name={IconName.ArrowLeft}
          size={iconSize}
          className="back-button__icon"
          title={loading ? 'Loading...' : 'Back'}
        />

        {/* Loading spinner overlay */}
        {loading && (
          <div className="back-button__spinner">
            <div className="spinner"></div>
          </div>
        )}

        {/* Ripple effects */}
        {ripples.map(ripple => (
          <div
            key={ripple.id}
            className="back-button__ripple"
            style={{
              left: ripple.x,
              top: ripple.y
            }}
          />
        ))}
      </button>

      {/* Tooltip */}
      {showTooltip && tooltip && (
        <div className="back-button-tooltip">
          {tooltip}
          <div className="back-button-tooltip__arrow" />
        </div>
      )}
    </div>
  );
};
