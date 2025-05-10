import React, { useRef, useCallback, useEffect, forwardRef } from 'react';
import debounce from 'lodash/debounce';
import { useResizeObserver } from '../../hooks/useResizeObserver';

/**
 * Props for the AutoResizeTextarea component
 */
interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Additional class name for the textarea
   */
  className?: string;
}

/**
 * A textarea component that automatically adjusts its height based on content
 * without changing the overall layout of the page
 * 
 * @param props Component props
 * @param ref Forwarded ref to the textarea element
 * @returns AutoResizeTextarea component
 */
export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(({ 
  className, 
  ...props 
}, ref) => {
  // Create an internal ref if no ref is provided
  const internalRef = useRef<HTMLTextAreaElement>(null);
  // Use the forwarded ref if available, otherwise use the internal ref
  const textareaRef = (ref || internalRef) as React.RefObject<HTMLTextAreaElement>;

  /**
   * Handle resizing of the textarea
   */
  const handleResize = useCallback(() => {
    if (textareaRef.current) {
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        // Reset height to auto first to get the correct scrollHeight
        textareaRef.current!.style.height = 'auto';
        
        // Get the computed max-height from CSS
        const maxHeight = parseInt(
          window.getComputedStyle(textareaRef.current!).getPropertyValue('max-height'),
          10
        );
        
        // Calculate new height based on content
        const newHeight = textareaRef.current!.scrollHeight;
        
        // Apply the height, respecting max-height if defined
        if (!isNaN(maxHeight) && newHeight > maxHeight) {
          textareaRef.current!.style.height = `${maxHeight}px`;
          // Ensure scrolling is enabled when content exceeds max-height
          textareaRef.current!.style.overflowY = 'auto';
        } else {
          textareaRef.current!.style.height = `${newHeight}px`;
          // Disable scrolling when content fits
          textareaRef.current!.style.overflowY = 'hidden';
        }
      });
    }
  }, []);

  // Debounce the resize handler to prevent too many updates
  const debouncedResize = useCallback(debounce(handleResize, 100), [
    handleResize,
  ]);

  // Resize when the value changes
  useEffect(() => {
    handleResize();
  }, [props.value, handleResize]);

  // Use the resize observer to detect size changes
  useResizeObserver(textareaRef, debouncedResize);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      className={`auto-resize-textarea ${className || ''}`}
    />
  );
});
