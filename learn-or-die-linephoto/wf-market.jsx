/* 新增: 归档上传 / 市场 / 题库来源采集 */

/* ─────────── 归档 v2 · 带图片上传 ─────────── */
const PlanD2_Archive = () => (
  <Phone>
    <div className="wf-screen-content">
      <ScreenHeader title="归档这个档案" sub="加点凭证, 后人也好参考" back/>

      <div className="wf-box-thick" style={{padding:12, marginBottom:12, background:'#fff8e6'}}>
        <div className="wf-h3">软考·高级架构师</div>
        <div className="wf-tiny">用时 89 天 · 142 个任务</div>
      </div>

      <div className="wf-h3">最终结果</div>
      <div className="wf-row" style={{gap:6, flexWrap:'wrap', marginBottom:10}}>
        <span className="wf-chip wf-chip-fill" style={{fontWeight:700}}>🎯 通过</span>
        <span className="wf-chip">未通过</span>
        <span className="wf-chip">放弃了</span>
      </div>

      <div className="wf-h3">分数 / 成果</div>
      <div className="wf-input" style={{marginBottom:10}}>三科: 52 / 48 / 51</div>

      <div className="wf-h3">凭证 / 照片 <span className="wf-tiny">最多 6 张</span></div>
      <div className="wf-tiny" style={{marginBottom:6}}>成绩单, 证书, 笔记封面, 任何想留念的</div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:10}}>
        <div className="wf-img" style={{aspectRatio:'1'}}></div>
        <div className="wf-img" style={{aspectRatio:'1'}}></div>
        <div className="wf-box-dashed" style={{aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:2}}>
          <span style={{fontSize:22}}>＋</span>
          <span className="wf-tiny">拍照 / 相册</span>
        </div>
      </div>

      <div className="wf-h3">一句话感想</div>
      <div className="wf-input" style={{marginBottom:10, height:60, color:'#888'}}>分享给社区...</div>

      <div className="wf-row" style={{gap:8, marginBottom:6}}>
        <div className="wf-check on"></div>
        <div className="wf-body">同步到广场上岸墙</div>
      </div>
      <div className="wf-row" style={{gap:8, marginBottom:14}}>
        <div className="wf-check"></div>
        <div className="wf-body">把笔记 / 错题打包上架到 <span className="wf-hl">市场</span></div>
      </div>

      <div className="wf-row" style={{gap:8}}>
        <button className="wf-btn" style={{flex:1, justifyContent:'center'}}>取消</button>
        <button className="wf-btn wf-btn-primary" style={{flex:1.4, justifyContent:'center'}}>归档 📦</button>
      </div>
    </div>
  </Phone>
);

