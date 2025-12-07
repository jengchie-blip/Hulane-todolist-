
import React from 'react';
import { 
  X, AlertTriangle, Layers, Wrench, Zap, Thermometer, FileText, Users, Cog, 
  Cpu, Plug, Cable, Microscope, ClipboardList, Box, Component, Car, Settings, 
  Gauge, Bot, Ghost, Smile, Gamepad2, Coffee, Crown, Skull, Glasses, Ear, 
  Fingerprint, Music, Rocket, User as UserIcon, Database, Server, Phone, Truck, Shield,
  LucideProps
} from 'lucide-react';
import { TaskStatus, User } from '../types';
import { getStatusColor, getStatusLabel } from '../utils';

// --- ICON SYSTEM ---

export const ICON_MAP: Record<string, React.ElementType> = {
  // Category Icons (Engineering & Admin)
  'layers': Layers,
  'wrench': Wrench,
  'zap': Zap,
  'thermometer': Thermometer,
  'file-text': FileText,
  'users': Users,
  'cog': Cog,
  'cpu': Cpu,
  'plug': Plug,
  'cable': Cable,
  'microscope': Microscope,
  'clipboard': ClipboardList,
  'box': Box,
  'component': Component,
  'car': Car,
  'settings': Settings,
  'gauge': Gauge,
  'database': Database,
  'server': Server,
  'phone': Phone,
  'truck': Truck,
  'shield': Shield,

  // Avatar Icons (Fun & Personal)
  'user': UserIcon,
  'bot': Bot,
  'ghost': Ghost,
  'smile': Smile,
  'gamepad': Gamepad2,
  'coffee': Coffee,
  'crown': Crown,
  'skull': Skull,
  'glasses': Glasses,
  'ear': Ear,
  'fingerprint': Fingerprint,
  'music': Music,
  'rocket': Rocket
};

// Centralized Icon Lists for Pickers
export const CATEGORY_ICONS = [
  'layers', 'wrench', 'zap', 'thermometer', 'file-text', 'users', 'cog', 'cpu', 
  'plug', 'cable', 'microscope', 'clipboard', 'box', 'component', 'car', 'settings', 
  'gauge', 'database', 'server', 'phone', 'truck', 'shield'
];

export const USER_AVATAR_ICONS = [
  'user', 'bot', 'ghost', 'smile', 'gamepad', 'coffee', 'crown', 'skull', 'glasses', 
  'ear', 'fingerprint', 'music', 'rocket'
];

export const getIconComponent = (iconName?: string, className?: string) => {
  const Icon = iconName ? ICON_MAP[iconName] : null;
  return Icon ? <Icon className={className || "w-4 h-4"} /> : null;
};

// --- COMPONENTS ---

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', style, ...props }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md ${className}`} style={style} {...props}>
    {children}
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary', className = '', type = 'button', disabled = false, ...props }) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100"
  };
  return (
    <button onClick={onClick} type={type} disabled={disabled} className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const StatusBadge = ({ status }: { status: TaskStatus }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors duration-300 ${getStatusColor(status)}`}>
    {getStatusLabel(status)}
  </span>
);

interface UserAvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showShadow?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'md', className = '', showShadow = false }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-20 h-20 text-3xl'
  };

  const Icon = user.avatarIcon ? ICON_MAP[user.avatarIcon] : null;

  return (
    <div className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 ${sizeClasses[size]} ${user.avatarColor} ${showShadow ? 'shadow-md ring-2 ring-white' : ''} ${className}`}>
      {Icon ? <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-5 h-5' : 'w-8 h-8'} /> : user.name.charAt(0)}
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
  maxWidth?: string;
  zIndex?: string; // Added zIndex prop
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg", zIndex = "z-50" }) => {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300`}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 fade-in duration-300 ease-out flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="font-bold text-lg text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = '確認', 
  cancelText = '取消', 
  isDanger = false 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: React.ReactNode; 
  confirmText?: string; 
  cancelText?: string; 
  isDanger?: boolean;
}) => {
  if (!isOpen) return null;
  // ConfirmModal usually appears on top of other modals, so we give it a higher z-index by default
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} zIndex="z-[60]">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full shrink-0 ${isDanger ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-slate-600 text-sm leading-relaxed">{message}</div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>{cancelText}</Button>
          <Button 
            variant={isDanger ? 'danger' : 'primary'} 
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
