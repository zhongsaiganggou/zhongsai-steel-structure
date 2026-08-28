// YouTube Playlist API - 获取YouTube播放列表的视频列表
// 用于出货动态页面动态展示发货视频

export async function onRequest(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=300' // 缓存5分钟
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // 发货播放列表ID
    const playlistId = 'PLFxcBbXO5kK4';
    
    // 从缓存读取
    const cacheKey = `youtube-playlist-${playlistId}`;
    const cached = await env.YOUTUBE_CACHE?.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      });
    }
    
    // 方法1：使用公开的NoKey YouTube API获取播放列表视频
    const apiUrl = `https://yt.lemnoslife.com/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=20`;
    let videos = [];
    
    try {
      const apiResponse = await fetch(apiUrl, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        if (apiData.items && apiData.items.length > 0) {
          for (const item of apiData.items) {
            const snippet = item.snippet;
            const videoId = snippet?.resourceId?.videoId;
            if (videoId && snippet.title !== 'Private video' && snippet.title !== 'Deleted video') {
              const thumbnails = snippet?.thumbnails || {};
              const thumbnail = thumbnails?.high?.url || thumbnails?.medium?.url || thumbnails?.default?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              videos.push({
                id: videoId,
                title: snippet.title || 'Untitled',
                thumbnail: thumbnail,
                url: `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`,
                published: snippet.publishedAt || '',
                duration: ''
              });
            }
          }
        }
      }
    } catch (apiError) {
      console.warn('NoKey API failed, falling back to HTML parsing:', apiError.message);
    }
    
    // 方法2：如果方法1失败，fetch YouTube播放列表页面并解析
    if (videos.length === 0) {
      const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
      const response = await fetch(playlistUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      
      if (!response.ok) {
        throw new Error(`YouTube request failed: ${response.status}`);
      }
      
      const html = await response.text();
      videos = extractVideosFromHTML(html, playlistId);
    }
    
    if (videos.length === 0) {
      throw new Error('No videos found in playlist');
    }
    
    const result = JSON.stringify({
      success: true,
      playlistId: playlistId,
      playlistUrl: playlistUrl,
      count: videos.length,
      videos: videos
    });
    
    // 写入缓存
    try {
      await env.YOUTUBE_CACHE?.put(cacheKey, result, { expirationTtl: 300 });
    } catch (e) {
      // 缓存不可用时忽略
    }
    
    return new Response(result, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });
    
  } catch (error) {
    console.error('YouTube Playlist API error:', error);
    
    // 降级：返回固定的发货相关视频
    const fallback = JSON.stringify({
      success: true,
      fallback: true,
      playlistId: 'PLFxcBbXO5kK4',
      count: 3,
      videos: [
        { id: 'KeXTIxd07LY', title: '钢结构装柜全过程', thumbnail: 'https://img.youtube.com/vi/KeXTIxd07LY/hqdefault.jpg', url: 'https://youtube.com/shorts/KeXTIxd07LY' },
        { id: 'SdM7zC5Dp5Y', title: '中赛钢构工厂实拍', thumbnail: 'https://img.youtube.com/vi/SdM7zC5Dp5Y/hqdefault.jpg', url: 'https://youtube.com/shorts/SdM7zC5Dp5Y' },
        { id: 'kr2S2qqL_AY', title: '钢结构生产车间', thumbnail: 'https://img.youtube.com/vi/kr2S2qqL_AY/hqdefault.jpg', url: 'https://youtube.com/shorts/kr2S2qqL_AY' }
      ]
    });
    
    return new Response(fallback, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 从YouTube播放列表页面HTML中提取视频信息
function extractVideosFromHTML(html, playlistId) {
  const videos = [];
  
  try {
    // 方法1：从 ytInitialData JSON中递归查找 playlistVideoRenderer
    const initialDataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/);
    if (initialDataMatch) {
      const data = JSON.parse(initialDataMatch[1]);
      
      // 递归查找所有 playlistVideoRenderer
      function findPlaylistVideos(obj) {
        if (!obj || typeof obj !== 'object') return;
        if (obj.playlistVideoRenderer) {
          const videoRenderer = obj.playlistVideoRenderer;
          if (videoRenderer.videoId) {
            const title = videoRenderer?.title?.runs?.[0]?.text || videoRenderer?.title?.simpleText || 'Untitled';
            const videoId = videoRenderer.videoId;
            // 避免重复
            if (!videos.find(v => v.id === videoId)) {
              videos.push({
                id: videoId,
                title: title,
                thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                url: `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`,
                published: videoRenderer?.publishedTimeText?.simpleText || '',
                duration: videoRenderer?.lengthText?.simpleText || ''
              });
            }
          }
        }
        for (const key in obj) {
          if (obj[key] && typeof obj[key] === 'object') {
            findPlaylistVideos(obj[key]);
          }
        }
      }
      
      findPlaylistVideos(data);
    }
    
    // 方法2：如果方法1失败，用正则匹配 playlistVideoRenderer 块
    if (videos.length === 0) {
      const rendererRegex = /"playlistVideoRenderer":\{[^}]*?"videoId":"([a-zA-Z0-9_-]{11})"[^}]*?"title":\{"runs":\[\{"text":"([^"]+)"/g;
      let match;
      while ((match = rendererRegex.exec(html)) !== null) {
        const videoId = match[1];
        const title = match[2];
        if (!videos.find(v => v.id === videoId)) {
          videos.push({
            id: videoId,
            title: title,
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`
          });
        }
      }
    }
    
  } catch (e) {
    console.error('Error extracting videos:', e);
  }
  
  return videos;
}
