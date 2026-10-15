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
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    const channel = href.startsWith('tel:') ? 'phone' :
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
    // A WhatsApp click is an intent signal, NOT a verified or qualified lead.
  });
}());
