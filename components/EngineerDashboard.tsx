
import React, { useState, useMemo } from 'react';
import { Plus, Briefcase, Flag, Layers, Calendar, Clock, Play, CheckCircle2, ScrollText, Pause, FileText, Trash2, ArrowRightLeft, Undo2, Wrench, Cog, Timer, CarFront, Zap, Thermometer, Battery, BatteryWarning, BatteryCharging, ChevronRight, Tag, Copy, Filter, FileCheck, RotateCcw } from 'lucide-react';
import { User, Task, Category, TaskPriority, ProjectPhase, DateChangeRequest } from '../types';
import { Button, Card, ConfirmModal, StatusBadge } from './Shared';
import { NotificationBell } from './NotificationBell';
import { TaskModal, LogModal, TransferModal, ReportModal, VerificationCompletionModal, getCategoryIconComponent, DailyWorkloadModal } from './BusinessModals';
import { ChangeVerificationModal } from './ChangeVerificationModal';
import { getPhaseLabel, getPriorityColor, getStatusLabel } from '../utils';

// ... interface EngineerDashboardProps ...
interface EngineerDashboardProps {
  user: User;
  tasks: Task[];
  users: User[];
  categories: Category[];
  onAddTask: (task: any) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddLog: (taskId: string, log: any) => void;
  onDeleteTask: (taskId: string) => void;
  onTransferTask: (taskId: string, newUserId: string, fromUserId: string) => void;
  onDismissAlert: (taskId: string) => void;
  onRequestDateChange?: (taskId: string, request: DateChangeRequest) => void;
}

