import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showSubtitle = true }) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const titleSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  return (
    <div className="flex items-center gap-3 group select-none">
      <div className={`relative ${iconSizes[size]} rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-md group-hover:shadow-lg transition-all duration-300 shrink-0`}>
        <div className="w-full h-full bg-white rounded-[11px] flex items-center justify-center relative overflow-hidden">
          <img
            src="/nexuxhr-logo.png"
            alt="NexuxHR"
            className="w-4/5 h-4/5 object-contain group-hover:scale-110 transition-transform duration-300"
          />
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`${titleSizes[size]} font-extrabold tracking-tight text-slate-900`}>
            Nexux<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">HR</span>
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 border border-indigo-500/30">
            PRO
          </span>
        </div>
        {showSubtitle && (
          <p className="text-[11px] text-slate-500 font-medium tracking-wide">
            Enterprise Workforce Platform
          </p>
        )}
      </div>
    </div>
  );
};
