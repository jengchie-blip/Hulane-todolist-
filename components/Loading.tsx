
import React from 'react';
import { Loader2 } from 'lucide-react';

export const Loading = () => (
  <div className="h-full min-h-[50vh] flex flex-col items-center justify-center p-8 text-slate-400">
    <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
    <p className="text-sm font-medium animate-pulse">載入中...</p>
  </div>
);
