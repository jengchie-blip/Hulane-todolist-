
import { TaskStatus, TaskPriority, ProjectPhase, Task, PerformanceLevel } from './types';
import { AVATAR_COLORS } from './constants';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const getRandomColor = () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

export const getStatusColor = (status: TaskStatus) => {
  switch (status) {
    case 'TODO': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'PAUSED': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'REVIEW': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'DONE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default: return 'bg-gray-100';
  }
};

export const getStatusLabel = (status: TaskStatus) => {
  switch (status) {
    case 'TODO': return '待處理';
    case 'IN_PROGRESS': return '進行中';
    case 'PAUSED': return '暫停中';
    case 'REVIEW': return '審核中';
    case 'DONE': return '已完成';
    default: return status;
  }
};

export const getPriorityColor = (priority: TaskPriority) => {
  switch (priority) {
    case 'HIGH': return 'text-red-600 bg-red-50 border-red-100';
    case 'MEDIUM': return 'text-amber-600 bg-amber-50 border-amber-100';
    case 'LOW': return 'text-slate-600 bg-slate-50 border-slate-100';
  }
};

export const getPhaseLabel = (phase: ProjectPhase) => {
  switch (phase) {
    case 'P1': return '提案/估價 (P1)';
    case 'P2': return '設計凍結 (P2)';
    case 'P3': return '驗證DV/PV (P3)';
    case 'P4': return '結案 (P4)';
    case 'P5': return '工程變更 (P5)';
    default: return phase;
  }
};

// --- Performance System Utils ---

/**
 * Calculates a score (1-3) for a single completed task based on matrix:
 * 3 (Exceeds): On Time & On Budget
 * 1 (Needs Imp): Late & Over Budget
 * 2 (Meets): Mixed
 */
export const calculateTaskScore = (task: Task): number => {
  if (task.status !== 'DONE' || !task.completedDate) return 0;

  const isLate = task.completedDate > task.deadline;
  const isOverBudget = task.actualHours > task.estimatedHours;

  if (!isLate && !isOverBudget) return 3; // Best case
  if (isLate && isOverBudget) return 1;   // Worst case
  return 2;                               // Mixed case
};

export const evaluateUserPerformance = (completedTasks: Task[]): { level: PerformanceLevel; score: number } => {
  if (completedTasks.length === 0) return { level: 'NA', score: 0 };

  const totalScore = completedTasks.reduce((acc, t) => acc + calculateTaskScore(t), 0);
  const avgScore = totalScore / completedTasks.length;

  let level: PerformanceLevel = 'MEETS';
  if (avgScore >= 2.5) level = 'EXCEEDS';
  else if (avgScore < 1.5) level = 'NEEDS_IMPROVEMENT';

  return { level, score: avgScore };
};

export const getPerformanceDetails = (level: PerformanceLevel) => {
  switch (level) {
    case 'EXCEEDS': 
      return { label: '超越目標', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', iconColor: 'text-emerald-500' };
    case 'NEEDS_IMPROVEMENT': 
      return { label: '有待改善', color: 'text-orange-700 bg-orange-50 border-orange-200', iconColor: 'text-orange-500' };
    case 'MEETS': 
      return { label: '符合目標', color: 'text-blue-700 bg-blue-50 border-blue-200', iconColor: 'text-blue-500' };
    default: 
      return { label: '尚無數據', color: 'text-slate-600 bg-slate-50 border-slate-200', iconColor: 'text-slate-400' };
  }
};


// Safe Storage Helper for Cloud Environments
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading ${key} from localStorage:`, error);
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing ${key} to localStorage:`, error);
      // In a real app, you might want to show a toast notification here
      // if the quota is exceeded.
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing ${key} from localStorage:`, error);
    }
  }
};
