/* Onboarding flow — login → identity → field → recommendation
 * Three variants showing different approaches.
 */

/* ─────────── A · Step-by-step (linear card) ─────────── */
const OnbA_Welcome = () => (
  <Phone>
    <div className="wf-screen-content" style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', gap:14, paddingTop:60}}>
      <div style={{width:96, height:96, border:'2.5px solid #1a1a1a', borderRadius:24, background:'#f4c542', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'4px 4px 0 #1a1a1a'}}>
        <span style={{fontFamily:'Caveat', fontWeight:700, fontSize:42, lineHeight:1}}>学</span>
      </div>
      <div className="wf-h1" style={{fontSize:34}}>学不死</div>
      <div className="wf-small" style={{maxWidth:220}}>AI 陪你一起，把考试和学习目标 死磕到底。</div>
      <div className="wf-squiggle" style={{width:60, marginTop:6}}></div>
      <div style={{marginTop:18, display:'flex', flexDirection:'column', gap:10, width:'100%', padding:'0 30px'}}>
        <button className="wf-btn wf-btn-primary" style={{justifyContent:'center', width:'100%'}}>
          <span style={{display:'inline-block', width:14, height:14, background:'#5fc866', borderRadius:3, border:'1.5px solid #fff'}}></span>
          微信一键登录
        </button>
        <button className="wf-btn" style={{justifyContent:'center', width:'100%'}}>手机号登录</button>
      </div>
      <div className="wf-tiny" style={{marginTop:14, padding:'0 30px'}}>登录即同意《用户协议》和《隐私政策》</div>
    </div>
  </Phone>
);

const OnbA_Identity = () => (
  <Phone>
    <div className="wf-screen-content">
      <ScreenHeader title="你是谁?" sub="step 1 / 3" />
      <div className="wf-body" style={{marginBottom:14}}>选一个最贴近你的身份</div>
      <div style={{display:'flex', flexDirection:'column', gap:10}}>
        {[
          ['学生', '在校 / 在读', '#d4e4f4'],
          ['打工人', '已工作', '#d4e8d0'],
          ['自由职业', '自己安排时间', '#f4d4d0'],
          ['其他', '随便点点看看', '#f0eee5'],
        ].map(([t, s, c], i) => (
          <div key={i} className="wf-box-soft" style={{padding:'12px 14px', display:'flex', alignItems:'center', gap:12, background: i===1?c:'#fff', borderWidth: i===1?'2.5px':'1.5px'}}>
            <div style={{width:34, height:34, border:'1.5px solid #1a1a1a', borderRadius:8, background:c}}></div>
            <div style={{flex:1}}>
              <div className="wf-h3">{t}</div>
              <div className="wf-tiny">{s}</div>
            </div>
            <div className={`wf-radio ${i===1?'on':''}`}></div>
          </div>
        ))}
      </div>
      <div style={{marginTop:18, display:'flex', gap:10}}>
        <button className="wf-btn wf-btn-ghost" style={{flex:1, justifyContent:'center'}}>跳过</button>
        <button className="wf-btn wf-btn-primary" style={{flex:2, justifyContent:'center'}}>下一步 →</button>
      </div>
    </div>
  </Phone>
);

const OnbA_Field = () => (
  <Phone>
    <div className="wf-screen-content">
      <ScreenHeader title="在搞啥?" sub="step 2 / 3" />
      <div className="wf-h3" style={{marginTop:6}}>行业 / 专业</div>
      <div className="wf-input wf-row" style={{marginTop:6, gap:8}}>
        <span style={{color:'#888'}}>{Sketch.search}</span>
        <span>软件工程 / 互联网</span>
      </div>
      <div className="wf-h3" style={{marginTop:14}}>最近在关注</div>
      <div className="wf-tiny" style={{marginBottom:6}}>多选 · 点一下加上去</div>
      <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
        {['AI 大模型','系统设计','英语口语','算法','产品经理','数据分析','心理学','理财'].map((t,i)=> (
          <span key={i} className={`wf-chip ${[0,2,4].includes(i)?'wf-chip-fill':''}`}>{t}</span>
        ))}
      </div>
      <div className="wf-h3" style={{marginTop:14}}>正在备考?</div>
      <div className="wf-input wf-row" style={{gap:8}}>
        <span className="wf-tiny" style={{color:'#888'}}>例如:</span>
        <span style={{color:'#888'}}>CFA 一级、考研、雅思…</span>
      </div>
      <div style={{marginTop:14, display:'flex', gap:10}}>
        <button className="wf-btn wf-btn-ghost" style={{flex:1, justifyContent:'center'}}>← 上一步</button>
        <button className="wf-btn wf-btn-primary" style={{flex:2, justifyContent:'center'}}>下一步 →</button>
      </div>
    </div>
  </Phone>
);

