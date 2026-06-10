import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { Profile as UserProfile } from '../stores/authStore';
import { UserIdBadge } from '../components/UserIdBadge';
import { supabase } from '../lib/supabase';
import { User, Mail, Plus, Search, AlertCircle, Trash2, Check } from 'lucide-react';

export const Profile: React.FC = () => {
  const { profile, user, updateProfile, isMock } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Friends states
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [friendCode, setFriendCode] = useState('');
  const [searchingFriend, setSearchingFriend] = useState(false);
  const [friendSearchError, setFriendSearchError] = useState<string | null>(null);
  const [friendSearchSuccess, setFriendSearchSuccess] = useState<string | null>(null);

  // Set initial display name
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  // Load friends from localStorage (stores custom local client mappings to prevent schema modifications)
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`sm_friends_${user.id}`);
      if (stored) {
        setFriends(JSON.parse(stored));
      }
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateSuccess(false);
    setUpdateError(null);

    if (displayName.trim().length < 2) {
      setUpdateError('Name must be at least 2 characters');
      setUpdating(false);
      return;
    }

    const ok = await updateProfile(displayName.trim());
    setUpdating(false);
    if (ok) {
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 2500);
    } else {
      setUpdateError('Failed to update display name');
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setFriendSearchError(null);
    setFriendSearchSuccess(null);

    const targetCode = friendCode.trim().toUpperCase();
    if (!targetCode) return;

    if (targetCode === profile?.user_code) {
      setFriendSearchError("You can't add yourself as a friend");
      return;
    }

    if (friends.some((f) => f.user_code === targetCode)) {
      setFriendSearchError('This user is already in your friends list');
      return;
    }

    setSearchingFriend(true);

    if (isMock) {
      // Mock Friend Search
      const allProfiles = JSON.parse(localStorage.getItem('sm_mock_all_profiles') || '[]');
      const found = allProfiles.find((p: any) => p.user_code === targetCode);
      setSearchingFriend(false);

      if (found) {
        const updatedFriends = [...friends, found];
        setFriends(updatedFriends);
        localStorage.setItem(`sm_friends_${user?.id}`, JSON.stringify(updatedFriends));
        setFriendCode('');
        setFriendSearchSuccess(`Successfully added ${found.display_name}!`);
      } else {
        setFriendSearchError('No profile found with that user code');
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_code', targetCode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setFriendSearchError('No profile found with that user code');
        } else {
          throw error;
        }
      } else {
        const updatedFriends = [...friends, data];
        setFriends(updatedFriends);
        localStorage.setItem(`sm_friends_${user?.id}`, JSON.stringify(updatedFriends));
        setFriendCode('');
        setFriendSearchSuccess(`Successfully added ${data.display_name}!`);
      }
    } catch (err) {
      console.error(err);
      setFriendSearchError('Failed to add friend. Connection error.');
    } finally {
      setSearchingFriend(false);
    }
  };

  const handleRemoveFriend = (friendId: string) => {
    const updated = friends.filter((f) => f.id !== friendId);
    setFriends(updated);
    localStorage.setItem(`sm_friends_${user?.id}`, JSON.stringify(updated));
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-primary">Your Profile</h1>
        <p className="text-secondary text-sm mt-1">Manage your details, user code, and friends list.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Left Side: Profile info */}
        <div className="space-y-6">
          <div className="glass-card p-6 border border-glass-border space-y-6">
            <h2 className="text-base font-bold text-primary border-b border-glass-border/30 pb-2 uppercase tracking-wider text-[11px] text-brand-accent2">
              Account Information
            </h2>

            {/* Display Badge Code */}
            <div>
              <span className="text-xs text-muted block mb-2 font-semibold">Your unique Split ID</span>
              {profile ? (
                <UserIdBadge code={profile.user_code} size="lg" />
              ) : (
                <div className="h-10 w-28 bg-glass-card animate-pulse rounded-lg"></div>
              )}
              <span className="text-[11px] text-muted leading-normal mt-2.5 block">
                Give this code to friends. They can add you to any split group using just this code—completely replacing mobile number imports!
              </span>
            </div>

            {/* Edit Profile Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wide">
                  Display Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full glass-input pl-10 pr-4 py-2.5 text-sm"
                    required
                  />
                  <User className="w-4.5 h-4.5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wide">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full glass-input pl-10 pr-4 py-2.5 text-sm opacity-50 cursor-not-allowed"
                  />
                  <Mail className="w-4.5 h-4.5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[10px] text-muted mt-1 block">Account emails cannot be changed.</span>
              </div>

              {updateError && (
                <div className="text-xs text-brand-red bg-brand-red/10 border border-brand-red/20 p-2.5 rounded-lg">
                  {updateError}
                </div>
              )}

              {updateSuccess && (
                <div className="text-xs text-brand-green bg-brand-green/10 border border-brand-green/20 p-2.5 rounded-lg flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Profile details saved successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={updating}
                className="btn-primary w-full py-2.5 rounded-lg text-sm font-semibold"
              >
                {updating ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Friends section */}
        <div className="space-y-6">
          <div className="glass-card p-6 border border-glass-border space-y-6">
            <h2 className="text-base font-bold text-primary border-b border-glass-border/30 pb-2 uppercase tracking-wider text-[11px] text-brand-accent2">
              Friends Registry
            </h2>

            {/* Add Friend Form */}
            <form onSubmit={handleAddFriend} className="space-y-3">
              <label className="block text-xs font-semibold text-secondary mb-1 uppercase tracking-wide">
                Add Friend by Split ID
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Enter friend ID e.g. SM-R4P9"
                    value={friendCode}
                    onChange={(e) => setFriendCode(e.target.value)}
                    className="w-full glass-input pl-10 pr-4 py-2.5 text-sm"
                    required
                  />
                  <Search className="w-4.5 h-4.5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  type="submit"
                  disabled={searchingFriend}
                  className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-1 font-bold"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {friendSearchError && (
                <div className="text-[11px] text-brand-red flex items-center gap-1.5 mt-1 bg-brand-red/10 p-2.5 border border-brand-red/20 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5" /> {friendSearchError}
                </div>
              )}

              {friendSearchSuccess && (
                <div className="text-[11px] text-brand-green flex items-center gap-1.5 mt-1 bg-brand-green/10 p-2.5 border border-brand-green/20 rounded-lg">
                  <Check className="w-4 h-4" /> {friendSearchSuccess}
                </div>
              )}
            </form>

            {/* List of Friends */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider text-[10px]">
                Your Friends ({friends.length})
              </h3>
              
              {friends.length === 0 ? (
                <div className="text-xs text-muted py-8 text-center bg-black/10 rounded-lg border border-glass-border/20">
                  No friends added yet. Add friends using their Split IDs to include them in new expense groups.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between gap-3 bg-black/20 border border-glass-border/30 p-2.5 rounded-lg text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-primary truncate block">{friend.display_name}</span>
                        <span className="font-mono text-brand-accent2 text-[10px]">{friend.user_code}</span>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="p-1.5 rounded-md border border-glass-border hover:border-brand-red hover:bg-brand-red/10 text-secondary hover:text-brand-red transition-all"
                        title="Remove friend"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
