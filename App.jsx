import { useState, useEffect, useRef } from "react";

const STAGES = ["Planning", "Cutting", "Stitching", "Received"];
const STAGE_COLORS = { Planning: "#7C3AED", Cutting: "#D97706", Stitching: "#2563EB", Received: "#059669" };
const STAGE_BG     = { Planning: "#EDE9FE", Cutting: "#FEF3C7", Stitching: "#DBEAFE", Received: "#D1FAE5" };
const DEFAULT_WORKERS = ["In-House", "Raju Stitching", "Kumar Tailor", "Sharma Works", "Anwar & Co"];
const BRANDS = ["Ajanta", "Bata", "Bubblegummer", "Koburg", "Liberty", "Paragon", "Urbanstyle", "Worldmark"];
const COMMON_SIZES = ["4","5","6","7","8","9","10","11","12"];
const GSM_OPTIONS = ["0.8mm","1.0mm","1.2mm","1.4mm","1.6mm","1.8mm","2.0mm"];

const SUPA_URL = "https://vmdnsazpaplmskzchxwu.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZG5zYXpwYXBsbXNremNoeHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjYwMTIsImV4cCI6MjA5NjE0MjAxMn0.lPMZ3ar5rUvHW0trv45Ayv3J0guKfavNFx1LJscfMuI";
const HDRS = { "Content-Type": "application/json", "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` };

async function cloudLoad(key, fallback) {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/tracker_data?key=eq.${key}&select=value`, { headers: HDRS });
    const rows = await res.json();
    return rows.length > 0 ? JSON.parse(rows[0].value) : fallback;
  } catch { return fallback; }
}
async function cloudSave(key, val) {
  try {
    await fetch(`${SUPA_URL}/rest/v1/tracker_data`, {
      method: "POST",
      headers: { ...HDRS, "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ key, value: JSON.stringify(val), updated_at: new Date().toISOString() }),
    });
  } catch {}
}

function totalIssued(lot)   { return lot.sizes.reduce((a,s) => a + Number(s.totalPairs), 0); }
function totalReceived(lot) { return lot.sizes.reduce((a,s) => a + Number(s.receivedPairs), 0); }
function rexineKey(color, gsm) { return `${color}__${gsm}`.toLowerCase(); }

const C = {
  bg: "#F0F4F8", surface: "#FFFFFF", border: "#CBD5E1", border2: "#E2E8F0",
  text: "#1E293B", muted: "#64748B", faint: "#94A3B8",
  blue: "#2563EB", blueBg: "#EFF6FF", rowAlt: "#F8FAFC", rowHover: "#EFF6FF",
};
const labelStyle = { fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:5, fontWeight:600 };
const inputStyle = { background:"#fff", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 13px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
const btnGhost   = { background:"#fff", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 18px", color:C.muted, fontWeight:600, cursor:"pointer", fontFamily:"inherit" };
const btnPrimary = { background:C.blue, border:"none", borderRadius:8, padding:"9px 20px", color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"inherit" };

function StageChip({ stage }) {
  return <span style={{ background:STAGE_BG[stage], color:STAGE_COLORS[stage], border:`1px solid ${STAGE_COLORS[stage]}33`, borderRadius:20, padding:"3px 11px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{stage}</span>;
}
function StageBar({ stage }) {
  const idx = STAGES.indexOf(stage);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:2, marginTop:4 }}>
      {STAGES.map((s,i) => (
        <div key={s} style={{ display:"flex", alignItems:"center" }}>
          <div style={{ width:22, height:5, borderRadius:3, background:i<=idx?STAGE_COLORS[s]:C.border2 }} />
          {i<STAGES.length-1 && <div style={{ width:2, height:2, background:C.border2 }} />}
        </div>
      ))}
    </div>
  );
}
function StatCard({ label, value, accent, sub }) {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border2}`, borderRadius:12, padding:"16px 20px", minWidth:110, flex:1, borderTop:`3px solid ${accent}` }}>
      <div style={{ fontSize:26, fontWeight:800, color:accent, fontFamily:"'DM Mono',monospace" }}>{value}</div>
      <div style={{ fontSize:11, color:C.muted, marginTop:3, textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.faint, marginTop:2 }}>{sub}</div>}
    </div>
  );
}
function SizeBreakdown({ sizes }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, minWidth:180 }}>
      {sizes.map((s,i) => {
        const pct = Number(s.totalPairs)>0 ? Math.round((Number(s.receivedPairs)/Number(s.totalPairs))*100) : 0;
        const color = pct===100?"#059669":pct>0?"#D97706":"#DC2626";
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.muted, minWidth:22, fontWeight:600 }}>S{s.size}</span>
            <div style={{ flex:1, height:5, background:C.border2, borderRadius:3, overflow:"hidden" }}>
              <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:3 }} />
            </div>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color, minWidth:52, textAlign:"right", fontWeight:600 }}>{s.receivedPairs}/{s.totalPairs}</span>
          </div>
        );
      })}
    </div>
  );
}
function SyncBadge({ status }) {
  const cfg = { syncing:{color:"#2563EB",bg:"#EFF6FF",label:"⟳ Syncing…"}, saved:{color:"#059669",bg:"#D1FAE5",label:"✓ Saved"}, error:{color:"#DC2626",bg:"#FEE2E2",label:"⚠ Error"}, loading:{color:"#D97706",bg:"#FEF3C7",label:"Loading…"} }[status]||{color:C.muted,bg:C.border2,label:""};
  return <span style={{ background:cfg.bg, color:cfg.color, borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700 }}>{cfg.label}</span>;
}
function Overlay({ children, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#00000066", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      {children}
    </div>
  );
}

