/*
 * 【ファイル概要】
 * 論文詳細パネル
 * クリックした論文のタイトルや要約、著者などの詳しい情報を表示します。
 */

'use client';

import { Paper } from '@/types/paper';
import { DetailPanel } from './ui';
import { formatAuthors, formatNumber } from '@/lib/format';

interface PaperDetailPanelProps {
  paper: Paper;
  onClose: () => void;
  isSeed: boolean;
}

export default function PaperDetailPanel({ paper, onClose, isSeed }: PaperDetailPanelProps) {
  const header = (
    <div className="flex items-center gap-2">
      {isSeed && (
        <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-500/20 text-cyan-300 rounded-full">
          シード論文
        </span>
      )}
      {paper.venueType !== 'unknown' && (
        <VenueTypeBadge venueType={paper.venueType} />
      )}
    </div>
  );

  return (
    <DetailPanel onClose={onClose} header={header}>
      {/* タイトル */}
      <h2 className="text-lg font-semibold text-white leading-snug">{paper.title}</h2>

      {/* 著者 */}
      <SectionLabel>著者</SectionLabel>
      <p className="text-sm text-slate-300">{formatAuthors(paper)}</p>

      {/* Venue */}
      {paper.venue && (
        <>
          <SectionLabel>掲載誌・会議</SectionLabel>
          <p className="text-sm text-slate-300 italic">{paper.venue}</p>
        </>
      )}

      {/* メトリクス */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="出版年" value={paper.publicationYear.toString()} />
        <MetricCard label="引用数" value={formatNumber(paper.citationCount)} highlight />
      </div>

      {/* Abstract */}
      {paper.abstract && (
        <>
          <SectionLabel>概要</SectionLabel>
          <p className="text-sm text-slate-300 leading-relaxed line-clamp-[10]">{paper.abstract}</p>
        </>
      )}

      {/* リンク */}
      <div className="pt-2 space-y-2">
        {paper.arxivId && (
          <ExternalLink
            href={`https://arxiv.org/abs/${paper.arxivId}`}
            variant="arxiv"
            label="arXivで表示"
          />
        )}
        {paper.doi && (
          <ExternalLink
            href={`https://doi.org/${paper.doi}`}
            variant="doi"
            label="DOIを表示"
          />
        )}
        {paper.openAccessUrl && (
          <ExternalLink
            href={paper.openAccessUrl}
            variant="openaccess"
            label="オープンアクセス PDF"
          />
        )}
      </div>

      {/* OpenAlex ID */}
      <div className="pt-4 border-t border-slate-700/50">
        <span className="text-xs text-slate-500">
          OpenAlex ID: {paper.openAlexId.replace('https://openalex.org/', '')}
        </span>
      </div>
    </DetailPanel>
  );
}

// セクションラベルコンポーネント
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
      {children}
    </h3>
  );
}

// メトリクスカードコンポーネント
interface MetricCardProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function MetricCard({ label, value, highlight = false }: MetricCardProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-3">
      <span className="text-xs text-slate-400 block mb-1">{label}</span>
      <span className={`text-xl font-bold ${highlight ? 'text-cyan-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}

// VenueTypeBadgeコンポーネント
interface VenueTypeBadgeProps {
  venueType: Paper['venueType'];
}

function VenueTypeBadge({ venueType }: VenueTypeBadgeProps) {
  const colorMap: Record<string, string> = {
    conference: 'bg-purple-500/20 text-purple-300',
    journal: 'bg-blue-500/20 text-blue-300',
    preprint: 'bg-orange-500/20 text-orange-300',
    unknown: 'bg-slate-500/20 text-slate-300',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colorMap[venueType]}`}>
      {venueType}
    </span>
  );
}

// 外部リンクコンポーネント
interface ExternalLinkProps {
  href: string;
  variant: 'arxiv' | 'doi' | 'openaccess';
  label: string;
}

function ExternalLink({ href, variant, label }: ExternalLinkProps) {
  const variantStyles = {
    arxiv: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-300',
    doi: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300',
    openaccess: 'bg-green-500/10 hover:bg-green-500/20 text-green-300',
  };

  const icons = {
    arxiv: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L1 6v12l11 6 11-6V6L12 0zm0 2.31l8.27 4.52L12 11.35 3.73 6.83 12 2.31zM3 8.53l8 4.37v8.78l-8-4.37V8.53zm10 13.15v-8.78l8-4.37v8.78l-8 4.37z" />
      </svg>
    ),
    doi: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
    openaccess: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
      </svg>
    ),
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors w-full ${variantStyles[variant]}`}
    >
      {icons[variant]}
      {label}
    </a>
  );
}
