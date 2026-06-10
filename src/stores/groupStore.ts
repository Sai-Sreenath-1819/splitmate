import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { Profile } from './authStore';
import { simplifyDebts } from '../lib/debtSimplify';
import type { Debt } from '../lib/debtSimplify';
import { calculateSplits } from '../lib/generateSplits';
import type { SplitMethod } from '../lib/generateSplits';

export interface Group {
  id: string;
  name: string;
  emoji: string;
  created_by: string | null;
  created_at: string;
  member_count?: number;
  my_balance?: number;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
  profile: Profile;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  profile?: Profile;
}

export interface Expense {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  paid_by: string;
  created_by: string;
  date: string;
  split_method: SplitMethod;
  receipt_url: string | null;
  created_at: string;
  payer_name?: string;
  creator_name?: string;
  splits: ExpenseSplit[];
}

export interface Settlement {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  note: string | null;
  settled_at: string;
  created_by: string;
  from_name?: string;
  to_name?: string;
}

interface GroupState {
  groups: Group[];
  activeGroup: Group | null;
  activeMembers: GroupMember[];
  activeExpenses: Expense[];
  activeSettlements: Settlement[];
  activeBalances: Record<string, number>; // user_id -> net balance
  simplifiedDebts: Debt[];
  loading: boolean;
  error: string | null;

  fetchGroups: () => Promise<void>;
  createGroup: (name: string, emoji: string, memberUserCodes: string[]) => Promise<string | null>;
  fetchGroupDetails: (groupId: string) => Promise<void>;
  addExpense: (
    groupId: string,
    title: string,
    amount: number,
    paidBy: string,
    date: string,
    splitMethod: SplitMethod,
    splitValues: Record<string, number>,
    receiptFile: File | null
  ) => Promise<boolean>;
  deleteExpense: (expenseId: string) => Promise<boolean>;
  addSettlement: (
    groupId: string,
    fromUser: string,
    toUser: string,
    amount: number,
    note: string
  ) => Promise<boolean>;
  getReceiptSignedUrl: (receiptUrl: string) => Promise<string | null>;
  inviteMember: (groupId: string, userCode: string) => Promise<boolean>;
  clearError: () => void;
}

// Helper to initialize mock data inside LocalStorage
const getMockStore = () => {
  const groups = JSON.parse(localStorage.getItem('sm_mock_groups') || '[]');
  const members = JSON.parse(localStorage.getItem('sm_mock_group_members') || '[]');
  const expenses = JSON.parse(localStorage.getItem('sm_mock_expenses') || '[]');
  const splits = JSON.parse(localStorage.getItem('sm_mock_expense_splits') || '[]');
  const settlements = JSON.parse(localStorage.getItem('sm_mock_settlements') || '[]');
  const profiles = JSON.parse(localStorage.getItem('sm_mock_all_profiles') || '[]');
  return { groups, members, expenses, splits, settlements, profiles };
};