// ── Print slip — 3 per page ──────────────────────────────────────
function PrintModal({ lot, onClose }) {
  const total = lot.sizes.reduce((a,s)=>a+Number(s.totalPairs),0);
  const today = new Date();
  const defaultMonth = `${String(today.getMonth()+1).padStart(2,"0")}/${today.getFullYear()}`;
  const monthPrint = lot.monthPrint || defaultMonth;
  const processes = ["UPPER CUTTING","UPPER PRINTING","UPPER STITCHING","PASSING","MOULDING"];
  const cols = lot.sizes.length;

  const slipStyle = `
    .slip-table { width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:8.5pt; }
    .slip-table td { border:1px solid #000; padding:2px 3px; vertical-align:top; }
    .slip-table .hdr { text-align:center; font-weight:bold; }
    .slip-table .process-row td { padding-top:12px; padding-bottom:12px; }
    .slip-wrap { margin-bottom:5px; padding-bottom:5px; border-bottom:1.5px dashed #999; }
    .slip-wrap:last-child { border-bottom:none; margin-bottom:0; padding-bottom:0; }
    @media print {
      @page { size:A4 portrait; margin:6mm; }
      .no-print { display:none!important; }
      body { margin:0; }
      .page { padding:0; }
    }
  `;

  const Slip = () => (
    <table className="slip-table">
      <tbody>
        <tr>
          <td colSpan={cols+3} className="hdr" style={{ fontSize:"10pt", borderBottom:"none", paddingTop:3, paddingBottom:1 }}>JOB WORK</td>
          <td colSpan={3} rowSpan={2} className="hdr" style={{ fontSize:"9.5pt" }}>PLAN NO:{lot.id}</td>
        </tr>
        <tr>
          <td colSpan={cols+3} className="hdr" style={{ borderTop:"none", borderBottom:"none", paddingTop:1, paddingBottom:3 }}>PO NO:- {lot.poNumber||"—"}</td>
        </tr>
        <tr>
          <td colSpan={3} style={{ fontSize:"8pt" }}>
            <b>Article:- {lot.style||"—"}</b>
            {lot.articleCode&&<div>({lot.articleCode})</div>}
            {lot.brand&&<div>{lot.brand}</div>}
          </td>
          <td colSpan={2} style={{ fontWeight:"bold" }}>{lot.color||""}</td>
          <td colSpan={Math.max(1,cols-2)} style={{ fontSize:"7.5pt" }}><b>Slip Date:</b><br/>{lot.issuedDate||""}</td>
          <td colSpan={2} style={{ fontSize:"7.5pt" }}>{lot.brand==="Bata"&&lot.mrp?<><b>MRP:</b><br/>₹{lot.mrp}</>:"NO MRP"}</td>
          <td colSpan={2} style={{ fontSize:"7.5pt" }}><b>Month Print:</b><br/>{monthPrint}</td>
        </tr>
        {lot.rexineColor && (
          <tr style={{ background:"#F3F0FF" }}>
            <td colSpan={cols+3} style={{ fontSize:"7.5pt", padding:"2px 4px" }}>
              🧵 <b>Rexine:</b> {lot.rexineColor} {lot.rexineGsm} &nbsp;·&nbsp; <b>Required:</b> {lot.rexineConsumed?.toFixed(2)}m total
            </td>
          </tr>
        )}
        <tr style={{ background:"#eee" }}>
          <td style={{ fontWeight:"bold" }}>Process</td>
          {lot.sizes.map((s,i)=><td key={i} style={{ textAlign:"center", fontWeight:"bold" }}>{s.size}</td>)}
          <td style={{ textAlign:"center", fontWeight:"bold" }}>TOTAL</td>
          <td style={{ textAlign:"center", fontWeight:"bold" }}>Vendor</td>
          <td style={{ textAlign:"center", fontWeight:"bold" }}>Issue Date</td>
          <td style={{ textAlign:"center", fontWeight:"bold" }}>Recv Date</td>
        </tr>
        <tr>
          <td style={{ fontWeight:"bold" }}>PLANNING</td>
          {lot.sizes.map((s,i)=><td key={i} style={{ textAlign:"center" }}>{s.totalPairs}</td>)}
          <td style={{ textAlign:"center", fontWeight:"bold" }}>{total}</td>
          <td></td><td></td><td></td>
        </tr>
        {lot.rexineColor && (
          <tr>
            <td style={{ fontWeight:"bold", fontSize:"7.5pt" }}>Rexine (m)</td>
            {lot.sizes.map((s,i)=>{
              const rule = (lot.rexineSizeMeters||{})[s.size];
              return <td key={i} style={{ textAlign:"center", fontSize:"7.5pt", color:"#7C3AED" }}>{rule?rule.toFixed(2):"—"}</td>;
            })}
            <td style={{ textAlign:"center", fontWeight:"bold", fontSize:"7.5pt", color:"#7C3AED" }}>{lot.rexineConsumed?.toFixed(2)}</td>
            <td></td><td></td><td></td>
          </tr>
        )}
        {processes.map(p=>(
          <tr key={p} className="process-row">
            <td style={{ fontSize:"7.5pt" }}>{p}</td>
            {lot.sizes.map((_,i)=><td key={i}></td>)}
            <td></td><td></td><td></td><td></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"#000000aa", zIndex:500, display:"flex", flexDirection:"column", alignItems:"center", overflowY:"auto", padding:"16px 0" }}>
      <style>{slipStyle}</style>
      <div className="no-print" style={{ display:"flex", gap:10, marginBottom:12 }}>
        <button onClick={()=>window.print()} style={{ background:"#2563EB", color:"#fff", border:"none", borderRadius:8, padding:"10px 28px", fontWeight:700, fontSize:14, cursor:"pointer" }}>🖨 Print 3 Slips</button>
        <button onClick={onClose} style={{ background:"#fff", color:"#64748B", border:"1px solid #CBD5E1", borderRadius:8, padding:"10px 20px", fontWeight:600, fontSize:13, cursor:"pointer" }}>✕ Close</button>
      </div>
      <div className="page" style={{ background:"#fff", width:"210mm", padding:"6mm", boxSizing:"border-box", boxShadow:"0 4px 32px #0003" }}>
        {[0,1,2].map(i=>(
          <div key={i} className="slip-wrap"><Slip /></div>
        ))}
      </div>
    </div>
  );
}

// ── Monthly PDF Report ───────────────────────────────────────────
function ReportModal({ lots, onClose }) {
  const months = [...new Set(lots.map(l=>l.issuedDate?.slice(0,7)).filter(Boolean))].sort().reverse();
  const [selMonth, setSelMonth] = useState(months[0]||"");
  const filtered = lots.filter(l=>l.issuedDate?.startsWith(selMonth));
  const grandIssued = filtered.reduce((a,l)=>a+totalIssued(l),0);
  const grandReceived = filtered.reduce((a,l)=>a+totalReceived(l),0);

  const reportStyle = `
    @media print { @page { size:A4 portrait; margin:12mm; } .no-print { display:none!important; } body { margin:0; font-family:Arial,sans-serif; } }
    .rpt-table { width:100%; border-collapse:collapse; font-size:9pt; margin-top:10px; }
    .rpt-table th { background:#1E293B; color:#fff; padding:6px 8px; text-align:left; font-size:8pt; }
    .rpt-table td { border:1px solid #CBD5E1; padding:5px 8px; font-size:8.5pt; vertical-align:top; }
    .rpt-table tr:nth-child(even) td { background:#F8FAFC; }
  `;
  const displayMonth = selMonth ? new Date(selMonth+"-01").toLocaleString("default",{month:"long",year:"numeric"}) : "";

  return (
    <div style={{ position:"fixed", inset:0, background:"#000000aa", zIndex:500, display:"flex", flexDirection:"column", alignItems:"center", overflowY:"auto", padding:"16px 0" }}>
      <style>{reportStyle}</style>
      <div className="no-print" style={{ display:"flex", gap:10, marginBottom:12, alignItems:"center", flexWrap:"wrap", justifyContent:"center" }}>
        <select value={selMonth} onChange={e=>setSelMonth(e.target.value)} style={{ background:"#fff", border:"1px solid #CBD5E1", borderRadius:8, padding:"9px 14px", fontSize:13, fontFamily:"inherit" }}>
          {months.map(m=><option key={m} value={m}>{new Date(m+"-01").toLocaleString("default",{month:"long",year:"numeric"})}</option>)}
          {months.length===0&&<option value="">No data yet</option>}
        </select>
        <button onClick={()=>window.print()} style={{ background:"#059669", color:"#fff", border:"none", borderRadius:8, padding:"10px 24px", fontWeight:700, fontSize:13, cursor:"pointer" }}>🖨 Print / Save PDF</button>
        <button onClick={onClose} style={{ background:"#fff", color:"#64748B", border:"1px solid #CBD5E1", borderRadius:8, padding:"10px 18px", fontWeight:600, fontSize:13, cursor:"pointer" }}>✕ Close</button>
      </div>
      <div style={{ background:"#fff", width:"210mm", padding:"10mm", boxSizing:"border-box", boxShadow:"0 4px 32px #0003" }}>
        <div style={{ textAlign:"center", marginBottom:12 }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#1E293B" }}>Radha Krishna Polymers</div>
          <div style={{ fontSize:13, color:"#64748B", marginTop:2 }}>Upper Tracker — Monthly Report</div>
          <div style={{ fontSize:14, fontWeight:700, color:"#2563EB", marginTop:4 }}>{displayMonth}</div>
        </div>
        <div style={{ display:"flex", gap:10, marginBottom:14 }}>
          {[["Total Plans", filtered.length, "#7C3AED"], ["Pairs Issued", grandIssued, "#2563EB"], ["Pairs Received", grandReceived, "#059669"], ["Pending Pairs", grandIssued-grandReceived, "#D97706"]].map(([lbl,val,col])=>(
            <div key={lbl} style={{ flex:1, border:`1px solid ${col}33`, borderTop:`3px solid ${col}`, borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:800, color:col, fontFamily:"monospace" }}>{val}</div>
              <div style={{ fontSize:9, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600, marginTop:2 }}>{lbl}</div>
            </div>
          ))}
        </div>
        {filtered.length===0?(
          <div style={{ textAlign:"center", color:"#94A3B8", padding:"32px 0", fontSize:13 }}>No plans found for this month.</div>
        ):(
          <table className="rpt-table">
            <thead><tr>{["Plan No.","PO No.","Brand","Article","Code","Color","Assigned To","Issue Date","Stage","Sizes","Issued","Received","Pending"].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(lot=>{
                const issued=totalIssued(lot), received=totalReceived(lot);
                return (
                  <tr key={lot.id}>
                    <td style={{ fontWeight:700, color:"#2563EB", fontFamily:"monospace" }}>{lot.id}</td>
                    <td style={{ fontFamily:"monospace", fontSize:"8pt" }}>{lot.poNumber||"—"}</td>
                    <td>{lot.brand||"—"}</td>
                    <td style={{ fontWeight:600 }}>{lot.style}</td>
                    <td style={{ fontSize:"8pt", color:"#64748B" }}>{lot.articleCode||"—"}</td>
                    <td>{lot.color}</td>
                    <td>{lot.assignedTo}</td>
                    <td style={{ fontFamily:"monospace", fontSize:"8pt" }}>{lot.issuedDate}</td>
                    <td><span style={{ background:STAGE_BG[lot.stage], color:STAGE_COLORS[lot.stage], borderRadius:10, padding:"1px 7px", fontSize:"7.5pt", fontWeight:700 }}>{lot.stage}</span></td>
                    <td style={{ fontSize:"7.5pt" }}>{lot.sizes.map(s=>`S${s.size}:${s.totalPairs}`).join(", ")}</td>
                    <td style={{ textAlign:"center", fontFamily:"monospace", fontWeight:700 }}>{issued}</td>
                    <td style={{ textAlign:"center", fontFamily:"monospace", fontWeight:700, color:"#059669" }}>{received}</td>
                    <td style={{ textAlign:"center", fontFamily:"monospace", fontWeight:700, color:issued-received>0?"#D97706":"#059669" }}>{issued-received}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background:"#1E293B" }}>
                <td colSpan={10} style={{ color:"#fff", fontWeight:700, fontSize:"9pt", border:"1px solid #1E293B" }}>TOTAL</td>
                <td style={{ textAlign:"center", fontWeight:800, color:"#93C5FD", fontFamily:"monospace", border:"1px solid #334155" }}>{grandIssued}</td>
                <td style={{ textAlign:"center", fontWeight:800, color:"#6EE7B7", fontFamily:"monospace", border:"1px solid #334155" }}>{grandReceived}</td>
                <td style={{ textAlign:"center", fontWeight:800, color:"#FCD34D", fontFamily:"monospace", border:"1px solid #334155" }}>{grandIssued-grandReceived}</td>
              </tr>
            </tfoot>
          </table>
        )}
        <div style={{ marginTop:16, fontSize:8, color:"#94A3B8", textAlign:"right" }}>Generated on {new Date().toLocaleString()} · Radha Krishna Polymers Upper Tracker</div>
      </div>
    </div>
  );
}

// ── Partial Receive ──────────────────────────────────────────────
function PartialReceiveModal({ lot, onSave, onClose }) {
  const [quantities, setQuantities] = useState(lot.sizes.map(s=>({...s,addQty:""})));
  function handleSave() {
    const updated = quantities.map(s=>({...s, receivedPairs:Math.min(Number(s.totalPairs),Number(s.receivedPairs)+(Number(s.addQty)||0))}));
    const newTotal=updated.reduce((a,s)=>a+Number(s.receivedPairs),0);
    const issued=updated.reduce((a,s)=>a+Number(s.totalPairs),0);
    onSave(lot.id, updated, newTotal>=issued?"Received":lot.stage);
  }
  return (
    <Overlay onClose={onClose}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width:"100%", maxWidth:420, maxHeight:"85vh", overflowY:"auto" }}>
        <h2 style={{ margin:"0 0 4px", fontSize:17, fontWeight:800, color:C.text }}>Add Received Pairs</h2>
        <div style={{ color:C.muted, fontSize:13, marginBottom:20 }}>{lot.id} — {lot.style} / {lot.color}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {quantities.map((s,i)=>{
            const pending=Number(s.totalPairs)-Number(s.receivedPairs);
            return (
              <div key={i} style={{ background:C.bg, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.border2}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontWeight:700, color:C.text }}>Size {s.size}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.muted }}>{s.receivedPairs}/{s.totalPairs} · <span style={{ color:"#D97706" }}>{pending} pending</span></span>
                </div>
                <input type="number" min={0} max={pending} placeholder={pending<=0?"Complete ✓":`Add up to ${pending}`}
                  disabled={pending<=0} value={s.addQty}
                  onChange={e=>setQuantities(quantities.map((q,j)=>j===i?{...q,addQty:e.target.value}:q))}
                  style={{...inputStyle, opacity:pending<=0?0.5:1}} />
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={handleSave} style={{...btnPrimary, background:"#059669"}}>+ Add Pairs</button>
        </div>
      </div>
    </Overlay>
  );
}

function DeleteModal({ lot, onConfirm, onClose, label }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ background:C.surface, border:"1px solid #FCA5A5", borderRadius:16, padding:28, width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:32, marginBottom:12 }}>🗑️</div>
        <h2 style={{ margin:"0 0 8px", fontSize:17, fontWeight:800, color:C.text }}>Remove {label||"Item"}?</h2>
        <div style={{ color:C.muted, fontSize:13, marginBottom:20 }}>{lot.id||lot.key}</div>
        <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#DC2626", marginBottom:20 }}>This cannot be undone.</div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={()=>onConfirm(lot.id||lot.key)} style={{...btnPrimary, background:"#DC2626"}}>Yes, Remove</button>
        </div>
      </div>
    </Overlay>
  );
}

