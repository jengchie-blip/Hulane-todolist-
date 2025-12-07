
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Bell, CheckCircle2, Inbox, AlertCircle, Clock, AlertTriangle, PenTool } from 'lucide-react';
import { Task, User, NotificationItem } from '../types';

interface NotificationBellProps {
  tasks: Task[];
  currentUser: User;
  allUsers?: User[];
  onDismissAlert: (taskId: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ tasks, currentUser, allUsers, onDismissAlert }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const notifications: NotificationItem[] = useMemo(() => {
    const alerts: NotificationItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const visibleTasks = currentUser.role === 'ADMIN' 
      ? tasks 
      : tasks.filter(t => t.userId === currentUser.id);

    visibleTasks.forEach(task => {
      // 0. Approval Needed (Admin Only) - Highest Priority
      if (currentUser.role === 'ADMIN' && task.pendingChange) {
        const requester = allUsers?.find(u => u.id === task.pendingChange?.requesterId)?.name || 'Unknown';
        alerts.push({
           id: `approval-${task.id}`,
           type: 'APPROVAL_NEEDED',
           message: `[簽核] ${requester} 申請變更 "${task.title}" 的日期`,
           taskId: task.id
        });
      }

      // 1. Transfer Notification
      if (task.transferredFrom && task.userId === currentUser.id) {
        const sender = allUsers?.find(u => u.id === task.transferredFrom)?.name || 'Unknown';
        alerts.push({
          id: `transfer-${task.id}`,
          type: 'TRANSFER_RECEIVED',
          message: `收到來自 ${sender} 的轉派任務: "${task.title}"`,
          taskId: task.id,
          action: () => onDismissAlert(task.id)
        });
      }

      if (task.status === 'DONE') return;

      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);
      
      const diffTime = deadline.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const userName = currentUser.role === 'ADMIN' && allUsers 
        ? allUsers.find(u => u.id === task.userId)?.name 
        : undefined;
      
      const prefix = userName ? `[${userName}] ` : '';

      if (diffDays < 0) {
        alerts.push({
          id: `overdue-${task.id}`,
          type: 'OVERDUE',
          message: `${prefix}任務 "${task.title}" 已逾期 ${Math.abs(diffDays)} 天`,
          taskId: task.id,
          userName
        });
      } else if (diffDays >= 0 && diffDays <= 1) {
        alerts.push({
          id: `soon-${task.id}`,
          type: 'DUE_SOON',
          message: `${prefix}任務 "${task.title}" ${diffDays === 0 ? '今天' : '明天'}到期`,
          taskId: task.id,
          userName
        });
      }
      if (task.actualHours > task.estimatedHours) {
         alerts.push({
          id: `review-${task.id}`,
          type: 'REVIEW_NEEDED',
          message: `${prefix}任務 "${task.title}" 超出預估工時`,
          taskId: task.id,
          userName
        });
      }
    });

    return alerts.sort((a, b) => {
      const priority = { 'APPROVAL_NEEDED': 0, 'TRANSFER_RECEIVED': 1, 'OVERDUE': 2, 'REVIEW_NEEDED': 3, 'DUE_SOON': 4 };
      return priority[a.type] - priority[b.type];
    });
  }, [tasks, currentUser, allUsers, onDismissAlert]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6" />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">通知中心</h3>
            <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-500">
              {notifications.length}
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>目前沒有待辦警示</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map(item => (
                  <div key={item.id} className="p-3 hover:bg-slate-50 transition-colors flex gap-3 items-start animate-in fade-in duration-300">
                    <div className="mt-0.5 shrink-0">
                      {item.type === 'APPROVAL_NEEDED' && <PenTool className="w-4 h-4 text-purple-500" />}
                      {item.type === 'TRANSFER_RECEIVED' && <Inbox className="w-4 h-4 text-blue-500" />}
                      {item.type === 'OVERDUE' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      {item.type === 'DUE_SOON' && <Clock className="w-4 h-4 text-amber-500" />}
                      {item.type === 'REVIEW_NEEDED' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${item.type === 'OVERDUE' ? 'text-red-600' : 'text-slate-700'}`}>
                        {item.message}
                      </p>
                    </div>
                    {item.type === 'TRANSFER_RECEIVED' && item.action && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); item.action!(); }}
                        className="text-slate-300 hover:text-green-500"
                        title="標記為已讀"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
