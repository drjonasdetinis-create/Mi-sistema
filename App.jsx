import { useState, useEffect, useRef } from "react";

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Sos mi planificador personal de alto rendimiento.

PERFIL:
- 17 años, Argentina, estudiante universitario
- Entrena gym 3-4x/semana + fútbol lunes 21:00
- Prepara show de canto (ensayos a coordinar)
- Alimentación limpia: sin azúcar, sin gluten, sin ultraprocesados. Come carne, pollo, pescado, verduras. Cocina en horno/air fryer.

HORARIO FIJO:
- Facultad: lunes a viernes 14:00–18:00, salida de casa 13:35 máximo
- Inglés: lunes y miércoles 18:10–19:25
- Fútbol: lunes 21:00 (día LIVIANO, no sobrecargar)
- Con papá: domingo completo (sin gym), jueves noche
- Sueño: acostarse 23:00–00:00 / despertar 8:00–9:00

COGNITIVO (importante):
- Procrastina con fricción o ambigüedad → instrucciones claras y directas
- Se sobrecarga cuando está motivado → frenarlo si pide demasiado
- Subestima tiempos reales → agregar buffers siempre
- Si falla, puede abandonar el día → nunca criticar, ofrecer rescate
- Mejor rendimiento: tarde y noche antes de cenar
- Peor momento: recién despertado → nunca empezar con estudio directo

ORDEN FIJO DE MAÑANA (inamovible):
1. Levantarse
2. Activación 10-15 min (no sentarse a estudiar aún)
3. Desayuno — preparar + comer 20-30 min — NUNCA saltear
4. Estudio (bloques de 25-45 min con descansos)
5. Baño frío — siempre después de estudiar, siempre antes de almorzar
6. Almuerzo — 12:00-13:00 ideal, 13:10 máximo ABSOLUTO

VENTANA 13:00–13:35: solo prepararse para salir. Nada exigente. No comer.

REGLAS DE ORO:
- Máximo 3 bloques exigentes por día
- Siempre descanso entre bloques
- Si aparece algo nuevo → reemplazar, no sumar
- Post gym: 10-15 min de bajada obligatorios
- Nunca recuperar días perdidos (sí el siguiente)
- Lunes y miércoles: cargar poco la mañana (tarde ocupada)
- Domingo: sin gym, día con papá

MODO RESCATE (si falla):
- No rearmar todo
- Dar 1 bloque clave + estructura mínima para el resto del día
- Tono neutro, sin culpa

FILOSOFÍA: consistencia > perfección. Ejecución > planificación. Simplicidad > optimización extrema.

FORMATO DE RESPUESTA (CRÍTICO — siempre así):
## ⚠️ Ajuste  
(solo si hay algo a corregir, 1 línea. Si no hay nada, omitir esta sección)

## 📅 [Día]
[lista clara con horarios, emojis, máximo 12 ítems]

## ✅
¿Te sirve así?

