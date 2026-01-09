import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper: Get readable date range (Mon - Sun) for a specific date
export function getWeekRangeDisplay(dateStr: string) {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ""
  
  // Find Monday
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  const start = new Date(date)
  start.setDate(diff)
  
  // Find Sunday
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

// Backend calculation helper (Legacy support + Database Logic)
export function calculateWeekAndMonth(dateStr: string) {
  if (!dateStr) return { weekLabel: '', monthLabel: '' };
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { weekLabel: '', monthLabel: '' };

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthLabel = months[date.getMonth()];

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