/**
 * Payday (D38): every minute worked since the last, at the career's wage, less what its employer
 * withholds, into the economy kit's cash. Weekly, so a paycheck is one of 52 in the year's sums.
 * Someone let go is paid what they are owed on the next payday, as Michigan's employers must.
 */
import { taxOf } from './records.ts';
import { careerFor, type JobContext } from './state.ts';
import { paycheck, payFor } from './withholding.ts';

/** Paychecks a year, paid weekly. */
export const PERIODS = 52;

export function payday(ctx: JobContext): void {
  const slice = ctx.read();
  if (slice.career === null || slice.unpaid === 0) return;
  const career = careerFor(ctx.content, slice);
  const year = ctx.fact('time.year') as number;
  const earned = slice.year === year ? slice.earned : 0;
  const gross = payFor(slice.unpaid, career.wage);
  const taxes = career.withholding.map((id) => [id, taxOf(ctx.content, id)] as const);
  const check = paycheck(taxes, gross, PERIODS, earned);
  const minutes = slice.unpaid;
  const w = ctx.write();
  w.unpaid = 0;
  w.year = year;
  w.earned = earned + gross;
  if (check.net > 0) ctx.apply({ effect: 'add-resource', resource: 'cash', by: check.net });
  ctx.emit('paid', { minutes, gross, withheld: check.withheld, net: check.net });
}
