import { dataSources } from '@/lib/data-sources';

export const runtime = 'edge';

export async function GET() {
  return Response.json({ sources: dataSources });
}
