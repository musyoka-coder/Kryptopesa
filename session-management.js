/* KryptoPesa browser session controls. Auth tokens remain with Supabase Auth,
   never in JavaScript-readable cookies. Server-side authorization is mandatory. */
(function(){
  'use strict';
  const IDLE_MS=30*60*1000, MAX_MS=12*60*60*1000;
  const KEY='kp_auth_activity_v1', START='kp_auth_started_v1';
  let timer=null, lastWrite=0, ending=false;
  function cookie(name){return document.cookie.split('; ').find(v=>v.startsWith(name+'='))?.split('=')[1]||'';}
  function setPreference(name,value){document.cookie=name+'='+encodeURIComponent(value)+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');}
  function mark(force){
    const now=Date.now();if(!force&&now-lastWrite<15000)return;
    lastWrite=now;localStorage.setItem(KEY,String(now));
    if(!localStorage.getItem(START))localStorage.setItem(START,String(now));
  }
  async function endSession(){
    if(ending)return;ending=true;
    clearInterval(timer);localStorage.removeItem(KEY);localStorage.removeItem(START);
    try{await window.supabaseClient?.auth.signOut({scope:'local'});}catch(_){}
    location.replace('login.html?session=expired');
  }
  function expired(){
    const now=Date.now(),activity=Number(localStorage.getItem(KEY)),start=Number(localStorage.getItem(START));
    return !!((activity&&now-activity>IDLE_MS)||(start&&now-start>MAX_MS));
  }
  function start(){
    if(!window.supabaseClient)return;
    if(expired()){endSession();return;}
    mark(true);
    for(const event of ['pointerdown','keydown','touchstart']){
      document.addEventListener(event,()=>mark(false),{passive:true});
    }
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(expired())endSession();else mark(false);}});
    window.addEventListener('storage',e=>{if((e.key===KEY||e.key===START)&&expired())endSession();});
    timer=setInterval(()=>{if(expired())endSession();},15000);
    window.supabaseClient.auth.onAuthStateChange(event=>{
      if(event==='SIGNED_OUT'){localStorage.removeItem(KEY);localStorage.removeItem(START);}
    });
  }
  window.KPSession={
    start, expired, mark,
    signedIn(){localStorage.removeItem(KEY);localStorage.removeItem(START);mark(true);},
    clear(){localStorage.removeItem(KEY);localStorage.removeItem(START);},
    preference:cookie,
    savePreference:setPreference
  };
})();
