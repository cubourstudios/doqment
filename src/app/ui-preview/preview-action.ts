"use server";

/**
 * A no-op server action for the preview harness.
 *
 * The forms take their action as a prop, and a client component can only be
 * handed a real server action reference — so the preview needs one that does
 * nothing rather than an inline stub.
 */
export async function previewAction(): Promise<{ error?: string }> {
  return { error: "This is a preview. Nothing was saved." };
}
