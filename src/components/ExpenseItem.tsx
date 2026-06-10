import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Paperclip, Calendar, User } from 'lucide-react';

interface ExpenseItemProps {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  payerName: string;
  date: string;
  receiptUrl: string | null;
  myUserId: string;
  // Splits information to determine personal share
  splits: { user_id: string; amount_owed: number }[];
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({
  id,
  title,
  amount,
  paidBy,
  payerName,
  date,
  receiptUrl,
  myUserId,
  splits,
}) => {
  const navigate = useNavigate();

  // Calculate my share
  const isPayer = paidBy === myUserId;
  const mySplit = splits.find((s) => s.user_id === myUserId);
  const myOwed = mySplit ? Number(mySplit.amount_owed) : 0;
  
  let shareText = '';
  let shareColorClass = 'text-muted';
  
  if (isPayer) {
    const othersShare = amount - myOwed;
    if (othersShare > 0.01) {
      shareText = `You get back ₹${othersShare.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
      shareColorClass = 'text-brand-green';
    } else {
      shareText = 'You paid';
      shareColorClass = 'text-secondary';
    }
  } else {
    if (myOwed > 0.01) {
      shareText = `You owe ₹${myOwed.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
      shareColorClass = 'text-brand-red';
    } else {
      shareText = 'Not involved';
      shareColorClass = 'text-muted';
    }
  }

  const formattedTotal = amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });

  const formattedDate = new Date(date).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      onClick={() => navigate(`/expenses/${id}`)}
      className="expense-item glass-card glass-card-hover p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="expense-icon w-10.5 h-10.5 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-lg flex-shrink-0">
          💸
        </div>
        
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-primary truncate flex items-center gap-1.5">
            {title}
            {receiptUrl && (
              <span className="inline-flex items-center gap-0.5 text-[10px] bg-brand-green/10 border border-brand-green/20 text-brand-green px-1.5 py-0.5 rounded">
                <Paperclip className="w-2.5 h-2.5" />
                Receipt
              </span>
            )}
          </h4>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted mt-1">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              Paid by {isPayer ? 'you' : payerName}
            </span>
            <span>&middot;</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold text-primary">{formattedTotal}</div>
        <div className={`text-[11px] font-semibold mt-0.5 ${shareColorClass}`}>{shareText}</div>
      </div>
    </div>
  );
};
