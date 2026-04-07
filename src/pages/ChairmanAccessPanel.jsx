/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const BASE = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://backend.vjcoverseas.com";

const colorFor = (name = "") => {
  const p = ["#6366f1","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777","#0284c7","#16a34a"];
  return p[(name?.charCodeAt(0) || 0) % p.length];
};

const fmtSize = (b) => !b ? "" : b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;
const isImg   = (u="",n="") => /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(u+n);
const isVid   = (u="",n="") => /\.(mp4|mov|avi|mkv|webm|wmv|flv)$/i.test(u+n);
const isAud   = (u="",n="") => /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(u+n);

/* ── Lightbox ── */
function Lightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:99999,cursor:"zoom-out" }}>
      <img src={src} alt="" style={{ maxWidth:"90vw",maxHeight:"90vh",borderRadius:10,objectFit:"contain",boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}/>
      <div style={{ position:"absolute",top:20,right:24,display:"flex",gap:10 }}>
        <a href={src} download onClick={e=>e.stopPropagation()}
          style={{ background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:18,borderRadius:"50%",width:42,height:42,display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none" }}>⬇️</a>
        <button onClick={onClose}
          style={{ background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",fontSize:26,cursor:"pointer",borderRadius:"50%",width:42,height:42,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
      </div>
    </div>
  );
}

/* ── File attachment renderer ── */
function FileAttachment({ url, name, size, onImgClick }) {
  const full = `${BASE}${url}`;
  if (isImg(url, name)) return (
    <img src={full} alt={name||"image"} onClick={() => onImgClick?.(full)}
      style={{ maxWidth:260,maxHeight:200,borderRadius:10,objectFit:"cover",cursor:"pointer",marginTop:4,border:"1px solid rgba(0,0,0,0.08)",display:"block" }}/>
  );
  if (isVid(url, name)) return (
    <video controls style={{ maxWidth:280,borderRadius:10,marginTop:4,display:"block" }}>
      <source src={full}/>
    </video>
  );
  if (isAud(url, name)) return (
    <audio controls style={{ marginTop:6,display:"block",width:260 }}><source src={full}/></audio>
  );
  const ext = (name||url||"").split(".").pop().toUpperCase();
  const ec  = { PDF:"#ef4444",DOC:"#2563eb",DOCX:"#2563eb",XLS:"#16a34a",XLSX:"#16a34a",PPT:"#f97316",PPTX:"#f97316",ZIP:"#6366f1",RAR:"#6366f1",TXT:"#64748b",CSV:"#16a34a" };
  return (
    <a href={full} target="_blank" rel="noreferrer"
      style={{ display:"inline-flex",alignItems:"center",gap:10,background:"rgba(0,0,0,0.05)",border:"1px solid rgba(0,0,0,0.08)",borderRadius:10,padding:"10px 14px",marginTop:6,textDecoration:"none",color:"#1e293b",maxWidth:280 }}>
      <div style={{ width:36,height:36,borderRadius:8,background:ec[ext]||"#64748b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0 }}>{ext}</div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160 }}>{name}</div>
        {size && <div style={{ fontSize:10,opacity:0.6 }}>{fmtSize(size)}</div>}
      </div>
      <span style={{ fontSize:14,flexShrink:0 }}>⬇</span>
    </a>
  );
}

/* ── Confirm modal ── */
function ConfirmModal({ open, title, body, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div onClick={onCancel} style={{ position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,backdropFilter:"blur(4px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:16,padding:28,width:380,boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize:22,marginBottom:10 }}>🗑️</div>
        <div style={{ fontSize:16,fontWeight:700,color:"#0f172a",marginBottom:8 }}>{title}</div>
        <div style={{ fontSize:13,color:"#64748b",lineHeight:1.6,marginBottom:24 }}>{body}</div>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onConfirm} style={{ flex:1,padding:"10px 0",background:"#ef4444",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer" }}>Yes, Delete</button>
          <button onClick={onCancel}  style={{ flex:1,padding:"10px 0",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,fontSize:13,cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Toast ── */
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div style={{ position:"fixed",bottom:24,right:24,background:type==="error"?"#ef4444":"#10b981",color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:500,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.15)" }}>
      {msg}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN EXPORT — Chairman Chat Monitor
══════════════════════════════════════════════════════════════ */
export default function ChairmanAccessPanel({ currentUser }) {
  const [rooms,       setRooms]       = useState([]);
  const [activeRoom,  setActiveRoom]  = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [roomMembers, setRoomMembers] = useState({});   // { roomId: [member, ...] }
  const [loading,     setLoading]     = useState(false);
  const [loadingRooms,setLoadingRooms]= useState(true);
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState("all");
  const [confirm,     setConfirm]     = useState(null);
  const [lightbox,    setLightbox]    = useState(null);
  const [toast,       setToast]       = useState(null);
  const msgsRef = useRef(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── fetch ALL rooms ── */
  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const { data } = await axios.get(`${BASE}/chat/admin/all-rooms`, { withCredentials: true });
      setRooms(data);
      // Pre-fetch members for all DM rooms so we can show participant names
      const dmRooms = data.filter(r => r.room_type === "dm");
      const memberMap = {};
      await Promise.all(
        dmRooms.map(async (room) => {
          try {
            const { data: members } = await axios.get(`${BASE}/chat/room/${room.id}/members`, { withCredentials: true });
            memberMap[room.id] = members;
          } catch {}
        })
      );
      setRoomMembers(memberMap);
    } catch {
      try {
        const { data } = await axios.get(`${BASE}/chat/rooms`, { withCredentials: true });
        setRooms(data);
      } catch {}
    } finally { setLoadingRooms(false); }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  /* ── Derive a human-readable DM label: "Alice ↔ Bob" ── */
  const getDmLabel = (room) => {
    const members = roomMembers[room.id];
    if (members && members.length >= 2) {
      return members.map(m => m.name?.split(" ")[0] || m.name || "?").join(" ↔ ");
    }
    // Fallback to whatever name the server gave
    return room.name || "Direct Message";
  };

  /* ── open room ── */
  const openRoom = async (room) => {
    setActiveRoom(room);
    setMessages([]);
    setLoading(true);
    // Also fetch members for non-DM rooms on open
    if (room.room_type !== "dm" && !roomMembers[room.id]) {
      try {
        const { data: members } = await axios.get(`${BASE}/chat/room/${room.id}/members`, { withCredentials: true });
        setRoomMembers(prev => ({ ...prev, [room.id]: members }));
      } catch {}
    }
    try {
      // Use admin endpoint to fetch ALL messages including deleted ones with original content
      let data;
      try {
        const res = await axios.get(`${BASE}/chat/admin/room/${room.id}/messages`, { withCredentials: true });
        data = res.data;
      } catch {
        const res = await axios.get(`${BASE}/chat/room/${room.id}/messages`, { withCredentials: true });
        data = res.data;
      }
      setMessages(data);
    } catch {}
    finally { setLoading(false); }
  };

  /* scroll to bottom when messages load */
  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages]);

  /* ── delete room ── */
  const deleteRoom = async (room) => {
    try {
      await axios.delete(`${BASE}/chat/room/${room.id}`, { withCredentials: true });
      setRooms(prev => prev.filter(r => r.id !== room.id));
      if (activeRoom?.id === room.id) { setActiveRoom(null); setMessages([]); }
      showToast(`✅ Conversation deleted`);
    } catch { showToast("❌ Failed to delete", "error"); }
    finally { setConfirm(null); }
  };

  /* ── helpers ── */
  const typeIcon = (r) => r?.room_type === "dm" ? "💬" : r?.room_type === "group" ? "👥" : "🏛️";

  const typeBadge = (type) => ({
    dm:         { bg:"#ede9fe", color:"#6366f1" },
    group:      { bg:"#dcfce7", color:"#16a34a" },
    department: { bg:"#dbeafe", color:"#2563eb" },
  }[type] || { bg:"#f1f5f9", color:"#64748b" });

  /* ── Room display name ── */
  const getRoomDisplayName = (room) => {
    if (room.room_type === "dm") return getDmLabel(room);
    return room.name || "Unnamed";
  };

  const filtered = rooms.filter(r => {
    const displayName = getRoomDisplayName(r);
    if (search && !displayName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "dm")         return r.room_type === "dm";
    if (filter === "group")      return r.room_type === "group";
    if (filter === "department") return r.room_type === "department";
    return true;
  });

  const stats = {
    total: rooms.length,
    dm:    rooms.filter(r => r.room_type === "dm").length,
    group: rooms.filter(r => r.room_type === "group").length,
    dept:  rooms.filter(r => r.room_type === "department").length,
  };

  /* ══ RENDER ══ */
  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", display:"flex", flexDirection:"column", gap:16 }}>
      <Toast {...(toast||{})} />
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
      <ConfirmModal
        open={!!confirm}
        title={`Delete this conversation?`}
        body={confirm?.room?.room_type === "dm"
          ? `This will permanently delete the private conversation between ${getRoomDisplayName(confirm.room)} and all its messages. This cannot be undone.`
          : "This will permanently delete this group/channel and all its messages for everyone. This cannot be undone."}
        onConfirm={() => deleteRoom(confirm.room)}
        onCancel={() => setConfirm(null)}
      />

      {/* ── Stats ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { label:"Total Chats",      value:stats.total, color:"#6366f1", bg:"#ede9fe", emoji:"💬" },
          { label:"Direct Messages",  value:stats.dm,    color:"#7c3aed", bg:"#f5f3ff", emoji:"💌" },
          { label:"Group Chats",      value:stats.group, color:"#16a34a", bg:"#dcfce7", emoji:"👥" },
          { label:"Departments",      value:stats.dept,  color:"#2563eb", bg:"#dbeafe", emoji:"🏛️" },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:24 }}>{s.emoji}</span>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11, color:s.color, opacity:0.75, fontWeight:600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main panel ── */}
      <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden", minHeight:600, background:"#fff" }}>

        {/* ── LEFT: room list ── */}
        <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", flexDirection:"column", background:"#f8fafc" }}>

          {/* search + filter */}
          <div style={{ padding:"12px 10px 10px", borderBottom:"1px solid #e2e8f0", flexShrink:0 }}>
            <div style={{ position:"relative", marginBottom:8 }}>
              <span style={{ position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#94a3b8",fontSize:13 }}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by participant name…"
                style={{ width:"100%",padding:"7px 10px 7px 28px",fontSize:13,borderRadius:9,border:"1px solid #e2e8f0",background:"#fff",boxSizing:"border-box",outline:"none" }}/>
            </div>
            <div style={{ display:"flex",gap:2,background:"#fff",borderRadius:9,padding:3,border:"1px solid #e2e8f0" }}>
              {[["all","All"],["department","Depts"],["group","Groups"],["dm","DMs"]].map(([f,lbl])=>(
                <button key={f} onClick={()=>setFilter(f)}
                  style={{ flex:1,fontSize:11,fontWeight:500,padding:"4px 2px",borderRadius:6,border:"none",background:filter===f?"#6366f1":"transparent",color:filter===f?"#fff":"#64748b",cursor:"pointer",transition:"all 0.15s" }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* list */}
          <div style={{ flex:1, overflowY:"auto" }}>
            {loadingRooms ? (
              <div style={{ padding:24, textAlign:"center", color:"#94a3b8", fontSize:13 }}>Loading all chats…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding:24, textAlign:"center", color:"#94a3b8", fontSize:13 }}>No chats found</div>
            ) : filtered.map(room => {
              const act   = activeRoom?.id === room.id;
              const badge = typeBadge(room.room_type);
              const displayName = getRoomDisplayName(room);
              const members = roomMembers[room.id] || [];

              return (
                <div key={room.id} onClick={()=>openRoom(room)}
                  style={{ padding:"9px 10px", display:"flex", alignItems:"center", gap:9, borderLeft: act?"3px solid #6366f1":"3px solid transparent", background: act?"#ede9fe":"transparent", cursor:"pointer", borderBottom:"1px solid #f1f5f9", transition:"all 0.15s" }}>

                  {/* Avatar for DMs shows both participant initials */}
                  {room.room_type === "dm" && members.length >= 2 ? (
                    <div style={{ position:"relative", width:34, height:34, flexShrink:0 }}>
                      <div style={{ position:"absolute",top:0,left:0,width:22,height:22,borderRadius:"50%",background:colorFor(members[0]?.name||""),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",border:"2px solid #f8fafc",zIndex:2 }}>
                        {(members[0]?.name||"?")[0].toUpperCase()}
                      </div>
                      <div style={{ position:"absolute",bottom:0,right:0,width:22,height:22,borderRadius:"50%",background:colorFor(members[1]?.name||""),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",border:"2px solid #f8fafc",zIndex:1 }}>
                        {(members[1]?.name||"?")[0].toUpperCase()}
                      </div>
                    </div>
                  ) : (
                    <div style={{ width:34,height:34,borderRadius:9,background:"#fff",border:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0 }}>
                      {typeIcon(room)}
                    </div>
                  )}

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:2 }}>
                      <span style={{ fontSize:12,fontWeight:600,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:130 }}>{displayName}</span>
                      <span style={{ fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:6,background:badge.bg,color:badge.color,flexShrink:0 }}>{room.room_type}</span>
                      {room.unread_count > 0 && <span style={{ marginLeft:"auto",background:"#ef4444",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,flexShrink:0 }}>{room.unread_count}</span>}
                    </div>
                    {room.last_message && (
                      <div style={{ fontSize:11,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                        {room.last_message}
                      </div>
                    )}
                  </div>

                  {/* delete btn — dm & group only */}
                  {(room.room_type==="dm"||room.room_type==="group") && (
                    <button onClick={e=>{e.stopPropagation();setConfirm({room});}}
                      style={{ width:26,height:26,borderRadius:7,background:"transparent",border:"1px solid #fecaca",color:"#ef4444",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0 }}
                      onMouseEnter={e=>e.currentTarget.style.background="#fee2e2"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      🗑️
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: message viewer ── */}
        <div style={{ display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
          {activeRoom ? (
            <>
              {/* header */}
              <div style={{ padding:"12px 18px", borderBottom:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, background:"#fff", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  {/* Dual avatar in header for DMs */}
                  {activeRoom.room_type === "dm" && (roomMembers[activeRoom.id]||[]).length >= 2 ? (
                    <div style={{ position:"relative", width:40, height:40, flexShrink:0 }}>
                      <div style={{ position:"absolute",top:0,left:0,width:26,height:26,borderRadius:"50%",background:colorFor((roomMembers[activeRoom.id]||[])[0]?.name||""),display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",border:"2px solid #fff",zIndex:2 }}>
                        {((roomMembers[activeRoom.id]||[])[0]?.name||"?")[0].toUpperCase()}
                      </div>
                      <div style={{ position:"absolute",bottom:0,right:0,width:26,height:26,borderRadius:"50%",background:colorFor((roomMembers[activeRoom.id]||[])[1]?.name||""),display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",border:"2px solid #fff",zIndex:1 }}>
                        {((roomMembers[activeRoom.id]||[])[1]?.name||"?")[0].toUpperCase()}
                      </div>
                    </div>
                  ) : (
                    <div style={{ width:38,height:38,borderRadius:10,background:"#ede9fe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>
                      {typeIcon(activeRoom)}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize:15,fontWeight:700,color:"#1e293b" }}>{getRoomDisplayName(activeRoom)}</div>
                    <div style={{ fontSize:11,color:"#64748b" }}>
                      {activeRoom.room_type==="department" ? "Department channel"
                       : activeRoom.room_type==="dm"       ? `Private conversation · ${messages.length} messages`
                       : `Group conversation · ${messages.length} messages`}
                    </div>
                  </div>
                </div>
                {(activeRoom.room_type==="dm"||activeRoom.room_type==="group") && (
                  <button onClick={()=>setConfirm({room:activeRoom})}
                    style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:9,color:"#ef4444",fontSize:12,fontWeight:600,cursor:"pointer" }}>
                    🗑️ Delete {activeRoom.room_type==="dm"?"Conversation":"Group"}
                  </button>
                )}
              </div>

              {/* messages */}
              <div ref={msgsRef} style={{ flex:1, overflowY:"auto", padding:"14px 18px", display:"flex", flexDirection:"column", gap:1, minHeight:0 }}>
                {loading ? (
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"center",flex:1,flexDirection:"column",gap:8,color:"#64748b" }}>
                    <span style={{ fontSize:28 }}>⏳</span><span style={{ fontSize:13 }}>Loading messages…</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"center",flex:1,flexDirection:"column",gap:8,color:"#94a3b8" }}>
                    <span style={{ fontSize:36 }}>💭</span>
                    <span style={{ fontSize:13 }}>No messages yet in this chat</span>
                  </div>
                ) : messages.map((msg, i) => {
                  const prev     = messages[i-1];
                  const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
                  const showAvatar = !prev || prev.sender_id !== msg.sender_id || showDate || (new Date(msg.created_at)-new Date(prev.created_at))>300000;
                  const time = new Date(msg.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
                  const d = new Date(msg.created_at);
                  const t = new Date(); const y = new Date(); y.setDate(t.getDate()-1);
                  const dateLabel = d.toDateString()===t.toDateString()?"Today"
                    : d.toDateString()===y.toDateString()?"Yesterday"
                    : d.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"});

                  return (
                    <React.Fragment key={msg.id}>
                      {/* date divider */}
                      {showDate && (
                        <div style={{ display:"flex",alignItems:"center",gap:10,margin:"14px 0 8px" }}>
                          <div style={{ flex:1,height:1,background:"#e2e8f0" }}/>
                          <span style={{ fontSize:11,color:"#94a3b8",fontWeight:500,whiteSpace:"nowrap" }}>{dateLabel}</span>
                          <div style={{ flex:1,height:1,background:"#e2e8f0" }}/>
                        </div>
                      )}

                      {/* message row */}
                      <div style={{ display:"flex", gap:9, alignItems:"flex-end", marginBottom: showAvatar&&i>0?12:2 }}>
                        {/* avatar */}
                        <div style={{ width:32,flexShrink:0,paddingBottom:2 }}>
                          {showAvatar && (
                            <div style={{ width:32,height:32,borderRadius:"50%",background:colorFor(msg.sender_name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff" }}>
                              {(msg.sender_name||"?")[0].toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div style={{ maxWidth:"72%", minWidth:60 }}>
                          {/* name + role */}
                          {showAvatar && (
                            <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:3 }}>
                              <span style={{ fontSize:12,fontWeight:700,color:colorFor(msg.sender_name) }}>{msg.sender_name||"Unknown"}</span>
                              {msg.sender_role && <span style={{ fontSize:10,background:"#f1f5f9",color:"#64748b",padding:"1px 6px",borderRadius:4 }}>{msg.sender_role}</span>}
                            </div>
                          )}

                          {/* reply quote */}
                          {msg.reply_to_content && (
                            <div style={{ background:"#f1f5f9",borderLeft:"3px solid #6366f1",borderRadius:"0 6px 6px 0",padding:"5px 8px",marginBottom:4,fontSize:11 }}>
                              <div style={{ fontWeight:700,color:"#6366f1",marginBottom:1 }}>{msg.reply_to_sender}</div>
                              <div style={{ color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220 }}>{msg.reply_to_content}</div>
                            </div>
                          )}

                          {/* bubble — deleted messages show original content with red tint */}
                          <div style={{
                            background: msg.is_deleted ? "#fff5f5" : "#f8fafc",
                            color: msg.is_deleted ? "#991b1b" : "#1e293b",
                            padding: (msg.file_url && isImg(msg.file_url, msg.file_name||"")) ? "6px" : "9px 13px",
                            borderRadius:"4px 18px 18px 18px",
                            fontSize:13.5, lineHeight:1.55, wordBreak:"break-word",
                            border: msg.is_deleted ? "1px solid #fecaca" : "1px solid #e2e8f0",
                            boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
                          }}>
                            {msg.is_deleted ? (
                              /* ── Chairman sees the original content even if deleted ── */
                              <div>
                                <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom: msg.content ? 4 : 0 }}>
                                  <span style={{ fontSize:11,background:"#fee2e2",color:"#dc2626",padding:"1px 7px",borderRadius:4,fontWeight:600 }}>🗑 Deleted</span>
                                </div>
                                {msg.content && (
                                  <div style={{ whiteSpace:"pre-wrap", opacity:0.8, fontSize:13 }}>{msg.content}</div>
                                )}
                                {msg.file_url && (
                                  <div style={{ marginTop:4 }}>
                                    <FileAttachment url={msg.file_url} name={msg.file_name} size={msg.file_size} onImgClick={setLightbox}/>
                                  </div>
                                )}
                                {!msg.content && !msg.file_url && (
                                  <span style={{ fontStyle:"italic", fontSize:12, opacity:0.6 }}>(content unavailable)</span>
                                )}
                              </div>
                            ) : (
                              <>
                                {msg.content && <div style={{ whiteSpace:"pre-wrap", marginBottom: msg.file_url?4:0 }}>{msg.content}</div>}
                                {msg.file_url && (
                                  <FileAttachment
                                    url={msg.file_url}
                                    name={msg.file_name}
                                    size={msg.file_size}
                                    onImgClick={setLightbox}
                                  />
                                )}
                                {msg.is_edited && <span style={{ fontSize:10,opacity:0.5,marginLeft:6 }}>(edited)</span>}
                              </>
                            )}
                          </div>

                          {/* reactions */}
                          {msg.reactions?.length > 0 && (() => {
                            const g = {};
                            msg.reactions.forEach(r => { g[r.emoji]=(g[r.emoji]||0)+1; });
                            return (
                              <div style={{ display:"flex",gap:4,marginTop:3,flexWrap:"wrap" }}>
                                {Object.entries(g).map(([emoji,count])=>(
                                  <span key={emoji} style={{ display:"inline-flex",alignItems:"center",gap:3,background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:20,padding:"1px 8px",fontSize:12 }}>
                                    {emoji}<span style={{ fontSize:11,color:"#64748b",fontWeight:600 }}>{count}</span>
                                  </span>
                                ))}
                              </div>
                            );
                          })()}

                          {/* time */}
                          <div style={{ fontSize:10,color:"#94a3b8",marginTop:3 }}>{time}</div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* read-only footer */}
              <div style={{ padding:"10px 18px",borderTop:"1px solid #e2e8f0",background:"#fafafa",flexShrink:0,display:"flex",alignItems:"center",gap:8 }}>
                <span style={{ fontSize:14 }}>👁️</span>
                <span style={{ fontSize:12,color:"#94a3b8",fontStyle:"italic" }}>
                  Viewing as administrator — read-only. Deleted messages are visible to chairman. Click any image to enlarge.
                </span>
              </div>
            </>
          ) : (
            <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"#94a3b8" }}>
              <span style={{ fontSize:52 }}>👁️</span>
              <div style={{ fontSize:17,fontWeight:700,color:"#475569" }}>Select a chat to monitor</div>
              <div style={{ fontSize:13,color:"#94a3b8",textAlign:"center",maxWidth:320,lineHeight:1.6 }}>
                As chairman, you can view <strong style={{color:"#475569"}}>all conversations</strong> including private DMs between employees. Deleted messages are shown with their original content.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}