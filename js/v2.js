/* ============================================
   ZhongSai Steel Structure - V2 Components JS
   统一全站组件交互
   ============================================ */

(function(){
  'use strict';

  /* ===== FAQ 折叠交互 ===== */
  function initFAQ(){
    var items=document.querySelectorAll('.faq-item');
    items.forEach(function(item){
      var question=item.querySelector('.faq-question');
      if(!question)return;
      question.addEventListener('click',function(){
        var isOpen=item.classList.contains('open');
        // 关闭所有
        items.forEach(function(i){i.classList.remove('open')});
        // 打开当前（如果之前是关闭的）
        if(!isOpen){
          item.classList.add('open');
        }
      });
    });
  }

  /* ===== 表单双入口切换 ===== */
  function initFormTypeSwitch(){
    var typeBtns=document.querySelectorAll('.type-btn');
    var customerTypeInput=document.querySelector('input[name="customerType"]');
    var drawingUpload=document.querySelector('[data-drawing-upload]');

    typeBtns.forEach(function(btn){
      btn.addEventListener('click',function(){
        typeBtns.forEach(function(b){b.classList.remove('active')});
        btn.classList.add('active');
        if(customerTypeInput)customerTypeInput.value=btn.dataset.type;
        if(drawingUpload){
          drawingUpload.style.display=btn.dataset.type==='hasDrawings'?'block':'none';
        }
      });
    });
  }

  /* ===== 广告参数捕获 ===== */
  var adParams=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','gbraid','wbraid','fbclid'];
  function getParam(name){
    var match=location.search.match(new RegExp('[?&]'+name+'=([^&]*)'));
    return match?decodeURIComponent(match[1].replace(/\+/g,' ')):'';
  }
  function captureAdParams(){
    var forms=document.querySelectorAll('form[data-form], form.v2-form');
    forms.forEach(function(form){
      adParams.forEach(function(name){
        var val=getParam(name);
        if(val){
          var input=form.querySelector('input[name="'+name+'"]');
          if(input)input.value=val;
        }
      });
    });
    // 存储到sessionStorage
    try{
      adParams.forEach(function(name){
        var val=getParam(name);
        if(val)sessionStorage.setItem('ad_'+name,val);
      });
    }catch(e){}
  }

  /* ===== 表单提交 (V2) ===== */
  function initFormSubmit(){
    var forms=document.querySelectorAll('form[data-form], form.v2-form');
    forms.forEach(function(f){
      f.addEventListener('submit',async function(e){
        e.preventDefault();
        var btn=f.querySelector('button[type="submit"]');
        var status=f.querySelector('.form-status, [data-status]');
        var oldBtnText=btn?btn.innerHTML:'';

        if(btn){btn.disabled=true;btn.innerHTML='提交中…';}

        try{
          var formData=Object.fromEntries(new FormData(f).entries());
          // 补充sessionStorage中的广告参数
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
          });
          var j=await r.json();
          if(!r.ok||!j.success)throw new Error();

          if(status){
            status.textContent='需求已提交，我们会尽快与您联系。';
            status.className='form-status show ok';
          }
          f.reset();
        }catch(x){
          if(status){
            status.textContent='暂时无法提交，请通过 WhatsApp 或邮箱联系我们。';
            status.className='form-status show error';
          }
        }finally{
          if(btn){btn.disabled=false;btn.innerHTML=oldBtnText;}
        }
      });
    });
  }

  /* ===== YouTube Shorts 视频加载 ===== */
  function loadYouTubeVideos(){
    var grid=document.querySelector('[data-video-grid]');
    if(!grid)return;

    var fallbackVideos=[
      {id:'SdM7zC5Dp5Y',title:'中赛钢构工厂实拍',thumbnail:'https://img.youtube.com/vi/SdM7zC5Dp5Y/maxresdefault.jpg',published:''},
      {id:'KeXTIxd07LY',title:'钢结构装柜过程',thumbnail:'https://img.youtube.com/vi/KeXTIxd07LY/maxresdefault.jpg',published:''},
      {id:'kr2S2qqL_AY',title:'钢结构生产车间',thumbnail:'https://img.youtube.com/vi/kr2S2qqL_AY/maxresdefault.jpg',published:''},
      {id:'SdM7zC5Dp5Y',title:'中赛钢构交付现场',thumbnail:'https://img.youtube.com/vi/SdM7zC5Dp5Y/maxresdefault.jpg',published:''}
    ];

    function formatDate(d){
      if(!d)return '';
      try{
        var date=new Date(d);
        return date.getFullYear()+'.'+String(date.getMonth()+1).padStart(2,'0')+'.'+String(date.getDate()).padStart(2,'0');
      }catch(e){return ''}
    }

    function playInline(card,videoId){
      var thumb=card.querySelector('.video-thumb');
      if(!thumb)return;
      // 停止其他视频
      document.querySelectorAll('.video-card.playing').forEach(function(other){
        if(other!==card){
          var ot=other.querySelector('.video-thumb');
          if(ot&&ot.dataset.origHtml){ot.innerHTML=ot.dataset.origHtml;other.classList.remove('playing');}
        }
      });
      thumb.dataset.origHtml=thumb.innerHTML;
      card.classList.add('playing');
      var iframe=document.createElement('iframe');
      iframe.src='https://www.youtube.com/embed/'+videoId+'?autoplay=1&vq=hd1080&rel=0&modestbranding=1&playsinline=1';
      iframe.className='video-iframe';
      iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('allowfullscreen','');
      iframe.setAttribute('frameborder','0');
      iframe.setAttribute('loading','lazy');
      thumb.innerHTML='';
      thumb.appendChild(iframe);
    }

    function render(videos){
      var display=videos.slice(0,4);
      grid.innerHTML='';
      display.forEach(function(v){
        var card=document.createElement('div');
        card.className='video-card';
        card.setAttribute('role','button');
        card.setAttribute('tabindex','0');
        card.dataset.videoId=v.id;
        var thumb=document.createElement('div');
        thumb.className='video-thumb';
        var img=document.createElement('img');
        img.src='https://img.youtube.com/vi/'+v.id+'/maxresdefault.jpg';
        img.alt=v.title;
        img.loading='lazy';
        img.onerror=function(){if(this.src.indexOf('maxresdefault')!==-1)this.src='https://img.youtube.com/vi/'+v.id+'/hqdefault.jpg';};
        var play=document.createElement('div');
        play.className='video-play';
        thumb.appendChild(img);
        thumb.appendChild(play);
        var info=document.createElement('div');
        info.className='video-info';
        var title=document.createElement('h3');
        title.className='video-title';
        title.textContent=v.title;
        var date=document.createElement('p');
        date.className='video-date';
        date.textContent=formatDate(v.published)||'中赛钢构';
        info.appendChild(title);
        info.appendChild(date);
        card.appendChild(thumb);
        card.appendChild(info);
        card.addEventListener('click',function(){playInline(card,v.id)});
        card.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();playInline(card,v.id);}});
        grid.appendChild(card);
      });
    }

    fetch('/api/youtube-shorts')
      .then(function(r){return r.json()})
      .then(function(d){if(d&&d.success&&d.videos&&d.videos.length>0){render(d.videos)}else{render(fallbackVideos)}})
      .catch(function(){render(fallbackVideos)});
  }

  /* ===== 页头滚动效果 ===== */
  function initHeader(){
    var header=document.querySelector('[data-header]');
    if(!header)return;
    function onScroll(){header.classList.toggle('scrolled',window.scrollY>24);}
    onScroll();
    window.addEventListener('scroll',onScroll,{passive:true});

    var menuBtn=document.querySelector('[data-menu]');
    var mobileNav=document.querySelector('[data-mobile-nav]');
    if(menuBtn){
      menuBtn.addEventListener('click',function(){
        var open=header.classList.toggle('open');
        document.body.classList.toggle('menu-open',open);
        menuBtn.setAttribute('aria-expanded',open);
      });
    }
    if(mobileNav){
      mobileNav.addEventListener('click',function(e){
        if(e.target.closest('a')){
          header.classList.remove('open');
          document.body.classList.remove('menu-open');
        }
      });
    }
  }

  /* ===== 初始化 ===== */
  function init(){
    initHeader();
    initFAQ();
    initFormTypeSwitch();
    captureAdParams();
    initFormSubmit();
    loadYouTubeVideos();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }

})();
