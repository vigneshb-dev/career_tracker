import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Settings,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldCheck,
  Save,
  Loader2
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { api } from '../../services/api';
import { ScoringConfiguration } from '../../types';

interface ScoringConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: (config: ScoringConfiguration) => void;
}

export const ScoringConfigModal: React.FC<ScoringConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated
}) => {
  const [config, setConfig] = useState<ScoringConfiguration | null>(null);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setSaveSuccess(false);
    setError(null);

    api.getScoringConfig()
      .then((cfg) => {
        setConfig(cfg);
        setWeights(cfg.source_weights || {});
      })
      .catch((err) => {
        setError('Failed to fetch scoring configuration');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleWeightChange = (key: string, val: number) => {
    setWeights(prev => ({
      ...prev,
      [key]: val
    }));
    setSaveSuccess(false);
  };

  const totalRawWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  const handleResetToDefault = () => {
    setWeights({
      practical_project: 0.30,
      assessment: 0.25,
      trainer_evaluation: 0.20,
      certification: 0.15,
      employer_feedback: 0.10,
    });
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const updated = await api.updateScoringConfig(weights);
      setConfig(updated);
      setWeights(updated.source_weights);
      setSaveSuccess(true);
      if (onConfigUpdated) {
        onConfigUpdated(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-brand-400 font-bold uppercase tracking-wider">
                Scoring Formula Customization
              </span>
              <h2 className="text-lg font-extrabold tracking-tight text-white">
                Multi-Source Evidence Weights
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-100 text-xs text-brand-900 space-y-1">
            <div className="font-extrabold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              Configurable Scoring Engine
            </div>
            <p className="text-slate-600 leading-relaxed">
              Adjust how different streams of evidence contribute to the final 0–5 proficiency score. The engine dynamically normalizes weights so the sum always equals 100%.
            </p>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              <p className="text-xs font-semibold">Loading formula settings...</p>
            </div>
          ) : (
            <div className="space-y-5">

              {/* Sliders */}
              <div className="space-y-4">
                {Object.entries(weights).map(([sourceKey, weightVal]) => {
                  const label = config?.source_labels?.[sourceKey] || sourceKey.replace('_', ' ').toUpperCase();
                  const pct = totalRawWeight > 0 ? Math.round((weightVal / totalRawWeight) * 100) : 0;

                  return (
                    <div
                      key={sourceKey}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-brand-600">
                            {pct}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            (weight: {weightVal.toFixed(2)})
                          </span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={weightVal}
                        onChange={(e) => handleWeightChange(sourceKey, parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Time-Decay and Features note */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div className="font-bold text-slate-700">Additional Active Pipeline Rules:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><strong>Recency Time-Decay:</strong> Evidence &gt; 90 days receives 0.95x, &gt; 180 days 0.90x, &gt; 1 year 0.80x weight.</li>
                  <li><strong>Cross-Source Corroboration:</strong> Up to +12% confidence bonus when 3+ independent sources confirm competency.</li>
                </ul>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {error}
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Formula updated! Fused scores will reflect new evidence weights across all trainees.
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetToDefault}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Reset to Default
          </Button>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Apply Weights
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};
