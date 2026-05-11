/* 我的购买 / 上架审核 / 作者收益 / 质量评估细则 */

/* ─────────── 我的购买 ─────────── */
const Me_Purchases = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:14}}>
      <ScreenHeader title="我的购买" sub="已买 12 项 · 总计 ¥186" back/>

      <div className="wf-row" style={{gap:6, marginBottom:10}}>
        <span className="wf-chip wf-chip-fill">全部 12</span>
        <span className="wf-chip">使用中 5</span>
        <span className="wf-chip">未激活 2</span>
        <span className="wf-chip">可退款 1</span>
      </div>

      {[
        {t:'软考·高项 三遍错题本', a:'王老师', p:'¥19.9', d:'2026-04-12', s:'使用中', sc:'#d4e8d0', refund:false},
        {t:'CFA 一级 · 公式速记', a:'Anna', p:'¥9.9', d:'2026-03-28', s:'已归档', sc:'#f0eee5', refund:false},
        {t:'分布式系统笔记', a:'Anna', p:'¥9.9', d:'2026-05-01', s:'7 日内可退', sc:'#f4d4d0', refund:true},
        {t:'雅思口语 part 2', a:'Tom', p:'免费', d:'2026-02-10', s:'使用中', sc:'#d4e8d0', refund:false},
      ].map((it,i)=>(
        <div key={i} className="wf-box-soft" style={{padding:10, marginBottom:6}}>
          <div className="wf-row" style={{gap:10}}>
            <div className="wf-img" style={{width:48, height:48, flexShrink:0}}></div>
            <div style={{flex:1, minWidth:0}}>
              <div className="wf-body" style={{fontWeight:700, lineHeight:1.3}}>{it.t}</div>
              <div className="wf-tiny">{it.a} · {it.d}</div>
              <div className="wf-row" style={{marginTop:4, gap:6}}>
                <span className="wf-chip" style={{fontSize:10, padding:'1px 6px', background:it.sc}}>{it.s}</span>
                <span className="wf-tiny" style={{marginLeft:'auto', fontWeight:700, color:it.p==='免费'?'#6ba368':'#d94a3a'}}>{it.p}</span>
              </div>
            </div>
          </div>
          {it.refund && (
            <div className="wf-row" style={{marginTop:8, gap:6, paddingTop:8, borderTop:'1px dashed #ccc'}}>
              <button className="wf-btn" style={{padding:'4px 10px', fontSize:11}}>申请退款</button>
              <button className="wf-btn" style={{padding:'4px 10px', fontSize:11}}>评价</button>
              <span className="wf-tiny" style={{marginLeft:'auto'}}>剩 5 天</span>
            </div>
          )}
        </div>
      ))}

      <div className="wf-h3" style={{marginTop:12, marginBottom:6}}>订阅</div>
      <div className="wf-box-thick" style={{padding:12, background:'#fff8e6'}}>
        <div className="wf-row">
          <span style={{fontSize:22}}>💎</span>
          <div style={{flex:1}}>
            <div className="wf-body" style={{fontWeight:700}}>Pro 会员 · 月付</div>
            <div className="wf-tiny">下次扣款 2026-06-07 · ¥30</div>
          </div>
          <button className="wf-btn" style={{padding:'4px 10px', fontSize:11}}>管理</button>
        </div>
      </div>
    </div>
  </Phone>
);

