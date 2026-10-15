import { formatDate } from '../domain/rules';

export const dateText = (date: string) => formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
export const pct = (a: number, b: number) => b ? Math.round(100 * a / b) : 0;
export const number = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
