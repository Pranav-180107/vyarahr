import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Building2, User, ChevronRight, CheckCircle, Users } from "lucide-react";

const AdminSetup: React.FC = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [org, setOrg] = useState({ name: "", industry: "", size: "", city: "" });
  const [admin, setAdmin] = useState({
    full_name: profile?.full_name || user?.email?.split("@")[0] || "",
    phone: "",
    designation: "HR Administrator",
  });

  const handleOrgNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!org.name.trim()) { setError("Organization name is required."); return; }
    setError(null); setStep(2);
  };

  const handleAdminNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin.full_name.trim()) { setError("Your name is required."); return; }
    setError(null); setStep(3);
  };

  const handleFinish = async () => {
    setSaving(true); setError(null);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: admin.full_name,
          designation: admin.designation,
          department: "HR",
          role: "admin",
          phone: admin.phone || null,
          org_name: org.name,
          onboarding_complete: true,
        })
        .eq("id", profile?.id || user?.id);
      if (updateError) throw updateError;
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Failed to save."); setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 12, color: "#fff", fontSize: 14, padding: "12px 14px",
    outline: "none", fontFamily: "DM Sans, sans-serif", width: "100%", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6,
  };
  const btnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: "linear-gradient(135deg,#FF8237,#ff5900)", color: "#fff",
    fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 14,
    border: "none", cursor: "pointer", width: "100%", fontFamily: "DM Sans, sans-serif",
  };
  const ghostStyle: React.CSSProperties = {
    padding: "14px 20px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)",
    background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 14,
    fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif", whiteSpace: "nowrap",
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0a0e1a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"DM Sans,sans-serif", padding:"2rem 1rem", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"fixed", borderRadius:"50%", filter:"blur(120px)", opacity:0.15, width:600, height:600, background:"#FF8237", top:-150, left:-100, pointerEvents:"none" }} />
      <div style={{ position:"fixed", borderRadius:"50%", filter:"blur(120px)", opacity:0.12, width:500, height:500, background:"#3b82f6", bottom:-100, right:-100, pointerEvents:"none" }} />

      <div style={{ position:"relative", width:"100%", maxWidth:620, display:"flex", flexDirection:"column", alignItems:"center", gap:"2rem" }}>
        <img src="/logo.png" alt="VyaraHR" style={{ height:44, filter:"brightness(0) invert(1)" }} />

        {/* Stepper */}
        <div style={{ display:"flex", alignItems:"center", width:"100%", justifyContent:"center", gap:0 }}>
          {[{id:1,label:"Organization"},{id:2,label:"Admin Profile"},{id:3,label:"Launch"}].map((s,i,arr) => (
            <React.Fragment key={s.id}>
              <div style={{ display:"flex", alignItems:"center", gap:10, opacity: step >= s.id ? 1 : 0.35 }}>
                <div style={{ width:34, height:34, borderRadius:"50%", border:`2px solid ${step > s.id ? "#10b981" : step === s.id ? "#FF8237" : "rgba(255,255,255,0.2)"}`, background: step > s.id ? "rgba(16,185,129,0.15)" : step === s.id ? "rgba(255,130,55,0.15)" : "transparent", color: step > s.id ? "#10b981" : step === s.id ? "#FF8237" : "rgba(255,255,255,0.4)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {step > s.id ? <CheckCircle size={16}/> : <span style={{ fontWeight:700, fontSize:13 }}>{s.id}</span>}
                </div>
                <span style={{ fontSize:13, fontWeight:600, color: step === s.id ? "#fff" : "rgba(255,255,255,0.5)" }}>{s.label}</span>
              </div>
              {i < arr.length-1 && <div style={{ flex:1, height:1, background: step > s.id ? "#10b981" : "rgba(255,255,255,0.1)", maxWidth:50, margin:"0 8px" }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:24, backdropFilter:"blur(20px)", padding:"2.5rem", boxShadow:"0 25px 60px rgba(0,0,0,0.4)" }}>
          {error && <div style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", color:"#fca5a5", padding:"10px 14px", borderRadius:10, fontSize:13, marginBottom:"1rem" }}>{error}</div>}

          {step === 1 && (
            <form onSubmit={handleOrgNext} style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
              <div style={{ textAlign:"center" }}>
                <Building2 size={36} color="#FF8237" style={{ margin:"0 auto 12px", display:"block" }} />
                <h2 style={{ fontSize:"1.5rem", fontWeight:700, color:"#fff", margin:"0 0 6px" }}>Tell us about your organization</h2>
                <p style={{ fontSize:14, color:"rgba(255,255,255,0.5)", margin:0 }}>This personalizes your VyaraHR workspace.</p>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
                <div>
                  <label style={labelStyle}>Organization Name <span style={{ color:"#f87171" }}>*</span></label>
                  <input style={inputStyle} placeholder="Acme Corp Pvt Ltd" value={org.name} onChange={e => setOrg({...org,name:e.target.value})} required />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
                  <div>
                    <label style={labelStyle}>Industry</label>
                    <select style={inputStyle} value={org.industry} onChange={e => setOrg({...org,industry:e.target.value})}>
                      <option value="">Select</option>
                      {["Technology","Manufacturing","Finance & Banking","Healthcare","Education","Retail","Consulting","Other"].map(v=><option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Company Size</label>
                    <select style={inputStyle} value={org.size} onChange={e => setOrg({...org,size:e.target.value})}>
                      <option value="">Select</option>
                      {["1–10","11–50","51–200","201–500","500+"].map(v=><option key={v}>{v} employees</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>City / Location</label>
                  <input style={inputStyle} placeholder="Mumbai, India" value={org.city} onChange={e => setOrg({...org,city:e.target.value})} />
                </div>
              </div>
              <button type="submit" style={btnStyle}>Continue <ChevronRight size={18}/></button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleAdminNext} style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
              <div style={{ textAlign:"center" }}>
                <User size={36} color="#FF8237" style={{ margin:"0 auto 12px", display:"block" }} />
                <h2 style={{ fontSize:"1.5rem", fontWeight:700, color:"#fff", margin:"0 0 6px" }}>Set up your admin profile</h2>
                <p style={{ fontSize:14, color:"rgba(255,255,255,0.5)", margin:0 }}>How should the system identify you?</p>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
                <div>
                  <label style={labelStyle}>Full Name <span style={{ color:"#f87171" }}>*</span></label>
                  <input style={inputStyle} placeholder="Jane Smith" value={admin.full_name} onChange={e => setAdmin({...admin,full_name:e.target.value})} required />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
                  <div>
                    <label style={labelStyle}>Phone Number</label>
                    <input style={inputStyle} type="tel" placeholder="+91 98765 43210" value={admin.phone} onChange={e => setAdmin({...admin,phone:e.target.value})} />
                  </div>
                  <div>
                    <label style={labelStyle}>Designation</label>
                    <select style={inputStyle} value={admin.designation} onChange={e => setAdmin({...admin,designation:e.target.value})}>
                      {["HR Administrator","HR Manager","Chief HR Officer","Founder / CEO","Operations Manager"].map(v=><option key={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Account Email</label>
                  <input style={{ ...inputStyle, opacity:0.5, cursor:"not-allowed" }} type="email" value={user?.email || ""} disabled />
                </div>
              </div>
              <div style={{ display:"flex", gap:12 }}>
                <button type="button" style={ghostStyle} onClick={()=>setStep(1)}>← Back</button>
                <button type="submit" style={{ ...btnStyle, flex:1 }}>Continue <ChevronRight size={18}/></button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem", textAlign:"center" }}>
              <div style={{ width:80, height:80, borderRadius:"50%", background:"rgba(16,185,129,0.12)", border:"2px solid rgba(16,185,129,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto", boxShadow:"0 0 30px rgba(16,185,129,0.2)" }}>
                <CheckCircle size={48} color="#10b981" />
              </div>
              <div>
                <h2 style={{ fontSize:"1.5rem", fontWeight:700, color:"#fff", margin:"0 0 6px" }}>You are all set, {admin.full_name.split(" ")[0]}! 🎉</h2>
                <p style={{ fontSize:14, color:"rgba(255,255,255,0.5)", margin:0 }}>Your VyaraHR workspace is ready.</p>
              </div>
              <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:"1.25rem", display:"flex", flexDirection:"column", gap:"1rem", textAlign:"left" }}>
                {[
                  { icon:<Building2 size={16} color="#FF8237"/>, label:"Organization", value:`${org.name}${org.industry?" · "+org.industry:""}` },
                  { icon:<User size={16} color="#FF8237"/>, label:"Admin", value:`${admin.full_name} · ${admin.designation}` },
                  { icon:<Users size={16} color="#FF8237"/>, label:"Next Step", value:"Add employees via Hiring & Onboarding" },
                ].map((item,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    <div style={{ marginTop:2 }}>{item.icon}</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.5px" }}>{item.label}</span>
                      <span style={{ fontSize:14, fontWeight:600, color:"#fff" }}>{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:12 }}>
                <button type="button" style={ghostStyle} onClick={()=>setStep(2)}>← Back</button>
                <button style={{ ...btnStyle, flex:1 }} onClick={handleFinish} disabled={saving}>
                  {saving ? "Saving..." : "Launch Dashboard →"}
                </button>
              </div>
              {error && <div style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", color:"#fca5a5", padding:"10px 14px", borderRadius:10, fontSize:13 }}>{error}</div>}
            </div>
          )}
        </div>

        <p style={{ fontSize:12, color:"rgba(255,255,255,0.2)", textAlign:"center" }}>VyaraHR · Secure Admin Setup · Your data is encrypted.</p>
      </div>
    </div>
  );
};

export default AdminSetup;
