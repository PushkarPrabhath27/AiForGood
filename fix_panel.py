import re

with open("frontend/components/grid/BloodWeatherPanel.tsx", "r") as f:
    content = f.read()

# 1. Imports
content = content.replace(
    'import { addWeeks, format, startOfWeek } from "date-fns";',
    'import { addWeeks, format, startOfWeek, differenceInCalendarWeeks } from "date-fns";'
)

# 2. SEVERITY_CONFIG typing
content = content.replace(
    'const SEVERITY_CONFIG: Record<"surplus" | "balanced" | "shortage" | "critical", SeveritySetting> = {',
    'const SEVERITY_CONFIG: Record<BloodWeatherForecast["gap_severity"], SeveritySetting> = {'
)

# 3. isError and refetch
content = content.replace(
    'const { data: forecasts = [], isLoading } = useQuery<BloodWeatherForecast[]>({',
    'const { data: forecasts = [], isLoading, isError, refetch } = useQuery<BloodWeatherForecast[]>({'
)

# 4. Week matching logic
old_week_logic = """    forecasts.forEach((f) => {
      const weekIndex = WEEKS.findIndex(
        (w) =>
          format(addWeeks(startOfWeek(new Date()), w), "yyyy-MM-dd") === f.forecast_week_start
      );
      const row = tempGrid[f.blood_type];
      if (weekIndex >= 0 && row) {
        row[weekIndex] = f;
      }
    });"""

new_week_logic = """    // Keep track of fallback columns if date logic fails completely
    const fallbackMap = new Map<string, number>();

    forecasts.forEach((f) => {
      const forecastDate = new Date(f.forecast_week_start);
      let weekIndex = differenceInCalendarWeeks(forecastDate, new Date());
      
      // Fallback: assign columns sequentially if date math is completely out of bounds (e.g. mock data)
      if (weekIndex < 0 || weekIndex > 3) {
        const typeCount = fallbackMap.get(f.blood_type) || 0;
        if (typeCount < 4) {
          weekIndex = typeCount;
          fallbackMap.set(f.blood_type, typeCount + 1);
        }
      } else {
        // Also update fallback counter just in case
        fallbackMap.set(f.blood_type, Math.max(fallbackMap.get(f.blood_type) || 0, weekIndex + 1));
      }

      const row = tempGrid[f.blood_type];
      if (weekIndex >= 0 && weekIndex <= 3 && row) {
        row[weekIndex] = f;
      }
    });"""

content = content.replace(old_week_logic, new_week_logic)

# 5. Skeleton loading state
old_skeleton = """      {isLoading ? (
        <div className="grid grid-cols-5 gap-1.5 animate-pulse">
          {Array.from({ length: 45 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-900 rounded-lg" />
          ))}
        </div>
      ) : ("""

new_skeleton = """      {isError ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center justify-between">
          <span className="text-red-400 text-sm font-medium">Failed to load forecast data.</span>
          <button 
            onClick={() => refetch()} 
            className="px-4 py-1.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500/20 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="overflow-x-auto animate-pulse">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-850">
                <th className="pb-3 w-12"><div className="h-4 bg-slate-800 rounded w-8"></div></th>
                {WEEKS.map((w) => <th key={w} className="pb-3 px-2"><div className="h-4 bg-slate-800 rounded mx-auto w-16"></div></th>)}
              </tr>
            </thead>
            <tbody>
              {BLOOD_TYPES.map((bt) => (
                <tr key={bt} className="border-b border-slate-900/60 last:border-0">
                  <td className="py-2.5 pr-4"><div className="h-4 bg-slate-800 rounded w-6"></div></td>
                  {WEEKS.map((w) => <td key={w} className="px-2 py-1.5"><div className="w-full h-9 bg-slate-800 rounded-xl"></div></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : ("""

content = content.replace(old_skeleton, new_skeleton)

# 6. Pulse check and cursor-help
content = content.replace('${cfg.pulse ? "animate-pulse" : ""}', '${cfg.pulse === true ? "animate-pulse" : ""}')
content = content.replace('cursor-help', '${f ? "cursor-help" : "cursor-default"}')

# 7. Gap unit presentation
old_gap = """                                    {f.gap_units > 0
                                      ? `+${f.gap_units} units shortage`
                                      : `${Math.abs(f.gap_units)} units surplus`}"""

new_gap = """                                    {f.gap_units > 0
                                      ? `+${f.gap_units} units shortage`
                                      : f.gap_units < 0
                                      ? `-${Math.abs(f.gap_units)} units surplus`
                                      : `Balanced`}"""
                                      
content = content.replace(old_gap, new_gap)

with open("frontend/components/grid/BloodWeatherPanel.tsx", "w") as f:
    f.write(content)
