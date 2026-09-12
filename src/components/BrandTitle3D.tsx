import React from 'react';
import { Layers } from 'lucide-react';

interface BrandTitle3DProps {
  title: string;
  isCollapsed?: boolean;
}

export const BrandTitle3D: React.FC<BrandTitle3DProps> = ({ title, isCollapsed = false }) => {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className={`relative ${isCollapsed ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm border border-emerald-500/30`}>
        <Layers className={`${isCollapsed ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
      </div>

      <div className="min-w-0">
        <h1 className={`${isCollapsed ? 'text-xs sm:text-sm' : 'text-sm sm:text-base font-bold'} text-white font-bold tracking-tight leading-tight truncate`}>
          {title}
        </h1>
      </div>
    </div>
  );
};

