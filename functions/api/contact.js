// Cloudflare Pages Function: /api/contact
// 接收表单提交并同时推送到企业微信群、Google Sheets表格和CRM系统

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // 解析表单数据
    const contentType = request.headers.get('content-type') || '';
    let formData = {};
    
    if (contentType.includes('application/json')) {
      formData = await request.json();
    } else {
      const form = await request.formData();
      for (const [key, value] of form.entries()) {
        formData[key] = value;
      }
    }
    
    // 添加提交时间和来源页面
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    formData.submittedAt = timeStr;
    formData.source = formData.source || request.headers.get('referer') || '未知';
    
    // 获取客户端IP
    const clientIP = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
    
    // ========== 1. 发送到企业微信群 ==========
    const wechatMessage = `🔔 新的网站询盘！

👤 姓名：${formData.name || '未填写'}
🏢 公司：${formData.company || '未填写'}
📱 电话：${formData.phone || '未填写'}
💬 微信：${formData.wechat || '未填写'}
📧 邮箱：${formData.email || '未填写'}
🌍 项目国家：${formData.country || '未填写'}
📐 尺寸：长${formData.length || '-'}m × 宽${formData.width || '-'}m × 高${formData.height || '-'}m
🏗️ 起重机：${formData.crane || '未填写'}
📝 留言：${formData.message || '无'}

⏰ 提交时间：${timeStr}
🌐 来源页面：${formData.source}`;
    
    const wechatWebhookUrl = env.WECOM_WEBHOOK_URL;
    
    if (!wechatWebhookUrl) {
      console.error('WECOM_WEBHOOK_URL environment variable not set');
      return new Response(JSON.stringify({
        success: false,
        message: '服务器配置错误：企业微信Webhook未配置',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const wechatPromise = fetch(wechatWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'text',
        text: { content: wechatMessage },
      }),
    }).then(async (res) => {
      const result = await res.json();
      if (result.errcode !== 0) {
        console.error('企业微信推送失败:', result);
        return { success: false, error: result.errmsg };
      }
      return { success: true };
    }).catch((err) => {
      console.error('企业微信推送异常:', err);
      return { success: false, error: err.message };
    });
    
    // ========== 2. 发送到Google Sheets表格 ==========
    const googleSheetsUrl = env.GOOGLE_SHEETS_WEBHOOK_URL;
    
    if (!googleSheetsUrl) {
      console.warn('GOOGLE_SHEETS_WEBHOOK_URL not set, skipping Google Sheets sync');
      var googlePromise = Promise.resolve({ success: true, skipped: true });
    } else {
    
    const googlePromise = fetch(googleSheetsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      redirect: 'follow',
    }).then(async (res) => {
      const result = await res.json();
      if (!result.success) {
        console.error('Google Sheets写入失败:', result);
        return { success: false, error: result.message };
      }
      return { success: true };
    }).catch((err) => {
      console.error('Google Sheets写入异常:', err);
      return { success: false, error: err.message };
    });
    }
    
    // ========== 3. 发送到CRM系统 ==========
    const crmWebhookUrl = env.CRM_WEBHOOK_URL;
    
    if (!crmWebhookUrl) {
      console.warn('CRM_WEBHOOK_URL not set, skipping CRM sync');
      var crmPromise = Promise.resolve({ success: true, skipped: true });
    } else {
    
    // 转换为CRM格式
    const crmData = {
      name: formData.name,
      country: formData.country,
      city: formData.city,
      company: formData.company,
      jobTitle: formData.jobTitle,
      wechat: formData.wechat,
      whatsapp: formData.whatsapp,
      phone: formData.phone,
      email: formData.email,
      projectType: formData.projectType,
      projectDescription: formData.message || formData.projectDescription,
      purchaseTimeline: formData.purchaseTimeline,
      budget: formData.budget,
      sourcePage: formData.source,
      utmSource: formData.utm_source,
      utmMedium: formData.utm_medium,
      utmCampaign: formData.utm_campaign,
      utmContent: formData.utm_content,
      utmTerm: formData.utm_term,
      language: formData.language || (formData.source && formData.source.includes('/en/') ? 'en' : 'zh'),
    };
    
    const crmPromise = fetch(crmWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(crmData),
    }).then(async (res) => {
      const result = await res.json();
      if (!result.success) {
        console.error('CRM写入失败:', result);
        return { success: false, error: result.error || result.message };
      }
      return { success: true, leadNumber: result.leadNumber };
    }).catch((err) => {
      console.error('CRM写入异常:', err);
      return { success: false, error: err.message };
    });
    }
    
    // ========== 并行执行三个推送 ==========
    const [wechatResult, googleResult, crmResult] = await Promise.all([wechatPromise, googlePromise, crmPromise]);
    
    // 企业微信是主要通知方式，如果失败则返回错误
    if (!wechatResult.success) {
      return new Response(JSON.stringify({
        success: false,
        message: '企业微信推送失败: ' + (wechatResult.error || '未知错误'),
        googleSheets: googleResult.success ? 'success' : 'failed: ' + (googleResult.error || '未知'),
        crm: crmResult.success ? 'success' : 'failed: ' + (crmResult.error || '未知'),
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 返回成功响应（Google Sheets和CRM失败不影响整体成功，只记录日志）
    return new Response(JSON.stringify({
      success: true,
      message: '提交成功，我们将在24小时内与您联系！',
      wechat: 'success',
      googleSheets: googleResult.success ? 'success' : 'failed (logged)',
      crm: crmResult.success ? `success (${crmResult.leadNumber})` : 'failed (logged)',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('表单处理错误:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '服务器错误: ' + error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 支持GET请求（用于测试）
export async function onRequestGet(context) {
  return new Response(JSON.stringify({
    message: 'Contact API is running. Please use POST to submit form data.',
    endpoints: ['POST /api/contact'],
    integrations: ['WeChat Work (企业微信)', 'Google Sheets', 'CRM System'],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
