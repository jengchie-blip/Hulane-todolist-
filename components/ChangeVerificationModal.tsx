import React, { useState, useEffect } from 'react';
import { Modal, Button } from './Shared';

interface ChangeVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  initialResult?: string;
  initialDate?: string;
  onConfirm: (result: string, date: string) => void;
}

export const ChangeVerificationModal: React.FC<ChangeVerificationModalProps> = ({ 
  isOpen, 
  onClose, 
  taskTitle, 
  initialResult = '', 
  initialDate,
  onConfirm 
}) => {
  const [result, setResult] = useState(initialResult || '');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) {
        setResult(initialResult || '');
        setDate(initialDate || new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, initialResult, initialDate]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="設計變更結果判定">
      <div className="space-y-4">
        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 mb-4">
           針對任務 <strong>{taskTitle}</strong> 進行變更後的驗證結果判定。
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">判定日期</label>
          <input 
            type="date" 
            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">驗證結果 / 判定說明</label>
          <textarea 
            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none"
            placeholder="請輸入詳細的變更驗證結果..."
            value={result}
            onChange={(e) => setResult(e.target.value)}
          ></textarea>
        </div>

        <div className="flex justify-end gap-3 pt-2">
           <Button variant="secondary" onClick={onClose}>取消</Button>
           <Button onClick={() => { onConfirm(result, date); onClose(); }}>儲存判定</Button>
        </div>
      </div>
    </Modal>
  );
};
