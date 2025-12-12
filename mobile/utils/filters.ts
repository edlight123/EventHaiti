/**
 * Utility functions for event filters (mobile)
 */

export type DateFilter = 'any' | 'today' | 'tomorrow' | 'this-week' | 'this-weekend' | 'pick-date';

/**
 * Calculate date range for a date filter option
 */
export function getDateRange(filter: DateFilter, pickedDate?: string): { start?: Date; end?: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (filter) {
    case 'any':
      return {};
    
    case 'today':
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);
      return { start: today, end: endOfToday };
    
    case 'tomorrow':
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);
      return { start: tomorrow, end: endOfTomorrow };
    
    case 'this-week':
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + 7);
      weekEnd.setHours(23, 59, 59, 999);
      return { start: today, end: weekEnd };
    
    case 'this-weekend':
      // Find next Saturday and Sunday
      const dayOfWeek = now.getDay();
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7; // If today is Saturday, get next Saturday
      const saturday = new Date(today);
      saturday.setDate(today.getDate() + daysUntilSaturday);
      
      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);
      sunday.setHours(23, 59, 59, 999);
      
      return { start: saturday, end: sunday };
    
    case 'pick-date':
      if (!pickedDate) return {};
      // Parse the date string (YYYY-MM-DD format)
      const [year, month, day] = pickedDate.split('-').map(Number);
      const picked = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfPicked = new Date(year, month - 1, day, 23, 59, 59, 999);
      return { start: picked, end: endOfPicked };
    
    default:
      return {};
  }
}
