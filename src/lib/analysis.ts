import { Expense } from './calculations';
import { startOfMonth, getDay, getWeek, subMonths, getMonth } from 'date-fns';

/**
 * Calculates the target daily revenue based on the average of the same weekdays from previous months.
 * @param expenses - The list of all expenses and revenues.
 * @param monthsBack - The number of previous months to include in the calculation.
 * @returns The calculated daily target.
 */
export function calculateDailyTarget(expenses: Expense[], monthsBack: number = 3, targetDate: Date = new Date()): number {
  const currentDayOfWeek = getDay(targetDate);
  const revenues = expenses.filter(e => e.type === 'receita');

  const relevantRevenues = revenues.filter(revenue => {
    const revenueDate = new Date(revenue.date);
    const isSameDayOfWeek = getDay(revenueDate) === currentDayOfWeek;
    const isWithinMonthsBack = revenueDate >= subMonths(startOfMonth(targetDate), monthsBack) && revenueDate < startOfMonth(targetDate);
    return isSameDayOfWeek && isWithinMonthsBack;
  });

  if (relevantRevenues.length === 0) {
    return 0;
  }

  const totalRevenue = relevantRevenues.reduce((sum, revenue) => sum + revenue.amount, 0);
  // We need to count the number of distinct days
  const distinctDays = new Set(relevantRevenues.map(r => r.date));
  return totalRevenue / distinctDays.size;
}

/**
 * Calculates the target weekly revenue based on the average of the same weeks from previous months.
 * @param expenses - The list of all expenses and revenues.
 * @param monthsBack - The number of previous months to include in the calculation.
 * @returns The calculated weekly target.
 */
export function calculateWeeklyTarget(expenses: Expense[], monthsBack: number = 3): number {
  const today = new Date();
  const currentWeek = getWeek(today);
  const revenues = expenses.filter(e => e.type === 'receita');

  const relevantRevenues = revenues.filter(revenue => {
    const revenueDate = new Date(revenue.date);
    const isSameWeek = getWeek(revenueDate) === currentWeek;
    const isWithinMonthsBack = revenueDate >= subMonths(startOfMonth(today), monthsBack) && revenueDate < startOfMonth(today);
    return isSameWeek && isWithinMonthsBack;
  });

  if (relevantRevenues.length === 0) {
    return 0;
  }

  const totalRevenue = relevantRevenues.reduce((sum, revenue) => sum + revenue.amount, 0);
  const distinctWeeks = new Set(relevantRevenues.map(r => getWeek(new Date(r.date))));
  return totalRevenue / distinctWeeks.size;
}

/**
 * Calculates the target monthly revenue based on the average of the same months from previous years.
 * @param expenses - The list of all expenses and revenues.
 * @param monthsBack - The number of previous months to include in the calculation.
 * @returns The calculated monthly target.
 */
export function calculateMonthlyTarget(expenses: Expense[], monthsBack: number = 3): number {
  const today = new Date();
  const currentMonth = getMonth(today);
  const revenues = expenses.filter(e => e.type === 'receita');

  const relevantRevenues = revenues.filter(revenue => {
    const revenueDate = new Date(revenue.date);
    const isSameMonth = getMonth(revenueDate) === currentMonth;
    const isWithinMonthsBack = revenueDate >= subMonths(startOfMonth(today), monthsBack) && revenueDate < startOfMonth(today);
    return isSameMonth && isWithinMonthsBack;
  });

  if (relevantRevenues.length === 0) {
    return 0;
  }

  const totalRevenue = relevantRevenues.reduce((sum, revenue) => sum + revenue.amount, 0);
  const distinctMonths = new Set(relevantRevenues.map(r => getMonth(new Date(r.date))));
  return totalRevenue / distinctMonths.size;
}
