/* 题库管理 — 新增 / 批量 / 查重 / 题目编辑 */

/* ─────────── A · 题目管理首页 (列表 + 搜索 + 批量) ─────────── */
const Lib_Manage = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80}}>
      <div className="wf-row" style={{padding:'4px 0 6px'}}>
        <span className="wf-tiny">‹ 题库</span>
        <div className="wf-h3" style={{flex:1, textAlign:'center'}}>管理题目</div>
        <span className="wf-tiny">+ 新增</span>
      </div>

      {/* 搜索栏 */}
      <div className="wf-input wf-row" style={{marginBottom:8, gap:8}}>
        <span>{Sketch.search}</span>
        <span style={{flex:1, color:'#888'}}>搜题干 / 知识点 / 标签</span>
        <span className="wf-tiny">⚙</span>
      </div>

      {/* 筛选条 */}
      <div className="wf-row" style={{gap:6, marginBottom:8, overflowX:'hidden'}}>
        <span className="wf-chip wf-chip-fill" style={{flexShrink:0}}>全部 1284</span>
        <span className="wf-chip" style={{flexShrink:0}}>错题 198</span>
        <span className="wf-chip" style={{flexShrink:0}}>未刷 412</span>
        <span className="wf-chip" style={{flexShrink:0}}>简单 ↓</span>
        <span className="wf-chip" style={{flexShrink:0}}>重复? 8</span>
      </div>

      {/* 批量操作栏 (已选中模式) */}
      <div className="wf-box-thick" style={{padding:'8px 10px', marginBottom:8, background:'#fff8e6', display:'flex', alignItems:'center', gap:6}}>
        <span className="wf-h3" style={{fontSize:13, color:'#d94a3a'}}>已选 4 题</span>
        <div style={{flex:1}}></div>
        <button className="wf-btn" style={{padding:'3px 8px', fontSize:11}}>📁 移动</button>
        <button className="wf-btn" style={{padding:'3px 8px', fontSize:11}}>🏷 标记</button>
        <button className="wf-btn" style={{padding:'3px 8px', fontSize:11, color:'#d94a3a', borderColor:'#d94a3a'}}>🗑 删除</button>
      </div>

      {/* 题目列表 */}
      {[
        {sel:true, dup:false, t:'CAP 定理在分布式系统中指至多同时满足...', tag:'数据库', diff:'★★★', s:'错过 2 次'},
        {sel:true, dup:false, t:'下列哪一项不属于 BASE 理论的内容?', tag:'架构', diff:'★★', s:'已掌握 ✓'},
        {sel:false, dup:true, t:'分布式事务中, 2PC 的两个阶段分别是?', tag:'数据库', diff:'★★', s:'⚠ 与第 47 题相似 92%'},
        {sel:false, dup:false, t:'微服务架构的优势不包括以下哪一项?', tag:'架构', diff:'★', s:'未刷'},
        {sel:true, dup:false, t:'TCP 三次握手中, 第二次发送的报文标志位是?', tag:'网络', diff:'★★', s:'错过 1 次'},
        {sel:true, dup:false, t:'下列设计模式中, 属于创建型模式的是?', tag:'软工', diff:'★', s:'已掌握 ✓'},
      ].map((q,i)=>(
        <div key={i} className="wf-box-soft" style={{padding:10, marginBottom:6, display:'flex', gap:10, background: q.sel?'#fff8e6':'#fff', borderColor: q.dup?'#d94a3a':'#1a1a1a', borderWidth: q.dup?2:1.5}}>
          <div className={`wf-check ${q.sel?'on':''}`} style={{marginTop:2}}></div>
          <div style={{flex:1, minWidth:0}}>
            <div className="wf-body" style={{lineHeight:1.4, marginBottom:4}}>{q.t}</div>
            <div className="wf-row" style={{gap:6, flexWrap:'wrap'}}>
              <span className="wf-chip" style={{fontSize:10, padding:'1px 6px'}}>{q.tag}</span>
              <span className="wf-tiny">{q.diff}</span>
              <span className="wf-tiny" style={{marginLeft:'auto', color: q.dup?'#d94a3a':(q.s.includes('错')?'#d94a3a':'#888'), fontWeight: q.dup?700:400}}>{q.s}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
    {/* FAB */}
    <div style={{position:'absolute', right:18, bottom:90, width:54, height:54, borderRadius:27, background:'#1a1a1a', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'2px 2px 0 #4a4a4a', fontSize:24, fontWeight:700}}>＋</div>
    <TabBar active="lib"/>
  </Phone>
);

/* ─────────── B · 添加题目入口 (action sheet) ─────────── */
const Lib_AddSheet = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80, position:'relative'}}>
      {/* 模糊的背景 */}
      <div style={{opacity:0.3, pointerEvents:'none'}}>
        <div className="wf-row" style={{padding:'4px 0 6px'}}>
          <span className="wf-tiny">‹ 题库</span>
          <div className="wf-h3" style={{flex:1, textAlign:'center'}}>管理题目</div>
        </div>
        <div className="wf-input wf-row" style={{marginBottom:8}}><span>{Sketch.search}</span></div>
        <div className="wf-box-soft" style={{padding:10, marginBottom:6, height:60}}></div>
        <div className="wf-box-soft" style={{padding:10, marginBottom:6, height:60}}></div>
      </div>

      {/* dim overlay */}
      <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.3)'}}></div>

      {/* bottom sheet */}
      <div className="wf-sheet" style={{padding:'14px 14px 30px'}}>
        <div className="wf-sheet-handle"></div>
        <div className="wf-h2" style={{fontSize:20, marginBottom:4}}>添加题目</div>
        <div className="wf-tiny" style={{marginBottom:14}}>从哪里加? 选一个</div>

        {[
          ['📷','拍照识题','对着书 / 卷子拍一下, AI 自动识别选项 + 答案','#f4c542'],
          ['✍','手动录入','一道一道敲, 适合精读时随手补充','#d4e4f4'],
          ['📁','文件导入','PDF / Word / 图片包 / Anki / Markdown','#d4e8d0'],
          ['🔗','粘贴链接','网页 / 公众号文章, AI 提取题目','#f4d4d0'],
          ['🛒','市场补充','别人的错题本一键合并到你的库','#e8d8f0'],
          ['🎲','AI 生成','根据知识点 + 难度, 让 AI 出新题','#fff8e6'],
        ].map(([i,t,d,c],idx)=>(
          <div key={idx} className="wf-box-soft" style={{padding:10, marginBottom:6, display:'flex', alignItems:'center', gap:10, borderWidth: idx===0?2.5:1.5, background: idx===0?'#fff8e6':'#fff'}}>
            <div style={{width:36, height:36, border:'1.5px solid #1a1a1a', borderRadius:8, background:c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0}}>{i}</div>
            <div style={{flex:1, minWidth:0}}>
              <div className="wf-body" style={{fontWeight:700}}>{t}</div>
              <div className="wf-tiny">{d}</div>
            </div>
            <span className="wf-tiny">›</span>
          </div>
        ))}
      </div>
    </div>
  </Phone>
);

