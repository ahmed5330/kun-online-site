/* Intent-only tracking. Pushing to dataLayer does not transmit data until the
   site owner configures an analytics tag and the applicable privacy controls. */
(function () {
  'use strict';
  function safeCampaign(value) {
    // Never forward arbitrary full URLs or free-form personal details.
    return /^[a-zA-Z0-9_\-.]{1,70}$/.test(value || '') ? value : undefined;
  }
  function section(path, link) {
    const explicit = link.closest('[data-service-type]')?.getAttribute('data-service-type');
    if (explicit && /^[a-z0-9_-]{1,50}$/.test(explicit)) return explicit;
    if (path.startsWith('/system/')) return 'commerce_software';
    if (path.startsWith('/services/ecommerce-ads/')) return 'ads_management';
    if (path.startsWith('/services/order-management/')) return 'order_confirmation_service';
    if (path.startsWith('/services/ecommerce-store-development/')) return 'store_building';
    if (path.startsWith('/services/ecommerce-consulting/')) return 'consulting';
    if (path.startsWith('/services/ecommerce-management/')) return 'store_management';
    if (path.startsWith('/pricing/')) return 'pricing';
    if (path.startsWith('/blog/')) return 'educational_content';
    return 'general_agency';
  }
  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[href],button[data-contact-channel="whatsapp"]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    const declaredChannel = link.getAttribute('data-contact-channel');
    const channel = declaredChannel === 'whatsapp' ? 'whatsapp' :
      href.startsWith('tel:') ? 'phone' :
      /^https:\/\/(?:api\.|web\.)?wa\.me\//i.test(href) ? 'whatsapp' : null;
    if (!channel) return;
    const path = window.location.pathname;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'contact_click', contact_channel: channel, page_path: path });
    if (channel !== 'whatsapp') return;
    const query = new URLSearchParams(window.location.search);
    const info = {
      event: 'whatsapp_click',
      contact_channel: 'whatsapp',
      page_path: path,
      service_type: section(path, link)
    };
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
      const value = safeCampaign(query.get(key));
      if (value) info[key] = value;
    }
    window.dataLayer.push(info);
    // Explicit gtag event is sent only after visitor opt-in. A dataLayer
    // object alone is not a GA4 hit without a configured GTM container.
    if (window.__kunGa4Started && typeof window.gtag === 'function') {
      window.gtag('event', 'whatsapp_click', {
        page_path: info.page_path,
        service_type: info.service_type,
        ...(info.utm_source ? {utm_source: info.utm_source} : {}),
        ...(info.utm_medium ? {utm_medium: info.utm_medium} : {}),
        ...(info.utm_campaign ? {utm_campaign: info.utm_campaign} : {})
      });
    }
    // A WhatsApp click is an intent signal, NOT a verified or qualified lead.
  });
}());


/* Privacy-first GA4 for the verified Kun Online stream.
 * Analytics scripts and cookies are never initialized before opt-in. */
(function () {
  'use strict';
  if (!document.createElement || !document.body || !window.localStorage) return;
  const measurementId = 'G-F2XBVGWB5X';
  const storageKey = 'kun_online_analytics_consent_v1';
  const storage = window.localStorage;
  let choice = null;
  try { choice = storage.getItem(storageKey); } catch (_) { return; }
  function startAnalytics() {
    if (window.__kunGa4Started) return;
    window.__kunGa4Started = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: true });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(tag);
  }
  if (choice === 'granted') { startAnalytics(); return; }
  if (choice === 'denied') return;
  function askConsent() {
    if (!document.body || document.getElementById('kun-analytics-consent')) return;
    const banner = document.createElement('aside');
    banner.id = 'kun-analytics-consent';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'تفضيلات تحليلات الموقع');
    Object.assign(banner.style, {
      position:'fixed', inset:'auto 13px 13px auto', maxWidth:'min(440px, calc(100vw - 26px))',
      padding:'18px', background:'#15233a', color:'#fff', border:'1px solid #54667a',
      borderRadius:'14px', boxShadow:'0 8px 30px rgba(0,0,0,.28)',
      zIndex:'10000', direction:'rtl', fontFamily:'Cairo, sans-serif', lineHeight:'1.8'
    });
    const message = document.createElement('p');
    message.textContent = 'هل توافق على استخدام Google Analytics لقياس زيارات الموقع وتحسينه؟ الرفض لن يمنع تصفح الموقع. لا نرسل بيانات التحليلات قبل موافقتك.';
    Object.assign(message.style, { margin:'0 0 12px', fontSize:'13px' });
    const controls = document.createElement('div');
    Object.assign(controls.style, { display:'flex', flexWrap:'wrap', gap:'9px' });
    function button(label, value, primary) {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = label;
      Object.assign(el.style, {
        cursor:'pointer', border:'1px solid #9fb1c4',
        borderRadius:'9px', padding:'8px 15px', fontFamily:'inherit',
        background:primary ? '#7dc242' : 'transparent',
        color:primary ? '#0a0f1e' : '#fff', fontWeight:'700'
      });
      el.addEventListener('click', function () {
        try { storage.setItem(storageKey, value); } catch (_) { return; }
        banner.remove();
        if (value === 'granted') startAnalytics();
      });
      controls.appendChild(el);
    }
    button('موافق', 'granted', true);
    button('رفض', 'denied', false);
    banner.appendChild(message);
    banner.appendChild(controls);
    document.body.appendChild(banner);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', askConsent);
  else askConsent();
}());


