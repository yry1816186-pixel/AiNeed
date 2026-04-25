import { post } from "./request";

export interface DialogResponse {
  reply: string;
  sessionId: string;
  quickReplies?: string[];
}

/**
 * Send a message to the Yiyi dialog endpoint.
 * POST /dialog with { message, sessionId }
 */
export async function sendMessage(message: string, sessionId?: string): Promise<DialogResponse> {
  return post<DialogResponse>("/dialog", {
    message,
    sessionId,
  });
}
