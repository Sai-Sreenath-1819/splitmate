export type SplitMethod = 'equal' | 'percentage' | 'custom';

/**
 * Computes individual split amounts for a list of user IDs.
 *
 * @param totalAmount The total expense amount.
 * @param method The selected split method ('equal', 'percentage', or 'custom').
 * @param members The user IDs of the members involved in the split.
 * @param values A record mapping user IDs to their split parameters (percentages or custom values).
 *               Not needed for 'equal' splits.
 */
export function calculateSplits(
  totalAmount: number,
  method: SplitMethod,
  members: string[],
  values: Record<string, number> = {}
): Record<string, number> {
  const splits: Record<string, number> = {};

  if (members.length === 0) return splits;

  if (method === 'equal') {
    const share = totalAmount / members.length;
    const roundedShare = Math.round(share * 100) / 100;

    let distributedSum = 0;
    members.forEach((userId, index) => {
      if (index === members.length - 1) {
        splits[userId] = Math.round((totalAmount - distributedSum) * 100) / 100;
      } else {
        splits[userId] = roundedShare;
        distributedSum += roundedShare;
      }
    });
  } else if (method === 'percentage') {
    let distributedSum = 0;
    members.forEach((userId, index) => {
      const percentage = values[userId] || 0;
      const share = (totalAmount * percentage) / 100;
      const roundedShare = Math.round(share * 100) / 100;

      if (index === members.length - 1) {
        splits[userId] = Math.round((totalAmount - distributedSum) * 100) / 100;
      } else {
        splits[userId] = roundedShare;
        distributedSum += roundedShare;
      }
    });
  } else if (method === 'custom') {
    members.forEach((userId) => {
      splits[userId] = Math.round((values[userId] || 0) * 100) / 100;
    });
  }

  return splits;
}
