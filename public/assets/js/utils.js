/**
 * Fungsi untuk sanitasi HTML untuk mencegah XSS
 * @param {string} input - Teks yang akan disanitasi
 * @returns {string} - Teks yang sudah disanitasi
 */
export function sanitizeHTML(input) {
  if (typeof input !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}