/* ─────────── C · 拍照识题 → 编辑确认 ─────────── */
const Lib_OcrEdit = () => (
  <Phone>
    <div className="wf-screen-content">
      <ScreenHeader title="确认这道题" sub="AI 已识别 · 拍歪了/识别错了可以改" back/>

      <div className="wf-img" style={{height:120, marginBottom:10, position:'relative'}}>
        <div style={{position:'absolute', right:6, bottom:6, padding:'3px 8px', background:'#fff', border:'1.5px solid #1a1a1a', borderRadius:12, fontSize:11, fontFamily:'Patrick Hand'}}>重拍 / 裁剪</div>
      </div>

      <div className="wf-h3">题干</div>
      <div className="wf-input" style={{marginBottom:10, height:60, lineHeight:1.4, padding:10}}>
        在分布式系统中, CAP 定理指出至多只能同时满足以下哪两项?
      </div>

      <div className="wf-h3">选项 + 答案</div>
      <div style={{display:'flex', flexDirection:'column', gap:5, marginBottom:10}}>
        {[
          ['A','一致性 / 可用性 / 分区容忍', true],
          ['B','持久性 / 隔离性', false],
          ['C','原子性 / 一致性 / 持久性', false],
          ['D','以上都对', false],
        ].map(([k,t,c],i)=>(
          <div key={i} className="wf-row" style={{gap:8}}>
            <div className={`wf-radio ${c?'on':''}`} style={{marginTop:6}}></div>
            <div className="wf-input" style={{flex:1, padding:'6px 10px'}}>{k}. {t}</div>
            <span className="wf-tiny" style={{width:14, textAlign:'center'}}>×</span>
          </div>
        ))}
      </div>
      <div className="wf-tiny" style={{marginBottom:10, color:'#d94a3a'}}>＋ 加选项</div>

      <div className="wf-h3">归类</div>
      <div className="wf-row" style={{gap:6, flexWrap:'wrap', marginBottom:10}}>
        <span className="wf-chip wf-chip-fill">数据库</span>
        <span className="wf-chip wf-chip-fill">分布式</span>
        <span className="wf-chip">+</span>
        <span className="wf-tiny" style={{marginLeft:'auto'}}>难度 ★★★</span>
      </div>

      <div className="wf-box-dashed" style={{padding:10, marginBottom:14, background:'#fff8e6'}}>
        <div className="wf-row" style={{gap:6}}>
          <span style={{fontSize:14}}>⚠️</span>
          <div className="wf-tiny" style={{flex:1, fontWeight:700, color:'#d94a3a'}}>题库里好像有相似的</div>
        </div>
        <div className="wf-tiny" style={{marginTop:4, lineHeight:1.4}}>"CAP 中 P 指..." (相似度 78%) — 看一下</div>
      </div>

      <div className="wf-row" style={{gap:8}}>
        <button className="wf-btn" style={{flex:1, justifyContent:'center'}}>取消</button>
        <button className="wf-btn" style={{flex:1, justifyContent:'center', fontSize:12}}>+ 继续拍下一题</button>
        <button className="wf-btn wf-btn-primary" style={{flex:1.2, justifyContent:'center'}}>保存 ✓</button>
      </div>
    </div>
  </Phone>
);

