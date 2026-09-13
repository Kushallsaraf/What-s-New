export const runtime = 'edge';

export async function GET() {
  return Response.json({
    status: 'ok',
    app: "what's new",
    mode: 'zero-cost-mvp',
    kronos: 'disabled',
  });
}
