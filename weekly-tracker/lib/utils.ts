import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate dropdown options: Last 12 weeks + Next 2 weeks
export function getWeekOptions() {
  const options = []
  const today = new Date()
  
  // Iterate from -12 weeks (past) to +2 weeks (future)
  for (let i = -12; i <= 2; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (i * 7))
    
    // Adjust to Thursday to follow ISO week numbering logic
    const dayNum = d.getDay() || 7
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - dayNum)
    
    const yearStart = new Date(d.getFullYear(), 0, 1)
    const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7)
    
    // Calculate display range (Monday to Sunday)
    const startOfWeek = new Date(d)
    startOfWeek.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1)) // Set to Monday
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6) // Set to Sunday

    // Label Format: "Week 50 (Dec 09 - Dec 15)"
    const label = `Week ${weekNo} (${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
    
    // Value: ISO Date string of the specific day used for calculation
    options.push({ label, value: d.toISOString().split('T')[0], weekNo })
  }
  // Reverse to show the latest week at the top
  return options.reverse()
}

// Backend calculation helper (Legacy support)
export function calculateWeekAndMonth(dateStr: string) {
  if (!dateStr) return { weekLabel: '', monthLabel: '' };
  
  const date = new Date(dateStr);
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