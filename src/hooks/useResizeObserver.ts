import { useEffect, useRef } from 'react';

/**
 * A hook that observes size changes of an element and calls a handler function
 * 
 * @param ref Reference to the element to observe
 * @param handler Function to call when the element's size changes
 * @returns void
 */
export const useResizeObserver = <T extends Element>(
  ref: React.RefObject<T | null>,
  handler: (value: React.RefObject<T | null>) => void
): void => {
  // Keep a reference to the latest handler function
  const savedHandler = useRef(handler);
  
  // Update the saved handler if it changes
  useEffect(() => {
    savedHandler.current = handler;
  });

  // Set up the resize observer
  useEffect(() => {
    const observableElement = ref?.current;
    if (observableElement) {
      // Create a new ResizeObserver
      const resizeObserver = new ResizeObserver(() => {
        if (savedHandler.current) {
          savedHandler.current(ref);
        }
      });

      // Start observing the element
      resizeObserver.observe(observableElement);

      // Clean up the observer when the component unmounts
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [ref]);
};
