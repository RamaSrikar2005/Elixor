import{K as H,aC as J,L as Q,aD as Y,O as tt,aF as et,a as s,ah as w,N as at,m as it,aB as rt,an as st,w as ot,n as nt,F as lt}from"./mermaid.core-CvBd6mB7.js";import{p as ct}from"./chunk-4BX2VUAB-BAMVQb-V.js";import{p as dt}from"./wardley-L42UT6IY-BZNoc0I_.js";import{D as M,W as pt,E as gt}from"./charts-DCPCNm1f.js";import"./index-BV7E5Y5h.js";import"./vendor-B2Lc0jHJ.js";import"./zustand-Cfgp2f0n.js";import"./socket-BcxXcwBL.js";var ht=lt.pie,D={sections:new Map,showData:!1},u=D.sections,C=D.showData,ut=structuredClone(ht),ft=s(()=>structuredClone(ut),"getConfig"),mt=s(()=>{u=new Map,C=D.showData,nt()},"clear"),vt=s(({label:t,value:a})=>{if(a<0)throw new Error(`"${t}" has invalid value: ${a}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);u.has(t)||(u.set(t,a),w.debug(`added new section: ${t}, with value: ${a}`))},"addSection"),xt=s(()=>u,"getSections"),St=s(t=>{C=t},"setShowData"),wt=s(()=>C,"getShowData"),B={getConfig:ft,clear:mt,setDiagramTitle:et,getDiagramTitle:tt,setAccTitle:Y,getAccTitle:Q,setAccDescription:J,getAccDescription:H,addSection:vt,getSections:xt,setShowData:St,getShowData:wt},Dt=s((t,a)=>{ct(t,a),a.setShowData(t.showData),t.sections.map(a.addSection)},"populateDb"),Ct={parse:s(async t=>{const a=await dt("pie",t);w.debug(a),Dt(a,B)},"parse")},$t=s(t=>`
  .pieCircle{
    stroke: ${t.pieStrokeColor};
    stroke-width : ${t.pieStrokeWidth};
    opacity : ${t.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${t.pieOuterStrokeColor};
    stroke-width: ${t.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${t.pieTitleTextSize};
    fill: ${t.pieTitleTextColor};
    font-family: ${t.fontFamily};
  }
  .slice {
    font-family: ${t.fontFamily};
    fill: ${t.pieSectionTextColor};
    font-size:${t.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${t.pieLegendTextColor};
    font-family: ${t.fontFamily};
    font-size: ${t.pieLegendTextSize};
  }
`,"getStyles"),yt=$t,Tt=s(t=>{const a=[...t.values()].reduce((r,n)=>r+n,0),$=[...t.entries()].map(([r,n])=>({label:r,value:n})).filter(r=>r.value/a*100>=1);return gt().value(r=>r.value).sort(null)($)},"createPieArcs"),At=s((t,a,$,y)=>{var z;w.debug(`rendering pie chart
`+t);const r=y.db,n=at(),T=it(r.getConfig(),n.pie),A=40,o=18,p=4,c=450,d=c,f=rt(a),l=f.append("g");l.attr("transform","translate("+d/2+","+c/2+")");const{themeVariables:i}=n;let[E]=st(i.pieOuterStrokeWidth);E??(E=2);const b=T.textPosition,g=Math.min(d,c)/2-A,G=M().innerRadius(0).outerRadius(g),O=M().innerRadius(g*b).outerRadius(g*b);l.append("circle").attr("cx",0).attr("cy",0).attr("r",g+E/2).attr("class","pieOuterCircle");const h=r.getSections(),N=Tt(h),P=[i.pie1,i.pie2,i.pie3,i.pie4,i.pie5,i.pie6,i.pie7,i.pie8,i.pie9,i.pie10,i.pie11,i.pie12];let m=0;h.forEach(e=>{m+=e});const _=N.filter(e=>(e.data.value/m*100).toFixed(0)!=="0"),v=pt(P).domain([...h.keys()]);l.selectAll("mySlices").data(_).enter().append("path").attr("d",G).attr("fill",e=>v(e.data.label)).attr("class","pieCircle"),l.selectAll("mySlices").data(_).enter().append("text").text(e=>(e.data.value/m*100).toFixed(0)+"%").attr("transform",e=>"translate("+O.centroid(e)+")").style("text-anchor","middle").attr("class","slice");const I=l.append("text").text(r.getDiagramTitle()).attr("x",0).attr("y",-400/2).attr("class","pieTitleText"),k=[...h.entries()].map(([e,S])=>({label:e,value:S})),x=l.selectAll(".legend").data(k).enter().append("g").attr("class","legend").attr("transform",(e,S)=>{const L=o+p,Z=L*k.length/2,j=12*o,q=S*L-Z;return"translate("+j+","+q+")"});x.append("rect").attr("width",o).attr("height",o).style("fill",e=>v(e.label)).style("stroke",e=>v(e.label)),x.append("text").attr("x",o+p).attr("y",o-p).text(e=>r.getShowData()?`${e.label} [${e.value}]`:e.label);const U=Math.max(...x.selectAll("text").nodes().map(e=>(e==null?void 0:e.getBoundingClientRect().width)??0)),K=d+A+o+p+U,F=((z=I.node())==null?void 0:z.getBoundingClientRect().width)??0,V=d/2-F/2,X=d/2+F/2,R=Math.min(0,V),W=Math.max(K,X)-R;f.attr("viewBox",`${R} 0 ${W} ${c}`),ot(f,c,W,T.useMaxWidth)},"draw"),Et={draw:At},Bt={parser:Ct,db:B,renderer:Et,styles:yt};export{Bt as diagram};
