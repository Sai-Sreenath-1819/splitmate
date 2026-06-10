import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, CheckCircle2 } from 'lucide-react';

interface GroupCardProps {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
  myBalance: number;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  id,
  name,
  emoji,
  memberCount,
  myBalance,
}) => {
  const navigate = useNavigate();

  const formattedBalance = Math.abs(myBalance).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });

  return (
    <div
      onClick={() => navigate(`/groups/${id}`)}
      className="group-card glass-card glass-card-hover p-5 relative overflow-hidden cursor-pointer select-none"
    >
      {/* Background Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <div className="flex items-start justify-between relative z-10">
        <div>
          <span className="text-3xl block mb-3 filter drop-shadow-md">{emoji || '💸'}</span>
          <h3 className="text-base font-bold text-primary mb-1 group-hover:text-brand-accent2 transition-colors">{name}</h3>
          <p className="text-xs text-muted font-medium">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="mt-5 relative z-10 flex items-center justify-between bg-black/15 border border-glass-border/30 rounded-lg p-3">
        <span className="text-xs text-muted font-semibold tracking-wide uppercase">Your Balance</span>
        <div className="flex items-center gap-1.5 font-bold">
          {myBalance > 0.01 ? (
            <div className="flex items-center text-brand-green text-xs sm:text-sm">
              <ArrowUpRight className="w-4 h-4 mr-0.5" />
              <span>+{formattedBalance}</span>
            </div>
          ) : myBalance < -0.01 ? (
            <div className="flex items-center text-brand-red text-xs sm:text-sm">
              <ArrowDownLeft className="w-4 h-4 mr-0.5" />
              <span>-{formattedBalance}</span>
            </div>
          ) : (
            <div className="flex items-center text-secondary text-xs sm:text-sm">
              <CheckCircle2 className="w-4 h-4 mr-1 text-muted" />
              <span>Settled</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
