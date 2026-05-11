/* 备考档案 — exam profile management */

/* A · Multi-profile dashboard list */
const PlanA_List = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80}}>
      <div style={{display:'flex', alignItems:'center', gap:8, padding:'4px 0 10px'}}>
        <div className="wf-h1" style={{flex:1}}>我的备考</div>
        <button className="wf-btn wf-btn-primary" style={{padding:'5px 10px', fontSize:13}}>+ 新档案</button>
      </div>

      <div className="wf-row" style={{gap:6, marginBottom:10}}>
        <span className="wf-chip wf-chip-fill">进行中 · 2</span>
        <span className="wf-chip">已归档 · 3</span>
      </div>

      {/* active card 1 */}
      <div className="wf-box-thick" style={{padding:12, marginBottom:10}}>
        <div className="wf-row" style={{marginBottom:6}}>
          <span className="wf-chip wf-chip-green">主线</span>
          <span className="wf-tiny" style={{marginLeft:'auto'}}>D-43</span>
        </div>
        <div className="wf-h3" style={{fontSize:17, marginBottom:2}}>软考 · 高级架构师</div>
        <div className="wf-tiny" style={{marginBottom:8}}>目标 60+ · 11月 8日</div>
        <div className="wf-prog"><span style={{width:'58%'}}></span></div>
        <div className="wf-row" style={{marginTop:6, justifyContent:'space-between'}}>
          <span className="wf-tiny">进度 58% · 连续 12 天 🔥</span>
          <span className="wf-tiny wf-underline">查看 →</span>
        </div>
      </div>

      {/* active card 2 */}
      <div className="wf-box-soft" style={{padding:12, marginBottom:10}}>
        <div className="wf-row" style={{marginBottom:6}}>
          <span className="wf-chip">副线</span>
          <span className="wf-tiny" style={{marginLeft:'auto'}}>D-120</span>
        </div>
        <div className="wf-h3" style={{fontSize:17}}>英语 · 雅思 7</div>
        <div className="wf-tiny" style={{marginBottom:8}}>3月 · 出国用</div>
        <div className="wf-prog"><span style={{width:'22%'}}></span></div>
      </div>

      {/* archived */}
      <div className="wf-h3" style={{marginTop:12, marginBottom:6}}>已归档</div>
      {[
        ['CET-6','已通过 · 567','#d4e8d0'],
        ['驾照·科目一','100 分','#d4e4f4'],
        ['Python·入门','已完成','#f0eee5'],
      ].map(([t,r,c],i)=>(
        <div key={i} className="wf-box-dashed" style={{padding:'8px 12px', marginBottom:6, display:'flex', alignItems:'center', gap:10, opacity:0.85}}>
          <div style={{width:24, height:24, border:'1.2px solid #4a4a4a', borderRadius:6, background:c}}></div>
          <div style={{flex:1}}>
            <div className="wf-body">{t}</div>
            <div className="wf-tiny">{r}</div>
          </div>
          <span className="wf-tiny">📦</span>
        </div>
      ))}
    </div>
    <TabBar active="plan"/>
  </Phone>
);

/* B · Create new profile (form) */
const PlanB_Create = () => (
  <Phone>
    <div className="wf-screen-content">
      <ScreenHeader title="新建备考档案" sub="可以同时建多个" back/>

      <div className="wf-h3">学的是什么?</div>
      <div className="wf-input" style={{marginBottom:10}}>软考 · 高级架构师</div>

      <div className="wf-h3">目标</div>
      <div className="wf-input" style={{marginBottom:10}}>三科 60 分通过</div>

      <div className="wf-h3">考试日期</div>
      <div className="wf-input wf-row" style={{marginBottom:10}}>
        <span style={{flex:1}}>2026-11-08</span>
        <span className="wf-tiny">📅</span>
      </div>

      <div className="wf-h3">每天能投入</div>
      <div className="wf-row" style={{gap:6, flexWrap:'wrap', marginBottom:10}}>
        {['<30 min','1 小时','2 小时','>3 小时','看心情'].map((t,i)=>(
          <span key={i} className={`wf-chip ${i===1?'wf-chip-fill':''}`}>{t}</span>
        ))}
      </div>

      <div className="wf-h3">之前考过吗?</div>
      <div className="wf-row" style={{gap:8, marginBottom:6}}>
        <span className="wf-chip wf-chip-fill">考过</span>
        <span className="wf-chip">没有</span>
      </div>
      <div className="wf-input" style={{marginBottom:14, color:'#888'}}>上次成绩 / 阶段...</div>

      <div className="wf-row" style={{gap:8}}>
        <button className="wf-btn" style={{flex:1, justifyContent:'center'}}>稍后再填</button>
        <button className="wf-btn wf-btn-primary" style={{flex:1.4, justifyContent:'center'}}>生成计划 ✨</button>
      </div>
    </div>
  </Phone>
);

