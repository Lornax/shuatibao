/* AI 陪学, 题库, 个人中心 */

/* AI 陪学 — A · 主聊天 + 任务侧栏 */
const AiA_Chat = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80, paddingTop:0, display:'flex', flexDirection:'column'}}>
      <div style={{padding:'10px 0 10px', display:'flex', alignItems:'center', gap:8, borderBottom:'1.5px dashed #4a4a4a'}}>
        <Avatar label="学" color="#f4c542" size={36}/>
        <div style={{flex:1}}>
          <div className="wf-h3">小学 · 你的陪学搭子</div>
          <div className="wf-tiny">已陪你 47 天 🔥</div>
        </div>
        <span className="wf-chip">📅 今日</span>
      </div>

      <div style={{flex:1, padding:'10px 0', display:'flex', flexDirection:'column', gap:8, overflow:'hidden'}}>
        <div className="wf-box-soft" style={{padding:'8px 12px', maxWidth:'85%', alignSelf:'flex-start', borderRadius:'14px 14px 14px 4px', background:'#fff8e6'}}>
          <div className="wf-body">早! 起床啦~ 今天的任务你 还有 2 个没动过, 要先复盘一下昨天的错题吗?</div>
          <div className="wf-row" style={{gap:6, marginTop:6, flexWrap:'wrap'}}>
            <span className="wf-chip" style={{fontSize:11}}>好的, 开始</span>
            <span className="wf-chip" style={{fontSize:11}}>晚点再说</span>
          </div>
        </div>
        <div className="wf-box-soft" style={{padding:'8px 12px', maxWidth:'85%', alignSelf:'flex-end', background:'#1a1a1a', color:'#fff', borderRadius:'14px 14px 4px 14px', borderColor:'#1a1a1a'}}>
          <div className="wf-body" style={{color:'#fff'}}>那个 CAP 定理我又忘了...</div>
        </div>
        <div className="wf-box-soft" style={{padding:'8px 12px', maxWidth:'85%', alignSelf:'flex-start', borderRadius:'14px 14px 14px 4px'}}>
          <div className="wf-body">没事 第三次了 😆 我用你昨天提的"外卖系统"举个例子...</div>
          <div className="wf-img" style={{height:60, marginTop:6}}></div>
        </div>
      </div>

      <div className="wf-row" style={{gap:6, padding:'8px 0'}}>
        <button className="wf-btn" style={{padding:'6px 10px', fontSize:12}}>📷</button>
        <div className="wf-input wf-row" style={{flex:1, color:'#888'}}>
          <span style={{flex:1}}>问我点什么...</span>
          <span>{Sketch.mic}</span>
        </div>
        <button className="wf-btn wf-btn-primary" style={{padding:'8px 10px'}}>{Sketch.send}</button>
      </div>
    </div>
    <TabBar active="ai"/>
  </Phone>
);

