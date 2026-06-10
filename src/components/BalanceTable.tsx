import React from 'react';
import type { GroupMember } from '../stores/groupStore';
import { TrendingUp, TrendingDown, Check } from 'lucide-react';

interface BalanceTableProps {
  members: GroupMember[];
  balances: Record<string, number>;
}

export const BalanceTable: React.FC<BalanceTableProps> = ({ members, balances }) => {
  return (
    <div className="glass-card border border-glass-border overflow-hidden">
      <div className="p-4 border-b border-glass-border/30 bg-black/10">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Group Balance Sheet</h3>
      </div>

      <div className="divide-y divide-glass-border/30">
        {members.map((member) => {
          const balance = balances[member.user_id] || 0;
          const isCreditor = balance > 0.01;
          const isDebtor = balance < -0.01;
          
          let displayBalance = balance.toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
          });

          return (
            <div key={member.user_id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-sm font-semibold text-primary block truncate">
                  {member.profile.display_name}
                </span>
                <span className="text-[10px] font-mono text-muted">{member.profile.user_code}</span>
              </div>

              <div className="flex-shrink-0 flex items-center gap-2 font-bold font-mono">
                {isCreditor ? (
                  <div className="flex items-center text-brand-green bg-brand-green/10 border border-brand-green/20 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm">
                    <TrendingUp className="w-4 h-4 mr-1.5" />
                    <span>Gets back {displayBalance}</span>
                  </div>
                ) : isDebtor ? (
                  <div className="flex items-center text-brand-red bg-brand-red/10 border border-brand-red/20 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm">
                    <TrendingDown className="w-4 h-4 mr-1.5" />
                    <span>Owes {displayBalance.replace('-', '')}</span>
                  </div>
                ) : (
                  <div className="flex items-center text-secondary bg-black/30 border border-glass-border px-2.5 py-1.5 rounded-lg text-xs sm:text-sm">
                    <Check className="w-3.5 h-3.5 mr-1.5 text-muted" />
                    <span>Settled</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
