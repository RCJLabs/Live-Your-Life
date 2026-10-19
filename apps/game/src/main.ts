/**
 * The page: the life on the generated block (M1.6, D51), or M0.3's art spike at `?spike`, kept so
 * its open gates can still be taken there, with M1.1's generated block at `?block=generated`.
 */
import './style.css';

const q = new URLSearchParams(location.search);
if (q.has('spike') || q.get('block') === 'generated') await import('./spike/main.ts');
else await import('./life/main.ts');
