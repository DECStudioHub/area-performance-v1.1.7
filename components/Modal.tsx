
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl'; // Added 'xxl'
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    xxl: 'max-w-5xl', // Added xxl size
  };

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
    >
      <div 
        className={`bg-gray-800 p-6 rounded-lg shadow-xl m-4 ${sizeClasses[size]} w-full transform opacity-0 scale-95 animate-modalShow`}
        onClick={(e) => e.stopPropagation()} // Prevent click inside modal from closing it
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;