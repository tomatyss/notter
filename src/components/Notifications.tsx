import React, { useEffect } from 'react';

/**
 * Represents a notification to be displayed to the user
 */
export interface Notification {
  /**
   * Unique identifier for the notification
   */
  id: number;
  
  /**
   * Type of notification (determines styling)
   */
  type: 'info' | 'success' | 'error';
  
  /**
   * Message to display in the notification
   */
  message: string;
  
  /**
   * Time in milliseconds after which the notification should auto-dismiss
   * If null, the notification will not auto-dismiss
   */
  timeout: number | null;
}

/**
 * Props for the Notifications component
 */
interface NotificationsProps {
  /**
   * Array of notifications to display
   */
  notifications: Notification[];
  
  /**
   * Callback to dismiss a notification
   */
  onDismiss: (id: number) => void;
}

/**
 * Component for displaying notifications
 * 
 * @param props Component props
 * @returns Notifications UI component
 */
export const Notifications: React.FC<NotificationsProps> = ({ notifications, onDismiss }) => {
  // Set up timeouts for auto-dismissing notifications
  useEffect(() => {
    const timeouts: number[] = [];
    
    notifications.forEach(notification => {
      if (notification.timeout) {
        const timeout = setTimeout(() => {
          onDismiss(notification.id);
        }, notification.timeout);
        
        timeouts.push(timeout);
      }
    });
    
    // Clean up timeouts when component unmounts or notifications change
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [notifications, onDismiss]);
  
  // Don't render anything if there are no notifications
  if (notifications.length === 0) {
    return null;
  }
  
  return (
    <div className="notifications-container">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`notification notification-${notification.type}`}
        >
          <span className="notification-message">{notification.message}</span>
          <button 
            className="notification-dismiss" 
            onClick={() => onDismiss(notification.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