/* ─────────── 上架审核状态 ─────────── */
const Author_Review = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:14}}>
      <ScreenHeader title="我的上架" sub="3 件商品 · 1 待审 · 1 驳回" back/>

      <div className="wf-row" style={{gap:6, marginBottom:10}}>
        <span className="wf-chip wf-chip-fill">全部</span>
        <span className="wf-chip">已通过 1</span>
        <span className="wf-chip">待审核 1</span>
        <span className="wf-chip" style={{background:'#f4d4d0'}}>驳回 1</span>
      </div>

      {/* 已通过 */}
      <div className="wf-box-soft" style={{padding:10, marginBottom:8}}>
        <div className="wf-row" style={{gap:10}}>
          <div className="wf-img" style={{width:48, height:48, flexShrink:0}}></div>
          <div style={{flex:1}}>
            <div className="wf-body" style={{fontWeight:700}}>软考·高项 三遍错题本</div>
            <div className="wf-row" style={{gap:6, marginTop:2}}>
              <span className="wf-chip wf-chip-green" style={{fontSize:10, padding:'1px 6px'}}>✓ 已上架</span>
              <span className="wf-tiny">¥19.9 · 2.3k 销量</span>
            </div>
          </div>
        </div>
      </div>

      {/* 待审核 */}
      <div className="wf-box-soft" style={{padding:10, marginBottom:8, background:'#fff8e6'}}>
        <div className="wf-row" style={{gap:10}}>
          <div className="wf-img" style={{width:48, height:48, flexShrink:0}}></div>
          <div style={{flex:1}}>
            <div className="wf-body" style={{fontWeight:700}}>系统设计 · 100 道大题</div>
            <div className="wf-row" style={{gap:6, marginTop:2}}>
              <span className="wf-chip wf-chip-fill" style={{fontSize:10, padding:'1px 6px'}}>⏳ 待审核</span>
              <span className="wf-tiny">提交 2 小时前</span>
            </div>
          </div>
        </div>
        <div className="wf-prog" style={{marginTop:8}}><span style={{width:'40%', background:'#f4c542'}}></span></div>
        <div className="wf-tiny" style={{marginTop:4}}>预计 24h 内出结果 · 内容审核中</div>
      </div>

      {/* 驳回 */}
      <div className="wf-box-thick" style={{padding:10, marginBottom:8, background:'#fff', borderColor:'#d94a3a'}}>
        <div className="wf-row" style={{gap:10}}>
          <div className="wf-img" style={{width:48, height:48, flexShrink:0}}></div>
          <div style={{flex:1}}>
            <div className="wf-body" style={{fontWeight:700}}>考研政治背诵宝典</div>
            <div className="wf-row" style={{gap:6, marginTop:2}}>
              <span className="wf-chip" style={{fontSize:10, padding:'1px 6px', background:'#f4d4d0', fontWeight:700}}>✕ 驳回</span>
              <span className="wf-tiny">3 天前</span>
            </div>
          </div>
        </div>
        <div className="wf-box-dashed" style={{padding:8, marginTop:8, background:'#fff8e6'}}>
          <div className="wf-tiny" style={{fontWeight:700, color:'#d94a3a'}}>原因 · 疑似版权问题</div>
          <div className="wf-tiny" style={{marginTop:2, lineHeight:1.5}}>第 3-5 章直接复用了《xx 出版社》原文, 请删除或大幅改写后重新提交.</div>
          <div className="wf-row" style={{marginTop:6, gap:6}}>
            <button className="wf-btn" style={{padding:'3px 8px', fontSize:11}}>申诉</button>
            <button className="wf-btn wf-btn-primary" style={{padding:'3px 8px', fontSize:11}}>修改重提</button>
          </div>
        </div>
      </div>
    </div>
  </Phone>
);

/* ─────────── 作者收益后台 ─────────── */
const Author_Earnings = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:14}}>
      <ScreenHeader title="收益" sub="作者后台" back right={<span className="wf-tiny">详情 ›</span>}/>

      <div className="wf-box-thick" style={{padding:14, marginBottom:10, background:'#fff8e6'}}>
        <div className="wf-tiny">可提现 (扣除 10% 平台费)</div>
        <div className="wf-h1" style={{fontSize:38, color:'#d94a3a', margin:'2px 0'}}>¥ 4,127.30</div>
        <button className="wf-btn wf-btn-primary" style={{padding:'6px 14px', fontSize:13, marginTop:6}}>提现到微信</button>
      </div>

      <div className="wf-row" style={{gap:6, marginBottom:10}}>
        <div className="wf-box-soft" style={{flex:1, padding:10, textAlign:'center'}}>
          <div className="wf-tiny">本月销量</div>
          <div className="wf-h2" style={{fontSize:22}}>342</div>
        </div>
        <div className="wf-box-soft" style={{flex:1, padding:10, textAlign:'center'}}>
          <div className="wf-tiny">本月收入</div>
          <div className="wf-h2" style={{fontSize:22}}>¥ 681</div>
        </div>
        <div className="wf-box-soft" style={{flex:1, padding:10, textAlign:'center'}}>
          <div className="wf-tiny">退款</div>
          <div className="wf-h2" style={{fontSize:22, color:'#d94a3a'}}>3</div>
        </div>
      </div>

      <div className="wf-h3" style={{marginBottom:6}}>近 30 天趋势</div>
      <div className="wf-box-soft" style={{padding:10, marginBottom:10}}>
        <svg viewBox="0 0 280 80" style={{width:'100%', height:80}}>
          <polyline points="0,60 20,55 40,40 60,45 80,30 100,35 120,20 140,25 160,15 180,28 200,18 220,22 240,12 260,18 280,8" fill="none" stroke="#d94a3a" strokeWidth="2"/>
          <line x1="0" y1="78" x2="280" y2="78" stroke="#1a1a1a" strokeWidth="1"/>
        </svg>
        <div className="wf-row" style={{justifyContent:'space-between'}}>
          <span className="wf-tiny">4/8</span><span className="wf-tiny">4/22</span><span className="wf-tiny">5/7</span>
        </div>
      </div>

      <div className="wf-h3" style={{marginBottom:6}}>商品销量榜</div>
      {[
        ['软考·高项 三遍错题本','¥19.9 × 286','¥5,693'],
        ['系统设计 100 题','¥29.9 × 41','¥1,225'],
        ['面试速通笔记','免费 × 1.2k',''],
      ].map(([t,m,r],i)=>(
        <div key={i} className="wf-box-soft" style={{padding:'8px 10px', marginBottom:4, display:'flex', alignItems:'center', gap:8}}>
          <div className="wf-h3" style={{width:18, color:i===0?'#d94a3a':'#888'}}>{i+1}</div>
          <div style={{flex:1, minWidth:0}}>
            <div className="wf-body" style={{lineHeight:1.3}}>{t}</div>
            <div className="wf-tiny">{m}</div>
          </div>
          <div className="wf-body" style={{fontWeight:700, color:'#d94a3a'}}>{r}</div>
        </div>
      ))}

      <div className="wf-tiny" style={{marginTop:10, textAlign:'center'}}>下次结算 · 5月 31日</div>
    </div>
  </Phone>
);

