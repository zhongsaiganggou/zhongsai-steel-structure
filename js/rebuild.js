(function(){
  // Header scroll & mobile menu
  var h=document.querySelector('[data-header]'),
      b=document.querySelector('[data-menu]'),
      m=document.querySelector('[data-mobile-nav]');
  function s(){h&&h.classList.toggle('scrolled',scrollY>24)}
  s();addEventListener('scroll',s,{passive:true});
  if(b){b.onclick=function(){var o=h.classList.toggle('open');document.body.classList.toggle('menu-open',o);b.setAttribute('aria-expanded',o);b.setAttribute('aria-label',o?'关闭菜单':'打开菜单')}}
  if(m)m.onclick=function(e){if(e.target.closest('a')){h.classList.remove('open');document.body.classList.remove('menu-open');b.setAttribute('aria-expanded','false')}}

  // YouTube视频加载 - 工厂与交付现场
  function loadYouTubeVideos(){
    var grid=document.querySelector('[data-video-grid]');
    if(!grid)return;

    // 降级视频（接口失败时使用）
    var fallbackVideos=[
      {id:'SdM7zC5Dp5Y',title:'中赛钢构工厂实拍',url:'https://youtube.com/shorts/SdM7zC5Dp5Y',thumbnail:'https://img.youtube.com/vi/SdM7zC5Dp5Y/maxresdefault.jpg',published:''},
      {id:'KeXTIxd07LY',title:'钢结构装柜过程',url:'https://youtube.com/shorts/KeXTIxd07LY',thumbnail:'https://img.youtube.com/vi/KeXTIxd07LY/maxresdefault.jpg',published:''},
      {id:'kr2S2qqL_AY',title:'钢结构生产车间',url:'https://youtube.com/shorts/kr2S2qqL_AY',thumbnail:'https://img.youtube.com/vi/kr2S2qqL_AY/maxresdefault.jpg',published:''},
      {id:'SdM7zC5Dp5Y',title:'中赛钢构交付现场',url:'https://youtube.com/shorts/SdM7zC5Dp5Y',thumbnail:'https://img.youtube.com/vi/SdM7zC5Dp5Y/maxresdefault.jpg',published:''}
    ];

    function formatDate(dateStr){
      if(!dateStr)return '';
      try{
        var d=new Date(dateStr);
        return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0');
      }catch(e){return ''}
    }

    // 获取高清缩略图URL（优先maxresdefault，失败自动降级）
    function getHighResThumb(videoId){
      return 'https://img.youtube.com/vi/'+videoId+'/maxresdefault.jpg';
    }

    // 内联播放：将缩略图替换为YouTube iframe播放器
    function playVideoInline(card,videoId){
      var thumb=card.querySelector('.video-thumb');
      if(!thumb)return;

      // 停止其他正在播放的视频（同一时间只播放一个）
      document.querySelectorAll('.video-card.playing').forEach(function(otherCard){
        if(otherCard!==card){
          var otherThumb=otherCard.querySelector('.video-thumb');
          if(otherThumb&&otherThumb.dataset.originalHtml){
            otherThumb.innerHTML=otherThumb.dataset.originalHtml;
            otherCard.classList.remove('playing');
          }
        }
      });

      // 保存原始HTML以便恢复
      thumb.dataset.originalHtml=thumb.innerHTML;
      card.classList.add('playing');

      // 创建YouTube iframe，默认1080画质
      var iframe=document.createElement('iframe');
      iframe.src='https://www.youtube.com/embed/'+videoId+
        '?autoplay=1'+
        '&vq=hd1080'+
        '&rel=0'+
        '&modestbranding=1'+
        '&playsinline=1'+
        '&enablejsapi=1';
      iframe.className='video-iframe';
      iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('allowfullscreen','');
      iframe.setAttribute('frameborder','0');
      iframe.setAttribute('loading','lazy');
      iframe.setAttribute('title','YouTube video player');

      thumb.innerHTML='';
      thumb.appendChild(iframe);
    }

    function renderVideos(videos){
      // 只取最新4条
      var displayVideos=videos.slice(0,4);
      grid.innerHTML='';

      displayVideos.forEach(function(video){
        var card=document.createElement('div');
        card.className='video-card';
        card.setAttribute('role','button');
        card.setAttribute('tabindex','0');
        card.setAttribute('aria-label','播放视频：'+video.title);
        card.dataset.videoId=video.id;

        var thumb=document.createElement('div');
        thumb.className='video-thumb';

        var img=document.createElement('img');
        img.src=getHighResThumb(video.id);
        img.alt=video.title;
        img.loading='lazy';
        // maxresdefault加载失败时自动降级到hqdefault
        img.onerror=function(){
          if(this.src.indexOf('maxresdefault')!==-1){
            this.src='https://img.youtube.com/vi/'+video.id+'/hqdefault.jpg';
          }
        };

        var play=document.createElement('div');
        play.className='video-play';

        thumb.appendChild(img);
        thumb.appendChild(play);

        var info=document.createElement('div');
        info.className='video-info';

        var title=document.createElement('h3');
        title.className='video-title';
        title.textContent=video.title;

        var date=document.createElement('p');
        date.className='video-date';
        date.textContent=formatDate(video.published)||'中赛钢构';

        info.appendChild(title);
        info.appendChild(date);

        card.appendChild(thumb);
        card.appendChild(info);

        // 点击内联播放（不跳转）
        card.addEventListener('click',function(){
          playVideoInline(card,video.id);
        });
        // 键盘可访问性
        card.addEventListener('keydown',function(e){
          if(e.key==='Enter'||e.key===' '){
            e.preventDefault();
            playVideoInline(card,video.id);
          }
        });

        grid.appendChild(card);
      });
    }

    // 调用接口
    fetch('/api/youtube-shorts',{method:'GET'})
      .then(function(r){return r.json()})
      .then(function(data){
        if(data&&data.success&&data.videos&&data.videos.length>0){
          renderVideos(data.videos);
        }else{
          renderVideos(fallbackVideos);
        }
      })
      .catch(function(err){
        console.warn('YouTube videos load failed, using fallback:',err);
        renderVideos(fallbackVideos);
      });
  }

  // 页面加载完成后加载视频
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',loadYouTubeVideos);
  }else{
    loadYouTubeVideos();
  }

  // Form dual-entry switch (有图纸 / 无图纸)
  var typeBtns=document.querySelectorAll('.type-btn');
  var customerTypeInput=document.querySelector('input[name="customerType"]');
  var drawingUpload=document.querySelector('[data-drawing-upload]');
  var dimensionsFields=document.querySelector('[data-dimensions]');

  function switchFormType(type){
    typeBtns.forEach(function(btn){
      btn.classList.toggle('active',btn.dataset.type===type);
    });
    if(customerTypeInput)customerTypeInput.value=type;

    if(type==='hasDrawings'){
      // 有图纸：显示上传，尺寸字段可选但保留
      if(drawingUpload)drawingUpload.style.display='block';
      if(dimensionsFields)dimensionsFields.style.opacity='1';
    }else{
      // 无图纸：隐藏上传，强调尺寸字段
      if(drawingUpload)drawingUpload.style.display='none';
      if(dimensionsFields)dimensionsFields.style.opacity='1';
    }
  }

  typeBtns.forEach(function(btn){
    btn.addEventListener('click',function(){
      switchFormType(btn.dataset.type);
    });
  });

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

      // Handle file upload - send as base64 if files selected
      var fileInput=f.querySelector('input[name="drawings"]');
      if(fileInput&&fileInput.files&&fileInput.files.length>0){
        formData.hasDrawingsFile='yes';
        formData.drawingsFileName=Array.from(fileInput.files).map(function(f){return f.name}).join(', ');
        // Note: actual file upload would require FormData with multipart,
        // for now we notify user to send via WeChat/email for large files
      }

      var r=await fetch('/api/contact',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(formData)
      }),j=await r.json();
      if(!r.ok||!j.success)throw Error();
      msg('需求已提交，我们会尽快与您联系。如有图纸文件，请通过微信或邮件发送。','ok');
      f.reset();
      // Reset form type to default
      switchFormType('hasDrawings');
    }catch(x){
      msg('暂时无法提交，请通过 WhatsApp 或邮箱联系我们。','error');
    }finally{
      btn.disabled=false;btn.innerHTML=old;
    }
  };
})();
