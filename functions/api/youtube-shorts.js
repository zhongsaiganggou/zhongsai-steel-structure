// YouTube Shorts API - 代理YouTube RSS，返回频道最新视频列表
// 用于首页动态渲染竖屏Shorts视频卡片

export async function onRequest(context) {
  const { request, env } = context;
  
  // 允许CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=3600' // 缓存1小时
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const channelId = 'UC6-uk_aWXrl1BiBvAc4Lx3A';
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    
    // 从缓存读取（如果有）
    const cacheKey = `youtube-shorts-${channelId}`;
    const cached = await env.YOUTUBE_CACHE?.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      });
    }
    
    // 请求YouTube RSS
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ZhongSaiWebsite/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`YouTube RSS request failed: ${response.status}`);
    }
    
    const xmlText = await response.text();
    
    // 解析XML提取视频信息
    const videos = parseYouTubeRSS(xmlText);
    
    // 取最新6个视频
    const latestVideos = videos.slice(0, 6);
    
    const result = JSON.stringify({
      success: true,
      channel: '@ZhongSaiSteel',
      channelId: channelId,
      count: latestVideos.length,
      videos: latestVideos
    });
    
    // 写入缓存（如果有KV存储）
    try {
      await env.YOUTUBE_CACHE?.put(cacheKey, result, { expirationTtl: 3600 });
    } catch (e) {
      // 缓存不可用时忽略
    }
    
    return new Response(result, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });
    
  } catch (error) {
    console.error('YouTube Shorts API error:', error);
    
    // 返回降级数据（固定的3个Shorts视频）
    const fallback = JSON.stringify({
      success: true,
      fallback: true,
      channel: '@ZhongSaiSteel',
      count: 3,
      videos: [
        { id: 'SdM7zC5Dp5Y', title: '中赛钢构工厂实拍', url: 'https://youtube.com/shorts/SdM7zC5Dp5Y', thumbnail: 'https://img.youtube.com/vi/SdM7zC5Dp5Y/hqdefault.jpg', published: '' },
        { id: 'KeXTIxd07LY', title: '钢结构装柜过程', url: 'https://youtube.com/shorts/KeXTIxd07LY', thumbnail: 'https://img.youtube.com/vi/KeXTIxd07LY/hqdefault.jpg', published: '' },
        { id: 'kr2S2qqL_AY', title: '钢结构生产车间', url: 'https://youtube.com/shorts/kr2S2qqL_AY', thumbnail: 'https://img.youtube.com/vi/kr2S2qqL_AY/hqdefault.jpg', published: '' }
      ]
    });
    
    return new Response(fallback, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 解析YouTube RSS XML
function parseYouTubeRSS(xml) {
  const videos = [];
  
  // 匹配每个<entry>块
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    
    // 提取视频ID
    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const videoId = videoIdMatch ? videoIdMatch[1] : '';
    
    // 提取标题
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1] : '';
    
    // 提取发布日期
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const published = publishedMatch ? publishedMatch[1] : '';
    
    // 提取缩略图（media:thumbnail）
    const thumbnailMatch = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/);
    const thumbnail = thumbnailMatch ? thumbnailMatch[1] : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    
    // 构建Shorts URL
    const shortsUrl = `https://youtube.com/shorts/${videoId}`;
    
    if (videoId) {
      videos.push({
        id: videoId,
        title: title,
        url: shortsUrl,
        thumbnail: thumbnail,
        published: published
      });
    }
  }
  
  return videos;
}
