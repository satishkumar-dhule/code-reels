/**
 * Bottom Sheet Component - Mobile-First
 * Uses Vaul (battle-tested, used by Vercel/Shadcn)
 * Pattern: Instagram Stories, Apple Maps
 */

import { Drawer } from 'vaul';
import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  snapPoints?: number[];
  defaultSnap?: number;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  snapPoints = [0.85],
  defaultSnap = 0.85,
  className
}: BottomSheetProps) {
  return (
    <Drawer.Root 
      open={open} 
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
      activeSnapPoint={defaultSnap}
    >
      <Drawer.Portal>
        {/* Backdrop */}
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        
        {/* Sheet */}
        <Drawer.Content 
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 flex flex-col",
            "bg-white dark:bg-gray-900 rounded-t-[24px]",
            "max-h-[95vh] md:max-h-[85vh]",
            "border-t border-gray-200 dark:border-gray-800",
            className
          )}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2 md:hidden">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>
          
          {/* Header */}
          {(title || description) && (
            <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {title && (
                    <Drawer.Title className="text-lg md:text-2xl font-black text-foreground truncate">
                      {title}
                    </Drawer.Title>
                  )}
                  {description && (
                    <Drawer.Description className="text-sm text-muted-foreground mt-1">
                      {description}
                    </Drawer.Description>
                  )}
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="ml-2 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            </div>
          )}
          
          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
          
          {/* Footer - Sticky */}
          {footer && (
            <div className="p-3 md:p-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
              {footer}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// Convenience components
BottomSheet.Trigger = Drawer.Trigger;
BottomSheet.Close = Drawer.Close;
