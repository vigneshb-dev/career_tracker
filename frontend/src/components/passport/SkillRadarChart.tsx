import React, { useState } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip
} from 'recharts';
import { Layers, ShieldCheck, Target, Award, Sparkles } from 'lucide-react';
import { SkillRadarPoint } from '../../types';
import { Badge } from '../common/Badge';

interface SkillRadarChartProps {
  data: SkillRadarPoint[];
  traineeName: string;
}

export const SkillRadarChart: React.FC<SkillRadarChartProps> = ({ data, traineeName }) => {
  const [filter, setFilter] = useState<'all' | 'hard' | 'soft'>('all');

  const filteredData = data.filter((item) => {
    if (filter === 'all') return true;
    return item.category.toLowerCase() === filter;
  });

  // Calculate high-level aggregates
  const avgCurrent = filteredData.length > 0
    ? (filteredData.reduce((acc, curr) => acc + curr.current_level, 0) / filteredData.length).toFixed(1)
    : '0.0';
  const avgTarget = filteredData.length > 0
    ? (filteredData.reduce((acc, curr) => acc + curr.target_level, 0) / filteredData.length).toFixed(1)
    : '0.0';
  const avgConfidence = filteredData.length > 0
    ? Math.round((filteredData.reduce((acc, curr) => acc + curr.confidence, 0) / filteredData.length) * 100)
    : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as SkillRadarPoint;
      const delta = (item.current_level - item.target_level).toFixed(1);
      const isAhead = Number(delta) >= 0;

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/60 text-xs space-y-1.5 min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-700/70 pb-1.5">
            <span className="font-extrabold text-white line-clamp-1">{item.skill}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.category === 'soft' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-brand-500/20 text-brand-300'}`}>
              {item.category.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
            <div>
              <span className="text-slate-400 block">Current Level:</span>
              <span className="text-base font-black text-brand-400">{item.current_level.toFixed(1)} / 5.0</span>
            </div>
            <div>
              <span className="text-slate-400 block">Target Level:</span>
              <span className="text-base font-black text-amber-400">{item.target_level.toFixed(1)} / 5.0</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
            <span className="text-slate-400">Confidence:</span>
            <span className="font-bold text-emerald-400">{Math.round(item.confidence * 100)}%</span>
          </div>
          <div className="text-[10px] text-slate-300">
            Status: <strong className={isAhead ? 'text-emerald-400' : 'text-amber-400'}>
              {isAhead ? `+${delta} Ahead of target` : `${delta} Gap to target`}
            </strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
              Proficiency Benchmark
            </span>
            <Badge variant="brand" size="sm">0–5 Scale</Badge>
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mt-0.5">
            Skill Radar & Competency Horizon
          </h3>
          <p className="text-xs text-slate-500">
            Continuous multi-source evidence fusion comparing verified level vs target career band.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl shrink-0">
          {(['all', 'hard', 'soft'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === mode
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mode === 'all' ? 'All Skills' : mode === 'hard' ? 'Hard Skills' : 'Soft Skills'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 text-center">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Average Current</span>
          <span className="text-xl font-black text-brand-600">{avgCurrent} <span className="text-xs font-semibold text-slate-400">/ 5.0</span></span>
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Target Benchmark</span>
          <span className="text-xl font-black text-amber-600">{avgTarget} <span className="text-xs font-semibold text-slate-400">/ 5.0</span></span>
        </div>
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Corroborated Conf.</span>
          <span className="text-xl font-black text-emerald-600">{avgConfidence}%</span>
        </div>
      </div>

      {/* Radar Chart Display */}
      <div className="w-full h-[360px] relative">
        {filteredData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
            No skills available for selected category.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={filteredData}>
              <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 5]}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickCount={6}
              />
              
              {/* Target Benchmark Radar (Dashed outline) */}
              <Radar
                name="Target Benchmark"
                dataKey="target_level"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="#f59e0b"
                fillOpacity={0.08}
              />

              {/* Verified Current Level Radar (Solid brand fill) */}
              <Radar
                name="Current Level"
                dataKey="current_level"
                stroke="#0284c7"
                strokeWidth={2.5}
                fill="#0284c7"
                fillOpacity={0.25}
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: 10, fontSize: 12, fontWeight: 600 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend & Guide footer */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
            <span className="w-3 h-3 rounded-full bg-brand-500 inline-block shadow-sm"></span>
            Verified Current Proficiency
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
            <span className="w-3 h-3 rounded-full border-2 border-dashed border-amber-500 inline-block"></span>
            Occupational Role Target
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Levels calibrated to O*NET & Industry Competency Frameworks
        </span>
      </div>

    </div>
  );
};