/* Persistent, accessible choice control. People can withdraw analytics
 * permission after their initial answer; no analytics is sent after reload. */
(function () {
  'use strict';
  const footer = document.querySelector('footer');
  if (!footer || !window.localStorage) return;
  const isEnglish = /^en\b/i.test(document.documentElement.lang || '');
  const key = 'kun_online_analytics_consent_v1';
  const labels = isEnglish
    ? { settings: 'Analytics preferences', explanation: 'You can change your analytics choice at any time. Declining does not affect website access.', allow: 'Allow analytics', deny: 'Decline analytics' }
    : { settings: 'إعدادات التحليلات', explanation: 'تقدر تغيّر موافقتك على قياس الزيارات في أي وقت، ورفض القياس مش هيمنع استخدام الموقع.', allow: 'السماح بالتحليلات', deny: 'رفض التحليلات' };
  const trigger = document.createElement('button');
  trigger.id = 'kun-analytics-preferences';
  trigger.type = 'button';
  trigger.textContent = labels.settings;
  Object.assign(trigger.style, {
    display: 'inline-block', cursor: 'pointer', font: 'inherit',
    fontSize: '12px', border: '1px solid #72849a', borderRadius: '8px',
    color: '#e4eaf2', background: 'transparent', padding: '6px 12px', margin: '10px'
  });
  trigger.setAttribute('aria-haspopup', 'dialog');
  function closePanel() { document.getElementById('kun-analytics-preferences-dialog')?.remove(); }
  function save(value) {
    try { window.localStorage.setItem(key, value); }
    catch (_) { return; }
    // Reload discards any initialized analytics libraries and stops future hits.
    // Historic GA data cannot be recalled by this client-side setting.
    window.location.reload();
  }
  trigger.addEventListener('click', function () {
    const existing = document.getElementById('kun-analytics-preferences-dialog');
    if (existing) { closePanel(); return; }
    const panel = document.createElement('div');
    panel.id = 'kun-analytics-preferences-dialog';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', labels.settings);
    Object.assign(panel.style, {
      position: 'fixed', inset: 'auto 12px 12px auto', zIndex: '10001',
      direction: isEnglish ? 'ltr' : 'rtl', background: '#15233a',
      color: '#fff', border: '1px solid #7a8ca4', borderRadius: '14px',
      maxWidth: 'min(430px, calc(100vw - 24px))', padding: '18px', lineHeight: '1.7',
      boxShadow: '0 8px 32px rgba(0,0,0,.28)'
    });
    const copy = document.createElement('p');
    copy.textContent = labels.explanation;
    copy.style.margin = '0 0 13px';
    panel.appendChild(copy);
    for (const [label, value] of [[labels.allow, 'granted'], [labels.deny, 'denied']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      Object.assign(button.style, {
        font: 'inherit', fontWeight: '700', fontSize: '13px',
        cursor: 'pointer', padding: '8px 13px', margin: '4px',
        borderRadius: '8px', border: '1px solid #7a8ca4',
        background: value === 'granted' ? '#7dc242' : 'transparent',
        color: value === 'granted' ? '#0a0f1e' : '#fff'
      });
      button.addEventListener('click', () => save(value));
      panel.appendChild(button);
    }
    document.body.appendChild(panel);
    panel.querySelector('button')?.focus();
  });
  footer.appendChild(trigger);
}());
