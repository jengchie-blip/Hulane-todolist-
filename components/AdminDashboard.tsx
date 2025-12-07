
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Upload, Download, Plus, Activity, AlertCircle, CheckCircle2, Flag, Eye, Pencil, Trash2, 
  Zap, Badge, Briefcase, FileText, Search, CopyPlus, Trophy, Medal, AlertOctagon, PenTool, 
  Shield, ArrowRight, BarChart3, AlertTriangle, HardHat, Tag, Layers, User as UserIcon, Calendar, Clock,
  Settings, UserCog, LayoutDashboard, ChevronDown, Users, Battery, BatteryWarning, BatteryCharging, Gauge, Info
} from 'lucide-react';
import { User, Task, Category, TaskStatus, ProjectPhase } from '../types';
import { Button, Card, ConfirmModal, StatusBadge, UserAvatar } from './Shared';
import { NotificationBell } from './NotificationBell';
import { 
  UserModal, TransferModal, UserDetailModal, TaskModal, CategoryModal, OverdueListModal, 
  ReportModal, GeneralTaskListModal, TaskSearchModal, BatchTaskModal, ApprovalListModal,
  TeamDailyWorkloadModal, QuickDispatchModal,
  getCategoryIconComponent
} from './BusinessModals';
import { evaluateUserPerformance, getPhaseLabel, getStatusLabel, getPerformanceDetails } from '../utils';

