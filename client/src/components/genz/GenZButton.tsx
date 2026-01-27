/**
 * GenZ Button Component - Neon gradient buttons
 * Supports reduced motion for accessibility
 */

import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useReducedMotion } from '../../hooks/use-reduced-motion';

interface GenZButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function GenZButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className,
  type = 'button',
}: GenZButtonProps) {
  const prefersReducedMotion = useReducedMotion();
  
  const variants = {
    primary: 'bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground font-bold',
    secondary: 'bg-muted/50 border border-border text-foreground hover:bg-muted',
    danger: 'bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold',
    ghost: 'bg-transparent text-foreground hover:bg-muted/50',
  };

  const sizes = {
    sm: 'px-4 py-2.5 text-sm rounded-[12px] min-h-[44px]', // Increased padding to meet 44px minimum
    md: 'px-6 py-3 text-base rounded-[16px] min-h-[44px]',
    lg: 'px-8 py-4 text-lg rounded-[20px] min-h-[52px]',
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={prefersReducedMotion || disabled ? {} : { scale: 1.05 }}
      whileTap={prefersReducedMotion || disabled ? {} : { scale: 0.95 }}
      transition={{ duration: prefersReducedMotion ? 0.01 : 0.2 }}
      className={cn(
        'transition-all font-semibold',
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </motion.button>
  );
}
