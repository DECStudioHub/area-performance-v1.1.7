
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, Meeting, TicketLog, SortConfig, ScorecardRecord } from '../types';
import Modal from '../components/Modal';
import SortableHeader from '../components/SortableHeader';
import PaginationControls from '../components/PaginationControls';

interface EmployeesTabProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>; 
  setTickets: React.Dispatch<React.SetStateAction<TicketLog[]>>; 
  scoreHistory_perf: ScorecardRecord[]; // For reading/filtering
  setScoreHistoryPerf: React.Dispatch<React.SetStateAction<ScorecardRecord[]>>; // For deleting associated scores
  confirmDelete: (message: string, onConfirm: () => void) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const EmployeeForm: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Employee) => void;
    initialData?: Employee | null;
    existingEmployees: Employee[];
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ isOpen, onClose, onSubmit, initialData, existingEmployees, showToast }) => {
    const [id, setId] = useState<string | undefined>(undefined);
    // Main App Fields
    const [name, setName] = useState('');
    const [leaveAllowance, setLeaveAllowance] = useState(0);
    const [isTechnician, setIsTechnician] = useState(false);
    const [leaveCoverageStart, setLeaveCoverageStart] = useState('');
    const [leaveCoverageEnd, setLeaveCoverageEnd] = useState('');
    // Scorecard Fields
    const [idNumber, setIdNumber] = useState('');
    const [positionTitle, setPositionTitle] = useState('');
    const [positionClassification, setPositionClassification] = useState('');
    const [department, setDepartment] = useState('');
    const [section, setSection] = useState('');
    // latestScore is not editable here

    useEffect(() => {
        if (initialData) {
            setId(initialData.id);
            setName(initialData.name);
            setLeaveAllowance(initialData.leaveAllowance || 0);
            setIsTechnician(initialData.isTechnician || false);
            setLeaveCoverageStart(initialData.leaveCoverageStart || '');
            setLeaveCoverageEnd(initialData.leaveCoverageEnd || '');
            setIdNumber(initialData.idNumber || '');
            setPositionTitle(initialData.positionTitle || '');
            setPositionClassification(initialData.positionClassification || '');
            setDepartment(initialData.department || '');
            setSection(initialData.section || '');
        } else {
            setId(undefined);
            setName('');
            setLeaveAllowance(0);
            setIsTechnician(false);
            setLeaveCoverageStart('');
            setLeaveCoverageEnd('');
            setIdNumber('');
            setPositionTitle('');
            setPositionClassification('');
            setDepartment('');
            setSection('');
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            showToast("Employee Name is required.", "error");
            return;
        }

        const isDuplicateName = existingEmployees.some(emp => 
            emp.id !== (id || '') && 
            emp.name.trim().toLowerCase() === name.trim().toLowerCase()
        );

        if (isDuplicateName) {
            showToast("An employee with this name already exists.", "error");
            return;
        }

        if (leaveCoverageStart && leaveCoverageEnd && new Date(leaveCoverageStart) > new Date(leaveCoverageEnd)) {
            showToast("Leave coverage start date cannot be after end date.", "error");
            return;
        }

        onSubmit({
            id: id || crypto.randomUUID(),
            name: name.trim(),
            leaveAllowance,
            isTechnician,
            leaveCoverageStart: leaveCoverageStart || undefined,
            leaveCoverageEnd: leaveCoverageEnd || undefined,
            idNumber: idNumber.trim() || undefined,
            positionTitle: positionTitle.trim() || undefined,
            positionClassification: positionClassification.trim() || undefined,
            department: department.trim() || undefined,
            section: section.trim() || undefined,
            latestScore: initialData?.latestScore // Preserve latest score if editing
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={id ? "Edit Employee" : "Add Employee"} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                <div className="border-b border-gray-700 pb-3 mb-3">
                    <h4 className="text-md font-semibold text-gray-200 mb-2">Main Application Details</h4>
                    <div>
                        <label htmlFor="employee-name" className="block mb-1 text-sm font-medium text-gray-300">Full Name <span className="text-red-400">*</span></label>
                        <input type="text" id="employee-name" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                            <label htmlFor="employee-leave-allowance" className="block mb-1 text-sm font-medium text-gray-300">Annual Leave Allowance (Hours)</label>
                            <input type="number" id="employee-leave-allowance" value={leaveAllowance} onChange={e => setLeaveAllowance(parseInt(e.target.value) || 0)} min="0" className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" />
                        </div>
                        <div>
                            <label className="flex items-center text-gray-300 mt-7">
                                <input type="checkbox" id="employee-is-technician" checked={isTechnician} onChange={e => setIsTechnician(e.target.checked)} className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded mr-2" />
                                Service Desk Technician
                            </label>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                            <label htmlFor="employee-leave-coverage-start" className="block mb-1 text-sm font-medium text-gray-300">Leave Coverage Start</label>
                            <input type="date" id="employee-leave-coverage-start" value={leaveCoverageStart} onChange={e => setLeaveCoverageStart(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" />
                        </div>
                        <div>
                            <label htmlFor="employee-leave-coverage-end" className="block mb-1 text-sm font-medium text-gray-300">Leave Coverage End</label>
                            <input type="date" id="employee-leave-coverage-end" value={leaveCoverageEnd} onChange={e => setLeaveCoverageEnd(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" />
                        </div>
                    </div>
                </div>

                <div className="border-b border-gray-700 pb-3 mb-3">
                    <h4 className="text-md font-semibold text-gray-200 mb-2">Performance Scorecard Details (Optional)</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="employee-idNumber" className="block mb-1 text-sm font-medium text-gray-300">Employee ID Number</label>
                            <input type="text" id="employee-idNumber" value={idNumber} onChange={e => setIdNumber(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" />
                        </div>
                        <div>
                            <label htmlFor="employee-posTitle" className="block mb-1 text-sm font-medium text-gray-300">Position Title</label>
                            <input type="text" id="employee-posTitle" value={positionTitle} onChange={e => setPositionTitle(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                            <label htmlFor="employee-posClass" className="block mb-1 text-sm font-medium text-gray-300">Position Classification</label>
                            <input type="text" id="employee-posClass" value={positionClassification} onChange={e => setPositionClassification(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" />
                        </div>
                        <div>
                            <label htmlFor="employee-dept" className="block mb-1 text-sm font-medium text-gray-300">Department</label>
                            <input type="text" id="employee-dept" value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" />
                        </div>
                     </div>
                     <div className="mt-3">
                        <label htmlFor="employee-section" className="block mb-1 text-sm font-medium text-gray-300">Section</label>
                        <input type="text" id="employee-section" value={section} onChange={e => setSection(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" />
                    </div>
                     <p className="text-xs text-gray-400 mt-2">Filling in 'Department' makes this employee available for Performance Scorecards.</p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-3">
                    <button type="button" onClick={onClose} className="btn-secondary py-2 px-4 rounded-md">Cancel</button>
                    <button type="submit" className="btn-primary py-2 px-4 rounded-md">Save Employee</button>
                </div>
            </form>
        </Modal>
    );
};


const EmployeesTab: React.FC<EmployeesTabProps> = ({ 
    employees, setEmployees, 
    setMeetings, setTickets, 
    setScoreHistoryPerf, 
    confirmDelete, showToast 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig<Employee>>({ key: 'name', direction: 'asc' });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const processedEmployees = useMemo(() => {
    let filtered = [...employees].filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.department && e.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.positionTitle && e.positionTitle.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];
        
        // Handle undefined or null for robust sorting, treating them as "lesser"
        if (valA == null && valB != null) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA != null && valB == null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (valA == null && valB == null) return 0;

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
           return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        if (typeof valA === 'boolean' && typeof valB === 'boolean') {
           return sortConfig.direction === 'asc' ? (valA === valB ? 0 : valA ? -1 : 1) : (valA === valB ? 0 : valA ? 1 : -1) ;
        }
        return 0;
      });
    }
    return filtered;
  }, [employees, searchTerm, sortConfig]);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedEmployees.slice(startIndex, startIndex + itemsPerPage);
  }, [processedEmployees, currentPage, itemsPerPage]);

  const employeeTableFooter = useMemo(() => {
    return { totalCount: processedEmployees.length };
  }, [processedEmployees]);


  const handleEmployeeSubmit = (data: Employee) => {
    if (editingEmployee) {
      setEmployees(prev => prev.map(e => e.id === data.id ? data : e));
      showToast("Employee updated successfully!", "success");
    } else {
      setEmployees(prev => [...prev, data]);
      showToast("Employee added successfully!", "success");
    }
    setEditingEmployee(null);
  };
  
  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };
  
  const openNewModal = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  }

  const handleDeleteEmployee = (id: string) => {
    confirmDelete(
        "Are you sure you want to delete this employee? This will also remove them from all meeting attendance, ticket assignments, and performance scorecard history.", 
        () => {
            setEmployees(prev => prev.filter(e => e.id !== id));
            setMeetings(prevMeetings => prevMeetings.map(meeting => ({
                ...meeting,
                attendance: meeting.attendance.filter(att => att.employeeId !== id)
            })));
            setTickets(prevTickets => prevTickets.map(ticket => 
                ticket.technicianId === id ? {...ticket, technicianId: '', technicianName: 'Unassigned'} : ticket
            ));
            setScoreHistoryPerf(prevHistory => prevHistory.filter(record => record.employeeId !== id));
            showToast("Employee deleted.", "success");
        }
    );
  };

  const handleSort = (key: keyof Employee) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page on sort
  };
  
  useEffect(() => {
    setCurrentPage(1); // Reset to first page on search term change
  }, [searchTerm]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Employee Management</h2>
        <button onClick={openNewModal} className="btn-primary py-2 px-4 rounded-md flex items-center">
          <i className="fas fa-plus mr-2"></i>Add Employee
        </button>
      </div>
      <input 
        type="text" 
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder="Search employees by name, department, position..." 
        className="w-full p-2 mb-4 bg-gray-700 rounded-md border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="overflow-x-auto bg-gray-800 rounded-lg shadow">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="bg-gray-700 text-xs uppercase text-gray-400">
            <tr>
              <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Department" sortKey="department" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Position Title" sortKey="positionTitle" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Is Technician?" sortKey="isTechnician" sortConfig={sortConfig} onSort={handleSort} textCenter />
              <SortableHeader label="Leave Allowance (Hrs)" sortKey="leaveAllowance" sortConfig={sortConfig} onSort={handleSort} textCenter/>
              <SortableHeader label="Latest Score" sortKey="latestScore" sortConfig={sortConfig} onSort={handleSort} textCenter/>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.map(emp => (
              <tr key={emp.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                <td className="p-3 whitespace-nowrap">{emp.name}</td>
                <td className="p-3 whitespace-nowrap">{emp.department || 'N/A'}</td>
                <td className="p-3 whitespace-nowrap">{emp.positionTitle || 'N/A'}</td>
                <td className="p-3 text-center">{emp.isTechnician ? <i className="fas fa-check-circle text-green-400"></i> : <i className="fas fa-times-circle text-red-400"></i>}</td>
                <td className="p-3 text-center">{emp.leaveAllowance}</td>
                <td className="p-3 text-center">{emp.latestScore !== null && emp.latestScore !== undefined ? emp.latestScore.toFixed(2) : 'N/A'}</td>
                <td className="p-3 space-x-2 whitespace-nowrap">
                  <button onClick={() => openEditModal(emp)} className="text-blue-400 hover:text-blue-300" title="Edit Employee"><i className="fas fa-edit"></i></button>
                  <button onClick={() => handleDeleteEmployee(emp.id)} className="text-red-400 hover:text-red-300" title="Delete Employee"><i className="fas fa-trash"></i></button>
                </td>
              </tr>
            ))}
             {paginatedEmployees.length === 0 && (
                <tr>
                    <td colSpan={7} className="text-center p-4 text-gray-400">No employees found.</td>
                </tr>
            )}
          </tbody>
           {processedEmployees.length > 0 && (
            <tfoot className="bg-gray-700 font-semibold text-gray-300">
                <tr>
                    <td className="p-3" colSpan={7}>Total Employees: {employeeTableFooter.totalCount}</td>
                </tr>
            </tfoot>
           )}
        </table>
        <PaginationControls
            totalItems={processedEmployees.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            idPrefix="employee-list"
        />
      </div>
      <EmployeeForm 
        isOpen={isModalOpen} 
        onClose={() => {setIsModalOpen(false); setEditingEmployee(null);}}
        onSubmit={handleEmployeeSubmit}
        initialData={editingEmployee}
        existingEmployees={employees}
        showToast={showToast}
      />
    </div>
  );
};

export default EmployeesTab;