/* ─────────── 待采购清单 · 质量评估详情 ─────────── */
const Source_Quality = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:14}}>
      <ScreenHeader title="质量评估" sub="为什么这条标了 ⚠️" back/>

      <div className="wf-box-thick" style={{padding:12, marginBottom:12, background:'#fff'}}>
        <div className="wf-body" style={{fontWeight:700, marginBottom:2}}>软考论文模板 30 篇</div>
        <div className="wf-tiny">第三方网盘 · 待校验</div>
      </div>

      <div className="wf-h3" style={{marginBottom:6}}>评分维度</div>
      <div className="wf-box-soft" style={{padding:12, marginBottom:10}}>
        {[
          ['来源可信度','⚠ 中', '匿名网盘, 无法溯源', 40, '#d94a3a'],
          ['内容时效性','✓ 高', '2024 年最新版', 90, '#6ba368'],
          ['版权风险','⚠ 待查', '可能含付费教材片段', 35, '#d94a3a'],
          ['用户反馈','– 无', '尚无人采购', 50, '#888'],
          ['AI 内容判定','✓ 通过', '原创度 78%', 78, '#6ba368'],
        ].map(([d,s,desc,v,c],i)=>(
          <div key={i} style={{marginBottom:i<4?10:0}}>
            <div className="wf-row">
              <span className="wf-body" style={{flex:1, fontWeight:700}}>{d}</span>
              <span className="wf-tiny" style={{fontWeight:700, color:c}}>{s}</span>
            </div>
            <div className="wf-prog" style={{marginTop:4}}><span style={{width:`${v}%`, background:c}}></span></div>
            <div className="wf-tiny" style={{marginTop:2}}>{desc}</div>
          </div>
        ))}
      </div>

      <div className="wf-h3" style={{marginBottom:6}}>综合评级</div>
      <div className="wf-box-thick" style={{padding:14, marginBottom:10, background:'#fff8e6'}}>
        <div className="wf-row" style={{alignItems:'baseline'}}>
          <div className="wf-h1" style={{fontSize:36, color:'#d94a3a'}}>C</div>
          <div className="wf-tiny" style={{marginLeft:8, flex:1}}>4 档评级 (A / B / C / 不推荐)</div>
        </div>
        <div className="wf-tiny" style={{marginTop:6, lineHeight:1.5}}>
          建议: 谨慎使用. 优先选择 <span className="wf-hl">市场内</span> 或 <span className="wf-hl">公开官方</span> 来源.
        </div>
      </div>

      <div className="wf-h3" style={{marginBottom:6}}>更安全的替代</div>
      {[
        ['软考·高项 论文范文 (官方)','公开 · 教育部','A'],
        ['王老师·论文模板 (¥9.9)','市场 · ⭐4.8','A'],
      ].map(([t,s,g],i)=>(
        <div key={i} className="wf-box-soft" style={{padding:10, marginBottom:6, display:'flex', alignItems:'center', gap:10}}>
          <div style={{width:30, height:30, border:'1.5px solid #6ba368', borderRadius:6, background:'#d4e8d0', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Kalam', fontWeight:700, color:'#6ba368'}}>{g}</div>
          <div style={{flex:1}}>
            <div className="wf-body" style={{fontWeight:700, lineHeight:1.3}}>{t}</div>
            <div className="wf-tiny">{s}</div>
          </div>
          <button className="wf-btn" style={{padding:'4px 10px', fontSize:11}}>替换</button>
        </div>
      ))}
    </div>
  </Phone>
);

Object.assign(window, { Me_Purchases, Author_Review, Author_Earnings, Source_Quality });
