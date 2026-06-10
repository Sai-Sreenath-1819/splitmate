import React from 'react';
import type { Debt } from '../lib/debtSimplify';
import type { GroupMember } from '../stores/groupStore';
import { ArrowRight, CheckCircle } from 'lucide-react';

interface SettlementListProps {
  debts: Debt[];
  members: GroupMember[];
  onSettle: (fromUser: string, toUser: string, amount: number) => void;
  myUserId: string;
}

export const SettlementList: React.FC<SettlementListProps> = ({
  debts,
  members,
  onSettle,
  myUserId,
}) => {
  const getMemberName = (userId: string) => {
    const found = members.find((m) => m.user_id === userId);
    return found ? found.profile.display_name : 'Unknown User';
  };

  const getMemberInitials = (userId: string) => {
    const name = getMemberName(userId);
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (debts.length === 0) {
    return (
      <div className="glass-card border border-glass-border p-6 text-center text-muted font-medium flex items-center justify-center gap-2">
        <CheckCircle className="w-5 h-5 text-brand-green" />
        <span>Everyone is completely settled up! No active debts.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {debts.map((debt, index) => {
        const isMyDebt = debt.from === myUserId;
        const isMyCredit = debt.to === myUserId;
        const involved = isMyDebt || isMyCredit;

        const formattedAmount = debt.amount.toLocaleString('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 2,
        });

        return (
          <div
            key={index}
            className={`settle-item glass-card p-4 border flex items-center justify-between gap-4 transition-all duration-200 ${
              involved ? 'border-brand-accent/40 bg-brand-accent/5' : 'border-glass-border'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Debtors / Creditors Visual Flow */}
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-mono"
                  style={{
                    background: isMyDebt ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.06)',
                    color: isMyDebt ? 'var(--red)' : 'var(--text-primary)',
                    border: isMyDebt ? '1px solid rgba(248,113,113,0.25)' : '1px solid var(--glass-border)',
                  }}
                  title={getMemberName(debt.from)}
                >
                  {getMemberInitials(debt.from)}
                </div>
                
                <ArrowRight className="w-4 h-4 text-muted flex-shrink-0" />
                
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-mono"
                  style={{
                    background: isMyCredit ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
                    color: isMyCredit ? 'var(--green)' : 'var(--text-primary)',
                    border: isMyCredit ? '1px solid rgba(52,211,153,0.25)' : '1px solid var(--glass-border)',
                  }}
                  title={getMemberName(debt.to)}
                >
                  {getMemberInitials(debt.to)}
                </div>
              </div>

              {/* Text Description */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate">
                  {isMyDebt ? 'You' : getMemberName(debt.from)} owe{' '}
                  {isMyCredit ? 'you' : getMemberName(debt.to)}
                </p>
                <p className="text-[10px] text-muted font-medium">Simplified debt calculation</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3.5 flex-shrink-0">
              <span className={`text-base font-bold font-mono ${isMyDebt ? 'text-brand-red' : 'text-primary'}`}>
                {formattedAmount}
              </span>
              
              <button
                onClick={() => onSettle(debt.from, debt.to, debt.amount)}
                className="settle-btn px-3 py-1.5 rounded-lg text-xs font-bold border hover:bg-brand-green/20 transition-all text-brand-green bg-brand-green/10 border-brand-green/20"
              >
                Settle up
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
