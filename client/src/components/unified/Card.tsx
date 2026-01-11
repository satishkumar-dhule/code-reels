/**
 * Unified Card Component
 * 
 * Consistent card/panel design across the entire application
 * Replaces 50+ duplicate implementations
 * 
 * Used in: Certifications, Profile, Bookmarks, Notifications, VoiceSession,
 * Tests, TrainingMode, CodingChallenge, MobileHomeFocused, MobileFeed, and more
 */

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

export type CardVariant = 'default' | 'elevated' | 'outline' | 'ghost';
export type CardSize = 'sm' | 'md' | 'lg' | 'xl';
export type CardRounded = 'default' | 'lg' | 'xl' | '2xl' | 'full';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  rounded?: CardRounded;
  hoverable?: boolean;
  clickable?: boolean;
  gradient?: boolean;
  className?: string;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-card border border-border',
  elevated: 'bg-card border border-border shadow-lg',
  outline: 'bg-transparent border border-border',
  ghost: 'bg-transparent'
};

const sizeClasses: Record<CardSize, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8'
};

const roundedClasses: Record<CardRounded, string> = {
  default: 'rounded-lg',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full'
};

export function Card({
  children,
  variant = 'default',
  size = 'md',
  rounded = 'xl',
  hoverable = false,
  clickable = false,
  gradient = false,
  className = '',
  ...motionProps
}: CardProps) {
  const baseClasses = variantClasses[variant];
  const paddingClass = sizeClasses[size];
  const roundedClass = roundedClasses[rounded];
  
  const hoverClass = hoverable 
    ? 'hover:border-primary/30 hover:shadow-lg transition-all' 
    : '';
  
  const clickableClass = clickable 
    ? 'cursor-pointer active:scale-[0.98]' 
    : '';

  const gradientClass = gradient
    ? 'bg-gradient-to-br from-card to-card/50'
    : '';

  return (
    <motion.div
      className={`
        ${baseClasses} ${paddingClass} ${roundedClass}
        ${hoverClass} ${clickableClass} ${gradientClass}
        ${className}
      `}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

/**
 * Card Header - Consistent header section
 */
interface CardHeaderProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className = ''
}: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {icon && (
          <div className="flex-shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {typeof title === 'string' ? (
            <h3 className="font-semibold text-base leading-tight">{title}</h3>
          ) : (
            title
          )}
          {subtitle && (
            typeof subtitle === 'string' ? (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            ) : (
              subtitle
            )
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0 ml-3">
          {action}
        </div>
      )}
    </div>
  );
}

/**
 * Card Footer - Consistent footer section
 */
interface CardFooterProps {
  children: ReactNode;
  className?: string;
  divider?: boolean;
}

export function CardFooter({
  children,
  className = '',
  divider = true
}: CardFooterProps) {
  return (
    <div className={`${divider ? 'pt-4 mt-4 border-t border-border/50' : ''} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Card Section - Divider between card sections
 */
interface CardSectionProps {
  children: ReactNode;
  className?: string;
  divider?: boolean;
}

export function CardSection({
  children,
  className = '',
  divider = true
}: CardSectionProps) {
  return (
    <div className={`${divider ? 'py-4 border-t border-border/50 first:pt-0 first:border-t-0' : ''} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Interactive Card - Card with built-in click handling
 */
interface InteractiveCardProps extends CardProps {
  onClick?: () => void;
  href?: string;
}

export function InteractiveCard({
  onClick,
  href,
  children,
  hoverable = true,
  clickable = true,
  ...props
}: InteractiveCardProps) {
  const handleClick = () => {
    if (href) {
      window.location.href = href;
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <Card
      hoverable={hoverable}
      clickable={clickable}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </Card>
  );
}

/**
 * Stat Card - Card for displaying metrics
 */
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: number;
  variant?: CardVariant;
  size?: CardSize;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  variant = 'default',
  size = 'md',
  className = ''
}: StatCardProps) {
  return (
    <Card variant={variant} size={size} className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend !== undefined && (
            <p className={`text-xs mt-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Empty Card - Card for empty states
 */
interface EmptyCardProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: CardSize;
  className?: string;
}

export function EmptyCard({
  icon,
  title,
  description,
  action,
  size = 'lg',
  className = ''
}: EmptyCardProps) {
  return (
    <Card variant="default" size={size} className={`text-center ${className}`}>
      {icon && (
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}
      {action && action}
    </Card>
  );
}
