
/* Specialist consultations: only prepares a WhatsApp message; no fake booking or server-side storage. */
(() => {
  "use strict";
  const form = document.getElementById("consultationRequest");
  if (!form) return;
  const topic = form.elements.namedItem("topic");
  const cards = document.querySelectorAll("[data-choose-topic]");
  const field = document.getElementById("consultProblem");
  const allowed = new Set([...topic.options].map(o => o.value).filter(Boolean));
  const params = new URLSearchParams(window.location.search);
  const fromLink = params.get("topic");
  if (allowed.has(fromLink)) topic.value = fromLink;
  cards.forEach(button => {
    button.addEventListener("click", () => {
      const chosen = button.getAttribute("data-choose-topic");
      if (allowed.has(chosen)) topic.value = chosen;
      form.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start"});
      setTimeout(() => field.focus({preventScroll:true}), 300);
    });
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const get = name => String(form.elements.namedItem(name).value || "").trim();
    const selected = topic.options[topic.selectedIndex]?.textContent?.trim() || "";
    const values = [
      "طلب استشارة تجارة إلكترونية متخصصة — كن أونلاين",
      "الاسم: " + get("name").slice(0,90),
      "واتساب العميل: " + get("whatsapp").slice(0,26),
      "الدولة: " + get("country"),
      "مرحلة المشروع: " + get("stage"),
      "التخصص: " + selected,
      "رابط المتجر: " + (get("store").slice(0,200) || "غير متاح"),
      "المشكلة: " + get("problem").slice(0,1200),
      "الهدف: " + (get("goal").slice(0,500) || "يُحدد لاحقًا"),
      "أطلب مراجعة نطاق الاستشارة والتكلفة والموعد قبل التأكيد."
    ];
    const url = "https://wa.me/201021231619?text=" + encodeURIComponent(values.join("\n"));
    const status = document.getElementById("consultSubmitStatus");
    status.textContent = "سيُفتح واتساب برسالة جاهزة. اضغط «إرسال» داخل واتساب لإكمال الطلب؛ إرسال النموذج وحده لا يؤكد الحجز.";
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.assign(url);
  });
  const share = document.getElementById("consultShare");
  share?.addEventListener("click", async () => {
    const url = new URL("/consultations/", window.location.origin);
    if (allowed.has(topic.value)) url.searchParams.set("topic", topic.value);
    const feedback = document.getElementById("consultShareStatus");
    try {
      if (navigator.share) await navigator.share({title:"استشارات التجارة الإلكترونية — كن أونلاين",url:url.toString()});
      else if (navigator.clipboard?.writeText) {await navigator.clipboard.writeText(url.toString());feedback.textContent="تم نسخ رابط الاستشارة";}
      else {feedback.textContent="انسخ الرابط من شريط المتصفح: " + url.toString();}
    } catch (err) {
      if (err?.name !== "AbortError") feedback.textContent="يمكنك مشاركة رابط الصفحة من شريط المتصفح.";
    }
  });
})();
