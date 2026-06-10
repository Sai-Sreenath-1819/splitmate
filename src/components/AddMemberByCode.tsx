import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Profile } from '../stores/authStore';
import { Search, Plus, UserCheck, AlertTriangle } from 'lucide-react';

interface AddMemberByCodeProps {
  onAddMember: (profile: Profile) => void;
  existingMemberIds: string[];
}

export const AddMemberByCode: React.FC<AddMemberByCodeProps> = ({
  onAddMember,
  existingMemberIds,
}) => {
  const { isMock } = useAuthStore();
  const [code, setCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<Profile | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSearched(false);

    const formattedCode = code.trim().toUpperCase();
    if (!formattedCode) return;

    if (!formattedCode.startsWith('SM-') || formattedCode.length < 5) {
      setError('Invalid code format. Codes look like SM-XXXX');
      return;
    }

    setSearching(true);

    if (isMock) {
      // Mock Search
      const allProfiles = JSON.parse(localStorage.getItem('sm_mock_all_profiles') || '[]');
      const found = allProfiles.find((p: Profile) => p.user_code === formattedCode);

      setSearching(false);
      setSearched(true);
      if (found) {
        setResult(found);
      } else {
        setError('No user profile found with that ID');
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_code', formattedCode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('No user profile found with that ID');
        } else {
          throw error;
        }
      } else {
        setResult(data);
      }
    } catch (err: any) {
      console.error(err);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setSearching(false);
      setSearched(true);
    }
  };

  const handleAdd = () => {
    if (result) {
      onAddMember(result);
      // Reset
      setCode('');
      setResult(null);
      setSearched(false);
    }
  };

  const isAlreadyMember = result ? existingMemberIds.includes(result.id) : false;

  return (
    <div className="glass-card p-5 border border-glass-border">
      <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-brand-accent2">
        Add Member by ID
      </h3>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Enter user ID (e.g. SM-A7K2)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full glass-input pl-10 pr-4 py-2.5 text-sm"
          />
          <Search className="w-4.5 h-4.5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="btn-secondary px-4 py-2 text-sm flex items-center justify-center font-semibold"
        >
          {searching ? '...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="mt-3 text-xs text-brand-red flex items-center gap-1.5 bg-brand-red/10 border border-brand-red/20 p-2.5 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {searched && result && (
        <div className="mt-4 animate-fade-in flex items-center justify-between bg-black/20 border border-glass-border/30 rounded-lg p-3">
          <div className="min-w-0">
            <span className="text-xs text-muted block">Profile Matched</span>
            <span className="text-sm font-bold text-primary truncate block">{result.display_name}</span>
            <span className="text-[10px] font-mono text-brand-accent2">{result.user_code}</span>
          </div>

          {isAlreadyMember ? (
            <span className="text-xs text-brand-green/80 flex items-center gap-1 bg-brand-green/10 border border-brand-green/20 px-2.5 py-1 rounded-md font-semibold">
              <UserCheck className="w-3.5 h-3.5" /> Added
            </span>
          ) : (
            <button
              onClick={handleAdd}
              className="btn-primary flex items-center gap-1 text-xs px-3 py-1.5 rounded-md font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Add to Group
            </button>
          )}
        </div>
      )}
    </div>
  );
};