/* AI 陪学 — B · 催促/打卡 */
const AiB_Nudge = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80}}>
      <ScreenHeader title="今日陪学" sub="小学 在催你了 👀"/>

      <div className="wf-box-thick" style={{padding:14, marginBottom:12, background:'#fff8e6'}}>
        <div className="wf-row" style={{marginBottom:6}}>
          <Avatar label="学" color="#f4c542" size={32}/>
          <div className="wf-h3" style={{flex:1}}>距离考试 D-43</div>
        </div>
        <div className="wf-body">"哥, 最近三天 都在偷懒哦 ⚠️ 现在的进度比 计划落后了 4%, 我帮你重新排一下?"</div>
        <div className="wf-row" style={{gap:8, marginTop:10}}>
          <button className="wf-btn" style={{padding:'5px 10px', fontSize:12}}>稍后</button>
          <button className="wf-btn wf-btn-primary" style={{padding:'5px 10px', fontSize:12}}>调整计划</button>
        </div>
      </div>

      <div className="wf-h3" style={{marginBottom:6}}>本周打卡</div>
      <div className="wf-row" style={{gap:6, marginBottom:14}}>
        {['一','二','三','四','五','六','日'].map((d,i)=>(
          <div key={i} style={{flex:1, textAlign:'center'}}>
            <div className="wf-tiny">{d}</div>
            <div style={{
              width:'100%', aspectRatio:'1', marginTop:4,
              border:'1.5px solid #1a1a1a', borderRadius:6,
              background: i<4?'#d4e8d0':(i===4?'#f4d4d0':'#fff'),
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
            }}>{i<4?'✓':(i===4?'×':'')}</div>
          </div>
        ))}
      </div>

      <div className="wf-h3" style={{marginBottom:6}}>这周我学到了</div>
      <div className="wf-box-dashed" style={{padding:10, marginBottom:6}}>
        <div className="wf-tiny">AI 周报 · 自动生成</div>
        <div className="wf-body" style={{marginTop:4}}>"系统设计"专题完成度 70%, 弱项: 缓存一致性 / 消息队列. 下周建议加 2 道真题.</div>
      </div>
    </div>
    <TabBar active="ai"/>
  </Phone>
);

/* 题库 — A · 答题 */
const LibA_Quiz = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80}}>
      <div className="wf-row" style={{padding:'4px 0 10px'}}>
        <span className="wf-tiny">‹ 题库</span>
        <span className="wf-h3" style={{flex:1, textAlign:'center'}}>第 8 / 20 题</span>
        <span className="wf-tiny">⏱ 12:34</span>
      </div>
      <div className="wf-prog" style={{marginBottom:14}}><span style={{width:'40%'}}></span></div>

      <div className="wf-row" style={{gap:6, marginBottom:8}}>
        <span className="wf-chip wf-chip-fill">单选</span>
        <span className="wf-chip">数据库</span>
        <span className="wf-tiny" style={{marginLeft:'auto'}}>难度 ★★★</span>
      </div>

      <div className="wf-body" style={{marginBottom:12, lineHeight:1.5}}>
        在分布式系统中, CAP 定理指出 至多只能同时满足以下哪两项?
      </div>

      <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:14}}>
        {['A. 一致性 / 可用性 / 分区容忍','B. 持久性 / 隔离性','C. 原子性 / 一致性 / 持久性','D. 以上都对'].map((t,i)=>(
          <div key={i} className="wf-box-soft" style={{padding:'10px 12px', display:'flex', alignItems:'center', gap:10, background:i===0?'#fff8e6':'#fff', borderWidth:i===0?'2.5px':'1.5px'}}>
            <div className={`wf-radio ${i===0?'on':''}`}></div>
            <div className="wf-body">{t}</div>
          </div>
        ))}
      </div>

      <div className="wf-row" style={{gap:8}}>
        <button className="wf-btn" style={{flex:1, justifyContent:'center', fontSize:12}}>🚩 标记</button>
        <button className="wf-btn" style={{flex:1, justifyContent:'center', fontSize:12}}>💬 问 AI</button>
        <button className="wf-btn wf-btn-primary" style={{flex:1.4, justifyContent:'center'}}>下一题 →</button>
      </div>
    </div>
  </Phone>
);

