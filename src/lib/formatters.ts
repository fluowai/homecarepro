export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return "";
  
  // Remove all non-numeric characters
  const numericOnly = phone.replace(/\D/g, "");
  
  if (numericOnly.startsWith("55") && (numericOnly.length === 12 || numericOnly.length === 13)) {
    const ddd = numericOnly.substring(2, 4);
    if (numericOnly.length === 13) {
      // +55 (XX) XXXXX-XXXX
      const part1 = numericOnly.substring(4, 9);
      const part2 = numericOnly.substring(9, 13);
      return `+55 (${ddd}) ${part1}-${part2}`;
    } else {
      // +55 (XX) XXXX-XXXX
      const part1 = numericOnly.substring(4, 8);
      const part2 = numericOnly.substring(8, 12);
      return `+55 (${ddd}) ${part1}-${part2}`;
    }
  }

  // Fallback for other international numbers or unrecognized formats
  return `+${numericOnly}`;
}

export function normalizeBrazilPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return `+${digits}`;
  return `+55${digits}`;
}
