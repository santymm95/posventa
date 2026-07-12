import 'dotenv/config';
import { getCashClosingByDate, getDailyBalance, getSalesByDate, createCashClosing } from '../server/db';

function normalizeToStartOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function run() {
  const today = normalizeToStartOfDay(new Date());
  console.log('Validating cash closing for date:', today.toISOString());

  const existing = await getCashClosingByDate(today);
  if (existing) {
    console.log('Existing cash closing found:', existing);
    return;
  }

  const balance = await getDailyBalance(today);
  console.log('Daily balance:', balance);

  const sales = await getSalesByDate(today);
  console.log('Sales found:', sales.length);

  const totalSales = balance?.totalSales ?? sales.reduce((sum: number, s: any) => sum + s.totalPrice, 0);
  const cashSales = balance?.cashSales ?? sales.filter((s: any) => s.paymentMethod === 'efectivo').reduce((sum: number, s: any) => sum + s.totalPrice, 0);
  const transferSales = balance?.transferSales ?? sales.filter((s: any) => s.paymentMethod === 'transferencia').reduce((sum: number, s: any) => sum + s.totalPrice, 0);
  const creditSales = balance?.creditSales ?? sales.filter((s: any) => s.paymentMethod === 'fiado').reduce((sum: number, s: any) => sum + s.totalPrice, 0);
  const expectedCash = cashSales;
  const actualCash = cashSales;
  const difference = actualCash - expectedCash;

  console.log('Will create cash closing with totals:', {
    totalSales,
    cashSales,
    transferSales,
    creditSales,
    expectedCash,
    actualCash,
    difference,
  });

  const id = await createCashClosing({
    date: today,
    totalSales,
    cashSales,
    transferSales,
    creditSales,
    expectedCash,
    actualCash,
    difference,
    notes: 'Validación de cierre de caja',
    closedBy: 1,
  });

  console.log('Created cash closing with id:', id);
  const created = await getCashClosingByDate(today);
  console.log('Retrieved closing:', created);
}

run().catch((error) => {
  console.error('Validation failed:', error);
  process.exit(1);
});
