let mode = "market";
function n(id){ return Number(document.getElementById(id).value || 0); }
function v(id){ return document.getElementById(id).value; }

function setMode(next){
  mode = next;
  document.getElementById("marketPanel").classList.toggle("hidden", mode !== "market");
  document.getElementById("stockPanel").classList.toggle("hidden", mode !== "stock");
  document.getElementById("marketModeBtn").classList.toggle("active", mode === "market");
  document.getElementById("stockModeBtn").classList.toggle("active", mode === "stock");
  document.getElementById("resultTitle").textContent = mode === "market" ? "今日大盤風險結果" : "今日個股風險結果";
  render();
}

function classify(score){
  if(score >= 70) return ["偏危險","danger"];
  if(score >= 45) return ["觀察中","watch"];
  return ["偏健康","good"];
}

function analyzeMarket(){
  const twiiPct=n("m_twiiPct"), turnover=n("m_turnover"), avg=Math.max(1,n("m_avgTurnover20"));
  const volRatio=turnover/avg;
  const otcPct=n("m_otcPct"), futChange=n("m_futChange");
  const foreign=n("m_foreignNet"), trust=n("m_trustNet"), dealer=n("m_dealerNet"), instNet=foreign+trust+dealer;
  const futureNetChange=n("m_futureNetChange");
  const marginChange=n("m_marginChange"), marginTotal=n("m_marginTotal");
  const retailPeople=n("m_retailPeopleChange"), retailRatio=n("m_retailRatioChange"), big=n("m_bigHolderChange"), heat=n("m_retailHeat");
  const k=n("m_k"), d=n("m_d"), usdtwd=n("m_usdtwd"), fxWarn=n("m_fxWarn"), aiWeight=n("m_aiWeight"), aiWeak=v("m_aiWeak");
  const instBuy=n("m_instBuy"), instSell=n("m_instSell");
  const instParticipation=Math.min(100, Math.max(0, (instBuy+instSell)/(2*Math.max(1,turnover))*100));
  const otherParticipation=Math.max(0,100-instParticipation);

  let score=0, reasons=[];
  if(volRatio>=1.5 && twiiPct<=0){score+=28; reasons.push("大盤爆量翻黑：量價背離，是高檔換手最重要警訊。");}
  else if(volRatio>=1.4 && twiiPct<0.5){score+=22; reasons.push("成交金額高於均量很多，但指數推升不足。");}
  else if(volRatio>=1.2 && twiiPct>0){score+=8; reasons.push("量增價漲，短線偏熱。");}

  if(foreign<0){score+=14; reasons.push("外資賣超，法人高檔調節風險上升。");}
  if(instNet<0){score+=10; reasons.push("三大法人合計賣超。");}
  if(futureNetChange<0){score+=10; reasons.push("外資期貨部位偏空變化，短線避險味道提高。");}
  if(marginChange>0){score+=14; reasons.push("融資餘額增加，散戶槓桿承接風險上升。");}
  if(retailPeople>0 || retailRatio>0){score+=14; reasons.push("散戶股東人數或小散戶級距上升。");}
  if(big<0){score+=16; reasons.push("千張大戶占比下降，籌碼集中度轉弱。");}
  if(otcPct<twiiPct){score+=8; reasons.push("櫃買弱於加權，中小型股承壓。");}
  if(futChange<0 && twiiPct<0){score+=8; reasons.push("台指期同步轉弱，期貨市場偏保守。");}
  if(k>80 && d>80 && k<d){score+=10; reasons.push("大盤 KD 高檔死亡交叉。");}
  else if(k>80 && d>80){score+=6; reasons.push("大盤 KD 高檔過熱。");}
  if(usdtwd>=fxWarn && aiWeight>=70){score+=8; reasons.push("弱台幣放大 AI 出口財報，但也壓縮民眾購買力。");}
  if(aiWeak==="yes"){score+=12; reasons.push("AI / 電子權值主線轉弱，台股支撐風險升高。");}
  if(heat>=8){score+=8; reasons.push("散戶熱度高，FOMO 追價風險升高。");}
  if(instParticipation>55){score+=6; reasons.push("法人交易參與率偏高，盤面受法人與外資主導。");}

  score=Math.max(0,Math.min(100,Math.round(score)));
  const [level,cls]=classify(score);
  let conclusion="大盤暫時偏健康，可觀察量能是否延續。";
  if(score>=70) conclusion="大盤高檔換手 / 出貨風險高：不追高，等待量縮、外資回補、融資降溫。";
  else if(score>=45) conclusion="大盤偏熱：可以研究，但不適合重押，收盤後要確認法人、融資與集保。";

  return {
    score,level,cls,conclusion,reasons,
    target:"加權指數 / 大盤",
    volSignal:`成交金額 ${turnover.toLocaleString()} 億，20日均量 ${avg.toLocaleString()} 億，量比 ${volRatio.toFixed(2)} 倍；加權漲跌幅 ${twiiPct.toFixed(2)}%。`,
    chipSignal:`外資 ${foreign.toLocaleString()} 億、三大法人合計 ${instNet.toLocaleString()} 億、融資增減 ${marginChange.toLocaleString()} 億。`,
    holderSignal:`散戶人數 ${retailPeople.toFixed(2)}%，小散戶 ${retailRatio.toFixed(2)}%，千張大戶 ${big.toFixed(2)}%。法人參與率估 ${instParticipation.toFixed(1)}%，其他交易估 ${otherParticipation.toFixed(1)}%。`
  };
}

