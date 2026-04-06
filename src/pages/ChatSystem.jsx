/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://backend.vjcoverseas.com";

const EMOJIS = ["👍","❤️","😂","😮","😢","🙏","🔥","✅","🎉","👏"];

const DEPT_ICONS = {
  "CEO":"👑","Director":"🎖️","Branch Manager":"🏢",
  "Digital Marketing":"📱","MIS":"📊","Developers-IT":"💻",
  "Reception-Hyd":"🏨","Reception-Bgl":"🏨","All Company":"🌐",
  dm:"💬",group:"👥",department:"🏛️",
};

const colorFor = (name="") => {
  const p=["#6366f1","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777","#0284c7","#16a34a"];
  return p[(name.charCodeAt(0)||0)%p.length];
};

const toInt = (v) => (v === null || v === undefined) ? null : parseInt(v, 10);

const typeIcon  = (r) => r.room_type==="dm"?"💬":DEPT_ICONS[r.name]||DEPT_ICONS[r.room_type]||"💬";
const fmtSize   = (b) => !b?"":b<1024?`${b} B`:b<1048576?`${(b/1024).toFixed(1)} KB`:`${(b/1048576).toFixed(1)} MB`;
const isImg     = (u="",n="") => /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(u+n);
const isVid     = (u="",n="") => /\.(mp4|mov|avi|mkv|webm|wmv|flv)$/i.test(u+n);
const isAud     = (u="",n="") => /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(u+n);

/* ══════════════════════════ TOAST SYSTEM ══════════════════════════ */
let _addToast = null;