/* 题库 — B · 库首页 */
const LibB_Home = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80}}>
      <ScreenHeader title="题库" sub="软考·高级架构师" right={<span style={{padding:6, border:'1.5px solid #1a1a1a', borderRadius:8}}>{Sketch.search}</span>}/>

      <div className="wf-box-thick" style={{padding:12, marginBottom:12, background:'#fff8e6'}}>
        <div className="wf-row">
          <div style={{flex:1}}>
            <div className="wf-tiny">已刷</div>
            <div className="wf-h2" style={{fontSize:26}}>1,284</div>
          </div>
          <div style={{flex:1}}>
            <div className="wf-tiny">正确率</div>
            <div className="wf-h2" style={{fontSize:26}}>72%</div>
          </div>
          <div style={{flex:1}}>
            <div className="wf-tiny">错题</div>
            <div className="wf-h2" style={{fontSize:26, color:'#d94a3a'}}>198</div>
          </div>
        </div>
      </div>

      <div className="wf-h3" style={{marginBottom:8}}>分专题</div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12}}>
        {[
          ['数据库','85%','#d4e8d0'],
          ['网络','62%','#d4e4f4'],
          ['架构','71%','#f4d4d0'],
          ['软工','55%','#e8d8f0'],
        ].map(([t,p,c],i)=>(
          <div key={i} className="wf-box-soft" style={{padding:10, background:c}}>
            <div className="wf-h3">{t}</div>
            <div className="wf-tiny" style={{marginTop:4}}>正确率 {p}</div>
            <div className="wf-prog" style={{marginTop:6}}><span style={{width:p}}></span></div>
          </div>
        ))}
      </div>

      <div className="wf-h3" style={{marginBottom:6}}>快速开始</div>
      {[
        ['🎯 每日 20 题','AI 智能挑选'],
        ['🔥 错题本','198 道待复习'],
        ['📋 历年真题','2018-2024'],
        ['🔍 搜索研究','题目 / 知识点'],
      ].map(([t,s],i)=>(
        <div key={i} className="wf-box-soft" style={{padding:'10px 12px', marginBottom:6, display:'flex', alignItems:'center', gap:10}}>
          <div className="wf-body" style={{fontWeight:700, flex:1}}>{t}</div>
          <div className="wf-tiny">{s}</div>
          <span className="wf-tiny">›</span>
        </div>
      ))}
    </div>
    <TabBar active="lib"/>
  </Phone>
);

/* 题库 — C · AI 搜索研究 */
const LibC_Search = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80}}>
      <ScreenHeader title="搜索研究" sub="问题 / 知识点 / 题目"/>

      <div className="wf-input wf-row" style={{marginBottom:10, gap:8, background:'#fff8e6', borderColor:'#d94a3a', borderWidth:2}}>
        <span>{Sketch.search}</span>
        <span style={{flex:1}}>讲讲 BASE 理论 vs ACID</span>
        <span className="wf-tiny">⌫</span>
      </div>

      <div className="wf-row" style={{gap:6, marginBottom:12}}>
        <span className="wf-chip wf-chip-fill">AI 解答</span>
        <span className="wf-chip">题目</span>
        <span className="wf-chip">知识卡</span>
        <span className="wf-chip">大佬笔记</span>
      </div>

      <div className="wf-box-soft" style={{padding:12, marginBottom:10, background:'#fff8e6'}}>
        <div className="wf-row" style={{marginBottom:6}}>
          <Avatar label="学" color="#f4c542" size={24}/>
          <div className="wf-tiny" style={{flex:1}}>小学 给你的回答</div>
          <span className="wf-tiny">⋯</span>
        </div>
        <div className="wf-body" style={{lineHeight:1.5}}>
          <span className="wf-hl">ACID</span> 强一致, 适合传统事务; <span className="wf-hl">BASE</span> 最终一致, 适合分布式...
        </div>
        <div className="wf-squiggle" style={{margin:'8px 0'}}></div>
        <div className="wf-tiny">📚 引用了 3 篇大佬笔记 · 关联 8 道真题</div>
      </div>

      <div className="wf-h3" style={{marginBottom:6}}>相关题目</div>
      {[
        ['2023 上午题 第 14 题','下列哪一项不属于 BASE...','★★'],
        ['2021 上午题 第 8 题','BASE 中的 S 代表...','★★★'],
      ].map(([t,q,d],i)=>(
        <div key={i} className="wf-box-soft" style={{padding:10, marginBottom:6}}>
          <div className="wf-row">
            <span className="wf-tiny" style={{color:'#d94a3a'}}>{t}</span>
            <span className="wf-tiny" style={{marginLeft:'auto'}}>{d}</span>
          </div>
          <div className="wf-body" style={{marginTop:2}}>{q}</div>
        </div>
      ))}
    </div>
    <TabBar active="lib"/>
  </Phone>
);