/* ─────────── 市场首页 ─────────── */
const Market_Home = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80}}>
      <div style={{display:'flex', alignItems:'center', gap:8, padding:'4px 0 8px'}}>
        <div className="wf-h1" style={{flex:1}}>市场</div>
        <span className="wf-tiny">我的购买</span>
        <span style={{padding:6, border:'1.5px solid #1a1a1a', borderRadius:8}}>{Sketch.search}</span>
      </div>
      <div className="wf-tiny" style={{marginBottom:10}}>同学的错题本 · 笔记 · 自制题库</div>

      <div className="wf-row" style={{gap:6, marginBottom:10, overflowX:'hidden'}}>
        {['推荐','错题本','笔记','题库','免费','软考','CFA'].map((t,i)=>(
          <span key={i} className={`wf-chip ${i===0?'wf-chip-fill':''}`} style={{flexShrink:0, fontWeight:i===0?700:400}}>{t}</span>
        ))}
      </div>

      {/* spotlight card */}
      <div className="wf-box-thick" style={{padding:0, marginBottom:10, overflow:'hidden'}}>
        <div className="wf-img" style={{height:90, borderRadius:'8px 8px 0 0', borderWidth:0, borderBottomWidth:'1.5px'}}></div>
        <div style={{padding:12}}>
          <div className="wf-row" style={{marginBottom:4}}>
            <span className="wf-chip wf-chip-fill" style={{fontSize:10, padding:'1px 6px'}}>🔥 本周热门</span>
          </div>
          <div className="wf-h3" style={{fontSize:16}}>软考·高项 三遍错题本 (2024 版)</div>
          <div className="wf-row" style={{marginTop:6, gap:8}}>
            <Avatar label="王" color="#d4e4f4" size={26}/>
            <span className="wf-tiny" style={{flex:1}}>王老师 · 12k 关注</span>
            <span className="wf-tiny">⭐ 4.9 · 2.3k 购买</span>
          </div>
          <div className="wf-row" style={{marginTop:8}}>
            <span className="wf-h2" style={{fontSize:22, color:'#d94a3a', flex:1}}>¥ 19.9</span>
            <button className="wf-btn wf-btn-primary" style={{padding:'5px 14px', fontSize:13}}>购买</button>
          </div>
        </div>
      </div>

      {/* grid items */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
        {[
          ['CFA 一级 · 公式速记','Anna','¥ 9.9','⭐ 4.8','#fff8e6'],
          ['雅思口语 part 2 · 50 题','Tom','免费','⭐ 4.7','#e6f4ff'],
          ['考研 408 · 数据结构','老张','¥ 29','⭐ 5.0','#e6ffe6'],
          ['PMP 思维导图','刘姐','¥ 6.6','⭐ 4.6','#f0e6ff'],
        ].map(([t,a,p,r,c],i)=>(
          <div key={i} className="wf-box-soft" style={{padding:0, overflow:'hidden'}}>
            <div className="wf-img" style={{height:54, borderWidth:0, borderRadius:0, background:c}}></div>
            <div style={{padding:8}}>
              <div className="wf-body" style={{fontWeight:700, fontSize:13, lineHeight:1.2}}>{t}</div>
              <div className="wf-tiny" style={{marginTop:2}}>{a}</div>
              <div className="wf-row" style={{marginTop:4}}>
                <span className="wf-tiny" style={{flex:1, fontWeight:700, color: p==='免费'?'#6ba368':'#d94a3a'}}>{p}</span>
                <span className="wf-tiny">{r}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    <TabBar active="market"/>
  </Phone>
);

/* ─────────── 市场详情页 (商品) ─────────── */
const Market_Detail = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:90}}>
      <div className="wf-row" style={{padding:'4px 0 6px'}}>
        <span className="wf-tiny">‹ 返回</span>
        <span className="wf-tiny" style={{marginLeft:'auto'}}>分享 ⇪</span>
      </div>
      <div className="wf-img" style={{height:140, marginBottom:10}}></div>

      <div className="wf-h2" style={{fontSize:20, marginBottom:4}}>软考·高项 三遍错题本 (2024)</div>
      <div className="wf-row" style={{marginBottom:8}}>
        <span className="wf-chip wf-chip-fill" style={{fontSize:10, padding:'1px 6px'}}>错题本</span>
        <span className="wf-chip" style={{fontSize:10, padding:'1px 6px'}}>软考</span>
        <span className="wf-tiny" style={{marginLeft:'auto'}}>⭐ 4.9 · 2.3k</span>
      </div>

      <div className="wf-box-soft" style={{padding:10, marginBottom:10, display:'flex', gap:10, alignItems:'center'}}>
        <Avatar label="王" color="#d4e4f4" size={36}/>
        <div style={{flex:1}}>
          <div className="wf-body" style={{fontWeight:700}}>王老师</div>
          <div className="wf-tiny">软考·架构师 · 90 天上岸</div>
        </div>
        <button className="wf-btn" style={{padding:'4px 10px', fontSize:12}}>关注</button>
      </div>

      <div className="wf-h3" style={{marginBottom:6}}>包含什么</div>
      <div className="wf-box-soft" style={{padding:10, marginBottom:10}}>
        <div className="wf-tiny" style={{lineHeight:1.6}}>
          📋 487 道精选错题 (按知识点分类)<br/>
          📝 68 篇手写解析 (PDF / 可在 App 直接刷)<br/>
          🎯 自动同步到你的 题库 + AI 陪学<br/>
          🔄 终身更新, 加入新错题
        </div>
      </div>

      <div className="wf-h3" style={{marginBottom:6}}>预览 · 3 / 487</div>
      <div className="wf-row" style={{gap:6, marginBottom:14, overflowX:'hidden'}}>
        <div className="wf-img" style={{width:90, height:120, flexShrink:0}}></div>
        <div className="wf-img" style={{width:90, height:120, flexShrink:0}}></div>
        <div className="wf-img" style={{width:90, height:120, flexShrink:0}}></div>
      </div>

      <div className="wf-tiny">2.3k 人买过 · 87% 推荐 · 1 周内不满意可退</div>
    </div>
    {/* sticky buy bar */}
    <div style={{position:'absolute', left:14, right:14, bottom:14, height:54, background:'#fff', border:'2px solid #1a1a1a', borderRadius:30, display:'flex', alignItems:'center', padding:'0 14px', gap:10, boxShadow:'2px 2px 0 #1a1a1a'}}>
      <div style={{flex:1}}>
        <div className="wf-tiny">价格</div>
        <div className="wf-h2" style={{fontSize:22, color:'#d94a3a', lineHeight:1}}>¥ 19.9</div>
      </div>
      <button className="wf-btn" style={{padding:'8px 12px', fontSize:13}}>试读</button>
      <button className="wf-btn wf-btn-primary" style={{padding:'8px 16px'}}>立即购买</button>
    </div>
  </Phone>
);

