/* Plaza (广场) — discovery feed of mentors, study journeys, dynamics */

/* A · Card feed (mixed content) */
const PlazaA_Feed = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80}}>
      <div style={{display:'flex', alignItems:'center', gap:8, padding:'4px 0 8px'}}>
        <div className="wf-h1" style={{flex:1}}>广场</div>
        <span style={{padding:6, border:'1.5px solid #1a1a1a', borderRadius:8}}>{Sketch.search}</span>
        <span style={{padding:6, border:'1.5px solid #1a1a1a', borderRadius:8}}>{Sketch.bell}</span>
      </div>
      <div className="wf-row" style={{gap:6, marginBottom:10, overflowX:'hidden'}}>
        {['推荐','大佬','打卡','同行业','考研','CFA'].map((t,i)=>(
          <span key={i} className={`wf-chip ${i===0?'wf-chip-fill':''}`} style={{flexShrink:0, fontWeight:i===0?700:400}}>{t}</span>
        ))}
      </div>

      {/* mentor card */}
      <div className="wf-box-soft" style={{padding:12, marginBottom:10}}>
        <div className="wf-row" style={{marginBottom:8}}>
          <Avatar label="王" color="#d4e4f4"/>
          <div style={{flex:1}}>
            <div className="wf-body" style={{fontWeight:700}}>王老师 <span className="wf-chip wf-chip-fill" style={{fontSize:10, padding:'1px 6px', marginLeft:4}}>大佬</span></div>
            <div className="wf-tiny">软考·高级 · 985 高校讲师 · 12k 关注</div>
          </div>
          <button className="wf-btn" style={{padding:'4px 10px', fontSize:12}}>+ 关注</button>
        </div>
        <div className="wf-body" style={{marginBottom:8}}>"花了 90 天拿下高项, 这是我的完整复盘 + 计划模板, 拿走不谢 →"</div>
        <div className="wf-img" style={{height:120, marginBottom:8}}></div>
        <div className="wf-row" style={{justifyContent:'space-between'}}>
          <span className="wf-tiny">❤️ 1.2k · 💬 84 · 📥 收藏 326</span>
          <span className="wf-tiny wf-underline">fork 计划</span>
        </div>
      </div>

      {/* dynamic / 打卡 card */}
      <div className="wf-box-soft" style={{padding:12, marginBottom:10}}>
        <div className="wf-row" style={{marginBottom:6}}>
          <Avatar label="L" color="#d4e8d0" size={32}/>
          <div style={{flex:1}}>
            <div className="wf-body" style={{fontWeight:700}}>Lily · 字节 SDE</div>
            <div className="wf-tiny">2 小时前 · 今天 day 47 / 90</div>
          </div>
          <span className="wf-chip wf-chip-green">连续 47 天 🔥</span>
        </div>
        <div className="wf-body">"刷完了 LC top 75 的动规专题, 头是真的大... 但好像有点感觉了 ✓"</div>
      </div>

      {/* journey result card */}
      <div className="wf-box-soft wf-stack" style={{padding:12, marginBottom:14, background:'#fff8e6'}}>
        <div className="wf-row" style={{marginBottom:4}}>
          <span className="wf-chip wf-chip-fill" style={{fontWeight:700}}>🎯 上岸啦</span>
          <span className="wf-tiny" style={{marginLeft:'auto'}}>3 天前</span>
        </div>
        <div className="wf-body" style={{fontWeight:700, marginTop:4}}>Tom · 雅思 7.5 · 用时 64 天</div>
        <div className="wf-tiny" style={{marginTop:2}}>查看完整学习档案 + 时间表 →</div>
      </div>
    </div>
    <TabBar active="plaza"/>
  </Phone>
);

/* B · Mentor-first (vertical list of "大拿") */
const PlazaB_Mentors = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80}}>
      <ScreenHeader title="大拿" sub="同行业的人都在跟谁学" right={<span style={{padding:6, border:'1.5px solid #1a1a1a', borderRadius:8}}>{Sketch.search}</span>}/>

      <div className="wf-row" style={{gap:6, marginBottom:10, overflowX:'hidden'}}>
        {['全部','互联网','金融','教育','医学'].map((t,i)=>(
          <span key={i} className={`wf-chip ${i===1?'wf-chip-fill':''}`} style={{flexShrink:0}}>{t}</span>
        ))}
      </div>

      {[
        ['王老师','软考·架构师','12k', '#d4e4f4', '90 天拿下高项'],
        ['Anna','CFA · 三级','8.4k','#f4d4d0','打工人 · 1 年三级通关'],
        ['老张','考研·408','21k','#d4e8d0','二战 414 分上岸 985'],
        ['Mike','AWS·SAP','5.2k','#e8d8f0','字节 → AWS Hero'],
      ].map(([n,t,f,c,d],i)=>(
        <div key={i} className="wf-box-soft" style={{padding:10, marginBottom:8, display:'flex', gap:10, alignItems:'center'}}>
          <Avatar label={n[0]} color={c} size={42}/>
          <div style={{flex:1}}>
            <div className="wf-body" style={{fontWeight:700}}>{n}</div>
            <div className="wf-tiny">{t} · {f} 关注</div>
            <div className="wf-tiny" style={{color:'#d94a3a', marginTop:2}}>"{d}"</div>
          </div>
          <button className="wf-btn" style={{padding:'4px 10px', fontSize:12}}>关注</button>
        </div>
      ))}
    </div>
    <TabBar active="plaza"/>
  </Phone>
);

/* C · Two-column journey wall */
const PlazaC_Wall = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80}}>
      <div className="wf-h1" style={{padding:'4px 0 6px'}}>上岸墙</div>
      <div className="wf-tiny" style={{marginBottom:10}}>大家的学习历程 + 成果</div>

      <div className="wf-row" style={{gap:6, marginBottom:10, overflowX:'hidden'}}>
        {['🔥 热门','🎯 已上岸','📚 进行中','👥 我关注的'].map((t,i)=>(
          <span key={i} className={`wf-chip ${i===1?'wf-chip-fill':''}`} style={{flexShrink:0}}>{t}</span>
        ))}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
        {[
          ['雅思 7.5','64 天','#fff8e6','Tom','#f4d4d0'],
          ['CFA 一级','127 天','#e6f4ff','Anna','#d4e4f4'],
          ['软考 高项','89 天','#e6ffe6','王老师','#d4e8d0'],
          ['考研 414','二战','#fef0e6','老张','#f4c542'],
          ['PMP','45 天','#f0e6ff','刘姐','#e8d8f0'],
          ['AWS SAP','60 天','#ffe6f0','Mike','#f4d4d0'],
        ].map(([t,d,bg,n,ac],i)=>(
          <div key={i} className="wf-box-soft" style={{padding:10, background:bg}}>
            <div className="wf-h3" style={{fontSize:14}}>{t}</div>
            <div className="wf-tiny">{d}</div>
            <div className="wf-row" style={{marginTop:8, gap:6}}>
              <Avatar label={n[0]} color={ac} size={22}/>
              <span className="wf-tiny">{n}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
    <TabBar active="plaza"/>
  </Phone>
);

Object.assign(window, { PlazaA_Feed, PlazaB_Mentors, PlazaC_Wall });
