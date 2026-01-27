/**
 * Example usage of useKeyboardNavigation hook
 * 
 * This file demonstrates how to use the useKeyboardNavigation hook
 * in real-world scenarios. It is not part of the production code,
 * but serves as documentation and can be used for manual testing.
 */

import { useState } from 'react';
import { useKeyboardNavigation } from './use-keyboard-navigation';

/**
 * Example 1: Search Dialog with Keyboard Shortcut
 * 
 * Opens a search dialog with Ctrl+K (or Cmd+K on Mac)
 * and closes it with Escape.
 */
export function SearchDialogExample() {
  const [isOpen, setIsOpen] = useState(false);

  useKeyboardNavigation([
    {
      key: 'k',
      ctrlKey: true,
      handler: () => setIsOpen(true),
      description: 'Open search dialog'
    },
    {
      key: 'Escape',
      handler: () => setIsOpen(false),
      description: 'Close search dialog'
    }
  ]);

  return (
    <div>
      <p>Press Ctrl+K (or Cmd+K) to open search</p>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h2>Search Dialog</h2>
            <input type="text" placeholder="Search..." className="border p-2 w-full" />
            <p className="text-sm text-gray-600 mt-2">Press Escape to close</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example 2: Image Gallery with Arrow Key Navigation
 * 
 * Navigate through images using arrow keys.
 */
export function ImageGalleryExample() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = ['image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg'];

  useKeyboardNavigation([
    {
      key: 'ArrowLeft',
      handler: () => setCurrentIndex(prev => Math.max(0, prev - 1)),
      description: 'Previous image'
    },
    {
      key: 'ArrowRight',
      handler: () => setCurrentIndex(prev => Math.min(images.length - 1, prev + 1)),
      description: 'Next image'
    },
    {
      key: 'Home',
      handler: () => setCurrentIndex(0),
      description: 'First image'
    },
    {
      key: 'End',
      handler: () => setCurrentIndex(images.length - 1),
      description: 'Last image'
    }
  ]);

  return (
    <div>
      <div className="text-center">
        <img 
          src={images[currentIndex]} 
          alt={`Image ${currentIndex + 1}`}
          className="max-w-md mx-auto"
        />
        <p className="mt-4">
          Image {currentIndex + 1} of {images.length}
        </p>
        <p className="text-sm text-gray-600">
          Use arrow keys to navigate, Home/End for first/last
        </p>
      </div>
    </div>
  );
}

/**
 * Example 3: Text Editor with Multiple Shortcuts
 * 
 * Demonstrates multiple keyboard shortcuts for common editor actions.
 */
export function TextEditorExample() {
  const [text, setText] = useState('');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  useKeyboardNavigation([
    {
      key: 's',
      ctrlKey: true,
      handler: (e) => {
        console.log('Saving...', text);
        alert('Document saved!');
      },
      description: 'Save document'
    },
    {
      key: 'b',
      ctrlKey: true,
      handler: () => setIsBold(!isBold),
      description: 'Toggle bold'
    },
    {
      key: 'i',
      ctrlKey: true,
      handler: () => setIsItalic(!isItalic),
      description: 'Toggle italic'
    },
    {
      key: 'z',
      ctrlKey: true,
      handler: () => {
        console.log('Undo');
        // Undo logic would go here
      },
      description: 'Undo'
    },
    {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      handler: () => {
        console.log('Redo');
        // Redo logic would go here
      },
      description: 'Redo'
    }
  ]);

  return (
    <div className="p-4">
      <div className="mb-4 space-x-2">
        <button 
          className={`px-3 py-1 border ${isBold ? 'bg-blue-500 text-white' : ''}`}
          onClick={() => setIsBold(!isBold)}
        >
          Bold (Ctrl+B)
        </button>
        <button 
          className={`px-3 py-1 border ${isItalic ? 'bg-blue-500 text-white' : ''}`}
          onClick={() => setIsItalic(!isItalic)}
        >
          Italic (Ctrl+I)
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={`w-full h-64 p-4 border ${isBold ? 'font-bold' : ''} ${isItalic ? 'italic' : ''}`}
        placeholder="Start typing... (Ctrl+S to save)"
      />
      <p className="text-sm text-gray-600 mt-2">
        Shortcuts: Ctrl+S (save), Ctrl+B (bold), Ctrl+I (italic), Ctrl+Z (undo), Ctrl+Shift+Z (redo)
      </p>
    </div>
  );
}

/**
 * Example 4: Modal with Focus Management
 * 
 * Combines useKeyboardNavigation with modal dialogs.
 */
export function ModalExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useKeyboardNavigation([
    {
      key: 'Escape',
      handler: () => {
        if (isOpen) {
          setIsOpen(false);
        }
      },
      description: 'Close modal'
    },
    {
      key: 'Enter',
      handler: () => {
        if (isOpen) {
          setConfirmed(true);
          setIsOpen(false);
        }
      },
      description: 'Confirm action'
    }
  ]);

  return (
    <div>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Open Modal
      </button>
      
      {confirmed && (
        <p className="mt-4 text-green-600">Action confirmed!</p>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirm Action</h2>
            <p className="mb-4">Are you sure you want to proceed?</p>
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  setConfirmed(true);
                  setIsOpen(false);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Confirm (Enter)
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel (Escape)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example 5: Accessibility-Focused Navigation
 * 
 * Demonstrates keyboard shortcuts for accessibility features.
 */
export function AccessibilityNavigationExample() {
  const [fontSize, setFontSize] = useState(16);
  const [highContrast, setHighContrast] = useState(false);

  useKeyboardNavigation([
    {
      key: '+',
      ctrlKey: true,
      handler: () => setFontSize(prev => Math.min(32, prev + 2)),
      description: 'Increase font size'
    },
    {
      key: '-',
      ctrlKey: true,
      handler: () => setFontSize(prev => Math.max(12, prev - 2)),
      description: 'Decrease font size'
    },
    {
      key: '0',
      ctrlKey: true,
      handler: () => setFontSize(16),
      description: 'Reset font size'
    },
    {
      key: 'h',
      ctrlKey: true,
      shiftKey: true,
      handler: () => setHighContrast(!highContrast),
      description: 'Toggle high contrast'
    }
  ]);

  return (
    <div 
      className={`p-4 ${highContrast ? 'bg-black text-white' : 'bg-white text-black'}`}
      style={{ fontSize: `${fontSize}px` }}
    >
      <h2 className="font-bold mb-4">Accessibility Settings</h2>
      <p className="mb-2">Font Size: {fontSize}px</p>
      <p className="mb-2">High Contrast: {highContrast ? 'On' : 'Off'}</p>
      <div className="mt-4 text-sm opacity-75">
        <p>Ctrl + Plus: Increase font size</p>
        <p>Ctrl + Minus: Decrease font size</p>
        <p>Ctrl + 0: Reset font size</p>
        <p>Ctrl + Shift + H: Toggle high contrast</p>
      </div>
    </div>
  );
}
