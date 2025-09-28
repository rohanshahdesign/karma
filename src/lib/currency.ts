// Currency utility functions for formatting dynamic currency names

// Utility function for singular/plural forms
export function formatCurrencyName(amount: number, currencyName: string): string {
  // Simple pluralization - you can make this more sophisticated if needed
  if (amount === 1) {
    return currencyName;
  }
  
  // Basic pluralization rules
  if (currencyName.endsWith('s')) {
    return currencyName; // Already plural (e.g., "coins" stays "coins")
  } else if (currencyName.endsWith('y')) {
    return currencyName.slice(0, -1) + 'ies'; // "berry" -> "berries"
  } else {
    return currencyName + 's'; // "ball" -> "balls", "karma" -> "karmas"
  }
}

// Format amount with currency name
export function formatCurrencyAmount(amount: number, currencyName: string): string {
  return `${amount} ${formatCurrencyName(amount, currencyName)}`;
}

// Get the proper article (a/an) for a currency name
export function getCurrencyArticle(currencyName: string): string {
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const firstLetter = currencyName.toLowerCase().charAt(0);
  return vowels.includes(firstLetter) ? 'an' : 'a';
}

// Format sentences like "Send karma to colleagues"
export function formatCurrencySentence(template: string, currencyName: string): string {
  return template.replace(/\bkarma\b/gi, currencyName);
}

// Common text patterns that need replacement
export const CURRENCY_PATTERNS = {
  // Button texts
  SEND_KARMA: (currencyName: string) => `Send ${formatCurrencyName(1, currencyName)}`,
  GIVE_KARMA: (currencyName: string) => `Give ${formatCurrencyName(1, currencyName)}`,
  
  // Labels and headings
  KARMA_BALANCE: (currencyName: string) => `${formatCurrencyName(1, currencyName).charAt(0).toUpperCase() + formatCurrencyName(1, currencyName).slice(1)} Balance`,
  TOTAL_KARMA: (currencyName: string) => `Total ${formatCurrencyName(1, currencyName).charAt(0).toUpperCase() + formatCurrencyName(1, currencyName).slice(1)}`,
  KARMA_SENT: (currencyName: string) => `${formatCurrencyName(1, currencyName).charAt(0).toUpperCase() + formatCurrencyName(1, currencyName).slice(1)} Sent`,
  KARMA_RECEIVED: (currencyName: string) => `${formatCurrencyName(1, currencyName).charAt(0).toUpperCase() + formatCurrencyName(1, currencyName).slice(1)} Received`,
  
  // Messages
  SEND_KARMA_TO: (currencyName: string) => `Send ${currencyName} to colleagues`,
  KARMA_PLATFORM: (currencyName: string) => `${formatCurrencyName(1, currencyName).charAt(0).toUpperCase() + formatCurrencyName(1, currencyName).slice(1)} platform where teams give kudos`,
  
  // Placeholders
  KARMA_AMOUNT: (currencyName: string) => `Amount of ${currencyName}`,
  SELECT_KARMA: (currencyName: string) => `Select ${currencyName} amount`,
};