import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateWeekAndMonth(dateStr: string) {
  if (!dateStr) return { weekLabel: '', monthLabel: '' };
  
  const date = new Date(dateStr);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  
  // Month is straightforward based on the selected date
  const monthLabel = months[date.getMonth()];

  // Week Calculation Logic (from GAS script)
  const tempDate = new Date(date.valueOf());
  const dayNum = (date.getDay() + 6) % 7;
  tempDate.setDate(tempDate.getDate() - dayNum + 3);
  const firstThursday = tempDate.valueOf();
  tempDate.setMonth(0, 1);
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000);
  
  const weekLabel = `Week ${weekNum} - ${months[date.getMonth()]} ${date.getFullYear()}`;

  return { weekLabel, monthLabel };
}