const EngineerDashboard: React.FC<EngineerDashboardProps> = ({ 
  user, 
  tasks, 
  users, 
  categories,
  onAddTask, 
  onUpdateTask, 
  onAddLog,
  onDeleteTask,
  onTransferTask,
  onDismissAlert,
  onRequestDateChange
}) => {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<ProjectPhase | 'ALL'>('ALL'); // NEW: Phase Filter State

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Confirmation states
  const [taskToComplete, setTaskToComplete] = useState<string | null>(null);
  const [taskToRestore, setTaskToRestore] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [taskToTransfer, setTaskToTransfer] = useState<Task | null>(null);
  
  // New: Verification Completion State
  const [verificationTask, setVerificationTask] = useState<Task | null>(null);
  // New: Change Verification State
  const [verificationChangeTask, setVerificationChangeTask] = useState<Task | null>(null);

  // New: Daily Workload Modal State
  const [selectedDateForWorkload, setSelectedDateForWorkload] = useState<string | null>(null);

  const myTasks = tasks.filter(t => t.userId === user.id);
  
  // Sort Active Tasks: Priority (High>Med>Low) > Deadline Ascending
  const activeTasks = useMemo(() => {
    let filtered = myTasks.filter(t => t.status !== 'DONE');
    
    // Apply Phase Filter
    if (selectedPhaseFilter !== 'ALL') {
      filtered = filtered.filter(t => t.phase === selectedPhaseFilter);
    }

    return filtered.sort((a, b) => {
        // 1. Priority Weight
        const priorityWeight = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const scoreA = priorityWeight[a.priority] || 0;
        const scoreB = priorityWeight[b.priority] || 0;
        
        if (scoreA !== scoreB) {
            return scoreB - scoreA; // Descending Order (High first)
        }

        // 2. Deadline (Earliest first)
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [myTasks, selectedPhaseFilter]);

  const historyTasks = myTasks.filter(t => t.status === 'DONE');

  // Filter for transfer: Must be ENGINEER and not self
  const otherEngineers = useMemo(() => users.filter(u => u.id !== user.id && u.role === 'ENGINEER'), [users, user.id]);

  // --- Workload Calculation Logic ---
  const workloadStats = useMemo(() => {
    const DAILY_CAPACITY = 8;
    const LOOKAHEAD_DAYS = 14;
    const stats: Record<string, number> = {};
    const today = new Date();
    today.setHours(0,0,0,0);

    // 1. Initialize next 14 days
    const nextDays = [];
    for(let i=0; i<LOOKAHEAD_DAYS; i++) {
       const d = new Date(today);
       d.setDate(d.getDate() + i);
       const dateStr = d.toISOString().split('T')[0];
       stats[dateStr] = 0;
       nextDays.push({ date: d, dateStr });
    }

    // 2. Distribute hours
    activeTasks.forEach(task => {
        const remaining = Math.max(0, task.estimatedHours - task.actualHours);
        if (remaining <= 0) return;

        // Determine Start Date (Max of Today or Task Start)
        let start = new Date(task.startDate ? task.startDate : today);
        if (start < today) start = new Date(today);
        start.setHours(0,0,0,0);

        // Determine End Date (Deadline)
        let end = new Date(task.deadline);
        end.setHours(0,0,0,0);
        
        // If overdue or deadline is today/before start, treat as 1 day load
        if (end < start) end = new Date(start);

        // Calculate Business Days in range
        let businessDaysCount = 0;
        let tempDate = new Date(start);
        while (tempDate <= end) {
            const day = tempDate.getDay();
            if (day !== 0 && day !== 6) businessDaysCount++;
            tempDate.setDate(tempDate.getDate() + 1);
        }
        if (businessDaysCount === 0) businessDaysCount = 1; // Fallback to avoid division by zero

        const dailyLoad = remaining / businessDaysCount;

        // Apply load to valid days within lookahead window
        tempDate = new Date(start);
        while (tempDate <= end) {
            const dateStr = tempDate.toISOString().split('T')[0];
            const day = tempDate.getDay();
            // Only apply to weekdays
            if (day !== 0 && day !== 6) {
                if (stats[dateStr] !== undefined) {
                    stats[dateStr] += dailyLoad;
                }
            }
            tempDate.setDate(tempDate.getDate() + 1);
        }
    });

    return nextDays.map(dayInfo => {
        const used = stats[dayInfo.dateStr] || 0;
        const isWeekend = dayInfo.date.getDay() === 0 || dayInfo.date.getDay() === 6;
        const available = isWeekend ? 0 : Math.max(0, DAILY_CAPACITY - used);
        
        // Status determination
        let status: 'FREE' | 'BUSY' | 'FULL' | 'OFF' = 'FREE';
        if (isWeekend) status = 'OFF';
        else if (available <= 0) status = 'FULL';
        else if (available < 4) status = 'BUSY';

        return {
            ...dayInfo,
            used,
            available,
            status,
            dayName: dayInfo.date.toLocaleDateString('zh-TW', { weekday: 'short' }),
            displayDate: dayInfo.date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
        };
    });
  }, [activeTasks]);

  // Determine tasks for the selected date popup
  const tasksForSelectedDate = useMemo(() => {
     if (!selectedDateForWorkload) return [];
     const targetDate = new Date(selectedDateForWorkload);
     targetDate.setHours(0,0,0,0);
     
     // Same logic as workload calculation to determine overlap
     return activeTasks.filter(task => {
        const remaining = Math.max(0, task.estimatedHours - task.actualHours);
        if (remaining <= 0) return false;

        let start = new Date(task.startDate ? task.startDate : new Date());
        if (start < new Date()) start = new Date(); // Treat today as start if undefined or past
        start.setHours(0,0,0,0);

        let end = new Date(task.deadline);
        end.setHours(0,0,0,0);
        if (end < start) end = new Date(start);

        return targetDate >= start && targetDate <= end;
     });
  }, [selectedDateForWorkload, activeTasks]);

  const handleOpenLog = (task: Task) => {
    setSelectedTask(task);
    setIsLogModalOpen(true);
  };

  const handleCompleteTask = (taskId: string) => {
    onUpdateTask(taskId, { 
      status: 'DONE', 
      completedDate: new Date().toISOString().split('T')[0] 
    });
  };

  const handleVerificationConfirm = (count: number, achieved: number) => {
    if (verificationTask) {
       onUpdateTask(verificationTask.id, {
          status: 'DONE',
          completedDate: new Date().toISOString().split('T')[0],
          dvCount: count,
          dvAchieved: achieved
       });
       setVerificationTask(null);
    }
 };
 
 const handleVerificationChangeConfirm = (result: string, date: string) => {
    if (verificationChangeTask) {
       onUpdateTask(verificationChangeTask.id, {
          changeVerification: result,
          changeVerificationDate: date
       });
       setVerificationChangeTask(null);
    }
 };

  const handleStartTask = (task: Task) => {
    const updates: Partial<Task> = {
      status: 'IN_PROGRESS'
    };
    if (!task.startDate) {
      updates.startDate = new Date().toISOString().split('T')[0];
    }
    onUpdateTask(task.id, updates);
  };

  const handlePauseTask = (taskId: string) => {
    onUpdateTask(taskId, {
      status: 'PAUSED'
    });
  };

  const handleRestoreTask = (taskId: string) => {
    onUpdateTask(taskId, {
      status: 'IN_PROGRESS',
      completedDate: undefined
    });
  };
  
  const getPriorityBorder = (priority: TaskPriority) => {
    switch (priority) {
      case 'HIGH': return 'border-l-4 border-l-red-500';
      case 'MEDIUM': return 'border-l-4 border-l-amber-400';
      default: return 'border-l-4 border-l-slate-300';
    }
  };

  // Render logic for task list
  const renderTaskList = () => {
    if (activeTab === 'HISTORY') {
      if (historyTasks.length === 0) return renderEmptyState();
      return (
        <div className="grid gap-4">
           {historyTasks.map(task => renderTaskCard(task))}
        </div>
      );
    }

    // Active Tab: Flat List (Sorted by Priority > Deadline)
    if (activeTasks.length === 0) return renderEmptyState();

    return (
      <div className="grid gap-4 animate-in fade-in duration-500">
        {activeTasks.map(task => renderTaskCard(task))}
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
      <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-slate-100">
        <CarFront className="w-10 h-10 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900">目前沒有任務</h3>
      <p className="text-slate-500">
          {selectedPhaseFilter !== 'ALL' 
            ? `在 ${getPhaseLabel(selectedPhaseFilter)} 階段中沒有相關任務`
            : "點擊右上方按鈕開始建立您的第一個任務"
          }
      </p>
    </div>
  );

  const renderTaskCard = (task: Task) => {
    const category = categories.find(c => c.id === task.categoryId);
    const isDesignChange = category?.name.includes('變更') || !!task.changeOrderNumber;

    return (
    <Card 
      key={task.id} 
      className={`p-5 flex flex-col md:flex-row gap-6 hover:border-blue-200 transition-colors relative group animate-in fade-in slide-in-from-bottom-4 duration-500 ${getPriorityBorder(task.priority)}`} 
    >
      <div className="flex-1 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <StatusBadge status={task.status} />
              {/* VDA: Priority Badge */}
              <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)} font-medium flex items-center gap-1`}>
                <Flag className="w-3 h-3" />
                {task.priority === 'HIGH' ? 'High' : task.priority === 'MEDIUM' ? 'Medium' : 'Low'}
              </span>
              {task.partNumber && (
                 <span className="text-xs px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-600 font-mono flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {task.partNumber}
                 </span>
              )}
              <h3 className="font-bold text-lg text-slate-900">{task.title}</h3>
              <button 
                onClick={() => {
                  const summary = `${task.title} [${getStatusLabel(task.status)}] - ${getPhaseLabel(task.phase)} \n截止: ${task.deadline}`;
                  navigator.clipboard.writeText(summary);
                  alert('已複製任務摘要');
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-500"
                title="複製任務摘要"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">{task.description}</p>
          </div>
          {activeTab === 'ACTIVE' && (
             <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
               <button 
                  onClick={() => { setSelectedTask(task); setIsTaskModalOpen(true); }}
                  className="text-slate-300 hover:text-blue-500 p-1"
                  title="編輯任務"
               >
                  <Wrench className="w-4 h-4" />
               </button>
               <button
                  onClick={() => setTaskToTransfer(task)}
                  className="text-slate-300 hover:text-blue-500 p-1"
                  title="轉派任務"
               >
                  <ArrowRightLeft className="w-4 h-4" />
               </button>
               <button 
                onClick={() => setTaskToDelete(task.id)}
                className="text-slate-300 hover:text-red-500 p-1"
                title="刪除任務"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
             </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-1.5 min-w-[140px]">
             {(() => {
                const cat = categories.find(c => c.id === task.categoryId);
                return (
                  <>
                     {getCategoryIconComponent(cat?.icon)}
                     <span className="font-medium text-slate-700">{cat?.name || '未分類'}</span>
                  </>
                );
             })()}
          </div>
          <div className="flex items-center gap-1.5 min-w-[140px]">
            <Cog className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-700">{getPhaseLabel(task.phase)}</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-[140px]">
            <Timer className="w-4 h-4 text-slate-400" />
            <span>預計完成: <span className={new Date(task.deadline) < new Date() && task.status !== 'DONE' ? 'text-red-500 font-bold' : ''}>{task.deadline}</span></span>
          </div>
          {task.pendingChange && (
             <div className="flex items-center gap-1.5 min-w-[140px]">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-orange-600 font-bold animate-pulse">日期變更待簽核</span>
             </div>
          )}
          {(task.startDate || task.status === 'IN_PROGRESS' || task.status === 'DONE') && (
            <div className="flex items-center gap-1.5 min-w-[140px]">
              <Play className="w-4 h-4 text-slate-400" />
              <span>開始: {task.startDate || '--'}</span>
            </div>
          )}
           {task.status === 'DONE' && (
            <div className="flex items-center gap-1.5 min-w-[140px]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-700 font-medium">完成: {task.completedDate}</span>
            </div>
          )}
        </div>

        {/* Change Verification Display in History Card */}
        {activeTab === 'HISTORY' && task.changeVerification && (
             <div className="mt-3 bg-emerald-50 p-3 rounded-lg text-sm border border-emerald-100 flex items-start gap-3">
                 <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600 mt-0.5">
                    <FileCheck className="w-4 h-4" />
                 </div>
                 <div>
                    <div className="font-bold text-emerald-800 flex items-center gap-2">
                       變更驗證結果/判定
                       <span className="text-xs font-normal text-emerald-600">({task.changeVerificationDate})</span>
                    </div>
                    <div className="text-emerald-700 mt-1 whitespace-pre-wrap">{task.changeVerification}</div>
                 </div>
             </div>
        )}

        {/* Log Preview */}
        {task.logs.length > 0 && activeTab === 'ACTIVE' && (
          <div className="mt-3 bg-blue-50 p-3 rounded-lg text-sm border border-blue-100">
            <div className="flex justify-between items-center mb-1">
               <div className="text-xs text-blue-600 font-bold flex items-center gap-1">
                 <ScrollText className="w-3 h-3" /> 最新進度 ({task.logs[0].date})
               </div>
               <div className="text-xs text-blue-400">+{task.logs[0].hoursSpent}h</div>
            </div>
            <div className="text-slate-700 font-medium line-clamp-2">{task.logs[0].content}</div>
          </div>
        )}
      </div>

      <div className="flex md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 min-w-[140px]">
        {activeTab === 'ACTIVE' ? (
          <>
            {(task.status === 'TODO' || task.status === 'PAUSED') ? (
              <Button 
                className="w-full justify-start" 
                onClick={() => handleStartTask(task)}
                variant={task.status === 'PAUSED' ? "primary" : "primary"}
              >
                <Play className="w-4 h-4" /> 
                {task.status === 'PAUSED' ? "恢復執行" : "開始執行"}
              </Button>
            ) : (
              <>
                <Button variant="secondary" className="w-full justify-start" onClick={() => handlePauseTask(task.id)}>
                  <Pause className="w-4 h-4" /> 暫停任務
                </Button>
                <Button variant="secondary" className="w-full justify-start" onClick={() => handleOpenLog(task)}>
                  <FileText className="w-4 h-4" /> 填寫日誌
                </Button>
                <Button className="w-full justify-start" onClick={() => {
                   const cat = categories.find(c => c.id === task.categoryId);
                   // Check keywords
                   const isVer = cat?.name.includes('試模') || cat?.name.includes('測試') || cat?.name.includes('驗證') || cat?.name.includes('Test');
                   if (isVer) {
                      setVerificationTask(task);
                   } else {
                      setTaskToComplete(task.id);
                   }
                }}>
                  <Flag className="w-4 h-4" /> 標記完成
                </Button>
              </>
            )}
            {/* Mobile Transfer & Delete */}
            <div className="md:hidden mt-2 border-t border-slate-100 pt-2 flex gap-2">
               <Button variant="ghost" className="w-full justify-start text-slate-500 hover:bg-slate-50" onClick={() => setTaskToTransfer(task)}>
                  <ArrowRightLeft className="w-4 h-4" /> 轉派
                </Button>
               <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => setTaskToDelete(task.id)}>
                  <Trash2 className="w-4 h-4" /> 刪除
                </Button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center py-2">
              <div className="text-xs text-slate-500">工時統計</div>
              <div className="font-medium text-slate-900">預計: {task.estimatedHours}h</div>
              <div className="font-medium text-slate-700">實際: {task.actualHours}h</div>
            </div>
            {/* Add Verification Result Button for Design Changes in History */}
            {isDesignChange && (
               <Button variant="secondary" className="w-full bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200" onClick={() => setVerificationChangeTask(task)}>
                  <FileCheck className="w-4 h-4" /> {task.changeVerification ? "修改判定" : "追加判定"}
               </Button>
            )}
            <Button variant="secondary" className="w-full mt-auto" onClick={() => setTaskToRestore(task.id)}>
              <Undo2 className="w-4 h-4" /> 復原任務
            </Button>
          </>
        )}
      </div>
    </Card>
  )};

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">早安, {user.name}</h1>
          <p className="text-slate-500">這是您今日的工作概覽</p>
        </div>
        <div className="flex gap-3 items-center">
          <NotificationBell 
             tasks={tasks} 
             currentUser={user} 
             allUsers={users}
             onDismissAlert={onDismissAlert}
           />
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <Button variant="secondary" onClick={() => setIsReportModalOpen(true)}>
            <FileText className="w-4 h-4" /> 我的報表
          </Button>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'ACTIVE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              進行中
            </button>
            <button 
              onClick={() => setActiveTab('HISTORY')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'HISTORY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              歷史紀錄
            </button>
          </div>
          {activeTab === 'ACTIVE' && (
            <Button onClick={() => { setSelectedTask(null); setIsTaskModalOpen(true); }}>
              <Plus className="w-4 h-4" /> 建立任務
            </Button>
          )}
        </div>
      </div>

      {/* Workload Capacity Forecast */}
      {activeTab === 'ACTIVE' && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center gap-2 mb-4">
                 <BatteryCharging className="w-5 h-5 text-emerald-500" />
                 <h3 className="font-bold text-slate-800">近兩週工作能量預測 (Work Capacity)</h3>
                 <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">點擊日期查看清單</span>
             </div>
             <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar snap-x">
                 {workloadStats.map((day, idx) => {
                     const isToday = idx === 0;
                     let bgColor = 'bg-slate-50 border-slate-100';
                     let icon = <Battery className="w-4 h-4 text-emerald-500" />;
                     let statusText = `${Math.round(day.available)}h Left`;
                     let textColor = 'text-slate-600';

                     if (day.status === 'OFF') {
                         bgColor = 'bg-slate-50/50 border-slate-100 opacity-60';
                         icon = <Calendar className="w-4 h-4 text-slate-300" />;
                         statusText = '休假';
                         textColor = 'text-slate-400';
                     } else if (day.status === 'FULL') {
                         bgColor = 'bg-red-50 border-red-200';
                         icon = <BatteryWarning className="w-4 h-4 text-red-500" />;
                         statusText = '已滿載';
                         textColor = 'text-red-600';
                     } else if (day.status === 'BUSY') {
                         bgColor = 'bg-amber-50 border-amber-200';
                         icon = <BatteryCharging className="w-4 h-4 text-amber-500" />;
                         statusText = `剩 ${Math.round(day.available)}h`;
                         textColor = 'text-amber-600';
                     }

                     return (
                         <div 
                           key={day.dateStr} 
                           onClick={() => setSelectedDateForWorkload(day.dateStr)}
                           className={`min-w-[100px] p-3 rounded-lg border flex flex-col items-center gap-2 snap-start cursor-pointer hover:shadow-md transition-all ${bgColor} ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-105'}`}
                         >
                             <div className="text-xs font-bold text-slate-500 uppercase">{day.dayName}</div>
                             <div className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>{day.displayDate}</div>
                             
                             <div className="my-1">
                                {icon}
                             </div>

                             <div className={`text-xs font-bold ${textColor}`}>
                                 {statusText}
                             </div>
                             
                             {/* Mini Bar */}
                             {day.status !== 'OFF' && (
                                <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border border-slate-100 mt-1">
                                    <div 
                                      className={`h-full rounded-full ${day.status === 'FULL' ? 'bg-red-500' : day.status === 'BUSY' ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                                      style={{width: `${Math.min(100, (day.used / 8) * 100)}%`}}
                                    ></div>
                                </div>
                             )}
                         </div>
                     );
                 })}
             </div>
          </div>
      )}

      {/* NEW: Phase Filter Chips */}
      {activeTab === 'ACTIVE' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
           <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0">
             <Filter className="w-3 h-3" /> 階段快篩:
           </span>
           <button 
             onClick={() => setSelectedPhaseFilter('ALL')}
             className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${selectedPhaseFilter === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
           >
             全部 (All)
           </button>
           {(['P1', 'P2', 'P3', 'P4', 'P5'] as ProjectPhase[]).map(phase => (
             <button 
               key={phase}
               onClick={() => setSelectedPhaseFilter(phase)}
               className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${selectedPhaseFilter === phase ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
             >
               {getPhaseLabel(phase)}
             </button>
           ))}
        </div>
      )}

      <div className="min-h-[500px]">
        {renderTaskList()}
      </div>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => { setIsTaskModalOpen(false); setSelectedTask(null); }} 
        onSubmit={(data) => {
          if (selectedTask) {
            onUpdateTask(selectedTask.id, data);
          } else {
            onAddTask(data);
          }
        }}
        editingTask={selectedTask}
        categories={categories}
        onRequestDateChange={onRequestDateChange}
        currentUser={user}
        tasks={tasks} // Pass tasks here
      />
      
      {/* Verification Completion Modal */}
      <VerificationCompletionModal 
        isOpen={!!verificationTask}
        onClose={() => setVerificationTask(null)}
        taskTitle={verificationTask?.title || ''}
        onConfirm={handleVerificationConfirm}
      />
      
      {/* Change Verification Modal (Added) */}
      <ChangeVerificationModal
        isOpen={!!verificationChangeTask}
        onClose={() => setVerificationChangeTask(null)}
        taskTitle={verificationChangeTask?.title || ''}
        initialResult={verificationChangeTask?.changeVerification}
        initialDate={verificationChangeTask?.changeVerificationDate}
        onConfirm={handleVerificationChangeConfirm}
      />
      
      {/* Daily Workload Details Modal */}
      <DailyWorkloadModal
        isOpen={!!selectedDateForWorkload}
        onClose={() => setSelectedDateForWorkload(null)}
        dateStr={selectedDateForWorkload}
        tasks={tasksForSelectedDate}
        categories={categories}
      />

      {/* ... Other Modals ... */}
      {selectedTask && (
        <LogModal 
          isOpen={isLogModalOpen}
          onClose={() => { setIsLogModalOpen(false); setSelectedTask(null); }}
          onSubmit={(logData) => onAddLog(selectedTask.id, logData)}
          taskTitle={selectedTask.title}
        />
      )}

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        currentUser={user}
        users={users}
        tasks={tasks}
        categories={categories}
      />

      {taskToTransfer && (
        <TransferModal 
          isOpen={!!taskToTransfer}
          onClose={() => setTaskToTransfer(null)}
          onConfirm={(newUserId) => onTransferTask(taskToTransfer.id, newUserId, user.id)}
          users={otherEngineers} 
          taskTitle={taskToTransfer.title}
        />
      )}

      <ConfirmModal 
        isOpen={!!taskToComplete}
        onClose={() => setTaskToComplete(null)}
        onConfirm={() => {
          if (taskToComplete) handleCompleteTask(taskToComplete);
        }}
        title="完成任務確認"
        message="您確定要將此任務標記為完成嗎？這將會把它移至歷史紀錄中。"
        confirmText="標記完成"
      />

      <ConfirmModal 
        isOpen={!!taskToRestore}
        onClose={() => setTaskToRestore(null)}
        onConfirm={() => {
          if (taskToRestore) handleRestoreTask(taskToRestore);
        }}
        title="復原任務確認"
        message="您確定要將此任務退回進行中狀態嗎？"
        confirmText="復原任務"
      />

      <ConfirmModal 
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) onDeleteTask(taskToDelete);
        }}
        title="刪除任務確認"
        message="您確定要永久刪除此任務嗎？此操作無法復原。"
        confirmText="確認刪除"
        isDanger={true}
      />
    </div>
  );
};

export default EngineerDashboard;
