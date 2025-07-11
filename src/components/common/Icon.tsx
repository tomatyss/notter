import React from 'react';
import './Icon.css';

/**
 * Available icon names in the application
 */
export enum IconName {
  Plus = 'plus',
  Sort = 'sort',
  Chat = 'chat',
  Close = 'close',
  ChevronLeft = 'chevron-left',
  ChevronRight = 'chevron-right',
  ChevronDown = 'chevron-down',
  ChevronUp = 'chevron-up',
  ArrowLeft = 'arrow-left',
  SubnoteAdd = 'subnote-add',
}

/**
 * Props for the Icon component
 */
interface IconProps {
  /**
   * The name of the icon to display
   */
  name: IconName;
  
  /**
   * The size of the icon in pixels
   * @default 16
   */
  size?: number;
  
  /**
   * The color of the icon
   * @default "currentColor"
   */
  color?: string;
  
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * Title for accessibility
   */
  title?: string;
  
  /**
   * Additional props to pass to the SVG element
   */
  [key: string]: any;
}

/**
 * Icon component for displaying SVG icons with consistent styling
 * 
 * @param props Component props
 * @returns Icon SVG element
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 16,
  color = 'currentColor',
  className = '',
  title,
  ...rest
}) => {
  // Common SVG attributes
  const svgProps = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: `icon ${className}`,
    'aria-hidden': title ? false : true,
    ...rest
  };
  
  // Render the appropriate icon based on name
  switch (name) {
    case IconName.Plus:
      return (
        <svg {...svgProps}>
          {title && <title>{title}</title>}
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      );
      
    case IconName.Sort:
      return (
        <svg {...svgProps}>
          {title && <title>{title}</title>}
          <path d="M11 5h10"></path>
          <path d="M11 9h7"></path>
          <path d="M11 13h4"></path>
          <path d="M3 17l3 3 3-3"></path>
          <path d="M6 5v15"></path>
        </svg>
      );
      
    case IconName.Chat:
      return (
        <svg {...svgProps}>
          {title && <title>{title}</title>}
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      );
      
    case IconName.Close:
      return (
        <svg {...svgProps}>
          {title && <title>{title}</title>}
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      );
      
    case IconName.ChevronLeft:
      return (
        <svg {...svgProps}>
          {title && <title>{title}</title>}
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      );
      
    case IconName.ChevronRight:
      return (
        <svg {...svgProps}>
          {title && <title>{title}</title>}
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      );
      
    case IconName.ChevronDown:
      return (
        <svg {...svgProps}>
          {title && <title>{title}</title>}
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      );
      
    case IconName.ChevronUp:
      return (
        <svg {...svgProps}>
          {title && <title>{title}</title>}
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      );
      
    case IconName.ArrowLeft:
      return (
        <svg {...svgProps}>
          {title && <title>{title}</title>}
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      );
      
    case IconName.SubnoteAdd:
      return (
        <svg {...svgProps}>
          {title && <title>{title}</title>}
          {/* Plus symbol */}
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
          {/* Branching lines suggesting hierarchy */}
          <path d="M6 6L12 12" className="subnote-branch subnote-branch-1"></path>
          <path d="M18 6L12 12" className="subnote-branch subnote-branch-2"></path>
          <path d="M6 18L12 12" className="subnote-branch subnote-branch-3"></path>
          <path d="M18 18L12 12" className="subnote-branch subnote-branch-4"></path>
        </svg>
      );
      
    default:
      // Return an empty SVG if the icon name is not recognized
      console.warn(`Icon "${name}" not found`);
      return (
        <svg {...svgProps}>
          {title && <title>{title}</title>}
        </svg>
      );
  }
};