/* C · Plan detail (timeline + tasks) */
const PlanC_Detail = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80}}>
      <div style={{padding:'4px 0 8px'}}>
        <div className="wf-row" style={{marginBottom:4}}>
          <span className="wf-tiny">‹ 我的备考</span>
          <span className="wf-tiny" style={{marginLeft:'auto'}}>...</span>
        </div>
        <div className="wf-h2" style={{fontSize:24}}>软考·高级架构师</div>
        <div className="wf-tiny">D-43 · 11月 8日 · 58%</div>
      </div>

      <div className="wf-prog" style={{marginBottom:10}}><span style={{width:'58%'}}></span></div>

      <div className="wf-row" style={{gap:6, marginBottom:10}}>
        <span className="wf-chip wf-chip-fill">今日</span>
        <span className="wf-chip">本周</span>
        <span className="wf-chip">全计划</span>
        <span className="wf-chip">调整 ⚙</span>
      </div>

      <div className="wf-h3" style={{marginBottom:6}}>今天的任务 · 3 / 5</div>

      {[
        [true,'看《架构设计》ch.7 · 60 min','#d4e8d0'],
        [true,'刷题 · 数据库 · 20 题','#d4e4f4'],
        [true,'AI 复盘 · 10 min','#f4c542'],
        [false,'真题 2023 · 上午题 · 90 min','#fff'],
        [false,'错题回顾 · 30 min','#fff'],
      ].map(([done,t,c],i)=>(
        <div key={i} className="wf-box-soft" style={{padding:'10px 12px', marginBottom:6, display:'flex', alignItems:'center', gap:10, background:done?'#f8f8f4':'#fff', opacity:done?0.65:1}}>
          <div className={`wf-check ${done?'on':''}`}></div>
          <div style={{width:6, height:24, background:c, borderRadius:2, border:'1px solid #1a1a1a'}}></div>
          <div className="wf-body" style={{flex:1, textDecoration:done?'line-through':'none'}}>{t}</div>
        </div>
      ))}

      <div className="wf-box-dashed" style={{padding:10, marginTop:10, display:'flex', gap:8, alignItems:'center', background:'#fff8e6'}}>
        <span style={{fontSize:18}}>💡</span>
        <div className="wf-tiny" style={{flex:1}}>"昨晚没完成. 给你把今天难度调低了, ok?"</div>
        <button className="wf-btn" style={{padding:'3px 8px', fontSize:11}}>同意</button>
      </div>
    </div>
    <TabBar active="plan"/>
  </Phone>
);

/* D · Archive flow (with results) */
const PlanD_Archive = () => (
  <Phone>
    <div className="wf-screen-content">
      <ScreenHeader title="归档这个档案" sub="记录一下结果, 给后人参考" back/>

      <div className="wf-box-thick" style={{padding:12, marginBottom:14, background:'#fff8e6'}}>
        <div className="wf-h3">软考·高级架构师</div>
        <div className="wf-tiny">用时 89 天 · 共完成 142 个任务</div>
      </div>

      <div className="wf-h3">最终结果</div>
      <div className="wf-row" style={{gap:6, flexWrap:'wrap', marginBottom:10}}>
        <span className="wf-chip wf-chip-fill" style={{fontWeight:700}}>🎯 通过</span>
        <span className="wf-chip">未通过</span>
        <span className="wf-chip">放弃了</span>
      </div>

      <div className="wf-h3">分数 / 成果</div>
      <div className="wf-input" style={{marginBottom:10}}>三科: 52 / 48 / 51</div>

      <div className="wf-h3">一句话感想</div>
      <div className="wf-input" style={{marginBottom:10, height:64, alignItems:'flex-start', display:'flex', color:'#888'}}>
        分享给社区, 帮一下后面的人...
      </div>

      <div className="wf-row" style={{gap:8, marginBottom:14}}>
        <div className="wf-check on"></div>
        <div className="wf-body">同步到广场上岸墙</div>
      </div>

      <div className="wf-row" style={{gap:8}}>
        <button className="wf-btn" style={{flex:1, justifyContent:'center'}}>取消</button>
        <button className="wf-btn wf-btn-primary" style={{flex:1.4, justifyContent:'center'}}>归档 📦</button>
      </div>
    </div>
  </Phone>
);

Object.assign(window, { PlanA_List, PlanB_Create, PlanC_Detail, PlanD_Archive });
