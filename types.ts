
export type Role = 'ADMIN' | 'ENGINEER' | 'ASSISTANT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'PAUSED';
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ProjectPhase = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type PerformanceLevel = 'EXCEEDS' | 'MEETS' | 'NEEDS_IMPROVEMENT' | 'NA';

export interface User {
  id: string;
  name: string;
  employeeId: string;
  role: Role;
  avatarColor: string;
  avatarIcon?: string; // Added: Icon identifier for user avatar
  password?: string;
}

export interface Category {
  id: string;
  name: string;
  suggestedHours: number;
  note?: string; 
  icon?: string; 
}

export interface TaskLog {
  id: string;
  date: string;
  content: string;
  hoursSpent: number;
}

export interface DateChangeRequest {
  newReceiveDate: string;
  newDeadline: string;
  reason: string;
  requesterId: string;
  requestedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  receiveDate: string;
  deadline: string;
  startDate?: string;
  estimatedHours: number;
  actualHours: number;
  status: TaskStatus;
  completedDate?: string;
  logs: TaskLog[];
  priority: TaskPriority;
  phase: ProjectPhase;
  categoryId: string;
  transferredFrom?: string;
  partNumber?: string;
  pendingChange?: DateChangeRequest;
  
  // Verification/Test specific
  dvCount?: number;
  dvAchieved?: number;

  // Design Change specific
  changeOrderNumber?: string; // 變更單號
  changeCount?: number;       // 變更次數
  changeCategory?: string;    // 變更分類
  changeAnalysis?: string;    // 變更分析
  changeVerification?: string;     // 變更驗證結果/判定
  changeVerificationDate?: string; // 驗證日期
}

export interface NotificationItem {
  id: string;
  type: 'OVERDUE' | 'DUE_SOON' | 'REVIEW_NEEDED' | 'TRANSFER_RECEIVED' | 'APPROVAL_NEEDED';
  message: string;
  taskId: string;
  userName?: string;
  action?: () => void;
}