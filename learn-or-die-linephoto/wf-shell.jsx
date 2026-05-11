/* Common wireframe primitives — phone shell, status bar, tabbar, icons */

const Phone = ({ children, label, note }) => (
  <div className="wf-phone wf">
    <div className="wf-screen">
      <div className="wf-status">
        <span>9:41</span>
        <span style={{display:'flex', gap:4, alignItems:'center'}}>
          <span style={{width:14, height:8, border:'1.2px solid currentColor', borderRadius:2, display:'inline-block'}}></span>
          <span>WeChat</span>
        </span>
      </div>
      {children}
    </div>
  </div>
);

const TabBar = ({ active = 'plaza' }) => (
  <div className="wf-tabbar">
    {[
      ['plaza', '广场'],
      ['plan', '备考'],
      ['ai', 'AI 陪学'],
      ['market', '市场'],
      ['me', '我的'],
    ].map(([k, label]) => (
      <div key={k} className={`wf-tab ${active === k ? 'active' : ''}`}>
        <div className="dot"></div>
        <span>{label}</span>
      </div>
    ))}
  </div>
);

/* sketchy header inside screen */
const ScreenHeader = ({ title, sub, right, back = false }) => (
  <div style={{padding:'4px 4px 10px', display:'flex', alignItems:'flex-start', gap:8}}>
    {back && <span className="wf-h2" style={{lineHeight:1, marginTop:2}}>‹</span>}
    <div style={{flex:1}}>
      <div className="wf-h1">{title}</div>
      {sub && <div className="wf-small" style={{marginTop:2}}>{sub}</div>}
    </div>
    {right}
  </div>
);

/* simple SVG sketches (icon-ish) */
const Sketch = {
  user: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="6" r="2.5"/><path d="M3 14c.5-3 2.5-4 5-4s4.5 1 5 4"/></svg>,
  book: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 3h4c1 0 2 .5 2 2v8s-1-1-3-1H3V3z"/><path d="M13 3H9c-1 0-2 .5-2 2v8s1-1 3-1h3V3z"/></svg>,
  bell: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 11s1-1.5 1-4a3 3 0 0 1 6 0c0 2.5 1 4 1 4H4z"/><path d="M7 13a1.5 1.5 0 0 0 2 0"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="4"/><path d="M10 10l3 3"/></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 3v10M3 8h10"/></svg>,
  send: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 8l12-5-3 12-3-5-6-2z"/></svg>,
  mic: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="6" y="2" width="4" height="8" rx="2"/><path d="M4 8c0 2 2 3.5 4 3.5s4-1.5 4-3.5M8 11.5V14"/></svg>,
  fire: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 14c3 0 4-2 4-4 0-2-2-3-2-5 0-1 .5-2 .5-2-1 0-2 1-3 2.5C7 7 5 7 5 10c0 2 1 4 3 4z"/></svg>,
  star: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 2l1.8 4 4.2.4-3.2 3 1 4.1L8 11.5 4.2 13.5l1-4.1L2 6.4 6.2 6 8 2z"/></svg>,
};

/* small reusable sketchy avatar with initials */
const Avatar = ({ size = 36, label, color = '#f4c542' }) => (
  <div style={{
    width: size, height: size, borderRadius: 999,
    border: '1.5px solid #2a2a2a', background: color,
    display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:'Kalam, cursive', fontWeight:700, fontSize: size*0.4, flexShrink:0,
  }}>{label}</div>
);

Object.assign(window, { Phone, TabBar, ScreenHeader, Sketch, Avatar });
