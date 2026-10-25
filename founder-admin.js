const ENDPOINT='https://naffdaxyizjbqcwkawju.supabase.co/functions/v1/tap-reliability/founder-admin';
const $=id=>document.getElementById(id);
let accessToken=null,config=null,reviewed=null,busy=false;
const show=message=>{$('status').textContent=message;};
function disable(value){busy=value;for(const el of document.querySelectorAll('button'))el.disabled=value;}
async function configuration(){
 if(!config){const r=await fetch(ENDPOINT,{cache:'no-store'});if(!r.ok)throw Error('Founder administration is not available.');config=await r.json();}
 return config;
}
async function api(action,extra={}){
 const r=await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+accessToken},body:JSON.stringify({operation:'founder_admin',action,...extra}),cache:'no-store'}),out=await r.json();
 if(!r.ok)throw Error(out.error||'Administrative request failed.');return out;
}
function field(label,value){
 const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;
 dd.textContent=Array.isArray(value)?value.join('\n'):String(value);$('facts').append(dt,dd);
}
async function load(){
 reviewed=null;$('decision').hidden=true;$('risk-accepted').checked=false;
 const id=$('request-id').value.trim(),out=await api('review',{request_id:id}),r=out.request,p=r.packet_json.input;
 reviewed={id:r.id,hash:r.request_sha256};
 $('outcome').textContent=p.business_outcome;$('reason').textContent=p.reason;$('facts').replaceChildren();
 for(const [label,value]of [['Action',p.command.kind],['Current decision',r.state],['Risks',p.risks],['Tradeoffs',p.tradeoffs],['Opportunity',p.opportunity],['Rollback',p.rollback],['Verification',p.verification],['Cost',p.cost.cost_status]])field(label,value);
 $('exact-packet').textContent=JSON.stringify({request_sha256:r.request_sha256,current:r.packet_json.before,proposed:p.command,supersedes:p.supersedes||null},null,2);
 $('expiry').textContent='Request expires: '+new Date(r.expires_at).toLocaleString()+'. Approved actions expire within 15 minutes.';
 $('decision').hidden=false;show('Review loaded. No administrative action has been executed.');
}
async function run(fn){if(busy)return;disable(true);try{await fn();}catch(e){show(e.message);}finally{disable(false);}}
$('sign-in').addEventListener('submit',event=>{event.preventDefault();run(async()=>{
 const form=event.currentTarget,email=form.elements.email.value,password=form.elements.password.value;form.elements.password.value='';
 const c=await configuration(),r=await fetch(c.supabase_url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:c.publishable_key,'content-type':'application/json'},body:JSON.stringify({email,password})}),out=await r.json();
 if(!r.ok||!out.access_token)throw Error('Sign-in did not succeed. Verify your account or use the existing recovery flow.');
 accessToken=out.access_token;/* Refresh tokens are deliberately not retained. */
 $('login').hidden=true;$('review').hidden=false;show('Signed in. Load the specific TPB request.');
 if($('request-id').value)await load();
});});
$('load-request').addEventListener('submit',event=>{event.preventDefault();run(load);});
for(const action of ['approve','reject','revoke'])$(action).addEventListener('click',()=>run(async()=>{
 if(!reviewed)throw Error('Review a request first.');
 if(action==='approve'&&!$('risk-accepted').checked)throw Error('Confirm your review and risk acceptance first.');
 const out=await api(action,{request_id:reviewed.id,request_sha256:reviewed.hash,...(action==='approve'?{risk_accepted:true}:{})});
 show('Decision: '+out.state+'. Receipt: '+out.correlation_id+'. TPB must separately verify any execution.');
 reviewed=null;$('decision').hidden=true;
}));
$('sign-out').addEventListener('click',()=>run(async()=>{
 const token=accessToken;accessToken=null;reviewed=null;$('review').hidden=true;$('decision').hidden=true;$('login').hidden=false;
 if(token){const c=await configuration();const r=await fetch(c.supabase_url+'/auth/v1/logout',{method:'POST',headers:{apikey:c.publishable_key,authorization:'Bearer '+token}});if(!r.ok)throw Error('Local access cleared. Server sign-out could not be verified.');}
 show('Signed out. Local session cleared.');
}));
window.addEventListener('pagehide',()=>{accessToken=null;reviewed=null;});
const candidate=new URL(location.href).searchParams.get('request_id');
if(candidate&&/^[0-9a-f-]{36}$/i.test(candidate))$('request-id').value=candidate;

