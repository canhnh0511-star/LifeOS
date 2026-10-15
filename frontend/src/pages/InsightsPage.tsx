import { useMemo } from 'react';
import { CheckCircle2, Flame, Lightbulb, Trophy, Zap } from 'lucide-react';
import type { AnalyticsDto } from '../api/types';
import { buildInsights, radarAxes } from '../domain/insights';
import { ActivityBars } from '../components/ActivityBars';
import { CardTitle, EmptyState } from '../components/primitives';
import { RadarChart } from '../components/RadarChart';
import { number } from '../ui/format';

interface Props { analytics: AnalyticsDto | null; period: '7d' | '30d'; onPeriod: (period: '7d' | '30d') => void; currentStreak: number; }

export function InsightsPage({ analytics, period, onPeriod, currentStreak }: Props) {
  const insights = useMemo(() => analytics ? buildInsights(analytics) : [], [analytics]);
  return <>
            <div className="page-header"><div><div className="eyebrow"><span className="eyebrow-dash"/> REFLECT & IMPROVE</div><h1>Progress is <span className="text-gradient">power.</span></h1><p>Không chỉ hoàn thành nhiệm vụ. Hãy hiểu mình đang phát triển ra sao.</p></div><div className="period-switch"><button className={period==='7d'?'active':''} aria-pressed={period==='7d'} onClick={()=>onPeriod('7d')}>7 ngày</button><button className={period==='30d'?'active':''} aria-pressed={period==='30d'} onClick={()=>onPeriod('30d')}>30 ngày</button></div></div>
            <div className="insight-stats"><div className="insight-stat"><span><CheckCircle2 size={17}/> Completion rate</span><strong>{analytics?.completionRate || 0}<small>%</small></strong><p>Trong {period==='7d'?'7':'30'} ngày gần nhất</p></div><div className="insight-stat"><span><Trophy size={17}/> Quests completed</span><strong>{analytics?.completedCount || 0}<small> / {analytics?.scheduledCount || 0}</small></strong><p>Nhiệm vụ đã hoàn thành</p></div><div className="insight-stat"><span><Zap size={17}/> XP collected</span><strong>{number(analytics?.earnedXp || 0)}</strong><p>Điểm kinh nghiệm tích lũy</p></div><div className="insight-stat"><span><Flame size={17}/> Best habit streak</span><strong>{currentStreak}<small> phiên</small></strong><p>Streak tốt nhất hiện tại</p></div></div>
            <div className="insights-grid"><article className="panel analytics-main"><CardTitle title="Cân bằng 5 lĩnh vực" kicker={`Tỷ lệ hoàn thành · ${period === '7d' ? '7' : '30'} ngày gần nhất`}/>{analytics && <RadarChart axes={radarAxes(analytics)}/>}</article><article className="panel category-panel"><CardTitle title="Gợi ý hành động" kicker="Tính từ dữ liệu của bạn, không phải AI"/>{insights.length ? <ul className="insight-list">{insights.map(i => <li key={i.id} className={`insight-item tone-${i.tone}`}><strong>{i.title}</strong><p>{i.detail}</p></li>)}</ul> : <EmptyState icon={Lightbulb} title="Chưa đủ dữ liệu" details="Hoàn thành thêm vài nhiệm vụ để nhận gợi ý."/>}</article></div>
            <article className="panel analytics-days"><CardTitle title="Hoạt động theo ngày" kicker="Số nhiệm vụ hoàn thành so với đã lên lịch"/>{analytics && <ActivityBars analytics={analytics}/>}<div className="chart-legend"><span><i className="legend-done"/>Completed</span><span><i className="legend-planned"/>Planned</span></div></article>
  </>;
}
