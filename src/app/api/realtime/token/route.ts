import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET() {
  const endpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT?.trim();
  const apiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY?.trim();
  const deployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT?.trim();

  const missing: string[] = [];
  if (!endpoint) missing.push("AZURE_OPENAI_REALTIME_ENDPOINT");
  if (!apiKey) missing.push("AZURE_OPENAI_REALTIME_API_KEY");
  if (!deployment) missing.push("AZURE_OPENAI_REALTIME_DEPLOYMENT");

  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Azure OpenAI non configurato", missing },
      { status: 503 },
    );
  }

  // Extract resource name: https://my-resource.openai.azure.com -> my-resource
  const azureResource = endpoint!.match(/https:\/\/([^.]+)\./)?.[1] || "";

  return NextResponse.json({
    provider: "azure",
    transport: "webrtc",
    azureResource,
    deployment,
    configured: true,
  });
}
