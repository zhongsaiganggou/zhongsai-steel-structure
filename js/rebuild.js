(function(){
  // Header scroll & mobile menu
  var h=document.querySelector('[data-header]'),
      b=document.querySelector('[data-menu]'),
      m=document.querySelector('[data-mobile-nav]');
  function s(){h&&h.classList.toggle('scrolled',scrollY>24)}
  s();addEventListener('scroll',s,{passive:true});
  if(b){b.onclick=function(){var o=h.classList.toggle('open');document.body.classList.toggle('menu-open',o);b.setAttribute('aria-expanded',o);b.setAttribute('aria-label',o?'关闭菜单':'打开菜单')}}
  if(m)m.onclick=function(e){if(e.target.closest('a')){h.classList.remove('open');document.body.classList.remove('menu-open');b.setAttribute('aria-expanded','false')}}

  // Capture advertising params from URL and fill hidden fields
  var adParams=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','gbraid','wbraid','fbclid'];
  function getParam(name){
    var match=location.search.match(new RegExp('[?&]'+name+'=([^&]*)'));
    return match?decodeURIComponent(match[1].replace(/\+/g,' ')):'';
  }
  function fillAdParams(){
    var form=document.querySelector('[data-form]');
    if(!form)return;
    adParams.forEach(function(name){
      var val=getParam(name);
      if(val){
        var input=form.querySelector('input[name="'+name+'"]');
        if(input)input.value=val;
      }
    });
    // Also store in sessionStorage for cross-page persistence
    try{
      adParams.forEach(function(name){
        var val=getParam(name);
        if(val)sessionStorage.setItem('ad_'+name,val);
      });
    }catch(e){}
  }
  fillAdParams();

  // Form submission
  var f=document.querySelector('[data-form]'),
      st=document.querySelector('[data-status]');
  function msg(t,c){st.textContent=t;st.className='status show '+c}
  if(f)f.onsubmit=async function(e){
    e.preventDefault();
    var btn=f.querySelector('button'),old=btn.innerHTML;
    btn.disabled=true;btn.textContent='正在提交…';
    try{
      // Include sessionStorage ad params if not already in form
      var formData=Object.fromEntries(new FormData(f).entries());
      try{
        adParams.forEach(function(name){
          if(!formData[name]||formData[name]===''){
            var stored=sessionStorage.getItem('ad_'+name);
            if(stored)formData[name]=stored;
          }
        });
      }catch(e){}

      var r=await fetch('/api/contact',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(formData)
      }),j=await r.json();
      if(!r.ok||!j.success)throw Error();
      msg('需求已提交，我们会尽快与您联系。','ok');
      f.reset();
    }catch(x){
      msg('暂时无法提交，请通过 WhatsApp 或邮箱联系我们。','error');
    }finally{
      btn.disabled=false;btn.innerHTML=old;
    }
  };
})();
