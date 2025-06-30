
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Employee, 
  ScorecardRecord, ScorecardMetric, ScorecardKpi, ScorecardBranding, KpiTargetLevel,
  AppSettings, SortConfig, ChartDataItem
} from '../types';
import {
  DEFAULT_SCORECARD_KPI_CONFIG, SCORECARD_TARGET_LEVELS, SCORE_INTERPRETATIONS,
  SCORECARD_APPRAISAL_TYPES, LOCAL_STORAGE_KEYS_PERF_SCORECARD, CHART_TYPE_OPTIONS
} from '../constants';
import Modal from '../components/Modal';
// ScorecardFormModal is removed
import SortableHeader from '../components/SortableHeader';
import PaginationControls from '../components/PaginationControls';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';

declare global {
  interface Window {
    jspdf: any; // For accessing the jsPDF constructor, e.g., window.jspdf.jsPDF
  }
}

interface PerformanceScorecardTabProps {
  employees: Employee[]; 
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>; 
  scoreHistory_perf: ScorecardRecord[];
  setScoreHistoryPerf: React.Dispatch<React.SetStateAction<ScorecardRecord[]>>;
  branding_perf: ScorecardBranding;
  setBrandingPerf: React.Dispatch<React.SetStateAction<ScorecardBranding>>;
  confirmDelete: (message: string, onConfirm: () => void) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  settings: AppSettings;
}

type SubTab = 'scorecard' | 'dashboard'; 
type ScoreHistoryDisplayItem = ScorecardRecord & { employeeName?: string }; 