/* 个人中心 */
const MeA_Profile = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80}}>
      <div style={{padding:'4px 0 12px'}}>
        <div className="wf-h1">我的</div>
      </div>

      <div className="wf-box-thick" style={{padding:14, marginBottom:12, background:'#fff8e6'}}>
        <div className="wf-row">
          <Avatar label="我" color="#d4e4f4" size={52}/>
          <div style={{flex:1}}>
            <div className="wf-h3" style={{fontSize:17}}>张同学 <span className="wf-tiny">edit ✎</span></div>
            <div className="wf-tiny">互联网 · 后端 · 在职 3 年</div>
            <div className="wf-row" style={{gap:6, marginTop:4}}>
              <span className="wf-chip" style={{fontSize:10, padding:'1px 6px'}}>🔥 47</span>
              <span className="wf-chip" style={{fontSize:10, padding:'1px 6px'}}>🎯 2 个目标</span>
            </div>
          </div>
        </div>
      </div>

      <div className="wf-h3" style={{marginBottom:6}}>学习画像</div>
      <div className="wf-box-soft" style={{padding:12, marginBottom:12}}>
        <div className="wf-row" style={{justifyContent:'space-around'}}>
          <div style={{textAlign:'center'}}>
            <div className="wf-h3" style={{fontSize:18}}>夜猫子</div>
            <div className="wf-tiny">22:00 高效</div>
          </div>
          <div style={{width:1, background:'#1a1a1a', opacity:0.2}}></div>
          <div style={{textAlign:'center'}}>
            <div className="wf-h3" style={{fontSize:18}}>实践派</div>
            <div className="wf-tiny">爱刷题 / 不爱视频</div>
          </div>
        </div>
        <div className="wf-tiny" style={{marginTop:8, textAlign:'center'}}>查看完整画像 →</div>
      </div>

      <div className="wf-box-soft" style={{padding:0, marginBottom:10}}>
        {[
          ['📋','我的档案','3 个'],
          ['📦','已归档','3 个'],
          ['⭐','收藏笔记','24 篇'],
          ['📊','学习数据','本月 38h'],
        ].map(([i,t,r],idx)=>(
          <div key={idx} style={{padding:'12px 14px', display:'flex', alignItems:'center', gap:10, borderBottom: idx<3?'1px dashed #ccc':'none'}}>
            <span style={{fontSize:16}}>{i}</span>
            <span className="wf-body" style={{flex:1}}>{t}</span>
            <span className="wf-tiny">{r}</span>
            <span className="wf-tiny">›</span>
          </div>
        ))}
      </div>

      <div className="wf-box-soft" style={{padding:0, marginBottom:10}}>
        {[
          ['💎','订阅 · Pro','30 天 / ¥30'],
          ['🔔','消息通知','开'],
          ['🔒','隐私 / 协议',''],
          ['ℹ️','关于 / 反馈',''],
        ].map(([i,t,r],idx)=>(
          <div key={idx} style={{padding:'12px 14px', display:'flex', alignItems:'center', gap:10, borderBottom: idx<3?'1px dashed #ccc':'none'}}>
            <span style={{fontSize:16}}>{i}</span>
            <span className="wf-body" style={{flex:1}}>{t}</span>
            <span className="wf-tiny">{r}</span>
            <span className="wf-tiny">›</span>
          </div>
        ))}
      </div>
    </div>
    <TabBar active="me"/>
  </Phone>
);

Object.assign(window, { AiA_Chat, AiB_Nudge, LibA_Quiz, LibB_Home, LibC_Search, MeA_Profile });
