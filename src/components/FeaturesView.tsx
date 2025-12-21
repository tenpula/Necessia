import React from 'react';

export default function FeaturesView() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Powerful Features for <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Research Analysis
          </span>
        </h2>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Discover how our tools help you visualize research gaps and understand citation contexts in depth.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 hover:border-cyan-500/30 transition-all duration-300">
          <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 text-cyan-400">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">Smart Search</h3>
          <p className="text-slate-400 leading-relaxed mb-6">
            Accepts various input formats including arXiv URLs, DOIs, and paper titles. 
            Our intelligent parser automatically detects the format and retrieves the correct metadata from OpenAlex.
          </p>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
              arXiv ID / URL Support
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
              DOI Resolution
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
              Fuzzy Title Matching
            </li>
          </ul>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 hover:border-blue-500/30 transition-all duration-300">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 text-blue-400">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">Citation Network</h3>
          <p className="text-slate-400 leading-relaxed mb-6">
            Visualizes the complex web of citations as an interactive graph. 
            Understand the influence flow and identify key papers in your research domain.
          </p>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              Interactive Node Graph
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              Influence-based Sizing
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              Publication Timeline
            </li>
          </ul>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 hover:border-purple-500/30 transition-all duration-300 md:col-span-2">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
              <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 text-purple-400">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a9 9 0 019 9c0 3.074-1.676 5.59-3.5 7.614C15.7 20.55 13.777 22 12 22c-1.777 0-3.7-1.45-5.5-3.386C4.676 16.59 3 14.074 3 11a9 9 0 019-9zM9 9h.01M15 9h.01" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">AI Context Analysis</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                Goes beyond simple citation counts. Our LLM analyzes the context of each citation 
                to classify the relationship between papers.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 mb-2 text-green-400 font-semibold">
                    <span>🟢</span> Methodology
                  </div>
                  <p className="text-xs text-slate-500">Adopts methods or frameworks from the cited paper.</p>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 mb-2 text-red-400 font-semibold">
                    <span>🔴</span> Critique
                  </div>
                  <p className="text-xs text-slate-500">Points out limitations or weaknesses.</p>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 mb-2 text-purple-400 font-semibold">
                    <span>🟣</span> Comparison
                  </div>
                  <p className="text-xs text-slate-500">Compares results or benchmarks.</p>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 mb-2 text-slate-400 font-semibold">
                    <span>⚪</span> Background
                  </div>
                  <p className="text-xs text-slate-500">General related work reference.</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 w-full bg-slate-950/50 rounded-2xl border border-slate-800 p-6">
              <h4 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Analysis Example</h4>
              <div className="space-y-4">
                <div className="p-3 bg-slate-900 rounded-lg border-l-2 border-green-500 text-xs text-slate-300">
                  "We adopt the <span className="text-white font-medium">transformer architecture</span> proposed by Vaswani et al..."
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border-l-2 border-red-500 text-xs text-slate-300">
                  "However, RNNs <span className="text-white font-medium">suffer from vanishing gradients</span> in long sequences..."
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border-l-2 border-purple-500 text-xs text-slate-300">
                  "Our model <span className="text-white font-medium">outperforms the baseline</span> by 15% on the test set..."
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

