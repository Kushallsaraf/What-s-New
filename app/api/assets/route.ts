import { assets } from '@/lib/demo-data';

export const runtime = 'edge';

export async function GET() {
  return Response.json({
    status: 'demo',
    delayed: true,
    asOf: 'previous-complete-session',
    assets,
  });
}
