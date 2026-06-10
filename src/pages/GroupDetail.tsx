import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';
import { BalanceTable } from '../components/BalanceTable';
import { ExpenseItem } from '../components/ExpenseItem';
import { AddMemberByCode } from '../components/AddMemberByCode';
import type { Profile } from '../stores/authStore';
import { ArrowLeft, Plus, DollarSign, ChevronRight, FileText, CheckCircle2 } from 'lucide-react';

export const GroupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    activeGroup,
    activeMembers,
    activeExpenses,
    activeBalances,
    fetchGroupDetails,
    inviteMember,
    loading,
    error,
  } = useGroupStore();

  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchGroupDetails(id);
    }
  }, [id, fetchGroupDetails]);

  const handleAddMember = async (profile: Profile) => {
    if (!activeGroup) return;
    setInviteError(null);
    const success = await inviteMember(activeGroup.id, profile.user_code);
    if (!success) {
      const storeErr = useGroupStore.getState().error;
      setInviteError(storeErr || 'Failed to add member to the group');
      useGroupStore.getState().clearError();
    }
  };

  if (loading && !activeGroup) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-20 bg-glass-card rounded"></div>
        <div className="h-20 bg-glass-card rounded-xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-glass-card rounded-xl lg:col-span-1"></div>
          <div className="h-96 bg-glass-card rounded-xl lg:col-span-2"></div>
        </div>
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <div className="glass-card p-8 text-center max-w-md mx-auto">
        <div className="text-3xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-primary mb-2">Failed to load group</h2>
        <p className="text-secondary text-sm mb-6">{error || 'This group does not exist or you are not a member.'}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary px-4 py-2 text-xs rounded-lg font-bold">
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Calculate my balance
  const myBalance = user ? activeBalances[user.id] || 0 : 0;
  const formattedMyBalance = Math.abs(myBalance).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-glass-border/30 pb-6">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/groups')}
            className="p-2.5 rounded-lg border border-glass-border hover:bg-glass-card text-secondary hover:text-white transition-all mt-1"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          
          <div>
            <div className="flex items-center gap-3">
              <span className="text-4xl filter drop-shadow-md">{activeGroup.emoji}</span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-primary leading-tight">{activeGroup.name}</h1>
                <p className="text-xs text-muted font-medium mt-0.5">Created {new Date(activeGroup.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            {/* Member Initials overlap list */}
            <div className="flex items-center gap-2.5 mt-4">
              <div className="flex -space-x-2">
                {activeMembers.slice(0, 8).map((m) => {
                  const name = m.profile.display_name;
                  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div
                      key={m.user_id}
                      className="inline-block h-8 w-8 rounded-full ring-2 ring-glass-border bg-glass-card-strong text-primary flex items-center justify-center text-xs font-bold font-mono"
                      title={name}
                    >
                      {initials}
                    </div>
                  );
                })}
                {activeMembers.length > 8 && (
                  <div className="inline-block h-8 w-8 rounded-full ring-2 ring-glass-border bg-glass-card-strong text-secondary flex items-center justify-center text-xs font-bold">
                    +{activeMembers.length - 8}
                  </div>
                )}
              </div>
              <span className="text-xs text-secondary font-medium">
                {activeMembers.length} member{activeMembers.length !== 1 ? 's' : ''}
              </span>
            </div>

          </div>
        </div>

        {/* Action button header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/groups/${activeGroup.id}/settle`)}
            className="btn-secondary px-5 py-3 rounded-lg text-sm font-bold flex items-center gap-1.5"
          >
            <DollarSign className="w-4.5 h-4.5" />
            Settle balance
          </button>

          <button
            onClick={() => navigate(`/groups/${activeGroup.id}/expense/new`)}
            className="btn-primary px-5 py-3 rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-lg"
          >
            <Plus className="w-4.5 h-4.5" />
            Add Expense
          </button>
        </div>
      </div>

      {/* BALANCES BANNER */}
      <div className="glass-card p-5 border border-glass-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-br from-brand-accent/5 to-transparent relative overflow-hidden">
        {/* Glow Element */}
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-brand-accent2/10 rounded-full blur-2xl pointer-events-none"></div>

        <div>
          <span className="text-xs text-muted block font-semibold uppercase tracking-wider">Your personal standing</span>
          {myBalance > 0.01 ? (
            <h3 className="text-lg font-bold text-brand-green mt-0.5">
              You are owed <strong className="font-mono text-xl">{formattedMyBalance}</strong> in this group
            </h3>
          ) : myBalance < -0.01 ? (
            <h3 className="text-lg font-bold text-brand-red mt-0.5">
              You owe <strong className="font-mono text-xl">{formattedMyBalance}</strong> in this group
            </h3>
          ) : (
            <h3 className="text-lg font-bold text-secondary mt-0.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-brand-green/80" /> You are completely settled up!
            </h3>
          )}
        </div>

        <button
          onClick={() => navigate(`/groups/${activeGroup.id}/settle`)}
          className="text-xs text-brand-accent2 hover:underline font-bold flex items-center gap-0.5 select-none"
        >
          View simplified debts <ChevronRight className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* DETAIL GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Balances (Col span 1) */}
        <div className="lg:col-span-1 space-y-6">
          <BalanceTable members={activeMembers} balances={activeBalances} />
          
          <div className="space-y-3">
            <AddMemberByCode
              onAddMember={handleAddMember}
              existingMemberIds={activeMembers.map((m) => m.user_id)}
            />
            {inviteError && (
              <div className="text-xs text-brand-red flex items-center gap-1.5 bg-brand-red/10 border border-brand-red/20 p-2.5 rounded-lg animate-fade-in">
                <span>⚠️ {inviteError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Expenses (Col span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            Expense Records
          </h2>

          {activeExpenses.length === 0 ? (
            <div className="glass-card p-12 border border-glass-border text-center">
              <FileText className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-primary">No expenses logged yet</p>
              <p className="text-xs text-secondary mt-1 mb-6">Create the first expense to start dividing bills.</p>
              
              <button
                onClick={() => navigate(`/groups/${activeGroup.id}/expense/new`)}
                className="btn-primary px-5 py-2.5 rounded-lg text-xs font-bold shadow-lg"
              >
                Add first expense
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeExpenses.map((exp) => (
                <ExpenseItem
                  key={exp.id}
                  id={exp.id}
                  title={exp.title}
                  amount={Number(exp.amount)}
                  paidBy={exp.paid_by}
                  payerName={exp.payer_name || 'Unknown'}
                  date={exp.date}
                  receiptUrl={exp.receipt_url}
                  myUserId={user?.id || ''}
                  splits={exp.splits}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
