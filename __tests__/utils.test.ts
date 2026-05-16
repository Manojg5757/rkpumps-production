import { formatCurrency, numberToWords } from '../lib/utils';

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('formats numbers to Indian Rupees correctly', () => {
      expect(formatCurrency(1000)).toBe('₹1,000.00');
      expect(formatCurrency(100000)).toBe('₹1,00,000.00');
    });
  });

  describe('numberToWords', () => {
    it('converts numbers to Indian currency words', () => {
      expect(numberToWords(105)).toBe('Rupees One Hundred Five Only');
      expect(numberToWords(1500)).toBe('Rupees One Thousand Five Hundred Only');
      expect(numberToWords(100000)).toBe('Rupees One Lakh Only');
    });
  });
});
