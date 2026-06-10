import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';
import { supabase } from '../lib/supabase';
import { GroupCard } from '../components/GroupCard';
import { Plus, Flame, TrendingUp, TrendingDown, Layers, ArrowRight, BookOpen } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isMock } = useAuthStore();
  const { groups, fetchGroups, loading: groupsLoading } = useGroupStore();

  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  // Stats calculation
  const totalYouOwe = groups
    .filter((g) => (g.my_balance || 0) < 0)
    .reduce((sum, g) => sum + Math.abs(g.my_balance || 0), 0);

  const totalOwedToYou = groups
    .filter((g) => (g.my_balance || 0) > 0)
    .reduce((sum, g) => sum + (g.my_balance || 0), 0);

  const activeGroupsCount = groups.length;

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    const fetchRecentExpenses = async () => {
      if (!user) return;
      setLoadingExpenses(true);

      if (isMock) {
        // Mock recent expenses aggregation
        const groupsData = JSON.parse(localStorage.getItem('sm_mock_groups') || '[]');
        const membersData = JSON.parse(localStorage.getItem('sm_mock_group_members') || '[]');
        const expensesData = JSON.parse(localStorage.getItem('sm_mock_expenses') || '[]');
        const splitsData = JSON.parse(localStorage.getItem('sm_mock_expense_splits') || '[]');
        const profilesData = JSON.parse(localStorage.getItem('sm_mock_all_profiles') || '[]');

        // Get group IDs I am in
        const myGroupIds = membersData
          .filter((m: any) => m.user_id === user.id)
          .map((m: any) => m.group_id);

        const filtered = expensesData
          .filter((e: any) => myGroupIds.includes(e.group_id))
          .map((exp: any) => {
            const grp = groupsData.find((g: any) => g.id === exp.group_id);
            const payer = profilesData.find((p: any) => p.id === exp.paid_by);
            const expSplits = splitsData.filter((s: any) => s.expense_id === exp.id);
            return {
              ...exp,
              group: grp,
              payer_name: payer ? payer.display_name : 'Unknown User',
              splits: expSplits,
            };
          })
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);

        setRecentExpenses(filtered);
        setLoadingExpenses(false);
        return;
      }

      try {
        // Fetch group memberships first
        const { data: memberRows } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);

        const groupIds = memberRows?.map((m) => m.group_id) || [];
        if (groupIds.length === 0) {
          setRecentExpenses([]);
          setLoadingExpenses(false);
          return;
        }

        // Fetch recent expenses in those groups
        const { data: expenses } = await supabase
          .from('expenses')
          .select('*, group:groups(name, emoji), splits:expense_splits(user_id, amount_owed)')
          .in('group_id', groupIds)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);

        // Fetch profile names for display
        if (expenses && expenses.length > 0) {
          const payerIds = Array.from(new Set(expenses.map((e) => e.paid_by)));
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', payerIds);

          const enriched = expenses.map((exp) => {
            const payer = profiles?.find((p) => p.id === exp.paid_by);
            return {
              ...exp,
              payer_name: payer?.display_name || 'Unknown User',
            };
          });
          setRecentExpenses(enriched);
        } else {
          setRecentExpenses([]);
        }
      } catch (err) {
        console.error('Error fetching dashboard expenses:', err);
      } finally {
        setLoadingExpenses(false);
      }
    };

    fetchRecentExpenses();
  }, [user, groups, isMock]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary flex items-center gap-2">
            Hey, {profile?.display_name || 'there'}! <Flame className="w-6 h-6 text-brand-amber animate-pulse fill-brand-amber/20" />
          </h1>
          <p className="text-secondary text-sm mt-1">
            Track your group balances and split bills instantly.
          </p>
        </div>

        <button
          onClick={() => navigate('/groups/new')}
          className="btn-primary flex items-center justify-center gap-1.5 px-5 py-3 rounded-lg text-sm font-bold shadow-lg"
        >
          <Plus className="w-4.5 h-4.5" />
          New Group
        </button>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 border border-glass-border flex items-center gap-4 relative overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-brand-green/10 border border-brand-green/20 text-brand-green flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-brand-green">
              ₹{totalOwedToYou.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-muted font-bold mt-0.5">Owed to you</div>
          </div>
          <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-brand-green/5 rounded-full blur-xl pointer-events-none"></div>
        </div>

        <div className="glass-card p-5 border border-glass-border flex items-center gap-4 relative overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-brand-red/10 border border-brand-red/20 text-brand-red flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-brand-red">
              ₹{totalYouOwe.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-muted font-bold mt-0.5">You owe</div>
          </div>
          <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-brand-red/5 rounded-full blur-xl pointer-events-none"></div>
        </div>

        <div className="glass-card p-5 border border-glass-border flex items-center gap-4 relative overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-brand-accent2 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-brand-accent2">{activeGroupsCount}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted font-bold mt-0.5">Active groups</div>
          </div>
          <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-brand-accent/5 rounded-full blur-xl pointer-events-none"></div>
        </div>
      </div>

      {/* DASHBOARD LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Groups List (Col span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              Your Expense Groups
            </h2>
            <button
              onClick={() => navigate('/groups')}
              className="text-xs text-brand-accent2 hover:underline font-semibold flex items-center gap-1"
            >
              See all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {groupsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((n) => (
                <div key={n} className="glass-card p-5 border border-glass-border h-36 animate-pulse bg-white/[0.01]"></div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="glass-card p-8 border border-glass-border text-center">
              <BookOpen className="w-8 h-8 text-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-primary">No active groups yet</p>
              <p className="text-xs text-secondary mt-1 mb-4">Create a group to start adding shared bills.</p>
              <button
                onClick={() => navigate('/groups/new')}
                className="btn-secondary px-4 py-2 text-xs font-bold"
              >
                Create a group
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groups.slice(0, 4).map((group) => (
                <GroupCard
                  key={group.id}
                  id={group.id}
                  name={group.name}
                  emoji={group.emoji}
                  memberCount={group.member_count || 0}
                  myBalance={group.my_balance || 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Recent Activity (Col span 1) */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-primary">Recent Activity</h2>

          {loadingExpenses ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="glass-card p-4 border border-glass-border h-16 animate-pulse bg-white/[0.01]"></div>
              ))}
            </div>
          ) : recentExpenses.length === 0 ? (
            <div className="glass-card p-6 border border-glass-border text-center text-xs text-muted">
              No recent expenses found. Add some bills to get started!
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentExpenses.map((exp) => {
                const mySplit = exp.splits?.find((s: any) => s.user_id === user?.id);
                const myOwed = mySplit ? Number(mySplit.amount_owed) : 0;
                const isPayer = exp.paid_by === user?.id;

                let shareText = '';
                let shareColorClass = 'text-muted';

                if (isPayer) {
                  const othersShare = exp.amount - myOwed;
                  if (othersShare > 0.01) {
                    shareText = `+₹${othersShare.toFixed(0)}`;
                    shareColorClass = 'text-brand-green';
                  } else {
                    shareText = 'Paid';
                    shareColorClass = 'text-secondary';
                  }
                } else {
                  if (myOwed > 0.01) {
                    shareText = `-₹${myOwed.toFixed(0)}`;
                    shareColorClass = 'text-brand-red';
                  } else {
                    shareText = 'Neutral';
                    shareColorClass = 'text-muted';
                  }
                }

                return (
                  <div
                    key={exp.id}
                    onClick={() => navigate(`/expenses/${exp.id}`)}
                    className="glass-card glass-card-hover p-3 flex items-center justify-between gap-3 cursor-pointer text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-primary truncate">
                        {exp.title}
                      </div>
                      <div className="text-[10px] text-muted mt-0.5 truncate">
                        {exp.group?.emoji || '🏠'} {exp.group?.name} &middot; Paid by {isPayer ? 'you' : exp.payer_name}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 font-mono">
                      <div className="font-bold text-primary">₹{Math.round(exp.amount)}</div>
                      <div className={`text-[9px] font-bold mt-0.5 ${shareColorClass}`}>{shareText}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