function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{position:"fixed",top:16,right:16,zIndex:999999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>
      {toasts.map(t=>(
        <div key={t.id} style={{
          background:"#1e293b",color:"#fff",borderRadius:14,
          padding:"12px 16px",minWidth:290,maxWidth:370,
          boxShadow:"0 10px 40px rgba(0,0,0,0.35)",
          display:"flex",alignItems:"flex-start",gap:10,
          animation:"toastSlide 0.22s ease",pointerEvents:"all",
        }}>
          <style>{`@keyframes toastSlide{from{opacity:0;transform:translateX(50px)}to{opacity:1;transform:none}}`}</style>
          <span style={{fontSize:22,flexShrink:0}}>💬</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{t.title}</div>
            <div style={{fontSize:12,opacity:0.72,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.body}</div>
          </div>
          <button onClick={()=>onRemove(t.id)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.45)",cursor:"pointer",fontSize:17,padding:0,flexShrink:0}}>×</button>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════ NOTIFICATION ══════════════════════════ */
const sendNotify = (title, body, tag) => {
  if (typeof Notification !== "undefined") {
    if (Notification.permission === "granted") {
      try {
        const n = new Notification(title, { body: body?.slice(0,110)||"", icon:"/logo192.png", tag });
        n.onclick = () => { window.focus(); n.close(); };
        setTimeout(() => n.close(), 6000);
        return;
      } catch(e) {}
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then(perm => {
        if (perm === "granted") sendNotify(title, body, tag);
        else _addToast?.({ id:`${Date.now()}_${Math.random()}`, title, body });
      });
      return;
    }
  }
  _addToast?.({ id:`${Date.now()}_${Math.random()}`, title, body });
};

/* ══════════════════════════ AVATAR ══════════════════════════ */
function Avatar({ name="", image, size=36, online=false }) {
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return (
    <div style={{position:"relative",flexShrink:0}}>
      {image
        ? <img src={`${BASE}${image}`} alt={name} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",display:"block"}}/>
        : <div style={{width:size,height:size,borderRadius:"50%",background:colorFor(name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.36,fontWeight:700,color:"#fff"}}>{initials}</div>
      }
      <div style={{
        position:"absolute",bottom:0,right:0,
        width:size<=28?8:10,height:size<=28?8:10,
        borderRadius:"50%",
        background: online ? "#22c55e" : "#94a3b8",
        border:"2px solid #fff",
        boxShadow: online ? "0 0 0 1px #22c55e33" : "none",
        transition:"background 0.3s",
      }}/>
    </div>
  );
}

/* ══════════════════════════ FILE ATTACHMENT ══════════════════════════ */
function FileAttachment({ url, name, size, onImgClick, isBlob=false }) {
  const full = isBlob ? url : `${BASE}${url}`;
  if (isImg(url, name)) return (
    <img src={full} alt={name||"image"} onClick={()=>!isBlob&&onImgClick?.(full)}
      style={{maxWidth:260,maxHeight:200,borderRadius:10,objectFit:"cover",
        cursor:isBlob?"default":"pointer",marginTop:4,
        border:"1px solid rgba(0,0,0,0.08)",display:"block",
        opacity:isBlob?0.85:1,
      }}/>
  );
  if (isVid(url, name)) return (
    <video controls style={{maxWidth:280,borderRadius:10,marginTop:4,display:"block"}}>
      <source src={full}/>Your browser does not support video.
    </video>
  );
  if (isAud(url, name)) return (
    <audio controls style={{marginTop:6,display:"block",width:260}}><source src={full}/></audio>
  );
  const ext = (name||url||"").split(".").pop().toUpperCase();
  const ec  = {PDF:"#ef4444",DOC:"#2563eb",DOCX:"#2563eb",XLS:"#16a34a",XLSX:"#16a34a",PPT:"#f97316",PPTX:"#f97316",ZIP:"#6366f1",RAR:"#6366f1","7Z":"#6366f1",TXT:"#64748b",CSV:"#16a34a",MP4:"#0891b2",MP3:"#7c3aed"};
  return (
    <a href={isBlob?"#":full} target={isBlob?"_self":"_blank"} rel="noreferrer"
      onClick={isBlob?e=>e.preventDefault():undefined}
      style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(0,0,0,0.06)",border:"1px solid rgba(0,0,0,0.08)",borderRadius:10,padding:"10px 14px",marginTop:6,textDecoration:"none",color:"#1e293b",maxWidth:280,opacity:isBlob?0.7:1}}>
      <div style={{width:36,height:36,borderRadius:8,background:ec[ext]||"#64748b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{ext}</div>
      <div style={{minWidth:0}}>
        <div style={{fontSize:12,fontWeight:600,color:"inherit",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{name}</div>
        {size&&<div style={{fontSize:10,opacity:0.6}}>{fmtSize(size)}</div>}
      </div>
      {!isBlob&&<span style={{fontSize:14,flexShrink:0}}>⬇</span>}
    </a>
  );
}

/* ══════════════════════════ READ RECEIPT TICKS ══════════════════════════ */
function Ticks({ status }) {
  if (status === "sending") return <span style={{marginLeft:4,fontSize:10,opacity:0.5}}>⏳</span>;
  if (status === "sent")    return <span style={{marginLeft:4,fontSize:11,color:"#94a3b8"}}>✓</span>;
  if (status === "delivered") return <span style={{marginLeft:4,fontSize:11,color:"#94a3b8",letterSpacing:-2}}>✓✓</span>;
  if (status === "seen")    return <span style={{marginLeft:4,fontSize:11,color:"#3b82f6",letterSpacing:-2}}>✓✓</span>;
  return null;
}

/* ══════════════════════════ RIGHT-CLICK CONTEXT MENU ══════════════════════════ */
function CtxMenu({ x, y, msg, isMine, isChairman, onReply, onEdit, onDelete, onDownload, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({x,y});

  useEffect(()=>{
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      let nx=x, ny=y;
      if (x+r.width  > window.innerWidth -8)  nx = window.innerWidth -r.width -8;
      if (y+r.height > window.innerHeight-8)  ny = y-r.height;
      if (ny<8) ny=8;
      setPos({x:nx,y:ny});
    }
    const close=()=>onClose();
    const esc=e=>e.key==="Escape"&&onClose();
    const t=setTimeout(()=>{ document.addEventListener("click",close); document.addEventListener("keydown",esc); },40);
    return ()=>{ clearTimeout(t); document.removeEventListener("click",close); document.removeEventListener("keydown",esc); };
  },[]);

  const items=[
    {icon:"↩️",label:"Reply",          fn:()=>{onReply(msg);onClose();},      show:!msg.is_deleted},
    {icon:"✏️",label:"Edit message",   fn:()=>{onEdit(msg);onClose();},        show:isMine&&!msg.file_url&&!msg.is_deleted},
    {icon:"🗑️",label:"Delete message", fn:()=>{onDelete(msg.id);onClose();},   show:(isMine||isChairman)&&!msg.is_deleted, danger:true},
    {icon:isImg(msg.file_url||"",msg.file_name||"")?"🖼️":"⬇️",
     label:isImg(msg.file_url||"",msg.file_name||"")?"Download image":"Download file",
     fn:()=>{onDownload(msg);onClose();}, show:!!msg.file_url&&!msg.is_deleted&&!msg._isTemp},
  ].filter(i=>i.show);

  return (
    <div ref={ref} onClick={e=>e.stopPropagation()} style={{
      position:"fixed",left:pos.x,top:pos.y,
      background:"#fff",border:"1px solid #e2e8f0",borderRadius:13,
      boxShadow:"0 8px 36px rgba(0,0,0,0.18)",zIndex:99999,minWidth:192,overflow:"hidden",
      animation:"ctxIn 0.1s ease",
    }}>
      <style>{`@keyframes ctxIn{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}`}</style>
      {items.map((it,i)=>(
        <button key={i} onClick={it.fn} style={{
          display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 14px",
          background:"none",border:"none",cursor:"pointer",fontSize:13,
          color:it.danger?"#ef4444":"#1e293b",textAlign:"left",
          borderTop:i>0?"1px solid #f1f5f9":"none",
        }}
          onMouseEnter={e=>e.currentTarget.style.background=it.danger?"#fef2f2":"#f8fafc"}
          onMouseLeave={e=>e.currentTarget.style.background="none"}
        >
          <span style={{fontSize:16}}>{it.icon}</span>{it.label}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════ SMALL UI PIECES ══════════════════════════ */
const TypingDots = ({typers}) => !typers.length?null:(
  <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 20px 2px"}}>
    <div style={{display:"flex",gap:3}}>
      {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"#6366f1",animation:`bounce 1.2s ${i*0.2}s ease-in-out infinite`}}/>)}
    </div>
    <span style={{fontSize:11,color:"#64748b",fontStyle:"italic"}}>
      {typers.join(", ")} {typers.length===1?"is":"are"} typing…
    </span>
  </div>
);

const DateDiv = ({date}) => {
  const d=new Date(date),t=new Date(),y=new Date(); y.setDate(t.getDate()-1);
  const label=d.toDateString()===t.toDateString()?"Today":d.toDateString()===y.toDateString()?"Yesterday":d.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"});
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px"}}>
      <div style={{flex:1,height:1,background:"#e2e8f0"}}/>
      <span style={{fontSize:11,color:"#94a3b8",fontWeight:500,whiteSpace:"nowrap"}}>{label}</span>
      <div style={{flex:1,height:1,background:"#e2e8f0"}}/>
    </div>
  );
};

const ReplyBar = ({msg,onCancel}) => !msg?null:(
  <div style={{display:"flex",alignItems:"center",gap:8,background:"#f1f5f9",borderLeft:"3px solid #6366f1",borderRadius:"0 8px 8px 0",padding:"6px 10px",margin:"0 0 8px"}}>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:11,fontWeight:700,color:"#6366f1"}}>{msg.sender_name}</div>
      <div style={{fontSize:12,color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{msg.file_url?`📎 ${msg.file_name||"Attachment"}`:msg.content}</div>
    </div>
    <button onClick={onCancel} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:16}}>×</button>
  </div>
);

const EmojiPick = ({onSelect,onClose,isMine}) => (
  <div style={{
    position:"absolute",bottom:"calc(100% + 6px)",
    [isMine?"right":"left"]:0,
    background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,
    padding:"8px 10px",display:"flex",gap:4,flexWrap:"wrap",
    boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:100,width:220,
  }}>
    {EMOJIS.map(e=>(
      <button key={e} onClick={()=>{onSelect(e);onClose();}}
        style={{background:"none",border:"none",cursor:"pointer",fontSize:22,padding:"2px 3px",borderRadius:6}}>{e}</button>
    ))}
  </div>
);

const UploadBar = ({progress}) => progress===null?null:(
  <div style={{padding:"4px 14px 6px"}}>
    <div style={{height:4,background:"#e2e8f0",borderRadius:4,overflow:"hidden"}}>
      <div style={{height:"100%",background:"linear-gradient(90deg,#6366f1,#818cf8)",borderRadius:4,width:`${progress}%`,transition:"width 0.2s"}}/>
    </div>
    <div style={{fontSize:10,color:"#94a3b8",marginTop:3}}>Uploading {progress}%…</div>
  </div>
);

const NotifBanner = ({onDismiss}) => (
  <div style={{background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",padding:"10px 16px",display:"flex",alignItems:"center",gap:10,fontSize:13,flexShrink:0}}>
    <span style={{fontSize:18}}>🔔</span>
    <span style={{flex:1}}>Enable desktop notifications to never miss a message.</span>
    <button onClick={async()=>{
      if(typeof Notification!=="undefined"){
        const perm=await Notification.requestPermission();
        if(perm==="granted") new Notification("✅ Enabled!",{body:"You'll get message alerts.",icon:"/logo192.png"});
      }
      onDismiss();
    }} style={{background:"#fff",color:"#6366f1",border:"none",borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Enable</button>
    <button onClick={onDismiss} style={{background:"none",border:"none",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontSize:18}}>×</button>
  </div>
);

/* ══════════════════════════ MESSAGE BUBBLE ══════════════════════════ */
function Bubble({ msg, isMine, isChairman, showAvatar, userId, onlineUsers, onEdit, onDelete, onReact, onReply, onImgClick, onCtx }) {
  const [hover,   setHover]   = useState(false);
  const [showEmj, setShowEmj] = useState(false);
  const time = new Date(msg.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});

  const tickStatus = useMemo(()=>{
    if (!isMine) return null;
    if (msg._isTemp) return "sending";
    const readBy = (msg.read_by || []).map(toInt);
    const myId   = toInt(userId);
    if (readBy.length <= 1) return "sent";
    const othersRead = readBy.filter(id => id !== myId);
    if (othersRead.length > 0) return "seen";
    return "delivered";
  },[isMine, msg._isTemp, msg.read_by, userId]);

  const reactions = useMemo(()=>{
    if(!msg.reactions?.length) return [];
    const g={};
    msg.reactions.forEach(r=>{ if(!g[r.emoji]) g[r.emoji]={emoji:r.emoji,count:0,mine:false}; g[r.emoji].count++; if(toInt(r.user_id)===toInt(userId)) g[r.emoji].mine=true; });
    return Object.values(g);
  },[msg.reactions,userId]);

  const isUploading = !!msg._isTemp && !!msg.file_url;

  return (
    <div
      style={{display:"flex",gap:8,flexDirection:isMine?"row-reverse":"row",alignItems:"flex-end",padding:"0 12px",position:"relative"}}
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>{setHover(false);setShowEmj(false);}}
      onContextMenu={e=>{e.preventDefault();if(!msg.is_deleted&&!msg._isTemp) onCtx(e.clientX,e.clientY,msg,isMine);}}
    >
      <div style={{width:32,flexShrink:0,paddingBottom:2}}>
        {!isMine&&showAvatar&&(
          <Avatar name={msg.sender_name} image={msg.sender_image} size={32} online={onlineUsers?.has(toInt(msg.sender_id))}/>
        )}
      </div>

      <div style={{maxWidth:"68%",minWidth:60}}>
        {!isMine&&showAvatar&&(
          <div style={{fontSize:11,color:"#64748b",marginBottom:2,display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontWeight:700,color:colorFor(msg.sender_name)}}>{msg.sender_name}</span>
            <span style={{background:"#f1f5f9",color:"#64748b",padding:"1px 5px",borderRadius:4,fontSize:10}}>{msg.sender_role}</span>
            {onlineUsers?.has(toInt(msg.sender_id))&&(
              <span style={{fontSize:9,color:"#22c55e",fontWeight:600}}>● online</span>
            )}
          </div>
        )}

        {msg.reply_to_content&&(
          <div style={{background:isMine?"rgba(255,255,255,0.15)":"#f1f5f9",borderLeft:`3px solid ${isMine?"rgba(255,255,255,0.5)":"#6366f1"}`,borderRadius:"0 6px 6px 0",padding:"5px 8px",marginBottom:4,fontSize:11}}>
            <div style={{fontWeight:700,color:isMine?"rgba(255,255,255,0.9)":"#6366f1"}}>{msg.reply_to_sender}</div>
            <div style={{color:isMine?"rgba(255,255,255,0.75)":"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:200}}>{msg.reply_to_content}</div>
          </div>
        )}

        <div style={{
          background: isMine ? "linear-gradient(135deg,#6366f1,#818cf8)" : "#f8fafc",
          color: isMine ? "#fff" : "#1e293b",
          padding: msg.file_url&&isImg(msg.file_url,msg.file_name||"") ? "6px" : "9px 13px",
          borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          fontSize: 13.5, lineHeight: 1.55, wordBreak:"break-word",
          border: isMine ? "none" : "1px solid #e2e8f0",
          boxShadow: isMine ? "0 2px 8px rgba(99,102,241,0.25)" : "0 1px 3px rgba(0,0,0,0.04)",
          userSelect: "text",
          position: "relative",
          opacity: isUploading ? 0.8 : 1,
          transition: "opacity 0.2s",
        }}>
          {msg.is_deleted
            ? <span style={{fontStyle:"italic",opacity:0.6}}>🚫 Message deleted</span>
            : <>
                {msg.content && <div style={{whiteSpace:"pre-wrap",marginBottom:msg.file_url?4:0}}>{msg.content}</div>}
                {msg.file_url && (
                  <FileAttachment
                    url={msg.file_url}
                    name={msg.file_name}
                    size={msg.file_size}
                    onImgClick={onImgClick}
                    isBlob={!!msg._isBlob}
                  />
                )}
                {isUploading && (
                  <div style={{fontSize:10,color:isMine?"rgba(255,255,255,0.7)":"#94a3b8",marginTop:3,display:"flex",alignItems:"center",gap:4}}>
                    <span style={{animation:"pulse 1s ease-in-out infinite",display:"inline-block"}}>⏳</span> Uploading…
                  </div>
                )}
                {msg.is_edited&&!isUploading&&<span style={{fontSize:10,opacity:0.6,marginLeft:6}}>(edited)</span>}

                {hover&&!msg.is_deleted&&!msg._isTemp&&(
                  <div style={{
                    position:"absolute",
                    bottom:-38,
                    [isMine?"right":"left"]:0,
                    display:"flex",gap:2,
                    background:"#fff",
                    border:"1px solid #e2e8f0",
                    borderRadius:10,
                    padding:"3px 4px",
                    boxShadow:"0 4px 12px rgba(0,0,0,0.1)",
                    zIndex:20,
                    whiteSpace:"nowrap",
                  }}>
                    {[
                      {icon:"↩️", title:"Reply",  fn:()=>onReply(msg)},
                      {icon:"😊", title:"React",   fn:()=>setShowEmj(p=>!p)},
                      !msg.file_url && isMine ? {icon:"✏️", title:"Edit", fn:()=>onEdit(msg)} : null,
                      (isMine||isChairman) ? {icon:"🗑️", title:"Delete", fn:()=>onDelete(msg.id)} : null,
                    ].filter(Boolean).map((b,i)=>(
                      <button key={i} title={b.title} onClick={b.fn}
                        style={{background:"none",border:"none",cursor:"pointer",fontSize:14,padding:"3px 5px",borderRadius:6}}
                        onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"}
                        onMouseLeave={e=>e.currentTarget.style.background="none"}>{b.icon}</button>
                    ))}
                    {showEmj&&(
                      <EmojiPick onSelect={e=>onReact(msg.id,e)} onClose={()=>setShowEmj(false)} isMine={isMine}/>
                    )}
                  </div>
                )}
              </>
          }
        </div>

        {reactions.length>0&&(
          <div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>
            {reactions.map(r=>(
              <button key={r.emoji} onClick={()=>onReact(msg.id,r.emoji)}
                style={{display:"flex",alignItems:"center",gap:3,background:r.mine?"#ede9fe":"#f1f5f9",border:`1px solid ${r.mine?"#a5b4fc":"#e2e8f0"}`,borderRadius:20,padding:"1px 7px",fontSize:13,cursor:"pointer"}}>
                {r.emoji}<span style={{fontSize:11,fontWeight:600,color:r.mine?"#6366f1":"#64748b"}}>{r.count}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{fontSize:10,color:"#94a3b8",marginTop:4,display:"flex",alignItems:"center",gap:2,justifyContent:isMine?"flex-end":"flex-start"}}>
          <span>{time}</span>
          {tickStatus && <Ticks status={tickStatus}/>}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════ LIGHTBOX ══════════════════════════ */
const Lightbox = ({src,onClose}) => !src?null:(
  <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,cursor:"zoom-out"}}>
    <img src={src} alt="" style={{maxWidth:"90vw",maxHeight:"90vh",borderRadius:8,objectFit:"contain"}}/>
    <div style={{position:"absolute",top:20,right:24,display:"flex",gap:10}}>
      <a href={src} download onClick={e=>e.stopPropagation()} style={{background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:18,borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none"}}>⬇️</a>
      <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",fontSize:28,cursor:"pointer",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
    </div>
  </div>
);

/* ══════════════════════════ MODALS ══════════════════════════ */
const ConfirmModal = ({open,title,body,onConfirm,onCancel}) => !open?null:(
  <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,backdropFilter:"blur(4px)"}} onClick={onCancel}>
    <div style={{background:"#fff",borderRadius:16,padding:28,width:360,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}>
      <div style={{fontSize:22,marginBottom:10}}>🗑️</div>
      <div style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:8}}>{title}</div>
      <div style={{fontSize:13,color:"#64748b",lineHeight:1.6,marginBottom:24}}>{body}</div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={onConfirm} style={{flex:1,padding:"10px 0",background:"#ef4444",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>Yes, Delete</button>
        <button onClick={onCancel}  style={{flex:1,padding:"10px 0",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,fontSize:13,cursor:"pointer"}}>Cancel</button>
      </div>
    </div>
  </div>
);

const EditModal = ({msg,onSave,onClose}) => {
  const [text,setText]=useState(msg?.content||"");
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:16,padding:24,width:420,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>✏️ Edit Message</div>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={4} autoFocus
          style={{width:"100%",padding:"10px 12px",fontSize:13,borderRadius:10,border:"1.5px solid #6366f1",outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <button onClick={()=>text.trim()&&onSave(msg.id,text.trim())} style={{flex:1,padding:10,background:"#6366f1",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>💾 Save</button>
          <button onClick={onClose} style={{flex:1,padding:10,background:"#f8fafc",color:"#1e293b",border:"1px solid #e2e8f0",borderRadius:10,fontSize:13,cursor:"pointer"}}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

const NewGroupModal = ({allUsers,onClose,onCreate}) => {
  const [name,setName]=useState(""); const [sel,setSel]=useState([]); const [q,setQ]=useState("");
  const list=allUsers.filter(u=>!q||u.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:18,padding:26,width:420,maxHeight:580,display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:16,fontWeight:700,color:"#1e293b",marginBottom:16}}>👥 Create Group Chat</div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Group name…" autoFocus style={{padding:"10px 12px",fontSize:13,borderRadius:10,border:"1.5px solid #6366f1",background:"transparent",color:"#1e293b",marginBottom:12,outline:"none"}}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search members…" style={{padding:"8px 12px",fontSize:13,borderRadius:10,border:"1px solid #e2e8f0",background:"#f8fafc",color:"#1e293b",marginBottom:10,outline:"none"}}/>
        <div style={{flex:1,overflowY:"auto",border:"1px solid #e2e8f0",borderRadius:10,padding:4}}>
          {list.map(u=>(
            <label key={u.user_id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",cursor:"pointer",borderRadius:8}}
              onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <input type="checkbox" checked={sel.includes(u.user_id)} onChange={e=>setSel(p=>e.target.checked?[...p,u.user_id]:p.filter(id=>id!==u.user_id))} style={{accentColor:"#6366f1",width:15,height:15}}/>
              <Avatar name={u.name} size={28}/>
              <span style={{fontSize:13,fontWeight:500,color:"#1e293b"}}>{u.name} <span style={{color:"#64748b",fontSize:11}}>({u.role})</span></span>
            </label>
          ))}
        </div>
        <div style={{marginTop:4,fontSize:11,color:"#94a3b8"}}>{sel.length} selected</div>
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <button onClick={()=>name.trim()&&onCreate(name.trim(),sel)} disabled={!name.trim()} style={{flex:1,padding:10,background:name.trim()?"#6366f1":"#e2e8f0",color:name.trim()?"#fff":"#94a3b8",border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:name.trim()?"pointer":"default"}}>Create Group</button>
          <button onClick={onClose} style={{flex:1,padding:10,background:"#f8fafc",color:"#1e293b",border:"1px solid #e2e8f0",borderRadius:10,fontSize:13,cursor:"pointer"}}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

const DMPickerModal = ({allUsers,onClose,onStart,onlineUsers}) => {
  const [q,setQ]=useState("");
  const list=allUsers.filter(u=>!q||u.name?.toLowerCase().includes(q.toLowerCase())||u.role?.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:18,padding:24,width:380,maxHeight:520,display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:15,fontWeight:700,color:"#1e293b",marginBottom:14}}>💬 New Direct Message</div>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, role…" autoFocus style={{padding:"9px 12px",fontSize:13,borderRadius:10,border:"1.5px solid #6366f1",background:"transparent",color:"#1e293b",marginBottom:12,outline:"none"}}/>
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
          {list.length===0
            ? <div style={{textAlign:"center",padding:24,fontSize:13,color:"#64748b"}}>No employees found</div>
            : list.map(u=>(
              <div key={u.user_id} onClick={()=>onStart(u.email)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"10px 8px",cursor:"pointer",borderRadius:10}}
                onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Avatar name={u.name} size={36} online={onlineUsers?.has(toInt(u.user_id))}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{u.name}</div>
                  <div style={{fontSize:11,color:onlineUsers?.has(toInt(u.user_id))?"#22c55e":"#94a3b8"}}>
                    {onlineUsers?.has(toInt(u.user_id))?"● Online":u.role}
                  </div>
                </div>
                <span style={{fontSize:11,color:"#6366f1",fontWeight:500}}>Message →</span>
              </div>
            ))
          }
        </div>
        <button onClick={onClose} style={{marginTop:14,padding:9,background:"#f8fafc",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:10,fontSize:13,cursor:"pointer"}}>Cancel</button>
      </div>
    </div>
  );
};

const GroupInfoPanel = ({room,members,isChairman,allUsers,onlineUsers,onAdd,onRemove,onClose}) => {
  const [adding,setAdding]=useState(false); const [uid,setUid]=useState("");
  const notIn=allUsers.filter(u=>!members.find(m=>m.user_id===u.user_id));
  return (
    <div style={{width:280,borderLeft:"1px solid #e2e8f0",display:"flex",flexDirection:"column",background:"#f8fafc",minHeight:0,overflow:"hidden"}}>
      <div style={{padding:"14px 16px",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontSize:14,fontWeight:700,color:"#1e293b"}}>{room.name}</div><div style={{fontSize:11,color:"#64748b",marginTop:1}}>{members.length} members</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:18}}>×</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
        {members.map(m=>(
          <div key={m.user_id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px"}}>
            <Avatar name={m.name} image={m.image} size={32} online={onlineUsers?.has(toInt(m.user_id))}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</div>
              <div style={{fontSize:10,color:onlineUsers?.has(toInt(m.user_id))?"#22c55e":"#94a3b8"}}>{onlineUsers?.has(toInt(m.user_id))?"● Online":m.role}</div>
            </div>
            {isChairman&&room.room_type!=="department"&&<button onClick={()=>onRemove(m.user_id)} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:16,padding:2}}>×</button>}
          </div>
        ))}
      </div>
      {isChairman&&room.room_type!=="department"&&room.room_type!=="dm"&&(
        <div style={{padding:12,borderTop:"1px solid #e2e8f0"}}>
          {!adding
            ? <button onClick={()=>setAdding(true)} style={{width:"100%",padding:"8px 0",background:"#6366f1",color:"#fff",border:"none",borderRadius:9,fontSize:12,fontWeight:600,cursor:"pointer"}}>➕ Add Member</button>
            : <div style={{display:"flex",gap:6}}>
                <select value={uid} onChange={e=>setUid(e.target.value)} style={{flex:1,padding:"7px 8px",fontSize:12,borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",color:"#1e293b",outline:"none"}}>
                  <option value="">Select…</option>
                  {notIn.map(u=><option key={u.user_id} value={u.user_id}>{u.name}</option>)}
                </select>
                <button onClick={()=>{if(uid){onAdd(parseInt(uid));setUid("");setAdding(false);}}} style={{padding:"7px 10px",background:"#6366f1",color:"#fff",border:"none",borderRadius:8,cursor:"pointer"}}>✓</button>
                <button onClick={()=>setAdding(false)} style={{padding:"7px 10px",background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,cursor:"pointer"}}>✗</button>
              </div>
          }
        </div>
      )}
    </div>
  );
};

const MsgSearch = ({messages,onHighlight,onClose}) => {
  const [q,setQ]=useState("");
  const results=useMemo(()=>!q.trim()?[]:messages.filter(m=>m.content&&m.content.toLowerCase().includes(q.toLowerCase())),[q,messages]);
  return (
    <div style={{position:"absolute",top:62,right:12,zIndex:50,background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:12,width:300,boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search messages…" autoFocus style={{flex:1,padding:"7px 10px",fontSize:13,borderRadius:8,border:"1px solid #e2e8f0",outline:"none"}}/>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:18}}>×</button>
      </div>
      {q&&<div style={{maxHeight:220,overflowY:"auto"}}>
        {results.length===0
          ?<div style={{fontSize:12,color:"#94a3b8",padding:"8px 4px"}}>No results</div>
          :results.map(m=>(
            <div key={m.id} onClick={()=>onHighlight(m.id)}
              style={{padding:"7px 6px",cursor:"pointer",borderRadius:8,fontSize:12}}
              onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontWeight:600,color:"#334155"}}>{m.sender_name}: </span>
              <span style={{color:"#64748b"}}>{(m.content||"").slice(0,60)}{(m.content||"").length>60?"…":""}</span>
            </div>
          ))
        }
      </div>}
    </div>
  );
};

/* ══════════════════════════ MAIN COMPONENT ══════════════════════════ */
export default function ChatSystem({ currentUser, isChairman=false }) {
  const [rooms,       setRooms]       = useState([]);
  const [activeRoom,  setActiveRoom]  = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [typers,      setTypers]      = useState([]);
  const [sideQ,       setSideQ]       = useState("");
  const [allUsers,    setAllUsers]    = useState([]);
  const [filter,      setFilter]      = useState("all");
  const [totalUnread, setTotalUnread] = useState(0);
  const [showScroll,  setShowScroll]  = useState(false);
  const [lightbox,    setLightbox]    = useState(null);
  const [grpMembers,  setGrpMembers]  = useState([]);
  const [showInfo,    setShowInfo]    = useState(false);
  const [showDM,      setShowDM]      = useState(false);
  const [showGrp,     setShowGrp]     = useState(false);
  const [editMsg,     setEditMsg]     = useState(null);
  const [replyTo,     setReplyTo]     = useState(null);
  const [uploadPct,   setUploadPct]   = useState(null);
  const [showSrch,    setShowSrch]    = useState(false);
  const [hlId,        setHlId]        = useState(null);
  const [confirm,     setConfirm]     = useState(null);
  const [dragOver,    setDragOver]    = useState(false);
  const [ctxMenu,     setCtxMenu]     = useState(null);
  const [notifBanner, setNotifBanner] = useState(false);
  const [toasts,      setToasts]      = useState([]);
  const [sending,     setSending]     = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const socketRef   = useRef(null);
  const msgsRef     = useRef(null);
  const typingTimer = useRef(null);
  const curRoom     = useRef(null);
  const atBottom    = useRef(true);
  const textareaRef = useRef(null);
  const fileRef     = useRef(null);
  const curUserRef  = useRef(currentUser);
  useEffect(()=>{ curUserRef.current=currentUser; },[currentUser]);

  /* ── Toast ── */
  useEffect(()=>{
    _addToast = t => {
      setToasts(p=>[...p,t]);
      setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==t.id)), 5000);
    };
    return ()=>{ _addToast=null; };
  },[]);

  /* ── Notification banner ── */
  useEffect(()=>{
    if(typeof Notification!=="undefined" && Notification.permission!=="granted") setNotifBanner(true);
  },[]);

  /* ── Scroll ── */
  const scrollToBottom = useCallback((force=false)=>{
    const el=msgsRef.current; if(!el) return;
    if(force||atBottom.current) el.scrollTop=el.scrollHeight;
  },[]);

  const handleScroll = useCallback(()=>{
    const el=msgsRef.current; if(!el) return;
    const d=el.scrollHeight-el.scrollTop-el.clientHeight;
    atBottom.current=d<80; setShowScroll(d>200);
  },[]);

  /* ══════════════════════════ SOCKET ══════════════════════════ */
  useEffect(()=>{
    const socket=io(BASE,{
      path:"/socket.io/",
      transports:["polling","websocket"],
      withCredentials:true,
      reconnection:true,
      reconnectionAttempts:Infinity,
      reconnectionDelay:1000,
      reconnectionDelayMax:8000,
    });
    socketRef.current=socket;

    socket.on("connect",()=>{
      console.log("✅ Socket connected:",socket.id);
      if(curUserRef.current?.id){
        socket.emit("user_online",{user_id:toInt(curUserRef.current.id)});
      }
      if(curRoom.current){
        socket.emit("join_chat_room",{room_id:curRoom.current});
      }
    });
    socket.on("disconnect",r=>console.warn("⚠️ Socket disconnected:",r));
    socket.on("connect_error",e=>console.error("❌ Socket error:",e.message));

    socket.on("online_users",(userIds)=>{
      setOnlineUsers(new Set((userIds||[]).map(toInt)));
    });
    socket.on("user_came_online",({user_id})=>{
      setOnlineUsers(prev=>new Set([...prev, toInt(user_id)]));
    });
    socket.on("user_went_offline",({user_id})=>{
      setOnlineUsers(prev=>{ const s=new Set(prev); s.delete(toInt(user_id)); return s; });
    });

    /* ═══════════════════════════════════════════════════════════════
       new_message handler
       ───────────────────────────────────────────────────────────────
       KEY RULE:
         Own messages  → IGNORED completely by socket.
                         The optimistic temp bubble already shows the
                         full content. axios.post() replaces it with
                         the real DB row when it resolves.
                         Letting socket also touch it causes blank
                         or duplicate bubbles.

         Others' msgs  → appended normally (with dedup guard).
       ═══════════════════════════════════════════════════════════════ */
    socket.on("new_message",(msg)=>{
      const msgRoomId = toInt(msg.room_id);
      const isCurRoom = msgRoomId === curRoom.current;
      const isMyMsg   = toInt(msg.sender_id) === toInt(curUserRef.current?.id);

      // ── Own messages: socket does NOTHING to the message list ──
      // axios.post already handles the optimistic → real replacement.
     if(!isMyMsg && isCurRoom){
  setMessages(prev=>{
    if(prev.find(m=>toInt(m.id)===toInt(msg.id))) return prev;
    return [...prev, {
      ...msg,
      room_id: msgRoomId,
      content: msg.content ?? "",          // ← never undefined
      reactions: msg.reactions ?? [],
      read_by:   msg.read_by   ?? [],
    }];
  });
        if(document.hasFocus())
          axios.post(`${BASE}/chat/mark-read`,{message_ids:[msg.id]},{withCredentials:true}).catch(()=>{});
      }

      // ── Update sidebar last_message for everyone ──
      setRooms(prev=>prev.map(r=>toInt(r.id)===msgRoomId ? {
        ...r,
        last_message:     msg.file_url ? `📎 ${msg.file_name||"File"}` : msg.content,
        last_message_at:  msg.created_at,
        unread_count:     isCurRoom ? 0 : (r.unread_count||0) + (isMyMsg ? 0 : 1),
      } : r).sort((a,b)=>new Date(b.last_message_at||0)-new Date(a.last_message_at||0)));

      // ── Notification: only for other people's messages ──
      if(!isMyMsg && (!isCurRoom || !document.hasFocus())){
        const notifTitle = msg.sender_name || "New message";
        const notifBody = msg.content
  ? msg.content                                         // ← always prefer text
  : msg.file_name
    ? `📎 ${msg.file_name}`
    : "Sent a message";
        sendNotify(notifTitle, notifBody, `chat-${msgRoomId}`);
      }
    });

    socket.on("messages_read",({reader_id, message_ids})=>{
      if(toInt(reader_id)===toInt(curUserRef.current?.id)) return;
      const readerInt = toInt(reader_id);
      setMessages(prev=>prev.map(m=>
        message_ids.map(toInt).includes(toInt(m.id))
          ? {...m, read_by: [...new Set([...(m.read_by||[]).map(toInt), readerInt])]}
          : m
      ));
    });

    socket.on("message_edited",  ({message_id,content})=>setMessages(p=>p.map(m=>toInt(m.id)===toInt(message_id)?{...m,content,is_edited:true}:m)));
    socket.on("message_deleted", ({message_id})=>setMessages(p=>p.map(m=>toInt(m.id)===toInt(message_id)?{...m,is_deleted:true,content:""}:m)));
    socket.on("message_reaction",({message_id,reactions})=>setMessages(p=>p.map(m=>toInt(m.id)===toInt(message_id)?{...m,reactions}:m)));
    socket.on("room_deleted",({room_id})=>{
      const rid=toInt(room_id);
      setRooms(p=>p.filter(r=>toInt(r.id)!==rid));
      if(curRoom.current===rid){setActiveRoom(null);setMessages([]);curRoom.current=null;}
    });
    socket.on("member_added",  ({room_id})=>{ if(curRoom.current===toInt(room_id)) fetchMembers(toInt(room_id)); });
    socket.on("member_removed",({room_id})=>{ if(curRoom.current===toInt(room_id)) fetchMembers(toInt(room_id)); });

    socket.on("typing_indicator",({user_name,is_typing,room_id})=>{
      if(toInt(room_id)!==curRoom.current) return;
      setTypers(p=>is_typing?[...new Set([...p,user_name])]:p.filter(n=>n!==user_name));
    });

    const handleBeforeUnload = () => {
      if(curUserRef.current?.id) socket.emit("user_offline",{user_id:toInt(curUserRef.current.id)});
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return ()=>{
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.disconnect();
    };
  },[]);

  /* ── Fetch rooms ── */
  const fetchRooms = useCallback(async()=>{
    try{
      const {data}=await axios.get(`${BASE}/chat/rooms`,{withCredentials:true});
      setRooms(data);
      setTotalUnread(data.reduce((s,r)=>s+(r.unread_count||0),0));
    }catch(e){console.error("fetchRooms:",e);}
  },[]);
  useEffect(()=>{ fetchRooms(); },[fetchRooms]);

  useEffect(()=>{
    axios.get(`${BASE}/chat/users`,{withCredentials:true}).then(r=>setAllUsers(r.data)).catch(()=>{});
  },[]);

  const fetchMembers = useCallback(async(roomId)=>{
    try{
      const {data}=await axios.get(`${BASE}/chat/room/${roomId}/members`,{withCredentials:true});
      setGrpMembers(data);
    }catch{}
  },[]);

  /* ── Open room ── */
  const openRoom = useCallback(async(room)=>{
    const roomId = toInt(room.id);
    if(curRoom.current) socketRef.current?.emit("leave_chat_room",{room_id:curRoom.current});
    curRoom.current = roomId;
    socketRef.current?.emit("join_chat_room",{room_id:roomId});

    setActiveRoom(room);
    setMessages([]);
    setGrpMembers([]);
    setTypers([]);
    setReplyTo(null);
    setShowSrch(false);
    setShowInfo(false);
    setLoading(true);
    atBottom.current=true;

    try{
      const {data}=await axios.get(`${BASE}/chat/room/${roomId}/messages`,{withCredentials:true});
      setMessages(data);
      setRooms(p=>p.map(r=>toInt(r.id)===roomId?{...r,unread_count:0}:r));
    }catch(e){console.error(e);}
    finally{ setLoading(false); }

    fetchMembers(roomId);
  },[fetchMembers]);

  useEffect(()=>{ const r=requestAnimationFrame(()=>scrollToBottom()); return ()=>cancelAnimationFrame(r); },[messages,scrollToBottom]);

  useEffect(()=>{
    if(!hlId) return;
    const el=document.getElementById(`msg-${hlId}`);
    if(el){ el.scrollIntoView({behavior:"smooth",block:"center"}); el.style.background="#fef9c3"; setTimeout(()=>{el.style.background="";setHlId(null);},2000); }
  },[hlId]);

  useEffect(()=>{
    const el=textareaRef.current; if(!el) return;
    el.style.height="auto"; el.style.height=Math.min(el.scrollHeight,130)+"px";
  },[input]);

  useEffect(()=>{
    if(!ctxMenu) return;
    const h=()=>setCtxMenu(null);
    document.addEventListener("click",h);
    return ()=>document.removeEventListener("click",h);
  },[ctxMenu]);

  /* ══════════════════════════ SEND TEXT ══════════════════════════ */
  const sendMessage=async()=>{
    if(!input.trim()||!activeRoom||sending) return;
    const content=input.trim();
    const replyId=replyTo?.id ? toInt(replyTo.id) : null;
    setInput(""); setReplyTo(null); setSending(true); atBottom.current=true;

    const tempId=`tmp_${Date.now()}`;
    const myId = toInt(currentUser?.id);

    // Add optimistic bubble immediately with full content
    setMessages(p=>[...p,{
      id:tempId, room_id:toInt(activeRoom.id), content,
      sender_id:myId, sender_name:currentUser?.name,
      sender_image:currentUser?.image, sender_role:currentUser?.role,
      created_at:new Date().toISOString(),
      is_edited:false, is_deleted:false,
      file_url:null, file_name:null, file_size:null,
      reply_to_id:replyId,
      reply_to_content:replyTo?.content||null,
      reply_to_sender:replyTo?.sender_name||null,
      reactions:[], read_by:[myId],
      _isTemp:true,
    }]);

    const payload = { room_id: toInt(activeRoom.id), content };
    if (replyId) payload.reply_to_id = replyId;

    try{
      const {data}=await axios.post(`${BASE}/chat/send`, payload, {withCredentials:true});
      // Socket ignores own messages so temp is always still here — replace it
      setMessages(p=>p.map(m=>m.id===tempId ? {...m, ...data, _isTemp:false} : m));
    }catch(e){
      console.error("sendMessage error:",e);
      setMessages(p=>p.filter(m=>m.id!==tempId));
      setInput(content);
    }finally{ setSending(false); }
  };

  /* ══════════════════════════ SEND FILE ══════════════════════════ */
  const sendFile=async(file)=>{
    if(!activeRoom||!file) return;
    if(file.size>50*1024*1024){ _addToast?.({id:Date.now(),title:"File too large",body:"Max 50 MB."}); return; }

    const fd=new FormData();
    fd.append("file",file);
    fd.append("room_id",String(toInt(activeRoom.id)));
    if(input.trim())  fd.append("content",input.trim());
    if(replyTo?.id)   fd.append("reply_to_id",String(toInt(replyTo.id)));

    const tempId     = `tmp_file_${Date.now()}`;
    const blobUrl    = URL.createObjectURL(file);
    const captionNow = input.trim();
    const myId       = toInt(currentUser?.id);
    setInput(""); setReplyTo(null); setUploadPct(0); atBottom.current=true;

    setMessages(p=>[...p,{
      id:tempId, room_id:toInt(activeRoom.id),
      content: captionNow || "",
      sender_id:myId, sender_name:currentUser?.name,
      sender_image:currentUser?.image, sender_role:currentUser?.role,
      created_at:new Date().toISOString(),
      is_edited:false, is_deleted:false,
      file_url:blobUrl, file_name:file.name, file_size:file.size,
      reply_to_id:replyTo?.id?toInt(replyTo.id):null,
      reply_to_content:replyTo?.content||null,
      reply_to_sender:replyTo?.sender_name||null,
      reactions:[], read_by:[myId],
      _isTemp:true, _isBlob:true,
    }]);

    try{
      const {data}=await axios.post(`${BASE}/chat/send-file`,fd,{
        withCredentials:true,
        onUploadProgress:e=>setUploadPct(Math.round((e.loaded*100)/e.total)),
      });
      URL.revokeObjectURL(blobUrl);
      // Socket ignores own file messages too — always replace temp here
      setMessages(p=>p.map(m=>m.id===tempId ? {...data, _isTemp:false, _isBlob:false} : m));
      setRooms(p=>p.map(r=>toInt(r.id)===toInt(activeRoom.id)
        ?{...r,last_message:`📎 ${file.name}`,last_message_at:new Date().toISOString()}
        :r
      ).sort((a,b)=>new Date(b.last_message_at||0)-new Date(a.last_message_at||0)));
    }catch(e){
      console.error("File upload error:",e.response?.status,e.response?.data||e.message);
      URL.revokeObjectURL(blobUrl);
      setMessages(p=>p.filter(m=>m.id!==tempId));
      _addToast?.({id:Date.now(),title:"Upload failed ❌",body:e.response?.data?.message||e.message||"Please try again."});
    }finally{
      setUploadPct(null);
      if(fileRef.current) fileRef.current.value="";
    }
  };

  const handleTyping=v=>{
    setInput(v);
    if(!activeRoom) return;
    socketRef.current?.emit("typing",{room_id:curRoom.current,user_name:currentUser?.name,is_typing:true});
    clearTimeout(typingTimer.current);
    typingTimer.current=setTimeout(()=>socketRef.current?.emit("typing",{room_id:curRoom.current,user_name:currentUser?.name,is_typing:false}),1500);
  };

  const markReadAndNotify = useCallback(async(messageIds)=>{
    if(!messageIds.length) return;
    try{
      await axios.post(`${BASE}/chat/mark-read`,{message_ids:messageIds},{withCredentials:true});
      socketRef.current?.emit("messages_read",{
        room_id: curRoom.current,
        reader_id: toInt(currentUser?.id),
        message_ids: messageIds,
      });
    }catch{}
  },[currentUser?.id]);

  const handleEditSave=async(msgId,content)=>{
    try{
      await axios.put(`${BASE}/chat/message/${msgId}`,{content},{withCredentials:true});
      setMessages(p=>p.map(m=>toInt(m.id)===toInt(msgId)?{...m,content,is_edited:true}:m));
      socketRef.current?.emit("message_edited",{room_id:curRoom.current,message_id:msgId,content});
    }catch{}
    setEditMsg(null);
  };

  const handleDeleteMsg=async(msgId)=>{
    try{
      await axios.delete(`${BASE}/chat/message/${msgId}`,{withCredentials:true});
      setMessages(p=>p.map(m=>toInt(m.id)===toInt(msgId)?{...m,is_deleted:true,content:""}:m));
      socketRef.current?.emit("message_deleted",{room_id:curRoom.current,message_id:msgId});
    }catch{}
    setConfirm(null);
  };

  const handleReact=async(msgId,emoji)=>{
    try{
      const {data}=await axios.post(`${BASE}/chat/message/${msgId}/react`,{emoji},{withCredentials:true});
      setMessages(p=>p.map(m=>toInt(m.id)===toInt(msgId)?{...m,reactions:data.reactions}:m));
      socketRef.current?.emit("message_reaction",{room_id:curRoom.current,message_id:msgId,reactions:data.reactions});
    }catch{}
  };

  const handleDownload=msg=>{
    if(!msg.file_url||msg._isBlob) return;
    const a=document.createElement("a"); a.href=`${BASE}${msg.file_url}`; a.download=msg.file_name||"file"; a.target="_blank";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const startDM=async(email)=>{
    setShowDM(false);
    try{
      const {data}=await axios.post(`${BASE}/chat/dm/${email}`,{},{withCredentials:true});
      const r=await axios.get(`${BASE}/chat/rooms`,{withCredentials:true});
      setRooms(r.data);
      const room=r.data.find(x=>toInt(x.id)===toInt(data.room_id));
      if(room) openRoom(room);
    }catch(e){console.error(e);}
  };

  const createGroup=async(name,memberIds)=>{
    try{ await axios.post(`${BASE}/chat/room/create`,{name,member_ids:memberIds},{withCredentials:true}); setShowGrp(false); fetchRooms(); }catch(e){console.error(e);}
  };

  const deleteRoom=async(roomId)=>{
    const rid=toInt(roomId);
    try{
      await axios.delete(`${BASE}/chat/room/${rid}`,{withCredentials:true});
      setRooms(p=>p.filter(r=>toInt(r.id)!==rid));
      if(activeRoom&&toInt(activeRoom.id)===rid){setActiveRoom(null);setMessages([]);curRoom.current=null;}
      socketRef.current?.emit("room_deleted",{room_id:rid});
    }catch{}
    setConfirm(null);
  };

  const addMember    = async uid=>{ try{ await axios.post(`${BASE}/chat/room/${curRoom.current}/members`,{user_id:uid},{withCredentials:true}); fetchMembers(curRoom.current); }catch{} };
  const removeMember = async uid=>{ try{ await axios.delete(`${BASE}/chat/room/${curRoom.current}/members`,{data:{user_id:uid},withCredentials:true}); fetchMembers(curRoom.current); }catch{} };

  const handleDrop  = e=>{ e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files?.[0]; if(f) sendFile(f); };
  const handlePaste = e=>{ for(const item of (e.clipboardData?.items||[])){ if(item.type.startsWith("image/")){ const f=item.getAsFile(); if(f){sendFile(f);break;} } } };

  useEffect(()=>{
    const myId=toInt(currentUser?.id);
    const onFocus=()=>{
      const unread=messages.filter(m=>toInt(m.sender_id)!==myId&&!(m.read_by||[]).map(toInt).includes(myId)&&!m._isTemp).map(m=>m.id);
      if(unread.length) markReadAndNotify(unread);
    };
    window.addEventListener("focus",onFocus);
    return ()=>window.removeEventListener("focus",onFocus);
  },[messages,currentUser?.id,markReadAndNotify]);

  useEffect(()=>{
    if(!messages.length||!currentUser?.id) return;
    const myId=toInt(currentUser.id);
    const unread=messages.filter(m=>toInt(m.sender_id)!==myId&&!(m.read_by||[]).map(toInt).includes(myId)&&!m._isTemp).map(m=>m.id);
    if(unread.length&&document.hasFocus()) markReadAndNotify(unread);
  },[messages.length]); // eslint-disable-line

  const filteredRooms=useMemo(()=>rooms.filter(r=>{
    if(sideQ&&!r.name?.toLowerCase().includes(sideQ.toLowerCase())) return false;
    if(filter==="dm")         return r.room_type==="dm";
    if(filter==="group")      return r.room_type==="group";
    if(filter==="department") return r.room_type==="department";
    return true;
  }),[rooms,sideQ,filter]);

  const grouped=useMemo(()=>({
    department: filteredRooms.filter(r=>r.room_type==="department"),
    group:      filteredRooms.filter(r=>r.room_type==="group"),
    dm:         filteredRooms.filter(r=>r.room_type==="dm"),
  }),[filteredRooms]);

  const groupedMsgs=useMemo(()=>messages.reduce((acc,msg,i)=>{
    const prev=messages[i-1];
    const showDate=!prev||new Date(msg.created_at).toDateString()!==new Date(prev.created_at).toDateString();
    const showAvatar=!prev||toInt(prev.sender_id)!==toInt(msg.sender_id)||showDate||(new Date(msg.created_at)-new Date(prev.created_at))>300000;
    acc.push({msg,showDate,showAvatar}); return acc;
  },[]),[messages]);

  const dmPartnerOnline = useMemo(()=>{
    if(!activeRoom||activeRoom.room_type!=="dm") return false;
    const myId=toInt(currentUser?.id);
    const other=grpMembers.find(m=>toInt(m.user_id)!==myId);
    return other ? onlineUsers.has(toInt(other.user_id)) : false;
  },[activeRoom,grpMembers,onlineUsers,currentUser?.id]);

  /* ════════════════════════════ RENDER ════════════════════════════ */
  return (
    <>
      <style>{`
        .cri:hover{background:rgba(99,102,241,0.05)!important}
        .cri.act{background:#ede9fe!important;border-left-color:#6366f1!important}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
      `}</style>

      <ToastContainer toasts={toasts} onRemove={id=>setToasts(p=>p.filter(t=>t.id!==id))}/>
      <Lightbox src={lightbox} onClose={()=>setLightbox(null)}/>
      {editMsg  && <EditModal msg={editMsg} onSave={handleEditSave} onClose={()=>setEditMsg(null)}/>}
      {showDM   && <DMPickerModal allUsers={allUsers} onClose={()=>setShowDM(false)} onStart={startDM} onlineUsers={onlineUsers}/>}
      {showGrp  && isChairman && <NewGroupModal allUsers={allUsers} onClose={()=>setShowGrp(false)} onCreate={createGroup}/>}

      <ConfirmModal
        open={!!confirm}
        title={confirm?.type==="msg"?"Delete Message?":`Delete "${confirm?.payload?.name||"this chat"}"?`}
        body={confirm?.type==="msg"?"This message will be deleted for everyone.":"This will permanently delete this conversation."}
        onConfirm={()=>{
          if(!confirm) return;
          if(confirm.type==="msg") handleDeleteMsg(confirm.payload);
          else deleteRoom(confirm.payload.id);
        }}
        onCancel={()=>setConfirm(null)}/>

      {ctxMenu&&(
        <CtxMenu
          x={ctxMenu.x} y={ctxMenu.y} msg={ctxMenu.msg} isMine={ctxMenu.isMine} isChairman={isChairman}
          onReply={setReplyTo} onEdit={setEditMsg}
          onDelete={id=>{setConfirm({type:"msg",payload:id});setCtxMenu(null);}}
          onDownload={handleDownload} onClose={()=>setCtxMenu(null)}
        />
      )}

      <div style={{display:"flex",height:"100%",width:"100%",background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,0.06)",fontFamily:"'Inter','Segoe UI',sans-serif",minHeight:0,flexDirection:"column"}}>
        {notifBanner&&<NotifBanner onDismiss={()=>setNotifBanner(false)}/>}

        <div style={{display:"flex",flex:1,minHeight:0}}>
          {/* ────────────── SIDEBAR ────────────── */}
          <div style={{width:290,flexShrink:0,borderRight:"1px solid #e2e8f0",display:"flex",flexDirection:"column",background:"#f8fafc",minHeight:0}}>
            <div style={{padding:"14px 12px 10px",borderBottom:"1px solid #e2e8f0",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:20}}>💬</span>
                  <span style={{fontSize:15,fontWeight:700,color:"#1e293b"}}>Messages</span>
                  {totalUnread>0&&<span style={{background:"#ef4444",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10}}>{totalUnread}</span>}
                </div>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>setShowDM(true)} title="New DM" style={{width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:14}}>✉️</button>
                  {isChairman&&<button onClick={()=>setShowGrp(true)} title="New Group" style={{width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:14}}>➕</button>}
                </div>
              </div>
              <div style={{position:"relative",marginBottom:8}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#94a3b8"}}>🔍</span>
                <input value={sideQ} onChange={e=>setSideQ(e.target.value)} placeholder="Search chats…" style={{width:"100%",padding:"7px 10px 7px 30px",fontSize:13,borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",color:"#1e293b",boxSizing:"border-box",outline:"none"}}/>
              </div>
              <div style={{display:"flex",gap:2,background:"#fff",borderRadius:10,padding:3,border:"1px solid #e2e8f0"}}>
                {[["all","All"],["department","Depts"],["group","Groups"],["dm","DMs"]].map(([f,l])=>(
                  <button key={f} onClick={()=>setFilter(f)} style={{flex:1,fontSize:11,fontWeight:500,padding:"5px 2px",borderRadius:7,border:"none",background:filter===f?"#6366f1":"transparent",color:filter===f?"#fff":"#64748b",cursor:"pointer",transition:"all 0.15s"}}>{l}</button>
                ))}
              </div>
            </div>

            <div style={{flex:1,overflowY:"auto",minHeight:0}}>
              {Object.entries(grouped).map(([type,list])=>{
                if(!list.length) return null;
                const label={department:"Departments",group:"Groups",dm:"Direct Messages"}[type];
                return (
                  <div key={type}>
                    <div style={{padding:"10px 14px 3px",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</div>
                    {list.map(room=>{
                      const act=activeRoom&&toInt(activeRoom.id)===toInt(room.id);
                      return (
                        <div key={room.id} className={`cri${act?" act":""}`} onClick={()=>openRoom(room)}
                          style={{padding:"9px 12px",cursor:"pointer",display:"flex",gap:10,alignItems:"center",borderLeft:act?"3px solid #6366f1":"3px solid transparent",background:act?"#ede9fe":"transparent",transition:"all 0.15s"}}>
                          <div style={{width:36,height:36,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:"#fff",borderRadius:10,border:"1px solid #e2e8f0",fontSize:18}}>{typeIcon(room)}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:1}}>
                              <span style={{fontSize:13,fontWeight:act?700:500,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:130}}>{room.name}</span>
                              {room.unread_count>0&&<span style={{background:"#6366f1",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:10,flexShrink:0}}>{room.unread_count}</span>}
                            </div>
                            {room.last_message&&<div style={{fontSize:11,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{room.last_message}</div>}
                          </div>
                          {isChairman&&(room.room_type==="group"||room.room_type==="dm")&&(
                            <button onClick={e=>{e.stopPropagation();setConfirm({type:"room",payload:room});}}
                              style={{background:"none",border:"none",color:"#fca5a5",cursor:"pointer",fontSize:14,padding:2,flexShrink:0,borderRadius:5}}
                              onMouseEnter={e=>e.currentTarget.style.color="#ef4444"} onMouseLeave={e=>e.currentTarget.style.color="#fca5a5"}>🗑️</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {filteredRooms.length===0&&(
                <div style={{padding:28,textAlign:"center",fontSize:13,color:"#64748b"}}>
                  <div style={{fontSize:32,marginBottom:8}}>🔍</div>No chats found
                </div>
              )}
            </div>
          </div>

          {/* ────────────── MAIN AREA ────────────── */}
          <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,minHeight:0,position:"relative",overflow:"hidden"}}>
            {activeRoom ? (
              <>
                <div style={{padding:"10px 16px",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center",gap:10,background:"#fff",flexShrink:0,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                  <div style={{width:38,height:38,borderRadius:10,background:"#ede9fe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{typeIcon(activeRoom)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <button onClick={()=>activeRoom.room_type!=="dm"&&setShowInfo(p=>!p)} style={{background:"none",border:"none",padding:0,cursor:activeRoom.room_type!=="dm"?"pointer":"default",textAlign:"left"}}>
                      <div style={{fontSize:15,fontWeight:700,color:"#1e293b"}}>{activeRoom.name}</div>
                      <div style={{fontSize:11,display:"flex",alignItems:"center",gap:4}}>
                        {activeRoom.room_type==="dm" ? (
                          <>
                            <span style={{width:6,height:6,borderRadius:"50%",background:dmPartnerOnline?"#22c55e":"#94a3b8",display:"inline-block"}}/>
                            <span style={{color:dmPartnerOnline?"#22c55e":"#94a3b8"}}>{dmPartnerOnline?"Online":"Offline"}</span>
                          </>
                        ) : (
                          <span style={{color:"#64748b"}}>{activeRoom.room_type==="department"?"Department channel":`Group · ${grpMembers.length} members`}</span>
                        )}
                      </div>
                    </button>
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>setShowSrch(p=>!p)} style={{width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",background:showSrch?"#ede9fe":"transparent",border:"1px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:16}}>🔍</button>
                    {activeRoom.room_type!=="dm"&&(
                      <button onClick={()=>setShowInfo(p=>!p)} style={{width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",background:showInfo?"#ede9fe":"transparent",border:"1px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:16}}>👥</button>
                    )}
                  </div>
                </div>

                {showSrch&&(
                  <MsgSearch messages={messages} onHighlight={id=>{setHlId(id);setShowSrch(false);}} onClose={()=>setShowSrch(false)}/>
                )}

                <div style={{flex:1,display:"flex",minHeight:0,overflow:"hidden"}}>
                  <div ref={msgsRef} onScroll={handleScroll}
                    onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                    onDragLeave={()=>setDragOver(false)}
                    onDrop={handleDrop}
                    onPaste={handlePaste}
                    style={{
                      flex:1,overflowY:"auto",overflowX:"hidden",
                      paddingTop:10,paddingBottom:56,
                      minHeight:0,
                      background:dragOver?"#f0f4ff":undefined,
                      transition:"background 0.2s",
                    }}>
                    {loading
                      ? <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:8,color:"#64748b",fontSize:14}}><div style={{fontSize:32}}>⏳</div>Loading messages…</div>
                      : <>
                          {groupedMsgs.map(({msg,showDate,showAvatar},i)=>(
                            <React.Fragment key={msg.id}>
                              {showDate&&<DateDiv date={msg.created_at}/>}
                              <div id={`msg-${msg.id}`} style={{marginBottom: showAvatar&&i>0 ? 14 : 3}}>
                                <Bubble
                                  msg={msg}
                                  isMine={toInt(msg.sender_id)===toInt(currentUser?.id)}
                                  isChairman={isChairman}
                                  showAvatar={showAvatar}
                                  userId={currentUser?.id}
                                  onlineUsers={onlineUsers}
                                  onEdit={setEditMsg}
                                  onDelete={id=>setConfirm({type:"msg",payload:id})}
                                  onReact={handleReact}
                                  onReply={setReplyTo}
                                  onImgClick={setLightbox}
                                  onCtx={(x,y,m,mine)=>setCtxMenu({x,y,msg:m,isMine:mine})}
                                />
                              </div>
                            </React.Fragment>
                          ))}
                          <TypingDots typers={typers}/>
                          {dragOver&&(
                            <div style={{margin:"8px 16px",padding:20,border:"2px dashed #6366f1",borderRadius:12,textAlign:"center",color:"#6366f1",fontSize:13,fontWeight:500}}>
                              📎 Drop file here to send
                            </div>
                          )}
                        </>
                    }
                  </div>

                  {showInfo&&activeRoom.room_type!=="dm"&&(
                    <GroupInfoPanel
                      room={activeRoom} members={grpMembers} isChairman={isChairman}
                      allUsers={allUsers} onlineUsers={onlineUsers}
                      onAdd={addMember} onRemove={removeMember} onClose={()=>setShowInfo(false)}
                    />
                  )}
                </div>

                {showScroll&&(
                  <button onClick={()=>{atBottom.current=true;scrollToBottom(true);}}
                    style={{position:"absolute",bottom:80,right:showInfo?300:20,width:36,height:36,borderRadius:"50%",background:"#6366f1",color:"#fff",border:"none",boxShadow:"0 4px 12px rgba(99,102,241,0.4)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}}>
                    ↓
                  </button>
                )}

                <div style={{padding:"8px 12px 12px",borderTop:"1px solid #e2e8f0",background:"#f8fafc",flexShrink:0}}>
                  <UploadBar progress={uploadPct}/>
                  <ReplyBar msg={replyTo} onCancel={()=>setReplyTo(null)}/>
                  <div style={{display:"flex",gap:8,alignItems:"flex-end",background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"8px 8px 8px 12px",transition:"border-color 0.2s"}}
                    onFocusCapture={e=>e.currentTarget.style.borderColor="#6366f1"}
                    onBlurCapture={e=>e.currentTarget.style.borderColor="#e2e8f0"}>
                    <button onClick={()=>fileRef.current?.click()} title="Attach file"
                      style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:"#64748b",flexShrink:0,borderRadius:8}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>📎</button>
                    <input ref={fileRef} type="file" accept="*/*" style={{display:"none"}} onChange={e=>{ const f=e.target.files?.[0]; if(f) sendFile(f); }}/>
                    <textarea ref={textareaRef} value={input} onChange={e=>handleTyping(e.target.value)}
                      onPaste={handlePaste}
                      onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} if(e.key==="Escape") setReplyTo(null); }}
                      placeholder={`Message ${activeRoom.name}…`}
                      rows={1}
                      style={{flex:1,fontSize:14,border:"none",background:"transparent",color:"#1e293b",resize:"none",fontFamily:"inherit",outline:"none",lineHeight:1.55,maxHeight:130,overflowY:"auto"}}/>
                    <button onClick={sendMessage} disabled={!input.trim()||sending}
                      style={{width:36,height:36,borderRadius:10,flexShrink:0,
                        background:input.trim()&&!sending?"linear-gradient(135deg,#6366f1,#818cf8)":"#f1f5f9",
                        color:input.trim()&&!sending?"#fff":"#94a3b8",
                        border:"none",cursor:input.trim()&&!sending?"pointer":"default",
                        fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",
                        transition:"all 0.2s",boxShadow:input.trim()?"0 2px 8px rgba(99,102,241,0.3)":"none"}}>
                      {sending?"…":"➤"}
                    </button>
                  </div>
                  <div style={{fontSize:10,color:"#94a3b8",marginTop:4,paddingLeft:2}}>
                    Enter to send · Shift+Enter newline · 📎 all file types · Right-click for more options
                  </div>
                </div>
              </>
            ) : (
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
                <div style={{width:72,height:72,borderRadius:20,background:"#ede9fe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>💬</div>
                <div style={{fontSize:18,fontWeight:700,color:"#1e293b",marginTop:4}}>Your messages</div>
                <div style={{fontSize:13,color:"#64748b",maxWidth:260,textAlign:"center"}}>Select a department, group, or DM from the sidebar to start chatting.</div>
                <div style={{display:"flex",gap:10,marginTop:4}}>
                  <button onClick={()=>setShowDM(true)} style={{padding:"9px 18px",background:"#6366f1",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer",boxShadow:"0 2px 8px rgba(99,102,241,0.3)"}}>✉️ Start a DM</button>
                  {isChairman&&<button onClick={()=>setShowGrp(true)} style={{padding:"9px 18px",background:"#fff",color:"#6366f1",border:"1px solid #6366f1",borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer"}}>➕ New Group</button>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}