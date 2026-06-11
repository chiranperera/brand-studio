import { LiveClient } from "@/components/live/LiveClient";

// Public, no-login client view for a live session. The host pushes the current
// step over Realtime; this page mirrors it and sends the client's taps back.
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <LiveClient code={code} />;
}
