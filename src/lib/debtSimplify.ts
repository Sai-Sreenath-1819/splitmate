export interface Debt {
  from: string;
  to: string;
  amount: number;
}

/**
 * Greedily simplifies debts within a group to minimize transactions.
 * @param balances A record of user UUIDs mapped to their net balances.
 *                 Positive balance means the user is owed money (creditor).
 *                 Negative balance means the user owes money (debtor).
 */
export function simplifyDebts(balances: Record<string, number>): Debt[] {
  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];

  for (const [userId, balance] of Object.entries(balances)) {
    if (balance > 0.01) {
      creditors.push({ userId, amount: balance });
    } else if (balance < -0.01) {
      debtors.push({ userId, amount: -balance }); // Use absolute values for comparison
    }
  }

  const debts: Debt[] = [];

  // Sort descending by amount
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];

    const amount = Math.min(creditor.amount, debtor.amount);
    if (amount > 0.01) {
      debts.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: Math.round(amount * 100) / 100,
      });
    }

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount < 0.01) {
      cIdx++;
    }
    if (debtor.amount < 0.01) {
      dIdx++;
    }
  }

  return debts;
}
