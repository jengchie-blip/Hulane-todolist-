import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, ArrowRightLeft, CheckCircle2, Trash2, Plus, 
  ArrowUp, ArrowDown, Info, Search, X, Pencil, Save, ScrollText, 
  Settings, Microscope, Tag, PenTool, Calendar, Clock, RotateCcw,
  User as UserIcon, BarChart3, Battery, BatteryWarning, BatteryCharging,
  Briefcase, Zap, PieChart, TrendingUp, Target, Activity, FileCheck,
  Filter, Copy, Download, Share2, ChevronDown, ChevronRight, Flag
} from 'lucide-react';
import { User, Task, Role, TaskPriority, ProjectPhase, Category, TaskLog, DateChangeRequest, PerformanceLevel } from '../types';
import { Button, Modal, ConfirmModal, StatusBadge, getIconComponent, UserAvatar, CATEGORY_ICONS, USER_AVATAR_ICONS, Card } from './Shared';
import { getPhaseLabel, getStatusLabel, generateId, getPriorityColor, calculateTaskScore, evaluateUserPerformance, getPerformanceDetails, getStatusColor } from '../utils';
import { AVATAR_COLORS } from '../constants';

const CHANGE_CATEGORY_OPTIONS = [
  "設計預留",
  "設計錯誤",
  "圖面誤記",
  "尺寸設計調整",
  "客戶需求變更"
];

const CHANGE_ANALYSIS_OPTIONS = [
  "測繪錯誤",
  "未落實設計點檢",
  "規格認知差異",
  "製程限制",
  "其他"
];

export const getCategoryIconComponent = (iconName?: string) => getIconComponent(iconName);

// --- SHARED COMPONENTS ---

export const TaskItem: React.FC<{
  task: Task;
  categories: Category[];
  showOwner?: boolean;
  users?: User[];
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onTransfer?: (task: Task) => void;
  isAdmin?: boolean;
}> = ({ task, categories, showOwner, users, onEdit, onDelete, onTransfer, isAdmin }) => {
  const category = categories.find(c => c.id === task.categoryId);
  const owner = users?.find(u => u.id === task.userId);
  const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'DONE';

  return (
    <div className={`p-3 rounded-lg border bg-white flex flex-col sm:flex-row gap-3 hover:shadow-md transition-shadow ${isOverdue ? 'border-red-200 bg-red-50/10' : 'border-slate-200'}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
           <StatusBadge status={task.status} />
           <span className={`text-[10px] px-1.5 py-0.5 border rounded-full ${getPriorityColor(task.priority)}`}>
              {task.priority}
           </span>
           <span className="font-bold text-slate-800 line-clamp-1">{task.title}</span>
        </div>
        <div className="text-xs text-slate-500 line-clamp-2 mb-2">{task.description}</div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
           <span className="flex items-center gap-1">
              {getCategoryIconComponent(category?.icon)} {category?.name}
           </span>
           {showOwner && owner && (
              <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full">
                 <UserAvatar user={owner} size="sm" className="w-4 h-4 text-[8px]" /> {owner.name}
              </span>
           )}
           <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-bold' : ''}`}>
              <Clock className="w-3 h-3" /> {task.deadline}
           </span>
        </div>
      </div>
      {(onEdit || onDelete || onTransfer) && (
        <div className="flex sm:flex-col gap-1 justify-center border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-2">
           {onEdit && (
             <button onClick={() => onEdit(task)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded">
               <Pencil className="w-4 h-4" />
             </button>
           )}
           {onTransfer && (
             <button onClick={() => onTransfer(task)} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded">
               <ArrowRightLeft className="w-4 h-4" />
             </button>
           )}
           {onDelete && (
             <button onClick={() => onDelete(task.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
               <Trash2 className="w-4 h-4" />
             </button>
           )}
        </div>
      )}
    </div>
  );
};

// --- MODALS ---

export const UserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editingUser?: User | null;
  currentUser?: User; // To check permissions for role editing
}> = ({ isOpen, onClose, onSubmit, editingUser, currentUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    role: 'ENGINEER' as Role,
    avatarIcon: 'user',
    password: '' // For admin only
  });

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name,
        employeeId: editingUser.employeeId,
        role: editingUser.role,
        avatarIcon: editingUser.avatarIcon || 'user',
        password: editingUser.password || ''
      });
    } else {
      setFormData({ name: '', employeeId: '', role: 'ENGINEER', avatarIcon: 'user', password: '' });
    }
  }, [editingUser, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingUser ? '編輯成員' : '新增成員'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
          <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">工號 / ID</label>
          <input required type="text" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full p-2 border rounded-lg" />
        </div>
        
        {/* Only Admin can change role, or creating new user */}
        {(currentUser?.role === 'ADMIN' || !editingUser) && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">角色權限</label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} className="w-full p-2 border rounded-lg">
              <option value="ENGINEER">工程師 (Engineer)</option>
              <option value="ASSISTANT">助理 (Assistant)</option>
              <option value="ADMIN">主管 (Admin)</option>
            </select>
          </div>
        )}

        {/* Password for Admin */}
        {formData.role === 'ADMIN' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">登入密碼 (選填)</label>
            <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="留空則不變更" />
          </div>
        )}

        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">頭像圖示</label>
           <div className="grid grid-cols-7 gap-2 p-2 border rounded-lg bg-slate-50">
              {USER_AVATAR_ICONS.map(icon => (
                 <button
                   type="button"
                   key={icon}
                   onClick={() => setFormData({...formData, avatarIcon: icon})}
                   className={`p-2 rounded-lg flex items-center justify-center hover:bg-white hover:shadow-sm transition-all ${formData.avatarIcon === icon ? 'bg-white shadow ring-2 ring-blue-500' : ''}`}
                 >
                    {getIconComponent(icon, "w-5 h-5 text-slate-600")}
                 </button>
              ))}
           </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button type="submit">儲存</Button>
        </div>
      </form>
    </Modal>
  );
};