PROHIBIDO: texto largo, explicaciones, párrafos, relleno.`;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MORNING = [
  { id:"wake",      emoji:"🌅", label:"Levantarse",           sub:"" },
  { id:"activate",  emoji:"⚡", label:"Activación",           sub:"10-15 min" },
  { id:"breakfast", emoji:"🍳", label:"Desayuno",             sub:"preparar + comer" },
  { id:"study",     emoji:"📚", label:"Estudio",              sub:"bloques 25-45 min" },
  { id:"shower",    emoji:"🚿", label:"Baño frío",            sub:"después de estudiar" },
  { id:"lunch",     emoji:"🥩", label:"Almuerzo",             sub:"antes 13:10" },
];

const FIXED = {
  1:[{t:"14:00",e:"18:00",l:"Facultad",c:"#3b82f6"},{t:"18:10",e:"19:25",l:"Inglés",c:"#8b5cf6"},{t:"21:00",e:"22:30",l:"Fútbol ⚽",c:"#10b981"}],
  2:[{t:"14:00",e:"18:00",l:"Facultad",c:"#3b82f6"}],
  3:[{t:"14:00",e:"18:00",l:"Facultad",c:"#3b82f6"},{t:"18:10",e:"19:25",l:"Inglés",c:"#8b5cf6"}],
  4:[{t:"14:00",e:"18:00",l:"Facultad",c:"#3b82f6"},{t:"20:00",e:"",l:"Papá 👨‍👦",c:"#f59e0b"}],
  5:[{t:"14:00",e:"18:00",l:"Facultad",c:"#3b82f6"}],
  6:[],
  0:[{t:"",e:"",l:"Día con Papá 👨‍👦 — sin gym",c:"#f59e0b",allDay:true}],
};

const DIAS  = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const SHORT = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const dKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayDate = () => new Date();

// ─── STYLES ──────────────────────────────────────────────────────────────────
const C = {
  bg:"#09090d", surface:"#111116", border:"#1c1c24",
  accent:"#f59e0b", accentDim:"rgba(245,158,11,0.15)",
  blue:"#3b82f6", purple:"#8b5cf6", green:"#10b981", red:"#ef4444",
  text:"#f0f0f0", muted:"#52526a", dim:"#2a2a38",
};

const s = {
  app:{ minHeight:"100vh", background:C.bg, fontFamily:"'Sora',system-ui,sans-serif", color:C.text, display:"flex", flexDirection:"column", maxWidth:"430px", margin:"0 auto", position:"relative" },
  card:{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"14px", padding:"14px" },
  pill:{ borderRadius:"20px", padding:"4px 12px", fontSize:"0.7rem", fontWeight:"700", border:"none", cursor:"pointer" },
  tag:{ borderRadius:"6px", padding:"2px 8px", fontSize:"0.68rem", fontWeight:"700" },
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState("hoy");
  const [mc, setMc]             = useState({});       // morning checks
  const [tasks, setTasks]       = useState([]);
  const [gym, setGym]           = useState(false);
  const [msgs, setMsgs]         = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [wk, setWk]             = useState(0);        // week offset
  const [selDay, setSelDay]     = useState(null);     // selected day in week view
  const [newTask, setNewTask]   = useState("");
  const [taskHard, setTaskHard] = useState(false);
  const [ready, setReady]       = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  const today = todayDate();
  const tk    = dKey(today);
  const dow   = today.getDay();

  // ── Load ──
  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get(`mc:${tk}`);    if(r) setMc(JSON.parse(r.value)); } catch{}
      try { const r = await window.storage.get(`tasks:${tk}`); if(r) setTasks(JSON.parse(r.value)); } catch{}
      try { const r = await window.storage.get(`gym:${tk}`);   if(r) setGym(r.value==="1"); } catch{}
      setReady(true);
    })();
  }, []);

  // ── Save ──
  useEffect(() => { if(!ready) return; window.storage.set(`mc:${tk}`, JSON.stringify(mc)).catch(()=>{}); }, [mc, ready]);
  useEffect(() => { if(!ready) return; window.storage.set(`tasks:${tk}`, JSON.stringify(tasks)).catch(()=>{}); }, [tasks, ready]);
  useEffect(() => { if(!ready) return; window.storage.set(`gym:${tk}`, gym?"1":"0").catch(()=>{}); }, [gym, ready]);

  // ── Scroll chat ──
  useEffect(() => { chatRef.current?.scrollIntoView({behavior:"smooth"}); }, [msgs, loading]);

  // ── Week days ──
  const weekDays = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay() + wk*7);
    return Array.from({length:7},(_,i)=>{ const x=new Date(d); x.setDate(d.getDate()+i); return x; });
  })();

  // ── Add task ──
  const addTask = () => {
    if(!newTask.trim()) return;
    if(taskHard && tasks.filter(t=>t.hard&&!t.done).length>=3) {
      alert("⚠️ Máx 3 bloques exigentes. Completá uno primero.");
      return;
    }
    setTasks(p=>[...p,{id:Date.now(),text:newTask.trim(),done:false,hard:taskHard}]);
    setNewTask(""); setTaskHard(false);
  };

  // ── Chat ──
  const send = async (override) => {
    const msg = override||input.trim();
    if(!msg||loading) return;
    setInput("");
    const dayName = DIAS[dow];
    const ctx = `Contexto: ${dayName} ${today.getDate()} de ${MESES[today.getMonth()]}. Gym hoy: ${gym?"SÍ":"NO"}. Pendientes: ${tasks.filter(t=>!t.done).map(t=>t.text).join(", ")||"ninguno"}.`;
    const next = [...msgs,{role:"user",content:msg}];
    const api  = next.map((m,i)=> i===0 ? {...m, content: ctx+"\n\n"+m.content} : m);
    setMsgs(next); setLoading(true);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:SYSTEM_PROMPT,messages:api})
      });
      const d = await r.json();
      const reply = d.content?.map(b=>b.text||"").join("\n")||"Error.";
      setMsgs([...next,{role:"assistant",content:reply}]);
    } catch { setMsgs([...next,{role:"assistant",content:"❌ Error de conexión."}]); }
    setLoading(false);
  };

  const genRutina = () => { setTab("ia"); setTimeout(()=>send(`Dame mi rutina del día. Es ${DIAS[dow]}. Gym: ${gym?"sí":"no"}.`),80); };
  const rescue    = () => { setTab("ia"); setTimeout(()=>send("Modo rescate. Fallé parte del día. Dame lo mínimo para salvar el resto."),80); };

  // ── Format AI response ──
  const fmtMsg = (text) => text.split("\n").map((line,i)=>{
    if(!line.trim()) return <div key={i} style={{height:"4px"}}/>;
    if(line.startsWith("## ")) return <div key={i} style={{color:C.accent,fontWeight:"800",fontSize:"0.83rem",marginTop:"12px",marginBottom:"4px"}}>{line.slice(3)}</div>;
    const isSlot = /^[-•]?\s*\d{1,2}:\d{2}/.test(line.trim());
    const clean = line.replace(/^[-•]\s*/,"");
    if(isSlot) return (
      <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 10px",margin:"2px 0",background:"rgba(255,255,255,0.04)",borderRadius:"8px",borderLeft:`2px solid ${C.blue}`}}>
        <span style={{color:"#93c5fd",fontFamily:"monospace",fontSize:"0.8rem"}}>{clean}</span>
      </div>
    );
    return <p key={i} style={{margin:"2px 0",fontSize:"0.82rem",color:"#ccc",lineHeight:"1.6"}}>{clean}</p>;
  });

  // ─── TABS ────────────────────────────────────────────────────────────────────
  const morningDone = MORNING.filter(m=>mc[m.id]).length;
  const tasksDone   = tasks.filter(t=>t.done).length;
  const hardCount   = tasks.filter(t=>t.hard&&!t.done).length;
  const todayEvents = FIXED[dow]||[];

  // ─── HOY ─────────────────────────────────────────────────────────────────────
  const HoyTab = () => (
    <div style={{padding:"16px", display:"flex", flexDirection:"column", gap:"12px", paddingBottom:"90px"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:"1.4rem",fontWeight:"800",lineHeight:1}}>{DIAS[dow]}</div>
          <div style={{color:C.muted,fontSize:"0.75rem",marginTop:"2px"}}>{today.getDate()} de {MESES[today.getMonth()]} · {today.getFullYear()}</div>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          {/* Gym toggle */}
          <button onClick={()=>setGym(p=>!p)} style={{
            display:"flex",alignItems:"center",gap:"6px",
            background: gym ? "rgba(16,185,129,0.15)" : C.dim,
            border: `1px solid ${gym?"rgba(16,185,129,0.4)":C.border}`,
            borderRadius:"10px", padding:"7px 11px", cursor:"pointer",
            color: gym?"#34d399":"#666", fontSize:"0.78rem", fontWeight:"700"
          }}>
            🏋️ {gym?"Gym ON":"Gym OFF"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {(morningDone > 0 || tasksDone > 0) && (
        <div style={{...s.card, padding:"10px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
            <span style={{fontSize:"0.7rem",color:C.muted,fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em"}}>Progreso del día</span>
            <span style={{fontSize:"0.7rem",color:C.accent,fontWeight:"800"}}>{morningDone}/{MORNING.length} mañana · {tasksDone}/{tasks.length} tareas</span>
          </div>
          <div style={{height:"4px",background:C.dim,borderRadius:"2px",overflow:"hidden"}}>
            <div style={{height:"100%",background:`linear-gradient(90deg,${C.accent},#fb923c)`,borderRadius:"2px",width:`${tasks.length?((morningDone+tasksDone)/(MORNING.length+tasks.length)*100):((morningDone/MORNING.length)*100)}%`,transition:"width 0.4s"}}/>
          </div>
        </div>
      )}

      {/* Morning routine */}
      <div style={s.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <span style={{fontSize:"0.72rem",color:C.muted,fontWeight:"800",textTransform:"uppercase",letterSpacing:"0.07em"}}>Rutina de mañana</span>
          <span style={{fontSize:"0.7rem",color:morningDone===MORNING.length?"#34d399":C.accent,fontWeight:"700"}}>{morningDone}/{MORNING.length}</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
          {MORNING.map((m,i)=>{
            const done = !!mc[m.id];
            const prev = i===0||!!mc[MORNING[i-1].id];
            return (
              <button key={m.id} onClick={()=>prev&&toggleMorning(m.id)} style={{
                display:"flex",alignItems:"center",gap:"10px",
                background: done?"rgba(245,158,11,0.08)":prev?"rgba(255,255,255,0.03)":"transparent",
                border:`1px solid ${done?"rgba(245,158,11,0.25)":prev?C.border:"transparent"}`,
                borderRadius:"10px",padding:"9px 12px",cursor:prev?"pointer":"default",
                opacity:prev?1:0.4,textAlign:"left",width:"100%"
              }}>
                <div style={{
                  width:"22px",height:"22px",borderRadius:"50%",flexShrink:0,
                  background:done?C.accent:C.dim,
                  border:`2px solid ${done?C.accent:C.border}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:"0.7rem",fontWeight:"800",color:done?"#000":C.muted,
                  transition:"all 0.2s"
                }}>{done?"✓":i+1}</div>
                <span style={{fontSize:"0.9rem"}}>{m.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.83rem",fontWeight:"600",color:done?"#888":C.text,textDecoration:done?"line-through":"none"}}>{m.label}</div>
                  {m.sub&&<div style={{fontSize:"0.68rem",color:C.muted,marginTop:"1px"}}>{m.sub}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Today's fixed events */}
      {todayEvents.length>0&&(
        <div style={s.card}>
          <div style={{fontSize:"0.72rem",color:C.muted,fontWeight:"800",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"10px"}}>Compromisos de hoy</div>
          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
            {todayEvents.map((ev,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 10px",background:"rgba(255,255,255,0.03)",borderRadius:"8px",borderLeft:`3px solid ${ev.c}`}}>
                <span style={{fontFamily:"monospace",fontSize:"0.78rem",color:ev.c,fontWeight:"700",minWidth:"38px"}}>{ev.t||"TODO"}</span>
                <span style={{fontSize:"0.83rem",color:C.text}}>{ev.l}</span>
                {ev.e&&<span style={{marginLeft:"auto",fontSize:"0.7rem",color:C.muted}}>{ev.e}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks */}
      <div style={s.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <span style={{fontSize:"0.72rem",color:C.muted,fontWeight:"800",textTransform:"uppercase",letterSpacing:"0.07em"}}>Tareas del día</span>
          <span style={{fontSize:"0.7rem",color:hardCount>=3?"#ef4444":C.muted,fontWeight:"700"}}>{hardCount}/3 exigentes</span>
        </div>

        {/* Add task */}
        <div style={{display:"flex",gap:"6px",marginBottom:"10px"}}>
          <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()}
            placeholder="Agregar tarea..." ref={inputRef}
            style={{flex:1,background:C.dim,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"9px 12px",color:C.text,fontSize:"0.82rem",outline:"none",fontFamily:"inherit"}}
          />
          <button onClick={()=>setTaskHard(p=>!p)} style={{
            background:taskHard?"rgba(239,68,68,0.2)":C.dim,
            border:`1px solid ${taskHard?"rgba(239,68,68,0.5)":C.border}`,
            borderRadius:"8px",padding:"0 10px",cursor:"pointer",
            color:taskHard?"#f87171":"#888",fontSize:"0.75rem",fontWeight:"700"
          }}>{taskHard?"🔥":"💤"}</button>
          <button onClick={addTask} style={{background:C.accentDim,border:`1px solid rgba(245,158,11,0.3)`,borderRadius:"8px",padding:"0 14px",cursor:"pointer",color:C.accent,fontSize:"1rem",fontWeight:"700"}}>+</button>
        </div>

        {tasks.length===0&&(
          <div style={{textAlign:"center",padding:"12px 0",color:C.muted,fontSize:"0.78rem"}}>Sin tareas. Generá tu rutina con IA ↓</div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
          {tasks.map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 10px",background:"rgba(255,255,255,0.03)",borderRadius:"8px",borderLeft:`2px solid ${t.hard?"#ef4444":"#555"}`}}>
              <button onClick={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,done:!x.done}:x))} style={{
                width:"20px",height:"20px",borderRadius:"50%",flexShrink:0,
                background:t.done?"#34d399":C.dim,border:`2px solid ${t.done?"#34d399":C.border}`,
                cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.65rem",color:"#000"
              }}>{t.done?"✓":""}</button>
              <span style={{flex:1,fontSize:"0.82rem",color:t.done?"#555":C.text,textDecoration:t.done?"line-through":"none"}}>{t.text}</span>
              {t.hard&&!t.done&&<span style={{fontSize:"0.65rem",background:"rgba(239,68,68,0.15)",color:"#f87171",padding:"2px 6px",borderRadius:"4px",fontWeight:"700"}}>EXIG</span>}
              <button onClick={()=>setTasks(p=>p.filter(x=>x.id!==t.id))} style={{background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:"0.85rem",padding:"0 2px"}}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <button onClick={genRutina} style={{
        width:"100%",padding:"15px",
        background:`linear-gradient(135deg,${C.accent},#fb923c)`,
        border:"none",borderRadius:"13px",
        color:"#000",fontSize:"0.9rem",fontWeight:"800",cursor:"pointer",
        boxShadow:"0 4px 20px rgba(245,158,11,0.25)"
      }}>⚡ Generar mi rutina con IA</button>

      <button onClick={rescue} style={{
        width:"100%",padding:"12px",
        background:"rgba(239,68,68,0.1)",border:`1px solid rgba(239,68,68,0.25)`,
        borderRadius:"12px",color:"#f87171",fontSize:"0.82rem",fontWeight:"700",cursor:"pointer"
      }}>🆘 Modo rescate — fallé, qué hago ahora</button>
    </div>
  );

  // ─── SEMANA ───────────────────────────────────────────────────────────────────
  const SemanTab = () => {
    const viewed = selDay || today;
    const viewedDow = viewed.getDay();
    const viewedEvents = FIXED[viewedDow]||[];
    const isToday = dKey(viewed)===tk;

    return (
      <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:"12px",paddingBottom:"90px"}}>
        {/* Week nav */}
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <button onClick={()=>setWk(p=>p-1)} style={{background:C.dim,border:"none",color:C.muted,borderRadius:"8px",padding:"7px 12px",cursor:"pointer",fontSize:"0.9rem"}}>‹</button>
          <span style={{flex:1,textAlign:"center",fontSize:"0.78rem",color:C.muted,fontWeight:"700"}}>
            {weekDays[0].getDate()} {MESES[weekDays[0].getMonth()].slice(0,3)} — {weekDays[6].getDate()} {MESES[weekDays[6].getMonth()].slice(0,3)}
          </span>
          <button onClick={()=>setWk(p=>p+1)} style={{background:C.dim,border:"none",color:C.muted,borderRadius:"8px",padding:"7px 12px",cursor:"pointer",fontSize:"0.9rem"}}>›</button>
        </div>

        {/* Day strip */}
        <div style={{display:"flex",gap:"5px"}}>
          {weekDays.map((d,i)=>{
            const isT = dKey(d)===tk;
            const isSel = selDay&&dKey(d)===dKey(selDay);
            const hasFac = !!(FIXED[d.getDay()]||[]).find(e=>e.l.includes("Facultad"));
            return (
              <button key={i} onClick={()=>setSelDay(d)} style={{
                flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",
                padding:"8px 4px",borderRadius:"10px",border:`1px solid ${isSel?C.accent:C.border}`,
                background:isSel?C.accentDim:isT?"rgba(255,255,255,0.04)":"transparent",cursor:"pointer"
              }}>
                <span style={{fontSize:"0.62rem",color:isSel?C.accent:C.muted,fontWeight:"700"}}>{SHORT[d.getDay()]}</span>
                <span style={{fontSize:"0.9rem",fontWeight:"800",color:isSel?C.accent:isT?C.text:"#888"}}>{d.getDate()}</span>
                {hasFac&&<div style={{width:"4px",height:"4px",borderRadius:"50%",background:C.blue}}/>}
              </button>
            );
          })}
        </div>

        {/* Selected day detail */}
        <div style={s.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
            <div>
              <div style={{fontWeight:"800",fontSize:"1rem"}}>{DIAS[viewedDow]}</div>
              <div style={{fontSize:"0.72rem",color:C.muted}}>{viewed.getDate()} de {MESES[viewed.getMonth()]}</div>
            </div>
            {isToday&&<span style={{background:C.accentDim,color:C.accent,fontSize:"0.68rem",fontWeight:"800",padding:"3px 9px",borderRadius:"6px"}}>HOY</span>}
          </div>

          {viewedEvents.length===0&&(
            <div style={{textAlign:"center",padding:"16px 0",color:C.muted,fontSize:"0.82rem"}}>
              Día libre 🙌
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
            {viewedEvents.map((ev,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",background:"rgba(255,255,255,0.03)",borderRadius:"10px",borderLeft:`3px solid ${ev.c}`}}>
                <div style={{minWidth:"50px"}}>
                  <div style={{fontFamily:"monospace",fontSize:"0.78rem",color:ev.c,fontWeight:"700"}}>{ev.t||"Todo el"}</div>
                  {ev.e&&<div style={{fontFamily:"monospace",fontSize:"0.68rem",color:C.muted}}>→ {ev.e}</div>}
                </div>
                <div style={{fontSize:"0.85rem",fontWeight:"600"}}>{ev.l}</div>
              </div>
            ))}
          </div>

          {/* Free time hint */}
          {isToday&&(
            <div style={{marginTop:"12px",padding:"10px 12px",background:"rgba(245,158,11,0.06)",borderRadius:"8px",border:`1px solid rgba(245,158,11,0.15)`}}>
              <div style={{fontSize:"0.72rem",color:C.accent,fontWeight:"700",marginBottom:"3px"}}>⏳ Ventana libre de mañana</div>
              <div style={{fontSize:"0.78rem",color:"#aaa"}}>8:00 → 13:00 · {viewedEvents.find(e=>e.l.includes("Facultad"))?"Facultad desde 14:00":"Sin facultad"}</div>
            </div>
          )}
        </div>

        {/* Week summary */}
        <div style={s.card}>
          <div style={{fontSize:"0.72rem",color:C.muted,fontWeight:"800",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"10px"}}>Semana de un vistazo</div>
          <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
            {weekDays.map((d,i)=>{
              const evs = FIXED[d.getDay()]||[];
              const isT = dKey(d)===tk;
              return (
                <button key={i} onClick={()=>setSelDay(d)} style={{
                  display:"flex",alignItems:"center",gap:"10px",padding:"7px 10px",
                  background:isT?"rgba(245,158,11,0.06)":"rgba(255,255,255,0.02)",
                  border:`1px solid ${isT?"rgba(245,158,11,0.2)":C.border}`,
                  borderRadius:"8px",cursor:"pointer",textAlign:"left"
                }}>
                  <span style={{fontSize:"0.75rem",color:isT?C.accent:C.muted,fontWeight:"700",minWidth:"28px"}}>{SHORT[d.getDay()]}</span>
                  <div style={{flex:1,display:"flex",flexWrap:"wrap",gap:"4px"}}>
                    {evs.length===0&&<span style={{fontSize:"0.72rem",color:"#444"}}>Libre</span>}
                    {evs.map((ev,j)=>(
                      <span key={j} style={{fontSize:"0.68rem",background:`${ev.c}20`,color:ev.c,padding:"2px 7px",borderRadius:"4px",fontWeight:"700"}}>{ev.l.replace(" ⚽","").replace(" 👨‍👦","")}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ─── IA ───────────────────────────────────────────────────────────────────────
  const IaTab = () => (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 60px)"}}>
      {/* Quick actions */}
      {msgs.length===0&&(
        <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:"10px"}}>
          <div style={{fontSize:"0.72rem",color:C.muted,fontWeight:"800",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"2px"}}>Acciones rápidas</div>
          {[
            {label:`⚡ Rutina de hoy (${DIAS[dow]})`, msg:`Dame mi rutina del día. Es ${DIAS[dow]}. Gym: ${gym?"sí":"no"}.`},
            {label:"🆘 Modo rescate", msg:"Modo rescate. Fallé parte del día. Dame lo mínimo para salvar el resto."},
            {label:"💪 ¿Conviene gym hoy?", msg:`Es ${DIAS[dow]}. ¿Conviene incluir gym hoy sin romper la rutina?`},
            {label:"📚 Cómo organizo el estudio", msg:"¿Cómo organizo el estudio de esta mañana sin sobrecargarme?"},
            {label:"🎤 Meter ensayo de canto", msg:`Tengo que meter un ensayo de canto hoy (${DIAS[dow]}). ¿Dónde encaja sin romper nada?`},
          ].map((a,i)=>(
            <button key={i} onClick={()=>send(a.msg)} style={{
              padding:"12px 14px",background:C.surface,border:`1px solid ${C.border}`,
              borderRadius:"11px",color:C.text,fontSize:"0.82rem",fontWeight:"600",
              cursor:"pointer",textAlign:"left"
            }}>{a.label}</button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:"10px"}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            {m.role==="user"?(
              <div style={{background:`linear-gradient(135deg,${C.accent},#fb923c)`,borderRadius:"14px 14px 4px 14px",padding:"10px 14px",maxWidth:"80%",fontSize:"0.83rem",color:"#000",fontWeight:"600"}}>{m.content}</div>
            ):(
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"4px 14px 14px 14px",padding:"12px 14px",maxWidth:"95%",width:"95%"}}>{fmtMsg(m.content)}</div>
            )}
          </div>
        ))}
        {loading&&(
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"4px 14px 14px 14px",padding:"12px 16px",width:"fit-content"}}>
            <div style={{display:"flex",gap:"5px"}}>
              {[0,1,2].map(j=><div key={j} style={{width:"7px",height:"7px",borderRadius:"50%",background:C.accent,animation:"pulse 1.2s infinite",animationDelay:`${j*0.18}s`}}/>)}
            </div>
          </div>
        )}
        {msgs.length>0&&<button onClick={()=>setMsgs([])} style={{alignSelf:"center",background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:"8px",padding:"5px 14px",cursor:"pointer",fontSize:"0.72rem",marginTop:"4px"}}>Limpiar chat</button>}
        <div ref={chatRef}/>
      </div>

      {/* Input */}
      <div style={{padding:"10px 16px 16px",borderTop:`1px solid ${C.border}`,display:"flex",gap:"8px",background:C.bg}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!loading&&send()}
          placeholder="Escribile algo..." disabled={loading}
          style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"11px 14px",color:C.text,fontSize:"0.85rem",outline:"none",fontFamily:"inherit",opacity:loading?0.5:1}}
        />
        <button onClick={()=>send()} disabled={loading||!input.trim()} style={{
          background:C.accent,border:"none",borderRadius:"10px",padding:"0 16px",
          cursor:"pointer",fontSize:"1.1rem",color:"#000",opacity:loading||!input.trim()?0.3:1
        }}>→</button>
      </div>
    </div>
  );

  // ─── NAV ──────────────────────────────────────────────────────────────────────
  const tabs = [
    {id:"hoy",   icon:"☀️", label:"Hoy"},
    {id:"semana",icon:"📅", label:"Semana"},
    {id:"ia",    icon:"⚡", label:"IA"},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        body{background:${C.bg};}
        input::placeholder{color:#2a2a40;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#222;border-radius:2px;}
        button{font-family:'Sora',system-ui,sans-serif;}
        @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={s.app}>
        {/* Top bar */}
        <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:C.bg,position:"sticky",top:0,zIndex:10}}>
          <div>
            <div style={{fontSize:"1rem",fontWeight:"800",background:`linear-gradient(90deg,${C.accent},#fb923c)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Mi Sistema</div>
          </div>
          <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
            <div style={{width:"8px",height:"8px",borderRadius:"50%",background:gym?"#34d399":"#333"}}/>
            <span style={{fontSize:"0.7rem",color:gym?"#34d399":"#444",fontWeight:"700"}}>{gym?"GYM":"sin gym"}</span>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto", animation:"fadeIn 0.2s ease"}}>
          {tab==="hoy"    && <HoyTab/>}
          {tab==="semana" && <SemanTab/>}
          {tab==="ia"     && <IaTab/>}
        </div>

        {/* Bottom nav */}
        <div style={{
          position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
          width:"100%",maxWidth:"430px",
          background:`${C.bg}ee`,backdropFilter:"blur(16px)",
          borderTop:`1px solid ${C.border}`,
          display:"flex",zIndex:20
        }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",
              padding:"10px 0 14px",border:"none",background:"transparent",cursor:"pointer"
            }}>
              <span style={{fontSize:"1.3rem"}}>{t.icon}</span>
              <span style={{fontSize:"0.62rem",fontWeight:"700",color:tab===t.id?C.accent:C.muted}}>{t.label}</span>
              {tab===t.id&&<div style={{width:"18px",height:"2px",background:C.accent,borderRadius:"1px",marginTop:"1px"}}/>}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
