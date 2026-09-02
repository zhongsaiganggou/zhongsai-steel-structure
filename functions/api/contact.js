// Cloudflare Pages Function: /api/contact
// 只写入 Google Sheets；企业微信由 Apps Script 在落表后推送

function buildPhone(formData) {
  const merged = (formData.phone || '').toString().trim();
  if (merged) return merged;
  const code = (formData.phone_code || '').toString().trim();
  const num = (formData.phone_number || '').toString().trim();
  if (code && num) return `${code} ${num}`.trim();
  return num || code || '';
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
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

    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    formData.submittedAt = timeStr;
    formData.source = formData.source || request.headers.get('referer') || '未知';
    formData.phone = buildPhone(formData);

    // 兼容旧字段：crane / hasCrane
    if (formData.hasCrane == null && formData.crane != null) {
      formData.hasCrane = formData.crane;
    }

    const googleSheetsUrl = env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!googleSheetsUrl) {
      return new Response(JSON.stringify({
        success: false,
        message: '服务器配置错误：未配置 Google Sheets Webhook',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(googleSheetsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      redirect: 'follow',
    });

    let result = {};
    try {
      result = await res.json();
    } catch (e) {
      console.error('Google Sheets 响应非 JSON:', e);
      return new Response(JSON.stringify({
        success: false,
        message: '表格服务响应异常，请稍后重试',
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!result.success) {
      console.error('Google Sheets 写入失败:', result);
      return new Response(JSON.stringify({
        success: false,
        message: result.message || '线索写入失败，请稍后重试或直接 WhatsApp 联系',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: '提交成功，我们将在24小时内与您联系！',
      googleSheets: 'success',
      wecom: result.wecom || 'via_sheets',
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

export async function onRequestGet() {
  return new Response(JSON.stringify({
    message: 'Contact API is running. Please use POST to submit form data.',
    endpoints: ['POST /api/contact'],
    integrations: ['Google Sheets (Apps Script pushes WeCom after write)'],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
