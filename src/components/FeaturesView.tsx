/*
 * 機能紹介画面。
 * 検索前のユーザーに主要機能と分析イメージを示す。
 */

import React from 'react';

const FEATURE_CARDS = [
  {
    title: 'Smart Search',
    description:
      'Accepts arXiv URLs, DOIs, and paper titles. The parser normalizes the input and retrieves metadata from OpenAlex.',
    accentClass: 'bg-neutral-800 text-neutral-300 hover:border-neutral-700',
    bullets: ['arXiv ID / URL Support', 'DOI Resolution', 'Fuzzy Title Matching'],
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: 'Citation Network',
    description:
      'Maps the citation graph as an interactive network so you can trace influence and spot structurally important papers.',
    accentClass: 'bg-blue-500/10 text-blue-400 hover:border-blue-500/30',
    bullets: ['Interactive Node Graph', 'Influence-based Sizing', 'Publication Timeline'],
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83" />
      </svg>
    ),
  },
] as const;

const CONTEXT_CARDS = [
  {
    icon: '🟢',
    title: 'Methodology',
    description: 'Adopts methods or frameworks from the cited paper.',
    textClass: 'text-green-400',
  },
  {
    icon: '🔴',
    title: 'Critique',
    description: 'Points out limitations or weaknesses.',
    textClass: 'text-red-400',
  },
  {
    icon: '🟣',
    title: 'Comparison',
    description: 'Compares results or benchmarks.',
    textClass: 'text-purple-400',
  },
  {
    icon: '⚪',
    title: 'Background',
    description: 'General related work reference.',
    textClass: 'text-slate-400',
  },
] as const;

const ANALYSIS_EXAMPLES = [
  {
    borderClass: 'border-green-500',
    text: (
      <>
        &ldquo;We adopt the <span className="text-white font-medium">transformer architecture</span> proposed by Vaswani et al...&rdquo;
      </>
    ),
  },
  {
    borderClass: 'border-red-500',
    text: (
      <>
        &ldquo;However, RNNs <span className="text-white font-medium">suffer from vanishing gradients</span> in long sequences...&rdquo;
      </>
    ),
  },
  {
    borderClass: 'border-purple-500',
    text: (
      <>
        &ldquo;Our model <span className="text-white font-medium">outperforms the baseline</span> by 15% on the test set...&rdquo;
      </>
    ),
  },
] as const;

function FeatureCard({
  title,
  description,
  bullets,
  accentClass,
  icon,
}: (typeof FEATURE_CARDS)[number]) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${accentClass}`}>{icon}</div>
      <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
      <p className="text-slate-400 leading-relaxed mb-6">{description}</p>
      <ul className="space-y-3 text-slate-300">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-current rounded-full opacity-70"></span>
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FeaturesView() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Powerful Features for <br />
          <span className="text-transparent bg-clip-text bg-neutral-700">Research Analysis</span>
        </h2>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Discover how the workspace helps you visualize research gaps and understand citation contexts in depth.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
        {FEATURE_CARDS.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}

        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 md:col-span-2">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
              <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 text-purple-400">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a9 9 0 019 9c0 3.074-1.676 5.59-3.5 7.614C15.7 20.55 13.777 22 12 22c-1.777 0-3.7-1.45-5.5-3.386C4.676 16.59 3 14.074 3 11a9 9 0 019-9zM9 9h.01M15 9h.01" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">AI Context Analysis</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Goes beyond citation counts. The LLM classifies why one paper cites another so the graph reflects relationships, not just links.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CONTEXT_CARDS.map((context) => (
                  <div key={context.title} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                    <div className={`flex items-center gap-2 mb-2 font-semibold ${context.textClass}`}>
                      <span>{context.icon}</span>
                      {context.title}
                    </div>
                    <p className="text-xs text-slate-500">{context.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 w-full bg-slate-950/50 rounded-2xl border border-slate-800 p-6">
              <h4 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Analysis Example</h4>
              <div className="space-y-4">
                {ANALYSIS_EXAMPLES.map((example, index) => (
                  <div
                    key={index}
                    className={`p-3 bg-slate-900 rounded-lg border-l-2 text-xs text-slate-300 ${example.borderClass}`}
                  >
                    {example.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
