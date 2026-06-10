import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { Profile } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';
import { AddMemberByCode } from '../components/AddMemberByCode';
import { ArrowLeft, Sparkles, X, Users } from 'lucide-react';

const COMMON_EMOJIS = ['🏠', '💸', '✈️', '🍕', '🚗', '🍔', '🍿', '☕', '🛍️', '💡', '🍻', '🎪'];

export const GroupCreate: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { createGroup, loading, error, clearError } = useGroupStore();

  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💸');
  const [addedMembers, setAddedMembers] = useState<Profile[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleAddMember = (member: Profile) => {
    if (addedMembers.some((m) => m.id === member.id)) return;
    setAddedMembers([...addedMembers, member]);
  };

  const handleRemoveMember = (memberId: string) => {
    setAddedMembers(addedMembers.filter((m) => m.id !== memberId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!name.trim()) {
      setFormError('Group name is required');
      return;
    }

    const memberCodes = addedMembers.map((m) => m.user_code);
    const newGroupId = await createGroup(name.trim(), selectedEmoji, memberCodes);
    
    if (newGroupId) {
      navigate(`/groups/${newGroupId}`);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/groups')}
          className="p-2.5 rounded-lg border border-glass-border hover:bg-glass-card text-secondary hover:text-white transition-all"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary">Create New Group</h1>
          <p className="text-secondary text-sm mt-0.5">Define your group scope and invite friends.</p>
        </div>
      </div>

      {formError && (
        <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs rounded-lg p-3">
          {formError}
        </div>
      )}

      {error && (
        <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs rounded-lg p-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core details card */}
        <div className="glass-card p-6 border border-glass-border space-y-4">
          <div className="form-group flex flex-col gap-2">
            <label className="form-label text-xs font-semibold text-secondary uppercase tracking-wide">
              Group Name
            </label>
            <input
              type="text"
              placeholder="e.g. Flat 4B or Goa Trip 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full glass-input px-4 py-3 text-sm font-semibold"
              required
            />
          </div>

          <div className="form-group flex flex-col gap-2.5">
            <label className="form-label text-xs font-semibold text-secondary uppercase tracking-wide">
              Select Emoji
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center border transition-all ${
                    selectedEmoji === emoji
                      ? 'border-brand-accent bg-brand-accent/20 scale-110 shadow-glow'
                      : 'border-glass-border bg-black/15 hover:bg-glass-card'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Members Invitation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* Lookup Input */}
          <div className="space-y-4">
            <AddMemberByCode
              onAddMember={handleAddMember}
              existingMemberIds={addedMembers.map((m) => m.id)}
            />
          </div>

          {/* Members List */}
          <div className="glass-card p-5 border border-glass-border space-y-4 min-h-[190px]">
            <h3 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <Users className="w-3.5 h-3.5 text-brand-accent2" />
              Group Members ({addedMembers.length + 1})
            </h3>

            <div className="space-y-2.5">
              {/* Creator details */}
              <div className="flex items-center justify-between bg-brand-accent/5 border border-brand-accent/20 p-2.5 rounded-lg text-xs">
                <div className="min-w-0">
                  <span className="font-semibold text-primary truncate block">{profile?.display_name} (You)</span>
                  <span className="font-mono text-brand-accent2 text-[10px]">{profile?.user_code}</span>
                </div>
                <span className="text-[10px] font-bold text-brand-accent2 bg-brand-accent/15 border border-brand-accent/20 px-2 py-0.5 rounded uppercase tracking-wider">
                  Creator
                </span>
              </div>

              {/* Added members */}
              {addedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between bg-black/20 border border-glass-border/30 p-2.5 rounded-lg text-xs animate-fade-in"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-primary truncate block">{member.display_name}</span>
                    <span className="font-mono text-brand-accent2 text-[10px]">{member.user_code}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1 rounded-md border border-glass-border hover:border-brand-red text-secondary hover:text-brand-red hover:bg-brand-red/10 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-4 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Sparkles className="w-4.5 h-4.5" />
              Create Group & Invite Members
            </>
          )}
        </button>
      </form>
    </div>
  );
};
