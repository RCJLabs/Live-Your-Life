/** The mode a ward's years pass in (D108, lives/module.ts), for the modules that step over them. */
export const WARD = 'ward';

/** In a ward's years: what is lived in them is the jump's, not a day's or an hour's. */
export const inWardYears = (ctx: { readonly modes: { readonly current: { readonly id: string } } }): boolean =>
  ctx.modes.current.id === WARD;