function analyzeStock(){
  const pct=n("s_pct"), vol=n("s_vol"), avg=Math.max(1,n("s_avgVol")), volRatio=vol/avg;
  const foreign=n("s_foreign"), trust=n("s_trust"), dealer=n("s_dealer"), inst=foreign+trust+dealer;
  const margin=n("s_margin"), retail=n("s_retail"), big=n("s_big"), k=n("s_k"), d=n("s_d");
  let score=0, reasons=[];
  if(volRatio>=1.8 && pct<=0){score+=25; reasons.push("個股爆量翻黑，疑似高檔換手。");}
  else if(volRatio>=1.5 && pct<1){score+=18; reasons.push("個股量增但價格推升不足。");}
  if(foreign<0){score+=14; reasons.push("外資賣超。");}
  if(inst<0){score+=10; reasons.push("三大法人合計賣超。");}
  if(margin>0){score+=14; reasons.push("融資增加。");}
  if(retail>0){score+=14; reasons.push("小散戶占比增加。");}
  if(big<0){score+=18; reasons.push("千張大戶占比下降。");}
  if(k>80 && d>80 && k<d){score+=10; reasons.push("KD 高檔死亡交叉。");}
  score=Math.max(0,Math.min(100,Math.round(score)));
  const [level,cls]=classify(score);
  let conclusion=score>=70?"個股高檔換手 / 出貨風險高：避免追價。":score>=45?"個股偏熱，先觀察籌碼確認。":"個股暫時偏健康。";
  return {
    score,level,cls,conclusion,reasons,target:document.getElementById("s_code").value+" "+document.getElementById("s_name").value,
    volSignal:`量比 ${volRatio.toFixed(2)} 倍；漲跌幅 ${pct.toFixed(2)}%。`,
    chipSignal:`外資 ${foreign.toLocaleString()} 張、三大法人合計 ${inst.toLocaleString()} 張、融資 ${margin.toLocaleString()} 張。`,
    holderSignal:`小散戶 ${retail.toFixed(2)}%，千張大戶 ${big.toFixed(2)}%。`
  };
}

function getResult(){return mode==="market"?analyzeMarket():analyzeStock();}

function render(){
  const r=getResult();
  document.getElementById("riskBadge").textContent=r.level;
  document.getElementById("riskBadge").className="risk-badge "+r.cls;
  document.getElementById("scoreLine").innerHTML=`風險分數：<span class="${r.cls}">${r.score}</span> / 100　｜　${r.level}`;
  document.getElementById("meterBar").style.width=r.score+"%";
  document.getElementById("resultText").innerHTML=`
    <p><b>監控標的：</b>${r.target}</p>
    <p><b>結論：</b>${r.conclusion}</p>
    <p><b>主要原因：</b></p>
    <ul>${r.reasons.map(x=>`<li>${x}</li>`).join("") || "<li>目前未出現明顯高風險組合。</li>"}</ul>
  `;
  document.getElementById("volSignal").textContent=r.volSignal;
  document.getElementById("chipSignal").textContent=r.chipSignal;
  document.getElementById("holderSignal").textContent=r.holderSignal;
}

function saveHistory(){
  const r=getResult();
  const arr=JSON.parse(localStorage.getItem("twRiskHistoryV2")||"[]");
  arr.unshift({date:new Date().toISOString().slice(0,10),mode:mode==="market"?"大盤":"個股",target:r.target,level:r.level,score:r.score,conclusion:r.conclusion});
  localStorage.setItem("twRiskHistoryV2",JSON.stringify(arr.slice(0,100)));
  renderHistory();
}
function renderHistory(){
  const arr=JSON.parse(localStorage.getItem("twRiskHistoryV2")||"[]");
  document.querySelector("#historyTable tbody").innerHTML=arr.map(x=>`<tr><td>${x.date}</td><td>${x.mode}</td><td>${x.target}</td><td>${x.level}</td><td>${x.score}</td><td>${x.conclusion}</td></tr>`).join("");
}
document.getElementById("marketModeBtn").onclick=()=>setMode("market");
document.getElementById("stockModeBtn").onclick=()=>setMode("stock");
document.getElementById("analyzeBtn").onclick=render;
document.getElementById("saveBtn").onclick=()=>{render();saveHistory();};
document.getElementById("clearBtn").onclick=()=>{localStorage.removeItem("twRiskHistoryV2");renderHistory();};
renderHistory();render();
