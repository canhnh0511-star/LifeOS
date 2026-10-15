import { Download, LogOut, RotateCcw } from 'lucide-react';

interface Props { isDemo: boolean; onExport: () => void; onReset: () => void; onLogout: () => void; }

export function SettingsPanel({ isDemo, onExport, onReset, onLogout }: Props) {
  return <div className="settings-content">
    <div className="setting-row"><div><strong>API mode</strong><span>{isDemo ? 'Local mock API (localStorage)' : 'Remote REST API'}</span></div><span className="setting-status">{isDemo ? 'DEMO' : 'LIVE'}</span></div>
    <div className="setting-row"><div><strong>Múi giờ</strong><span>Áp dụng cho ngày và streak</span></div><span>Asia/Ho_Chi_Minh</span></div>
    <div className="settings-actions">
      <button className="btn btn-secondary" disabled={!isDemo} onClick={onExport}><Download size={16}/> Xuất dữ liệu JSON</button>
      <button className="btn btn-danger" disabled={!isDemo} onClick={onReset}><RotateCcw size={16}/> Đặt lại dữ liệu mẫu</button>
    </div>
    {!isDemo && <div className="settings-actions"><button className="btn btn-secondary" onClick={onLogout}><LogOut size={16}/> Đăng xuất</button></div>}
    {isDemo && <p className="form-note">Dữ liệu mock chỉ lưu trên trình duyệt hiện tại. Chưa đồng bộ thiết bị hoặc tài khoản, không nên dùng làm lưu trữ chính.</p>}
  </div>;
}
