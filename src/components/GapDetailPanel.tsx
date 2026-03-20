/*
 * 【ファイル概要】
 * 研究ギャップ詳細パネル
 * AIが見つけた「この研究にはこんな空白地帯がある」という詳細を表示します。
 */

'use client';

import { GapProposal, Paper } from '@/types/paper';
import { DetailPanel } from './ui';
import { formatAuthors, formatNumber } from '@/lib/format';

interface GapDetailPanelProps {
  proposal: GapProposal;
  onClose: () => void;
  onPaperClick?: (paper: Paper) => void;
}

export default function GapDetailPanel({
  proposal,
  onClose,
  onPaperClick,
}: GapDetailPanelProps) {
  const header = (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
      <h3 className="text-lg font-semibold text-white">研究の空白（Gap）</h3>
    </div>
  );

  return (
    <DetailPanel onClose={onClose} header={header}>
      {/* 信頼度スコア */}
      <ConfidenceScore confidence={proposal.confidence} />

      {/* メトリクス */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="類似度" value={`${(proposal.similarityScore * 100).toFixed(0)}%`} color="gray" />
        <MetricCard label="共引用数" value={proposal.coCitationCount.toString()} color="purple" />
      </div>

      {/* 説明文 */}
      <AnalysisSection reasoning={proposal.reasoning} />

      {/* 論文A */}
      <PaperCard
        paper={proposal.paperA}
        label="論文 A"
        labelColor="purple"
        onPaperClick={onPaperClick}
      />

      {/* 論文B */}
      <PaperCard
        paper={proposal.paperB}
        label="論文 B"
        labelColor="pink"
        onPaperClick={onPaperClick}
      />

      {/* 共通引用 */}
      {proposal.commonCitations.length > 0 && (
        <CommonCitationsSection
          citations={proposal.commonCitations}
          onPaperClick={onPaperClick}
        />
      )}

      {/* なぜこれがGapなのか */}
      <WhyGapSection
        similarityScore={proposal.similarityScore}
        coCitationCount={proposal.coCitationCount}
      />
    </DetailPanel>
  );
}

// 信頼度スコア
interface ConfidenceScoreProps {
  confidence: number;
}

function ConfidenceScore({ confidence }: ConfidenceScoreProps) {
  return (
    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-purple-300">信頼度スコア</span>
        <span className="text-lg font-bold text-white">{Math.round(confidence * 100)}%</span>
      </div>
      <div className="w-full bg-slate-700/50 rounded-full h-3">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
          style={{ width: `${confidence * 100}%` }}
        />
      </div>
    </div>
  );
}

// メトリクスカード
interface MetricCardProps {
  label: string;
  value: string;
  color: 'gray' | 'purple';
}

function MetricCard({ label, value, color }: MetricCardProps) {
  const colorClass = color === 'gray' ? 'text-neutral-300' : 'text-purple-400';

  return (
    <div className="bg-slate-800/50 rounded-xl p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}

// 分析セクション
interface AnalysisSectionProps {
  reasoning: string;
}

function AnalysisSection({ reasoning }: AnalysisSectionProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
        分析
      </h4>
      <p className="text-sm text-slate-300 leading-relaxed">{reasoning}</p>
    </div>
  );
}

// 論文カード
interface PaperCardProps {
  paper: Paper;
  label: string;
  labelColor: 'purple' | 'pink';
  onPaperClick?: (paper: Paper) => void;
}

function PaperCard({ paper, label, labelColor, onPaperClick }: PaperCardProps) {
  const labelColorClass = labelColor === 'purple' ? 'text-purple-400' : 'text-pink-400';

  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <h4 className={`text-sm font-semibold ${labelColorClass} uppercase tracking-wider mb-3`}>
        {label}
      </h4>
      <button
        onClick={() => onPaperClick?.(paper)}
        className="text-left w-full hover:opacity-80 transition-opacity"
      >
        <h5 className="text-base font-semibold text-white mb-2 line-clamp-3">{paper.title}</h5>
        <div className="space-y-1 text-xs text-slate-400">
          <p>{formatAuthors(paper)}</p>
          <div className="flex items-center gap-3">
            <span>{paper.publicationYear}</span>
            {paper.venueType !== 'unknown' && (
              <span className="px-2 py-0.5 bg-slate-700/50 rounded">{paper.venueType}</span>
            )}
            <span>{formatNumber(paper.citationCount)} 引用</span>
          </div>
          {paper.abstract && (
            <p className="text-slate-500 mt-2 line-clamp-3">{paper.abstract}</p>
          )}
        </div>
      </button>
    </div>
  );
}

// 共通引用セクション
interface CommonCitationsSectionProps {
  citations: Paper[];
  onPaperClick?: (paper: Paper) => void;
}

function CommonCitationsSection({ citations, onPaperClick }: CommonCitationsSectionProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
        共通の引用文献 ({citations.length})
      </h4>
      <div className="space-y-2">
        {citations.map((paper) => (
          <div
            key={paper.id}
            className="bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-colors"
          >
            <button onClick={() => onPaperClick?.(paper)} className="text-left w-full">
              <p className="text-sm text-white font-medium line-clamp-2 mb-1">{paper.title}</p>
              <p className="text-xs text-slate-400">
                {paper.publicationYear} · {formatNumber(paper.citationCount)} 引用
              </p>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// なぜこれがGapなのかセクション
interface WhyGapSectionProps {
  similarityScore: number;
  coCitationCount: number;
}

function WhyGapSection({ similarityScore, coCitationCount }: WhyGapSectionProps) {
  return (
    <div className="bg-slate-800/30 rounded-xl p-4 border border-purple-500/20">
      <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-2">
        なぜこれがGapなのか
      </h4>
      <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
        <li>
          これらの論文は{' '}
          <strong className="text-neutral-300">{(similarityScore * 100).toFixed(0)}% の内容類似度を持ち</strong>
          、関連するトピックを扱っていることを示しています。
        </li>
        {coCitationCount > 0 && (
          <li>
            これらは{' '}
            <strong className="text-purple-400">
              {coCitationCount} 件の共通引用文献
            </strong>
            を共有しており、類似した研究基盤があることを示唆しています。
          </li>
        )}
        <li>
          これらのつながりにもかかわらず、互いに{' '}
          <strong className="text-red-400">直接引用しておらず</strong>
          、潜在的な研究の空白（Gap）がある可能性を示しています。
        </li>
        <li>これらの比較や分析は、価値ある知見をもたらす可能性があります。</li>
      </ul>
    </div>
  );
}
