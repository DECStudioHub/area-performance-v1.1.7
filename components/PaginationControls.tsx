import React from 'react';

interface PaginationControlsProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  itemCountOptions?: number[];
  idPrefix?: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onItemsPerPageChange,
  itemCountOptions = [10, 30, 50, 100],
  idPrefix = 'pagination'
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalItems === 0) {
    return null;
  }

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onItemsPerPageChange(Number(e.target.value));
    onPageChange(1); // Reset to first page
  };

  const pageNumbers = [];
  const maxPageButtons = 5; // Max number of page buttons to show (e.g., 1 ... 4 5 6 ... 10)
  
  if (totalPages <= maxPageButtons) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    pageNumbers.push(1);
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
        endPage = Math.min(totalPages - 1, maxPageButtons - 2);
    } else if (currentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - (maxPageButtons - 3));
    }
    
    if (startPage > 2) {
      pageNumbers.push(-1); // Ellipsis placeholder
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    if (endPage < totalPages - 1) {
      pageNumbers.push(-1); // Ellipsis placeholder
    }
    pageNumbers.push(totalPages);
  }


  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 py-3 border-t border-gray-700">
      <div className="flex items-center space-x-2 mb-2 sm:mb-0">
        <label htmlFor={`${idPrefix}-items-per-page`} className="text-sm text-gray-300 whitespace-nowrap">Show:</label>
        <select
          id={`${idPrefix}-items-per-page`}
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200"
          aria-label="Items per page"
        >
          {itemCountOptions.map(option => (
            <option key={option} value={option}>{option} records</option>
          ))}
        </select>
        <span className="text-sm text-gray-400 whitespace-nowrap">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
        </span>
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <i className="fas fa-chevron-left"></i>
        </button>

        {pageNumbers.map((page, index) =>
          page === -1 ? (
            <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-gray-400">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={currentPage === page}
              className={`px-3 py-2 rounded-md text-sm ${
                currentPage === page 
                  ? 'bg-primary-color text-white font-semibold' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              aria-label={`Go to page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
