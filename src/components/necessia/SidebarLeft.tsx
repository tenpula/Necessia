import React from 'react';

export const SidebarLeft: React.FC = () => {
  return (
    <aside className="w-80 flex-none flex flex-col justify-between bg-white dark:bg-[#111118]/90 backdrop-blur-md border-r border-slate-200 dark:border-[#282839] z-40 transition-all duration-300 absolute md:relative h-full -translate-x-full md:translate-x-0" id="left-sidebar">
      <div className="flex flex-col p-4 gap-6 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-slate-900 dark:text-white text-lg font-medium leading-normal">Graph Controls</h1>
          <p className="text-slate-500 dark:text-[#9d9db9] text-sm font-normal leading-normal">Configure visualization parameters</p>
        </div>
        
        <div className="flex flex-col gap-2">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#282839] text-slate-700 dark:text-white transition-colors text-left">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            <p className="text-sm font-medium leading-normal">Filters</p>
          </button>
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary text-white shadow-lg shadow-primary/20 text-left">
            <span className="material-symbols-outlined text-[20px] fill-1">bubble_chart</span>
            <p className="text-sm font-medium leading-normal">Clusters</p>
          </button>
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#282839] text-slate-700 dark:text-white transition-colors text-left">
            <span className="material-symbols-outlined text-[20px]">history</span>
            <p className="text-sm font-medium leading-normal">History</p>
          </button>
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#282839] text-slate-700 dark:text-white transition-colors text-left">
            <span className="material-symbols-outlined text-[20px]">download</span>
            <p className="text-sm font-medium leading-normal">Export Data</p>
          </button>
        </div>

        <div className="h-px bg-slate-200 dark:bg-[#282839] w-full"></div>

        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal">Publication Year</p>
            <span className="text-xs text-primary font-bold">1990 - 2024</span>
          </div>
          <div className="flex h-[38px] w-full pt-1.5 px-1">
            <div className="relative flex h-1 w-full rounded-sm bg-slate-200 dark:bg-[#3b3b54] items-center">
              <div className="absolute left-[20%] right-[15%] h-1 bg-primary rounded-sm"></div>
              <div className="absolute left-[20%] -ml-1.5 top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform z-10">
                <div className="size-3 rounded-full bg-white ring-2 ring-primary shadow-sm"></div>
              </div>
              <div className="absolute right-[15%] -mr-1.5 top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform z-10">
                <div className="size-3 rounded-full bg-white ring-2 ring-primary shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal">Min. Citations</p>
          <div className="flex h-[20px] w-full pt-1.5 px-1">
            <div className="relative flex h-1 w-full rounded-sm bg-slate-200 dark:bg-[#3b3b54] items-center">
              <div className="absolute left-0 w-[40%] h-1 bg-primary rounded-sm"></div>
              <div className="absolute left-[40%] -ml-1.5 top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform z-10">
                <div className="size-3 rounded-full bg-white ring-2 ring-primary shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-50 dark:bg-[#1c1c27] border-t border-slate-200 dark:border-[#282839]">
        <p className="text-xs text-slate-500 dark:text-[#9d9db9] mb-3 uppercase tracking-wider font-bold">Legend</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-primary"></div>
            <span className="text-xs text-slate-700 dark:text-white">Selected Node</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-purple-500"></div>
            <span className="text-xs text-slate-700 dark:text-white">Citation &gt; 100</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-slate-400 dark:bg-slate-600"></div>
            <span className="text-xs text-slate-700 dark:text-white">Standard Node</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