/* ─────────── D · 查重 ─────────── */
const Lib_Dup = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:14}}>
      <ScreenHeader title="疑似重复" sub="AI 找出了 8 组相似题 · 处理一下?" back/>

      <div className="wf-row" style={{gap:6, marginBottom:10}}>
        <span className="wf-chip wf-chip-fill">8 组</span>
        <span className="wf-chip">高度相似 ≥90%</span>
        <span className="wf-chip">中等 70-90%</span>
      </div>

      <div className="wf-box-thick" style={{padding:0, marginBottom:10, borderColor:'#d94a3a', overflow:'hidden'}}>
        <div style={{padding:'8px 12px', background:'#fff8e6', borderBottom:'1.5px solid #d94a3a'}}>
          <div className="wf-row">
            <span className="wf-h3" style={{fontSize:13, color:'#d94a3a'}}>组 1 · 相似度 92%</span>
            <span className="wf-tiny" style={{marginLeft:'auto'}}>2 题</span>
          </div>
        </div>

        {/* card A */}
        <div style={{padding:10, borderBottom:'1px dashed #ccc'}}>
          <div className="wf-row" style={{marginBottom:4}}>
            <div className="wf-radio on"></div>
            <span className="wf-h3" style={{fontSize:12, marginLeft:6}}>保留 A</span>
            <span className="wf-tiny" style={{marginLeft:'auto'}}>2024-04-12 · 拍照添加</span>
          </div>
          <div className="wf-body" style={{fontSize:13, lineHeight:1.4}}>分布式事务中, 2PC 的两个阶段分别是 准备阶段 + 提交阶段, 对吗?</div>
          <div className="wf-tiny" style={{marginTop:4}}>已刷 3 次 · 错过 1 次</div>
        </div>
        {/* card B */}
        <div style={{padding:10, background:'#fafafa'}}>
          <div className="wf-row" style={{marginBottom:4}}>
            <div className="wf-radio"></div>
            <span className="wf-h3" style={{fontSize:12, marginLeft:6, color:'#888'}}>B (会被删)</span>
            <span className="wf-tiny" style={{marginLeft:'auto'}}>2024-03-20 · 文件导入</span>
          </div>
          <div className="wf-body" style={{fontSize:13, lineHeight:1.4, color:'#666'}}>2PC (两阶段提交) 的第一阶段和第二阶段分别叫什么?</div>
          <div className="wf-tiny" style={{marginTop:4}}>未刷</div>
        </div>
        <div style={{padding:8, background:'#fff', display:'flex', gap:6, justifyContent:'flex-end'}}>
          <button className="wf-btn" style={{padding:'3px 8px', fontSize:11}}>都保留</button>
          <button className="wf-btn" style={{padding:'3px 8px', fontSize:11}}>合并答案</button>
          <button className="wf-btn wf-btn-primary" style={{padding:'3px 8px', fontSize:11}}>删除 B</button>
        </div>
      </div>

      {/* 折叠的其他组 */}
      {[
        ['组 2','85%','3 题'],
        ['组 3','78%','2 题'],
        ['组 4','73%','2 题'],
      ].map(([n,s,c],i)=>(
        <div key={i} className="wf-box-soft" style={{padding:'8px 12px', marginBottom:5, display:'flex', alignItems:'center'}}>
          <span className="wf-h3" style={{fontSize:13}}>{n}</span>
          <span className="wf-tiny" style={{marginLeft:8}}>相似度 {s} · {c}</span>
          <span className="wf-tiny" style={{marginLeft:'auto'}}>展开 ›</span>
        </div>
      ))}

      <div className="wf-box-dashed" style={{padding:10, marginTop:10, background:'#fff8e6'}}>
        <div className="wf-tiny" style={{lineHeight:1.5}}>💡 一键智能合并: 优先保留刷过的, 错题保留全部. 复杂的留给你自己挑.</div>
        <button className="wf-btn wf-btn-primary" style={{marginTop:8, width:'100%', justifyContent:'center', fontSize:12}}>智能合并 8 组 →</button>
      </div>
    </div>
  </Phone>
);

