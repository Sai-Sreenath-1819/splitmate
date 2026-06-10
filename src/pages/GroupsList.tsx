import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroupStore } from '../stores/groupStore';
import { GroupCard } from '../components/GroupCard';
import { Plus, Users } from 'lucide-react';

export const GroupsList: React.FC = () => {
  const navigate = useNavigate();
  const { groups, fetchGroups, loading } = useGroupStore();

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary flex items-center gap-2">
            Expense Groups
          </h1>
          <p className="text-secondary text-sm mt-1">
            Browse active shared groups and settle balances.
          </p>
        </div>

        <button
          onClick={() => navigate('/groups/new')}
          className="btn-primary flex items-center justify-center gap-1.5 px-5 py-3 rounded-lg text-sm font-bold shadow-lg"
        >
          <Plus className="w-4.5 h-4.5" />
          Create Group
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-card p-6 border border-glass-border h-40 animate-pulse bg-white/[0.01]"></div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="glass-card p-12 border border-glass-border text-center max-w-xl mx-auto mt-8">
          <div className="w-16 h-16 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent2 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-primary mb-1">Create your first group</h2>
          <p className="text-secondary text-sm mb-6 leading-relaxed">
            Split bills with roomies, trips, or dining buddies. Add members by their unique Split ID codes.
          </p>
          <button
            onClick={() => navigate('/groups/new')}
            className="btn-primary px-6 py-3 rounded-lg text-sm font-bold shadow-lg"
          >
            Get Started
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              id={group.id}
              name={group.name}
              emoji={group.emoji}
              memberCount={group.member_count || 0}
              myBalance={group.my_balance || 0}
            />
          ))}

          {/* Dotted Create Card */}
          <div
            onClick={() => navigate('/groups/new')}
            className="glass-card border-2 border-dashed border-glass-border/40 hover:border-brand-accent/50 hover:bg-glass-hover p-6 rounded-lg text-center flex flex-col items-center justify-center min-h-[160px] cursor-pointer select-none group transition-all duration-200"
          >
            <div className="w-10 h-10 bg-glass-card border border-glass-border group-hover:border-brand-accent/30 text-muted group-hover:text-brand-accent2 rounded-full flex items-center justify-center text-lg mx-auto mb-3 transition-colors duration-200">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-muted group-hover:text-primary transition-colors duration-200">
              Create new group
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
