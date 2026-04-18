import { GapProposal, CONTEXT_TYPE_INFO } from '@/types/paper';

interface SidebarLegendProps {
  hasNetwork: boolean;
  selectedGapProposal?: GapProposal | null;
}

export function SidebarLegend({ hasNetwork, selectedGapProposal }: SidebarLegendProps) {
  return (
    <div className="p-4 bg-neutral-50 dark:bg-[#1c1c27] border-t border-neutral-200 dark:border-neutral-800">
      <p className="text-xs text-neutral-500 dark:text-[#9d9db9] mb-3 uppercase tracking-wider font-bold">
        凡例（Legend）
      </p>
      <div className="flex flex-col gap-2">
        {hasNetwork ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-neutral-400 border-2 border-neutral-300"></div>
              <span className="text-xs text-neutral-700 dark:text-white">シード論文</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-neutral-600 border-2 border-neutral-500"></div>
              <span className="text-xs text-neutral-700 dark:text-white">ジャーナル</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-md bg-neutral-600 border-2 border-neutral-500"></div>
              <span className="text-xs text-neutral-700 dark:text-white">カンファレンス</span>
            </div>

            <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <h4 className="text-xs text-neutral-500 dark:text-[#9d9db9] uppercase tracking-wider mb-2">
                ノードの色（年代）
              </h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: 'hsl(180, 70%, 25%)', border: '2px solid hsl(180, 80%, 50%)' }}
                  />
                  <span className="text-xs text-neutral-700 dark:text-white">新しい</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: 'hsl(120, 70%, 25%)', border: '2px solid hsl(120, 80%, 50%)' }}
                  />
                  <span className="text-xs text-neutral-700 dark:text-white">古い</span>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <h4 className="text-xs text-neutral-500 dark:text-[#9d9db9] uppercase tracking-wider mb-2">
                引用分類（エッジ/軌道）
              </h4>
              <div className="space-y-2">
                {(['methodology', 'critique', 'comparison', 'background'] as const).map((type) => {
                  const info = CONTEXT_TYPE_INFO[type];
                  return (
                    <div key={type} className="flex items-start gap-2">
                      <div className="mt-1 w-4 h-0.5" style={{ backgroundColor: info.color }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium" style={{ color: info.color }}>
                          {info.emoji} {info.label}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-[#9d9db9] leading-snug">
                          {info.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedGapProposal && (
              <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <h4 className="text-xs text-neutral-500 dark:text-[#9d9db9] uppercase tracking-wider mb-2">
                  研究の空白（Gap）
                </h4>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500/50 border-2 border-purple-400 animate-pulse"></div>
                  <span className="text-xs text-neutral-700 dark:text-white">論文 A</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-4 h-4 rounded-full bg-pink-500/50 border-2 border-pink-400 animate-pulse"></div>
                  <span className="text-xs text-neutral-700 dark:text-white">論文 B</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-neutral-700"></div>
              <span className="text-xs text-neutral-700 dark:text-white">選択中のノード</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-purple-500"></div>
              <span className="text-xs text-neutral-700 dark:text-white">引用数 &gt; 100</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-neutral-400 dark:bg-neutral-600"></div>
              <span className="text-xs text-neutral-700 dark:text-white">通常のノード</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

