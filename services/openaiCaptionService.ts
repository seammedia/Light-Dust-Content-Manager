type CaptionResult = { caption: string; hashtags: string[] };

async function callCaptionApi(payload: Record<string, unknown>, pin: string) {
  const response = await fetch('/api/caption-generation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-portal-pin': pin },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Caption generation failed.');
  return result;
}

export async function generateCaptionFromImage(
  clientId: string,
  imageSource: string,
  brandName: string,
  clientNotes: string | undefined,
  pin: string,
): Promise<CaptionResult> {
  return callCaptionApi({ action: 'from_image', clientId, imageSource, brandName, clientNotes }, pin);
}

export async function updateFromFeedback(
  clientId: string,
  currentCaption: string,
  currentHashtags: string[],
  feedback: string,
  brandName: string,
  clientNotes: string | undefined,
  pin: string,
): Promise<CaptionResult> {
  return callCaptionApi({ action: 'update_from_feedback', clientId, currentCaption, currentHashtags, feedback, brandName, clientNotes }, pin);
}
