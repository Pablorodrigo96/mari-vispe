// Adapter para Meta WhatsApp Cloud API
// Modo MOCK por padrão. Quando META_MODE=real e secrets META_* estiverem
// configurados, troca para o adapter real (stub abaixo, a implementar quando
// Vispe fornecer WABA aprovado).

export interface RegisterResult {
  phone_number_id: string;
}
export interface VerifyResult {
  ok: boolean;
}
export interface TokenResult {
  access_token: string;
}

export interface MetaAdapter {
  mode: "mock" | "real";
  registerPhoneNumber(phone: string): Promise<RegisterResult>;
  verifyCode(phone_number_id: string, code: string): Promise<VerifyResult>;
  issueAccessToken(phone_number_id: string): Promise<TokenResult>;
  subscribeWebhook(
    phone_number_id: string,
    webhook_url: string,
    verify_token: string,
    access_token: string,
  ): Promise<{ ok: boolean }>;
}

/* -------------------- MOCK -------------------- */
const MOCK_CODE = "123456";

class MockMetaAdapter implements MetaAdapter {
  mode: "mock" = "mock";
  async registerPhoneNumber(phone: string): Promise<RegisterResult> {
    // Determinístico por número, prefixo MOCK_ pra deixar claro
    const id = "MOCK_" + phone.replace(/\D/g, "").slice(-10) + "_" +
      Math.random().toString(36).slice(2, 8);
    return { phone_number_id: id };
  }
  async verifyCode(_id: string, code: string): Promise<VerifyResult> {
    return { ok: code === MOCK_CODE };
  }
  async issueAccessToken(_id: string): Promise<TokenResult> {
    return {
      access_token: "MOCK_TOKEN_" + crypto.randomUUID().replace(/-/g, ""),
    };
  }
  async subscribeWebhook(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}

/* -------------------- REAL (stub) -------------------- */
class RealMetaAdapter implements MetaAdapter {
  mode: "real" = "real";
  private wabaId: string;
  private permanentToken: string;

  constructor(wabaId: string, permanentToken: string) {
    this.wabaId = wabaId;
    this.permanentToken = permanentToken;
  }

  async registerPhoneNumber(_phone: string): Promise<RegisterResult> {
    // TODO: implementar quando Meta real chegar
    // POST https://graph.facebook.com/v20.0/{WABA_ID}/phone_numbers
    throw new Error("RealMetaAdapter.registerPhoneNumber not implemented yet");
  }
  async verifyCode(_id: string, _code: string): Promise<VerifyResult> {
    throw new Error("RealMetaAdapter.verifyCode not implemented yet");
  }
  async issueAccessToken(_id: string): Promise<TokenResult> {
    throw new Error("RealMetaAdapter.issueAccessToken not implemented yet");
  }
  async subscribeWebhook(): Promise<{ ok: boolean }> {
    throw new Error("RealMetaAdapter.subscribeWebhook not implemented yet");
  }
}

/* -------------------- Factory -------------------- */
export function getMetaAdapter(): MetaAdapter {
  const mode = (Deno.env.get("META_MODE") ?? "mock").toLowerCase();
  const wabaId = Deno.env.get("META_BUSINESS_ACCOUNT_ID") ?? "";
  const token = Deno.env.get("META_PERMANENT_ACCESS_TOKEN") ?? "";

  if (mode === "real" && wabaId && token) {
    return new RealMetaAdapter(wabaId, token);
  }
  return new MockMetaAdapter();
}

export const MOCK_SMS_CODE = MOCK_CODE;
