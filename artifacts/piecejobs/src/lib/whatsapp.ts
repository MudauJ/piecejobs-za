export function openWhatsAppMessage(phone: string, message: string) {
  const formatted = phone.replace(/\s+/g, "").replace(/^0/, "+27");
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${formatted}?text=${encoded}`, "_blank");
}