export const TaskModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editingTask?: Task | null;
  categories: Category[];
  users?: User[]; // For admin to assign
  currentUser?: User;
  tasks?: Task[]; // For validating dependencies or duplicate checks
  onRequestDateChange?: (taskId: string, req: DateChangeRequest) => void;
}> = ({ isOpen, onClose, onSubmit, editingTask, categories, users, currentUser, onRequestDateChange }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    priority: 'MEDIUM' as TaskPriority,
    phase: 'P2' as ProjectPhase,
    receiveDate: new Date().toISOString().split('T')[0],
    deadline: '',
    estimatedHours: 4,
    userId: '',
    partNumber: '',
    // Design Change Specifics
    changeOrderNumber: '',
    changeCategory: '',
    changeAnalysis: ''
  });
  
  // For Date Change Request
  const [showDateChangeRequest, setShowDateChangeRequest] = useState(false);
  const [dateRequest, setDateRequest] = useState({ newDeadline: '', reason: '' });

  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title,
        description: editingTask.description,
        categoryId: editingTask.categoryId,
        priority: editingTask.priority,
        phase: editingTask.phase,
        receiveDate: editingTask.receiveDate,
        deadline: editingTask.deadline,
        estimatedHours: editingTask.estimatedHours,
        userId: editingTask.userId,
        partNumber: editingTask.partNumber || '',
        changeOrderNumber: editingTask.changeOrderNumber || '',
        changeCategory: editingTask.changeCategory || '',
        changeAnalysis: editingTask.changeAnalysis || ''
      });
      setShowDateChangeRequest(false);
    } else {
      setFormData({
        title: '',
        description: '',
        categoryId: categories[0]?.id || '',
        priority: 'MEDIUM',
        phase: 'P2',
        receiveDate: new Date().toISOString().split('T')[0],
        deadline: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        estimatedHours: 4,
        userId: currentUser?.id || '',
        partNumber: '',
        changeOrderNumber: '',
        changeCategory: '',
        changeAnalysis: ''
      });
    }
  }, [editingTask, isOpen, categories, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Logic: If user is Engineer and task is overdue or edit mode with date change, they might need request
    // But simplified: onSubmit handles data update. Date change request is separate action.
    
    if (showDateChangeRequest && editingTask && onRequestDateChange) {
       onRequestDateChange(editingTask.id, {
          newReceiveDate: formData.receiveDate, // Keep receive date
          newDeadline: dateRequest.newDeadline,
          reason: dateRequest.reason,
          requesterId: currentUser?.id || '',
          requestedAt: new Date().toISOString()
       });
       onClose();
       return;
    }

    onSubmit(formData);
    onClose();
  };
  
  const isDesignChange = formData.changeOrderNumber || categories.find(c => c.id === formData.categoryId)?.name.includes('變更');

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTask ? '編輯任務' : '新增任務'} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Core Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="col-span-1 md:col-span-2">
             <label className="block text-sm font-medium text-slate-700 mb-1">任務標題</label>
             <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="例如：Type-C 連接器結構設計" />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">專案品號 (Part No.)</label>
             <input type="text" value={formData.partNumber} onChange={e => setFormData({...formData, partNumber: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="例如：805-0023-01" />
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">工作類別</label>
              <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full p-2 border rounded-lg">
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.suggestedHours}h)</option>
                ))}
              </select>
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">優先級</label>
              <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as TaskPriority})} className="w-full p-2 border rounded-lg">
                <option value="HIGH">高 (High)</option>
                <option value="MEDIUM">中 (Medium)</option>
                <option value="LOW">低 (Low)</option>
              </select>
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">專案階段</label>
              <select value={formData.phase} onChange={e => setFormData({...formData, phase: e.target.value as ProjectPhase})} className="w-full p-2 border rounded-lg">
                 <option value="P1">P1 (提案)</option>
                 <option value="P2">P2 (設計)</option>
                 <option value="P3">P3 (驗證)</option>
                 <option value="P4">P4 (結案)</option>
                 <option value="P5">P5 (變更)</option>
              </select>
           </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">接收日期</label>
             <input type="date" required value={formData.receiveDate} onChange={e => setFormData({...formData, receiveDate: e.target.value})} className="w-full p-2 border rounded-lg" />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">截止期限</label>
             {editingTask && currentUser?.role === 'ENGINEER' && !showDateChangeRequest ? (
                <div className="flex gap-2">
                   <div className="p-2 bg-slate-100 rounded-lg flex-1 text-slate-600 border border-slate-200">{formData.deadline}</div>
                   <button type="button" onClick={() => setShowDateChangeRequest(true)} className="px-2 py-1 text-xs bg-orange-100 text-orange-600 rounded border border-orange-200 hover:bg-orange-200">申請延期</button>
                </div>
             ) : (
                <input type="date" required value={showDateChangeRequest ? dateRequest.newDeadline : formData.deadline} onChange={e => showDateChangeRequest ? setDateRequest({...dateRequest, newDeadline: e.target.value}) : setFormData({...formData, deadline: e.target.value})} className={`w-full p-2 border rounded-lg ${showDateChangeRequest ? 'border-orange-400 bg-orange-50' : ''}`} />
             )}
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">預估工時 (Hr)</label>
             <input type="number" min="0.5" step="0.5" required value={formData.estimatedHours} onChange={e => setFormData({...formData, estimatedHours: parseFloat(e.target.value)})} className="w-full p-2 border rounded-lg" />
           </div>
        </div>
        
        {/* Date Change Request Reason */}
        {showDateChangeRequest && (
           <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-bold text-orange-700 mb-1">延期原因說明</label>
              <textarea required value={dateRequest.reason} onChange={e => setDateRequest({...dateRequest, reason: e.target.value})} className="w-full p-2 border border-orange-200 rounded-lg text-sm" placeholder="請說明需要延期的原因..." />
           </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">任務描述</label>
          <textarea required rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border rounded-lg resize-none" />
        </div>

        {/* Admin Assignment */}
        {currentUser?.role === 'ADMIN' && users && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">指派人員</label>
            <select value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})} className="w-full p-2 border rounded-lg">
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>
              ))}
            </select>
          </div>
        )}
        
        {/* Design Change Specific Fields */}
        {(isDesignChange || formData.phase === 'P5') && (
           <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                 <FileCheck className="w-4 h-4" /> 設變專用欄位
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">設變單號 (ECN)</label>
                    <input type="text" value={formData.changeOrderNumber} onChange={e => setFormData({...formData, changeOrderNumber: e.target.value})} className="w-full p-2 border rounded bg-white text-sm" placeholder="ECN-2024-..." />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">變更分類</label>
                    <select value={formData.changeCategory} onChange={e => setFormData({...formData, changeCategory: e.target.value})} className="w-full p-2 border rounded bg-white text-sm">
                       <option value="">-- 請選擇 --</option>
                       {CHANGE_CATEGORY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                 </div>
                 <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">原因分析</label>
                    <div className="flex gap-2 mb-2 flex-wrap">
                       {CHANGE_ANALYSIS_OPTIONS.map(opt => (
                          <button 
                             key={opt} type="button" 
                             onClick={() => setFormData({...formData, changeAnalysis: opt})}
                             className={`px-2 py-1 rounded text-xs border ${formData.changeAnalysis === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
                          >
                             {opt}
                          </button>
                       ))}
                    </div>
                    <input type="text" value={formData.changeAnalysis} onChange={e => setFormData({...formData, changeAnalysis: e.target.value})} className="w-full p-2 border rounded bg-white text-sm" placeholder="輸入原因分析..." />
                 </div>
              </div>
           </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button type="submit">{showDateChangeRequest ? '送出申請' : '儲存任務'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export const CategoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAddCategory: (name: string, hours: number, note?: string, icon?: string) => void;
  onUpdateCategory: (id: string, data: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onReorderCategories: (cats: Category[]) => void;
}> = ({ isOpen, onClose, categories, onAddCategory, onUpdateCategory, onDeleteCategory }) => {
  const [newCat, setNewCat] = useState({ name: '', hours: 0, note: '', icon: 'layers' });
  
  const handleAdd = () => {
    if (newCat.name && newCat.hours > 0) {
      onAddCategory(newCat.name, newCat.hours, newCat.note, newCat.icon);
      setNewCat({ name: '', hours: 0, note: '', icon: 'layers' });
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="管理任務類別" maxWidth="max-w-4xl">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Add New */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-fit">
             <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Plus className="w-4 h-4"/> 新增類別</h3>
             <div className="space-y-3">
                <input placeholder="類別名稱 (如: 機構設計)" className="w-full p-2 border rounded" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} />
                <input type="number" placeholder="建議工時 (Hr)" className="w-full p-2 border rounded" value={newCat.hours || ''} onChange={e => setNewCat({...newCat, hours: parseFloat(e.target.value)})} />
                <textarea placeholder="備註說明 (SOP提示)" className="w-full p-2 border rounded h-20 text-sm" value={newCat.note} onChange={e => setNewCat({...newCat, note: e.target.value})} />
                
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">選擇圖示</label>
                  <div className="grid grid-cols-6 gap-2 bg-white p-2 rounded border">
                     {CATEGORY_ICONS.map(icon => (
                        <button key={icon} onClick={() => setNewCat({...newCat, icon})} className={`p-2 rounded hover:bg-slate-100 flex justify-center ${newCat.icon === icon ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-300' : 'text-slate-400'}`}>
                           {getIconComponent(icon)}
                        </button>
                     ))}
                  </div>
                </div>

                <Button onClick={handleAdd} disabled={!newCat.name} className="w-full">新增</Button>
             </div>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
             {categories.map(cat => (
               <div key={cat.id} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col gap-2 group">
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                           {getIconComponent(cat.icon)}
                        </div>
                        <div>
                           <div className="font-bold text-slate-800">{cat.name}</div>
                           <div className="text-xs text-slate-500">{cat.suggestedHours} hours</div>
                        </div>
                     </div>
                     <button onClick={() => onDeleteCategory(cat.id)} className="text-slate-300 hover:text-red-500 p-1">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                  {cat.note && <div className="text-xs bg-slate-50 p-2 rounded text-slate-600">{cat.note}</div>}
               </div>
             ))}
          </div>
       </div>
    </Modal>
  );
};

export const TransferModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => void;
  users: User[];
  taskTitle: string;
}> = ({ isOpen, onClose, onConfirm, users, taskTitle }) => {
  const [selectedUser, setSelectedUser] = useState(users[0]?.id || '');

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="轉派任務">
       <div className="space-y-4">
          <p className="text-slate-600">
             您即將轉派任務 <strong>{taskTitle}</strong> 給其他成員。
          </p>
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">選擇接收人員</label>
             <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full p-2 border rounded-lg">
                {users.map(u => (
                   <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
             </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
             <Button variant="secondary" onClick={onClose}>取消</Button>
             <Button onClick={() => { onConfirm(selectedUser); onClose(); }}>確認轉派</Button>
          </div>
       </div>
    </Modal>
  );
};

export const LogModal: React.FC<{
   isOpen: boolean;
   onClose: () => void;
   onSubmit: (data: { content: string, hoursSpent: number }) => void;
   taskTitle: string;
}> = ({ isOpen, onClose, onSubmit, taskTitle }) => {
   const [content, setContent] = useState('');
   const [hours, setHours] = useState(1);

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit({ content, hoursSpent: hours });
      setContent('');
      setHours(1);
      onClose();
   };

   if (!isOpen) return null;

   return (
      <Modal isOpen={isOpen} onClose={onClose} title="填寫工作日誌">
         <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-sm text-slate-500 bg-slate-50 p-2 rounded">
               任務: {taskTitle}
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">今日進度說明</label>
               <textarea required className="w-full p-2 border rounded-lg h-32" value={content} onChange={e => setContent(e.target.value)} placeholder="完成了什麼..." />
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">投入工時 (Hr)</label>
               <input type="number" min="0.5" step="0.5" required className="w-full p-2 border rounded-lg" value={hours} onChange={e => setHours(parseFloat(e.target.value))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
               <Button variant="secondary" onClick={onClose}>取消</Button>
               <Button type="submit">提交日誌</Button>
            </div>
         </form>
      </Modal>
   );
};

export const ReportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  tasks: Task[];
  categories: Category[];
}> = ({ isOpen, onClose, currentUser, users, tasks, categories }) => {
  if (!isOpen) return null;

  // Simple Report Logic
  const reportUsers = currentUser.role === 'ADMIN' ? users : [currentUser];
  const dateStr = new Date().toISOString().split('T')[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="工時報表預覽" maxWidth="max-w-4xl">
       <div className="space-y-6">
          <div className="flex justify-between items-center">
             <h3 className="font-bold text-lg text-slate-800">日期: {dateStr}</h3>
             <Button variant="secondary" onClick={() => alert('報表已匯出 CSV (模擬)')}>
                <Download className="w-4 h-4" /> 匯出 CSV
             </Button>
          </div>
          
          <div className="border rounded-xl overflow-hidden">
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                   <tr>
                      <th className="p-3">人員</th>
                      <th className="p-3">任務</th>
                      <th className="p-3">今日進度</th>
                      <th className="p-3 text-right">今日工時</th>
                      <th className="p-3 text-right">累積工時</th>
                      <th className="p-3">狀態</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {reportUsers.map(user => {
                      const userTasks = tasks.filter(t => t.userId === user.id);
                      const activeTasks = userTasks.filter(t => t.status === 'IN_PROGRESS' || t.logs.some(l => l.date === dateStr));
                      
                      if (activeTasks.length === 0) return null;

                      return activeTasks.map(task => {
                         const todayLog = task.logs.find(l => l.date === dateStr);
                         return (
                            <tr key={task.id} className="hover:bg-slate-50">
                               <td className="p-3 font-medium">{user.name}</td>
                               <td className="p-3 max-w-xs truncate" title={task.title}>{task.title}</td>
                               <td className="p-3 text-slate-600 max-w-xs truncate">{todayLog?.content || '-'}</td>
                               <td className="p-3 text-right font-mono text-blue-600">{todayLog?.hoursSpent || 0}h</td>
                               <td className="p-3 text-right font-mono text-slate-500">{task.actualHours}h</td>
                               <td className="p-3"><StatusBadge status={task.status} /></td>
                            </tr>
                         );
                      });
                   })}
                   {reportUsers.every(u => !tasks.some(t => t.userId === u.id && (t.status === 'IN_PROGRESS' || t.logs.some(l => l.date === dateStr)))) && (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-400">今日尚無工時記錄</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>
    </Modal>
  );
};

export const UserDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  tasks: Task[];
  onTransferTask?: (task: Task) => void;
  categories: Category[];
}> = ({ isOpen, onClose, user, tasks, onTransferTask, categories }) => {
  if (!isOpen || !user) return null;

  const userTasks = tasks.filter(t => t.userId === user.id);
  const completed = userTasks.filter(t => t.status === 'DONE');
  const active = userTasks.filter(t => t.status !== 'DONE');
  const perf = evaluateUserPerformance(completed);
  const perfDetail = getPerformanceDetails(perf.level);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="成員詳細資訊" maxWidth="max-w-4xl">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                <UserAvatar user={user} size="xl" showShadow className="mb-4" />
                <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
                <div className="text-slate-500 text-sm mb-4">{user.employeeId} • {user.role}</div>
                
                <div className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 ${perfDetail.color} mb-4`}>
                   <TrophyIcon className={`w-5 h-5 ${perfDetail.iconColor}`} />
                   <span className="font-bold">{perfDetail.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full text-sm">
                   <div className="p-2 bg-slate-50 rounded border">
                      <div className="text-slate-500 text-xs">完成任務</div>
                      <div className="font-bold text-lg">{completed.length}</div>
                   </div>
                   <div className="p-2 bg-slate-50 rounded border">
                      <div className="text-slate-500 text-xs">進行中</div>
                      <div className="font-bold text-lg text-blue-600">{active.length}</div>
                   </div>
                </div>
             </div>
          </div>

          <div className="lg:col-span-2 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
             <h3 className="font-bold text-slate-800">當前任務 ({active.length})</h3>
             {active.map(task => (
                <TaskItem 
                   key={task.id} 
                   task={task} 
                   categories={categories} 
                   onTransfer={onTransferTask}
                />
             ))}
             {active.length === 0 && <div className="text-slate-400 text-center py-4">無進行中任務</div>}
          </div>
       </div>
    </Modal>
  );
};

function TrophyIcon({ className }: { className?: string }) {
   return <Target className={className} />;
}

export const OverdueListModal: React.FC<{
   isOpen: boolean;
   onClose: () => void;
   tasks: Task[];
   users: User[];
   categories: Category[];
   onTransferTask?: (task: Task) => void;
}> = ({ isOpen, onClose, tasks, users, categories, onTransferTask }) => {
   const overdueTasks = tasks.filter(t => t.status !== 'DONE' && new Date(t.deadline) < new Date(new Date().setHours(0,0,0,0)));
   
   if (!isOpen) return null;

   return (
      <Modal isOpen={isOpen} onClose={onClose} title={`逾期任務清單 (${overdueTasks.length})`} maxWidth="max-w-4xl">
         <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {overdueTasks.length === 0 ? (
               <div className="text-center py-10 text-emerald-600 bg-emerald-50 rounded-xl">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="font-bold">太棒了！目前沒有逾期任務</p>
               </div>
            ) : (
               overdueTasks.map(task => (
                  <TaskItem 
                     key={task.id} 
                     task={task} 
                     categories={categories} 
                     users={users} 
                     showOwner 
                     onTransfer={onTransferTask}
                  />
               ))
            )}
         </div>
      </Modal>
   );
};

export const GeneralTaskListModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tasks: Task[];
  users: User[];
  categories: Category[];
  onTransferTask?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}> = ({ isOpen, onClose, title, tasks, users, categories, onTransferTask, onEditTask, onDeleteTask }) => {
   if (!isOpen) return null;
   return (
      <Modal isOpen={isOpen} onClose={onClose} title={`${title} (${tasks.length})`} maxWidth="max-w-4xl">
         <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {tasks.length === 0 ? (
               <div className="text-center py-10 text-slate-400">沒有相關任務</div>
            ) : (
               tasks.map(task => (
                  <TaskItem 
                     key={task.id} 
                     task={task} 
                     categories={categories} 
                     users={users} 
                     showOwner 
                     onTransfer={onTransferTask}
                     onEdit={onEditTask}
                     onDelete={onDeleteTask}
                  />
               ))
            )}
         </div>
      </Modal>
   );
};

export const TaskSearchModal: React.FC<{
   isOpen: boolean;
   onClose: () => void;
   tasks: Task[];
   users: User[];
   categories: Category[];
}> = ({ isOpen, onClose, tasks, users, categories }) => {
   const [search, setSearch] = useState('');
   const filtered = tasks.filter(t => 
      t.title.includes(search) || 
      t.description.includes(search) || 
      t.partNumber?.includes(search) ||
      users.find(u => u.id === t.userId)?.name.includes(search)
   );

   if (!isOpen) return null;

   return (
      <Modal isOpen={isOpen} onClose={onClose} title="搜尋任務" maxWidth="max-w-3xl">
         <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
               autoFocus 
               placeholder="輸入關鍵字、品號或人員姓名..." 
               className="w-full pl-10 p-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
               value={search}
               onChange={e => setSearch(e.target.value)}
            />
         </div>
         <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {search && filtered.length === 0 && <div className="text-center py-8 text-slate-400">找不到相符結果</div>}
            {filtered.map(task => (
               <TaskItem key={task.id} task={task} categories={categories} users={users} showOwner />
            ))}
         </div>
      </Modal>
   );
};

export const BatchTaskModal: React.FC<{
   isOpen: boolean;
   onClose: () => void;
   onSubmit: (tasks: any[], partNumber: string, projectOwnerId: string) => void;
   users: User[];
   categories: Category[];
}> = ({ isOpen, onClose, onSubmit, users, categories }) => {
   const [tasksList, setTasksList] = useState<{title: string, categoryId: string, hours: number, userId: string}[]>([
      { title: '', categoryId: categories[0]?.id || '', hours: 4, userId: users[0]?.id || '' }
   ]);
   const [commonData, setCommonData] = useState({
      partNumber: '',
      receiveDate: new Date().toISOString().split('T')[0],
      deadline: '',
      phase: 'P2' as ProjectPhase,
      priority: 'MEDIUM' as TaskPriority,
      projectOwnerId: '' // For assigning project owner
   });

   const handleAddTaskRow = () => {
      setTasksList([...tasksList, { title: '', categoryId: categories[0]?.id || '', hours: 4, userId: users[0]?.id || '' }]);
   };

   const handleRemoveRow = (idx: number) => {
      setTasksList(tasksList.filter((_, i) => i !== idx));
   };

   const handleChangeRow = (idx: number, field: string, value: any) => {
      const newOne = [...tasksList];
      newOne[idx] = { ...newOne[idx], [field]: value };
      setTasksList(newOne);
   };

   const handleSubmit = () => {
      const validTasks = tasksList.filter(t => t.title.trim() !== '');
      const finalTasks = validTasks.map(t => ({
         ...t,
         ...commonData,
         estimatedHours: t.hours,
         description: '批次建立任務',
         status: 'TODO',
         logs: [],
         actualHours: 0
      }));
      onSubmit(finalTasks, commonData.partNumber, commonData.projectOwnerId);
      setTasksList([{ title: '', categoryId: categories[0]?.id || '', hours: 4, userId: users[0]?.id || '' }]);
      onClose();
   };

   if (!isOpen) return null;

   return (
      <Modal isOpen={isOpen} onClose={onClose} title="批次建立任務" maxWidth="max-w-5xl">
         <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                  <label className="text-xs font-bold text-slate-500">專案品號</label>
                  <input className="w-full p-2 border rounded" value={commonData.partNumber} onChange={e => setCommonData({...commonData, partNumber: e.target.value})} placeholder="例如 805-xxxx" />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500">專案負責人 (PM/Lead)</label>
                  <select className="w-full p-2 border rounded" value={commonData.projectOwnerId} onChange={e => setCommonData({...commonData, projectOwnerId: e.target.value})}>
                     <option value="">-- 不指定 --</option>
                     {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500">截止日期</label>
                  <input type="date" className="w-full p-2 border rounded" value={commonData.deadline} onChange={e => setCommonData({...commonData, deadline: e.target.value})} />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500">階段</label>
                  <select className="w-full p-2 border rounded" value={commonData.phase} onChange={e => setCommonData({...commonData, phase: e.target.value as ProjectPhase})}>
                     {['P1','P2','P3','P4','P5'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500">優先級</label>
                  <select className="w-full p-2 border rounded" value={commonData.priority} onChange={e => setCommonData({...commonData, priority: e.target.value as TaskPriority})}>
                     {['HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
               </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto border rounded-xl">
               <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10">
                     <tr>
                        <th className="p-2 w-8">#</th>
                        <th className="p-2">任務標題</th>
                        <th className="p-2 w-40">類別</th>
                        <th className="p-2 w-24">工時</th>
                        <th className="p-2 w-32">指派給</th>
                        <th className="p-2 w-10"></th>
                     </tr>
                  </thead>
                  <tbody>
                     {tasksList.map((row, idx) => (
                        <tr key={idx} className="border-b">
                           <td className="p-2 text-center text-slate-400">{idx+1}</td>
                           <td className="p-2"><input className="w-full p-1 border rounded" value={row.title} onChange={e => handleChangeRow(idx, 'title', e.target.value)} /></td>
                           <td className="p-2">
                              <select className="w-full p-1 border rounded" value={row.categoryId} onChange={e => handleChangeRow(idx, 'categoryId', e.target.value)}>
                                 {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                           </td>
                           <td className="p-2"><input type="number" className="w-full p-1 border rounded" value={row.hours} onChange={e => handleChangeRow(idx, 'hours', parseFloat(e.target.value))} /></td>
                           <td className="p-2">
                              <select className="w-full p-1 border rounded" value={row.userId} onChange={e => handleChangeRow(idx, 'userId', e.target.value)}>
                                 {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                              </select>
                           </td>
                           <td className="p-2 text-center">
                              {tasksList.length > 1 && (
                                 <button onClick={() => handleRemoveRow(idx)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                              )}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
            
            <div className="flex justify-between">
               <Button variant="secondary" onClick={handleAddTaskRow}><Plus className="w-4 h-4"/> 新增一行</Button>
               <div className="flex gap-2">
                  <Button variant="secondary" onClick={onClose}>取消</Button>
                  <Button onClick={handleSubmit}>建立任務</Button>
               </div>
            </div>
         </div>
      </Modal>
   );
};

export const ApprovalListModal: React.FC<{
   isOpen: boolean;
   onClose: () => void;
   tasks: Task[];
   users: User[];
   onApprove: (taskId: string) => void;
   onReject: (taskId: string) => void;
}> = ({ isOpen, onClose, tasks, users, onApprove, onReject }) => {
   const pendingTasks = tasks.filter(t => t.pendingChange);

   if (!isOpen) return null;

   return (
      <Modal isOpen={isOpen} onClose={onClose} title="待簽核項目 (日期變更申請)" maxWidth="max-w-4xl">
         <div className="space-y-4">
            {pendingTasks.length === 0 ? (
               <div className="text-center py-8 text-slate-400">目前沒有待簽核項目</div>
            ) : (
               pendingTasks.map(task => {
                  const requester = users.find(u => u.id === task.pendingChange?.requesterId);
                  return (
                     <div key={task.id} className="p-4 rounded-xl border border-orange-200 bg-orange-50 flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                              <span className="bg-orange-200 text-orange-800 text-xs px-2 py-0.5 rounded-full font-bold">日期變更</span>
                              <span className="font-bold text-slate-800">{task.title}</span>
                              <span className="text-xs text-slate-500">by {requester?.name}</span>
                           </div>
                           <div className="text-sm text-slate-600 mb-2">原因: {task.pendingChange?.reason}</div>
                           <div className="flex gap-4 text-sm">
                              <div className="line-through text-slate-400">原: {task.deadline}</div>
                              <div className="font-bold text-orange-600">新: {task.pendingChange?.newDeadline}</div>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <Button variant="secondary" onClick={() => onReject(task.id)} className="text-red-600 hover:bg-red-50 border-red-200">駁回</Button>
                           <Button onClick={() => onApprove(task.id)} className="bg-emerald-600 hover:bg-emerald-700">核准</Button>
                        </div>
                     </div>
                  );
               })
            )}
         </div>
      </Modal>
   );
};

export const TeamDailyWorkloadModal: React.FC<{
   isOpen: boolean;
   onClose: () => void;
   dateStr: string | null;
   users: User[];
   tasks: Task[];
}> = ({ isOpen, onClose, dateStr, users, tasks }) => {
   // Logic for workload details... simplified for display
   // Filter tasks active on this date
   if (!isOpen || !dateStr) return null;

   const activeTasks = tasks.filter(t => {
      if (t.status === 'DONE' && t.completedDate && t.completedDate < dateStr) return false;
      if (new Date(t.receiveDate) > new Date(dateStr)) return false;
      // Rough approximation
      return t.status !== 'DONE' || t.completedDate === dateStr;
   });

   return (
      <Modal isOpen={isOpen} onClose={onClose} title={`團隊工作詳情 (${dateStr})`} maxWidth="max-w-4xl">
         <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {users.filter(u => u.role === 'ENGINEER').map(user => {
               const userTasks = activeTasks.filter(t => t.userId === user.id);
               return (
                  <div key={user.id} className="border rounded-xl p-3">
                     <div className="flex justify-between mb-2">
                        <div className="font-bold flex items-center gap-2">
                           <UserAvatar user={user} size="sm" /> {user.name}
                        </div>
                        <div className="text-sm text-slate-500">{userTasks.length} 任務</div>
                     </div>
                     <div className="space-y-1 pl-8">
                        {userTasks.map(t => (
                           <div key={t.id} className="text-sm flex justify-between bg-slate-50 p-1.5 rounded">
                              <span>{t.title}</span>
                              <StatusBadge status={t.status} />
                           </div>
                        ))}
                        {userTasks.length === 0 && <div className="text-xs text-slate-400 italic">無排程任務</div>}
                     </div>
                  </div>
               );
            })}
         </div>
      </Modal>
   );
};

export const QuickDispatchModal: React.FC<{
   isOpen: boolean;
   onClose: () => void;
   onSubmit: (task: any) => void;
   users: User[];
   tasks: Task[]; // for workload ref
   categories: Category[];
}> = ({ isOpen, onClose, onSubmit, users, categories }) => {
   const [formData, setFormData] = useState({
      title: '',
      userId: '',
      deadline: '',
      priority: 'HIGH'
   });

   // Recommend user based on task count
   const recommendedUser = useMemo(() => {
      const engineers = users.filter(u => u.role === 'ENGINEER');
      // Sort by active task count
      return engineers.sort((a,b) => {
         // Logic would go here, simplified
         return 0; 
      })[0]?.id || '';
   }, [users]);

   useEffect(() => {
      if (isOpen) {
         setFormData({
            title: '',
            userId: recommendedUser,
            deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
            priority: 'HIGH'
         });
      }
   }, [isOpen, recommendedUser]);

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Defaults
      onSubmit({
         ...formData,
         description: '快速派工任務',
         categoryId: categories[0]?.id,
         estimatedHours: 2,
         receiveDate: new Date().toISOString().split('T')[0],
         phase: 'P2'
      });
      onClose();
   };

   if (!isOpen) return null;

   return (
      <Modal isOpen={isOpen} onClose={onClose} title="快速派工 (Quick Dispatch)">
         <form onSubmit={handleSubmit} className="space-y-4">
            <div>
               <label className="block text-sm font-medium mb-1">任務內容</label>
               <input autoFocus className="w-full p-2 border rounded-lg" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="請輸入任務標題..." required />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium mb-1">指派人員</label>
                  <select className="w-full p-2 border rounded-lg" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})}>
                     {users.filter(u => u.role !== 'ADMIN').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">截止時間</label>
                  <input type="date" className="w-full p-2 border rounded-lg" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
               </div>
            </div>
            <Button type="submit" className="w-full justify-center">立即指派</Button>
         </form>
      </Modal>
   );
};

export const VerificationCompletionModal: React.FC<{
   isOpen: boolean;
   onClose: () => void;
   taskTitle: string;
   onConfirm: (count: number, achieved: number) => void;
}> = ({ isOpen, onClose, taskTitle, onConfirm }) => {
   const [count, setCount] = useState(0);
   const [achieved, setAchieved] = useState(0);

   if (!isOpen) return null;

   return (
      <Modal isOpen={isOpen} onClose={onClose} title="驗證完成回報">
         <div className="space-y-4">
            <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded">任務: {taskTitle}</div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium mb-1">驗證項目總數</label>
                  <input type="number" className="w-full p-2 border rounded" value={count} onChange={e => setCount(parseInt(e.target.value))} />
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">達成/通過數</label>
                  <input type="number" className="w-full p-2 border rounded" value={achieved} onChange={e => setAchieved(parseInt(e.target.value))} />
               </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
               <Button variant="secondary" onClick={onClose}>取消</Button>
               <Button onClick={() => { onConfirm(count, achieved); onClose(); }}>確認完成</Button>
            </div>
         </div>
      </Modal>
   );
};

export const DailyWorkloadModal: React.FC<{
   isOpen: boolean;
   onClose: () => void;
   dateStr: string | null;
   tasks: Task[];
   categories: Category[];
}> = ({ isOpen, onClose, dateStr, tasks, categories }) => {
   if (!isOpen || !dateStr) return null;
   
   return (
      <Modal isOpen={isOpen} onClose={onClose} title={`工作清單 (${dateStr})`}>
         <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {tasks.length === 0 ? <div className="text-center py-6 text-slate-400">無安排工作</div> : 
               tasks.map(t => (
                  <TaskItem key={t.id} task={t} categories={categories} />
               ))
            }
         </div>
      </Modal>
   );
};

export const StatisticsModal: React.FC<{
   isOpen: boolean;
   onClose: () => void;
   initialType: 'SCHEDULE' | 'DESIGN' | 'CHANGE';
   tasks: Task[];
   users: User[];
   categories: Category[];
}> = ({ isOpen, onClose, initialType, tasks, users }) => {
   // Placeholder for statistics visualization
   if (!isOpen) return null;

   return (
      <Modal isOpen={isOpen} onClose={onClose} title="統計分析 (Statistics)" maxWidth="max-w-4xl">
         <div className="h-64 bg-slate-50 rounded-xl flex items-center justify-center border text-slate-400">
            <BarChart3 className="w-8 h-8 mr-2" />
            統計圖表功能開發中 ({initialType})
         </div>
         {/* Could add more fake stats here based on tasks prop */}
      </Modal>
   );
};
