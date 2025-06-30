
import React from 'react';
import { SortConfig } from '../types';

interface SortableHeaderProps<T> {
  label: string;
  sortKey: keyof T;
  sortConfig: SortConfig<T> | null;
  onSort: (key: keyof T) => void;
  className?: string;
  textCenter?: boolean;
}

const SortableHeader = <T,>({ 
  label, 
  sortKey, 
  sortConfig, 
  onSort, 
  className = '',
  textCenter = false 
}: SortableHeaderProps<T>): React.ReactElement => {
  const isSorted = sortConfig?.key === sortKey;
  const direction = sortConfig?.direction;

  let iconClass = 'fa-sort';
  if (isSorted) {
    iconClass = direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  return (
    <th
      className={`p-3 cursor-pointer select-none hover:text-blue-300 ${isSorted ? 'text-white' : ''} ${textCenter ? 'text-center' : ''} ${className}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <i className={`fas ${iconClass} ml-2 text-gray-400 ${isSorted ? 'text-white' : ''}`}></i>
    </th>
  );
};

export default SortableHeader;
