// ⚠️ INSERT YOUR FULL APP CODE HERE
export default function App(){ return <h1>ADD Green — déposez votre App.jsx complet ici</h1>; }

import { useState, useEffect, useRef } from "react";
// ══════════════════════════════════════════════════════════════════════
//  SUPABASE CONFIG — Remplacez par vos vraies clés après création
// ══════════════════════════════════════════════════════════════════════
const SUPABASE_URL = localStorage.getItem("sb_url") || "";
const SUPABASE_KEY = localStorage.getItem("sb_key") || "";
// ── Supabase client (chargé via CDN) ─────────────────────────────────
let supabase = null;
function getSupabase() {
  if (supabase) return supabase;
  if (!SUPABASE_URL || !SUPABASE_KEY || !window.supabase) return null;
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabase;
}
// ── Load Supabase SDK via CDN ─────────────────────────────────────────
function useSupabaseReady() {
  const [ready, setReady] = useState(!!window.supabase);
  useEffect(() => {
    if (window.supabase) { setReady(true); return; }
    if (!document.getElementById("sb-sdk")) {
      const s = document.createElement("script");
      s.id = "sb-sdk";
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
      s.onload = () => setReady(true);
      document.head.appendChild(s);
    }
  }, []);
  return ready;
}
// ── isConfigured ─────────────────────────────────────────────────────
const isConfigured = () => !!(localStorage.getItem("sb_url") && localStorage.getItem("sb_key"));
// ── Hybrid DB layer ───────────────────────────────────────────────────
// Falls back to localStorage if Supabase not configured
const SK = { parrains:"ag_parrains", agriculteurs:"ag_agriculteurs", arbres:"ag_arbres" };
const loadLocal = k => { try{ return JSON.parse(localStorage.getItem(k)||"[]"); }catch{ return []; } };
const saveLocal = (k,v) => { try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} };
const DB = {
  // ── Parrains ──
  async getParrains() {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.from("users").select("*").eq("role","parrain").order("created_at",{ascending:false});
      if (!error && data) return data.map(mapFromDB);
    }
    return loadLocal(SK.parrains);
  },
  async addParrain(rec) {
    const sb = getSupabase();
    if (sb) {
      const row = mapToDB(rec, "parrain");
      const { data, error } = await sb.from("users").insert([row]).select().single();
      if (!error && data) return { ...rec, id: data.id, _synced: true };
    }
    return rec;
  },
  // ── Agriculteurs ──
  async getAgriculteurs() {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.from("users").select("*").eq("role","exploitant").order("created_at",{ascending:false});
      if (!error && data) return data.map(mapFromDB);
    }
    return loadLocal(SK.agriculteurs);
  },
  async addAgriculteur(rec) {
    const sb = getSupabase();
    if (sb) {
      const row = mapToDB(rec, "exploitant");
      const { data, error } = await sb.from("users").insert([row]).select().single();
      if (!error && data) return { ...rec, id: data.id, _synced: true };
    }
    return rec;
  },
  // ── Arbres ──
  async getArbres() {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.from("arbres").select("*").order("created_at",{ascending:false});
      if (!error && data && data.length > 0) return data.map(mapArbreFromDB);
    }
    const local = loadLocal(SK.arbres);
    return local.length ? local : SAMPLE_TREES;
  },
  async addArbre(rec) {
    const sb = getSupabase();
    if (sb) {
      const row = {
        code_id: rec.id, variete: rec.variete, site: rec.site,
        date_plantation: rec.date, statut: rec.statut, co2: rec.co2,
        croissance: rec.croissance, parrain_nom: rec.parrain,
        duree: rec.duree, montant: rec.montant, cert_id: rec.certId,
        gps: rec.gps, lat: rec.lat, lng: rec.lng, type_arbre: rec.typeArbre,
      };
      const { data, error } = await sb.from("arbres").insert([row]).select().single();
      if (!error && data) return { ...rec, _synced: true };
    }
    return rec;
  },
  // ── Terrain updates ──
  async addUpdate(rec) {
    const sb = getSupabase();
    if (sb) {
      await sb.from("terrain_updates").insert([{
        arbre_code: rec.arbre, date_update: rec.date,
        croissance: rec.croissance, sante: rec.sante,
        production: rec.production, incident_details: rec.incident,
      }]);
    }
  },
  // ── Auth ──
  async signUp(email, password, role) {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase non configuré" };
    return await sb.auth.signUp({ email, password, options: { data: { role } } });
  },
  async signIn(email, password) {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase non configuré" };
    return await sb.auth.signInWithPassword({ email, password });
  },
  async signOut() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
  },
  async getSession() {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session;
  },
};
// ── Mapping helpers DB ↔ App ──────────────────────────────────────────
function mapToDB(rec, role) {
  return {
    nom: rec.nom, tel: rec.tel, lieu: rec.lieu,
    langues: rec.langues, role,
    photo_profil: rec.photoProfil ? rec.photoProfil.substring(0,2000) : null, // limit base64 size
    cert_id: rec.certId, date_inscription: rec.dateInscription,
    type_parrain: rec.typeParrain, espece: rec.espece,
    budget: rec.budget ? Number(rec.budget) : null,
    superficie: rec.superficie ? Number(rec.superficie) : null,
    localisation: rec.localisation, type_sol: rec.typeSol,
    engagement_arbres: rec.engagementArbres ? Number(rec.engagementArbres) : null,
    densite_plantation: rec.densitePlantation, irrigation: rec.irrigation,
    gps: rec.gps,
    photos_plantation: (rec.photosPlantation||[]).map(p=>p.substring(0,1000)),
  };
}
function mapFromDB(row) {
  return {
    id: row.id, nom: row.nom, tel: row.tel, lieu: row.lieu,
    langues: row.langues||[], role: row.role,
    photoProfil: row.photo_profil,
    certId: row.cert_id, dateInscription: row.date_inscription,
    typeParrain: row.type_parrain, espece: row.espece,
    budget: row.budget, superficie: row.superficie,
    localisation: row.localisation, typeSol: row.type_sol,
    engagementArbres: row.engagement_arbres,
    densitePlantation: row.densite_plantation, irrigation: row.irrigation,
    gps: row.gps, photosPlantation: row.photos_plantation||[],
    _synced: true,
  };
}
function mapArbreFromDB(row) {
  return {
    id: row.code_id, variete: row.variete, site: row.site,
    date: row.date_plantation, statut: row.statut||"bon",
    co2: row.co2, croissance: row.croissance,
    parrain: row.parrain_nom, duree: row.duree||5,
    montant: row.montant||100, certId: row.cert_id,
    gps: row.gps, lat: row.lat, lng: row.lng,
    typeArbre: row.type_arbre, _synced: true,
  };
}
// ── Cert ID ────────────────────────────────────────────────────────────
const makeCertId = () => `ADD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random()*9000+1000)}`;
// ── QR SVG ─────────────────────────────────────────────────────────────
function QR({ text, size=100 }) {
  let h=0; for(let i=0;i<text.length;i++){h=((h<<5)-h)+text.charCodeAt(i);h|=0;}
  const C=21,cell=size/C,r=[];
  for(let row=0;row<C;row++) for(let col=0;col<C;col++){
    const TL=row<7&&col<7,TR=row<7&&col>=C-7,BL=row>=C-7&&col<7,F=TL||TR||BL;
    if(F){const e=row===0||row===6||col===0||col===6||(TR&&(col===C-7||col===C-1))||(BL&&(row===C-7||row===C-1));const c=(row>=2&&row<=4&&col>=2&&col<=4)||(row>=2&&row<=4&&col>=C-5&&col<=C-3)||(row>=C-5&&row<=C-3&&col>=2&&col<=4);if(e||c)r.push(<rect key={`${row}-${col}`} x={col*cell+.5} y={row*cell+.5} width={cell-1} height={cell-1} fill="#1a6b35" rx={1}/>);}
    else{const b=((h^(row*37+col*13+row*col))&(1<<((row+col)%32)))!==0;if(b)r.push(<rect key={`${row}-${col}`} x={col*cell+1} y={row*cell+1} width={cell-2} height={cell-2} fill="#1a6b35" rx={.5}/>);}
  }
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{borderRadius:6}}><rect width={size} height={size} fill="#f5fdf6"/>{r}</svg>;
}
// ── Canvas Certificate ─────────────────────────────────────────────────
async function renderCert(tree) {
  return new Promise(resolve => {
    const W=800,H=1150,cv=document.createElement("canvas");
    cv.width=W;cv.height=H;
    const ctx=cv.getContext("2d");
    const G="#1a6b35",G2="#2d9e56",GOLD="#b8902a";
    ctx.fillStyle=G;ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#faf8f2";ctx.beginPath();ctx.roundRect(16,16,W-32,H-32,18);ctx.fill();
    ctx.strokeStyle=GOLD;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(24,24,W-48,H-48,14);ctx.stroke();
    const hg=ctx.createLinearGradient(0,0,W,0);hg.addColorStop(0,G);hg.addColorStop(1,G2);
    ctx.fillStyle=hg;ctx.beginPath();ctx.roundRect(16,16,W-32,118,{upperLeft:18,upperRight:18,lowerLeft:0,lowerRight:0});ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.18)";ctx.beginPath();ctx.arc(W/2,65,34,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="bold 15px Arial";ctx.textAlign="center";ctx.fillText("ADD",W/2,58);
    ctx.font="bold 11px Arial";ctx.fillText("GREEN",W/2,73);ctx.font="18px Arial";ctx.fillText("
    ctx.fillStyle="rgba(200,235,200,0.95)";ctx.font="11px Arial";
    ctx.fillText("Association pour le Développement Durable — Province de Taounate ",W/2,108);
    ctx.fillText("Un arbre parrainé aujourd'hui, une olive durable demain",W/2,122);
    ctx.fillStyle="#FFD700";ctx.beginPath();ctx.roundRect(W/2-150,138,300,30,15);ctx.fill();
    ctx.fillStyle="#1a1a1a";ctx.font="bold 13px Arial";ctx.fillText("  CERTIFICAT PREMIUM ADD GREEN  
    ctx.fillStyle=G;ctx.font="bold 26px Arial";ctx.fillText("CERTIFICAT DE PARRAINAGE OFFICIEL",W/2,205);
    ctx.strokeStyle=GOLD;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(70,215);ctx.lineTo(W-70,215);ctx.stroke();
    ctx.fillStyle="#777";ctx.font="13px Arial";ctx.fillText("L'Association ADD certifie que :",W/2,244);
    ctx.fillStyle="#e8f5e9";ctx.beginPath();ctx.roundRect(90,252,W-180,46,10);ctx.fill();
    ctx.strokeStyle=G;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(90,252,W-180,46,10);ctx.stroke();
    ctx.fillStyle=G;ctx.font="bold 20px Arial";ctx.fillText(tree.parrain||"—",W/2,282);
    ctx.fillStyle="#777";ctx.font="13px Arial";ctx.fillText("parraine officiellement l'arbre suivant :",W/2,316);
    ctx.fillStyle="#f0faf2";ctx.beginPath();ctx.roundRect(50,326,W-100,188,14);ctx.fill();
    ctx.strokeStyle=G2;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(50,326,W-100,188,14);ctx.stroke();
    ctx.fillStyle=G;ctx.font="bold 24px Arial";ctx.fillText(tree.id||"—",W/2,362);
    ctx.fillStyle="#444";ctx.font="15px Arial";ctx.fillText(tree.variete||"—",W/2,385);
    ctx.fillStyle="#888";ctx.font="12px Arial";ctx.fillText(" "+(tree.site||"—"),W/2,405);
    const gps=tree.gps||"N/A";ctx.fillText(" GPS: "+gps,W/2,422);
    const info=[[" Planté le",tree.date||"—"],[" Croissance",(tree.croissance||"—")+" cm"],["
    ctx.textAlign="left";
    info.forEach(([k,v],i)=>{const col=i%2,row=Math.floor(i/2),x=col===0?72:W/2+30,y=438+row*32;ctx.fillStyle="#aaa";ctx.font="10px Arial";ctx.fillText(k,x,y);ctx.fillStyle=G;ctx.font="bold 13px Arial";ctx.fillText(v,x,y+15);});
    ctx.textAlign="center";
    ctx.fillStyle=G;ctx.font="bold 13px Arial";ctx.fillText("QR Code de Traçabilité",W/2,558);
    const qS=112,qX=W/2-qS/2,qY=570;
    ctx.fillStyle="#f5fdf6";ctx.beginPath();ctx.roundRect(qX-8,qY-8,qS+16,qS+16,10);ctx.fill();
    ctx.strokeStyle=G2;ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(qX-8,qY-8,qS+16,qS+16,10);ctx.stroke();
    const qt=`addgreen.vercel.app/verify/${tree.certId||""}`;let qh=0;for(let i=0;i<qt.length;i++){qh=((qh<<5)-qh)+qt.charCodeAt(i);qh|=0;}
    const qcells=21,qcell=qS/qcells;
    for(let r=0;r<qcells;r++)for(let c=0;c<qcells;c++){const TL=r<7&&c<7,TR=r<7&&c>=qcells-7,BL=r>=qcells-7&&c<7,F=TL||TR||BL;let draw=false;if(F){const e=r===0||r===6||c===0||c===6||(TR&&(c===qcells-7||c===qcells-1))||(BL&&(r===qcells-7||r===qcells-1));const ct=(r>=2&&r<=4&&c>=2&&c<=4)||(r>=2&&r<=4&&c>=qcells-5&&c<=qcells-3)||(r>=qcells-5&&r<=qcells-3&&c>=2&&c<=4);draw=e||ct;}else draw=((qh^(r*37+c*13+r*c))&(1<<((r+c)%32)))!==0;if(draw){ctx.fillStyle=G;ctx.fillRect(qX+c*qcell+1,qY+r*qcell+1,qcell-1.5,qcell-1.5);}}
    ctx.fillStyle="#888";ctx.font="11px Arial";ctx.fillText("Scan → vérification officielle",W/2,698);
    ctx.fillStyle="#2980b9";ctx.font="bold 11px Arial";ctx.fillText(`addgreen.vercel.app/verify/${tree.certId||""}`,W/2,714);
    const igr=ctx.createLinearGradient(0,0,W,0);igr.addColorStop(0,G);igr.addColorStop(1,G2);ctx.fillStyle=igr;ctx.beginPath();ctx.roundRect(50,728,W-100,54,12);ctx.fill();
    [[`${tree.co2||"—"} kg`,"CO₂"],[`${tree.co2?tree.co2*4:"—"} km`,"Voiture évités"],[`${tree.duree||"—"} ans`,"Engagement"],["
    ctx.fillStyle="#f0f0f0";ctx.beginPath();ctx.roundRect(50,794,W-100,46,10);ctx.fill();
    ctx.textAlign="left";ctx.fillStyle="#aaa";ctx.font="10px Arial";ctx.fillText("N° CERTIFICAT",64,810);ctx.fillStyle=G;ctx.font="bold 14px Arial";ctx.fillText(tree.certId||"—",64,827);
    ctx.textAlign="center";ctx.strokeStyle="#ddd";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(72,868);ctx.lineTo(240,868);ctx.stroke();ctx.beginPath();ctx.moveTo(W-240,868);ctx.lineTo(W-72,868);ctx.stroke();
    ctx.fillStyle="#bbb";ctx.font="11px Arial";ctx.fillText("Signature du Parrain",156,884);ctx.fillText("Président — Association ADD",W-156,884);
    ctx.fillStyle="#ccc";ctx.font="11px Arial";ctx.fillText(`Émis le ${new Date().toLocaleDateString("fr-FR")} 
    const fg=ctx.createLinearGradient(0,0,W,0);fg.addColorStop(0,G);fg.addColorStop(1,G2);ctx.fillStyle=fg;ctx.beginPath();ctx.roundRect(16,H-54,W-32,38,{upperLeft:0,upperRight:0,lowerLeft:18,lowerRight:18});ctx.fill();
    ctx.fillStyle="rgba(200,235,200,0.9)";ctx.font="11px Arial";ctx.fillText("ADD Green — Un arbre parrainé aujourd'hui, une olive durable demain 
    resolve(cv.toDataURL("image/png",0.95));
  });
}
// ══════════════════════════════════════════════════════════════════════
const SC={HOME:"home",LOGIN:"login",REGISTER:"register",PARRAIN:"parrain",TREE:"tree",EXPLOITANT:"exploitant",TERRAIN:"terrain",MAP:"map",IMPACT:"impact",CERT:"cert",VERIFY:"verify",INSCRITS:"inscrits",FICHE_PARRAIN:"fiche_parrain",FICHE_AGRI:"fiche_agri",CONFIG:"config"};
const SAMPLE_TREES=[
  {id:"ARB-1256",variete:"Picholine Marocaine",site:"Ssi Mohammed Rkina",date:"15/03/2021",statut:"bon",        co2:32,croissance:42,parrain:"Hamid El Mrabet",duree:5,montant:100,certId:makeCertId(),gps:"34.5522, -4.9922",lat:34.5522,lng:-4.9922,typeArbre:"Olivier"},
  {id:"ARB-1257",variete:"Hawzia",             site:"Ssi el Khammar",   date:"20/04/2021",statut:"surveillance",co2:28,croissance:35,parrain:"Hamid El Mrabet",duree:5,montant:100,certId:makeCertId(),gps:"34.5618, -4.9844",lat:34.5618,lng:-4.9844,typeArbre:"Olivier"},
  {id:"ARB-1258",variete:"Figuier Beldi",      site:"Ssi el Khammar",   date:"10/05/2021",statut:"bon",        co2:18,croissance:29,parrain:"Fatima Zahra",   duree:5,montant:100,certId:makeCertId(),gps:"34.5601, -4.9871",lat:34.5601,lng:-4.9871,typeArbre:"Figuier"},
  {id:"ARB-1259",variete:"Caroubier Atlas",    site:"Ssi el Khammar",   date:"05/06/2021",statut:"bon",        co2:22,croissance:31,parrain:"Khalid Ameziane", duree:5,montant:100,certId:makeCertId(),gps:"34.5580, -4.9910",lat:34.5580,lng:-4.9910,typeArbre:"Caroubier"},
  {id:"ARB-1260",variete:"Picholine Marocaine",site:"Ssi Mohammed Rkina",date:"12/07/2021",statut:"incident",  co2:15,croissance:22,parrain:"Aicha Benali",   duree:5,montant:100,certId:makeCertId(),gps:"34.5490, -4.9950",lat:34.5490,lng:-4.9950,typeArbre:"Olivier"},
  {id:"ARB-1261",variete:"Figuier Beldi",      site:"Ssi Mohammed Rkina",date:"18/08/2021",statut:"bon",       co2:19,croissance:33,parrain:"Youssef Idrissi", duree:5,montant:100,certId:makeCertId(),gps:"34.5455, -4.9880",lat:34.5455,lng:-4.9880,typeArbre:"Figuier"},
];
const ST={bon:{c:"#2ecc71",l:"En Bonne Santé",e:" "},surveillance:{c:"#f39c12",l:"Surveillance",e:"
function RadioGroup({label,options,value,onChange,required=false}){
  return(<div style={{marginBottom:14}}><div style={{fontWeight:700,fontSize:13,color:"#555",marginBottom:8}}>{label}{required&&<span style={{color:"#e74c3c"}}> *</span>}</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{options.map(o=>(<button key={o} onClick={()=>onChange(o)} style={{padding:"8px 14px",borderRadius:10,border:value===o?"2px solid #1a6b35":"2px solid #e0e0e0",background:value===o?"#e8f5e9":"#fff",fontWeight:700,fontSize:12,cursor:"pointer",color:value===o?"#1a6b35":"#666"}}>{o}</button>))}</div></div>);
}
function MultiCheck({label,options,values,onChange,required=false}){
  const t=o=>onChange(values.includes(o)?values.filter(x=>x!==o):[...values,o]);
}
  return(<div style={{marginBottom:14}}><div style={{fontWeight:700,fontSize:13,color:"#555",marginBottom:8}}>{label}{required&&<span style={{color:"#e74c3c"}}> *</span>}</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{options.map(o=>(<button key={o} onClick={()=>t(o)} style={{padding:"8px 14px",borderRadius:10,border:values.includes(o)?"2px solid #1a6b35":"2px solid #e0e0e0",background:values.includes(o)?"#e8f5e9":"#fff",fontWeight:700,fontSize:12,cursor:"pointer",color:values.includes(o)?"#1a6b35":"#666"}}>{values.includes(o)?"
// ── Leaflet Map Component (loaded via CDN in useEffect) ─────────────
function LeafletMap({ trees, onTreeClick, filterType, filterSite }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  // Load Leaflet CSS + JS from CDN
  useEffect(() => {
    if (document.getElementById("leaflet-css")) { setMapReady(true); return; }
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);
  }, []);
  // Init map once Leaflet is ready
  useEffect(() => {
    if (!mapReady || !mapRef.current || leafletMap.current) return;
    const L = window.L;
    leafletMap.current = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true }).setView([34.5361, -4.8], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(leafletMap.current);
    // ADD Green watermark label
    const info = L.control({ position:"bottomright" });
    info.onAdd = () => { const d=document.createElement("div"); d.innerHTML='<div style="background:rgba(26,107,53,0.9);color:#fff;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700">
    info.addTo(leafletMap.current);
  }, [mapReady]);
  // Update markers whenever trees or filters change
  useEffect(() => {
    if (!leafletMap.current || !window.L) return;
    const L = window.L;
    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    const filtered = trees.filter(t => {
      if (filterType && filterType !== "Tous" && t.typeArbre !== filterType) return false;
      if (filterSite && filterSite !== "Tous" && t.site !== filterSite) return false;
      return true;
    });
    filtered.forEach(tree => {
      if (!tree.lat || !tree.lng) return;
      const st = ST[tree.statut] || ST.bon;
      // Custom SVG icon for each tree status
      const svgIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:${st.c};
          border:3px solid #fff;
          display:flex;align-items:center;justify-content:center;
          font-size:18px;
          box-shadow:0 4px 12px rgba(0,0,0,0.35);
          cursor:pointer;
          transition:transform 0.2s;
        ">${tree.typeArbre==="Figuier"?" ":tree.typeArbre==="Caroubier"?" ":" "}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      });
      const popup = L.popup({ maxWidth: 260, className:"addgreen-popup" }).setContent(`
        <div style="font-family:sans-serif;padding:4px">
          <div style="font-weight:900;font-size:15px;color:#1a6b35;margin-bottom:4px">${tree.id}</div>
          <div style="font-size:12px;color:#555;margin-bottom:6px">${tree.variete}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
            <span style="background:${st.c}22;color:${st.c};border-radius:12px;padding:2px 8px;font-size:11px;font-weight:700">${st.e} ${st.l}</span>
            <span style="background:#e8f5e9;color:#1a6b35;border-radius:12px;padding:2px 8px;font-size:11px;font-weight:700">
          </div>
          <table style="width:100%;font-size:11px;border-collapse:collapse">
            <tr><td style="color:#888;padding:2px 0"> Site</td><td style="font-weight:700;color:#333">${tree.site}</td></tr>
            <tr><td style="color:#888;padding:2px 0"> Parrain</td><td style="font-weight:700;color:#333">${tree.parrain}</td></tr>
            <tr><td style="color:#888;padding:2px 0"> Planté</td><td style="font-weight:700;color:#333">${tree.date}</td></tr>
            <tr><td style="color:#888;padding:2px 0"> Croissance</td><td style="font-weight:700;color:#333">${tree.croissance} cm</td></tr>
            <tr><td style="color:#888;padding:2px 0"> Équiv.</td><td style="font-weight:700;color:#1a6b35">${tree.co2*4} km évités</td></tr>
            <tr><td style="color:#888;padding:2px 0"> GPS</td><td style="font-weight:600;color:#555;font-size:10px">${tree.gps}</td></tr>
          </table>
          <button onclick="window._addgreenOpenCert('${tree.id}')" style="
            margin-top:10px;width:100%;padding:8px;
            background:linear-gradient(135deg,#1a6b35,#2d9e56);
            color:#fff;border:none;border-radius:10px;
            font-weight:800;font-size:12px;cursor:pointer;
          "> Voir le Certificat</button>
        </div>
      `);
      const marker = L.marker([tree.lat, tree.lng], { icon: svgIcon }).bindPopup(popup);
      marker.addTo(leafletMap.current);
      markersRef.current.push(marker);
    });
    // Expose cert opener globally for popup button
    window._addgreenOpenCert = (treeId) => {
      const tree = trees.find(t => t.id === treeId);
      if (tree) onTreeClick(tree);
    };
    // Fit bounds if markers exist
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      leafletMap.current.fitBounds(group.getBounds().pad(0.15));
    }
  }, [mapReady, trees, filterType, filterSite]);
  // Cleanup on unmount
  useEffect(() => () => {
    if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
  }, []);
  return (
    <div style={{position:"relative"}}>
      {!mapReady && (
        <div style={{height:380,background:"linear-gradient(135deg,#c8e6a0,#8bc34a)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10}}>
          <div style={{fontSize:32,animation:"spin 1.5s linear infinite",display:"inline-block"}}>
          <div style={{fontWeight:700,color:"#1a6b35",fontSize:14}}>Chargement de la carte...</div>
          <div style={{fontSize:12,color:"#555"}}>OpenStreetMap · Province de Taounate</div>
        </div>
      )}
      <div ref={mapRef} style={{height:380,width:"100%",display:mapReady?"block":"none",borderRadius:0}} />
      <style>{`
        .leaflet-popup-content-wrapper { border-radius:14px!important; box-shadow:0 8px 24px rgba(0,0,0,0.2)!important; }
        .leaflet-popup-tip { display:none; }
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════════
export default function App() {
  const sbReady = useSupabaseReady();
  const [screen,  setScreen]  = useState(SC.HOME);
  const [prev,    setPrev]    = useState(SC.HOME);
  const [anim,    setAnim]    = useState(true);
  const [role,    setRole]    = useState("parrain");
  // ── Auth state ──
  const [authUser,    setAuthUser]    = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authEmail,   setAuthEmail]   = useState("");
  const [authPass,    setAuthPass]    = useState("");
  const [authError,   setAuthError]   = useState("");
  // ── Supabase config (pour l'écran de configuration) ──
  const [cfgUrl, setCfgUrl] = useState(localStorage.getItem("sb_url")||"");
  const [cfgKey, setCfgKey] = useState(localStorage.getItem("sb_key")||"");
  const [cfgSaved, setCfgSaved] = useState(isConfigured());
  const [dbStatus, setDbStatus] = useState(isConfigured() ? "configured" : "not_configured");
  // "not_configured" | "configured" | "testing" | "ok" | "error"
  // ── Data state ──
  const [parrains,     setParrains]     = useState([]);
  const [agriculteurs, setAgriculteurs] = useState([]);
  const [arbresDB,     setArbresDB]     = useState([]);
  const [dataLoading,  setDataLoading]  = useState(true);
  const [certTree, setCertTree] = useState(null);
  const [certImg,  setCertImg]  = useState(null);
  const [certGen,  setCertGen]  = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [verTree,  setVerTree]  = useState(null);
  const [selTree,  setSelTree]  = useState(null);
  const [selInscrit, setSelInscrit] = useState(null);
  const [mapFilter, setMapFilter] = useState({ type:"Tous", site:"Tous" });
  const [uArbre,  setUArbre]  = useState("");
  const [uCroiss, setUCroiss] = useState("");
  const [uSante,  setUSante]  = useState("Bon");
  const [uProd,   setUProd]   = useState("");
  const [uInc,    setUInd]    = useState("");
  const [subOk,   setSubOk]   = useState(false);
  const emptyF={nom:"",tel:"",lieu:"",langues:[],role:"parrain",typeParrain:"Individuel",espece:"Indifférent",budget:"",superficie:"",localisation:"",typeSol:"Argileux",engagementArbres:"",densitePlantation:"10x10",irrigation:"Irrigué",gps:"",photoProfil:null,photosPlantation:[]};
  const [f, setF]         = useState(emptyF);
  const [regDone, setRegDone] = useState(false);
  const [regMsg,  setRegMsg]  = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [terrainPhotos, setTerrainPhotos] = useState([]);
  // ── Load all data on mount and when Supabase becomes ready ──
  const loadData = async () => {
    setDataLoading(true);
    try {
      const [p, a, ar] = await Promise.all([DB.getParrains(), DB.getAgriculteurs(), DB.getArbres()]);
      setParrains(p);
      setAgriculteurs(a);
      setArbresDB(ar);
      // Persist to localStorage as cache/fallback
      saveLocal(SK.parrains, p);
      saveLocal(SK.agriculteurs, a);
      saveLocal(SK.arbres, ar);
    } catch(e) { console.error("loadData error:", e); }
    setDataLoading(false);
  };
  useEffect(() => { loadData(); }, [sbReady]);
  // ── Check auth session on mount ──
  useEffect(() => {
    DB.getSession().then(s => { if(s) setAuthUser(s.user); });
  }, [sbReady]);
  // ── Cert render ──
  useEffect(()=>{
    if(screen===SC.CERT && certTree && !certImg){ setCertGen(true); renderCert(certTree).then(img=>{ setCertImg(img); setCertGen(false); }); }
  },[screen,certTree]);
  const setFld = (k,v) => setF(p=>({...p,[k]:v}));
  const go = (s,from) => { if(from)setPrev(from); setAnim(false); setTimeout(()=>{ setScreen(s); setAnim(true); },150); };
  const openCert   = (tree,from) => { setCertTree(tree); setCertImg(null); go(SC.CERT,from||screen); };
  const openVerify = (tree)      => { setVerTree(tree);  go(SC.VERIFY,screen); };
  // ── Save Supabase config ──
  const saveSupabaseConfig = async () => {
    if (!cfgUrl.includes("supabase.co") || cfgKey.length < 30) {
      alert("URL ou clé invalide. Vérifiez votre console Supabase."); return;
    }
    setDbStatus("testing");
    localStorage.setItem("sb_url", cfgUrl.trim());
    localStorage.setItem("sb_key", cfgKey.trim());
    supabase = null; // reset client
    // Test connection
    await new Promise(r => setTimeout(r, 800));
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from("users").select("id").limit(1);
      if (error && error.code !== "PGRST116") {
        setDbStatus("error");
        alert(" Erreur de connexion : " + error.message + "\n\nVérifiez que les tables existent (exécutez le fichier SQL fourni).");
        return;
      }
    }
    setDbStatus("ok");
    setCfgSaved(true);
    await loadData();
    setTimeout(()=>setDbStatus("configured"),3000);
  };
  // ── Auth handlers ──
  const handleLogin = async () => {
    setAuthLoading(true); setAuthError("");
    const { data, error } = await DB.signIn(authEmail, authPass);
    if (error) { setAuthError(error.message); setAuthLoading(false); return; }
    setAuthUser(data.user);
    setAuthLoading(false);
    go(role==="parrain" ? SC.PARRAIN : SC.EXPLOITANT);
  };
  const handleSignUp = async () => {
    setAuthLoading(true); setAuthError("");
    const { data, error } = await DB.signUp(authEmail, authPass, role);
    if (error) { setAuthError(error.message); setAuthLoading(false); return; }
    setAuthUser(data.user);
    setAuthLoading(false);
    go(SC.REGISTER);
  };
  const handleLogout = async () => { await DB.signOut(); setAuthUser(null); go(SC.HOME); };
  // ── Register ──
  const handleRegister = async () => {
    if(!f.nom.trim()){ alert("Veuillez saisir votre Nom Complet."); return; }
    if(!f.tel.trim()){ alert("Veuillez saisir votre Téléphone."); return; }
    if(!f.langues.length){ alert("Sélectionnez au moins une langue."); return; }
    setRegLoading(true);
    const rec = {...f, id:`USER-${Date.now()}`, dateInscription:new Date().toLocaleDateString("fr-FR"), certId:makeCertId()};
    try {
      if(f.role==="parrain"){
        const saved = await DB.addParrain(rec);
        const updated = [...parrains, {...rec, ...saved}];
        setParrains(updated);
        saveLocal(SK.parrains, updated);
        setRegMsg(` Parrain "${f.nom}" inscrit ${saved._synced?"et sauvegardé en cloud ":"localement 
      } else {
        const saved = await DB.addAgriculteur(rec);
        const updated = [...agriculteurs, {...rec, ...saved}];
        setAgriculteurs(updated);
        saveLocal(SK.agriculteurs, updated);
        setRegMsg(` Agriculteur "${f.nom}" inscrit ${saved._synced?"et sauvegardé en cloud 
      }
    } catch(e) { setRegMsg(` Inscrit localement (erreur cloud: ${e.message})`); }
    setRegLoading(false);
    setRegDone(true);
  };
  const getGPS = () => {
    if(!navigator.geolocation){ alert("GPS non disponible."); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(pos=>{
      setFld("gps",`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
      setGpsLoading(false);
    }, err=>{ alert("GPS: "+err.message); setGpsLoading(false); }, {timeout:10000});
  };
  const readFile = (file) => new Promise(resolve=>{ const r=new FileReader(); r.onload=e=>resolve(e.target.result); r.readAsDataURL(file); });
  const handleProfilPhoto = async (e) => { const file=e.target.files[0]; if(!file) return; if(file.size>5*1024*1024){alert("Max 5Mo");return;} setFld("photoProfil",await readFile(file)); };
  const handlePlantationPhotos = async (e) => { const files=Array.from(e.target.files).slice(0,5); const res=await Promise.all(files.map(readFile)); setFld("photosPlantation",[...(f.photosPlantation||[]),...res].slice(0,5)); };
  const handleTerrainPhotos = async (e) => { const files=Array.from(e.target.files).slice(0,5); const res=await Promise.all(files.map(readFile)); setTerrainPhotos(prev=>[...prev,...res].slice(0,5)); };
  const handleShare = async () => {
    if(!certImg||!certTree) return;
    try { const res=await fetch(certImg); const blob=await res.blob(); const file=new File([blob],`Certificat_ADD_Green_${certTree.id}.png`,{type:"image/png"}); if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:`Certificat ADD Green — ${certTree.id}`});return;} } catch(e){ if(e.name==="AbortError") return; }
    const w=window.open("","_blank"); if(w){w.document.write(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Certificat</title><style>body{margin:0;background:#0d4a24;display:flex;flex-direction:column;align-items:center;padding:20px}img{max-width:100%;border-radius:12px}p{color:rgba(255,255,255,.7);font-family:sans-serif;font-size:13px;margin:12px 0;text-align:center}a{display:block;background:#f39c12;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-family:sans-serif;font-weight:bold;text-align:center}</style></head><body><img src="${certImg}"/><p>
  };
  const G="#1a6b35",G2="#2d9e56";
  const S={
    app:{fontFamily:"'Nunito','Segoe UI',sans-serif",background:"#f5f3ee",minHeight:"100vh",maxWidth:420,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,0.15)",overflow:"hidden"},
    scr:{opacity:anim?1:0,transform:anim?"translateY(0)":"translateY(8px)",transition:"all 0.15s ease",minHeight:"100vh"},
    bar:{background:`linear-gradient(135deg,${G},${G2})`,padding:"16px 20px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",color:"#fff"},
    logo:{display:"flex",alignItems:"center",gap:8,fontWeight:800,fontSize:20,letterSpacing:"-0.5px"},
    bk:{background:"rgba(255,255,255,0.22)",border:"none",color:"#fff",borderRadius:10,padding:"6px 14px",cursor:"pointer",fontWeight:700,fontSize:17},
    card:{background:"#fff",borderRadius:20,padding:20,margin:"14px 14px 0",boxShadow:"0 2px 14px rgba(26,107,53,0.08)"},
    btn:{background:`linear-gradient(135deg,${G},${G2})`,color:"#fff",border:"none",borderRadius:14,padding:"13px 18px",fontWeight:800,fontSize:14,cursor:"pointer",width:"100%",boxShadow:"0 4px 14px rgba(26,107,53,0.25)",display:"flex",alignItems:"center",justifyContent:"center",gap:8},
    btnO:{background:"transparent",color:G,border:`2px solid ${G}`,borderRadius:14,padding:"12px 18px",fontWeight:700,fontSize:14,cursor:"pointer",width:"100%"},
    inp:{width:"100%",border:"2px solid #e8f5e9",borderRadius:12,padding:"11px 14px",fontSize:15,outline:"none",background:"#fafafa",boxSizing:"border-box",fontFamily:"inherit"},
    lbl:{display:"block",fontWeight:700,fontSize:13,color:"#555",marginBottom:6},
    stat:{background:"linear-gradient(135deg,#e8f5e9,#f0f8f1)",borderRadius:16,padding:"12px 10px",textAlign:"center",flex:1},
    sv:{fontSize:20,fontWeight:900,color:G,lineHeight:1.1},
    sl:{fontSize:9,color:"#888",marginTop:3,fontWeight:600,textTransform:"uppercase",letterSpacing:0.4},
    tc:{background:"#fff",borderRadius:16,padding:"12px 14px",marginBottom:10,border:"1.5px solid #e8f5e9",display:"flex",alignItems:"center",gap:12},
    ti:{width:42,height:42,borderRadius:12,background:"linear-gradient(135deg,#c8e6c9,#e8f5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0},
    nav:{position:"fixed",bottom:0,width:"100%",maxWidth:420,background:"#fff",borderTop:"1.5px solid #e8f5e9",display:"flex",padding:"8px 0 6px",zIndex:100},
    ni:a=>({flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"4px 0",cursor:"pointer",color:a?G:"#aaa",fontWeight:a?700:500,fontSize:10,background:"none",border:"none"}),
    tag:c=>({display:"inline-flex",alignItems:"center",gap:4,background:c+"22",color:c,borderRadius:20,padding:"4px 10px",fontWeight:700,fontSize:12}),
    chip:(a)=>({padding:"6px 12px",borderRadius:20,border:a?`2px solid ${G}`:"2px solid #e0e0e0",background:a?"#e8f5e9":"#fff",fontWeight:700,fontSize:11,cursor:"pointer",color:a?G:"#666",whiteSpace:"nowrap"}),
  };
  // DB status dot
  const DbDot = () => {
    const configured = isConfigured();
    const color = dbStatus==="ok"||dbStatus==="configured"&&configured ? "#2ecc71"
      : dbStatus==="testing" ? "#f39c12"
      : dbStatus==="error"   ? "#e74c3c"
      : configured ? "#f39c12" : "#e74c3c";
    const label = dbStatus==="ok" ? "Cloud " : dbStatus==="testing" ? "Test..." : configured ? "Supabase" : "Local";
    return (
      <button onClick={()=>go(SC.CONFIG)} style={{display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:20,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:color,boxShadow:`0 0 6px ${color}`}}/>
        {label}
      </button>
    );
  };
  const NavBar=({active})=>(
    <div style={S.nav}>
      {[[SC.HOME," ","Accueil"],[SC.MAP," ","Carte"],[SC.IMPACT," ","Impact"],[SC.INSCRITS,"
        <button key={lb} style={S.ni(active===sc)} onClick={()=>go(sc)}><span style={{fontSize:20}}>{ic}</span><span>{lb}</span></button>
      ))}
    </div>
  );
  // ══════ CONFIG SUPABASE ═══════════════════════════════════════════════
  if(screen===SC.CONFIG) return (
    <div style={S.app}><div style={{...S.scr,paddingBottom:32}}>
      <div style={S.bar}>
        <button style={S.bk} onClick={()=>go(prev)}>←</button>
        <div style={S.logo}> Configuration Base de Données</div>
        <div style={{width:50}}/>
      </div>
":" "}</div>
      {/* Status badge */}
      <div style={{margin:"14px 14px 0",padding:"14px 16px",borderRadius:16,background:isConfigured()?"linear-gradient(135deg,#27ae60,#2ecc71)":"linear-gradient(135deg,#e74c3c,#c0392b)",color:"#fff",display:"flex",alignItems:"center",gap:12}}>
        <div style={{fontSize:32}}>{isConfigured()?"
        <div>
          <div style={{fontWeight:900,fontSize:16}}>{isConfigured()?"Supabase Cloud configuré":"Mode Local uniquement"}</div>
          <div style={{fontSize:12,opacity:0.85,marginTop:2}}>
            {isConfigured()?"Les données sont synchronisées en cloud":"Les données restent sur cet appareil (localStorage)"}
          </div>
        </div>
      </div>
      {/* How to get keys */}
      <div style={{...S.card,background:"#f0faf2",border:"1.5px solid #c8e6c9"}}>
        <div style={{fontWeight:800,color:G,fontSize:14,marginBottom:10}}> Comment obtenir vos clés Supabase ?</div>
        {[
          ["1","Allez sur","supabase.com → Créer un compte gratuit"],
          ["2","Créez un projet","Nom : ADD Green · Région : eu-west-1"],
          ["3","SQL Editor","Collez et exécutez le fichier supabase_schema.sql fourni"],
          ["4","Settings → API","Copiez l'URL du projet et la clé anon"],
          ["5","Collez ici","Et cliquez Connecter !"],
        ].map(([n,t,d])=>(
          <div key={n} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:G,color:"#fff",fontSize:11,fontWeight:900,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{n}</div>
            <div><span style={{fontWeight:700,color:"#333",fontSize:13}}>{t} : </span><span style={{fontSize:12,color:"#666"}}>{d}</span></div>
          </div>
        ))}
      </div>
      <div style={{...S.card}}>
        <div style={{fontWeight:800,color:G,fontSize:14,marginBottom:14}}> Vos clés Supabase</div>
        <div style={{marginBottom:14}}>
          <label style={S.lbl}>URL du Projet Supabase</label>
          <input style={S.inp} type="url" placeholder="https://xxxxx.supabase.co" value={cfgUrl} onChange={e=>setCfgUrl(e.target.value)}/>
        </div>
        <div style={{marginBottom:16}}>
          <label style={S.lbl}>Clé API anon (public)</label>
          <input style={{...S.inp,fontSize:12}} type="text" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value={cfgKey} onChange={e=>setCfgKey(e.target.value)}/>
          <div style={{fontSize:11,color:"#888",marginTop:4}}>Trouvez-la dans Settings → API 
        </div>
        <button onClick={saveSupabaseConfig} disabled={dbStatus==="testing"} style={{...S.btn,
          background:dbStatus==="ok"?"linear-gradient(135deg,#27ae60,#2ecc71)":dbStatus==="testing"?"#95a5a6":dbStatus==="error"?"linear-gradient(135deg,#e74c3c,#c0392b)":`linear-gradient(135deg,${G},${G2})`,
          marginBottom:10
        }}>
          {dbStatus==="testing"?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>
          :dbStatus==="ok"?<> Connecté avec succès !</>
          :dbStatus==="error"?<> Erreur — Réessayer</>
          :<> Connecter Supabase</>}
        </button>
        {isConfigured()&&(
          <button onClick={()=>{ localStorage.removeItem("sb_url"); localStorage.removeItem("sb_key"); supabase=null; setCfgUrl(""); setCfgKey(""); setCfgSaved(false); setDbStatus("not_configured"); }} style={{...S.btnO,fontSize:13}}>
 Réinitialiser (revenir en local)
          </button>
        )}
      </div>
      {/* Info mode local */}
      <div style={{...S.card,background:"#fffbf0",border:"1.5px solid #f39c12"}}>
        <div style={{fontWeight:700,color:"#e67e22",fontSize:13,marginBottom:6}}> Sans Supabase — Mode Local</div>
        <div style={{fontSize:12,color:"#666",lineHeight:1.6}}>
          L'application fonctionne parfaitement sans Supabase.<br/>
          Les données sont sauvegardées dans le navigateur (localStorage).<br/>
          <strong>Important pour la démo :</strong> utilisez toujours le même appareil et navigateur.
        </div>
      </div>
      <div style={{padding:"14px 14px 0"}}>
        <button style={S.btnO} onClick={()=>go(prev)}>← Retour</button>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div></div>
  );
  // ══════ CERT ══════════════════════════════════════════════════════════
  if(screen===SC.CERT && certTree) return (
    <div style={S.app}><div style={{...S.scr,background:"linear-gradient(160deg,#0d4a24,#1a6b35)",minHeight:"100vh",paddingBottom:32}}>
      <div style={{...S.bar,background:"rgba(0,0,0,0.25)"}}><button style={S.bk} onClick={()=>{ setCertImg(null); go(prev); }}>
      <div style={{padding:"14px 14px 0"}}>
        {certGen&&<div style={{background:"rgba(255,255,255,0.12)",borderRadius:20,padding:"36px 20px",textAlign:"center",color:"#fff",marginBottom:14}}><div style={{fontSize:36,display:"inline-block",animation:"spin 1.5s linear infinite"}}>
        {certImg&&(<div style={{marginBottom:14}}><img src={certImg} alt="Certificat" style={{width:"100%",borderRadius:16,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",display:"block"}}/><div style={{textAlign:"center",marginTop:8,fontSize:11,color:"rgba(255,255,255,0.65)"}}>
        <button onClick={handleShare} disabled={!certImg||certGen} style={{...S.btn,fontSize:15,padding:"14px 18px",background:certImg?"linear-gradient(135deg,#f39c12,#e67e22)":"#95a5a6",marginBottom:10,opacity:certImg?1:0.5}}>
        <button onClick={()=>{ navigator.clipboard?.writeText(certTree.certId||"").catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),3000); }} style={{...S.btn,background:`linear-gradient(135deg,${G},${G2})`,marginBottom:10}}>{copied?"
        <button onClick={()=>openVerify(certTree)} style={{...S.btn,background:"linear-gradient(135deg,#2980b9,#3498db)",marginBottom:10}}>
        <div style={{background:"rgba(255,255,255,0.13)",borderRadius:14,padding:"12px 14px",marginBottom:12,textAlign:"center"}}>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.9)",fontWeight:700}}> Partager sur iPhone</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.72)",marginTop:5,lineHeight:1.6}}><strong style={{color:"#FFD700"}}>
        </div>
        <button style={{...S.btnO,color:"rgba(255,255,255,0.82)",borderColor:"rgba(255,255,255,0.35)",background:"rgba(255,255,255,0.08)"}} onClick={()=>{ setCertImg(null); go(prev); }}>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div></div>
  );
  // ══════ VERIFY ════════════════════════════════════════════════════════
  if(screen===SC.VERIFY && verTree) return (
    <div style={S.app}><div style={{...S.scr,background:"linear-gradient(160deg,#0d4a24,#1a6b35)",minHeight:"100vh",paddingBottom:32}}>
      <div style={{...S.bar,background:"rgba(0,0,0,0.25)"}}><button style={S.bk} onClick={()=>go(prev)}>
      <div style={{margin:"16px 14px 0",background:"linear-gradient(135deg,#27ae60,#2ecc71)",borderRadius:20,padding:"16px 18px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 6px 24px rgba(39,174,96,0.4)"}}><div style={{fontSize:42}}>
      <div style={{margin:"10px 14px 0",background:"rgba(255,255,255,0.12)",borderRadius:14,padding:"10px 14px"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.6)",marginBottom:3,fontWeight:600}}>ID CERTIFICAT</div><div style={{fontWeight:800,fontSize:12,color:"#fff",wordBreak:"break-all"}}>{verTree.certId}</div></div>
      <div style={{margin:"10px 14px 0",background:"#faf8f2",borderRadius:20,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.25)"}}>
        <div style={{background:`linear-gradient(135deg,${G},${G2})`,padding:"14px 18px",textAlign:"center",color:"#fff"}}><div style={{fontSize:34}}>
        <div style={{padding:"14px 18px"}}>
          {[[" Parrain",verTree.parrain],[" Site",verTree.site],[" Planté",verTree.date],["
          <div style={{marginTop:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{fontSize:12,color:"#888",fontWeight:600}}>
          <div style={{marginTop:12,background:G,borderRadius:12,padding:"10px 14px"}}><div style={{fontWeight:800,color:"#7ddc95",fontSize:11,marginBottom:6}}>
        </div>
      </div>
      <div style={{padding:"12px 14px 0"}}>
        <button style={{...S.btn,background:"linear-gradient(135deg,#f39c12,#e67e22)",marginBottom:10}} onClick={()=>openCert(verTree,SC.VERIFY)}>
        <button style={{...S.btnO,color:"rgba(255,255,255,0.82)",borderColor:"rgba(255,255,255,0.35)",background:"rgba(255,255,255,0.1)"}} onClick={()=>go(prev)}>
      </div>
    </div></div>
  );
  // ══════ MAP (Leaflet réelle) ══════════════════════════════════════════
  if(screen===SC.MAP) return (
    <div style={S.app}><div style={{...S.scr,paddingBottom:82}}>
      <div style={S.bar}><button style={S.bk} onClick={()=>go(SC.HOME)}>←</button><div style={S.logo}>
      {/* Stats strip */}
      <div style={{display:"flex",gap:8,padding:"12px 14px 0"}}>
        <div style={S.stat}><div style={S.sv}>{arbresDB.length}</div><div style={S.sl}>Arbres GPS</div></div>
        <div style={S.stat}><div style={S.sv}>{arbresDB.reduce((a,t)=>a+t.co2,0)}kg</div><div style={S.sl}>CO
        <div style={S.stat}><div style={S.sv}>{arbresDB.filter(t=>t.statut==="bon").length}</div><div style={S.sl}>En bonne santé</div></div>
      </div>
      {/* Filters */}
      <div style={{...S.card,padding:"12px 16px"}}>
        <div style={{fontWeight:700,color:G,fontSize:13,marginBottom:8}}> Filtres</div>
        <div style={{marginBottom:8}}>
          <div style={{fontSize:11,color:"#888",fontWeight:600,marginBottom:5}}> Type d'arbre</div>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
            {["Tous","Olivier","Figuier","Caroubier"].map(t=>(
              <button key={t} style={S.chip(mapFilter.type===t)} onClick={()=>setMapFilter(f=>({...f,type:t}))}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:4}}>
          <div style={{fontSize:11,color:"#888",fontWeight:600,marginBottom:5}}> Site de plantation</div>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
            {["Tous","Ssi Mohammed Rkina","Ssi el Khammar"].map(s=>(
              <button key={s} style={S.chip(mapFilter.site===s)} onClick={()=>setMapFilter(f=>({...f,site:s}))}>{s==="Tous"?s:s.replace("Ssi ","")}</button>
            ))}
          </div>
        </div>
      </div>
      {/* Leaflet Map */}
      <div style={{margin:"12px 14px 0",borderRadius:16,overflow:"hidden",border:"2px solid #c8e6c9",boxShadow:"0 4px 20px rgba(26,107,53,0.15)"}}>
        <LeafletMap
          trees={arbresDB}
          onTreeClick={(tree)=>openCert(tree,SC.MAP)}
          filterType={mapFilter.type}
          filterSite={mapFilter.site}
        />
      </div>
 Légende</div>
      {/* Legend */}
      <div style={{...S.card,padding:"12px 16px"}}>
        <div style={{fontWeight:700,color:G,fontSize:13,marginBottom:8}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {Object.entries(ST).map(([k,v])=>(<div key={k} style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}><div style={{width:12,height:12,borderRadius:"50%",background:v.c,border:"2px solid #fff",boxShadow:"0 2px 4px rgba(0,0,0,0.2)"}}/><span style={{color:"#555",fontWeight:600}}>{v.l}</span></div>))}
        </div>
        <div style={{marginTop:8,fontSize:11,color:"#aaa"}}> Olivier ·  Figuier ·  Caroubier — Cliquez sur un marqueur pour voir les détails</div>
      </div>
      {/* Tree list below map */}
      <div style={{padding:"0 14px 20px"}}>
        <div style={{fontWeight:800,fontSize:14,color:G,margin:"14px 0 10px"}}>
 Arbres visibles ({arbresDB.filter(t=>(mapFilter.type==="Tous"||t.typeArbre===mapFilter.type)&&(mapFilter.site==="Tous"||t.site===mapFilter.site)).length})
        </div>
        {arbresDB.filter(t=>(mapFilter.type==="Tous"||t.typeArbre===mapFilter.type)&&(mapFilter.site==="Tous"||t.site===mapFilter.site)).map(tree=>(
          <div key={tree.id} style={S.tc}>
            <div style={{...S.ti,background:ST[tree.statut]?.c+"22",border:`2px solid ${ST[tree.statut]?.c}`,fontSize:18}}>{tree.typeArbre==="Figuier"?"
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13}}>{tree.id}</div>
              <div style={{fontSize:11,color:"#888"}}>{tree.variete} ·  {tree.parrain}</div>
              <div style={{fontSize:10,color:"#aaa",marginTop:1}}> {tree.gps} ·  {tree.co2}kg CO
            </div>
            <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
              <span style={S.tag(ST[tree.statut]?.c||"#888")}>{ST[tree.statut]?.e}</span>
              <button onClick={()=>openCert(tree,SC.MAP)} style={{background:G,color:"#fff",border:"none",borderRadius:7,padding:"3px 8px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
            </div>
          </div>
        ))}
      </div>
    </div><NavBar active={SC.MAP}/></div>
  );
  // ══════ HOME ══════════════════════════════════════════════════════════
  if(screen===SC.HOME) return (
    <div style={S.app}><div style={{...S.scr,background:"linear-gradient(180deg,#0d4a24 0%,#1a6b35 44%,#f5f3ee 100%)",minHeight:"100vh"}}>
      <div style={{padding:"42px 22px 24px",textAlign:"center",color:"#fff"}}>
        {/* DB status + config button */}
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
          <DbDot/>
        </div>
        <div style={{fontSize:58,marginBottom:6}}> </div>
        <div style={{fontWeight:900,fontSize:30,letterSpacing:-1}}>ADD<span style={{color:"#7ddc95"}}>Green</span></div>
        <div style={{fontSize:11,opacity:0.82,marginTop:7,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase"}}>Parrainage &amp; Impact Durable</div>
        <div style={{marginTop:11,fontSize:13,opacity:0.72,fontStyle:"italic",lineHeight:1.55}}>"Un arbre parrainé aujourd'hui,<br/>une olive durable demain"</div>
        <div style={{display:"flex",gap:8,marginTop:20}}>
          {[[arbresDB.length,"Arbres GPS"],["720t","CO₂"],[parrains.length+agriculteurs.length,"Inscrits"]].map(([v,l])=>(
            <div key={l} style={{background:"rgba(255,255,255,0.12)",borderRadius:14,padding:"10px 6px",flex:1}}>
              <div style={{fontWeight:900,fontSize:16,color:"#7ddc95"}}>{v}</div>
              <div style={{fontSize:10,opacity:0.72,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"0 14px 24px"}}>
        <div style={{...S.card,background:`linear-gradient(135deg,${G},#27ae60)`,color:"#fff",marginBottom:12}}>
          <div style={{fontWeight:800,fontSize:15,marginBottom:4}}> Parrainer un Arbre</div>
          <div style={{fontSize:13,opacity:0.85,marginBottom:12}}>Devenez parrain d'un olivier — 100 DHS/an</div>
          <button style={{...S.btn,background:"rgba(255,255,255,0.22)",border:"1.5px solid rgba(255,255,255,0.4)",boxShadow:"none"}} onClick={()=>{ setRole("parrain"); go(SC.LOGIN); }}>Commencer ›</button>
        </div>
        {/* Map CTA — prominent */}
        <button style={{...S.card,display:"flex",alignItems:"center",gap:14,cursor:"pointer",border:`2px solid ${G}`,width:"100%",textAlign:"left",boxSizing:"border-box",marginBottom:12}} onClick={()=>go(SC.MAP)}>
          <div style={{width:52,height:52,borderRadius:14,background:`linear-gradient(135deg,${G},${G2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:15,color:G}}>Carte GPS Interactive</div>
            <div style={{fontSize:12,color:"#888"}}>{arbresDB.length} arbres géolocalisés en temps réel</div>
          </div>
          <div style={{fontSize:20,color:G}}>›</div>
        </button>
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <button style={{...S.card,border:"2px solid #e8f5e9",cursor:"pointer",flex:1,padding:14,textAlign:"center"}} onClick={()=>go(SC.IMPACT)}><div style={{fontSize:24}}>
          <button style={{...S.card,border:"2px solid #e8f5e9",cursor:"pointer",flex:1,padding:14,textAlign:"center"}} onClick={()=>go(SC.INSCRITS)}><div style={{fontSize:24}}>
        </div>
        <button style={{...S.btnO,background:"rgba(255,255,255,0.72)"}} onClick={()=>{ setRole("exploitant"); go(SC.LOGIN); }}>
        <div style={{textAlign:"center",marginTop:12,fontSize:11,color:"#aaa"}}>Association ADD — Province de Taounate 
      </div>
    </div></div>
  );
  // ══════ LOGIN ═════════════════════════════════════════════════════════
  if(screen===SC.LOGIN) return (
    <div style={S.app}><div style={S.scr}>
      <div style={S.bar}><button style={S.bk} onClick={()=>go(SC.HOME)}>←</button><div style={S.logo}>
      <div style={{padding:"24px 16px"}}>
        <h2 style={{margin:"0 0 4px",color:G,fontSize:24,fontWeight:900}}>Connexion</h2>
        <p style={{margin:"0 0 20px",color:"#888",fontSize:14}}>{role==="parrain"?" Espace Parrain":"
        {isConfigured() ? (
          /* 
── Supabase Auth ── */
          <>
            <div style={{marginBottom:14}}><label style={S.lbl}>Email</label><input style={S.inp} type="email" placeholder="hamid@add-taounate.ma" value={authEmail} onChange={e=>setAuthEmail(e.target.value)}/></div>
            <div style={{marginBottom:16}}><label style={S.lbl}>Mot de passe</label><input style={S.inp} type="password" placeholder="••••••••" value={authPass} onChange={e=>setAuthPass(e.target.value)}/></div>
            {authError&&<div style={{background:"#fdecea",color:"#e74c3c",borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:14,fontWeight:600}}>
            <button style={{...S.btn,marginBottom:10,opacity:authLoading?0.7:1}} disabled={authLoading} onClick={handleLogin}>
              {authLoading?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>
            </button>
            <button style={{...S.btnO,marginBottom:12}} disabled={authLoading} onClick={handleSignUp}>
              {authLoading?"...":" Créer un compte"}
            </button>
            <div style={{textAlign:"center",fontSize:12,color:"#aaa"}}>Compte sécurisé Supabase 
          </>
        ) : (
          /* 
── Demo mode (no auth) ── */
          <>
            <div style={{background:"#fffbf0",border:"1.5px solid #f39c12",borderRadius:14,padding:"12px 14px",marginBottom:16,fontSize:13,color:"#e67e22"}}>
 <strong>Mode Démo</strong> — Connexion directe sans mot de passe<br/>
              <span style={{fontSize:11,color:"#888"}}>Configurez Supabase pour activer l'authentification sécurisée</span>
            </div>
            <button style={{...S.btn,marginBottom:10}} onClick={()=>go(role==="parrain"?SC.PARRAIN:SC.EXPLOITANT)}>
 Entrer en mode démo
            </button>
            <button style={{...S.btnO,marginBottom:10}} onClick={()=>go(SC.CONFIG)}>
 Configurer Supabase
            </button>
          </>
        )}
        <div style={{textAlign:"center",marginTop:12}}>
          <span style={{color:"#888",fontSize:14}}>Pas encore inscrit ? </span>
          <button style={{background:"none",border:"none",color:G,fontWeight:800,fontSize:14,cursor:"pointer"}} onClick={()=>{ setF({...emptyF,role}); setRegDone(false); go(SC.REGISTER); }}>S'inscrire</button>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div></div>
  );
  // ══════ REGISTER ══════════════════════════════════════════════════════
  if(screen===SC.REGISTER) return (
    <div style={S.app}><div style={{...S.scr,paddingBottom:32}}>
      <div style={S.bar}><button style={S.bk} onClick={()=>go(SC.LOGIN)}>←</button><div style={S.logo}>
      {regDone?(
        <div style={{padding:"40px 20px",textAlign:"center"}}>
          <div style={{fontSize:64,marginBottom:12}}> </div>
          <div style={{fontWeight:900,fontSize:22,color:G,marginBottom:8}}>{regMsg}</div>
          <div style={{fontSize:13,color:"#888",marginBottom:24,lineHeight:1.6}}>Inscription enregistrée dans la base ADD Green.</div>
          <button style={{...S.btn,marginBottom:10}} onClick={()=>go(f.role==="parrain"?SC.PARRAIN:SC.EXPLOITANT)}>Accéder à mon espace</button>
          <button style={S.btnO} onClick={()=>go(SC.INSCRITS)}> Voir la liste des inscrits</button>
        </div>
      ):(
        <div style={{padding:"14px"}}>
          <div style={{display:"flex",gap:6,marginBottom:18}}>{["1","2","3"].map((s,i)=>(<div key={s} style={{flex:1,textAlign:"center"}}><div style={{height:4,borderRadius:4,background:i===0?G:i===1&&f.role==="parrain"?G2:i===2&&f.role==="exploitant"?G2:"#e0e0e0",marginBottom:3}}/><div style={{fontSize:9,color:i===0?G:"#aaa",fontWeight:700}}>Section {s}</div></div>))}</div>
          {/* 
─ Section 1 ─ */}
          <div style={S.card}>
            <div style={{fontWeight:800,color:G,fontSize:14,marginBottom:2}}>Section 1 sur 3 — Informations Générales</div>
            <div style={{fontWeight:600,color:"#888",fontSize:11,marginBottom:14}}>Formulaire utilisateur (Parrain ou Agriculteur)</div>
            {/* Photo de profil — FONCTIONNELLE */}
            <div style={{marginBottom:16}}>
              <label style={S.lbl}>Photo de Profil (JPEG / PNG · Optionnel)</label>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                {/* Avatar preview */}
                <div style={{width:72,height:72,borderRadius:"50%",overflow:"hidden",border:`3px solid ${f.photoProfil?G:"#e0e0e0"}`,flexShrink:0,background:"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>
                  {f.photoProfil ? <img src={f.photoProfil} alt="profil" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : "
                </div>
                <label style={{flex:1,cursor:"pointer"}}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{display:"none"}} onChange={handleProfilPhoto}/>
                  <div style={{border:`2px dashed ${f.photoProfil?"#1a6b35":"#c8e6c9"}`,borderRadius:12,padding:"12px 14px",background:f.photoProfil?"#f0faf2":"#f8fffe",textAlign:"center"}}>
                    <div style={{fontSize:20,marginBottom:3}}>{f.photoProfil?" ":" "}</div>
                    <div style={{fontSize:12,fontWeight:700,color:f.photoProfil?G:"#888"}}>{f.photoProfil?"Photo chargée — Appuyer pour changer":"Appuyer pour choisir une photo"}</div>
                    <div style={{fontSize:10,color:"#aaa",marginTop:2}}>Max 5 Mo</div>
                  </div>
                </label>
              </div>
            </div>
            <div style={{marginBottom:14}}><label style={S.lbl}>Nom Complet <span style={{color:"#e74c3c"}}>*</span></label><input style={S.inp} type="text" placeholder="Hamid El Mrabet" value={f.nom} onChange={e=>setFld("nom",e.target.value)}/></div>
            <div style={{marginBottom:14}}><label style={S.lbl}>Téléphone (avec indicatif +212...) <span style={{color:"#e74c3c"}}>*</span></label><input style={S.inp} type="tel" placeholder="+212 6..." value={f.tel} onChange={e=>setFld("tel",e.target.value)}/></div>
            <div style={{marginBottom:14}}><label style={S.lbl}>Lieu de résidence (Ville et Pays) <span style={{color:"#e74c3c"}}>*</span></label><input style={S.inp} type="text" placeholder=
            <MultiCheck label="Langue préférée" options={["Arabe","Français","Anglais"]} values={f.langues} onChange={v=>setFld("langues",v)} required/>
            <RadioGroup label="Rôle" options={["Parrain","Agriculteur"]} value={f.role==="parrain"?"Parrain":"Agriculteur"} onChange={v=>setFld("role",v==="Parrain"?"parrain":"exploitant")} required/>
          </div>
          {/* 
─ Section 2 Parrain ─ */}
          {f.role==="parrain"&&(<div style={{...S.card,marginTop:12}}>
            <div style={{fontWeight:800,color:G,fontSize:14,marginBottom:2}}>Section 2 sur 3 — Profil Parrain</div>
            <div style={{fontWeight:600,color:"#888",fontSize:11,marginBottom:14}}>Section à remplir uniquement par le parrain</div>
            <RadioGroup label="Type de Parrain" options={["Individuel","Entreprise","Association"]} value={f.typeParrain} onChange={v=>setFld("typeParrain",v)} required/>
            <RadioGroup label="Espèces souhaitées" options={["Olivier","Figuier","Caroubier","Indifférent"]} value={f.espece} onChange={v=>setFld("espece",v)} required/>
            <div style={{marginBottom:14}}><label style={S.lbl}>Budget Annuel estimé (100 DHS = 1 arbre/an) <span style={{color:"#e74c3c"}}>*</span></label><input style={S.inp} type="number" placeholder="500" min="100" step="100" value={f.budget} onChange={e=>setFld("budget",e.target.value)}/>{f.budget&&<div style={{fontSize:12,color:"#27ae60",marginTop:5,fontWeight:600}}>
            <div style={{background:"#f0faf2",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#555",fontWeight:600}}>
          </div>)}
          {/* 
─ Section 3 Agriculteur ─ */}
          {f.role==="exploitant"&&(<div style={{...S.card,marginTop:12}}>
            <div style={{fontWeight:800,color:G,fontSize:14,marginBottom:2}}>Section 3 sur 3 — Profil Agriculteur</div>
            <div style={{fontWeight:600,color:"#888",fontSize:11,marginBottom:14}}>Section à remplir uniquement par l'agriculteur</div>
            <div style={{marginBottom:14}}><label style={S.lbl}>Superficie totale (Hectare = 10 000 m
            <div style={{marginBottom:14}}><label style={S.lbl}>Localisation — Commune ou Douar (Province de Taounate) <span style={{color:"#e74c3c"}}>*</span></label><input style={S.inp} type="text" placeholder="Douar Ouled Ziane" value={f.localisation} onChange={e=>setFld("localisation",e.target.value)}/></div>
            <RadioGroup label="Type de Sol" options={["Argileux","Sablonneux","Limoneux"]} value={f.typeSol} onChange={v=>setFld("typeSol",v)}/>
            <div style={{marginBottom:14}}><label style={S.lbl}>Engagement plantation — nombre d'arbres</label><input style={S.inp} type="number" placeholder="50" value={f.engagementArbres} onChange={e=>setFld("engagementArbres",e.target.value)}/></div>
            <RadioGroup label="Densité de plantation" options={["10x10","8x6","5x6"]} value={f.densitePlantation} onChange={v=>setFld("densitePlantation",v)} required/>
            <RadioGroup label="Irrigué ou en Bour (pluvial)" options={["Irrigué","Bour"]} value={f.irrigation} onChange={v=>setFld("irrigation",v)} required/>
            <div style={{marginBottom:14}}>
              <label style={S.lbl}>Coordonnées GPS de la parcelle <span style={{color:"#e74c3c"}}>*</span></label>
              <div style={{display:"flex",gap:8}}>
                <input style={{...S.inp,flex:1}} type="text" placeholder="34.552244, -4.992293" value={f.gps} onChange={e=>setFld("gps",e.target.value)}/>
                <button onClick={getGPS} disabled={gpsLoading} style={{background:G,color:"#fff",border:"none",borderRadius:12,padding:"0 14px",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0,opacity:gpsLoading?0.7:1}}>{gpsLoading?"...":"
              </div>
              <div style={{fontSize:11,color:"#888",marginTop:4}}> GPS auto — remplit les coordonnées depuis votre position actuelle</div>
            </div>
            {/* Photos plantation — FONCTIONNELLES */}
            <div style={{marginBottom:0}}>
              <label style={S.lbl}>Photos de la Plantation (max 5 photos)</label>
              <label style={{display:"block",cursor:"pointer",marginBottom:8}}>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple style={{display:"none"}} onChange={handlePlantationPhotos}/>
                <div style={{border:`2px dashed ${(f.photosPlantation||[]).length>0?"#1a6b35":"#c8e6c9"}`,borderRadius:12,padding:"12px 14px",background:(f.photosPlantation||[]).length>0?"#f0faf2":"#f8fffe",textAlign:"center"}}>
                  <div style={{fontSize:22,marginBottom:3}}> </div>
                  <div style={{fontSize:12,fontWeight:700,color:(f.photosPlantation||[]).length>0?G:"#888"}}>{(f.photosPlantation||[]).length>0?`${(f.photosPlantation||[]).length} photo(s) chargée(s) — Appuyer pour ajouter`:"Appuyer pour charger des photos de la parcelle"}</div>
                  <div style={{fontSize:10,color:"#aaa",marginTop:2}}>JPEG · PNG · Géolocalisées de préférence</div>
                </div>
              </label>
              {/* Previews */}
              {(f.photosPlantation||[]).length>0&&(
                <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:6}}>
                  {(f.photosPlantation||[]).map((src,i)=>(
                    <div key={i} style={{position:"relative",flexShrink:0}}>
                      <img src={src} alt={`plantation ${i+1}`} style={{width:72,height:72,borderRadius:10,objectFit:"cover",border:`2px solid ${G}`}}/>
                      <button onClick={()=>setFld("photosPlantation",(f.photosPlantation||[]).filter((_,j)=>j!==i))} style={{position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:"50%",background:"#e74c3c",color:"#fff",border:"none",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>
                      <button onClick={()=>setFld("photosPlantation",(f.photosPlantation||[]).filter((_,j)=>j!==i))} style={{position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:"50%",background:"#e74c3c",color:"#fff",border:"none",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>)}
          {/* Recap */}
          {f.nom&&(<div style={{...S.card,marginTop:12,background:"#f0faf2",border:"1.5px solid #c8e6c9"}}>
            <div style={{fontWeight:700,color:G,marginBottom:8,fontSize:13}}> Récapitulatif avant validation</div>
            {[["Nom",f.nom],["Tél.",f.tel],["Lieu",f.lieu],["Langues",f.langues.join(", ")||"—"],["Rôle",f.role==="parrain"?"
          </div>)}
          <div style={{padding:"14px 0 8px"}}><button style={{...S.btn,opacity:regLoading?0.7:1}} disabled={regLoading} onClick={handleRegister}>{regLoading?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>
        </div>
      )}
    </div></div>
  );
  // ══════ FICHE PARRAIN DETAIL ══════════════════════════════════════════
  if(screen===SC.FICHE_PARRAIN && selInscrit) return (
    <div style={S.app}><div style={{...S.scr,paddingBottom:32}}>
      <div style={S.bar}><button style={S.bk} onClick={()=>go(SC.INSCRITS)}>←</button><div style={S.logo}>
      {/* Hero */}
      <div style={{background:`linear-gradient(135deg,${G},${G2})`,padding:"24px 20px",textAlign:"center",color:"#fff"}}>
        <div style={{width:88,height:88,borderRadius:"50%",border:"4px solid rgba(255,255,255,0.4)",overflow:"hidden",margin:"0 auto 12px",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40}}>
          {selInscrit.photoProfil ? <img src={selInscrit.photoProfil} alt="profil" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : "
        </div>
        <div style={{fontWeight:900,fontSize:22}}>{selInscrit.nom}</div>
        <div style={{fontSize:13,opacity:0.85,marginTop:4}}>{selInscrit.typeParrain} · {selInscrit.espece}</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"4px 14px",marginTop:8,fontSize:12,fontWeight:700}}>
      </div>
      <div style={{padding:"14px"}}>
        {/* Infos générales */}
        <div style={S.card}>
          <div style={{fontWeight:800,color:G,fontSize:14,marginBottom:12}}> Informations Générales</div>
          {[[" Téléphone",selInscrit.tel],[" Résidence",selInscrit.lieu],[" Langues",(selInscrit.langues||[]).join(", ")||"—"],["
            <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f0f0f0"}}>
              <div style={{fontSize:12,color:"#888",fontWeight:600}}>{k}</div>
              <div style={{fontSize:13,fontWeight:700,color:"#333",textAlign:"right",maxWidth:"58%"}}>{v}</div>
            </div>
          ))}
        </div>
        {/* Profil parrainage */}
        <div style={{...S.card,marginTop:12}}>
          <div style={{fontWeight:800,color:G,fontSize:14,marginBottom:12}}> Profil de Parrainage</div>
          {[["Type de parrain",selInscrit.typeParrain],["Espèce soutenue",selInscrit.espece],["Budget annuel",selInscrit.budget?(selInscrit.budget+" DHS/an"):"—"],["Nombre d'arbres",selInscrit.budget?(Number(selInscrit.budget)/100+" arbre(s)"):"—"],["Durée engagement","5 ans minimum"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f0f0f0"}}>
              <div style={{fontSize:12,color:"#888",fontWeight:600}}>{k}</div>
              <div style={{fontSize:13,fontWeight:700,color:G,textAlign:"right"}}>{v}</div>
            </div>
          ))}
        </div>
        {/* Certificat */}
        <div style={{...S.card,marginTop:12,border:"2px dashed #2d9e56",background:"#f8fffe",textAlign:"center"}}>
          <div style={{fontSize:24,marginBottom:6}}> </div>
          <div style={{fontWeight:700,color:G,marginBottom:4}}>Certificat de Parrainage</div>
          <div style={{fontSize:11,color:"#aaa",marginBottom:12}}>N° {selInscrit.certId}</div>
          <button onClick={()=>openCert({id:selInscrit.certId,variete:selInscrit.espece==="Indifférent"?"Olivier":selInscrit.espece,site:"Province de Taounate",date:selInscrit.dateInscription,statut:"bon",co2:selInscrit.budget?Math.round(Number(selInscrit.budget)/100*2.5):10,croissance:35,parrain:selInscrit.nom,duree:5,montant:selInscrit.budget?Number(selInscrit.budget):100,certId:selInscrit.certId,gps:"34.5361, -4.6399"},SC.FICHE_PARRAIN)} style={{...S.btn}}>
        </div>
        <button style={{...S.btnO,marginTop:12}} onClick={()=>go(SC.INSCRITS)}>← Retour à la liste</button>
      </div>
    </div></div>
  );
  // ══════ FICHE AGRICULTEUR DETAIL ═════════════════════════════════════
  if(screen===SC.FICHE_AGRI && selInscrit) return (
    <div style={S.app}><div style={{...S.scr,paddingBottom:32}}>
      <div style={S.bar}><button style={S.bk} onClick={()=>go(SC.INSCRITS)}>←</button><div style={S.logo}>
      {/* Hero */}
      <div style={{background:`linear-gradient(135deg,#27ae60,#2ecc71)`,padding:"24px 20px",textAlign:"center",color:"#fff"}}>
        <div style={{width:88,height:88,borderRadius:"50%",border:"4px solid rgba(255,255,255,0.4)",overflow:"hidden",margin:"0 auto 12px",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40}}>
          {selInscrit.photoProfil ? <img src={selInscrit.photoProfil} alt="profil" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : "
        </div>
        <div style={{fontWeight:900,fontSize:22}}>{selInscrit.nom}</div>
        <div style={{fontSize:13,opacity:0.85,marginTop:4}}>{selInscrit.localisation} · {selInscrit.superficie} Ha</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"4px 14px",marginTop:8,fontSize:12,fontWeight:700}}>
      </div>
      <div style={{padding:"14px"}}>
        {/* Infos générales */}
        <div style={S.card}>
          <div style={{fontWeight:800,color:G,fontSize:14,marginBottom:12}}> Informations Générales</div>
          {[[" Téléphone",selInscrit.tel],[" Résidence",selInscrit.lieu],[" Langues",(selInscrit.langues||[]).join(", ")||"—"],["
            <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f0f0f0"}}>
              <div style={{fontSize:12,color:"#888",fontWeight:600}}>{k}</div>
              <div style={{fontSize:13,fontWeight:700,color:"#333",textAlign:"right",maxWidth:"58%"}}>{v}</div>
            </div>
          ))}
        </div>
        {/* Parcelle */}
        <div style={{...S.card,marginTop:12}}>
          <div style={{fontWeight:800,color:G,fontSize:14,marginBottom:12}}> Profil Parcelle</div>
          {[[" Superficie",selInscrit.superficie?selInscrit.superficie+" Ha":"—"],[" Localisation",selInscrit.localisation||"—"],["
            <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f0f0f0"}}>
              <div style={{fontSize:12,color:"#888",fontWeight:600}}>{k}</div>
          ))}
              <div style={{fontSize:13,fontWeight:700,color:G,textAlign:"right",maxWidth:"55%"}}>{v}</div>
            </div>
        </div>
        {/* Photos plantation */}
        {(selInscrit.photosPlantation||[]).length>0&&(
          <div style={{...S.card,marginTop:12}}>
            <div style={{fontWeight:800,color:G,fontSize:14,marginBottom:12}}> Photos de Plantation ({(selInscrit.photosPlantation||[]).length})</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {(selInscrit.photosPlantation||[]).map((src,i)=>(
                <img key={i} src={src} alt={`plantation ${i+1}`} style={{width:"100%",aspectRatio:"4/3",objectFit:"cover",borderRadius:12,border:`2px solid ${G}44`}}/>
              ))}
            </div>
          </div>
        )}
        {/* Certificat parcelle */}
        <div style={{...S.card,marginTop:12,border:"2px dashed #2d9e56",background:"#f8fffe",textAlign:"center"}}>
          <div style={{fontSize:24,marginBottom:6}}> </div>
          <div style={{fontWeight:700,color:G,marginBottom:4}}>Certificat de Parcelle</div>
          <div style={{fontSize:11,color:"#aaa",marginBottom:12}}>N° {selInscrit.certId}</div>
          <button onClick={()=>openCert({id:selInscrit.certId,variete:"Picholine Marocaine",site:selInscrit.localisation||"Province de Taounate",date:selInscrit.dateInscription,statut:"bon",co2:485,croissance:42,parrain:selInscrit.nom,duree:5,montant:500,certId:selInscrit.certId,gps:selInscrit.gps||"34.5361, -4.6399"},SC.FICHE_AGRI)} style={{...S.btn}}>
        </div>
        <button style={{...S.btnO,marginTop:12}} onClick={()=>go(SC.INSCRITS)}>← Retour à la liste</button>
      </div>
    </div></div>
  );
  // ══════ PARRAIN DASHBOARD ══════════════════════════════════════════════
  if(screen===SC.PARRAIN) return (
    <div style={S.app}><div style={{...S.scr,paddingBottom:82}}>
      <div style={{...S.bar,paddingBottom:16}}>
        <div style={S.logo}> ADD Green</div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <DbDot/>
          {authUser&&<button onClick={handleLogout} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:10,padding:"4px 8px",fontSize:10,cursor:"pointer",fontWeight:700}}>
          <div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:700}}>
        </div>
      </div>
      <div style={{...S.card,background:`linear-gradient(135deg,${G},${G2})`,color:"#fff"}}><div style={{fontSize:11,opacity:0.82}}>Bienvenue,</div><div style={{fontWeight:900,fontSize:20}}>Hamid El Mrabet !</div><div style={{fontSize:11,opacity:0.72,marginTop:3}}>
      <div style={{display:"flex",gap:8,padding:"12px 14px 0"}}><div style={S.stat}><div style={S.sv}>12</div><div style={S.sl}>Arbres</div></div><div style={S.stat}><div style={S.sv}>485<span style={{fontSize:10}}>kg</span></div><div style={S.sl}>CO
      <div style={{...S.card,marginTop:10,background:"#f0faf2",border:"1.5px solid #c8e6c9"}}><div style={{fontSize:10,color:"#555",marginBottom:1}}>
      <div style={{padding:"12px 14px 0"}}>
        <div style={{fontWeight:800,fontSize:15,color:G,marginBottom:10}}>Mes Arbres</div>
        {SAMPLE_TREES.map(tree=>(
          <div key={tree.id} style={S.tc}>
            <div style={{...S.ti,cursor:"pointer"}} onClick={()=>{ setSelTree(tree); go(SC.TREE,SC.PARRAIN); }}>
            <div style={{flex:1,cursor:"pointer"}} onClick={()=>{ setSelTree(tree); go(SC.TREE,SC.PARRAIN); }}><div style={{fontWeight:700,fontSize:13}}>{tree.id}</div><div style={{fontSize:11,color:"#888"}}>{tree.variete}</div><div style={{fontSize:10,color:"#bbb",marginTop:1}}>{tree.date} 
            <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
              <span style={S.tag(ST[tree.statut].c)}>{ST[tree.statut].e} {ST[tree.statut].l}</span>
              <div style={{fontSize:11,color:"#27ae60",fontWeight:700}}>{tree.co2} kg CO₂</div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>openCert(tree,SC.PARRAIN)} style={{background:G,color:"#fff",border:"none",borderRadius:7,padding:"3px 8px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                <button onClick={()=>openVerify(tree)} style={{background:"#2980b9",color:"#fff",border:"none",borderRadius:7,padding:"3px 8px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{padding:"0 14px 20px"}}>
        <div style={{...S.card,border:"2px dashed #2d9e56",background:"#f8fffe"}}>
          <div style={{textAlign:"center",marginBottom:12}}><div style={{fontSize:24,marginBottom:4}}>
          {SAMPLE_TREES.map(tree=>(<div key={tree.id} style={{background:"#f0faf2",borderRadius:12,padding:"10px 12px",border:"1px solid #c8e6c9",marginBottom:8}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><div><span style={{fontWeight:800,color:G,fontSize:13}}>{tree.id}</span><span style={{fontSize:11,color:"#888",marginLeft:6}}>{tree.variete}</span></div><span style={S.tag(ST[tree.statut].c)}>{ST[tree.statut].e}</span></div><div style={{display:"flex",gap:6}}><button onClick={()=>openCert(tree,SC.PARRAIN)} style={{...S.btn,flex:2,padding:"8px",fontSize:12}}>
        </div>
      </div>
    </div><NavBar active={SC.PARRAIN}/></div>
  );
  // ══════ TREE DETAIL ═══════════════════════════════════════════════════
  if(screen===SC.TREE && selTree) return (
    <div style={S.app}><div style={{...S.scr,paddingBottom:24}}>
      <div style={S.bar}><button style={S.bk} onClick={()=>go(SC.PARRAIN)}>←</button><div style={S.logo}>
      <div style={{background:`linear-gradient(180deg,${G},${G2})`,padding:"20px 18px",textAlign:"center",color:"#fff"}}><div style={{fontSize:48}}>
      <div style={{padding:"12px 14px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          {[[" Site",selTree.site],[" Planté",selTree.date],[" Croissance",`${selTree.croissance} cm`],["
        </div>
        <div style={{...S.card,background:`linear-gradient(135deg,${G},${G2})`,color:"#fff",marginTop:0,marginBottom:0}}><div style={{fontWeight:800,fontSize:13,marginBottom:6}}>
        <button onClick={()=>go(SC.MAP)} style={{...S.btn,background:"linear-gradient(135deg,#2980b9,#3498db)",marginTop:10}}>
        <div style={{...S.card,border:"2px dashed #2d9e56",background:"#f8fffe",marginTop:10,textAlign:"center"}}><div style={{fontSize:22,marginBottom:4}}>
      </div>
    </div></div>
  );
  // ══════ EXPLOITANT ════════════════════════════════════════════════════
  if(screen===SC.EXPLOITANT) return (
    <div style={S.app}><div style={{...S.scr,paddingBottom:82}}>
      <div style={S.bar}><div style={S.logo}> ADD Green</div><div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700}}>
      <div style={{...S.card,background:`linear-gradient(135deg,${G},#27ae60)`,color:"#fff"}}><div style={{fontSize:11,opacity:0.82}}>Espace Exploitant / Agriculteur</div><div style={{fontWeight:900,fontSize:20}}>Ssi Mohammed Rkina</div><div style={{fontSize:10,opacity:0.7,marginTop:3}}>
      <div style={{display:"flex",gap:8,padding:"12px 14px 0"}}><div style={S.stat}><div style={S.sv}>47</div><div style={S.sl}>Arbres</div></div><div style={S.stat}><div style={S.sv}>3.2<span style={{fontSize:10}}>Ha</span></div><div style={S.sl}>Surface</div></div><div style={S.stat}><div style={S.sv}>96<span style={{fontSize:10}}>%</span></div><div style={S.sl}>Survie</div></div></div>
      <div style={{padding:"10px 14px 0"}}><div style={{...S.card,border:"1.5px solid #e8f5e9"}}><div style={{fontWeight:800,color:G,marginBottom:6,fontSize:14}}>
      <div style={{padding:"10px 14px 0"}}><button style={{...S.card,display:"flex",alignItems:"center",gap:14,cursor:"pointer",border:`2px solid ${G}`,width:"100%",textAlign:"left",boxSizing:"border-box"}} onClick={()=>go(SC.TERRAIN)}><div style={{width:48,height:48,borderRadius:12,background:`linear-gradient(135deg,${G},${G2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
      <div style={{padding:"10px 14px 0"}}><div style={{fontWeight:800,fontSize:14,color:G,marginBottom:8}}>État du Verger</div>{SAMPLE_TREES.map(tree=>(<div key={tree.id} style={{...S.tc,cursor:"default"}}><div style={S.ti}>
    </div><NavBar active={SC.EXPLOITANT}/></div>
  );
  // ══════ TERRAIN ═══════════════════════════════════════════════════════
  if(screen===SC.TERRAIN) return (
    <div style={S.app}><div style={S.scr}>
      <div style={S.bar}><button style={S.bk} onClick={()=>go(SC.EXPLOITANT)}>←</button><div style={S.logo}>
      <div style={{padding:"14px"}}>
        {subOk?(<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:56,marginBottom:12}}>
          <div style={S.card}>
            <div style={{fontWeight:800,color:G,fontSize:15,marginBottom:14}}>Déclaration terrain — {new Date().toLocaleDateString("fr-FR")}</div>
            <div style={{marginBottom:12}}><label style={S.lbl}>Arbre concerné</label><select style={{...S.inp}} value={uArbre} onChange={e=>setUArbre(e.target.value)}>{arbresDB.map(t=><option key={t.id} value={t.id}>{t.id} — {t.variete}</option>)}</select></div>
            <div style={{marginBottom:12}}><label style={S.lbl}>Croissance du jour (cm)</label><input style={S.inp} type="number" placeholder="42" value={uCroiss} onChange={e=>setUCroiss(e.target.value)}/></div>
            <RadioGroup label="État Sanitaire" options={["Bon","Surveillance","Incident"]} value={uSante} onChange={setUSante} required/>
            {uSante==="Incident"&&<div style={{marginBottom:12}}><label style={S.lbl}>Détails de l'incident</label><textarea style={{...S.inp,minHeight:68,resize:"vertical"}} placeholder="Sécheresse, maladie, parasites..." value={uInc} onChange={e=>setUInd(e.target.value)}/></div>}
            <div style={{marginBottom:12}}><label style={S.lbl}>Production annuelle estimée (kg)</label><input style={S.inp} type="number" placeholder="120" value={uProd} onChange={e=>setUProd(e.target.value)}/></div>
            <div style={{marginBottom:14}}>
              <label style={S.lbl}>Upload photos géolocalisées (max 5)</label>
              <label style={{display:"block",cursor:"pointer",marginBottom:8}}>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple style={{display:"none"}} onChange={handleTerrainPhotos}/>
                <div style={{border:`2px dashed ${terrainPhotos.length>0?"#1a6b35":"#c8e6c9"}`,borderRadius:12,padding:"14px",textAlign:"center",background:terrainPhotos.length>0?"#f0faf2":"#f8fffe"}}>
                  <div style={{fontSize:26,marginBottom:3}}> </div>
                  <div style={{fontSize:12,fontWeight:700,color:terrainPhotos.length>0?G:"#888"}}>{terrainPhotos.length>0?`${terrainPhotos.length} photo(s) chargée(s) — Appuyer pour ajouter`:"Appuyer pour charger des photos du terrain"}</div>
                  <div style={{fontSize:10,color:"#aaa",marginTop:2}}>Photos géolocalisées depuis votre smartphone</div>
                </div>
              </label>
              {terrainPhotos.length>0&&(
                <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                  {terrainPhotos.map((src,i)=>(
                    <div key={i} style={{position:"relative",flexShrink:0}}>
                      <img src={src} alt={`terrain ${i+1}`} style={{width:72,height:72,borderRadius:10,objectFit:"cover",border:`2px solid ${G}`}}/>
                      <button onClick={()=>setTerrainPhotos(prev=>prev.filter((_,j)=>j!==i))} style={{position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:"50%",background:"#e74c3c",color:"#fff",border:"none",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button style={S.btn} onClick={()=>{ setSubOk(true); setTerrainPhotos([]); }}> Valider la mise à jour</button>
          </div>
        )}
      </div>
    </div></div>
  );
  // ══════ INSCRITS ══════════════════════════════════════════════════════
  if(screen===SC.INSCRITS) return (
    <div style={S.app}><div style={{...S.scr,paddingBottom:82}}>
      <div style={S.bar}><div style={S.logo}> Inscrits ADD Green</div><div style={{width:50}}/></div>
      {/* Parrains */}
      <div style={{padding:"14px 14px 0"}}>
        <div style={{fontWeight:800,fontSize:15,color:G,marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
 Parrains ({parrains.length})
          <button onClick={()=>{ setRole("parrain"); setF({...emptyF,role:"parrain"}); setRegDone(false); go(SC.REGISTER); }} style={{background:G,color:"#fff",border:"none",borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Ajouter</button>
        </div>
        {parrains.length===0 ? (
          <div style={{background:"#fff",borderRadius:16,padding:"24px",textAlign:"center",color:"#aaa",boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:32,marginBottom:8}}> </div>
            <div style={{fontWeight:600}}>Aucun parrain inscrit</div>
            <div style={{fontSize:12,marginTop:4}}>Cliquez sur "+ Ajouter" pour inscrire le premier parrain</div>
          </div>
        ) : parrains.map((p,i)=>(
          <div key={p.id||i} style={{...S.tc, cursor:"pointer", boxShadow:"0 2px 10px rgba(26,107,53,0.08)", transition:"box-shadow 0.2s"}}
            onClick={()=>{ setSelInscrit(p); go(SC.FICHE_PARRAIN); }}>
            {/* Avatar */}
            <div style={{width:52,height:52,borderRadius:"50%",overflow:"hidden",border:`2px solid ${G}`,flexShrink:0,background:"linear-gradient(135deg,#e8f5e9,#c8e6c9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
              {p.photoProfil ? <img src={p.photoProfil} alt="profil" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : "
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:G}}>{p.nom}</div>
              <div style={{fontSize:12,color:"#888",marginTop:1}}>{p.typeParrain} · {p.espece}</div>
              <div style={{fontSize:11,color:"#bbb",marginTop:1}}>{p.tel} · {p.lieu}</div>
              <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                {p.budget&&<span style={{background:"#e8f5e9",color:G,borderRadius:8,padding:"2px 8px",fontSize:10,fontWeight:700}}>{p.budget} DHS/an</span>}
                <span style={{background:"#f0f0f0",color:"#555",borderRadius:8,padding:"2px 8px",fontSize:10,fontWeight:600}}>
              </div>
            </div>
            <div style={{color:"#ccc",fontSize:20,flexShrink:0}}>›</div>
          </div>
        ))}
      </div>
      {/* Agriculteurs */}
      <div style={{padding:"14px 14px 20px"}}>
        <div style={{fontWeight:800,fontSize:15,color:G,marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
 Agriculteurs ({agriculteurs.length})
          <button onClick={()=>{ setRole("exploitant"); setF({...emptyF,role:"exploitant"}); setRegDone(false); go(SC.REGISTER); }} style={{background:"#27ae60",color:"#fff",border:"none",borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Ajouter</button>
        </div>
        {agriculteurs.length===0 ? (
          <div style={{background:"#fff",borderRadius:16,padding:"24px",textAlign:"center",color:"#aaa",boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:32,marginBottom:8}}> </div>
            <div style={{fontWeight:600}}>Aucun agriculteur inscrit</div>
            <div style={{fontSize:12,marginTop:4}}>Cliquez sur "+ Ajouter" pour inscrire le premier agriculteur</div>
          </div>
        ) : agriculteurs.map((a,i)=>(
          <div key={a.id||i} style={{...S.tc, cursor:"pointer", boxShadow:"0 2px 10px rgba(26,107,53,0.08)", transition:"box-shadow 0.2s"}}
            onClick={()=>{ setSelInscrit(a); go(SC.FICHE_AGRI); }}>
            {/* Avatar */}
            <div style={{width:52,height:52,borderRadius:"50%",overflow:"hidden",border:"2px solid #27ae60",flexShrink:0,background:"linear-gradient(135deg,#fff3e0,#ffe0b2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
              {a.photoProfil ? <img src={a.photoProfil} alt="profil" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : "
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:G}}>{a.nom}</div>
              <div style={{fontSize:12,color:"#888",marginTop:1}}> {a.localisation} · {a.superficie} Ha</div>
              <div style={{fontSize:11,color:"#bbb",marginTop:1}}>{a.tel} · Sol: {a.typeSol}</div>
              <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                <span style={{background:"#e8f5e9",color:G,borderRadius:8,padding:"2px 8px",fontSize:10,fontWeight:700}}>{a.densitePlantation} 
                {(a.photosPlantation||[]).length>0&&<span style={{background:"#e3f2fd",color:"#1565c0",borderRadius:8,padding:"2px 8px",fontSize:10,fontWeight:700}}>
              </div>
            </div>
            <div style={{color:"#ccc",fontSize:20,flexShrink:0}}>›</div>
          </div>
        ))}
      </div>
    </div><NavBar active={SC.INSCRITS}/></div>
  );
  // ══════ IMPACT ════════════════════════════════════════════════════════
  if(screen===SC.IMPACT) return (
    <div style={S.app}><div style={S.scr}>
      <div style={S.bar}><button style={S.bk} onClick={()=>go(SC.HOME)}>←</button><div style={S.logo}>
      <div style={{padding:"14px"}}>
        <div style={{background:"linear-gradient(135deg,#0d4a24,#1a6b35)",borderRadius:20,padding:"22px 18px",textAlign:"center",color:"#fff",marginBottom:14}}><div style={{fontSize:42,marginBottom:6}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[[" ","720","t","CO
        <div style={{...S.card,marginTop:12,background:`linear-gradient(135deg,${G},${G2})`,color:"#fff"}}><div style={{fontSize:12,lineHeight:1.7,fontStyle:"italic",opacity:0.92}}>
        <div style={{...S.card,marginTop:12}}><div style={{fontWeight:800,color:G,marginBottom:10,fontSize:13}}>
        <div style={{padding:"12px 0 24px"}}><button style={S.btn} onClick={()=>{ setRole("parrain"); go(SC.LOGIN); }}>
      </div>
    </div></div>
  );
  return null;
}