interface AdminDashboardProps {
  currentUser: User; 
  users: User[];
  tasks: Task[];
  categories: Category[];
  onAddUser: (data: any) => void;
  onUpdateUser: (id: string, data: Partial<User>) => void;
  onRemoveUser: (userId: string) => void;
  onImportData: (file: File) => void;
  onExportData: () => void;
  onTransferTask: (taskId: string, newUserId: string, fromUserId: string) => void;
  onDismissAlert: (taskId: string) => void;
  onAddTask: (task: any) => void;
  onAddCategory: (name: string, suggestedHours: number, note?: string, icon?: string) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onReorderCategories: (categories: Category[]) => void;
  onApproveDateChange?: (taskId: string) => void;
  onRejectDateChange?: (taskId: string) => void;
  requireAdminPassword?: boolean;
  onTogglePasswordRequirement?: (enabled: boolean) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void; // Added for Total List Edit
  onDeleteTask?: (taskId: string) => void; // Added for Total List Delete
  onUpdateProjectOwner: (partNumber: string, userId: string) => void; // Added for Batch Create Project Owner
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  currentUser,
  users, 
  tasks,
  categories,
  onAddUser,
  onUpdateUser,
  onRemoveUser,
  onImportData,
  onExportData,
  onTransferTask,
  onDismissAlert,
  onAddTask,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
  onApproveDateChange,
  onRejectDateChange,
  requireAdminPassword = false,
  onTogglePasswordRequirement,
  onUpdateTask,
  onDeleteTask,
  onUpdateProjectOwner
}) => {
  // --- Modals State ---
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isShowActiveModal, setIsShowActiveModal] = useState(false);
  const [isShowTotalTasksModal, setIsShowTotalTasksModal] = useState(false); // New: Total Tasks List
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isBatchTaskModalOpen, setIsBatchTaskModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedDateForTeamLoad, setSelectedDateForTeamLoad] = useState<string | null>(null);
  const [isQuickDispatchModalOpen, setIsQuickDispatchModalOpen] = useState(false);
  
  // --- View Phase Detail State ---
  const [viewingPhase, setViewingPhase] = useState<ProjectPhase | null>(null);

  // --- Dropdown State ---
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const dataMenuRef = useRef<HTMLDivElement>(null);

  // --- Selection State ---
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [taskToTransfer, setTaskToTransfer] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Click Outside Handler for Data Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dataMenuRef.current && !dataMenuRef.current.contains(event.target as Node)) {
        setIsDataMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const activeTasks = tasks.filter(t => t.status !== 'DONE').length;
    const completedTasks = tasks.filter(t => t.status === 'DONE').length;
    const overdueTasks = tasks.filter(t => t.status !== 'DONE' && new Date(t.deadline) < new Date(new Date().setHours(0,0,0,0))).length;
    const pendingReviews = tasks.filter(t => t.actualHours > t.estimatedHours).length;
    const pendingApprovals = tasks.filter(t => t.pendingChange).length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return { totalTasks, activeTasks, completedTasks, overdueTasks, pendingReviews, completionRate, pendingApprovals };
  }, [tasks]);

  // --- Team Workload Stats Calculation ---
  const teamWorkloadStats = useMemo(() => {
     const engineerCount = users.filter(u => u.role === 'ENGINEER').length;
     const dailyTeamCapacity = engineerCount * 8; // Assuming 8 hours per engineer
     
     if (dailyTeamCapacity === 0) return [];

     const LOOKAHEAD_DAYS = 14;
     const today = new Date();
     today.setHours(0,0,0,0);
     
     const nextDays = [];
     const loadStats: Record<string, number> = {};

     // Initialize dates
     for(let i=0; i<LOOKAHEAD_DAYS; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        loadStats[dateStr] = 0;
        nextDays.push({ date: d, dateStr });
     }

     const activeTasks = tasks.filter(t => t.status !== 'DONE');

     activeTasks.forEach(task => {
        const remaining = Math.max(0, task.estimatedHours - task.actualHours);
        if (remaining <= 0) return;

        let start = new Date(task.startDate ? task.startDate : today);
        if (start < today) start = new Date(today);
        start.setHours(0,0,0,0);

        let end = new Date(task.deadline);
        end.setHours(0,0,0,0);
        if (end < start) end = new Date(start);

        // Calculate business days
        let businessDaysCount = 0;
        let tempDate = new Date(start);
        while (tempDate <= end) {
            const day = tempDate.getDay();
            if (day !== 0 && day !== 6) businessDaysCount++;
            tempDate.setDate(tempDate.getDate() + 1);
        }
        if (businessDaysCount === 0) businessDaysCount = 1;

        const dailyLoad = remaining / businessDaysCount;

        tempDate = new Date(start);
        while(tempDate <= end) {
           const dateStr = tempDate.toISOString().split('T')[0];
           const day = tempDate.getDay();
           if (day !== 0 && day !== 6) {
              if (loadStats[dateStr] !== undefined) {
                 loadStats[dateStr] += dailyLoad;
              }
           }
           tempDate.setDate(tempDate.getDate() + 1);
        }
     });

     return nextDays.map(dayInfo => {
        const used = loadStats[dayInfo.dateStr] || 0;
        const isWeekend = dayInfo.date.getDay() === 0 || dayInfo.date.getDay() === 6;
        
        let status: 'FREE' | 'BUSY' | 'FULL' | 'OFF' = 'FREE';
        
        if (isWeekend) status = 'OFF';
        else {
           const usageRatio = used / dailyTeamCapacity;
           if (usageRatio > 0.9) status = 'FULL'; // > 90%
           else if (usageRatio > 0.6) status = 'BUSY'; // > 60%
           else status = 'FREE';
        }

        return {
           ...dayInfo,
           used,
           capacity: isWeekend ? 0 : dailyTeamCapacity,
           status,
           dayName: dayInfo.date.toLocaleDateString('zh-TW', { weekday: 'short' }),
           displayDate: dayInfo.date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
        };
     });

  }, [tasks, users]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser.role === 'ADMIN';

  const engineers = users.filter(u => u.role === 'ENGINEER');
  const assistants = users.filter(u => u.role === 'ASSISTANT');

  const renderUserCard = (user: User) => {
     const userTasks = tasks.filter(t => t.userId === user.id);
     const activeCount = userTasks.filter(t => t.status !== 'DONE').length;
     const completedTasks = userTasks.filter(t => t.status === 'DONE');
     const isSelf = currentUser.id === user.id;
     
     const { level, score } = evaluateUserPerformance(completedTasks);
     const perf = getPerformanceDetails(level);

     return (
       <div 
         key={user.id} 
         className={`bg-white rounded-xl border p-4 transition-all cursor-pointer flex flex-col h-full relative overflow-hidden group ${isSelf ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200 hover:shadow-md hover:border-blue-300'}`}
         onClick={() => { 
           if (isSelf) {
              setEditingUser(user);
              setIsUserModalOpen(true);
           } else {
              setViewingUser(user); 
              setEditingUser(null); 
           }
         }}
       >
          <div className="flex items-start justify-between mb-3">
             <div className="flex items-center gap-3">
                <UserAvatar user={user} size="lg" showShadow />
                <div>
                   <div className="font-bold text-slate-900 flex items-center gap-2">
                      {user.name}
                      {isSelf && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded-full">Me</span>}
                   </div>
                   <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Badge className="w-3 h-3" /> {user.employeeId}
                   </div>
                </div>
             </div>
             {isAdmin && (
               <button 
                 onClick={(e) => { e.stopPropagation(); setEditingUser(user); setIsUserModalOpen(true); }}
                 className="text-slate-300 hover:text-blue-500 p-1.5 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
               >
                  <Pencil className="w-4 h-4" />
               </button>
             )}
             {isSelf && !isAdmin && (
                <button 
                  className="text-slate-300 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="點擊編輯個人資料"
                >
                   <Settings className="w-4 h-4" />
                </button>
             )}
          </div>

          {/* Workload Indicator */}
          <div className="mb-4 space-y-1">
             <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>目前負載</span>
                <span className={activeCount > 8 ? 'text-red-500 font-bold' : 'text-slate-700'}>{activeCount} 任務</span>
             </div>
             <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                   className={`h-full rounded-full ${activeCount > 8 ? 'bg-red-500' : activeCount > 4 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                   style={{ width: `${Math.min(100, (activeCount / 10) * 100)}%` }}
                ></div>
             </div>
          </div>
          
          <div className={`mt-auto pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-medium px-2 py-1.5 rounded ${perf.color}`}>
             <span className="flex items-center gap-1.5">
                <Trophy className={`w-3.5 h-3.5 ${perf.iconColor}`} /> 綜合評價
             </span>
             <span>{perf.label}</span>
          </div>
       </div>
     );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
             <LayoutDashboard className="w-8 h-8 text-blue-600" />
             總覽儀表板
          </h1>
          <p className="text-slate-500 mt-1 ml-11">部門運作概況與團隊績效中心</p>
        </div>
        
        <div className="flex items-center gap-3 self-end md:self-auto">
          <NotificationBell 
            tasks={tasks} 
            currentUser={currentUser} 
            allUsers={users} 
            onDismissAlert={onDismissAlert} 
          />
          
          {isAdmin && (
            <div className="relative" ref={dataMenuRef}>
              <Button 
                variant="secondary" 
                onClick={() => setIsDataMenuOpen(!isDataMenuOpen)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" /> 資料管理 <ChevronDown className="w-3 h-3" />
              </Button>
              
              {isDataMenuOpen && (
                 <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="py-1">
                      <button 
                        onClick={() => {
                          setEditingUser(currentUser); 
                          setIsUserModalOpen(true);
                          setIsDataMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <UserCog className="w-4 h-4 text-blue-500" /> 主管資訊設定
                      </button>
                      {onTogglePasswordRequirement && (
                        <button 
                          onClick={() => {
                            onTogglePasswordRequirement(!requireAdminPassword);
                            setIsDataMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          {requireAdminPassword ? <Shield className="w-4 h-4 text-emerald-500" /> : <Shield className="w-4 h-4 text-slate-400" />}
                          {requireAdminPassword ? '已啟用登入密碼' : '未啟用登入密碼'}
                        </button>
                      )}
                      <div className="border-t border-slate-100 my-1"></div>
                      <button onClick={() => { setIsCategoryModalOpen(true); setIsDataMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                         <Layers className="w-4 h-4 text-slate-500" /> 管理任務類別
                      </button>
                      <button onClick={() => { setIsReportModalOpen(true); setIsDataMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                         <FileText className="w-4 h-4 text-slate-500" /> 匯出工時報表
                      </button>
                      <div className="border-t border-slate-100 my-1"></div>
                      <button onClick={() => { onExportData(); setIsDataMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                         <Download className="w-4 h-4 text-slate-500" /> 備份資料 (JSON)
                      </button>
                      <button onClick={() => { fileInputRef.current?.click(); setIsDataMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                         <Upload className="w-4 h-4 text-slate-500" /> 匯入資料
                      </button>
                    </div>
                 </div>
              )}
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && onImportData(e.target.files[0])} className="hidden" accept=".json" />
        </div>
      </div>

      {/* Top Section: Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-blue-200 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => isAdmin && setIsShowTotalTasksModal(true)}
        >
           <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-white/20 rounded-lg"><Briefcase className="w-5 h-5" /></div>
              <span className="text-blue-100 text-sm font-medium">總任務數</span>
           </div>
           <div className="text-3xl font-bold">{stats.totalTasks}</div>
           <div className="text-xs text-blue-100 mt-1">
             {isAdmin ? '點擊管理所有任務' : '累積專案與工單'}
           </div>
        </Card>
        
        <Card className="p-4 bg-white hover:border-blue-300 cursor-pointer group" onClick={() => setIsShowActiveModal(true)}>
           <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors"><Activity className="w-5 h-5" /></div>
                 <span className="text-slate-500 text-sm font-medium">進行中</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
           </div>
           <div className="text-3xl font-bold text-slate-800">{stats.activeTasks}</div>
           <div className="text-xs text-emerald-600 mt-1 font-medium">目前運作中項目</div>
        </Card>

        <Card className="p-4 bg-white hover:border-red-300 cursor-pointer group" onClick={() => setIsOverdueModalOpen(true)}>
           <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100 transition-colors"><AlertCircle className="w-5 h-5" /></div>
                 <span className="text-slate-500 text-sm font-medium">逾期案件</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-red-500" />
           </div>
           <div className="text-3xl font-bold text-slate-800">{stats.overdueTasks}</div>
           <div className="text-xs text-red-500 mt-1 font-medium">需立即關注</div>
        </Card>

        <Card className="p-4 bg-white">
           <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><CheckCircle2 className="w-5 h-5" /></div>
              <span className="text-slate-500 text-sm font-medium">總結案率</span>
           </div>
           <div className="text-3xl font-bold text-slate-800">{stats.completionRate}%</div>
           <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full transition-all duration-1000" style={{width: `${stats.completionRate}%`}}></div>
           </div>
        </Card>
      </div>

      {/* Department Capacity Forecast Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
         <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                 <Gauge className="w-5 h-5 text-indigo-600" />
                 <h3 className="font-bold text-slate-800">部門產能負載預測 (Department Capacity Forecast)</h3>
             </div>
             <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
               <Info className="w-3 h-3" /> 點擊日期查看個別人員負荷
             </span>
         </div>
         
         <div className="flex overflow-x-auto pb-2 gap-3 no-scrollbar snap-x">
             {teamWorkloadStats.map((day, idx) => {
                 const isToday = idx === 0;
                 let bgColor = 'bg-slate-50 border-slate-100';
                 let icon = <Battery className="w-4 h-4 text-emerald-500" />;
                 let statusText = "Free";
                 let textColor = "text-emerald-600";
                 
                 if (day.status === 'OFF') {
                     bgColor = 'bg-slate-50/50 border-slate-100 opacity-60';
                     icon = <Calendar className="w-4 h-4 text-slate-300" />;
                     statusText = '休假';
                     textColor = 'text-slate-400';
                 } else if (day.status === 'FULL') {
                     bgColor = 'bg-red-50 border-red-200';
                     icon = <BatteryWarning className="w-4 h-4 text-red-500" />;
                     statusText = '滿載 (>90%)';
                     textColor = 'text-red-600 font-bold';
                 } else if (day.status === 'BUSY') {
                     bgColor = 'bg-amber-50 border-amber-200';
                     icon = <BatteryCharging className="w-4 h-4 text-amber-500" />;
                     statusText = '忙碌 (60-90%)';
                     textColor = 'text-amber-600 font-bold';
                 } else {
                     statusText = '餘裕 (<60%)';
                 }

                 return (
                     <div 
                       key={day.dateStr}
                       onClick={() => day.status !== 'OFF' && setSelectedDateForTeamLoad(day.dateStr)}
                       className={`min-w-[140px] p-3 rounded-lg border flex flex-col items-center gap-2 snap-start cursor-pointer hover:shadow-md transition-all ${bgColor} ${isToday ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                     >
                         <div className="text-xs font-bold text-slate-500 uppercase">{day.dayName}</div>
                         <div className={`text-sm font-bold ${isToday ? 'text-indigo-600' : 'text-slate-800'}`}>{day.displayDate}</div>
                         
                         <div className="my-1">
                            {icon}
                         </div>

                         <div className={`text-xs ${textColor}`}>
                             {statusText}
                         </div>
                         
                         {day.status !== 'OFF' && (
                             <div className="w-full text-[10px] text-slate-400 text-center">
                                {Math.round(day.used)}h / {day.capacity}h
                             </div>
                         )}

                         {/* Mini Bar */}
                         {day.status !== 'OFF' && (
                            <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border border-slate-100 mt-1">
                                <div 
                                  className={`h-full rounded-full ${day.status === 'FULL' ? 'bg-red-500' : day.status === 'BUSY' ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                                  style={{width: `${Math.min(100, (day.used / day.capacity) * 100)}%`}}
                                ></div>
                            </div>
                         )}
                     </div>
                 );
             })}
         </div>
      </div>

      {/* Middle Section: Management Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Left: Project Phase Distribution */}
         <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <BarChart3 className="w-5 h-5 text-blue-500" /> 專案階段分佈 (Phase Distribution)
              </h3>
            </div>
            <div className="grid grid-cols-5 gap-2">
               {(['P1', 'P2', 'P3', 'P4', 'P5'] as const).map(phase => {
                 const count = tasks.filter(t => t.phase === phase && t.status !== 'DONE').length;
                 const isActive = count > 0;
                 return (
                   <button 
                     key={phase} 
                     onClick={() => isActive && setViewingPhase(phase)}
                     disabled={!isActive}
                     className={`flex flex-col items-center p-3 rounded-lg border transition-all ${isActive ? 'bg-blue-50 border-blue-100 hover:bg-blue-100 cursor-pointer shadow-sm hover:shadow' : 'bg-slate-50 border-slate-100 opacity-60 cursor-default'}`}
                   >
                      <span className="text-xs font-bold text-slate-500 mb-1">{phase}</span>
                      <span className={`text-xl font-bold ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{count}</span>
                      <span className="text-[10px] text-slate-400 mt-1">{getPhaseLabel(phase).split(' ')[1]}</span>
                   </button>
                 );
               })}
            </div>
         </div>

         {/* Right: Urgent Actions (Admin Only + Search) */}
         <div className="space-y-4">
             {/* Approval Alert (Admin Only) */}
             {isAdmin && (
               <div 
                 className={`p-4 rounded-xl border transition-colors cursor-pointer ${stats.pendingApprovals > 0 ? 'bg-orange-50 border-orange-200 hover:border-orange-300' : 'bg-slate-50 border-slate-200'}`}
                 onClick={() => stats.pendingApprovals > 0 && setIsApprovalModalOpen(true)}
               >
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${stats.pendingApprovals > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-400'}`}>
                           <PenTool className="w-5 h-5" />
                        </div>
                        <div>
                           <div className="font-bold text-slate-800">待簽核項目</div>
                           <div className="text-xs text-slate-500">日期變更申請</div>
                        </div>
                     </div>
                     <span className={`text-xl font-bold ${stats.pendingApprovals > 0 ? 'text-orange-600' : 'text-slate-300'}`}>
                       {stats.pendingApprovals}
                     </span>
                  </div>
               </div>
             )}

             {/* Quick Dispatch (Admin Only) */}
             {isAdmin && (
               <button 
                 onClick={() => setIsQuickDispatchModalOpen(true)}
                 className="w-full p-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-white to-indigo-50 hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-3 text-slate-600 group relative overflow-hidden"
               >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-100 rounded-full blur-2xl -mr-8 -mt-8 opacity-50"></div>
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl group-hover:scale-110 transition-transform shadow-indigo-200 shadow-sm z-10">
                     <Zap className="w-6 h-6" />
                  </div>
                  <div className="text-left z-10">
                     <div className="font-bold text-slate-800 text-lg">單鍵快速派工</div>
                     <div className="text-xs text-indigo-600 font-medium">檢視能量 • 即時指派</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-indigo-300 ml-auto -rotate-90" />
               </button>
             )}

             {/* Search Tasks (Everyone) */}
             <button 
               onClick={() => setIsSearchModalOpen(true)}
               className="w-full p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all flex items-center gap-3 text-slate-600 group"
             >
                <div className="p-2 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
                   <Search className="w-5 h-5" />
                </div>
                <div className="text-left">
                   <div className="font-bold text-slate-800">搜尋任務</div>
                   <div className="text-xs text-slate-500">輸入關鍵字、品號或人員</div>
                </div>
             </button>

             {/* Batch Create (Admin Only) */}
             {isAdmin && (
               <button 
                 onClick={() => setIsBatchTaskModalOpen(true)}
                 className="w-full p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm transition-all flex items-center gap-3 text-slate-600 group"
               >
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full group-hover:scale-110 transition-transform">
                     <CopyPlus className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                     <div className="font-bold text-slate-800">批次建立任務</div>
                     <div className="text-xs text-slate-500">快速新增多筆專案工作</div>
                  </div>
               </button>
             )}
         </div>
      </div>

      {/* Bottom Section: Team Matrix (Grid) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
             <Users className="w-6 h-6 text-slate-700" /> 團隊成員概況 (Team Matrix)
           </h2>
           {isAdmin && (
             <Button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }} className="shadow-sm">
               <Plus className="w-4 h-4" /> 新增成員
             </Button>
           )}
        </div>

        {/* Engineers Section */}
        {engineers.length > 0 && (
          <div className="space-y-3">
             <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                <HardHat className="w-4 h-4" /> 工程師 (Engineers)
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {engineers.map(user => renderUserCard(user))}
             </div>
          </div>
        )}

        {/* Assistants Section */}
        {(assistants.length > 0 || isAdmin) && (
          <div className="space-y-3">
             <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> 助理 (Assistants)
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {assistants.map(user => renderUserCard(user))}
                
                {/* Add Member Placeholder (Admin Only) - Placed in Assistant section as "overflow" or easy access */}
                {isAdmin && (
                  <button 
                      onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}
                      className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all min-h-[180px]"
                  >
                      <div className="p-3 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm">新增團隊成員</span>
                  </button>
                )}
             </div>
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      <UserModal 
        isOpen={isUserModalOpen} 
        onClose={() => { setIsUserModalOpen(false); setEditingUser(null); }} 
        onSubmit={(data) => {
          if (editingUser) {
            onUpdateUser(editingUser.id, data);
          } else {
            onAddUser(data);
          }
        }}
        editingUser={editingUser}
        currentUser={currentUser}
      />

      <UserDetailModal 
        isOpen={!!viewingUser && !editingUser} 
        onClose={() => setViewingUser(null)} 
        user={viewingUser}
        tasks={tasks}
        onTransferTask={isAdmin ? (task) => setTaskToTransfer(task) : undefined}
        categories={categories}
      />
      
      {/* Team Daily Workload Detail Modal */}
      <TeamDailyWorkloadModal
         isOpen={!!selectedDateForTeamLoad}
         onClose={() => setSelectedDateForTeamLoad(null)}
         dateStr={selectedDateForTeamLoad}
         users={users}
         tasks={tasks}
      />
      
      {/* Quick Dispatch Modal */}
      <QuickDispatchModal 
         isOpen={isQuickDispatchModalOpen}
         onClose={() => setIsQuickDispatchModalOpen(false)}
         onSubmit={onAddTask}
         users={users}
         tasks={tasks}
         categories={categories}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onAddCategory={onAddCategory}
        onUpdateCategory={onUpdateCategory}
        onDeleteCategory={onDeleteCategory}
        onReorderCategories={onReorderCategories}
      />

      {taskToTransfer && (
        <TransferModal 
          isOpen={!!taskToTransfer} 
          onClose={() => setTaskToTransfer(null)} 
          onConfirm={(newUserId) => onTransferTask(taskToTransfer.id, newUserId, taskToTransfer.userId)} 
          users={users.filter(u => u.role !== 'ADMIN')} 
          taskTitle={taskToTransfer.title}
        />
      )}

      <OverdueListModal 
        isOpen={isOverdueModalOpen}
        onClose={() => setIsOverdueModalOpen(false)}
        tasks={tasks}
        users={users}
        categories={categories}
        onTransferTask={isAdmin ? (task: Task) => setTaskToTransfer(task) : undefined}
      />

      <GeneralTaskListModal
        isOpen={isShowActiveModal}
        onClose={() => setIsShowActiveModal(false)}
        title="進行中任務"
        tasks={tasks.filter(t => t.status !== 'DONE')}
        users={users}
        categories={categories}
        onTransferTask={isAdmin ? (task: Task) => setTaskToTransfer(task) : undefined}
      />

      {/* Total Tasks List Modal with Admin Editing */}
      <GeneralTaskListModal
        isOpen={isShowTotalTasksModal}
        onClose={() => setIsShowTotalTasksModal(false)}
        title="所有任務清單 (管理模式)"
        tasks={tasks} // Show all tasks
        users={users}
        categories={categories}
        onTransferTask={isAdmin ? (task: Task) => setTaskToTransfer(task) : undefined}
        onEditTask={isAdmin ? (task: Task) => { setIsShowTotalTasksModal(false); setEditingTask(task); setIsTaskModalOpen(true); } : undefined}
        onDeleteTask={isAdmin ? (taskId: string) => setTaskToDelete(taskId) : undefined}
      />

      {/* Phase Task List Modal */}
      <GeneralTaskListModal
        isOpen={!!viewingPhase}
        onClose={() => setViewingPhase(null)}
        title={viewingPhase ? `${getPhaseLabel(viewingPhase)} 進行中任務` : ''}
        tasks={viewingPhase ? tasks.filter(t => t.phase === viewingPhase && t.status !== 'DONE') : []}
        users={users}
        categories={categories}
        onTransferTask={isAdmin ? (task: Task) => setTaskToTransfer(task) : undefined}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        currentUser={currentUser}
        users={users}
        tasks={tasks}
        categories={categories}
      />

      <TaskSearchModal 
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        tasks={tasks}
        users={users}
        categories={categories}
      />

      <BatchTaskModal 
        isOpen={isBatchTaskModalOpen}
        onClose={() => setIsBatchTaskModalOpen(false)}
        onSubmit={(newTasks: any[], partNumber: string, projectOwnerId: string) => {
           // 1. Add Tasks
           newTasks.forEach(t => onAddTask(t));
           
           // 2. Update Project Owner if provided
           if (partNumber && projectOwnerId) {
              onUpdateProjectOwner(partNumber, projectOwnerId);
           }
        }}
        users={users.filter(u => u.role !== 'ADMIN')}
        categories={categories}
      />
      
      {onApproveDateChange && onRejectDateChange && (
        <ApprovalListModal
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          tasks={tasks}
          users={users}
          onApprove={onApproveDateChange}
          onReject={onRejectDateChange}
        />
      )}

      {/* Reused Task Modal for Admin Editing */}
      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
        onSubmit={(data: any) => {
          if (editingTask && onUpdateTask) {
             onUpdateTask(editingTask.id, data);
          } else {
             onAddTask(data);
          }
        }}
        editingTask={editingTask}
        categories={categories}
        users={users}
        currentUser={currentUser}
        tasks={tasks} // Pass tasks here
      />

      {/* Delete Confirmation */}
      <ConfirmModal 
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
           if (taskToDelete && onDeleteTask) {
             onDeleteTask(taskToDelete);
           }
        }}
        title="刪除任務確認"
        message="您確定要永久刪除此任務嗎？此操作無法復原。"
        confirmText="確認刪除"
        isDanger={true}
      />
    </div>
  );
};

export default AdminDashboard;
