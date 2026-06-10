import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';
import { SplitInput } from '../components/SplitInput';
import { ReceiptUpload } from '../components/ReceiptUpload';
import { ArrowLeft, Sparkles, DollarSign, Calendar, User, Tag } from 'lucide-react';
import type { SplitMethod } from '../lib/generateSplits';

export const ExpenseCreate: React.FC = () => {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    activeGroup,
    activeMembers,
    addExpense,
    fetchGroupDetails,
    loading: storeLoading,
    error: storeError,
    clearError,
  } = useGroupStore();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [splitValues, setSplitValues] = useState<Record<string, number>>({});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Initialize page details
  useEffect(() => {
    if (groupId) {
      fetchGroupDetails(groupId);
    }
  }, [groupId, fetchGroupDetails]);

  // Set default payer to current user once members load
  useEffect(() => {
    if (user && activeMembers.length > 0) {
      setPaidBy(user.id);
    }
  }, [user, activeMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    const parsedAmount = Number(amount);
    if (!title.trim()) {
      setFormError('Description is required');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Amount must be a positive number');
      return;
    }
    if (!paidBy) {
      setFormError('Please select who paid');
      return;
    }

    setSubmitting(true);
    
    // Add expense saves details, handles uploads, and updates store balances
    const success = await addExpense(
      groupId!,
      title.trim(),
      parsedAmount,
      paidBy,
      date,
      splitMethod,
      splitValues,
      receiptFile
    );

    setSubmitting(false);

    if (success) {
      navigate(`/groups/${groupId}`);
    } else {
      // If store set an error, it will show from groupStore error state
    }
  };

  if (storeLoading && !activeGroup) {
    return (
      <div className="space-y-6 animate-pulse max-w-xl mx-auto">
        <div className="h-6 w-20 bg-glass-card rounded"></div>
        <div className="h-96 bg-glass-card rounded-xl"></div>
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <div className="glass-card p-8 text-center max-w-md mx-auto">
        <h2 className="text-xl font-bold text-primary mb-2 font-mono">Group not found</h2>
        <button onClick={() => navigate('/dashboard')} className="btn-primary px-4 py-2 text-xs rounded-lg font-bold">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="p-2.5 rounded-lg border border-glass-border hover:bg-glass-card text-secondary hover:text-white transition-all"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary">Add Expense</h1>
          <p className="text-secondary text-sm mt-0.5">Record a shared bill to divide among the group.</p>
        </div>
      </div>

      {formError && (
        <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs rounded-lg p-3">
          {formError}
        </div>
      )}

      {storeError && (
        <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs rounded-lg p-3">
          {storeError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-card p-6 border border-glass-border space-y-4">
          
          {/* Description */}
          <div className="form-group flex flex-col gap-2">
            <label className="form-label text-xs font-semibold text-secondary uppercase tracking-wide">
              Description
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Dinner at Pali Village Café"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full glass-input pl-10 pr-4 py-2.5 text-sm"
                required
              />
              <Tag className="w-4.5 h-4.5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="form-group flex flex-col gap-2">
              <label className="form-label text-xs font-semibold text-secondary uppercase tracking-wide">
                Amount (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full glass-input pl-10 pr-4 py-2.5 text-sm font-semibold"
                  required
                />
                <DollarSign className="w-4.5 h-4.5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Date */}
            <div className="form-group flex flex-col gap-2">
              <label className="form-label text-xs font-semibold text-secondary uppercase tracking-wide">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full glass-input pl-10 pr-4 py-2.5 text-sm"
                  required
                />
                <Calendar className="w-4.5 h-4.5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Paid By */}
            <div className="form-group flex flex-col gap-2">
              <label className="form-label text-xs font-semibold text-secondary uppercase tracking-wide">
                Paid By
              </label>
              <div className="relative">
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full glass-input pl-10 pr-4 py-2.5 text-sm appearance-none bg-transparent"
                  required
                >
                  <option value="" disabled className="bg-white text-slate-900">Select member</option>
                  {activeMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id} className="bg-white text-slate-900">
                      {m.profile.display_name} {m.user_id === user?.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
                <User className="w-4.5 h-4.5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Split Method Selector */}
            <div className="form-group flex flex-col gap-2">
              <label className="form-label text-xs font-semibold text-secondary uppercase tracking-wide">
                Split Method
              </label>
              <div className="flex gap-1 bg-black/30 p-1 border border-glass-border rounded-lg h-[41px] items-center">
                {(['equal', 'percentage', 'custom'] as SplitMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSplitMethod(m)}
                    className={`flex-1 text-[11px] font-bold py-1.5 rounded-md capitalize transition-all select-none ${
                      splitMethod === m
                        ? 'bg-glass-card-strong text-brand-accent2 border border-glass-border shadow-md'
                        : 'bg-transparent text-secondary hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Dynamic Splits inputs panel */}
        <div className="glass-card p-6 border border-glass-border space-y-4">
          <SplitInput
            method={splitMethod}
            members={activeMembers}
            totalAmount={Number(amount) || 0}
            values={splitValues}
            onChange={setSplitValues}
          />
        </div>

        {/* Receipt Upload panel */}
        <div className="glass-card p-6 border border-glass-border space-y-3">
          <label className="block text-xs font-semibold text-secondary uppercase tracking-wide">
            Attach Receipt / Invoice (Optional)
          </label>
          <ReceiptUpload
            selectedFile={receiptFile}
            onFileSelect={setReceiptFile}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full py-4 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Sparkles className="w-4.5 h-4.5" />
              Save Expense details
            </>
          )}
        </button>
      </form>
    </div>
  );
};