const saveMockStore = (data: {
  groups: any[];
  members: any[];
  expenses: any[];
  splits: any[];
  settlements: any[];
}) => {
  localStorage.setItem('sm_mock_groups', JSON.stringify(data.groups));
  localStorage.setItem('sm_mock_group_members', JSON.stringify(data.members));
  localStorage.setItem('sm_mock_expenses', JSON.stringify(data.expenses));
  localStorage.setItem('sm_mock_expense_splits', JSON.stringify(data.splits));
  localStorage.setItem('sm_mock_settlements', JSON.stringify(data.settlements));
};

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  activeGroup: null,
  activeMembers: [],
  activeExpenses: [],
  activeSettlements: [],
  activeBalances: {},
  simplifiedDebts: [],
  loading: false,
  error: null,

  fetchGroups: async () => {
    set({ loading: true, error: null });
    const authState = useAuthStore.getState();
    const currentUserId = authState.user?.id;
    if (!currentUserId) {
      set({ groups: [], loading: false });
      return;
    }

    if (authState.isMock) {
      // Run Mock Fetch
      const mock = getMockStore();
      // Find groups user is a member of
      const userGroupIds = mock.members
        .filter((m: any) => m.user_id === currentUserId)
        .map((m: any) => m.group_id);

      const userGroups = mock.groups.filter((g: any) => userGroupIds.includes(g.id));

      const processedGroups = userGroups.map((group: any) => {
        // Calculate member count
        const mCount = mock.members.filter((m: any) => m.group_id === group.id).length;
        
        // Calculate my balance in this group
        // sum(paid by me) - sum(my owed) + sum(settlement paid by me) - sum(settlement to me)
        const groupExpenses = mock.expenses.filter((e: any) => e.group_id === group.id);
        const groupExpenseIds = groupExpenses.map((e: any) => e.id);
        const groupSplits = mock.splits.filter((s: any) => groupExpenseIds.includes(s.expense_id));
        const groupSettlements = mock.settlements.filter((s: any) => s.group_id === group.id);

        const paidByMe = groupExpenses
          .filter((e: any) => e.paid_by === currentUserId)
          .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

        const owedByMe = groupSplits
          .filter((s: any) => s.user_id === currentUserId)
          .reduce((sum: number, s: any) => sum + Number(s.amount_owed), 0);

        const settledByMe = groupSettlements
          .filter((s: any) => s.from_user === currentUserId)
          .reduce((sum: number, s: any) => sum + Number(s.amount), 0);

        const settledToMe = groupSettlements
          .filter((s: any) => s.to_user === currentUserId)
          .reduce((sum: number, s: any) => sum + Number(s.amount), 0);

        const net = paidByMe - owedByMe + settledByMe - settledToMe;

        return {
          ...group,
          member_count: mCount,
          my_balance: Math.round(net * 100) / 100,
        };
      });

      // Sort by absolute balance descending
      processedGroups.sort((a: Group, b: Group) => Math.abs(b.my_balance || 0) - Math.abs(a.my_balance || 0));

      set({ groups: processedGroups, loading: false });
      return;
    }

    try {
      // 1. Get group_memberships
      const { data: memberRows, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id');

      if (memberErr) throw memberErr;
      const groupIds = memberRows?.map((m) => m.group_id) || [];

      if (groupIds.length === 0) {
        set({ groups: [], loading: false });
        return;
      }

      // 2. Load groups
      const { data: groupsData, error: groupsErr } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      if (groupsErr) throw groupsErr;

      // 3. Process statistics for each group
      const processed: Group[] = [];
      for (const group of groupsData) {
        // Fetch members count
        const { count: mCount } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);

        // Fetch balances
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount, paid_by')
          .eq('group_id', group.id);

        const { data: splits } = await supabase
          .from('expense_splits')
          .select('amount_owed, user_id, expenses!inner(group_id)')
          .eq('expenses.group_id', group.id);

        const { data: settlements } = await supabase
          .from('settlements')
          .select('amount, from_user, to_user')
          .eq('group_id', group.id);

        const paidByMe = expenses
          ?.filter((e) => e.paid_by === currentUserId)
          .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

        const owedByMe = splits
          ?.filter((s) => s.user_id === currentUserId)
          .reduce((sum, s) => sum + Number(s.amount_owed), 0) || 0;

        const settledByMe = settlements
          ?.filter((s) => s.from_user === currentUserId)
          .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

        const settledToMe = settlements
          ?.filter((s) => s.to_user === currentUserId)
          .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

        const net = paidByMe - owedByMe + settledByMe - settledToMe;

        processed.push({
          ...group,
          member_count: mCount || 0,
          my_balance: Math.round(net * 100) / 100,
        });
      }

      processed.sort((a, b) => Math.abs(b.my_balance || 0) - Math.abs(a.my_balance || 0));

      set({ groups: processed, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createGroup: async (name, emoji, memberUserCodes) => {
    set({ loading: true, error: null });
    const authState = useAuthStore.getState();
    const currentUserId = authState.user?.id;
    if (!currentUserId) {
      set({ loading: false, error: 'User is not logged in' });
      return null;
    }

    if (authState.isMock) {
      const mock = getMockStore();
      const newGroupId = crypto.randomUUID();
      const newGroup: Group = {
        id: newGroupId,
        name,
        emoji: emoji || '💸',
        created_by: currentUserId,
        created_at: new Date().toISOString(),
      };

      // Add members
      const newMembers = [
        { group_id: newGroupId, user_id: currentUserId, joined_at: new Date().toISOString() }
      ];

      // Match other users by user_code
      for (const code of memberUserCodes) {
        const found = mock.profiles.find((p: any) => p.user_code === code);
        if (found) {
          newMembers.push({
            group_id: newGroupId,
            user_id: found.id,
            joined_at: new Date().toISOString(),
          });
        }
      }

      mock.groups.push(newGroup);
      mock.members.push(...newMembers);
      saveMockStore(mock);

      set({ loading: false });
      return newGroupId;
    }

    try {
      // 1. Find member IDs based on user codes
      const memberIds: string[] = [currentUserId];
      if (memberUserCodes.length > 0) {
        const { data: matchedProfiles } = await supabase
          .from('profiles')
          .select('id')
          .in('user_code', memberUserCodes);

        matchedProfiles?.forEach((p) => {
          if (p.id !== currentUserId) {
            memberIds.push(p.id);
          }
        });
      }

      // 2. Insert group
      const { data: newGroup, error: groupErr } = await supabase
        .from('groups')
        .insert({
          name,
          emoji,
          created_by: currentUserId,
        })
        .select()
        .single();

      if (groupErr) throw groupErr;

      // 3. Insert group memberships
      const memberships = memberIds.map((uId) => ({
        group_id: newGroup.id,
        user_id: uId,
      }));

      const { error: membersErr } = await supabase
        .from('group_members')
        .insert(memberships);

      if (membersErr) throw membersErr;

      set({ loading: false });
      return newGroup.id;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  fetchGroupDetails: async (groupId) => {
    set({ loading: true, error: null });
    const authState = useAuthStore.getState();
    const currentUserId = authState.user?.id;
    if (!currentUserId) {
      set({ loading: false });
      return;
    }

    if (authState.isMock) {
      const mock = getMockStore();
      const group = mock.groups.find((g: any) => g.id === groupId);
      if (!group) {
        set({ error: 'Group not found', loading: false });
        return;
      }

      // Fetch member profiles
      const memberRelations = mock.members.filter((m: any) => m.group_id === groupId);
      const members: GroupMember[] = memberRelations.map((mr: any) => {
        const prof = mock.profiles.find((p: any) => p.id === mr.user_id) || {
          id: mr.user_id,
          display_name: 'Unknown User',
          user_code: 'SM-????',
          created_at: new Date().toISOString(),
        };
        return {
          group_id: groupId,
          user_id: mr.user_id,
          joined_at: mr.joined_at,
          profile: prof,
        };
      });

      // Fetch expenses
      const groupExpenses = mock.expenses.filter((e: any) => e.group_id === groupId);
      const processedExpenses: Expense[] = groupExpenses.map((exp: any) => {
        const payer = mock.profiles.find((p: any) => p.id === exp.paid_by);
        const creator = mock.profiles.find((p: any) => p.id === exp.created_by);
        const expSplits = mock.splits
          .filter((s: any) => s.expense_id === exp.id)
          .map((s: any) => {
            const splitProf = mock.profiles.find((p: any) => p.id === s.user_id);
            return {
              ...s,
              profile: splitProf,
            };
          });

        return {
          ...exp,
          payer_name: payer ? payer.display_name : 'Unknown User',
          creator_name: creator ? creator.display_name : 'Unknown User',
          splits: expSplits,
        };
      }).sort((a: Expense, b: Expense) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Fetch settlements
      const groupSettlements = mock.settlements.filter((s: any) => s.group_id === groupId);
      const processedSettlements: Settlement[] = groupSettlements.map((set: any) => {
        const fromProf = mock.profiles.find((p: any) => p.id === set.from_user);
        const toProf = mock.profiles.find((p: any) => p.id === set.to_user);
        return {
          ...set,
          from_name: fromProf ? fromProf.display_name : 'Unknown User',
          to_name: toProf ? toProf.display_name : 'Unknown User',
        };
      }).sort((a: Settlement, b: Settlement) => new Date(b.settled_at).getTime() - new Date(a.settled_at).getTime());

      // Calculate Net Balances for each member
      const balances: Record<string, number> = {};
      members.forEach((m) => {
        balances[m.user_id] = 0;
      });

      processedExpenses.forEach((exp) => {
        // Paid user gets positive balance
        if (balances[exp.paid_by] !== undefined) {
          balances[exp.paid_by] += Number(exp.amount);
        }
        // Owed users get negative balance
        exp.splits.forEach((s) => {
          if (balances[s.user_id] !== undefined) {
            balances[s.user_id] -= Number(s.amount_owed);
          }
        });
      });

      processedSettlements.forEach((s) => {
        if (balances[s.from_user] !== undefined) {
          balances[s.from_user] += Number(s.amount);
        }
        if (balances[s.to_user] !== undefined) {
          balances[s.to_user] -= Number(s.amount);
        }
      });

      // Round balances to 2 decimals
      for (const [uId, bal] of Object.entries(balances)) {
        balances[uId] = Math.round(bal * 100) / 100;
      }

      // Compute simplified debts
      const simplified = simplifyDebts(balances);

      set({
        activeGroup: group,
        activeMembers: members,
        activeExpenses: processedExpenses,
        activeSettlements: processedSettlements,
        activeBalances: balances,
        simplifiedDebts: simplified,
        loading: false,
      });
      return;
    }

    try {
      // 1. Fetch group
      const { data: group, error: groupErr } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupErr) throw groupErr;

      // 2. Fetch members
      const { data: membersRows, error: membersErr } = await supabase
        .from('group_members')
        .select('*, profile:profiles(*)')
        .eq('group_id', groupId);

      if (membersErr) throw membersErr;

      // 3. Fetch expenses
      const { data: expensesRows, error: expensesErr } = await supabase
        .from('expenses')
        .select('*')
        .eq('group_id', groupId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (expensesErr) throw expensesErr;

      // Fetch splits and profile mappings
      const processedExpenses: Expense[] = [];
      if (expensesRows && expensesRows.length > 0) {
        const expenseIds = expensesRows.map((e) => e.id);
        const { data: splitsRows } = await supabase
          .from('expense_splits')
          .select('*, profile:profiles(*)')
          .in('expense_id', expenseIds);

        expensesRows.forEach((exp) => {
          const payerProf = membersRows?.find((m) => m.user_id === exp.paid_by)?.profile;
          const creatorProf = membersRows?.find((m) => m.user_id === exp.created_by)?.profile;
          const expSplits = splitsRows?.filter((s) => s.expense_id === exp.id) || [];

          processedExpenses.push({
            ...exp,
            payer_name: payerProf?.display_name || 'Unknown User',
            creator_name: creatorProf?.display_name || 'Unknown User',
            splits: expSplits,
          });
        });
      }

      // 4. Fetch settlements
      const { data: settlementsRows, error: settlementsErr } = await supabase
        .from('settlements')
        .select('*')
        .eq('group_id', groupId)
        .order('settled_at', { ascending: false });

      if (settlementsErr) throw settlementsErr;

      const processedSettlements = settlementsRows?.map((settle) => {
        const fromProf = membersRows?.find((m) => m.user_id === settle.from_user)?.profile;
        const toProf = membersRows?.find((m) => m.user_id === settle.to_user)?.profile;
        return {
          ...settle,
          from_name: fromProf?.display_name || 'Unknown User',
          to_name: toProf?.display_name || 'Unknown User',
        };
      }) || [];

      // Calculate balances
      const balances: Record<string, number> = {};
      const membersList = (membersRows || []) as unknown as GroupMember[];
      
      membersList.forEach((m) => {
        balances[m.user_id] = 0;
      });

      processedExpenses.forEach((exp) => {
        if (balances[exp.paid_by] !== undefined) {
          balances[exp.paid_by] += Number(exp.amount);
        }
        exp.splits.forEach((s) => {
          if (balances[s.user_id] !== undefined) {
            balances[s.user_id] -= Number(s.amount_owed);
          }
        });
      });

      processedSettlements.forEach((s) => {
        if (balances[s.from_user] !== undefined) {
          balances[s.from_user] += Number(s.amount);
        }
        if (balances[s.to_user] !== undefined) {
          balances[s.to_user] -= Number(s.amount);
        }
      });

      for (const [uId, bal] of Object.entries(balances)) {
        balances[uId] = Math.round(bal * 100) / 100;
      }

      const simplified = simplifyDebts(balances);

      set({
        activeGroup: group,
        activeMembers: membersList,
        activeExpenses: processedExpenses,
        activeSettlements: processedSettlements,
        activeBalances: balances,
        simplifiedDebts: simplified,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addExpense: async (groupId, title, amount, paidBy, date, splitMethod, splitValues, receiptFile) => {
    set({ loading: true, error: null });
    const authState = useAuthStore.getState();
    const currentUserId = authState.user?.id;
    if (!currentUserId) {
      set({ loading: false, error: 'User is not logged in' });
      return false;
    }

    const { activeMembers } = get();
    const memberIds = activeMembers.map((m) => m.user_id);
    const calculatedSplits = calculateSplits(amount, splitMethod, memberIds, splitValues);

    // Verify split amounts balance
    const sumSplits = Object.values(calculatedSplits).reduce((sum, v) => sum + v, 0);
    if (Math.abs(sumSplits - amount) > 0.05) {
      set({ loading: false, error: `Splits (${sumSplits}) must equal total expense amount (${amount})` });
      return false;
    }

    if (authState.isMock) {
      const mock = getMockStore();
      const expenseId = crypto.randomUUID();

      let receipt_url: string | null = null;
      if (receiptFile) {
        // Generate mock local file url preview
        receipt_url = URL.createObjectURL(receiptFile);
      }

      const newExpense: Expense = {
        id: expenseId,
        group_id: groupId,
        title,
        amount,
        paid_by: paidBy,
        created_by: currentUserId,
        date,
        split_method: splitMethod,
        receipt_url,
        created_at: new Date().toISOString(),
        splits: [], // populated below
      };

      const newSplits = Object.entries(calculatedSplits).map(([userId, owed]) => ({
        id: crypto.randomUUID(),
        expense_id: expenseId,
        user_id: userId,
        amount_owed: owed,
      }));

      mock.expenses.push(newExpense);
      mock.splits.push(...newSplits);
      saveMockStore(mock);

      set({ loading: false });
      await get().fetchGroupDetails(groupId);
      return true;
    }

    try {
      // 1. Insert expense
      const { data: expRow, error: expErr } = await supabase
        .from('expenses')
        .insert({
          group_id: groupId,
          title,
          amount,
          paid_by: paidBy,
          created_by: currentUserId,
          date,
          split_method: splitMethod,
        })
        .select()
        .single();

      if (expErr) throw expErr;

      // 2. Upload receipt if exists
      let receipt_url: string | null = null;
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const filename = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${groupId}/${expRow.id}/${filename}`;

        const { error: uploadErr } = await supabase.storage
          .from('receipts')
          .upload(filePath, receiptFile);

        if (uploadErr) throw uploadErr;

        receipt_url = filePath;

        // Update expense with receipt path
        await supabase
          .from('expenses')
          .update({ receipt_url })
          .eq('id', expRow.id);
      }

      // 3. Insert expense splits
      const splitsPayload = Object.entries(calculatedSplits).map(([userId, owed]) => ({
        expense_id: expRow.id,
        user_id: userId,
        amount_owed: owed,
      }));

      const { error: splitsErr } = await supabase
        .from('expense_splits')
        .insert(splitsPayload);

      if (splitsErr) throw splitsErr;

      set({ loading: false });
      await get().fetchGroupDetails(groupId);
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  deleteExpense: async (expenseId) => {
    set({ loading: true, error: null });
    const authState = useAuthStore.getState();
    const currentUserId = authState.user?.id;
    const { activeGroup } = get();
    if (!currentUserId || !activeGroup) {
      set({ loading: false, error: 'Session error' });
      return false;
    }

    if (authState.isMock) {
      const mock = getMockStore();
      mock.expenses = mock.expenses.filter((e: any) => e.id !== expenseId);
      mock.splits = mock.splits.filter((s: any) => s.expense_id !== expenseId);
      saveMockStore(mock);
      
      set({ loading: false });
      await get().fetchGroupDetails(activeGroup.id);
      return true;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('created_by', currentUserId); // security double-check client side

      if (error) throw error;

      set({ loading: false });
      await get().fetchGroupDetails(activeGroup.id);
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  addSettlement: async (groupId, fromUser, toUser, amount, note) => {
    set({ loading: true, error: null });
    const authState = useAuthStore.getState();
    const currentUserId = authState.user?.id;
    if (!currentUserId) {
      set({ loading: false, error: 'User is not logged in' });
      return false;
    }

    if (authState.isMock) {
      const mock = getMockStore();
      const settlementId = crypto.randomUUID();
      const newSettlement: Settlement = {
        id: settlementId,
        group_id: groupId,
        from_user: fromUser,
        to_user: toUser,
        amount,
        note: note || null,
        settled_at: new Date().toISOString(),
        created_by: currentUserId,
      };

      mock.settlements.push(newSettlement);
      saveMockStore(mock);

      set({ loading: false });
      await get().fetchGroupDetails(groupId);
      return true;
    }

    try {
      const { error } = await supabase
        .from('settlements')
        .insert({
          group_id: groupId,
          from_user: fromUser,
          to_user: toUser,
          amount,
          note,
          created_by: currentUserId,
        });

      if (error) throw error;

      set({ loading: false });
      await get().fetchGroupDetails(groupId);
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  getReceiptSignedUrl: async (receiptUrl) => {
    const authState = useAuthStore.getState();
    if (authState.isMock) {
      // In mock mode, the receiptUrl is already a local URL.createObjectURL or string, return as is
      return receiptUrl;
    }

    try {
      const { data, error } = await supabase.storage
        .from('receipts')
        .createSignedUrl(receiptUrl, 3600); // 1-hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.error('Error fetching signed receipt URL:', err);
      return null;
    }
  },

  inviteMember: async (groupId, userCode) => {
    set({ loading: true, error: null });
    const authState = useAuthStore.getState();
    if (authState.isMock) {
      const mock = getMockStore();
      const found = mock.profiles.find((p: any) => p.user_code.toUpperCase() === userCode.toUpperCase().trim());
      if (!found) {
        set({ error: `User code "${userCode}" not found`, loading: false });
        return false;
      }
      const isAlreadyMember = mock.members.some((m: any) => m.group_id === groupId && m.user_id === found.id);
      if (isAlreadyMember) {
        set({ error: 'User is already a member of this group', loading: false });
        return false;
      }
      mock.members.push({
        group_id: groupId,
        user_id: found.id,
        joined_at: new Date().toISOString(),
      });
      saveMockStore(mock);
      set({ loading: false });
      await get().fetchGroupDetails(groupId);
      return true;
    }

    try {
      // 1. Find profile by user_code
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_code', userCode.toUpperCase().trim())
        .single();

      if (profileErr || !profile) {
        throw new Error(`User code "${userCode}" not found`);
      }

      // 2. Check if already a member
      const { data: existing } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existing) {
        throw new Error('User is already a member of this group');
      }

      // 3. Insert membership
      const { error: insertErr } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: profile.id,
        });

      if (insertErr) throw insertErr;

      set({ loading: false });
      await get().fetchGroupDetails(groupId);
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
