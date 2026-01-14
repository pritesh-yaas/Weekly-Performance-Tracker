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

// NEW: Helper to get list of weeks for Export Dropdown
export function getWeekOptions() {
  const options = []
  const today = new Date()
  
  // Find Current Monday
  const currentMonday = new Date(today)
  const day = currentMonday.getDay()
  const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1)
  currentMonday.setDate(diff)
  currentMonday.setHours(0, 0, 0, 0)

  // Generate past 20 weeks
  for (let i = 0; i < 20; i++) {
    const start = new Date(currentMonday)
    start.setDate(currentMonday.getDate() - (i * 7))
    
    // Calculate week label using the existing logic
    // We use the Thursday of that week to calculate the "Week Number"
    const d = new Date(start)
    d.setDate(d.getDate() + 3)
    const yearStart = new Date(d.getFullYear(), 0, 1)
    const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7)
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
    
    // Matches the format stored in DB: "Week 3 - January 2026"
    const label = `Week ${weekNo} - ${months[d.getMonth()]} ${d.getFullYear()}`
    
    options.push({ label, value: label }) // Value matches DB 'week_label' column
  }
  return options
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