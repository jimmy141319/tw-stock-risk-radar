function n(id){ return Number(document.getElementById(id).value || 0); }
function s(id){ return document.getElementById(id).value.trim(); }

function kdFromOhlc(text){
  const rows = text.trim().split(/\n+/).map(line => line.split(",").map(x => x.trim()));
  let k = 50, d = 50, j = 50;
  const data = rows.map(r => ({date:r[0], high:+r[1], low:+r[2], close:+r[3]})).filter(x => Number.isFinite(x.high+x.low+x.close));
  for(let i=0;i<data.length;i++){
    const start = Math.max(0, i-8);
    const slice = data.slice(start, i+1);
    const hh = Math.max(...slice.map(x=>x.high));
    const ll = Math.min(...slice.map(x=>x.low));
    const rsv = hh === ll ? 50 : (data[i].close - ll) / (hh - ll) * 100;
    k = k * 2/3 + rsv * 1/3;
    d = d * 2/3 + k * 1/3;
    j = 3*k - 2*d;
  }
  return {k,d,j};
}

function scoreRisk(){
  const closePrice = n("closePrice");
  const pricePct = n("pricePct");
  const volume = n("volume");
  const avgVol20 = Math.max(1,n("avgVol20"));
  const volRatio = volume / avgVol20;

  const foreignNet = n("foreignNet");
  const trustNet = n("trustNet");
  const dealerNet = n("dealerNet");
  const instNet = foreignNet + trustNet + dealerNet;
  const marginChange = n("marginChange");
  const retailChange = n("retailChange");
  const bigHolderChange = n("bigHolderChange");
  const k = n("kValue"), d = n("dValue"), j = n("jValue");

  const turnover = Math.max(1,n("marketTurnover"));
  const instBuy = n("instBuyValue");
  const instSell = n("instSellValue");
  const foreignBuy = n("foreignBuyValue");
  const foreignSell = n("foreignSellValue");

  let score = 0;
  let reasons = [];

  if(volRatio >= 1.8 && pricePct <= 0){ score += 25; reasons.push("爆量但價格轉弱：量價背離，疑似高檔換手。");}
  else if(volRatio >= 1.5 && pricePct < 1){ score += 18; reasons.push("成交量明顯放大，但價格推升不足。");}
  else if(volRatio >= 1.2 && pricePct > 0){ score += 6; reasons.push("量增價漲，短線偏熱但尚未失控。");}
  else if(volRatio < .8){ score += 3; reasons.push("量縮，暫時不是爆量出貨型態。");}

  if(foreignNet < 0) { score += 14; reasons.push("外資賣超，需注意法人高檔調節。");}
  if(instNet < 0) { score += 10; reasons.push("三大法人合計賣超。");}
  if(marginChange > 0) { score += 14; reasons.push("融資增加，散戶槓桿承接風險上升。");}
  if(retailChange > 0) { score += 14; reasons.push("小散戶占比／人數增加。");}
  if(bigHolderChange < 0) { score += 18; reasons.push("千張大戶占比下降，籌碼集中度轉弱。");}

  if(k > 80 && d > 80 && k < d) { score += 10; reasons.push("KD 高檔死亡交叉，短線轉弱。");}
  else if(k > 80 && d > 80) { score += 6; reasons.push("KD 高檔鈍化，過熱需防震盪。");}
  else if(k < 20 && d < 20) { score -= 4; reasons.push("KD 低檔，短線賣壓可能已釋放一部分。");}

  const instParticipation = Math.min(100, Math.max(0, (instBuy + instSell) / (2 * turnover) * 100));
  const foreignParticipation = Math.min(100, Math.max(0, (foreignBuy + foreignSell) / (2 * turnover) * 100));
  const otherParticipation = Math.max(0, 100 - instParticipation);

  if(instParticipation > 55){ score += 8; reasons.push("法人交易參與率偏高，代表盤面受外資／法人主導。");}
  if(foreignSell > foreignBuy && foreignParticipation > 35){ score += 8; reasons.push("外資參與率高且賣出大於買進。");}

  score = Math.max(0, Math.min(100, Math.round(score)));

  let level = "偏健康", cls = "good", conclusion = "先觀察，不追高，若持股可依停利線續抱。";
  if(score >= 70){ level = "偏危險"; cls = "danger"; conclusion = "高檔換手／出貨風險高：避免追價，嚴控部位，等量縮或籌碼回穩。"; }
  else if(score >= 45){ level = "觀察中"; cls = "watch"; conclusion = "盤面偏熱：可以研究，但不適合重押，等收盤籌碼確認。"; }

  const volSignal = `量比 ${volRatio.toFixed(2)} 倍；漲跌幅 ${pricePct.toFixed(2)}%。${volRatio>=1.5 ? "量能已放大，量比價更重要。" : "量能尚未進入爆量區。"}`;
  const chipSignal = `外資 ${foreignNet.toLocaleString()} 張、三大法人合計 ${instNet.toLocaleString()} 張、融資 ${marginChange.toLocaleString()} 張。`;
  const holderSignal = `小散戶變化 ${retailChange.toFixed(2)}%，千張大戶變化 ${bigHolderChange.toFixed(2)}%。法人參與率估 ${instParticipation.toFixed(1)}%，外資參與率估 ${foreignParticipation.toFixed(1)}%，其他交易估 ${otherParticipation.toFixed(1)}%。`;

  return {score, level, cls, conclusion, reasons, volSignal, chipSignal, holderSignal, instParticipation, foreignParticipation, otherParticipation};
}

