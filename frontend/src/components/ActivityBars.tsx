import type { AnalyticsDto } from '../api/types';

export function ActivityBars({ analytics, compact = false }: { analytics: AnalyticsDto; compact?: boolean }) {
  const selected = compact ? analytics.days.slice(-7) : analytics.days;
  const cap = Math.max(1, ...selected.map(d => d.scheduled));
  return <div className={`activity-chart ${compact ? 'compact' : ''}`} aria-label="Biểu đồ hoạt động theo ngày">
    {selected.map(day => {
      const doneHeight = day.completed / cap * 100;
      const scheduledHeight = day.scheduled / cap * 100;
      return <div className="activity-col" key={day.date} title={`${day.date}: ${day.completed}/${day.scheduled} nhiệm vụ`}>
        <div className="activity-bar-space">
          <div className="activity-bar-total" style={{ height: `${Math.max(scheduledHeight, 4)}%` }} />
          <div className="activity-bar-done" style={{ height: `${doneHeight}%` }} />
        </div>
        <span>{compact ? new Intl.DateTimeFormat('vi-VN', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`)).replace('Th ', 'T') : day.date.slice(8)}</span>
      </div>;
    })}
  </div>;
}