function SettingsPanel({ workers, onSave, onClose }) {
  const [ws, setWs] = useState(workers.map(w=>({val:w,orig:w,id:Math.random()})));
  function upd(id,val){ setWs(ws.map(x=>x.id===id?{...x,val}:x)); }
  function rem(id){ setWs(ws.filter(x=>x.id!==id)); }
  function add(){ setWs([...ws,{val:"",orig:"",id:Math.random()}]); }
  function handleSave(){
    const clean=ws.map(x=>x.val.trim()).filter(Boolean);
    if(!clean.includes("In-House")) clean.unshift("In-House");
    const wRen={};
    ws.forEach(x=>{ if(x.orig&&x.orig!==x.val.trim()&&x.val.trim()) wRen[x.orig]=x.val.trim(); });
    onSave(clean,wRen);
  }
  return (
    <Overlay onClose={onClose}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width:"100%", maxWidth:440, maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:C.text }}>⚙️ Settings</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Job Workers</div>
        <div style={{ fontSize:12, color:C.faint, marginBottom:10 }}>"In-House" cannot be removed. Renames update all existing plans.</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {ws.map(item=>(
            <div key={item.id} style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={item.val} onChange={e=>upd(item.id,e.target.value)} placeholder="e.g. Raju Stitching"
                style={{...inputStyle, flex:1, borderColor:item.orig&&item.val.trim()!==item.orig?C.blue:C.border}} />
              {item.orig&&item.val.trim()!==item.orig&&item.orig!=="In-House"&&<span style={{ fontSize:10, color:C.blue, whiteSpace:"nowrap" }}>renamed</span>}
              <button onClick={()=>rem(item.id)} disabled={item.val==="In-House"}
                style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:7, padding:"7px 12px", color:"#DC2626", fontWeight:700, cursor:item.val==="In-House"?"not-allowed":"pointer", fontFamily:"inherit", fontSize:14, opacity:item.val==="In-House"?0.3:1 }}>✕</button>
            </div>
          ))}
          <button onClick={add} style={{ background:C.bg, border:`1px dashed ${C.border}`, borderRadius:8, padding:"8px", color:C.muted, fontWeight:600, cursor:"pointer", fontFamily:"inherit", fontSize:12 }}>+ Add Worker</button>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:24, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={handleSave} style={btnPrimary}>Save Settings</button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Rexine Consumption Master (per Article/Style) ─────────────────
