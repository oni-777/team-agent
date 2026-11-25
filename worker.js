// Cloudflare Worker: dán vào Worker, thêm secret OPENAI_KEY, DEEPSEEK_KEY, GEMINI_KEY, GROQ_KEY, PI_KEY (Settings > Variables and Secrets).
// Biến thường ALLOW_ORIGIN = địa chỉ trang của bạn (ví dụ https://ten.github.io) để người khác không dùng ké.
const P={
 openai:{u:"https://api.openai.com/v1/chat/completions",m:"gpt-4o-mini",k:"OPENAI_KEY"},
 deepseek:{u:"https://api.deepseek.com/chat/completions",m:"deepseek-chat",k:"DEEPSEEK_KEY"},
 groq:{u:"https://api.groq.com/openai/v1/chat/completions",m:"llama-3.3-70b-versatile",k:"GROQ_KEY"}
};
export default {async fetch(req,env){
 const cors={"Access-Control-Allow-Origin":env.ALLOW_ORIGIN||"*","Access-Control-Allow-Headers":"Content-Type"};
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 let text="Lỗi";
 try{
  const {provider,role,task}=await req.json();
  const t=String(task||"").slice(0,1500),sys=`Bạn là agent ${role} trong văn phòng ảo. Trả lời bằng tiếng Việt, đầy đủ và có cấu trúc (có thể dùng gạch đầu dòng), khoảng 150 đến 250 từ.`;
  if(provider==="gemini"){if(!env.GEMINI_KEY)throw new Error("thiếu secret GEMINI_KEY");
   const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",{method:"POST",headers:{"x-goog-api-key":env.GEMINI_KEY,"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:sys+"\nViệc: "+t}]}]})});
   const d=await r.json();text=d.candidates?.[0]?.content?.parts?.[0]?.text||("Lỗi gemini ("+r.status+"): "+(d.error?.status||d.error?.code||"không có nội dung"));
  }else if(provider==="pi"){if(!env.PI_KEY)throw new Error("thiếu secret PI_KEY");
   const r=await fetch("https://api.inflection.ai/external/api/inference",{method:"POST",headers:{Authorization:"Bearer "+env.PI_KEY,"Content-Type":"application/json"},body:JSON.stringify({context:[{text:sys+"\nViệc: "+t,type:"Human"}],config:"inflection_3_pi"})});
   const d=await r.json();text=d.text||d.choices?.[0]?.message?.content||("Lỗi pi ("+r.status+")");
  }else if(P[provider]){
   const c=P[provider];if(!env[c.k])throw new Error("thiếu secret "+c.k);
   const r=await fetch(c.u,{method:"POST",headers:{Authorization:"Bearer "+env[c.k],"Content-Type":"application/json"},body:JSON.stringify({model:c.m,max_tokens:900,messages:[{role:"system",content:sys},{role:"user",content:t}]})});
   const d=await r.json();text=d.choices?.[0]?.message?.content||("Lỗi "+provider+" ("+r.status+"): "+(d.error?.code||d.error?.type||"không có nội dung"));
  }
 }catch(e){text="Lỗi: "+String(e.message||e).slice(0,100)}
 return new Response(JSON.stringify({text}),{headers:{...cors,"Content-Type":"application/json"}});
}}