const PerformanceScorecardTab: React.FC<PerformanceScorecardTabProps> = ({
  employees, setEmployees, 
  scoreHistory_perf, setScoreHistoryPerf,
  branding_perf, setBrandingPerf,
  confirmDelete, showToast, settings
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('scorecard');
  
  // Scorecard Form State (now directly in this component)
  const [currentKpiConfig, setCurrentKpiConfig] = useState<ScorecardMetric[]>(() => {
    const savedConfig = localStorage.getItem(LOCAL_STORAGE_KEYS_PERF_SCORECARD.kpiConfig);
    try {
        return savedConfig ? JSON.parse(savedConfig) : JSON.parse(JSON.stringify(DEFAULT_SCORECARD_KPI_CONFIG));
    } catch (e) {
        console.error("Failed to parse saved KPI config:", e);
        return JSON.parse(JSON.stringify(DEFAULT_SCORECARD_KPI_CONFIG));
    }
  });
  const [selectedEmployeeIdForm, setSelectedEmployeeIdForm] = useState<string>('');
  const [appraisalPeriod, setAppraisalPeriod] = useState('');
  const [appraisalType, setAppraisalType] = useState(SCORECARD_APPRAISAL_TYPES[0]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [finalScore, setFinalScore] = useState(0);
  const [interpretation, setInterpretation] = useState(SCORE_INTERPRETATIONS[SCORE_INTERPRETATIONS.length - 1]);
  const [editingScoreRecordId, setEditingScoreRecordId] = useState<string | null>(null);
  const [totalMetricWeightWarning, setTotalMetricWeightWarning] = useState<string>('');
  const [activeMetricCategoryId, setActiveMetricCategoryId] = useState<string>('');
  
  // Score History State
  const [isScoreDetailModalOpen, setIsScoreDetailModalOpen] = useState(false);
  const [selectedScoreDetail, setSelectedScoreDetail] = useState<ScorecardRecord | null>(null);
  const [scoreHistorySortConfig, setScoreHistorySortConfig] = useState<SortConfig<ScoreHistoryDisplayItem>>({ key: 'timestamp', direction: 'desc'});
  const [scoreHistoryCurrentPage, setScoreHistoryCurrentPage] = useState(1);
  const [scoreHistoryItemsPerPage, setScoreHistoryItemsPerPage] = useState(10);
  const [scoreHistoryEmployeeFilter, setScoreHistoryEmployeeFilter] = useState<string>('');
  const [scoreHistoryDateFromFilter, setScoreHistoryDateFromFilter] = useState<string>('');
  const [scoreHistoryDateToFilter, setScoreHistoryDateToFilter] = useState<string>('');

  // Dashboard State
  const [dashboardEmployeeFilter, setDashboardEmployeeFilter] = useState('all');
  const [dashboardDateFromFilter, setDashboardDateFromFilter] = useState('');
  const [dashboardDateToFilter, setDashboardDateToFilter] = useState('');

  const employeesForScorecard = useMemo(() => {
    return employees.filter(emp => emp.department && emp.department.trim() !== '');
  }, [employees]);

  useEffect(() => {
    if (employeesForScorecard.length > 0 && !selectedEmployeeIdForm && !editingScoreRecordId) {
        setSelectedEmployeeIdForm(employeesForScorecard[0].id);
    }
  }, [employeesForScorecard, selectedEmployeeIdForm, editingScoreRecordId]);
  
  useEffect(() => {
    if (currentKpiConfig.length > 0 && !activeMetricCategoryId) {
      setActiveMetricCategoryId(currentKpiConfig[0].id);
    } else if (currentKpiConfig.length > 0 && !currentKpiConfig.find(m => m.id === activeMetricCategoryId)) {
      setActiveMetricCategoryId(currentKpiConfig[0].id);
    } else if (currentKpiConfig.length === 0) {
      setActiveMetricCategoryId('');
    }
  }, [currentKpiConfig, activeMetricCategoryId]);


  const getInterpretationDetails = (score: number) => {
    for (const interp of SCORE_INTERPRETATIONS) {
        if (score >= interp.minScore) return interp;
    }
    return SCORE_INTERPRETATIONS[SCORE_INTERPRETATIONS.length - 1];
  };

  const calculateDerivedScores = (config: ScorecardMetric[]): { updatedConfig: ScorecardMetric[], derivedScoresChanged: boolean, finalScore: number, totalMetricWeight: number } => {
    let grandTotalFinalScore = 0;
    let totalOverallMetricWeight = 0;
    let derivedScoresChanged = false;

    const newUpdatedConfig = config.map(metric => {
        let metricTotalScore = 0;
        const currentMetric = currentKpiConfig.find(m => m.id === metric.id);

        const updatedKpis = metric.kpis.map(kpi => {
            let kpiScore = 1; // Default to Poor
            const actual = Number(kpi.actual) || 0;
            const targets = kpi.targets;

            if (kpi.scoringDirection === 'higher-is-better') {
                if (actual >= (Number(targets.exceptional) || 0)) kpiScore = 5;
                else if (actual >= (Number(targets.exceeds) || 0)) kpiScore = 4;
                else if (actual >= (Number(targets.meets) || 0)) kpiScore = 3;
                else if (actual >= (Number(targets.needsImprovement) || 0)) kpiScore = 2;
            } else { // lower-is-better
                if (actual <= (Number(targets.exceptional) || Infinity)) kpiScore = 5;
                else if (actual <= (Number(targets.exceeds) || Infinity)) kpiScore = 4;
                else if (actual <= (Number(targets.meets) || Infinity)) kpiScore = 3;
                else if (actual <= (Number(targets.needsImprovement) || Infinity)) kpiScore = 2;
            }
            
            if (kpi.calculatedScore !== kpiScore) {
                derivedScoresChanged = true;
            }
            metricTotalScore += kpiScore * (Number(kpi.weight || 0) / 100);
            return { ...kpi, actual: Number(kpi.actual) || 0, weight: Number(kpi.weight) || 0, targets: { ...kpi.targets }, calculatedScore: kpiScore };
        });

        const metricWeight = Number(metric.weight) || 0;
        totalOverallMetricWeight += metricWeight;
        grandTotalFinalScore += metricTotalScore * (metricWeight / 100);

        if (currentMetric && (currentMetric.metricScore !== metricTotalScore || currentMetric.weight !== metricWeight)) {
            derivedScoresChanged = true;
        }
        return { ...metric, weight: metricWeight, kpis: updatedKpis, metricScore: metricTotalScore };
    });
    return { updatedConfig: newUpdatedConfig, derivedScoresChanged, finalScore: grandTotalFinalScore, totalMetricWeight: totalOverallMetricWeight };
  };

  const simpleDebounce = <T extends (...args: any[]) => void>(func: T, delay: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
  };

  const debouncedSetFinalScoreAndInterpretation = useCallback(simpleDebounce((score: number, weight: number) => {
    setFinalScore(score);
    setInterpretation(getInterpretationDetails(score));
    if (Math.round(weight) !== 100) {
        setTotalMetricWeightWarning(`Warning: Overall metric weights sum to ${weight}%, should be 100%.`);
    } else {
        setTotalMetricWeightWarning('');
    }
  }, 500), []);


  const debouncedSaveKpiConfigToLocalStorage = useCallback(simpleDebounce((config: ScorecardMetric[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEYS_PERF_SCORECARD.kpiConfig, JSON.stringify(config));
  }, 1000), []);


  useEffect(() => {
    const { updatedConfig, derivedScoresChanged, finalScore: calculatedFinalScore, totalMetricWeight } = calculateDerivedScores(currentKpiConfig);
    if (derivedScoresChanged) {
        setCurrentKpiConfig(updatedConfig);
    }
    debouncedSetFinalScoreAndInterpretation(calculatedFinalScore, totalMetricWeight);
    debouncedSaveKpiConfigToLocalStorage(updatedConfig); // Save the most up-to-date config
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKpiConfig]); // Only re-run if the base currentKpiConfig changes from user input. Debounced functions have their own deps.

  const handleMetricWeightChange = (metricId: string, weight: number) => {
    setCurrentKpiConfig(prev => prev.map(m => m.id === metricId ? {...m, weight: isNaN(weight) ? 0 : weight} : m));
  };

  const handleKpiChange = (metricId: string, kpiId: string, field: keyof ScorecardKpi, value: any) => {
    let processedValue = value;
    if (field === 'actual' || field === 'weight') {
        processedValue = parseFloat(value);
        if (isNaN(processedValue)) processedValue = 0;
    }
     if (field === 'weight' && (processedValue < 0 || processedValue > 100)) return;


    setCurrentKpiConfig(prev => prev.map(m => {
        if (m.id === metricId) {
            return {
                ...m,
                kpis: m.kpis.map(k => k.id === kpiId ? {...k, [field]: processedValue} : k)
            };
        }
        return m;
    }));
  };
  
  const handleKpiTargetChange = (metricId: string, kpiId: string, targetLevel: KpiTargetLevel, value: number) => {
    const processedValue = isNaN(value) ? 0 : value;
    setCurrentKpiConfig(prev => prev.map(m => {
        if (m.id === metricId) {
            return {
                ...m,
                kpis: m.kpis.map(k => {
                    if (k.id === kpiId) {
                        return {...k, targets: {...k.targets, [targetLevel]: processedValue}};
                    }
                    return k;
                })
            };
        }
        return m;
    }));
  };

  const addKpiToMetric = (metricId: string) => {
    const newKpi: ScorecardKpi = {
        id: crypto.randomUUID(), name: 'New KPI', weight: 100, actual: 0, 
        scoringDirection: 'higher-is-better', 
        targets: {poor: 0, needsImprovement: 0, meets: 0, exceeds: 0, exceptional: 0}
    };
    setCurrentKpiConfig(prev => prev.map(m => m.id === metricId ? {...m, kpis: [...m.kpis, newKpi]} : m));
  };
  
  const removeKpiFromMetric = (metricId: string, kpiId: string) => {
    confirmDelete("Are you sure you want to remove this KPI?", () => {
        setCurrentKpiConfig(prev => prev.map(m => m.id === metricId ? {...m, kpis: m.kpis.filter(k => k.id !== kpiId)} : m));
        showToast("KPI removed.", "success");
    });
  };

  const resetScorecardFormState = (useDefaults = false) => {
    if (useDefaults) {
        setCurrentKpiConfig(JSON.parse(JSON.stringify(DEFAULT_SCORECARD_KPI_CONFIG)));
        localStorage.removeItem(LOCAL_STORAGE_KEYS_PERF_SCORECARD.kpiConfig);
        showToast("Scorecard form reset to default KPIs.", "success");
    }
    // For non-default reset, currentKpiConfig is already managed by user edits.
    // Reset other form fields
    setSelectedEmployeeIdForm(employeesForScorecard.length > 0 ? employeesForScorecard[0].id : '');
    setAppraisalPeriod('');
    setAppraisalType(SCORECARD_APPRAISAL_TYPES[0]);
    setDateFrom('');
    setDateTo('');
    setEditingScoreRecordId(null);
  };
  
  const handleSaveScore = () => {
    if (!selectedEmployeeIdForm) {
      showToast("Please select an employee.", "error");
      return;
    }
    if (totalMetricWeightWarning) {
        confirmDelete(totalMetricWeightWarning + " Are you sure you want to save with these weights?", () => proceedSaveScore());
    } else {
        proceedSaveScore();
    }
  };

  const proceedSaveScore = () => {
    const interpDetails = getInterpretationDetails(finalScore);
    const record: ScorecardRecord = {
        id: editingScoreRecordId || crypto.randomUUID(),
        employeeId: selectedEmployeeIdForm,
        appraisalPeriod,
        appraisalType,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        finalScore,
        interpretation: interpDetails.text,
        interpretationColorClass: interpDetails.colorClass,
        interpretationBadgeBgClass: interpDetails.badgeBgClass,
        interpretationBadgeTextClass: interpDetails.badgeTextClass,
        timestamp: new Date().toISOString(),
        metrics: JSON.parse(JSON.stringify(currentKpiConfig)) // Deep copy
    };

    if (editingScoreRecordId) {
        setScoreHistoryPerf(prev => prev.map(r => r.id === editingScoreRecordId ? record : r));
    } else {
        setScoreHistoryPerf(prev => [...prev, record]);
    }
    
    setEmployees(prevEmps => prevEmps.map(emp => 
        emp.id === selectedEmployeeIdForm ? { ...emp, latestScore: finalScore } : emp
    ));

    showToast(`Score record ${editingScoreRecordId ? 'updated' : 'saved'}!`, "success");
    resetScorecardFormState(false); 
  };

  const handleEditScoreRecord = (recordId: string) => {
    const record = scoreHistory_perf.find(r => r.id === recordId);
    if (record) {
        setSelectedEmployeeIdForm(record.employeeId);
        setAppraisalPeriod(record.appraisalPeriod);
        setAppraisalType(record.appraisalType);
        setDateFrom(record.dateFrom || '');
        setDateTo(record.dateTo || '');
        setCurrentKpiConfig(JSON.parse(JSON.stringify(record.metrics))); 
        setEditingScoreRecordId(recordId);
        setActiveSubTab('scorecard'); // Switch to scorecard entry tab
        window.scrollTo(0, 0); // Scroll to top
    }
  };
  
  const handleDeleteScoreRecord = (recordId: string) => {
    confirmDelete("Permanently delete this score record?", () => {
        setScoreHistoryPerf(prev => prev.filter(r => r.id !== recordId));
        showToast("Score record deleted.", "success");
    });
  };

   const paginatedScoreHistory = useMemo(() => {
    let filteredRecords = [...scoreHistory_perf];

    if (scoreHistoryEmployeeFilter) {
        filteredRecords = filteredRecords.filter(r => r.employeeId === scoreHistoryEmployeeFilter);
    }
    if (scoreHistoryDateFromFilter) {
        const fromDate = new Date(scoreHistoryDateFromFilter);
        fromDate.setHours(0,0,0,0);
        filteredRecords = filteredRecords.filter(r => new Date(r.timestamp) >= fromDate);
    }
    if (scoreHistoryDateToFilter) {
        const toDate = new Date(scoreHistoryDateToFilter);
        toDate.setHours(23,59,59,999);
        filteredRecords = filteredRecords.filter(r => new Date(r.timestamp) <= toDate);
    }
    
    let sorted: ScoreHistoryDisplayItem[] = filteredRecords.map(r => ({
        ...r, 
        employeeName: employees.find(e => e.id === r.employeeId)?.name || 'Unknown Employee'
    }));

    if (scoreHistorySortConfig.key) {
        sorted.sort((a,b) => {
            const valA = a[scoreHistorySortConfig.key! as keyof ScoreHistoryDisplayItem];
            const valB = b[scoreHistorySortConfig.key! as keyof ScoreHistoryDisplayItem];
            if (scoreHistorySortConfig.key === 'timestamp' || scoreHistorySortConfig.key === 'dateFrom' || scoreHistorySortConfig.key === 'dateTo') {
                const timeA = valA ? new Date(valA as string).getTime() : 0;
                const timeB = valB ? new Date(valB as string).getTime() : 0;
                return scoreHistorySortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
            }
            if (typeof valA === 'string' && typeof valB === 'string') {
                 return scoreHistorySortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return scoreHistorySortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
            return 0;
        });
    }
    const startIndex = (scoreHistoryCurrentPage - 1) * scoreHistoryItemsPerPage;
    return sorted.slice(startIndex, startIndex + scoreHistoryItemsPerPage);
  }, [scoreHistory_perf, employees, scoreHistorySortConfig, scoreHistoryCurrentPage, scoreHistoryItemsPerPage, scoreHistoryEmployeeFilter, scoreHistoryDateFromFilter, scoreHistoryDateToFilter]);
  
  const totalScoreHistoryItems = useMemo(() => {
     let filteredRecords = [...scoreHistory_perf];
    if (scoreHistoryEmployeeFilter) {
        filteredRecords = filteredRecords.filter(r => r.employeeId === scoreHistoryEmployeeFilter);
    }
    if (scoreHistoryDateFromFilter) {
        const fromDate = new Date(scoreHistoryDateFromFilter); fromDate.setHours(0,0,0,0);
        filteredRecords = filteredRecords.filter(r => new Date(r.timestamp) >= fromDate);
    }
    if (scoreHistoryDateToFilter) {
        const toDate = new Date(scoreHistoryDateToFilter); toDate.setHours(23,59,59,999);
        filteredRecords = filteredRecords.filter(r => new Date(r.timestamp) <= toDate);
    }
    return filteredRecords.length;
  },[scoreHistory_perf, scoreHistoryEmployeeFilter, scoreHistoryDateFromFilter, scoreHistoryDateToFilter]);


  const handleScoreHistorySort = (key: keyof ScoreHistoryDisplayItem) => {
     setScoreHistorySortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setScoreHistoryCurrentPage(1);
  };

  const clearScoreHistoryFilters = () => {
    setScoreHistoryEmployeeFilter('');
    setScoreHistoryDateFromFilter('');
    setScoreHistoryDateToFilter('');
    setScoreHistoryCurrentPage(1);
  };

  useEffect(() => {
    setScoreHistoryCurrentPage(1);
  }, [scoreHistoryEmployeeFilter, scoreHistoryDateFromFilter, scoreHistoryDateToFilter]);


  const downloadPdf = (recordId: string) => {
    const record = scoreHistory_perf.find(r => r.id === recordId);
    if (!record || !window.jspdf || !window.jspdf.jsPDF) {
        showToast("Error: PDF library not loaded or record not found.", "error");
        return;
    }
    const jsPDF = window.jspdf.jsPDF; // Get constructor from window.jspdf
    const doc = new jsPDF();

    const employee = employees.find(e => e.id === record.employeeId); 
    const logoBase64 = branding_perf.logoBase64;
    const pdfFooterText = branding_perf.footerText;

    let yPos = 15;
    if (logoBase64) {
      try {
        const imgProps = doc.getImageProperties(logoBase64);
        const imgWidth = 40;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        doc.addImage(logoBase64, 'PNG', 15, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 5; 
      } catch (e) {
        console.error("Error adding image to PDF: ", e);
        showToast("Error adding logo to PDF. It might be corrupted.", "error");
      }
    }
    
    doc.setFontSize(18);
    doc.text("Performance Scorecard", doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(11);
    doc.text(`Employee: ${employee?.name || 'N/A'}`, 14, yPos);
    yPos += 6;
    doc.text(`Position: ${employee?.positionTitle || 'N/A'}`, 14, yPos);
    yPos += 6;
    doc.text(`Department: ${employee?.department || 'N/A'}`, 14, yPos);
    
    doc.text(`Appraisal Period: ${record.appraisalPeriod} (${record.appraisalType})`, 105, yPos - 12);
    doc.text(`Date Coverage: ${record.dateFrom || ''} to ${record.dateTo || ''}`, 105, yPos - 6);
    yPos += 6;
    
    doc.setFontSize(12);
    doc.text("Final Score:", 14, yPos);
    doc.setFontSize(16).setFont(undefined, 'bold');
    doc.text(`${record.finalScore.toFixed(2)} - ${record.interpretation}`, 40, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 12;

    const body: any[] = [];
    record.metrics.forEach(metric => {
        body.push([{ content: `${metric.title} (Weight: ${metric.weight}%)`, colSpan: 4, styles: { fontStyle: 'bold', fillColor: '#dee2e6', textColor: '#212529'} }]);
         metric.kpis.forEach(kpi => {
            body.push([ kpi.name, kpi.actual, kpi.weight + '%', kpi.calculatedScore ]);
        });
    });

    if (typeof (doc as any).autoTable === 'function') {
        (doc as any).autoTable({ 
            startY: yPos, 
            head: [['KPI', 'Actual', 'Weight', 'Score (1-5)']], 
            body: body, 
            theme: 'striped', 
            headStyles: { fillColor: '#007bff', textColor: '#ffffff' },
            didDrawPage: (data: any) => {
                if (pdfFooterText) { 
                    doc.setFontSize(9); 
                    doc.setTextColor(100);
                    doc.text(pdfFooterText, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10); 
                }
            }
        });
    } else {
         console.error("jsPDF.autoTable is not a function. Ensure jspdf-autotable plugin is loaded correctly.");
         showToast("PDF AutoTable function not found. Cannot generate table.", "error");
    }

    doc.save(`Scorecard-${employee?.name?.replace(/\s/g, '_') || 'Employee'}-${record.dateTo || 'record'}.pdf`);
    showToast("PDF Downloaded", "success");
  };

  const filteredScoreHistoryForDashboard = useMemo(() => {
    return scoreHistory_perf.filter(record => {
        const recordDate = new Date(record.timestamp);
        const employeeMatch = dashboardEmployeeFilter === 'all' || record.employeeId === dashboardEmployeeFilter;
        const fromDateMatch = !dashboardDateFromFilter || recordDate >= new Date(new Date(dashboardDateFromFilter).setHours(0,0,0,0));
        const toDateMatch = !dashboardDateToFilter || recordDate <= new Date(new Date(dashboardDateToFilter).setHours(23,59,59,999));
        return employeeMatch && fromDateMatch && toDateMatch;
    }).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [scoreHistory_perf, dashboardEmployeeFilter, dashboardDateFromFilter, dashboardDateToFilter]);

  const performanceComparisonData: ChartDataItem[] = useMemo(() => {
     return filteredScoreHistoryForDashboard.map(r => ({
        name: `${employees.find(e => e.id === r.employeeId)?.name?.split(' ')[0]} (${new Date(r.timestamp).toLocaleDateString('en-CA')})`,
        value: r.finalScore
     }));
  }, [filteredScoreHistoryForDashboard, employees]);

  const performanceOverTimeData: ChartDataItem[] = useMemo(() => {
    if (dashboardEmployeeFilter === 'all' || filteredScoreHistoryForDashboard.length === 0) return [];
    return filteredScoreHistoryForDashboard
      .filter(r => r.employeeId === dashboardEmployeeFilter)
      .map(r => ({
        name: new Date(r.timestamp).toLocaleDateString('en-CA'),
        value: r.finalScore
      }));
  }, [filteredScoreHistoryForDashboard, dashboardEmployeeFilter]);

  const metricBreakdownData: ChartDataItem[] = useMemo(() => {
    if (dashboardEmployeeFilter === 'all' || filteredScoreHistoryForDashboard.length === 0) return [];
    const latestRecordForEmployee = filteredScoreHistoryForDashboard
        .filter(r => r.employeeId === dashboardEmployeeFilter)
        .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (!latestRecordForEmployee) return [];

    return latestRecordForEmployee.metrics.map(m => ({
        name: m.title,
        value: parseFloat(((m.metricScore || 0) * (Number(m.weight || 0) / 100)).toFixed(2))
    }));
  }, [filteredScoreHistoryForDashboard, dashboardEmployeeFilter]);
  
  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-700 p-2 rounded shadow-lg border border-gray-600 text-sm">
          <p className="font-semibold text-gray-100">{label || payload[0]?.payload?.name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color || entry.fill }} className="text-gray-200">
              {`${entry.name}: ${entry.value.toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case 'scorecard':
        const activeMetricForTable = currentKpiConfig.find(m => m.id === activeMetricCategoryId);
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-100 mt-2 mb-3">
              {editingScoreRecordId ? "Edit Performance Scorecard" : "Create New Performance Scorecard"}
            </h3>
            {/* Employee and Appraisal Period Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-800/70 rounded-lg shadow">
              <div>
                <label htmlFor="perf-employee-select-inline" className="block text-sm font-medium text-gray-300 mb-1">Select Employee</label>
                <select id="perf-employee-select-inline" value={selectedEmployeeIdForm} onChange={e => setSelectedEmployeeIdForm(e.target.value)} className="input-field-dark w-full">
                    <option value="">-- Select Employee --</option>
                    {employeesForScorecard.map(e => <option key={e.id} value={e.id}>{e.name} ({e.positionTitle || e.department})</option>)}
                </select>
                {employeesForScorecard.length === 0 && <p className="text-xs text-yellow-400 mt-1">No employees with a department found. Add/edit employees in the main Employees tab.</p>}
              </div>
              <div className="border-t md:border-t-0 md:border-l border-gray-700 pl-0 md:pl-6 pt-4 md:pt-0">
                <h4 className="text-md font-medium text-gray-200 mb-2">Performance Appraisal Period</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="perf-appraisal-period-inline" className="block text-sm font-medium text-gray-300 mb-1">Appraisal Period Name</label>
                        <input type="text" id="perf-appraisal-period-inline" value={appraisalPeriod} onChange={e => setAppraisalPeriod(e.target.value)} className="input-field-dark w-full" placeholder="e.g., Q1 2024, Annual 2023"/>
                    </div>
                    <div>
                        <label htmlFor="perf-appraisal-type-inline" className="block text-sm font-medium text-gray-300 mb-1">Appraisal Type</label>
                        <select id="perf-appraisal-type-inline" value={appraisalType} onChange={e => setAppraisalType(e.target.value)} className="input-field-dark w-full">
                            {SCORECARD_APPRAISAL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="perf-date-from-inline" className="block text-sm font-medium text-gray-300 mb-1">Date From</label>
                        <input type="date" id="perf-date-from-inline" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field-dark w-full"/>
                    </div>
                    <div>
                        <label htmlFor="perf-date-to-inline" className="block text-sm font-medium text-gray-300 mb-1">Date To</label>
                        <input type="date" id="perf-date-to-inline" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field-dark w-full"/>
                    </div>
                </div>
              </div>
            </div>

            {/* Metric Category Tabs */}
            <div className="border-b border-gray-700 mb-4">
                <nav className="-mb-px flex space-x-3 overflow-x-auto px-1" aria-label="Metric Categories">
                {currentKpiConfig.map(metric => (
                    <button
                    key={metric.id}
                    onClick={() => setActiveMetricCategoryId(metric.id)}
                    className={`whitespace-nowrap py-3 px-2.5 border-b-2 font-medium text-sm focus:outline-none rounded-t-md
                        ${activeMetricCategoryId === metric.id
                        ? 'border-primary-color text-primary-color bg-gray-800/50'
                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                        }`}
                    >
                    {metric.title}
                    </button>
                ))}
                </nav>
            </div>
            
            {/* Active Metric Category KPIs Table */}
            {activeMetricForTable && (
              <div key={activeMetricForTable.id} className="bg-gray-800/70 p-4 rounded-lg shadow">
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-3 pb-3 border-b border-gray-700">
                      <h4 className="text-lg font-semibold text-gray-100">{activeMetricForTable.title}</h4>
                      <div className="flex items-center gap-2 bg-gray-700 p-2 rounded-lg">
                          <label htmlFor={`metric-weight-${activeMetricForTable.id}-inline`} className="text-sm font-medium text-gray-300">Overall Weight (%)</label>
                          <input 
                              type="number" id={`metric-weight-${activeMetricForTable.id}-inline`} min="0" max="100" 
                              value={activeMetricForTable.weight} onChange={e => handleMetricWeightChange(activeMetricForTable.id, parseInt(e.target.value))}
                              className="input-field-dark w-20 text-center font-bold" 
                          />
                      </div>
                  </div>
                  <div className="bg-gray-700/60 p-3 rounded-lg text-center mb-4">
                      <span className="text-sm font-semibold text-primary-color">Total Weighted Metric Score (1-5 Scale): </span>
                      <span className="font-bold text-xl text-gray-100 ml-1">{(activeMetricForTable.metricScore || 0).toFixed(2)}</span>
                  </div>

                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-300">
                          <thead className="bg-gray-700/80 text-xs uppercase text-gray-400">
                              <tr>
                                  <th className="p-2 min-w-[150px]">KPI Name</th>
                                  <th className="p-2 text-center">Weight (%)</th>
                                  <th className="p-2 text-center">Actual</th>
                                  <th className="p-2 text-center min-w-[120px]">Direction</th>
                                  {SCORECARD_TARGET_LEVELS.map(level => (
                                      <th key={level} className="p-2 text-center min-w-[70px] capitalize">{level.replace(/([A-Z])/g, ' $1')}</th>
                                  ))}
                                  <th className="p-2 text-center">Score</th>
                                  <th className="p-2 text-center">Actions</th>
                              </tr>
                          </thead>
                          <tbody>
                              {activeMetricForTable.kpis.map(kpi => (
                                  <tr key={kpi.id} className="border-b border-gray-700 hover:bg-gray-700/30 align-top">
                                      <td className="p-1"><input type="text" value={kpi.name} onChange={e => handleKpiChange(activeMetricForTable.id, kpi.id, 'name', e.target.value)} className="input-field-dark w-full text-xs" /></td>
                                      <td className="p-1"><input type="number" min="0" max="100" value={kpi.weight} onChange={e => handleKpiChange(activeMetricForTable.id, kpi.id, 'weight', e.target.value)} className="input-field-dark w-16 text-center text-xs" /></td>
                                      <td className="p-1"><input type="number" value={kpi.actual} onChange={e => handleKpiChange(activeMetricForTable.id, kpi.id, 'actual', e.target.value)} className="input-field-dark w-20 text-center text-xs" /></td>
                                      <td className="p-1">
                                          <select value={kpi.scoringDirection} onChange={e => handleKpiChange(activeMetricForTable.id, kpi.id, 'scoringDirection', e.target.value)} className="input-field-dark w-full text-xs">
                                              <option value="higher-is-better">Higher is Better</option>
                                              <option value="lower-is-better">Lower is Better</option>
                                          </select>
                                      </td>
                                      {SCORECARD_TARGET_LEVELS.map(level => (
                                          <td key={level} className="p-1"><input type="number" value={kpi.targets[level]} onChange={e => handleKpiTargetChange(activeMetricForTable.id, kpi.id, level, parseFloat(e.target.value))} className="input-field-dark w-full text-center text-xs" /></td>
                                      ))}
                                      <td className="p-1 text-center font-bold text-primary-color pt-2.5">{kpi.calculatedScore || 1}</td>
                                      <td className="p-1 text-center pt-2">
                                          <button onClick={() => removeKpiFromMetric(activeMetricForTable.id, kpi.id)} className="btn-danger btn-sm p-1 text-xs" title="Remove KPI"><i className="fas fa-trash"></i></button>
                                      </td>
                                  </tr>
                              ))}
                              {activeMetricForTable.kpis.length === 0 && (
                                <tr><td colSpan={SCORECARD_TARGET_LEVELS.length + 5} className="text-center p-3 text-gray-400">No KPIs for this metric. Add one below.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
                  <button onClick={() => addKpiToMetric(activeMetricForTable.id)} className="btn-secondary btn-sm w-full mt-3 py-1.5 text-xs"><i className="fas fa-plus mr-1"></i>Add KPI to {activeMetricForTable.title}</button>
              </div>
            )}

            {currentKpiConfig.length === 0 && (
                <p className="text-center text-gray-400 py-6">No metric categories configured.</p>
            )}

            {totalMetricWeightWarning && (
                <div className="max-w-2xl mx-auto text-center p-3 mt-4 bg-red-800 text-red-100 border border-red-600 rounded-lg">
                    {totalMetricWeightWarning}
                </div>
            )}

            {/* Final Result Display */}
            <div className="bg-gray-800/70 p-6 rounded-lg shadow-inner mt-6">
                <h3 className="text-2xl font-bold text-gray-100 mb-4 text-center">Final Result</h3>
                <div className={`p-6 rounded-lg flex flex-col md:flex-row items-center justify-center text-center md:text-left md:space-x-8 space-y-4 md:space-y-0 bg-gray-700/80 border-l-4 ${interpretation.colorClass.replace('text-', 'border-')}`}>
                <div>
                    <p className={`text-lg ${interpretation.colorClass}`}>Total Final Score</p>
                    <p className={`text-5xl font-bold ${interpretation.colorClass}`}>{finalScore.toFixed(2)}</p>
                </div>
                <div className="w-px bg-gray-600 self-stretch hidden md:block"></div>
                <div>
                    <p className={`text-lg ${interpretation.colorClass}`}>Interpretation</p>
                    <div className="mt-1">
                    <span className={`inline-block px-4 py-2 rounded-full font-semibold text-lg ${interpretation.badgeBgClass} ${interpretation.badgeTextClass}`}>
                        {interpretation.text}
                    </span>
                    </div>
                </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 text-center space-x-3 flex justify-end items-center border-t border-gray-700 pt-4">
                <button 
                    onClick={() => {
                        confirmDelete("Restore default KPI structure? Current unsaved changes to KPIs will be lost.", () => {
                            resetScorecardFormState(true);
                        });
                    }} 
                    className="btn-secondary py-2 px-4 rounded-md"
                    title="Reset KPI structure to default"
                >
                    <i className="fas fa-sync-alt mr-2"></i>Reset KPIs
                </button>
                 {editingScoreRecordId && (
                     <button onClick={() => resetScorecardFormState(false) } className="btn-secondary py-2 px-4 rounded-md">
                        <i className="fas fa-times mr-2"></i>Cancel Edit
                    </button>
                 )}
                <button onClick={handleSaveScore} className="btn-primary py-2 px-4 rounded-md">
                    <i className="fas fa-save mr-2"></i>{editingScoreRecordId ? 'Update Score' : 'Save Final Result'}
                </button>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg shadow mt-8">
                <h3 className="text-xl font-semibold text-gray-100 mb-4">Score History</h3>
                <div className="bg-gray-900 p-3 rounded-md mb-4 flex flex-wrap items-center gap-3">
                    <h4 className="font-medium text-gray-200 mr-2">Filters:</h4>
                    <div>
                        <label htmlFor="sh-employee-filter-main" className="sr-only">Employee</label>
                        <select 
                            id="sh-employee-filter-main"
                            value={scoreHistoryEmployeeFilter}
                            onChange={(e) => setScoreHistoryEmployeeFilter(e.target.value)}
                            className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200 min-w-[180px]"
                        >
                            <option value="">All Employees</option>
                            {employeesForScorecard.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="sh-date-from-main" className="sr-only">Date From</label>
                        <input 
                            type="date" 
                            id="sh-date-from-main"
                            value={scoreHistoryDateFromFilter}
                            onChange={(e) => setScoreHistoryDateFromFilter(e.target.value)}
                            className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200"
                        />
                    </div>
                    <div>
                        <label htmlFor="sh-date-to-main" className="sr-only">Date To</label>
                        <input 
                            type="date" 
                            id="sh-date-to-main"
                            value={scoreHistoryDateToFilter}
                            onChange={(e) => setScoreHistoryDateToFilter(e.target.value)}
                            className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200"
                        />
                    </div>
                    <button onClick={clearScoreHistoryFilters} className="btn-secondary py-2 px-3 text-sm rounded-md">
                        Clear Filters
                    </button>
                </div>
                <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left text-gray-300">
                        <thead className="bg-gray-700 text-xs uppercase text-gray-400">
                            <tr>
                                <SortableHeader label="Date Saved" sortKey="timestamp" sortConfig={scoreHistorySortConfig} onSort={handleScoreHistorySort} />
                                <SortableHeader label="Employee" sortKey="employeeName" sortConfig={scoreHistorySortConfig} onSort={handleScoreHistorySort} />
                                <SortableHeader label="Appraisal Period" sortKey="appraisalPeriod" sortConfig={scoreHistorySortConfig} onSort={handleScoreHistorySort} />
                                <SortableHeader label="Score" sortKey="finalScore" sortConfig={scoreHistorySortConfig} onSort={handleScoreHistorySort} textCenter/>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {paginatedScoreHistory.map(rec => (
                                <tr key={rec.id} className="hover:bg-gray-700/50">
                                    <td className="p-3">{new Date(rec.timestamp).toLocaleDateString()}</td>
                                    <td className="p-3">{rec.employeeName}</td>
                                    <td className="p-3">{rec.appraisalPeriod} ({rec.appraisalType})</td>
                                    <td className="p-3 text-center">{rec.finalScore.toFixed(2)}</td>
                                    <td className="p-3 space-x-2">
                                        <button onClick={() => { setSelectedScoreDetail(rec); setIsScoreDetailModalOpen(true); }} className="text-gray-400 hover:text-gray-200" title="View Details"><i className="fas fa-eye"></i></button>
                                        <button onClick={() => handleEditScoreRecord(rec.id)} className="text-blue-400 hover:text-blue-300" title="Edit"><i className="fas fa-edit"></i></button>
                                        <button onClick={() => downloadPdf(rec.id)} className="text-green-400 hover:text-green-300" title="Download PDF"><i className="fas fa-file-pdf"></i></button>
                                        <button onClick={() => handleDeleteScoreRecord(rec.id)} className="text-red-400 hover:text-red-300" title="Delete"><i className="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            ))}
                            {paginatedScoreHistory.length === 0 && (
                                <tr><td colSpan={5} className="text-center p-4 text-gray-400">No score history found for current filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <PaginationControls 
                    totalItems={totalScoreHistoryItems} 
                    itemsPerPage={scoreHistoryItemsPerPage} 
                    currentPage={scoreHistoryCurrentPage}
                    onPageChange={setScoreHistoryCurrentPage}
                    onItemsPerPageChange={setScoreHistoryItemsPerPage}
                    idPrefix="perf-hist-main"
                />
            </div>
          </div>
        );
      case 'dashboard':
        const chartHeight = 350;
        const noDataPlaceholder = <p className="text-center text-gray-500 py-10">No data available for the selected filters.</p>;
        const selectEmployeePlaceholder = (chartName: string) => <p className="text-center text-gray-500 py-10">Select a single employee to see their {chartName}.</p>;
        
        return (
            <div className="space-y-6">
                <div className="bg-gray-800 p-4 rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-gray-100 mb-4">Dashboard Filters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="dash-employee-filter" className="block text-sm font-medium text-gray-300 mb-1">Employee</label>
                            <select id="dash-employee-filter" value={dashboardEmployeeFilter} onChange={e => setDashboardEmployeeFilter(e.target.value)} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200 w-full">
                                <option value="all">All Employees</option>
                                {employeesForScorecard.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="dash-date-from" className="block text-sm font-medium text-gray-300 mb-1">From</label>
                            <input type="date" id="dash-date-from" value={dashboardDateFromFilter} onChange={e => setDashboardDateFromFilter(e.target.value)} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200 w-full"/>
                        </div>
                        <div>
                            <label htmlFor="dash-date-to" className="block text-sm font-medium text-gray-300 mb-1">To</label>
                            <input type="date" id="dash-date-to" value={dashboardDateToFilter} onChange={e => setDashboardDateToFilter(e.target.value)} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200 w-full"/>
                        </div>
                    </div>
                </div>

                <div className={`grid grid-cols-1 ${settings.chartLayout === 'full-width' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6`}>
                    <div className="bg-gray-800 p-4 rounded-lg shadow" style={{height: `${chartHeight + 50}px`}}>
                        <h4 className="text-lg font-semibold text-gray-100 mb-3">Performance Comparison</h4>
                        {performanceComparisonData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={chartHeight}>
                                <BarChart data={performanceComparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                                    <XAxis dataKey="name" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" domain={[0, 5]}/>
                                    <Tooltip content={renderTooltip} />
                                    <Bar dataKey="value" name="Final Score" fill="var(--primary-color)" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : noDataPlaceholder }
                    </div>
                     <div className="bg-gray-800 p-4 rounded-lg shadow" style={{height: `${chartHeight + 50}px`}}>
                        <h4 className="text-lg font-semibold text-gray-100 mb-3">Performance Over Time</h4>
                        {dashboardEmployeeFilter === 'all' ? selectEmployeePlaceholder("performance trend") :
                         performanceOverTimeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={chartHeight}>
                                <LineChart data={performanceOverTimeData}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                                    <XAxis dataKey="name" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" domain={[0, 5]}/>
                                    <Tooltip content={renderTooltip}/>
                                    <Legend wrapperStyle={{color: '#e5e7eb'}}/>
                                    <Line type="monotone" dataKey="value" name="Score Trend" stroke="var(--primary-color)" activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : noDataPlaceholder }
                    </div>
                    <div className={`bg-gray-800 p-4 rounded-lg shadow ${settings.chartLayout === 'full-width' ? '' : 'lg:col-span-2'}`} style={{height: `${chartHeight + 50}px`}}>
                        <h4 className="text-lg font-semibold text-gray-100 mb-3">Metric Breakdown (Most Recent)</h4>
                         {dashboardEmployeeFilter === 'all' ? selectEmployeePlaceholder("metric breakdown") :
                          metricBreakdownData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={chartHeight}>
                                <PieChart>
                                    <Pie data={metricBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {metricBreakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_TYPE_OPTIONS[index % CHART_TYPE_OPTIONS.length].value === 'bar' ? '#8884d8' : index % 2 === 0 ? '#82ca9d' : '#ffc658'} />)}
                                    </Pie>
                                    <Tooltip content={renderTooltip}/>
                                    <Legend wrapperStyle={{color: '#e5e7eb'}}/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : noDataPlaceholder }
                    </div>
                </div>
            </div>
        );
      default: return null;
    }
  };

  const subNavItems: {id: SubTab, name: string, icon: string}[] = [
    {id: 'scorecard', name: 'Scorecard Entry & History', icon: 'fas fa-calculator'},
    {id: 'dashboard', name: 'Dashboard', icon: 'fas fa-chart-line'},
  ];

  return (
    <div className="text-gray-200">
      <style>{`
        .input-field-dark {
          background-color: #374151; /* gray-700 */
          border: 1px solid #4B5563; /* gray-600 */
          color: #D1D5DB; /* gray-300 */
          border-radius: 0.375rem; /* rounded-md */
          padding: 0.5rem 0.75rem; /* py-2 px-3 */
        }
        .input-field-dark:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px var(--primary-color-focus, rgba(59, 130, 246, 0.5));
        }
        .btn-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
        }
      `}</style>
      <div className="mb-6 border-b border-gray-700">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Performance Scorecard Tabs">
          {subNavItems.map(subTab => (
            <button
              key={subTab.id}
              onClick={() => setActiveSubTab(subTab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none
                ${activeSubTab === subTab.id
                  ? 'border-primary-color text-primary-color'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                }`}
            >
              <i className={`${subTab.icon} mr-2`}></i>{subTab.name}
            </button>
          ))}
        </nav>
      </div>
      
      {renderSubTabContent()}

      <Modal isOpen={isScoreDetailModalOpen} onClose={() => setIsScoreDetailModalOpen(false)} title="Score Details" size="lg">
        {selectedScoreDetail && (
          <div className="text-gray-300 max-h-[70vh] overflow-y-auto p-1">
            <div className="text-center mb-4">
                {branding_perf.logoBase64 && <img src={branding_perf.logoBase64} alt="Logo" className="max-w-[150px] mx-auto mb-3 bg-gray-600 p-1 rounded"/>}
                <h2 className="text-xl font-bold text-gray-100">Performance Scorecard Details</h2>
            </div>
            <div className="mb-3 text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
                <p><strong>Employee:</strong> {employees.find(e => e.id === selectedScoreDetail.employeeId)?.name || 'N/A'}</p>
                <p><strong>Appraisal Period:</strong> {selectedScoreDetail.appraisalPeriod} ({selectedScoreDetail.appraisalType})</p>
                <p><strong>Date Coverage:</strong> {selectedScoreDetail.dateFrom || 'N/A'} to {selectedScoreDetail.dateTo || 'N/A'}</p>
                <p><strong>Date Saved:</strong> {new Date(selectedScoreDetail.timestamp).toLocaleString()}</p>
            </div>
            <div className={`mb-4 p-4 rounded-lg text-center ${selectedScoreDetail.interpretationBadgeBgClass || 'bg-gray-600'}`}>
                <p className="text-lg"><strong>Final Score: <span className={`text-2xl font-bold ${selectedScoreDetail.interpretationColorClass || 'text-gray-100'}`}>{selectedScoreDetail.finalScore.toFixed(2)}</span> ({selectedScoreDetail.interpretation})</strong></p>
            </div>
            {selectedScoreDetail.metrics.map(metric => (
                <div key={metric.id} className="mt-3 border-t border-gray-700 pt-2">
                    <h4 className="font-bold text-gray-100">{metric.title} (Weight: {metric.weight}%, Score: {(metric.metricScore || 0).toFixed(2)})</h4>
                    {metric.kpis.map(kpi => (
                        <div key={kpi.id} className="ml-4 mt-1 p-2 border-l-2 border-gray-600 pl-3">
                            <p className="font-semibold text-gray-200">{kpi.name}</p>
                            <p className="text-xs">Actual: {kpi.actual} | Weight: {kpi.weight}% | Score: {kpi.calculatedScore}</p>
                        </div>
                    ))}
                </div>
            ))}
            {branding_perf.footerText && <div className="mt-6 pt-3 border-t border-gray-700 text-center text-xs text-gray-500">{branding_perf.footerText}</div>}
            <div className="flex justify-end mt-4">
                <button onClick={() => setIsScoreDetailModalOpen(false)} className="btn-secondary py-2 px-3">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PerformanceScorecardTab;
