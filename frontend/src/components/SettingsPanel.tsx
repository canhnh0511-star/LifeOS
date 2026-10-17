import { useState } from 'react';
import { Download, Eraser, LogOut, RotateCcw } from 'lucide-react';
import { CalendarClock } from 'lucide-react';
import { DEMO_DATE_KEY, demoToday, todayInTimezone } from '../domain/rules';
import { reduceMotionPref, setReduceMotionPref } from '../ui/motion';

interface Props { isDemo: boolean; onExport: () => void; onReset: () => void; onLogout: () => void; /** reloads the page after the demo date changes; replaceable in tests */ onReload?: () => void; /** demo: forget today's logged sets, completions and checklist progress */ onClearToday?: () => void; }

export function SettingsPanel({ isDemo, onExport, onReset, onLogout, onReload = () => window.location.reload(), onClearToday }: Props) {
  const faked = isDemo ? demoToday() : null;
  const [fakeDate, setFakeDate] = useState(faked ?? todayInTimezone());
  const setDemoDate = (date: string | null) => { try { if (date) localStorage.setItem(DEMO_DATE_KEY, date); else localStorage.removeItem(DEMO_DATE_KEY); } catch { /* storage unavailable */ } onReload(); };
  const [reduce, setReduce] = useState(reduceMotionPref);
  return <div className="settings-content">
    <div className="setting-row"><div><strong>API mode</strong><span>{isDemo ? 'Local mock API (localStorage)' : 'Remote REST API'}</span></div><span className="setting-status">{isDemo ? 'DEMO' : 'LIVE'}</span></div>
    <div className="setting-row"><div><strong>Múi giờ</strong><span>Áp dụng cho ngày và streak</span></div><span>Asia/Ho_Chi_Minh</span></div>
    <div className="setting-row"><label htmlFor="reduce-motion"><strong>Giảm chuyển động</strong><span>Tắt hiệu ứng rương và ăn mừng. Máy đã bật giảm chuyển động thì luôn được tôn trọng.</span></label><input id="reduce-motion" type="checkbox" checked={reduce} onChange={e => { setReduce(e.target.checked); setReduceMotionPref(e.target.checked); }}/></div>
    {isDemo && <div className="setting-row demo-date"><label htmlFor="demo-date"><strong>Ngày hôm nay (chỉ để thử)</strong><span>{faked ? `Đang giả lập ${faked}.` : 'Đang dùng ngày thật.'} Chọn một ngày có buổi tập (ví dụ thứ Hai) để xem Hôm nay như ngày đó.</span></label>
      <span className="demo-date-controls"><input id="demo-date" type="date" value={fakeDate} onChange={e => setFakeDate(e.target.value)}/>
        <button type="button" className="btn btn-secondary" disabled={!fakeDate} onClick={() => setDemoDate(fakeDate)}><CalendarClock size={16}/> Áp dụng</button>
        {faked && <button type="button" className="btn btn-quiet" onClick={() => setDemoDate(null)}>Dùng ngày thật</button>}</span></div>}
    <div className="settings-actions">
      <button className="btn btn-secondary" disabled={!isDemo} onClick={onExport}><Download size={16}/> Xuất dữ liệu JSON</button>
      {isDemo && onClearToday && <button className="btn btn-secondary" onClick={onClearToday}><Eraser size={16}/> Xoá ghi nhận hôm nay</button>}
      <button className="btn btn-danger" disabled={!isDemo} onClick={onReset}><RotateCcw size={16}/> Đặt lại dữ liệu mẫu</button>
    </div>
    {!isDemo && <div className="settings-actions"><button className="btn btn-secondary" onClick={onLogout}><LogOut size={16}/> Đăng xuất</button></div>}
    {isDemo && <p className="form-note">Dữ liệu mock chỉ lưu trên trình duyệt hiện tại. Chưa đồng bộ thiết bị hoặc tài khoản, không nên dùng làm lưu trữ chính.</p>}
  </div>;
}
