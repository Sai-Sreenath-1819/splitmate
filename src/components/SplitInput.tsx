import React, { useEffect } from 'react';
import type { GroupMember } from '../stores/groupStore';
import { Percent, DollarSign, Users } from 'lucide-react';

interface SplitInputProps {
  method: 'equal' | 'percentage' | 'custom';
  members: GroupMember[];
  totalAmount: number;
  values: Record<string, number>;
  onChange: (values: Record<string, number>) => void;
}

export const SplitInput: React.FC<SplitInputProps> = ({
  method,
  members,
  totalAmount,
  values,
  onChange,
}) => {
  // Reset values when switching methods
  useEffect(() => {
    if (method === 'equal') {
      onChange({});
    } else if (method === 'percentage') {
      const equalPct = Math.round((100 / members.length) * 100) / 100;
      const initialPcts: Record<string, number> = {};
      members.forEach((m) => {
        initialPcts[m.user_id] = equalPct;
      });
      onChange(initialPcts);
    } else if (method === 'custom') {
      const equalShare = Math.round((totalAmount / members.length) * 100) / 100;
      const initialAmounts: Record<string, number> = {};
      members.forEach((m) => {
        initialAmounts[m.user_id] = equalShare;
      });
      onChange(initialAmounts);
    }
  }, [method, members, onChange]);

  const handleValueChange = (userId: string, val: number) => {
    onChange({
      ...values,
      [userId]: val,
    });
  };

  if (method === 'equal') {
    const share = totalAmount > 0 ? (totalAmount / members.length).toFixed(2) : '0.00';
    return (
      <div className="bg-black/20 border border-glass-border/30 rounded-lg p-4 animate-fade-in text-center">
        <Users className="w-6 h-6 text-brand-accent2 mx-auto mb-2" />
        <p className="text-sm font-semibold text-primary">Split Equally</p>
        <p className="text-xs text-muted mt-1">
          Each member pays <strong className="text-brand-accent2">₹{share}</strong> (total {members.length} members)
        </p>
      </div>
    );
  }

  if (method === 'percentage') {
    const totalPercent = Object.values(values).reduce((sum, v) => sum + (v || 0), 0);
    const isValid = Math.abs(totalPercent - 100) < 0.05;

    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center justify-between border-b border-glass-border/30 pb-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Share Percentage</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isValid ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' : 'bg-brand-red/10 text-brand-red border border-brand-red/20'
          }`}>
            Total: {totalPercent.toFixed(1)}% / 100%
          </span>
        </div>

        <div className="space-y-2">
          {members.map((member) => {
            const pct = values[member.user_id] || 0;
            const amountShare = (totalAmount * pct) / 100;

            return (
              <div key={member.user_id} className="flex items-center justify-between gap-4 bg-black/10 border border-glass-border/20 rounded-lg p-2.5">
                <span className="text-sm font-semibold text-primary truncate max-w-[150px]">
                  {member.profile.display_name}
                </span>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted font-medium">
                    ₹{amountShare.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>

                  <div className="relative w-24">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      placeholder="0"
                      value={pct || ''}
                      onChange={(e) => handleValueChange(member.user_id, Number(e.target.value))}
                      className="w-full glass-input pr-7 pl-3 py-1.5 text-sm text-right"
                    />
                    <Percent className="w-3.5 h-3.5 text-muted absolute right-2 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (method === 'custom') {
    const totalAllocated = Object.values(values).reduce((sum, v) => sum + (v || 0), 0);
    const remaining = totalAmount - totalAllocated;
    const isValid = Math.abs(remaining) < 0.05;

    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center justify-between border-b border-glass-border/30 pb-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Custom Splits (₹)</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isValid ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' : 'bg-brand-red/10 text-brand-red border border-brand-red/20'
          }`}>
            {isValid ? 'Balanced' : `Unallocated: ₹${remaining.toFixed(2)}`}
          </span>
        </div>

        <div className="space-y-2">
          {members.map((member) => {
            const val = values[member.user_id] || 0;

            return (
              <div key={member.user_id} className="flex items-center justify-between gap-4 bg-black/10 border border-glass-border/20 rounded-lg p-2.5">
                <span className="text-sm font-semibold text-primary truncate max-w-[150px]">
                  {member.profile.display_name}
                </span>

                <div className="relative w-32">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={val || ''}
                    onChange={(e) => handleValueChange(member.user_id, Number(e.target.value))}
                    className="w-full glass-input pl-7 pr-3 py-1.5 text-sm text-right font-mono"
                  />
                  <DollarSign className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};
