import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';
import type { Expense } from '../stores/groupStore';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Trash2, Calendar, User, DollarSign, Paperclip, FileText, CheckCircle } from 'lucide-react';

export const ExpenseDetail: React.FC = () => {
  const { id: expenseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isMock } = useAuthStore();
  const {
    activeGroup,
    activeExpenses,
    activeMembers,
    fetchGroupDetails,
    deleteExpense,
    getReceiptSignedUrl,
    loading: storeLoading,
  } = useGroupStore();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadExpenseAndGroup = async () => {
      if (!expenseId) return;
      setLoading(true);

      let groupId = '';

      if (isMock) {
        // Mock lookup
        const expensesData = JSON.parse(localStorage.getItem('sm_mock_expenses') || '[]');
        const found = expensesData.find((e: any) => e.id === expenseId);
        if (found) {
          groupId = found.group_id;
        }
      } else {
        try {
          const { data, error } = await supabase
            .from('expenses')
            .select('group_id')
            .eq('id', expenseId)
            .single();

          if (!error && data) {
            groupId = data.group_id;
          }
        } catch (err) {
          console.error(err);
        }
      }

      if (groupId) {
        await fetchGroupDetails(groupId);
      } else {
        setLoading(false);
      }
    };

    loadExpenseAndGroup();
  }, [expenseId, fetchGroupDetails, isMock]);

  // Sync details from store
  useEffect(() => {
    if (activeExpenses.length > 0 && expenseId) {
      const found = activeExpenses.find((e) => e.id === expenseId);
      if (found) {
        setExpense(found);
        
        // Fetch receipt signed URL if it exists
        if (found.receipt_url) {
          getReceiptSignedUrl(found.receipt_url).then((url) => {
            setReceiptUrl(url);
          });
        }
      }
      setLoading(false);
    }
  }, [activeExpenses, expenseId, getReceiptSignedUrl]);

  const handleDelete = async () => {
    if (!expense || !activeGroup) return;
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    setDeleting(true);
    const ok = await deleteExpense(expense.id);
    setDeleting(false);

    if (ok) {
      navigate(`/groups/${activeGroup.id}`);
    } else {
      alert('Failed to delete expense.');
    }
  };

  if (loading || storeLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-2xl mx-auto">
        <div className="h-6 w-20 bg-glass-card rounded"></div>
        <div className="h-80 bg-glass-card rounded-xl"></div>
      </div>
    );
  }

  if (!expense || !activeGroup) {
    return (
      <div className="glass-card p-8 text-center max-w-md mx-auto">
        <h2 className="text-xl font-bold text-primary mb-2 font-mono">Expense not found</h2>
        <button onClick={() => navigate('/dashboard')} className="btn-primary px-4 py-2 text-xs rounded-lg font-bold">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isCreator = expense.created_by === user?.id;
  const isReceiptPdf = expense.receipt_url?.toLowerCase().endsWith('.pdf');

  const formattedTotal = Number(expense.amount).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });

  const formattedDate = new Date(expense.date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-glass-border/30 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/groups/${activeGroup.id}`)}
            className="p-2.5 rounded-lg border border-glass-border hover:bg-glass-card text-secondary hover:text-white transition-all"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div>
            <span className="text-[10px] text-brand-accent2 font-bold uppercase tracking-wider bg-brand-accent/10 border border-brand-accent/20 px-2 py-0.5 rounded">
              {activeGroup.emoji} {activeGroup.name}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-primary mt-1.5 truncate max-w-[300px] sm:max-w-[450px]">
              {expense.title}
            </h1>
          </div>
        </div>

        {/* Delete actions */}
        {isCreator && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2.5 rounded-lg border border-glass-border hover:border-brand-red text-secondary hover:text-brand-red hover:bg-brand-red/10 transition-all"
            title="Delete Expense"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Left column: Overview & Splits */}
        <div className="space-y-6">
          
          {/* Summary Card */}
          <div className="glass-card p-5 border border-glass-border space-y-4">
            <h3 className="text-xs font-bold text-primary border-b border-glass-border/30 pb-2 uppercase tracking-wider text-[10px] text-brand-accent2">
              Transaction Details
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-brand-accent2 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Total Amount</span>
                  <span className="text-lg font-extrabold text-primary font-mono">{formattedTotal}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-black/20 border border-glass-border text-primary flex items-center justify-center">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Paid By</span>
                  <span className="text-sm font-bold text-primary">
                    {expense.paid_by === user?.id ? 'You' : expense.payer_name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-black/20 border border-glass-border text-primary flex items-center justify-center">
                  <Calendar className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-[10px] text-muted block uppercase tracking-wider font-semibold">Billing Date</span>
                  <span className="text-sm font-semibold text-secondary">{formattedDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Splits Breakdown */}
          <div className="glass-card p-5 border border-glass-border space-y-4">
            <h3 className="text-xs font-bold text-primary border-b border-glass-border/30 pb-2 uppercase tracking-wider text-[10px] text-brand-accent2">
              Splits Distribution ({expense.split_method})
            </h3>

            <div className="space-y-2.5">
              {expense.splits.map((split) => {
                const memberProfile = activeMembers.find((m) => m.user_id === split.user_id)?.profile;
                const isMe = split.user_id === user?.id;

                const displayOwed = Number(split.amount_owed).toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 2,
                });

                return (
                  <div
                    key={split.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-glass-border/20 bg-black/15 text-xs font-mono"
                  >
                    <span className={`font-sans font-semibold text-primary truncate max-w-[150px] ${isMe ? 'text-brand-accent2' : ''}`}>
                      {isMe ? 'You' : memberProfile?.display_name || 'Group member'}
                    </span>
                    <span className="font-bold text-secondary">{displayOwed}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: Receipt Viewer */}
        <div className="space-y-6">
          <div className="glass-card p-5 border border-glass-border space-y-4 min-h-[200px] flex flex-col">
            <h3 className="text-xs font-bold text-primary border-b border-glass-border/30 pb-2 uppercase tracking-wider text-[10px] text-brand-accent2 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" />
              Attached Receipt
            </h3>

            {expense.receipt_url ? (
              <div className="flex-1 flex flex-col justify-center animate-fade-in">
                {isReceiptPdf ? (
                  <div className="text-center py-6">
                    <FileText className="w-12 h-12 text-brand-red mx-auto mb-4" />
                    <p className="text-sm font-semibold text-primary mb-4">PDF Receipt Attached</p>
                    {receiptUrl && (
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary inline-block px-4 py-2.5 text-xs font-bold rounded-lg"
                      >
                        Open / Download PDF
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    {receiptUrl ? (
                      <a href={receiptUrl} target="_blank" rel="noreferrer">
                        <img
                          src={receiptUrl}
                          alt="Receipt Preview"
                          className="max-h-72 w-auto mx-auto rounded-lg border border-glass-border shadow-md object-contain hover:scale-[1.02] transition-transform duration-200"
                        />
                      </a>
                    ) : (
                      <div className="h-48 w-full bg-glass-card animate-pulse rounded-lg"></div>
                    )}
                    <p className="text-[10px] text-muted mt-3 font-semibold">Click image to open in full size.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-muted">
                <CheckCircle className="w-8 h-8 opacity-40 mb-2.5 text-secondary" />
                <span className="text-xs font-medium">No receipt attached to this expense.</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