function render(){
  const r = scoreRisk();
  const badge = document.getElementById("riskBadge");
  badge.textContent = r.level;
  badge.className = "risk-badge " + r.cls;
  document.getElementById("scoreLine").innerHTML = `風險分數：<span class="${r.cls}">${r.score}</span> / 100　｜　${r.level}`;
  document.getElementById("resultText").innerHTML = `
    <p><b>結論：</b>${r.conclusion}</p>
    <p><b>主要原因：</b></p>
    <ul>${r.reasons.map(x=>`<li>${x}</li>`).join("")}</ul>
    <p><b>成交占比估算：</b>三大法人約 ${r.instParticipation.toFixed(1)}%，外資約 ${r.foreignParticipation.toFixed(1)}%，其餘交易約 ${r.otherParticipation.toFixed(1)}%。注意：其餘交易不等於純散戶，裡面可能包含主力、大戶、公司派與一般投資人。</p>
  `;
  document.getElementById("meterBar").style.width = r.score + "%";
  document.getElementById("volSignal").textContent = r.volSignal;
  document.getElementById("chipSignal").textContent = r.chipSignal;
  document.getElementById("holderSignal").textContent = r.holderSignal;
}

function saveHistory(){
  const r = scoreRisk();
  const item = {
    date:new Date().toISOString().slice(0,10),
    stock:s("stockCode")+" "+s("stockName"),
    level:r.level, score:r.score,
    vol:r.volSignal, chip:r.chipSignal, conclusion:r.conclusion
  };
  const arr = JSON.parse(localStorage.getItem("twRiskHistory") || "[]");
  arr.unshift(item);
  localStorage.setItem("twRiskHistory", JSON.stringify(arr.slice(0,80)));
  renderHistory();
}

function renderHistory(){
  const arr = JSON.parse(localStorage.getItem("twRiskHistory") || "[]");
  document.querySelector("#historyTable tbody").innerHTML = arr.map(x => `
    <tr><td>${x.date}</td><td>${x.stock}</td><td>${x.level}</td><td>${x.score}</td><td>${x.vol}</td><td>${x.chip}</td><td>${x.conclusion}</td></tr>
  `).join("");
}

document.getElementById("analyzeBtn").addEventListener("click", render);
document.getElementById("saveBtn").addEventListener("click", () => { render(); saveHistory(); });
document.getElementById("clearBtn").addEventListener("click", () => { localStorage.removeItem("twRiskHistory"); renderHistory(); });
document.getElementById("calcKD").addEventListener("click", () => {
  const out = kdFromOhlc(document.getElementById("ohlcText").value);
  document.getElementById("kValue").value = out.k.toFixed(2);
  document.getElementById("dValue").value = out.d.toFixed(2);
  document.getElementById("jValue").value = out.j.toFixed(2);
  render();
});
renderHistory();
render();