/* ─────────── 卖家上架页 ─────────── */
const Market_Publish = () => (
  <Phone>
    <div className="wf-screen-content">
      <ScreenHeader title="上架到市场" sub="把这次备考的资料分享出去" back/>

      <div className="wf-h3">类型</div>
      <div className="wf-row" style={{gap:6, flexWrap:'wrap', marginBottom:10}}>
        <span className="wf-chip wf-chip-fill">错题本</span>
        <span className="wf-chip">笔记</span>
        <span className="wf-chip">自制题库</span>
        <span className="wf-chip">学习计划模板</span>
      </div>

      <div className="wf-h3">标题</div>
      <div className="wf-input" style={{marginBottom:10}}>软考·高项 三遍错题本 (2024)</div>

      <div className="wf-h3">封面 + 预览图</div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:10}}>
        <div className="wf-img" style={{aspectRatio:'1'}}></div>
        <div className="wf-box-dashed" style={{aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <span style={{fontSize:22}}>＋</span>
        </div>
        <div></div>
      </div>

      <div className="wf-h3">定价 · 你说了算</div>
      <div className="wf-box-soft" style={{padding:12, marginBottom:14, background:'#fff8e6'}}>
        <div className="wf-row" style={{gap:8, marginBottom:10}}>
          <span className="wf-chip">🆓 免费</span>
          <span className="wf-chip wf-chip-fill" style={{fontWeight:700}}>💰 付费</span>
          <span className="wf-chip">捐赠 (¥1+)</span>
        </div>
        <div className="wf-row" style={{gap:8, alignItems:'center'}}>
          <div className="wf-input" style={{flex:1, fontWeight:700, fontSize:18, color:'#d94a3a'}}>¥ 19.9</div>
          <div className="wf-tiny">推荐 ¥9-29</div>
        </div>
        <div className="wf-tiny" style={{marginTop:8}}>※ 平台抽成 10% · 7 日内可退</div>
      </div>

      <div className="wf-row" style={{gap:8, marginBottom:6}}>
        <div className="wf-check on"></div>
        <div className="wf-body">遵守 <span className="wf-underline">《创作者条款》</span> (无版权问题)</div>
      </div>

      <button className="wf-btn wf-btn-primary" style={{width:'100%', justifyContent:'center'}}>提交审核</button>
    </div>
  </Phone>
);

/* ─────────── 资料来源选择 (建档后立刻问) ─────────── */
const Source_Choose = () => (
  <Phone>
    <div className="wf-screen-content">
      <ScreenHeader title="资料从哪来?" sub="软考·高级架构师 已建档 · 选一种或多种" />

      <div className="wf-box-thick" style={{padding:14, marginBottom:10, background:'#fff8e6'}}>
        <div className="wf-row" style={{marginBottom:6}}>
          <div style={{width:34, height:34, border:'1.5px solid #1a1a1a', borderRadius:8, background:'#d4e4f4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18}}>📤</div>
          <div className="wf-h3" style={{flex:1}}>① 我自己上传</div>
        </div>
        <div className="wf-tiny" style={{marginBottom:8}}>教材 PDF · 历年真题 · 笔记图片. 在你的设备里直接挑.</div>
        <button className="wf-btn" style={{padding:'5px 10px', fontSize:12}}>选文件 / 拍照</button>
      </div>

      <div className="wf-box-thick" style={{padding:14, marginBottom:10, background:'#fff8e6'}}>
        <div className="wf-row" style={{marginBottom:6}}>
          <div style={{width:34, height:34, border:'1.5px solid #1a1a1a', borderRadius:8, background:'#f4c542', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18}}>✨</div>
          <div className="wf-h3" style={{flex:1}}>② AI 帮我搜</div>
          <span className="wf-chip wf-chip-fill" style={{fontSize:10, padding:'1px 6px'}}>推荐</span>
        </div>
        <div className="wf-tiny" style={{marginBottom:8}}>从市场 + 全网公开资源搜罗, 给你一份 <span className="wf-hl">待选清单</span> 自己挑.</div>
        <button className="wf-btn wf-btn-primary" style={{padding:'5px 10px', fontSize:12}}>开始搜索 →</button>
      </div>

      <div className="wf-box-thick" style={{padding:14, marginBottom:10}}>
        <div className="wf-row" style={{marginBottom:6}}>
          <div style={{width:34, height:34, border:'1.5px solid #1a1a1a', borderRadius:8, background:'#d4e8d0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18}}>🛒</div>
          <div className="wf-h3" style={{flex:1}}>③ 去市场逛逛</div>
        </div>
        <div className="wf-tiny" style={{marginBottom:8}}>同学的错题本 / 笔记, 大佬的题库. 看好了再买.</div>
        <button className="wf-btn" style={{padding:'5px 10px', fontSize:12}}>逛市场</button>
      </div>

      <div className="wf-tiny" style={{textAlign:'center', marginTop:14}}>都不选也行 · 可以稍后再补 →</div>
    </div>
  </Phone>
);

/* ─────────── AI 搜索中 (loading) ─────────── */
const Source_Searching = () => (
  <Phone>
    <div className="wf-screen-content" style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', gap:14, paddingTop:60}}>
      <div style={{width:80, height:80, border:'2.5px solid #1a1a1a', borderRadius:24, background:'#f4c542', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, boxShadow:'4px 4px 0 #1a1a1a', transform:'rotate(-3deg)'}}>🔍</div>
      <div className="wf-h1" style={{fontSize:28}}>正在帮你搜罗...</div>
      <div className="wf-tiny" style={{maxWidth:240}}>软考·高级架构师 相关教材 · 真题 · 公开题库</div>

      <div style={{width:'100%', padding:'0 30px', marginTop:14}}>
        <div className="wf-prog" style={{height:10, marginBottom:14}}><span style={{width:'68%'}}></span></div>
        <div style={{display:'flex', flexDirection:'column', gap:6, textAlign:'left'}}>
          {[
            [true,'扫描站内市场资源 ✓ 找到 12 项'],
            [true,'扫描公开题库网站 ✓ 找到 38 项'],
            [true,'识别教材版本 ✓ 第 4 版 (2024)'],
            [false,'去重 + 评估质量 · 进行中...'],
            [false,'整理成待选清单'],
          ].map(([d,t],i)=>(
            <div key={i} className="wf-row" style={{gap:8, opacity:d?1:0.4}}>
              <span style={{fontSize:14}}>{d?'✓':'○'}</span>
              <span className="wf-body" style={{fontSize:13}}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="wf-tiny" style={{marginTop:14}}>大约还要 30 秒... 后台跑就行</div>
    </div>
  </Phone>
);

/* ─────────── 待采购清单 ─────────── */
const Source_Pending = () => (
  <Phone>
    <div className="wf-screen-content" style={{paddingBottom:80}}>
      <div className="wf-row" style={{padding:'4px 0 6px'}}>
        <span className="wf-tiny">‹ 返回</span>
        <div style={{flex:1}}></div>
        <span className="wf-tiny">全选</span>
      </div>
      <div className="wf-h1" style={{fontSize:24, marginBottom:2}}>待采购清单</div>
      <div className="wf-tiny" style={{marginBottom:10}}>找到 <span className="wf-hl">42 项</span> · 勾选你想要的, 一起入库</div>

      <div className="wf-row" style={{gap:6, marginBottom:10}}>
        <span className="wf-chip wf-chip-fill">全部 42</span>
        <span className="wf-chip">免费 18</span>
        <span className="wf-chip">付费 24</span>
        <span className="wf-chip">市场内 12</span>
      </div>

      {/* item: free, public source */}
      {[
        {title:'软考·高项 历年真题汇编 (2018-2024)', src:'公开题库 · 在线网站', tag:'免费', tagColor:'#d4e8d0', meta:'PDF · 12 MB · 540 题', checked:true, by:null},
        {title:'《系统架构设计师教程 (第 4 版)》关键章节摘录', src:'AI 整理 · 公开资料', tag:'免费', tagColor:'#d4e8d0', meta:'12 章 · 文本', checked:true, by:null},
        {title:'王老师·三遍错题本 (2024)', src:'市场 · ⭐4.9', tag:'¥19.9', tagColor:'#f4d4d0', meta:'487 题 · 解析', checked:true, by:'王老师'},
        {title:'数据库八股文 200 问', src:'公开 GitHub 仓库', tag:'免费', tagColor:'#d4e8d0', meta:'Markdown · 200 题', checked:false, by:null},
        {title:'Anna·分布式系统笔记', src:'市场 · ⭐4.8', tag:'¥9.9', tagColor:'#f4d4d0', meta:'68 页', checked:false, by:'Anna'},
        {title:'软考论文模板 30 篇', src:'第三方网盘 · 待校验', tag:'免费', tagColor:'#fff8e6', meta:'⚠ 内容存疑', checked:false, by:null},
      ].map((it,i)=>(
        <div key={i} className="wf-box-soft" style={{padding:10, marginBottom:6, display:'flex', gap:10, background: it.checked?'#fff8e6':'#fff'}}>
          <div className={`wf-check ${it.checked?'on':''}`} style={{marginTop:2}}></div>
          <div style={{flex:1, minWidth:0}}>
            <div className="wf-body" style={{fontWeight:700, lineHeight:1.3}}>{it.title}</div>
            <div className="wf-tiny" style={{marginTop:2}}>{it.src} · {it.meta}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <span className="wf-chip" style={{fontSize:10, padding:'1px 6px', background:it.tagColor, fontWeight:700}}>{it.tag}</span>
          </div>
        </div>
      ))}
    </div>
    {/* sticky bottom */}
    <div style={{position:'absolute', left:14, right:14, bottom:14, height:54, background:'#fff', border:'2px solid #1a1a1a', borderRadius:30, display:'flex', alignItems:'center', padding:'0 14px', gap:10, boxShadow:'2px 2px 0 #1a1a1a'}}>
      <div style={{flex:1}}>
        <div className="wf-tiny">已选 3 项 · 总计</div>
        <div className="wf-h2" style={{fontSize:20, color:'#d94a3a', lineHeight:1}}>¥ 19.9 <span className="wf-tiny" style={{color:'#888', fontWeight:400}}>+ 2 免费</span></div>
      </div>
      <button className="wf-btn wf-btn-primary" style={{padding:'8px 16px'}}>结算 + 入库</button>
    </div>
  </Phone>
);

Object.assign(window, {
  PlanD2_Archive, Market_Home, Market_Detail, Market_Publish,
  Source_Choose, Source_Searching, Source_Pending,
});
