import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';
import { SettlementList } from '../components/SettlementList';
import { ArrowLeft, Landmark, CheckSquare, History, DollarSign } from 'lucide-react';

export const GroupSettle: React.FC = () => {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    activeGroup,
    activeMembers,
    activeSettlements,
    simplifiedDebts,
    fetchGroupDetails,
    addSettlement,
    loading,
    error,
  } = useGroupStore();


  useEffect(() => {
    if (groupId) {
      fetchGroupDetails(groupId);
    }
  }, [groupId, fetchGroupDetails]);

  const handleSettle = async (fromUser: string, toUser: string, amount: number) => {
    if (!groupId) return;

    const fromName = activeMembers.find((m) => m.user_id === fromUser)?.profile.display_name || 'Someone';
    const toName = activeMembers.find((m) => m.user_id === toUser)?.profile.display_name || 'Someone';

    if (!window.confirm(`Mark settlement: ${fromName} paid ${toName} ₹${amount.toFixed(2)}?`)) {
      return;
    }

    // Add settlement writes a settlement transaction, resolving balances
    const success = await addSettlement(
      groupId,
      fromUser,
      toUser,
      amount,
      `Settle up: ${fromName} -> ${toName}`
    );


    if (!success) {
      alert('Failed to save settlement record.');
    }
  };

  if (loading && !activeGroup) {
    return (
      <div className="space-y-6 animate-pulse max-w-2xl mx-auto">
        <div className="h-6 w-20 bg-glass-card rounded"></div>
        <div className="h-64 bg-glass-card rounded-xl"></div>
      </div>
    );
  }

  if (error || !activeGroup) {
    return (
      <div className="glass-card p-8 text-center max-w-md mx-auto">
        <h2 className="text-xl font-bold text-primary mb-2">Group not found</h2>
        <button onClick={() => navigate('/dashboard')} className="btn-primary px-4 py-2 text-xs rounded-lg font-bold">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-glass-border/30 pb-4">
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="p-2.5 rounded-lg border border-glass-border hover:bg-glass-card text-secondary hover:text-white transition-all"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <span className="text-[10px] text-brand-accent2 font-bold uppercase tracking-wider bg-brand-accent/10 border border-brand-accent/20 px-2 py-0.5 rounded">
            {activeGroup.emoji} {activeGroup.name}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-primary mt-1.5 flex items-center gap-2">
            Settle Balances <Landmark className="w-5.5 h-5.5 text-brand-accent2" />
          </h1>
        </div>
      </div>

      {/* Simplified Debts List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-primary flex items-center gap-1.5">
            <CheckSquare className="w-4.5 h-4.5 text-brand-green" />
            Simplified Balances
          </h2>
          <span className="text-xs text-muted font-semibold bg-black/30 border border-glass-border/40 px-2 py-0.5 rounded-full">
            Greedy Optimization
          </span>
        </div>

        <SettlementList
          debts={simplifiedDebts}
          members={activeMembers}
          onSettle={handleSettle}
          myUserId={user?.id || ''}
        />
      </div>

      {/* Settlement Log History Section */}
      <div className="space-y-4 pt-4">
        <h2 className="text-base font-bold text-primary flex items-center gap-1.5">
          <History className="w-4.5 h-4.5 text-brand-accent" />
          Settlement History Log
        </h2>

        {activeSettlements.length === 0 ? (
          <div className="glass-card p-6 border border-glass-border text-center text-xs text-muted">
            No settlement records logged in this group yet.
          </div>
        ) : (
          <div className="space-y-2">
            {activeSettlements.map((s) => {
              const formattedAmount = s.amount.toLocaleString('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 2,
              });

              const formattedDate = new Date(s.settled_at).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={s.id}
                  className="glass-card p-3 border border-glass-border/30 flex items-center justify-between text-xs bg-black/10 text-secondary"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-primary truncate flex items-center gap-1.5">
                      <span className="line-through text-muted select-none">
                        {s.from_name} paid {s.to_name}
                      </span>
                      <span className="text-[10px] text-brand-green bg-brand-green/10 px-1.5 py-0.2 rounded border border-brand-green/20 font-bold uppercase tracking-wider flex items-center gap-0.5">
                        <DollarSign className="w-2.5 h-2.5" />
                        Settled
                      </span>
                    </p>
                    <p className="text-[10px] text-muted mt-0.5">{formattedDate}</p>
                  </div>

                  <span className="font-bold text-brand-green font-mono flex-shrink-0">
                    {formattedAmount}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
