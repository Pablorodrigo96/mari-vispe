import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface Props {
  documentLabel: string;
  documentVersion?: number | string;
  documentHash: string; // unique id / hash
  signerName: string;
  signerEmail?: string;
  signerCpf?: string;
  signerBirth?: string;
  signerIp?: string;
  signedAt: string; // ISO
  validationUrl: string;
}

/**
 * Vispe Sign — Comprovante de Assinatura Eletrônica.
 * A4 portrait, decorative diamond border, handwriting signature, QR codes.
 * Inspired by PlugSign certificate layout.
 */
export function SignatureCertificate({
  documentLabel,
  documentVersion,
  documentHash,
  signerName,
  signerEmail,
  signerCpf,
  signerBirth,
  signerIp,
  signedAt,
  validationUrl,
}: Props) {
  const [qrHistorico, setQrHistorico] = useState<string>("");
  const [qrValidacao, setQrValidacao] = useState<string>("");

  useEffect(() => {
    const opts = { margin: 0, width: 96, color: { dark: "#1e3a8a", light: "#FAFAF7" } };
    QRCode.toDataURL(`${validationUrl}#historico`, opts).then(setQrHistorico).catch(() => {});
    QRCode.toDataURL(validationUrl, opts).then(setQrValidacao).catch(() => {});
  }, [validationUrl]);

  const shortHash = documentHash.slice(0, 32);
  const code = documentHash.slice(0, 4).toUpperCase();
  const dt = new Date(signedAt);
  const formattedDate = dt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  // Diamond pattern via inline SVG data URI for the border
  const diamondSvg = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
      <g fill='none' stroke='#2563eb' stroke-width='1.5'>
        <path d='M16 2 L30 16 L16 30 L2 16 Z'/>
        <path d='M16 8 L24 16 L16 24 L8 16 Z'/>
      </g>
    </svg>
  `);

  return (
    <div className="bg-zinc-200/40 dark:bg-zinc-900/40 p-4 sm:p-8 rounded print:bg-white print:p-0">
      <div
        className="signature-certificate mx-auto bg-[#FAFAF7] shadow-2xl print:shadow-none"
        style={{
          maxWidth: "816px",
          minHeight: "1056px",
          padding: "64px",
          color: "#1a1a1a",
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontSize: "11pt",
          backgroundImage: `url("data:image/svg+xml;utf8,${diamondSvg}")`,
          backgroundRepeat: "repeat",
          backgroundSize: "32px 32px",
          position: "relative",
        }}
      >
        {/* Inner white card with content */}
        <div
          style={{
            background: "#FAFAF7",
            padding: "32px 40px",
            minHeight: "928px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "13pt", fontWeight: 700, letterSpacing: "0.5px" }}>
              COMPROVANTE DE ASSINATURA ELETRÔNICA
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2563eb", fontWeight: 700, fontSize: "14pt" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M21 7v4h-4" />
              </svg>
              <span>Vispe Sign</span>
            </div>
          </div>

          {/* Title block */}
          <div>
            <div style={{ fontSize: "14pt", fontWeight: 700, wordBreak: "break-word" }}>
              {documentLabel}{documentVersion ? ` — v${documentVersion}` : ""}
            </div>
            <div style={{ fontSize: "10pt", marginTop: "4px" }}>
              <strong>ID única do documento:</strong>{" "}
              <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>#{shortHash}</span>
            </div>
            <div style={{ fontSize: "9pt", fontStyle: "italic", color: "#444", marginTop: "8px" }}>
              Este Log é exclusivo ao documento #{shortHash} e deve ser considerado parte do mesmo, com os efeitos
              prescritos nos <span style={{ color: "#2563eb", textDecoration: "underline" }}>Termos de Uso</span>.
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #1a1a1a" }} />

          {/* Assinatura e histórico */}
          <div>
            <div style={{ fontSize: "12pt", fontWeight: 700, marginBottom: "16px" }}>Assinatura e histórico</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "24px", alignItems: "start" }}>
              {/* Handwriting signature */}
              <div
                style={{
                  fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive',
                  fontSize: "28pt",
                  color: "#0a0a0a",
                  textAlign: "center",
                  padding: "8px 16px",
                  lineHeight: 1.2,
                  wordBreak: "break-word",
                }}
              >
                {abbreviateName(signerName)}
              </div>

              {/* Signer data */}
              <div style={{ fontSize: "10pt", lineHeight: 1.7 }}>
                <div><strong>Nome completo:</strong> {signerName}</div>
                <div><strong>CPF:</strong> {signerCpf || "—"}</div>
                <div><strong>Data de nascimento:</strong> {signerBirth || "—"}</div>
                <div><strong>E-mail ou telefone:</strong> {signerEmail || "—"}</div>
                <div><strong>Endereço de IP:</strong> {signerIp || "registrado no servidor"}</div>
                <div><strong>Data e hora da assinatura:</strong> {formattedDate}</div>
              </div>
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #1a1a1a" }} />

          {/* Legal text */}
          <div style={{ fontSize: "9pt", fontStyle: "italic", color: "#222" }}>
            O documento não foi modificado, a assinatura eletrônica é válida para LTV. Assinatura com validade
            jurídica conforme a MP 2.200-2/2001, art. 10, §2º e Lei 14.063/2020, na modalidade de
            "Assinatura eletrônica avançada".
          </div>

          <div style={{ fontSize: "9pt", fontStyle: "italic", textAlign: "center", color: "#222" }}>
            Autenticidade deste documento poderá ser verificada em:
            <br />
            <span style={{ color: "#2563eb", wordBreak: "break-all" }}>{validationUrl}</span>
          </div>

          {/* Spacer pushes footer to bottom */}
          <div style={{ flex: 1 }} />

          {/* Footer: QR codes + seals */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "16px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "8pt", marginBottom: "4px" }}>Histórico do DOC</div>
                {qrHistorico && <img src={qrHistorico} alt="QR Histórico" style={{ width: 80, height: 80 }} />}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "8pt", marginBottom: "4px" }}>Código: {code}</div>
                <div style={{ fontSize: "8pt", marginBottom: "4px" }}>Validação</div>
                {qrValidacao && <img src={qrValidacao} alt="QR Validação" style={{ width: 80, height: 80 }} />}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <Seal label="ITI" sub="Instituto Nacional de Tecnologia da Informação" />
              <Seal label="ICP" sub="Brasil" highlight />
              <Seal label="ntp.br" sub="" />
              <div style={{ fontSize: "8pt", color: "#222", maxWidth: "220px", lineHeight: 1.4 }}>
                Datas e horários baseados no fuso horário (GMT -3:00) em Brasília, Brasil.
                Sincronizado com o NTP.br e Observatório Nacional (ON).
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .signature-certificate, .signature-certificate * { visibility: visible; }
          .signature-certificate { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}

function Seal({ label, sub, highlight }: { label: string; sub: string; highlight?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "4px 8px",
        border: highlight ? "1.5px solid #2563eb" : "1px solid #999",
        borderRadius: "4px",
        background: highlight ? "#dbeafe" : "transparent",
        minWidth: "48px",
      }}
    >
      <div style={{ fontSize: "10pt", fontWeight: 700, color: highlight ? "#1e3a8a" : "#222" }}>{label}</div>
      {sub && <div style={{ fontSize: "7pt", color: "#444" }}>{sub}</div>}
    </div>
  );
}

function abbreviateName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 2) return full;
  const first = parts[0];
  const middle = parts.slice(1, -1).map((p) => p[0]?.toUpperCase() + ".").join(" ");
  const last = parts[parts.length - 1];
  return `${first} ${middle} ${last}`;
}
