import { mockClient as api,resetDemoData,exportDemoData } from './api/mockClient.js';
import { todayInTimezone,moveDate,formatDate,categoryLabel,levelProgress,diffDays } from './domain/rules.js';

const $=sel=>document.querySelector(sel);
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num=n=>new Intl.NumberFormat('vi-VN').format(n??0);
const pct=(a,b)=>b?Math.round(a/b*100):0;
const weekdays=['T2','T3','T4','T5','T6','T7','CN'];
const icons={CAREER:'⌘',CREATIVITY:'♫',HEALTH:'♡',KNOWLEDGE:'▤',MINDFULNESS:'✳'};
const tones={CAREER:'blue',CREATIVITY:'purple',HEALTH:'orange',KNOWLEDGE:'green',MINDFULNESS:'pink'};
let current='today',date=todayInTimezone(),range=7,daysSelected=[1,2,3,4,5,6,7];
let dashboard,goals=[],habits=[],analytics,week,journal;
const notify=(m)=>{const old=$('.preview-toast');old?.remove();const item=document.createElement('div');item.className='preview-toast';item.textContent=m;document.body.appendChild(item);setTimeout(()=>item.remove(),3600)};
const setText=(selector,text)=>{$(selector).textContent=text};
const styleWidth=(selector,p)=>{$(selector).style.width=`${p}%`};
async function refresh(){
 try {
  [dashboard,goals,habits,analytics,week,journal]=await Promise.all([api.getDashboard(date),api.getGoals(),api.getHabits(),api.getAnalytics(range===7?'7d':'30d'),api.getAnalytics('7d'),api.getCurrentJourney()]);
  render();
 }catch(e){notify(e.message||'Lỗi tải dữ liệu');}
}
function render(){
  const today=todayInTimezone(),p=dashboard.progress;
  setText('#level-hero',String(p.level).padStart(2,'0'));
  setText('#total-xp',num(p.totalXp));setText('#next-xp',num(p.nextLevelXp));
  setText('#xp-remaining',num(Math.max(0,p.nextLevelXp-p.totalXp)));
  setText('#level-right','LEVEL '+p.level);
  styleWidth('#xp-bar',pct(p.totalXp-p.levelStartXp,p.nextLevelXp-p.levelStartXp));
  setText('#streak',p.currentStreak);
  const done=dashboard.completedCount,total=dashboard.scheduledCount,ratio=pct(done,total);
  setText('#day-pct',ratio);styleWidth('#daily-small',ratio);
  setText('#xp-today',dashboard.earnedXpToday);setText('#quest-count',total);
  setText('#quest-done',done);setText('#quest-total',total);setText('#quest-percent',ratio+'%');styleWidth('#quest-bar',ratio);
  setText('#ring-pct',ratio+'%');$('#ring').style.setProperty('--progress',ratio+'%');
  setText('#focus-caption',total&&ratio===100?'Amazing! Bạn đã hoàn thành tất cả nhiệm vụ.':`Bạn đã hoàn thành ${done}/${total} nhiệm vụ. Keep going!`);
  setText('#date-choice',date===today?'Hôm nay':formatDate(date,{day:'numeric',month:'short'}));
  setText('#date-footer',formatDate(date,{weekday:'long',day:'numeric',month:'long'}));
  $('#next-day').disabled=date>=today;
  $('#quests').innerHTML=dashboard.quests.length?dashboard.quests.map(q=>{
    const done=q.status==='COMPLETED';return `<button class="quest-row ${done?'is-done':''}" data-habit="${esc(q.habitId)}"><span class="quest-check ${done?'checked':''}">${done?'✓':'○'}</span><span class="icon-bubble tone-${tones[q.category]} preview-bubble">${icons[q.category]}</span><span class="quest-body"><strong>${esc(q.title)}</strong><small>◷ ${q.targetMinutes} phút <i></i> ${esc(categoryLabel(q.category))}</small></span><span class="xp-tag ${done?'earned':''}">${done?'✓ Done':`ϟ +${q.xpReward} XP`}</span></button>`
  }).join(''):'<div class="preview-rest">Hôm nay không có nhiệm vụ trong lịch. Bạn có thể tạo thói quen mới.</div>';
  $('#quests').querySelectorAll('[data-habit]').forEach(btn=>btn.addEventListener('click',async()=>{
    const q=dashboard.quests.find(v=>v.habitId===btn.dataset.habit);if(!q)return;
    btn.disabled=true;
    try{const outcome=q.status==='COMPLETED'?await api.undoQuest(q.habitId,date):await api.completeQuest(q.habitId,date);
       notify(outcome.xpAwarded>0?`Quest completed! +${outcome.xpAwarded} XP`:outcome.xpAwarded<0?'Đã hoàn tác và điều chỉnh XP.':'Không thay đổi XP.');await refresh();
    }catch(e){notify(e.message);btn.disabled=false;}
  }));
  $('#week-chart').innerHTML=chartHTML(week.days, true);
  setText('#consistency',pct(journal.completedToDate,journal.totalScheduledToDate));
  setText('#journey-percent',pct(journal.completedToDate,journal.totalScheduledToDate)+'%');styleWidth('#journey-bar',pct(journal.completedToDate,journal.totalScheduledToDate));
  renderGoals();renderInsights();
}
function chartHTML(days,compact){const cap=Math.max(1,...days.map(d=>d.scheduled));return days.map(d=>{const completed=d.completed/cap*100,planned=Math.max(4,d.scheduled/cap*100);const day=compact?new Intl.DateTimeFormat('vi-VN',{weekday:'short',timeZone:'UTC'}).format(new Date(d.date+'T12:00:00Z')).replace('Th ', 'T'):d.date.slice(8);return `<div class="activity-col" title="${esc(d.date)}: ${d.completed}/${d.scheduled}"><div class="activity-bar-space"><div class="activity-bar-total" style="height:${planned}%"></div><div class="activity-bar-done" style="height:${completed}%"></div></div><span>${esc(day)}</span></div>`}).join('')}
function renderGoals(){
  setText('#goals-total',goals.length);
  $('#goals').innerHTML=goals.map(goal=>{
    const related=habits.filter(h=>h.goalId===goal.id);const stat=analytics.categories.find(s=>s.category===goal.category);const rate=pct(stat?.completed??0,stat?.scheduled??0);
    return `<article class="goal-card ${goal.status!=='ACTIVE'?'goal-paused':''}"><div class="goal-card-head"><span class="icon-bubble tone-${tones[goal.category]} preview-bubble">${icons[goal.category]}</span><button class="goal-pause" data-goal="${esc(goal.id)}">${goal.status==='ACTIVE'?'Tạm dừng':'Tiếp tục'}</button></div><span class="category-label">${esc(categoryLabel(goal.category))}</span><h3>${esc(goal.title)}</h3><p>${esc(goal.description||'Một bước nhỏ mỗi ngày.')}</p><div class="goal-progress-row"><span>Hoàn thành tháng này</span><strong>${rate}%</strong></div><div class="progress-track slim"><div class="progress-fill green" style="width:${rate}%"></div></div><div class="goal-habits"><strong>${related.length} thói quen</strong>${related.map(h=>`<div class="goal-habit"><span class="small-status-dot ${h.status!=='ACTIVE'?'paused':''}"></span><span>${esc(h.title)}</span><button data-habit-toggle="${esc(h.id)}">${h.status==='ACTIVE'?'Pause':'Resume'}</button></div>`).join('')}</div></article>`
  }).join('');
  $('#goals').querySelectorAll('[data-goal]').forEach(btn=>btn.onclick=async()=>{const goal=goals.find(g=>g.id===btn.dataset.goal);if(!goal)return;await api.updateGoal(goal.id,{status:goal.status==='ACTIVE'?'PAUSED':'ACTIVE'});await refresh();notify('Đã cập nhật mục tiêu')});
  $('#goals').querySelectorAll('[data-habit-toggle]').forEach(btn=>btn.onclick=async()=>{const h=habits.find(x=>x.id===btn.dataset.habitToggle);if(!h)return;await api.updateHabit(h.id,{status:h.status==='ACTIVE'?'PAUSED':'ACTIVE'});await refresh();notify('Đã cập nhật thói quen')});
}
function renderInsights(){
 setText('#stat-rate',analytics.completionRate+'%');setText('#stat-done',analytics.completedCount);setText('#stat-xp',num(analytics.earnedXp));setText('#stat-streak',dashboard.progress.currentStreak);
 $('#detail-chart').innerHTML=chartHTML(analytics.days,false);
 $('#categories').innerHTML=analytics.categories.map(c=>`<div class="category-stat"><div class="category-stat-label"><span>${icons[c.category]}</span><span>${esc(categoryLabel(c.category))}</span><strong>${pct(c.completed,c.scheduled)}%</strong></div><div class="progress-track slim"><div class="progress-fill blue" style="width:${pct(c.completed,c.scheduled)}%"></div></div></div>`).join('');
}
function go(tab){current=tab;document.querySelectorAll('[id^="screen-"]').forEach(x=>x.classList.toggle('preview-hide',x.id!=='screen-'+tab));document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));setText('#crumb',{today:'Hôm nay',journey:'Hành trình',insights:'Thống kê'}[tab]);menu(false);window.scrollTo({top:0,behavior:'smooth'});}
function menu(open){$('#sidebar').classList.toggle('open',open);$('#scrim').style.display=open?'block':'none';}
function shift(days){const next=moveDate(date,days);const today=todayInTimezone();if(next>today||diffDays(next,today)>7){notify('Chỉ có thể xem và điều chỉnh trong 7 ngày gần nhất.');return;}date=next;refresh();}
function period(days){range=days;$('#period-7').classList.toggle('active',days===7);$('#period-30').classList.toggle('active',days===30);refresh();}
function openHabit(){const select=$('#habit-goal-select');select.innerHTML=goals.filter(g=>g.status==='ACTIVE').map(g=>`<option value="${esc(g.id)}">${esc(g.title)}</option>`).join('');if(!select.value){notify('Hãy tạo một mục tiêu trước.');go('journey');return;}$('#habit-dialog').showModal();}
function exportData(){const blob=new Blob([exportDemoData()],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='life-os-preview.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function reset(){if(!confirm('Đặt lại dữ liệu demo?'))return;resetDemoData();date=todayInTimezone();$('#settings').close();await refresh();notify('Đã khôi phục dữ liệu mẫu.')}
for(const el of document.querySelectorAll('[data-tab]'))el.addEventListener('click',()=>go(el.dataset.tab));
$('#form-goal').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api.createGoal({title:String(f.get('title')),category:String(f.get('category')),description:String(f.get('description'))});$('#goal-dialog').close();e.currentTarget.reset();await refresh();notify('Tạo mục tiêu thành công.')}catch(err){notify(err.message)}});
$('#habit-weekdays').innerHTML=weekdays.map((w,i)=>`<button type="button" data-day="${i+1}" aria-pressed="true" class="selected">${w}</button>`).join('');
$('#habit-weekdays').querySelectorAll('[data-day]').forEach(btn=>btn.addEventListener('click',()=>{const i=Number(btn.dataset.day);daysSelected=daysSelected.includes(i)?daysSelected.filter(n=>n!==i):[...daysSelected,i].sort();btn.classList.toggle('selected',daysSelected.includes(i));btn.setAttribute('aria-pressed',String(daysSelected.includes(i)))}));
$('#form-habit').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api.createHabit({title:String(f.get('title')),goalId:String(f.get('goalId')),targetMinutes:Number(f.get('targetMinutes')),xpReward:Number(f.get('xpReward')),weekdays:daysSelected,startDate:todayInTimezone()});$('#habit-dialog').close();e.currentTarget.reset();await refresh();notify('Đã thêm thói quen mới.')}catch(err){notify(err.message)}});
window.go=go;window.menu=menu;window.shift=shift;window.period=period;window.openHabit=openHabit;window.exportData=exportData;window.reset=reset;
$('#header-date').textContent=formatDate(todayInTimezone(),{day:'numeric',month:'short',year:'numeric'});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
refresh();
