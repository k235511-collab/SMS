import { calculateInvoiceDiscountFields, calculateInvoiceStatus } from './finance.utils'

describe('finance.utils', () => {
  describe('calculateInvoiceDiscountFields', () => {
    it('returns the full amount when no discount is present', () => {
      expect(calculateInvoiceDiscountFields(1000)).toEqual({
        grossAmount: 1000,
        discountType: null,
        discountValue: null,
        discountAmount: 0,
        totalAmount: 1000,
      })
    })

    it('caps percentage discounts at 100 percent', () => {
      expect(
        calculateInvoiceDiscountFields(1000, {
          discountType: 'PERCENTAGE',
          discountValue: 150,
        }),
      ).toEqual({
        grossAmount: 1000,
        discountType: 'PERCENTAGE',
        discountValue: 150,
        discountAmount: 1000,
        totalAmount: 0,
      })
    })

    it('caps fixed discounts at the fee amount', () => {
      expect(
        calculateInvoiceDiscountFields(800, {
          discountType: 'FIXED',
          discountValue: 1200,
        }),
      ).toEqual({
        grossAmount: 800,
        discountType: 'FIXED',
        discountValue: 1200,
        discountAmount: 800,
        totalAmount: 0,
      })
    })
  })

  describe('calculateInvoiceStatus', () => {
    it('returns PAID when the invoice is fully settled', () => {
      expect(calculateInvoiceStatus(1000, 1000)).toBe('PAID')
    })

    it('returns OVERDUE when a balance remains after the due date', () => {
      expect(calculateInvoiceStatus(400, 1000, true)).toBe('OVERDUE')
    })

    it('returns PARTIAL when some balance has been paid', () => {
      expect(calculateInvoiceStatus(400, 1000)).toBe('PARTIAL')
    })

    it('returns UNPAID when nothing has been paid', () => {
      expect(calculateInvoiceStatus(0, 1000)).toBe('UNPAID')
    })
  })
})