function RexineMasterModal({ editItem, rexineStock, onSave, onClose }) {
  const isEdit = !!editItem;
  const [style, setStyle] = useState(editItem?.style||"");
  const [color, setColor] = useState(editItem?.rexineColor||(rexineStock[0]?.color||""));
  const [gsm, setGsm] = useState(editItem?.rexineGsm||(rexineStock[0]?.gsm||GSM_OPTIONS[0]));
  const [rows, setRows] = useState(editItem?editItem.consumption.map(r=>({...r,id:Math.random()})):COMMON_SIZES.slice(0,6).map(sz=>({size:sz,metersPerPair:"",id:Math.random()})));
  const [err, setErr] = useState("");

  function updRow(id,f,v){ setRows(rows.map(r=>r.id===id?{...r,[f]:v}:r)); }
  function addRow(){ setRows([...rows,{size:"",metersPerPair:"",id:Math.random()}]); }
  function remRow(id){ setRows(rows.filter(r=>r.id!==id)); }

  function handleSave(){
    if(!style.trim()){ setErr("Article/Style name is required"); return; }
    const clean=rows.filter(r=>r.size&&r.metersPerPair).map(r=>({size:r.size,metersPerPair:Number(r.metersPerPair)}));
    if(!clean.length){ setErr("Add at least one size row"); return; }
    onSave({ style:style.trim(), rexineColor:color, rexineGsm:gsm, consumption:clean });
  }

  const uniqueColors = [...new Set(rexineStock.map(r=>r.color))];
  const uniqueGsms = [...new Set(rexineStock.filter(r=>r.color===color).map(r=>r.gsm))];

  return (
    <Overlay onClose={onClose}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto" }}>
        <h2 style={{ margin:"0 0 6px", fontSize:18, fontWeight:800, color:C.text }}>{isEdit?"Edit":"New"} Consumption Rule</h2>
        <div style={{ fontSize:12, color:C.faint, marginBottom:16 }}>Set how much rexine (meters) each size of this article uses per pair.</div>

        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>Article / Style Name *</label>
          <input value={style} onChange={e=>{setStyle(e.target.value);setErr("");}} placeholder="e.g. SOUTH-TR" style={inputStyle} disabled={isEdit} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <div>
            <label style={labelStyle}>Rexine Color</label>
            <select value={color} onChange={e=>setColor(e.target.value)} style={{...inputStyle,background:"#fff"}}>
              {uniqueColors.length?uniqueColors.map(c=><option key={c}>{c}</option>):<option value="">No stock yet — add stock first</option>}
            </select>
          </div>
          <div>
            <label style={labelStyle}>GSM / Quality</label>
            <select value={gsm} onChange={e=>setGsm(e.target.value)} style={{...inputStyle,background:"#fff"}}>
              {uniqueGsms.length?uniqueGsms.map(g=><option key={g}>{g}</option>):GSM_OPTIONS.map(g=><option key={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <div style={{ borderTop:`1px solid ${C.border2}`, paddingTop:14, marginBottom:14 }}>
          <label style={{...labelStyle,marginBottom:8}}>Meters per Pair — by Size</label>
          <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 32px", gap:8, marginBottom:6 }}>
            {["Size","Meters/Pair",""].map(h=><span key={h} style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:600}}>{h}</span>)}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {rows.map(r=>(
              <div key={r.id} style={{ display:"grid", gridTemplateColumns:"80px 1fr 32px", gap:8, alignItems:"center" }}>
                <input value={r.size} onChange={e=>updRow(r.id,"size",e.target.value)} placeholder="7" style={{...inputStyle,padding:"7px 10px",fontFamily:"'DM Mono',monospace",fontWeight:700}} />
                <input type="number" step="0.01" value={r.metersPerPair} onChange={e=>updRow(r.id,"metersPerPair",e.target.value)} placeholder="e.g. 0.35" style={{...inputStyle,padding:"7px 10px"}} />
                <button onClick={()=>remRow(r.id)} style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:6, padding:"6px", color:"#DC2626", fontWeight:700, cursor:"pointer", fontSize:12 }}>✕</button>
              </div>
            ))}
            <button onClick={addRow} style={{ background:C.bg, border:`1px dashed ${C.border}`, borderRadius:8, padding:"8px", color:C.muted, fontWeight:600, cursor:"pointer", fontSize:12 }}>+ Add Size Row</button>
          </div>
        </div>
        {err&&<div style={{ color:"#DC2626", fontSize:12, marginBottom:10 }}>{err}</div>}
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={handleSave} style={btnPrimary}>Save Rule</button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Rexine Stock Add/Edit Modal ───────────────────────────────────
function RexineStockModal({ editStock, onSave, onClose }) {
  const isEdit = !!editStock;
  const [color, setColor] = useState(editStock?.color||"");
  const [gsm, setGsm] = useState(editStock?.gsm||GSM_OPTIONS[0]);
  const [meters, setMeters] = useState(editStock?.meters||"");
  const [supplier, setSupplier] = useState(editStock?.supplier||"");
  const [err, setErr] = useState("");

  function handleSave(){
    if(!color.trim()){ setErr("Color is required"); return; }
    if(!meters||Number(meters)<0){ setErr("Enter valid meters"); return; }
    onSave({ color:color.trim(), gsm, meters:Number(meters), supplier });
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width:"100%", maxWidth:400 }}>
        <h2 style={{ margin:"0 0 16px", fontSize:18, fontWeight:800, color:C.text }}>{isEdit?"Edit":"Add"} Rexine Stock</h2>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label style={labelStyle}>Color *</label>
            <input value={color} onChange={e=>{setColor(e.target.value);setErr("");}} placeholder="e.g. Maroon" style={inputStyle} disabled={isEdit} />
          </div>
          <div>
            <label style={labelStyle}>GSM / Quality</label>
            <select value={gsm} onChange={e=>setGsm(e.target.value)} style={{...inputStyle,background:"#fff"}} disabled={isEdit}>
              {GSM_OPTIONS.map(g=><option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{isEdit?"Set Total Meters":"Meters to Add *"}</label>
            <input type="number" step="0.1" value={meters} onChange={e=>setMeters(e.target.value)} placeholder="e.g. 500" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Supplier (optional)</label>
            <input value={supplier} onChange={e=>setSupplier(e.target.value)} placeholder="e.g. XYZ Rexine Traders" style={inputStyle} />
          </div>
        </div>
        {err&&<div style={{ color:"#DC2626", fontSize:12, marginTop:10 }}>{err}</div>}
        <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={handleSave} style={btnPrimary}>{isEdit?"Update Stock":"Add Stock"}</button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Plan Form (with rexine auto-deduction preview) ────────────────
function PlanModal({ editLot, workers, allPlanIds, rexineRules, rexineStock, onSave, onClose }) {
  const isEdit = !!editLot;
  const [planId,      setPlanId]      = useState(editLot?.id||"");
  const [poNumber,    setPoNumber]    = useState(editLot?.poNumber||"");
  const [brand,       setBrand]       = useState(editLot?.brand||BRANDS[0]);
  const [style,       setStyle]       = useState(editLot?.style||"");
  const [articleCode, setArticleCode] = useState(editLot?.articleCode||"");
  const [color,       setColor]       = useState(editLot?.color||"");
  const [assignedTo,  setAssignedTo]  = useState(editLot?.assignedTo||workers[0]||"In-House");
  const [stage,       setStage]       = useState(editLot?.stage||"Planning");
  const [issuedDate,  setIssuedDate]  = useState(editLot?.issuedDate||new Date().toISOString().slice(0,10));
  const [notes,       setNotes]       = useState(editLot?.notes||"");
  const [monthPrint,  setMonthPrint]  = useState(editLot?.monthPrint||"");
  const [mrp,         setMrp]         = useState(editLot?.mrp||"");
  const [sizes,       setSizes]       = useState(editLot?editLot.sizes.map(s=>({...s,id:Math.random()})):[{size:"",totalPairs:"",receivedPairs:0,id:Math.random()}]);
  const [planIdErr,   setPlanIdErr]   = useState("");

  function addRow(){ setSizes([...sizes,{size:"",totalPairs:"",receivedPairs:0,id:Math.random()}]); }
  function remRow(id){ setSizes(sizes.filter(s=>s.id!==id)); }
  function updRow(id,f,v){ setSizes(sizes.map(s=>s.id===id?{...s,[f]:v}:s)); }
  function quickSize(sz){ if(!sizes.find(s=>s.size===sz)) setSizes([...sizes,{size:sz,totalPairs:"",receivedPairs:0,id:Math.random()}]); }

  // Find matching rexine rule for this article
  const matchedRule = rexineRules.find(r=>r.style.toLowerCase()===style.trim().toLowerCase());
  let rexineNeeded = 0, rexineWarning = null, rexineSizeMeters = {};
  if (matchedRule) {
    sizes.forEach(s=>{
      const rule = matchedRule.consumption.find(c=>c.size===s.size);
      if (rule) rexineSizeMeters[s.size] = rule.metersPerPair;
    });
    rexineNeeded = sizes.reduce((total,s)=>{
      const rule = matchedRule.consumption.find(c=>c.size===s.size);
      return total + (rule ? rule.metersPerPair * (Number(s.totalPairs)||0) : 0);
    }, 0);
    const stockItem = rexineStock.find(r=>rexineKey(r.color,r.gsm)===rexineKey(matchedRule.rexineColor,matchedRule.rexineGsm));
    const available = stockItem ? stockItem.meters : 0;
    // If editing, add back what this plan already consumed (so we compare correctly)
    const alreadyConsumed = isEdit ? (editLot.rexineConsumed||0) : 0;
    if (rexineNeeded - alreadyConsumed > available) {
      rexineWarning = `⚠ Not enough stock! Need ${(rexineNeeded-alreadyConsumed).toFixed(2)}m more, only ${available.toFixed(2)}m available in ${matchedRule.rexineColor} ${matchedRule.rexineGsm}.`;
    }
  }

  function handleSave(){
    if(!planId.trim()){ setPlanIdErr("Plan No. is required"); return; }
    if(!isEdit&&allPlanIds.includes(planId.trim())){ setPlanIdErr("Already exists"); return; }
    const cleanSizes=sizes.filter(s=>s.size&&s.totalPairs).map(s=>({size:s.size,totalPairs:Number(s.totalPairs),receivedPairs:Number(s.receivedPairs)||0}));
    if(!cleanSizes.length||!style||!color) return;
    onSave({
      id:planId.trim(),poNumber,brand,style,articleCode,color,assignedTo,stage,issuedDate,notes,monthPrint,mrp,sizes:cleanSizes,
      rexineColor: matchedRule?matchedRule.rexineColor:null,
      rexineGsm: matchedRule?matchedRule.rexineGsm:null,
      rexineConsumed: matchedRule?rexineNeeded:0,
      rexineSizeMeters: matchedRule?rexineSizeMeters:null,
    });
  }

  const fi=(val,set,ph,type="text")=><input type={type} placeholder={ph} value={val} onChange={e=>set(e.target.value)} style={inputStyle} />;
  const fs=(val,set,opts)=><select value={val} onChange={e=>set(e.target.value)} style={{...inputStyle,background:"#fff"}}>{opts.map(o=><option key={o}>{o}</option>)}</select>;

  return (
    <Overlay onClose={onClose}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:28, width:"100%", maxWidth:540, maxHeight:"92vh", overflowY:"auto" }}>
        <h2 style={{ margin:"0 0 20px", fontSize:18, fontWeight:800, color:C.text }}>{isEdit?"Edit Plan":"New Plan"}</h2>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <label style={labelStyle}>Plan No. *</label>
            <input value={planId} onChange={e=>{setPlanId(e.target.value);setPlanIdErr("");}} placeholder="e.g. PLAN-006"
              style={{...inputStyle, borderColor:planIdErr?"#DC2626":C.border}} />
            {planIdErr&&<div style={{color:"#DC2626",fontSize:11,marginTop:4}}>{planIdErr}</div>}
          </div>
          <div><label style={labelStyle}>PO Number</label>{fi(poNumber,setPoNumber,"e.g. PO-2026-001")}</div>
          <div><label style={labelStyle}>Brand</label>{fs(brand,setBrand,BRANDS)}</div>
          <div><label style={labelStyle}>Assigned To</label>{fs(assignedTo,setAssignedTo,workers)}</div>
          <div style={{gridColumn:"1/-1"}}><label style={labelStyle}>Article / Style Name *</label>{fi(style,setStyle,"e.g. SOUTH-TR")}</div>
          <div><label style={labelStyle}>Article Code</label>{fi(articleCode,setArticleCode,"e.g. 571-5999")}</div>
          <div><label style={labelStyle}>Color *</label>{fi(color,setColor,"e.g. Maroon")}</div>
          <div><label style={labelStyle}>Stage</label>{fs(stage,setStage,STAGES)}</div>
          <div><label style={labelStyle}>Issue Date</label>{fi(issuedDate,setIssuedDate,"","date")}</div>
          {brand==="Bata"&&(
            <div style={{gridColumn:"1/-1",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={{...labelStyle,color:C.blue}}>Month Print <span style={{fontSize:10,fontWeight:400,textTransform:"none",letterSpacing:0}}>(Bata only)</span></label>{fi(monthPrint,setMonthPrint,"e.g. 05/2026")}</div>
              <div><label style={{...labelStyle,color:C.blue}}>MRP ₹ <span style={{fontSize:10,fontWeight:400,textTransform:"none",letterSpacing:0}}>(Bata only)</span></label>{fi(mrp,setMrp,"e.g. 499")}</div>
            </div>
          )}
        </div>

        <div style={{ borderTop:`1px solid ${C.border2}`, paddingTop:16, marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <label style={{...labelStyle,marginBottom:0}}>Size-wise Pairs</label>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {COMMON_SIZES.map(sz=>{
                const active=!!sizes.find(s=>s.size===sz);
                return <button key={sz} onClick={()=>quickSize(sz)}
                  style={{ background:active?"#DBEAFE":"#fff", border:`1px solid ${active?C.blue:C.border}`, borderRadius:6, padding:"3px 8px", color:active?C.blue:C.muted, fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>{sz}</button>;
              })}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"72px 1fr 1fr 32px", gap:8, marginBottom:6 }}>
            {["Size","Issued","Received",""].map(h=><span key={h} style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:600}}>{h}</span>)}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {sizes.map(s=>(
              <div key={s.id} style={{ display:"grid", gridTemplateColumns:"72px 1fr 1fr 32px", gap:8, alignItems:"center" }}>
                <input value={s.size} onChange={e=>updRow(s.id,"size",e.target.value)} placeholder="7" style={{...inputStyle,padding:"7px 10px",fontFamily:"'DM Mono',monospace",fontWeight:700}} />
                <input type="number" value={s.totalPairs} onChange={e=>updRow(s.id,"totalPairs",e.target.value)} placeholder="0" style={{...inputStyle,padding:"7px 10px"}} />
                <input type="number" value={s.receivedPairs} onChange={e=>updRow(s.id,"receivedPairs",e.target.value)} placeholder="0" style={{...inputStyle,padding:"7px 10px"}} />
                <button onClick={()=>remRow(s.id)} style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:6, padding:"6px", color:"#DC2626", fontWeight:700, cursor:"pointer", fontSize:12, lineHeight:1 }}>✕</button>
              </div>
            ))}
            <button onClick={addRow} style={{ background:C.bg, border:`1px dashed ${C.border}`, borderRadius:8, padding:"8px", color:C.muted, fontWeight:600, cursor:"pointer", fontSize:12 }}>+ Add Size Row</button>
          </div>
        </div>

        {/* Rexine consumption preview */}
        {matchedRule && (
          <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:10, padding:"12px 16px", marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#2563EB", marginBottom:4 }}>🧵 Rexine Auto-Deduction</div>
            <div style={{ fontSize:12, color:"#1E40AF" }}>
              This article uses <b>{matchedRule.rexineColor} {matchedRule.rexineGsm}</b> rexine.<br/>
              Estimated consumption: <b>{rexineNeeded.toFixed(2)} meters</b> for this plan.
            </div>
            {rexineWarning && <div style={{ color:"#DC2626", fontSize:12, fontWeight:700, marginTop:6 }}>{rexineWarning}</div>}
          </div>
        )}
        {!matchedRule && style && (
          <div style={{ background:"#FEF3C7", border:"1px solid #FDE68A", borderRadius:10, padding:"10px 16px", marginBottom:14, fontSize:12, color:"#92400E" }}>
            No rexine consumption rule found for "{style}". Stock won't auto-deduct. Set one up in the Rexine tab if needed.
          </div>
        )}

        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Notes</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any remarks…" rows={2} style={{...inputStyle,resize:"none"}} />
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={handleSave} style={btnPrimary}>Save Plan</button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Login Screen ─────────────────────────────────────────────────
const APP_PASSWORD = "rkp2026"; // shared password — change this to whatever you like

function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (pw === APP_PASSWORD) {
      try { localStorage.setItem("rkp_authed", "1"); } catch {}
      onLogin();
    } else {
      setErr("Incorrect password. Please try again.");
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Sans',sans-serif", padding:24 }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;700&display=swap" rel="stylesheet" />
      <form onSubmit={handleSubmit} style={{ background:C.surface, border:`1px solid ${C.border2}`, borderRadius:16, padding:"36px 32px", width:"100%", maxWidth:380, boxShadow:"0 8px 32px #0001" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🔒</div>
          <div style={{ fontSize:11, color:C.blue, letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:700, marginBottom:4 }}>Radha Krishna Polymers</div>
          <h1 style={{ fontSize:20, fontWeight:800, margin:0, color:C.text }}>Upper Tracker</h1>
          <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>Enter password to continue</div>
        </div>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={e=>{setPw(e.target.value); setErr("");}}
          placeholder="Password"
          style={{...inputStyle, fontSize:15, padding:"12px 16px", textAlign:"center", letterSpacing:"0.1em"}}
        />
        {err && <div style={{ color:"#DC2626", fontSize:12, marginTop:10, textAlign:"center" }}>{err}</div>}
        <button type="submit" style={{...btnPrimary, width:"100%", marginTop:16, padding:"12px", fontSize:14}}>Login</button>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN APP — Tabbed: Upper Tracker + Rexine Inventory
// ══════════════════════════════════════════════════════════════════
export default function UpperTracker() {
  const [authed, setAuthed] = useState(() => {
    try { return localStorage.getItem("rkp_authed") === "1"; } catch { return false; }
  });
  const [activeTab,    setActiveTab]    = useState("tracker"); // tracker | rexine
  const [lots,         setLotsRaw]      = useState([]);
  const [workers,      setWorkersRaw]   = useState(DEFAULT_WORKERS);
  const [rexineStock,  setRexineStockRaw] = useState([]);
  const [rexineRules,  setRexineRulesRaw] = useState([]);
  const [rexineLedger, setRexineLedgerRaw] = useState([]); // history of deductions
  const [syncStatus,   setSyncStatus]   = useState("loading");
  const [showForm,     setShowForm]     = useState(false);
  const [editLot,      setEditLot]      = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showReport,   setShowReport]   = useState(false);
  const [filterStage,  setFilterStage]  = useState("All");
  const [filterWorker, setFilterWorker] = useState("All");
  const [filterBrand,  setFilterBrand]  = useState("All");
  const [filterStyle,  setFilterStyle]  = useState("All");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [partialLot,   setPartialLot]   = useState(null);
  const [deleteLot,    setDeleteLot]    = useState(null);
  const [printLot,     setPrintLot]     = useState(null);
  const [showStockForm, setShowStockForm] = useState(false);
  const [editStock,    setEditStock]    = useState(null);
  const [deleteStock,  setDeleteStock]  = useState(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editRule,     setEditRule]     = useState(null);
  const [deleteRule,   setDeleteRule]   = useState(null);
  const saveTimer = useRef(null);

  useEffect(()=>{
    (async()=>{
      setSyncStatus("loading");
      const [l,w,rs,rr,rl] = await Promise.all([
        cloudLoad("upt_lots",[]),
        cloudLoad("upt_workers",DEFAULT_WORKERS),
        cloudLoad("upt_rexine_stock",[]),
        cloudLoad("upt_rexine_rules",[]),
        cloudLoad("upt_rexine_ledger",[]),
      ]);
      setLotsRaw(l); setWorkersRaw(w); setRexineStockRaw(rs); setRexineRulesRaw(rr); setRexineLedgerRaw(rl);
      setSyncStatus("saved");
    })();
  },[]);

  function persist(newLots,newWorkers,newStock,newRules,newLedger){
    setSyncStatus("syncing");
    if(saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      await Promise.all([
        cloudSave("upt_lots",newLots),
        cloudSave("upt_workers",newWorkers),
        cloudSave("upt_rexine_stock",newStock),
        cloudSave("upt_rexine_rules",newRules),
        cloudSave("upt_rexine_ledger",newLedger),
      ]);
      setSyncStatus("saved");
    },800);
  }
  function setLots(fn){ const v=typeof fn==="function"?fn(lots):fn; setLotsRaw(v); persist(v,workers,rexineStock,rexineRules,rexineLedger); }
  function setWorkers(v){ setWorkersRaw(v); persist(lots,v,rexineStock,rexineRules,rexineLedger); }
  function setRexineStock(fn){ const v=typeof fn==="function"?fn(rexineStock):fn; setRexineStockRaw(v); persist(lots,workers,v,rexineRules,rexineLedger); }
  function setRexineRules(fn){ const v=typeof fn==="function"?fn(rexineRules):fn; setRexineRulesRaw(v); persist(lots,workers,rexineStock,v,rexineLedger); }
  function setRexineLedger(fn){ const v=typeof fn==="function"?fn(rexineLedger):fn; setRexineLedgerRaw(v); persist(lots,workers,rexineStock,rexineRules,v); }

  const allStyles      = [...new Set(lots.map(l=>l.style))].sort();
  const allWorkerNames = [...new Set(lots.map(l=>l.assignedTo))];
  const allPlanIds     = lots.map(l=>l.id);

  const filtered = lots.filter(l=>{
    const q=searchQuery.toLowerCase().trim();
    if(q){
      const matchPlan=l.id.toLowerCase().includes(q);
      const matchStyle=l.style.toLowerCase().includes(q);
      const matchCode=(l.articleCode||"").toLowerCase().includes(q);
      const matchPO=(l.poNumber||"").toLowerCase().includes(q);
      if(!matchPlan&&!matchStyle&&!matchCode&&!matchPO) return false;
    }
    return (
      (filterStage==="All"||l.stage===filterStage)&&
      (filterWorker==="All"||l.assignedTo===filterWorker)&&
      (filterBrand==="All"||l.brand===filterBrand)&&
      (filterStyle==="All"||l.style===filterStyle)
    );
  });

  const grandIssued   = lots.reduce((a,l)=>a+totalIssued(l),0);
  const grandReceived = lots.reduce((a,l)=>a+totalReceived(l),0);
  const inProgress    = lots.filter(l=>l.stage!=="Received").length;
  const atRisk        = lots.filter(l=>l.assignedTo!=="In-House"&&l.stage!=="Received").length;

  // ── Rexine stock deduction logic ──
  function deductRexine(color, gsm, meters, planId, planStyle) {
    if (!color || !gsm || !meters) return;
    setRexineStock(prev => prev.map(r =>
      rexineKey(r.color,r.gsm)===rexineKey(color,gsm) ? { ...r, meters: Math.max(0, r.meters - meters) } : r
    ));
    setRexineLedger(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      date: new Date().toISOString().slice(0,10),
      planId, style: planStyle, color, gsm, metersUsed: meters, type: "deduction"
    }]);
  }
  function refundRexine(color, gsm, meters, planId, planStyle) {
    if (!color || !gsm || !meters) return;
    setRexineStock(prev => prev.map(r =>
      rexineKey(r.color,r.gsm)===rexineKey(color,gsm) ? { ...r, meters: r.meters + meters } : r
    ));
    setRexineLedger(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      date: new Date().toISOString().slice(0,10),
      planId, style: planStyle, color, gsm, metersUsed: -meters, type: "refund (plan edited/deleted)"
    }]);
  }

  function saveLot(data){
    if(editLot){
      // Refund old consumption, then deduct new
      if (editLot.rexineColor && editLot.rexineConsumed) {
        refundRexine(editLot.rexineColor, editLot.rexineGsm, editLot.rexineConsumed, editLot.id, editLot.style);
      }
      if (data.rexineColor && data.rexineConsumed) {
        deductRexine(data.rexineColor, data.rexineGsm, data.rexineConsumed, data.id, data.style);
      }
      setLots(prev=>prev.map(l=>l.id===editLot.id?data:l));
    } else {
      if (data.rexineColor && data.rexineConsumed) {
        deductRexine(data.rexineColor, data.rexineGsm, data.rexineConsumed, data.id, data.style);
      }
      setLots(prev=>[...prev,data]);
    }
    setShowForm(false); setEditLot(null);
  }
  function advanceStage(id){
    setLots(prev=>prev.map(l=>{
      if(l.id!==id) return l;
      const idx=STAGES.indexOf(l.stage);
      if(idx<STAGES.length-1){
        const next=STAGES[idx+1];
        return {...l,stage:next,sizes:next==="Received"?l.sizes.map(s=>({...s,receivedPairs:s.totalPairs})):l.sizes};
      }
      return l;
    }));
  }
  function handlePartialReceive(id,updatedSizes,newStage){
    setLots(prev=>prev.map(l=>l.id===id?{...l,sizes:updatedSizes,stage:newStage}:l));
    setPartialLot(null);
  }
  function handleDeleteLot(id){
    const lot = lots.find(l=>l.id===id);
    if (lot && lot.rexineColor && lot.rexineConsumed) {
      refundRexine(lot.rexineColor, lot.rexineGsm, lot.rexineConsumed, lot.id, lot.style);
    }
    setLots(prev=>prev.filter(l=>l.id!==id));
    setDeleteLot(null);
  }
  function handleSaveSettings(nw,wRen){
    setLots(prev=>prev.map(l=>({...l,assignedTo:wRen[l.assignedTo]||l.assignedTo})));
    setWorkers(nw);
    if(wRen[filterWorker]) setFilterWorker("All");
    setShowSettings(false);
  }

  // Rexine stock CRUD
  function saveStock(data){
    setRexineStock(prev=>{
      const existing = prev.find(r=>rexineKey(r.color,r.gsm)===rexineKey(data.color,data.gsm));
      if (editStock) {
        return prev.map(r=>rexineKey(r.color,r.gsm)===rexineKey(editStock.color,editStock.gsm)?{...r,meters:data.meters,supplier:data.supplier}:r);
      }
      if (existing) {
        return prev.map(r=>rexineKey(r.color,r.gsm)===rexineKey(data.color,data.gsm)?{...r,meters:r.meters+data.meters,supplier:data.supplier||r.supplier}:r);
      }
      return [...prev, data];
    });
    setShowStockForm(false); setEditStock(null);
  }
  function handleDeleteStock(key){
    setRexineStock(prev=>prev.filter(r=>rexineKey(r.color,r.gsm)!==key));
    setDeleteStock(null);
  }

  // Rexine rule CRUD
  function saveRule(data){
    if (editRule) {
      setRexineRules(prev=>prev.map(r=>r.style.toLowerCase()===editRule.style.toLowerCase()?data:r));
    } else {
      setRexineRules(prev=>[...prev.filter(r=>r.style.toLowerCase()!==data.style.toLowerCase()),data]);
    }
    setShowRuleForm(false); setEditRule(null);
  }
  function handleDeleteRule(style){
    setRexineRules(prev=>prev.filter(r=>r.style!==style));
    setDeleteRule(null);
  }

  const anyFilter=filterStage!=="All"||filterStyle!=="All"||filterWorker!=="All"||filterBrand!=="All"||searchQuery!=="";
  const fBtn=(val,active,color,onClick)=>(
    <button key={val} onClick={onClick} style={{ background:active?color+"22":"#fff", color:active?color:C.muted, border:`1px solid ${active?color:C.border}`, borderRadius:20, padding:"4px 13px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{val}</button>
  );

  const totalMeters = rexineStock.reduce((a,r)=>a+r.meters,0);
  const lowStockItems = rexineStock.filter(r=>r.meters<20);

  if (!authed) {
    return <LoginScreen onLogin={()=>setAuthed(true)} />;
  }

  function handleLogout() {
    try { localStorage.removeItem("rkp_authed"); } catch {}
    setAuthed(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'IBM Plex Sans',sans-serif", color:C.text, padding:"28px 24px" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=DM+Mono:wght@500;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ fontSize:11, color:C.blue, letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:700, marginBottom:5 }}>Radha Krishna Polymers</div>
            <h1 style={{ fontSize:26, fontWeight:800, margin:0, letterSpacing:"-0.02em", color:C.text }}>Upper Tracker & Rexine Inventory</h1>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <SyncBadge status={syncStatus} />
            <button onClick={handleLogout} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:20, padding:"4px 12px", color:C.muted, fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>🔒 Logout</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:6, marginTop:20, borderBottom:`2px solid ${C.border2}` }}>
          <button onClick={()=>setActiveTab("tracker")} style={{
            background:"none", border:"none", borderBottom:activeTab==="tracker"?`3px solid ${C.blue}`:"3px solid transparent",
            color:activeTab==="tracker"?C.blue:C.muted, fontWeight:700, fontSize:14, padding:"10px 18px", cursor:"pointer", fontFamily:"inherit", marginBottom:-2
          }}>📋 Upper Tracker</button>
          <button onClick={()=>setActiveTab("rexine")} style={{
            background:"none", border:"none", borderBottom:activeTab==="rexine"?"3px solid #7C3AED":"3px solid transparent",
            color:activeTab==="rexine"?"#7C3AED":C.muted, fontWeight:700, fontSize:14, padding:"10px 18px", cursor:"pointer", fontFamily:"inherit", marginBottom:-2
          }}>🧵 Rexine Inventory {lowStockItems.length>0 && <span style={{background:"#FEE2E2",color:"#DC2626",borderRadius:10,padding:"1px 7px",fontSize:10,marginLeft:6}}>{lowStockItems.length} low</span>}</button>
        </div>
      </div>

      {/* ═══════════ TRACKER TAB ═══════════ */}
      {activeTab==="tracker" && (
        <>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            <button onClick={()=>setShowReport(true)} style={{...btnGhost, fontSize:13, color:"#059669", borderColor:"#059669"}}>📊 Monthly Report</button>
            <button onClick={()=>setShowSettings(true)} style={{...btnGhost, fontSize:13}}>⚙️ Settings</button>
            <button onClick={()=>{setEditLot(null);setShowForm(true);}} style={{...btnPrimary, fontSize:13, padding:"10px 20px"}}>+ New Plan</button>
          </div>

          <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
            <StatCard label="Total Plans"    value={lots.length}   accent={C.blue}   />
            <StatCard label="Pairs Issued"   value={grandIssued}   accent="#7C3AED"  />
            <StatCard label="Pairs Received" value={grandReceived}  accent="#059669"  sub={`${grandIssued>0?Math.round(grandReceived/grandIssued*100):0}% complete`} />
            <StatCard label="In Progress"    value={inProgress}    accent="#D97706"  />
            <StatCard label="Job Workers"    value={atRisk}        accent="#DB2777"  />
          </div>

          <div style={{ marginBottom:12 }}>
            <input type="text" placeholder="🔍  Search by Plan No., Article, Article Code or PO No…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
              style={{...inputStyle, fontSize:14, padding:"11px 16px", borderRadius:10, boxShadow:"0 1px 4px #0001"}} />
          </div>

          <div style={{ background:C.surface, border:`1px solid ${C.border2}`, borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, minWidth:52 }}>Stage</span>
              {["All",...STAGES].map(s=>fBtn(s,filterStage===s,STAGE_COLORS[s]||C.blue,()=>setFilterStage(s)))}
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, minWidth:52 }}>Article</span>
              <select value={filterStyle} onChange={e=>setFilterStyle(e.target.value)}
                style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:20, padding:"4px 14px", color:filterStyle!=="All"?"#7C3AED":C.muted, fontSize:12, fontFamily:"inherit" }}>
                <option value="All">All</option>{allStyles.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, minWidth:52 }}>Brand</span>
              <select value={filterWorker} onChange={e=>setFilterWorker(e.target.value)}
                style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:20, padding:"4px 14px", color:filterWorker!=="All"?"#D97706":C.muted, fontSize:12, fontFamily:"inherit" }}>
                <option>All</option>{allWorkerNames.map(w=><option key={w}>{w}</option>)}
              </select>
              <select value={filterBrand} onChange={e=>setFilterBrand(e.target.value)}
                style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:20, padding:"4px 14px", color:filterBrand!=="All"?"#DB2777":C.muted, fontSize:12, fontFamily:"inherit" }}>
                <option>All</option>{BRANDS.map(b=><option key={b}>{b}</option>)}
              </select>
              {anyFilter&&<button onClick={()=>{setFilterStage("All");setFilterStyle("All");setFilterWorker("All");setFilterBrand("All");setSearchQuery("");}}
                style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:20, padding:"4px 12px", color:C.muted, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>✕ Clear All</button>}
            </div>
          </div>

          <div style={{ fontSize:12, color:C.faint, marginBottom:10 }}>Showing {filtered.length} of {lots.length} plans</div>

          <div style={{ overflowX:"auto", background:C.surface, borderRadius:12, border:`1px solid ${C.border2}` }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.border2}`, background:C.bg }}>
                  {["Plan No.","PO No.","Brand","Article / Style","Color","Assigned To","Issue Date","Size-wise Pairs","Total","Stage","Actions"].map(h=>(
                    <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:C.muted, fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:"0.07em", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {syncStatus==="loading"?(
                  <tr><td colSpan={11} style={{ textAlign:"center", padding:"48px 0", color:C.muted }}>Loading plans from cloud…</td></tr>
                ):filtered.length===0?(
                  <tr><td colSpan={11} style={{ textAlign:"center", padding:"48px 0", color:C.faint, fontSize:14 }}>
                    {lots.length===0?"No plans yet. Tap + New Plan to get started.":"No plans match this filter or search."}
                  </td></tr>
                ):filtered.map((lot,i)=>{
                  const issued=totalIssued(lot), received=totalReceived(lot);
                  const isPending=lot.stage!=="Received";
                  return (
                    <tr key={lot.id}
                      style={{ borderBottom:`1px solid ${C.border2}`, background:i%2===0?C.surface:C.rowAlt, transition:"background 0.1s" }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.rowHover}
                      onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.surface:C.rowAlt}
                    >
                      <td style={{ padding:"12px 14px", fontFamily:"'DM Mono',monospace", color:C.blue, fontWeight:700, fontSize:12 }}>{lot.id}</td>
                      <td style={{ padding:"12px 14px", fontFamily:"'DM Mono',monospace", color:"#7C3AED", fontSize:12 }}>{lot.poNumber||"—"}</td>
                      <td style={{ padding:"12px 14px", color:C.muted, fontSize:12 }}>{lot.brand||"—"}</td>
                      <td style={{ padding:"12px 14px", fontWeight:600 }}>
                        <button onClick={()=>setFilterStyle(lot.style===filterStyle?"All":lot.style)}
                          style={{ background:"none", border:"none", color:filterStyle===lot.style?"#7C3AED":C.text, fontWeight:600, cursor:"pointer", fontFamily:"inherit", fontSize:13, padding:0, textDecoration:filterStyle===lot.style?"underline":"none" }}>
                          {lot.style}
                        </button>
                        {lot.articleCode&&<div style={{ fontSize:11, color:C.faint, marginTop:2 }}>({lot.articleCode})</div>}
                        {lot.rexineColor&&<div style={{ fontSize:10, color:"#7C3AED", marginTop:2 }}>🧵 {lot.rexineColor} {lot.rexineGsm} · {lot.rexineConsumed?.toFixed(1)}m</div>}
                      </td>
                      <td style={{ padding:"12px 14px", color:C.muted }}>{lot.color}</td>
                      <td style={{ padding:"12px 14px" }}><span style={{ color:lot.assignedTo==="In-House"?"#059669":"#D97706", fontWeight:600 }}>{lot.assignedTo}</span></td>
                      <td style={{ padding:"12px 14px", color:C.faint, fontFamily:"'DM Mono',monospace", fontSize:12 }}>{lot.issuedDate}</td>
                      <td style={{ padding:"12px 14px" }}><SizeBreakdown sizes={lot.sizes} /></td>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:12, color:received===issued?"#059669":received>0?"#D97706":"#DC2626" }}>{received}/{issued}</div>
                        <div style={{ fontSize:10, color:C.faint, marginTop:2 }}>pairs</div>
                      </td>
                      <td style={{ padding:"12px 14px", minWidth:160 }}>
                        <StageChip stage={lot.stage} />
                        <StageBar stage={lot.stage} />
                      </td>
                      <td style={{ padding:"12px 14px" }}>
                        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                          <button onClick={()=>{setEditLot(lot);setShowForm(true);}} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 10px", color:C.muted, fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>Edit</button>
                          {isPending&&<button onClick={()=>setPartialLot(lot)} style={{ background:"#FEF3C7", border:"1px solid #D97706", borderRadius:6, padding:"5px 10px", color:"#D97706", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>+ Pairs</button>}
                          {isPending&&<button onClick={()=>advanceStage(lot.id)} style={{ background:"#D1FAE5", border:"1px solid #059669", borderRadius:6, padding:"5px 10px", color:"#059669", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>→ Next</button>}
                          <button onClick={()=>setPrintLot(lot)} style={{ background:"#EFF6FF", border:"1px solid #2563EB", borderRadius:6, padding:"5px 10px", color:"#2563EB", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>🖨</button>
                          <button onClick={()=>setDeleteLot(lot)} style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:6, padding:"5px 10px", color:"#DC2626", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.some(l=>l.notes)&&(
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10, fontWeight:600 }}>Notes</div>
              {filtered.filter(l=>l.notes).map(l=>(
                <div key={l.id} style={{ background:C.surface, border:`1px solid ${C.border2}`, borderRadius:8, padding:"10px 16px", marginBottom:8, fontSize:13, display:"flex", gap:16, flexWrap:"wrap" }}>
                  <span style={{ color:C.blue, fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:12 }}>{l.id}</span>
                  <span style={{ color:"#7C3AED", fontFamily:"'DM Mono',monospace", fontSize:12 }}>{l.poNumber}</span>
                  <span style={{ color:C.muted }}>{l.notes}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════ REXINE TAB ═══════════ */}
      {activeTab==="rexine" && (
        <>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            <button onClick={()=>{setEditRule(null);setShowRuleForm(true);}} style={{...btnGhost, fontSize:13, color:"#7C3AED", borderColor:"#7C3AED"}}>+ Consumption Rule</button>
            <button onClick={()=>{setEditStock(null);setShowStockForm(true);}} style={{...btnPrimary, fontSize:13, padding:"10px 20px", background:"#7C3AED"}}>+ Add Stock</button>
          </div>

          <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
            <StatCard label="Total Meters"    value={totalMeters.toFixed(1)} accent="#7C3AED" />
            <StatCard label="Rexine Types"    value={rexineStock.length}     accent={C.blue}  />
            <StatCard label="Consumption Rules" value={rexineRules.length}   accent="#059669" />
            <StatCard label="Low Stock"       value={lowStockItems.length}   accent="#DC2626" sub="< 20m remaining" />
          </div>

          {lowStockItems.length>0 && (
            <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:10, padding:"12px 16px", marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#DC2626", marginBottom:6 }}>⚠ Low Stock Alert</div>
              <div style={{ fontSize:12, color:"#991B1B" }}>
                {lowStockItems.map(r=>`${r.color} ${r.gsm} (${r.meters.toFixed(1)}m left)`).join(" · ")}
              </div>
            </div>
          )}

          {/* Stock Table */}
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:10 }}>📦 Current Stock</div>
          <div style={{ overflowX:"auto", background:C.surface, borderRadius:12, border:`1px solid ${C.border2}`, marginBottom:24 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.border2}`, background:C.bg }}>
                  {["Color","GSM/Quality","Meters Available","Supplier","Actions"].map(h=>(
                    <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:C.muted, fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rexineStock.length===0?(
                  <tr><td colSpan={5} style={{ textAlign:"center", padding:"32px 0", color:C.faint, fontSize:14 }}>No rexine stock added yet.</td></tr>
                ):rexineStock.map((r,i)=>(
                  <tr key={rexineKey(r.color,r.gsm)} style={{ borderBottom:`1px solid ${C.border2}`, background:i%2===0?C.surface:C.rowAlt }}>
                    <td style={{ padding:"12px 14px", fontWeight:600 }}>{r.color}</td>
                    <td style={{ padding:"12px 14px", color:C.muted }}>{r.gsm}</td>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:14, color:r.meters<20?"#DC2626":r.meters<50?"#D97706":"#059669" }}>{r.meters.toFixed(1)}m</span>
                    </td>
                    <td style={{ padding:"12px 14px", color:C.faint, fontSize:12 }}>{r.supplier||"—"}</td>
                    <td style={{ padding:"12px 14px" }}>
                      <div style={{ display:"flex", gap:5 }}>
                        <button onClick={()=>{setEditStock(r);setShowStockForm(true);}} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 10px", color:C.muted, fontSize:11, cursor:"pointer", fontWeight:600 }}>Edit</button>
                        <button onClick={()=>setDeleteStock({key:rexineKey(r.color,r.gsm), label:`${r.color} ${r.gsm}`})} style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:6, padding:"5px 10px", color:"#DC2626", fontSize:11, cursor:"pointer", fontWeight:600 }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Consumption Rules Table */}
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:10 }}>📐 Consumption Rules (Meters per Pair by Article)</div>
          <div style={{ overflowX:"auto", background:C.surface, borderRadius:12, border:`1px solid ${C.border2}`, marginBottom:24 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.border2}`, background:C.bg }}>
                  {["Article/Style","Rexine Used","Size-wise Meters/Pair","Actions"].map(h=>(
                    <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:C.muted, fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rexineRules.length===0?(
                  <tr><td colSpan={4} style={{ textAlign:"center", padding:"32px 0", color:C.faint, fontSize:14 }}>No consumption rules set yet. Add one so plans can auto-deduct stock.</td></tr>
                ):rexineRules.map((r,i)=>(
                  <tr key={r.style} style={{ borderBottom:`1px solid ${C.border2}`, background:i%2===0?C.surface:C.rowAlt }}>
                    <td style={{ padding:"12px 14px", fontWeight:600 }}>{r.style}</td>
                    <td style={{ padding:"12px 14px", color:"#7C3AED", fontSize:12 }}>{r.rexineColor} {r.rexineGsm}</td>
                    <td style={{ padding:"12px 14px", fontSize:12, color:C.muted }}>
                      {r.consumption.map(c=>`S${c.size}:${c.metersPerPair}m`).join(", ")}
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <div style={{ display:"flex", gap:5 }}>
                        <button onClick={()=>{setEditRule(r);setShowRuleForm(true);}} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 10px", color:C.muted, fontSize:11, cursor:"pointer", fontWeight:600 }}>Edit</button>
                        <button onClick={()=>setDeleteRule({id:r.style, label:r.style})} style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:6, padding:"5px 10px", color:"#DC2626", fontSize:11, cursor:"pointer", fontWeight:600 }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ledger */}
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:10 }}>📜 Recent Stock Movements</div>
          <div style={{ overflowX:"auto", background:C.surface, borderRadius:12, border:`1px solid ${C.border2}` }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.border2}`, background:C.bg }}>
                  {["Date","Plan No.","Article","Rexine","Meters","Type"].map(h=>(
                    <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:C.muted, fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rexineLedger.length===0?(
                  <tr><td colSpan={6} style={{ textAlign:"center", padding:"32px 0", color:C.faint, fontSize:14 }}>No stock movements yet.</td></tr>
                ):[...rexineLedger].reverse().slice(0,30).map(entry=>(
                  <tr key={entry.id} style={{ borderBottom:`1px solid ${C.border2}` }}>
                    <td style={{ padding:"10px 14px", color:C.faint, fontFamily:"'DM Mono',monospace", fontSize:12 }}>{entry.date}</td>
                    <td style={{ padding:"10px 14px", color:C.blue, fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:700 }}>{entry.planId}</td>
                    <td style={{ padding:"10px 14px" }}>{entry.style}</td>
                    <td style={{ padding:"10px 14px", color:"#7C3AED", fontSize:12 }}>{entry.color} {entry.gsm}</td>
                    <td style={{ padding:"10px 14px", fontFamily:"'DM Mono',monospace", fontWeight:700, color:entry.metersUsed<0?"#059669":"#DC2626" }}>
                      {entry.metersUsed<0?"+":"-"}{Math.abs(entry.metersUsed).toFixed(2)}m
                    </td>
                    <td style={{ padding:"10px 14px", fontSize:11, color:C.faint }}>{entry.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modals */}
      {partialLot   &&<PartialReceiveModal lot={partialLot} onSave={handlePartialReceive} onClose={()=>setPartialLot(null)} />}
      {deleteLot    &&<DeleteModal lot={deleteLot} label="Plan" onConfirm={handleDeleteLot} onClose={()=>setDeleteLot(null)} />}
      {printLot     &&<PrintModal lot={printLot} onClose={()=>setPrintLot(null)} />}
      {showReport   &&<ReportModal lots={lots} onClose={()=>setShowReport(false)} />}
      {showSettings &&<SettingsPanel workers={workers} onSave={handleSaveSettings} onClose={()=>setShowSettings(false)} />}
      {showForm     &&<PlanModal editLot={editLot} workers={workers} allPlanIds={editLot?allPlanIds.filter(id=>id!==editLot.id):allPlanIds} rexineRules={rexineRules} rexineStock={rexineStock} onSave={saveLot} onClose={()=>{setShowForm(false);setEditLot(null);}} />}
      {showStockForm&&<RexineStockModal editStock={editStock} onSave={saveStock} onClose={()=>{setShowStockForm(false);setEditStock(null);}} />}
      {deleteStock  &&<DeleteModal lot={deleteStock} label="Stock Item" onConfirm={handleDeleteStock} onClose={()=>setDeleteStock(null)} />}
      {showRuleForm &&<RexineMasterModal editItem={editRule} rexineStock={rexineStock} onSave={saveRule} onClose={()=>{setShowRuleForm(false);setEditRule(null);}} />}
      {deleteRule   &&<DeleteModal lot={deleteRule} label="Rule" onConfirm={handleDeleteRule} onClose={()=>setDeleteRule(null)} />}
    </div>
  );
}