const OnbA_Recommend = () => (
  <Phone>
    <div className="wf-screen-content">
      <ScreenHeader title="给你的推荐" sub="step 3 / 3 · 跳过也可以" />
      <div className="wf-h3" style={{marginBottom:6}}><span className="wf-hl">同行业的人在考</span></div>
      <div style={{display:'flex', flexDirection:'column', gap:8}}>
        {[
          ['软考·高级架构师','42% 同行', '#d4e4f4'],
          ['AWS Solution Architect','31%', '#d4e8d0'],
          ['PMP 项目管理','18%', '#f4d4d0'],
        ].map(([n,p,c],i)=>(
          <div key={i} className="wf-box-soft" style={{padding:'10px 12px', display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:30, height:30, border:'1.5px solid #1a1a1a', borderRadius:6, background:c}}></div>
            <div style={{flex:1}}>
              <div className="wf-body" style={{fontWeight:700}}>{n}</div>
              <div className="wf-tiny">{p}</div>
            </div>
            <div className="wf-check"></div>
          </div>
        ))}
      </div>
      <div className="wf-h3" style={{marginTop:14, marginBottom:6}}>大佬学习计划</div>
      <div className="wf-box-soft" style={{padding:10, display:'flex', gap:8, alignItems:'center'}}>
        <Avatar label="L" color="#d4e8d0" size={36}/>
        <div style={{flex:1}}>
          <div className="wf-body" style={{fontWeight:700}}>Lily · 字节 SDE</div>
          <div className="wf-tiny">90 天系统设计冲刺 · 已 1.2k 人 fork</div>
        </div>
        <button className="wf-btn" style={{padding:'5px 10px', fontSize:12}}>fork</button>
      </div>
      <div style={{marginTop:14, display:'flex', gap:10}}>
        <button className="wf-btn" style={{flex:1, justifyContent:'center'}}>稍后再说</button>
        <button className="wf-btn wf-btn-primary" style={{flex:1.4, justifyContent:'center'}}>开搞 ✓</button>
      </div>
    </div>
  </Phone>
);

/* ─────────── B · One-page form (denser) ─────────── */
const OnbB_OnePage = () => (
  <Phone>
    <div className="wf-screen-content">
      <ScreenHeader title="先来认识下" sub="一页填完, 后面随时改" />
      <div className="wf-h3">身份</div>
      <div className="wf-row" style={{flexWrap:'wrap', gap:6, marginBottom:10}}>
        {['学生','打工人','自由','其他'].map((t,i)=>(
          <span key={i} className={`wf-chip ${i===1?'wf-chip-fill':''}`} style={{borderWidth:i===1?'2px':'1.5px'}}>{t}</span>
        ))}
      </div>
      <div className="wf-h3">行业</div>
      <div className="wf-input" style={{marginBottom:10}}>互联网 / 软件</div>
      <div className="wf-h3">关注的领域</div>
      <div style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:10}}>
        {['AI','系统设计','英语','心理学','+'].map((t,i)=>(
          <span key={i} className={`wf-chip ${i<3?'wf-chip-fill':''}`} style={{fontWeight:i===4?700:400}}>{t}</span>
        ))}
      </div>
      <div className="wf-h3">在备考</div>
      <div className="wf-input wf-row" style={{marginBottom:10}}>
        <span style={{flex:1}}>软考·高级架构师</span>
        <span className="wf-tiny">×</span>
      </div>
      <div className="wf-tiny" style={{marginBottom:10}}>+ 添加 (最多 3 个)</div>
      <button className="wf-btn wf-btn-primary" style={{width:'100%', justifyContent:'center'}}>提交, 看推荐</button>
    </div>
  </Phone>
);

/* ─────────── C · Conversational (AI asks) ─────────── */
const OnbC_Chat = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingTop:0, display:'flex', flexDirection:'column'}}>
      <div style={{padding:'10px 4px', display:'flex', alignItems:'center', gap:8, borderBottom:'1.5px dashed #4a4a4a'}}>
        <Avatar label="AI" color="#f4c542" size={32}/>
        <div>
          <div className="wf-h3">小学 · 你的陪学搭子</div>
          <div className="wf-tiny">在线 · 陪你聊聊</div>
        </div>
      </div>
      <div style={{flex:1, overflowY:'hidden', padding:'12px 4px', display:'flex', flexDirection:'column', gap:10}}>
        <div className="wf-box-soft" style={{padding:'8px 12px', maxWidth:'80%', alignSelf:'flex-start', borderRadius:'14px 14px 14px 4px', background:'#fff'}}>
          <div className="wf-body">嗨! 先聊几句, 我好帮你定计划~ 你现在主要是?</div>
        </div>
        <div className="wf-row" style={{gap:6, flexWrap:'wrap', alignSelf:'flex-start', maxWidth:'100%'}}>
          <span className="wf-chip">📚 在读</span>
          <span className="wf-chip wf-chip-fill">💼 上班</span>
          <span className="wf-chip">🏖 自由职业</span>
        </div>
        <div className="wf-box-soft" style={{padding:'8px 12px', maxWidth:'80%', alignSelf:'flex-end', background:'#1a1a1a', color:'#fff', borderRadius:'14px 14px 4px 14px', borderColor:'#1a1a1a'}}>
          <div className="wf-body" style={{color:'#fff'}}>上班, 互联网行业</div>
        </div>
        <div className="wf-box-soft" style={{padding:'8px 12px', maxWidth:'85%', alignSelf:'flex-start', borderRadius:'14px 14px 14px 4px'}}>
          <div className="wf-body">了解了 ✓ 那你最近想啃啥? (一句话就行)</div>
        </div>
      </div>
      <div className="wf-row" style={{gap:8, padding:'8px 4px', borderTop:'1.5px dashed #4a4a4a'}}>
        <div className="wf-input" style={{flex:1, color:'#888'}}>说说看…</div>
        <button className="wf-btn wf-btn-primary" style={{padding:'8px 10px'}}>{Sketch.send}</button>
      </div>
    </div>
  </Phone>
);

Object.assign(window, { OnbA_Welcome, OnbA_Identity, OnbA_Field, OnbA_Recommend, OnbB_OnePage, OnbC_Chat });
