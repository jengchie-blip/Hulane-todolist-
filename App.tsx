
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { Briefcase, ChevronRight, ChevronDown, LogOut, CheckCircle2, LayoutDashboard, Badge, Search, Users, Car, Gauge, Wrench, Tag, Lock, X, FolderOpen, PieChart, User as UserIcon, Calendar, Target, RotateCcw } from 'lucide-react';
import { User, Task, TaskLog, Category, ProjectPhase, DateChangeRequest } from './types';
import { INITIAL_USERS, INITIAL_TASKS, INITIAL_CATEGORIES } from './constants';
import { generateId, getRandomColor, storage, getPhaseLabel } from './utils';
import { ConfirmModal, Modal, Button, UserAvatar } from './components/Shared';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loading } from './components/Loading';
import { TaskItem, StatisticsModal } from './components/BusinessModals';

// Lazy load dashboard components for better performance
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const EngineerDashboard = React.lazy(() => import('./components/EngineerDashboard'));

const App = () => {
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = storage.get<User[] | null>('connector_users', null);
    if (savedUsers) {
      // Basic migration check
      if (savedUsers.length > 0 && (savedUsers[0] as any).email) {
        return savedUsers.map((u: any) => ({
          ...u,
          employeeId: u.email.split('@')[0],
          email: undefined 
        }));
      }
      return savedUsers;
    }
    return INITIAL_USERS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    return storage.get<Category[]>('connector_categories', INITIAL_CATEGORIES);
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = storage.get<Task[] | null>('connector_tasks', null);
    let parsedTasks: Task[] = savedTasks ? savedTasks : INITIAL_TASKS;
    
    // Migration: If task has no categoryId, assign the first available category
    const defaultCatId = INITIAL_CATEGORIES[0].id;

    // Migration for Phase names
    const phaseMap: Record<string, ProjectPhase> = {
      'RFQ': 'P1',
      'DESIGN': 'P2',
      'TOOLING': 'P3',
      'VALIDATION': 'P3',
      'SOP': 'P4'
    };

    parsedTasks = parsedTasks.map(t => {
       let updates: any = {};
       
       if (!t.categoryId) {
         updates.categoryId = defaultCatId;
       }

       if (phaseMap[t.phase as string]) {
         updates.phase = phaseMap[t.phase as string];
       }

       if (Object.keys(updates).length > 0) {
         return { ...t, ...updates };
       }
       return t;
    });
    
    return parsedTasks;
  });

  // Project Owners State: Record<PartNumber, UserId>
  const [projectOwners, setProjectOwners] = useState<Record<string, string>>(() => {
    return storage.get<Record<string, string>>('connector_project_owners', {});
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // View Control: 'DASHBOARD' | 'TASKS' | 'PROJECT'
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'TASKS' | 'PROJECT'>('TASKS');
  const [selectedPartNumber, setSelectedPartNumber] = useState<string | null>(null);
  const [expandedProjectPhase, setExpandedProjectPhase] = useState<ProjectPhase | null>(null);

  // Statistics Modal State
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsType, setStatsType] = useState<'SCHEDULE' | 'DESIGN' | 'CHANGE'>('SCHEDULE');

  const [pendingImportData, setPendingImportData] = useState<{users: User[], tasks: Task[]} | null>(null);

  // Login Screen State
  const [loginSearch, setLoginSearch] = useState('');

  // Password Protection State
  const [requireAdminPassword, setRequireAdminPassword] = useState(() => storage.get<boolean>('require_admin_password', false));
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Persistence with safe storage helper
  useEffect(() => {
    storage.set('connector_users', users);
  }, [users]);

  useEffect(() => {
    storage.set('connector_tasks', tasks);
  }, [tasks]);

  useEffect(() => {
    storage.set('connector_categories', categories);
  }, [categories]);

  useEffect(() => {
    storage.set('require_admin_password', requireAdminPassword);
  }, [requireAdminPassword]);

  useEffect(() => {
    storage.set('connector_project_owners', projectOwners);
  }, [projectOwners]);

  // Handle default view on login
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'ADMIN') {
        setCurrentView('DASHBOARD');
      } else {
        setCurrentView('TASKS');
      }
    }
  }, [currentUser]);
  
  // Reset expanded phase when switching projects
  useEffect(() => {
    setExpandedProjectPhase(null);
  }, [selectedPartNumber]);

  // Filter Users for Login Screen
  const filteredLoginUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(loginSearch.toLowerCase()) || 
        user.employeeId.toLowerCase().includes(loginSearch.toLowerCase());
      
      return matchesSearch;
    }).sort((a, b) => a.employeeId.localeCompare(b.employeeId)); // Auto sort by Employee ID
  }, [users, loginSearch]);
  
  // Calculate unique Project Part Numbers based on user visibility
  const partNumbers = useMemo(() => {
    if (!currentUser) return [];

    const pns = new Set<string>();
    
    // Admin sees all projects
    // Engineers/Assistants only see projects they are assigned to
    const visibleTasks = currentUser.role === 'ADMIN' 
      ? tasks 
      : tasks.filter(t => t.userId === currentUser.id);

    visibleTasks.forEach(t => {
      if (t.partNumber) pns.add(t.partNumber);
    });
    
    return Array.from(pns).sort();
  }, [tasks, currentUser]);

  // --- Actions ---

  const handleLoginSelect = (user: User) => {
    if (user.role === 'ADMIN' && requireAdminPassword) {
      setPasswordModalUser(user);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setCurrentUser(user);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordModalUser) {
      const correctPassword = passwordModalUser.password || '';
      
      if (passwordInput === correctPassword) {
        setCurrentUser(passwordModalUser);
        setPasswordModalUser(null);
      } else {
        setPasswordError('密碼錯誤，請重試。');
      }
    }
  };

  const handleAddUser = (userData: Omit<User, 'id' | 'avatarColor'>) => {
    const newUser: User = {
      ...userData,
      id: generateId(),
      avatarColor: getRandomColor()
    };
    setUsers([...users, newUser]);
  };

  const handleUpdateUser = (id: string, userData: Partial<User>) => {
    setUsers(users.map(u => u.id === id ? { ...u, ...userData } : u));
  };

  const handleRemoveUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
  };

  const handleAddCategory = (name: string, suggestedHours: number, note?: string, icon?: string) => {
    const newCat: Category = {
      id: generateId(),
      name,
      suggestedHours,
      note,
      icon
    };
    setCategories([...categories, newCat]);
  };

  const handleUpdateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  const handleReorderCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
  };

  const handleAddTask = (taskData: any) => {
    if (!currentUser) return;
    const newTask: Task = {
      ...taskData,
      id: generateId(),
      userId: taskData.userId || currentUser.id, // Use provided userId (Admin assignment) or current user
      status: 'TODO',
      logs: [],
      actualHours: 0
    };
    // Use functional update
    setTasks(prev => [newTask, ...prev]);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    // Use functional update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  };

  const handleDeleteTask = (taskId: string) => {
    // Use functional update
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  const handleTransferTask = (taskId: string, newUserId: string, fromUserId: string) => {
    // Use functional update
    setTasks(prev => prev.map(t => t.id === taskId ? { 
      ...t, 
      userId: newUserId,
      transferredFrom: fromUserId 
    } : t));
  };

  const handleDismissAlert = (taskId: string) => {
    // Use functional update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, transferredFrom: undefined } : t));
  };

  const handleAddLog = (taskId: string, logData: { content: string, hoursSpent: number }) => {
    const newLog: TaskLog = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      ...logData
    };
    
    // Use functional update
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        // If adding log and task is not started/in_progress, start it and set startDate
        const updates: Partial<Task> = {
          actualHours: t.actualHours + logData.hoursSpent,
          logs: [newLog, ...t.logs],
          status: 'IN_PROGRESS' 
        };
        
        if (!t.startDate) {
            updates.startDate = new Date().toISOString().split('T')[0];
        }
        
        return {
          ...t,
          ...updates
        };
      }
      return t;
    }));
  };

  // --- Approval System Actions ---
  const handleRequestDateChange = (taskId: string, request: DateChangeRequest) => {
    // Use functional update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, pendingChange: request } : t));
  };

  const handleApproveDateChange = (taskId: string) => {
    // Use functional update
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.pendingChange) {
        return {
          ...t,
          receiveDate: t.pendingChange.newReceiveDate,
          deadline: t.pendingChange.newDeadline,
          pendingChange: undefined // Clear request
        };
      }
      return t;
    }));
  };

  const handleRejectDateChange = (taskId: string) => {
    // Use functional update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, pendingChange: undefined } : t));
  };
  
  // --- Project Owner Action ---
  const handleUpdateProjectOwner = (partNumber: string, userId: string) => {
     setProjectOwners(prev => ({
        ...prev,
        [partNumber]: userId
     }));
  };

  // --- Export / Import Logic ---
  
  const handleExportData = () => {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      users,
      tasks
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todo_list_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (!parsed.users || !parsed.tasks) {
          alert("錯誤：檔案格式不正確");
          return;
        }
        
        setPendingImportData({ users: parsed.users, tasks: parsed.tasks });
      } catch (err) {
        alert("錯誤：無法解析檔案");
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (pendingImportData) {
      setUsers(pendingImportData.users);
      setTasks(pendingImportData.tasks);
      setPendingImportData(null);
      alert("資料匯入成功！");
    }
  };

  // --- View: Login Screen ---
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center text-blue-600 mb-4 shadow-sm ring-4 ring-blue-50/50">
              <Car className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">To-Do List</h1>
            <p className="text-slate-500 mt-1">請選擇您的身份登入系統</p>
          </div>

          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="搜尋姓名或工號..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={loginSearch}
                onChange={(e) => setLoginSearch(e.target.value)}
              />
            </div>

            {/* User Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {filteredLoginUsers.length > 0 ? (
                filteredLoginUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleLoginSelect(user)}
                    className="flex items-center p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left relative overflow-hidden"
                  >
                    <UserAvatar user={user} size="md" className="mr-3" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 group-hover:text-blue-700 truncate">{user.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Badge className="w-3 h-3 shrink-0" /> {user.employeeId}
                        {user.role === 'ADMIN' && requireAdminPassword && <Lock className="w-3 h-3 text-slate-400 ml-1" />}
                      </div>
                    </div>
                    {/* Role Badge (Mini) */}
                    <div className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                       <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-full py-8 text-slate-400 flex flex-col items-center">
                  <Users className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">找不到符合的使用者</p>
                </div>
              )}
            </div>
            
            <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
               共顯示 {filteredLoginUsers.length} 位成員
            </div>
          </div>
        </div>

        {/* Login Password Modal */}
        {passwordModalUser && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                       <Lock className="w-5 h-5 text-slate-500" /> 管理員驗證
                    </h3>
                    <button onClick={() => setPasswordModalUser(null)} className="text-slate-400 hover:text-slate-600">
                       <X className="w-5 h-5" />
                    </button>
                 </div>
                 <div className="mb-4">
                    <p className="text-sm text-slate-600 mb-4">
                       請輸入 <strong>{passwordModalUser.name}</strong> 的登入密碼：
                    </p>
                    <form onSubmit={handlePasswordSubmit}>
                       <input 
                         autoFocus
                         type="password" 
                         className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                         placeholder="密碼"
                         value={passwordInput}
                         onChange={e => setPasswordInput(e.target.value)}
                       />
                       {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
                       <div className="flex justify-end gap-2 mt-4">
                          <Button variant="secondary" onClick={() => setPasswordModalUser(null)}>取消</Button>
                          <Button type="submit">確認登入</Button>
                       </div>
                    </form>
                 </div>
              </div>
           </div>
        )}
      </div>
    );
  }

  // --- View: Main Application ---
  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
        {/* Sidebar */}
        <aside className="bg-white w-full md:w-64 border-b md:border-r border-slate-200 flex-shrink-0">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Car className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-900">To-Do List</span>
          </div>
          
          <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
            <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Menu</div>
            <button 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'DASHBOARD' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setCurrentView('DASHBOARD')}
            >
              <Gauge className="w-4 h-4" /> 總覽儀表板
            </button>
            
            {/* My Tasks Button - Hidden for Admins */}
            {currentUser.role !== 'ADMIN' && (
              <button 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'TASKS' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setCurrentView('TASKS')}
              >
                <Wrench className="w-4 h-4" /> 我的任務
              </button>
            )}

            {/* Admin Statistics Center */}
            {currentUser.role === 'ADMIN' && (
               <>
                 <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4">統計監控中心</div>
                 <button 
                    onClick={() => { setStatsType('SCHEDULE'); setIsStatsModalOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors group"
                 >
                    <Calendar className="w-4 h-4 text-slate-400 group-hover:text-blue-500" /> 日程達成率
                 </button>
                 <button 
                    onClick={() => { setStatsType('DESIGN'); setIsStatsModalOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors group"
                 >
                    <Target className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" /> 設計成功率
                 </button>
                 <button 
                    onClick={() => { setStatsType('CHANGE'); setIsStatsModalOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-orange-600 rounded-lg transition-colors group"
                 >
                    <RotateCcw className="w-4 h-4 text-slate-400 group-hover:text-orange-500" /> 設計變更統計
                 </button>
               </>
            )}

            {/* Project Part Numbers Section */}
            {partNumbers.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4">專案品號</div>
                <div className="space-y-1">
                  {partNumbers.map(pn => {
                    // Find owner for this project
                    const ownerId = projectOwners[pn];
                    const ownerName = users.find(u => u.id === ownerId)?.name || '未指派';

                    return (
                      <button 
                        key={pn}
                        className={`w-full flex items-start gap-3 px-4 py-2 text-sm font-medium transition-colors ${currentView === 'PROJECT' && selectedPartNumber === pn ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        onClick={() => {
                          setCurrentView('PROJECT');
                          setSelectedPartNumber(pn);
                        }}
                      >
                        <Tag className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="text-left leading-tight">
                           <div className="font-bold">{pn}</div>
                           <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                              {ownerName}
                           </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="p-4 mt-auto border-t border-slate-100">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <UserAvatar user={currentUser} size="sm" />
              <div className="overflow-hidden">
                <div className="font-bold text-sm text-slate-900 truncate">{currentUser.name}</div>
                <div className="text-xs text-slate-500 truncate">{currentUser.employeeId}</div>
              </div>
            </div>
            <button 
              onClick={() => setCurrentUser(null)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" /> 登出系統
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <Suspense fallback={<Loading />}>
              {currentView === 'DASHBOARD' && (
                <AdminDashboard 
                  currentUser={currentUser}
                  users={users} 
                  tasks={tasks}
                  categories={categories}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onRemoveUser={handleRemoveUser}
                  onImportData={handleImportData}
                  onExportData={handleExportData}
                  onTransferTask={handleTransferTask}
                  onDismissAlert={handleDismissAlert}
                  onAddTask={handleAddTask}
                  onAddCategory={handleAddCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                  onReorderCategories={handleReorderCategories}
                  // Approval Props
                  onApproveDateChange={handleApproveDateChange}
                  onRejectDateChange={handleRejectDateChange}
                  // Password Settings
                  requireAdminPassword={requireAdminPassword}
                  onTogglePasswordRequirement={setRequireAdminPassword}
                  // Total List Management (New)
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  // New Project Owner Management for Batch
                  onUpdateProjectOwner={handleUpdateProjectOwner}
                />
              )}
              {currentView === 'TASKS' && (
                <EngineerDashboard 
                  user={currentUser} 
                  tasks={tasks} 
                  users={users}
                  categories={categories}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onAddLog={handleAddLog}
                  onDeleteTask={handleDeleteTask}
                  onTransferTask={handleTransferTask}
                  onDismissAlert={handleDismissAlert}
                  // Approval Props
                  onRequestDateChange={handleRequestDateChange}
                />
              )}
              {currentView === 'PROJECT' && selectedPartNumber && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            <Tag className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h1 className="text-2xl font-bold text-slate-900">專案品號: {selectedPartNumber}</h1>
                            <p className="text-slate-500">專案階段概況與任務清單</p>
                          </div>
                        </div>

                        {/* Project Owner Selection (Admin Only or Read Only) */}
                        <div className="bg-white p-2 pl-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                           <UserIcon className="w-4 h-4 text-slate-400" />
                           <span className="text-xs font-bold text-slate-500">專案負責人:</span>
                           
                           {currentUser.role === 'ADMIN' ? (
                             <select 
                                className="bg-transparent text-sm font-bold text-blue-700 outline-none cursor-pointer hover:bg-slate-50 rounded px-1"
                                value={projectOwners[selectedPartNumber] || ''}
                                onChange={(e) => handleUpdateProjectOwner(selectedPartNumber, e.target.value)}
                             >
                                <option value="">-- 未指派 --</option>
                                {users.map(u => (
                                  <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>
                                ))}
                             </select>
                           ) : (
                             <span className="text-sm font-bold text-slate-700 px-1">
                                {users.find(u => u.id === projectOwners[selectedPartNumber])?.name || '未指派'}
                             </span>
                           )}
                        </div>
                      </div>

                      <div className="space-y-4">
                         {(['P1', 'P2', 'P3', 'P4', 'P5'] as ProjectPhase[]).map(phase => {
                            const phaseTasks = tasks.filter(t => t.partNumber === selectedPartNumber && t.phase === phase);
                            const hasTasks = phaseTasks.length > 0;
                            const isExpanded = expandedProjectPhase === phase;
                            
                            const completedCount = phaseTasks.filter(t => t.status === 'DONE').length;
                            const isAllCompleted = hasTasks && completedCount === phaseTasks.length;
                            
                            // Visual Styles
                            let cardClass = "bg-white border-slate-200 hover:border-blue-300";
                            let iconClass = "text-slate-400 bg-slate-100";
                            let titleClass = "text-slate-700";

                            if (hasTasks) {
                                if (isAllCompleted) {
                                   cardClass = "bg-emerald-50 border-emerald-200 hover:border-emerald-300";
                                   iconClass = "text-emerald-600 bg-emerald-100";
                                   titleClass = "text-emerald-800 font-bold";
                                } else {
                                   cardClass = "bg-white border-l-4 border-l-blue-500 shadow-sm hover:shadow-md border-y border-r border-slate-200";
                                   iconClass = "text-blue-600 bg-blue-50";
                                   titleClass = "text-blue-700 font-bold";
                                }
                            } else {
                                cardClass = "bg-slate-50 border-slate-100 opacity-70";
                            }

                            return (
                               <div key={phase} className="rounded-xl overflow-hidden transition-all duration-300">
                                   <div 
                                     onClick={() => hasTasks && setExpandedProjectPhase(isExpanded ? null : phase)}
                                     className={`p-4 flex items-center justify-between cursor-pointer border ${cardClass} rounded-xl`}
                                   >
                                      <div className="flex items-center gap-4">
                                         <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconClass}`}>
                                            {isAllCompleted ? <CheckCircle2 className="w-5 h-5" /> : <PieChart className="w-5 h-5" />}
                                         </div>
                                         <div>
                                            <h3 className={`text-base ${titleClass}`}>
                                               {getPhaseLabel(phase)}
                                            </h3>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                               {hasTasks 
                                                 ? `${phaseTasks.length} 個任務 (${completedCount} 完成)` 
                                                 : '無任務'}
                                            </div>
                                         </div>
                                      </div>

                                      {hasTasks && (
                                        <div className="text-slate-400">
                                           {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                        </div>
                                      )}
                                      {!hasTasks && <FolderOpen className="w-5 h-5 text-slate-300" />}
                                   </div>

                                   {isExpanded && hasTasks && (
                                      <div className="mt-2 pl-4 pr-1 pb-2 space-y-2 animate-in slide-in-from-top-2 fade-in duration-300 border-l-2 border-slate-200 ml-6">
                                         {phaseTasks
                                            .sort((a,b) => new Date(b.receiveDate).getTime() - new Date(a.receiveDate).getTime())
                                            .map(task => (
                                              <TaskItem 
                                                key={task.id} 
                                                task={task} 
                                                categories={categories}
                                                showOwner={true}
                                                users={users}
                                              />
                                            ))
                                         }
                                      </div>
                                   )}
                               </div>
                            );
                         })}
                      </div>
                  </div>
              )}
            </Suspense>

            {/* Global Statistics Modal */}
            <StatisticsModal
               isOpen={isStatsModalOpen}
               onClose={() => setIsStatsModalOpen(false)}
               initialType={statsType}
               tasks={tasks}
               users={users}
               categories={categories}
            />
          </div>
        </main>

        <ConfirmModal 
          isOpen={!!pendingImportData}
          onClose={() => setPendingImportData(null)}
          onConfirm={confirmImport}
          title="確認匯入資料"
          message={
            <div className="space-y-2">
              <p>您即將匯入新的資料檔案。這將會：</p>
              <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                <li><strong>覆蓋</strong> 目前系統中所有的成員與任務資料。</li>
                <li>若是從雲端硬碟讀取，這將同步成最新的版本。</li>
              </ul>
              <p className="font-bold text-slate-800 mt-2">請確認您已備份目前的資料，或確定要執行此操作？</p>
            </div>
          }
          confirmText="確認覆蓋匯入"
          isDanger={true}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;
