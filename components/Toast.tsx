
import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[type];

  const toastStyle = {
    '--toast-duration': `${duration / 1000}s`,
  } as React.CSSProperties;

  return (
    <div 
      className={`fixed bottom-5 right-5 ${bgColor} text-white py-3 px-6 rounded-lg shadow-lg z-[2000] animate-fadeInOut`}
      style={toastStyle}
    >
      {message}
    </div>
  );
};

export default Toast;
