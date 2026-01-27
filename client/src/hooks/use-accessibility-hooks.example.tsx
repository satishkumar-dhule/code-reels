/**
 * Example usage of accessibility hooks
 * 
 * This file demonstrates how to use the useReducedMotion and useAnnouncer hooks
 * to create accessible, motion-sensitive components with screen reader support.
 */

import { useState } from 'react';
import { useReducedMotion } from './use-reduced-motion';
import { useAnnouncer } from './use-announcer';

/**
 * Example 1: Animated notification with reduced motion support
 */
export function AccessibleNotification() {
  const [isVisible, setIsVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { announce } = useAnnouncer();

  const showNotification = (message: string) => {
    setIsVisible(true);
    // Announce to screen readers
    announce(message, 'polite');
    
    // Auto-hide after 3 seconds
    setTimeout(() => setIsVisible(false), 3000);
  };

  return (
    <div>
      <button onClick={() => showNotification('Settings saved successfully!')}>
        Save Settings
      </button>
      
      {isVisible && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '16px',
            background: '#4caf50',
            color: 'white',
            borderRadius: '4px',
            // Respect reduced motion preference
            transition: prefersReducedMotion ? 'none' : 'all 0.3s ease-in-out',
            opacity: isVisible ? 1 : 0,
          }}
        >
          Settings saved successfully!
        </div>
      )}
    </div>
  );
}

/**
 * Example 2: Form with accessible error announcements
 */
export function AccessibleForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { announce } = useAnnouncer();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.includes('@')) {
      const errorMessage = 'Error: Please enter a valid email address';
      setError(errorMessage);
      // Announce error assertively to interrupt screen reader
      announce(errorMessage, 'assertive');
    } else {
      setError('');
      announce('Form submitted successfully', 'polite');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">
        Email Address
      </label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? 'email-error' : undefined}
      />
      {error && (
        <div id="email-error" role="alert">
          {error}
        </div>
      )}
      <button type="submit">Submit</button>
    </form>
  );
}

/**
 * Example 3: Loading state with announcements
 */
export function AccessibleLoadingButton() {
  const [isLoading, setIsLoading] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { announce } = useAnnouncer();

  const handleClick = async () => {
    setIsLoading(true);
    announce('Loading data...', 'polite');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    announce('Data loaded successfully', 'polite');
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      aria-busy={isLoading}
      style={{
        position: 'relative',
        padding: '12px 24px',
        // Disable animation if user prefers reduced motion
        transition: prefersReducedMotion ? 'none' : 'opacity 0.2s',
        opacity: isLoading ? 0.6 : 1,
      }}
    >
      {isLoading ? (
        <>
          <span
            style={{
              display: 'inline-block',
              width: '16px',
              height: '16px',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              // Simplified animation for reduced motion
              animation: prefersReducedMotion 
                ? 'none' 
                : 'spin 1s linear infinite',
            }}
          />
          <span style={{ marginLeft: '8px' }}>Loading...</span>
        </>
      ) : (
        'Load Data'
      )}
    </button>
  );
}

/**
 * Example 4: Search results with dynamic announcements
 */
export function AccessibleSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const { announce } = useAnnouncer();

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    
    // Simulate search
    const mockResults = searchQuery 
      ? ['Result 1', 'Result 2', 'Result 3'].filter(r => 
          r.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [];
    
    setResults(mockResults);
    
    // Announce results count to screen readers
    const message = mockResults.length === 0
      ? 'No results found'
      : `${mockResults.length} result${mockResults.length === 1 ? '' : 's'} found`;
    
    announce(message, 'polite');
  };

  return (
    <div>
      <label htmlFor="search">
        Search
      </label>
      <input
        id="search"
        type="search"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        aria-label="Search"
      />
      
      <div role="region" aria-live="polite" aria-atomic="true">
        {results.length > 0 ? (
          <ul>
            {results.map((result, index) => (
              <li key={index}>{result}</li>
            ))}
          </ul>
        ) : query ? (
          <p>No results found</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Example 5: Animated modal with full accessibility
 */
export function AccessibleModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const prefersReducedMotion = useReducedMotion();
  const { announce } = useAnnouncer();

  const handleOpen = () => {
    announce('Modal opened', 'polite');
  };

  const handleClose = () => {
    announce('Modal closed', 'polite');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        // Respect reduced motion preference
        animation: prefersReducedMotion 
          ? 'none' 
          : 'fadeIn 0.3s ease-in-out',
      }}
      onAnimationEnd={handleOpen}
    >
      <h2 id="modal-title">Modal Title</h2>
      <p>Modal content goes here</p>
      <button onClick={handleClose}>Close</button>
    </div>
  );
}

/**
 * Example 6: Progress indicator with announcements
 */
export function AccessibleProgressBar() {
  const [progress, setProgress] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const { announce } = useAnnouncer();

  const updateProgress = (newProgress: number) => {
    setProgress(newProgress);
    
    // Announce progress at key milestones
    if (newProgress === 25 || newProgress === 50 || newProgress === 75) {
      announce(`${newProgress}% complete`, 'polite');
    } else if (newProgress === 100) {
      announce('Upload complete', 'polite');
    }
  };

  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Upload progress"
        style={{
          width: '100%',
          height: '20px',
          background: '#e0e0e0',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: '#4caf50',
            // Smooth transition unless user prefers reduced motion
            transition: prefersReducedMotion ? 'none' : 'width 0.3s ease',
          }}
        />
      </div>
      <p>{progress}% complete</p>
      <button onClick={() => updateProgress(Math.min(progress + 25, 100))}>
        Increase Progress
      </button>
    </div>
  );
}