/* ─────────── E · 文件批量导入 ─────────── */
const Lib_BulkImport = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:14}}>
      <ScreenHeader title="批量导入" sub="正在解析 mock_2024.pdf" back/>

      <div className="wf-box-thick" style={{padding:12, marginBottom:10, background:'#fff8e6'}}>
        <div className="wf-row" style={{marginBottom:6}}>
          <span style={{fontSize:20}}>📄</span>
          <div style={{flex:1}}>
            <div className="wf-body" style={{fontWeight:700}}>软考_模拟题_2024.pdf</div>
            <div className="wf-tiny">12 MB · 上传完成</div>
          </div>
        </div>
        <div className="wf-prog"><span style={{width:'72%'}}></span></div>
        <div className="wf-row" style={{marginTop:4}}>
          <span className="wf-tiny">已识别 86 / 120 题</span>
          <span className="wf-tiny" style={{marginLeft:'auto', color:'#d94a3a'}}>3 题需要确认</span>
        </div>
      </div>

      <div className="wf-h3" style={{marginBottom:6}}>识别预览 · 抽查一下</div>
      {[
        {ok:true, t:'第 1 题 · 数据库索引中, B+ 树相比 B 树的优势是...'},
        {ok:true, t:'第 2 题 · 下列哪一项不属于 RESTful API 的特征?'},
        {ok:false, t:'第 14 题 · [图片识别失败] 选项不全, 请手动补充'},
        {ok:true, t:'第 15 题 · 微服务的服务治理通常包括以下哪些?'},
      ].map((q,i)=>(
        <div key={i} className="wf-box-soft" style={{padding:'8px 10px', marginBottom:4, display:'flex', gap:8, alignItems:'center', borderColor:q.ok?'#1a1a1a':'#d94a3a', borderWidth:q.ok?1.5:2}}>
          <span style={{color:q.ok?'#6ba368':'#d94a3a', fontWeight:700}}>{q.ok?'✓':'!'}</span>
          <span className="wf-body" style={{flex:1, fontSize:13, lineHeight:1.3}}>{q.t}</span>
          <span className="wf-tiny">›</span>
        </div>
      ))}

      <div className="wf-h3" style={{marginTop:10, marginBottom:6}}>导入设置</div>
      <div className="wf-box-soft" style={{padding:10, marginBottom:14}}>
        <div className="wf-row" style={{padding:'6px 0'}}>
          <div className="wf-body" style={{flex:1}}>归类到</div>
          <span className="wf-tiny">软考 · 模拟题 ›</span>
        </div>
        <div className="wf-row" style={{padding:'6px 0', borderTop:'1px dashed #ccc'}}>
          <div className="wf-body" style={{flex:1}}>遇到重复题</div>
          <span className="wf-tiny">提醒我</span>
        </div>
        <div className="wf-row" style={{padding:'6px 0', borderTop:'1px dashed #ccc'}}>
          <div className="wf-body" style={{flex:1}}>跳过失败的</div>
          <div className="wf-check on"></div>
        </div>
      </div>

      <div className="wf-row" style={{gap:8}}>
        <button className="wf-btn" style={{flex:1, justifyContent:'center'}}>取消</button>
        <button className="wf-btn wf-btn-primary" style={{flex:1.4, justifyContent:'center'}}>导入 117 题 →</button>
      </div>
    </div>
  </Phone>
);

Object.assign(window, { Lib_Manage, Lib_AddSheet, Lib_OcrEdit, Lib_Dup, Lib_BulkImport });
