import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'mari · Vispe'
const APP_URL = 'https://mari.vispe.com.br'

interface NboSignedProps {
  codename?: string
  signedAt?: string
  advisorName?: string
  pairUrl?: string
  recipientRole?: 'seller' | 'buyer' | 'advisor' | 'admin'
}

const NboSignedEmail = ({
  codename = 'Projeto',
  signedAt,
  advisorName,
  pairUrl,
  recipientRole,
}: NboSignedProps) => {
  const dateStr = signedAt
    ? new Date(signedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : ''
  const url = pairUrl || APP_URL

  const intro: Record<string, string> = {
    seller: 'A NBO do seu projeto foi assinada. A operação avança agora para a fase de due diligence.',
    buyer: 'A NBO foi assinada. Próximo passo: due diligence completa.',
    advisor: 'NBO firmada. Acompanhe a transição para due diligence no painel do par.',
    admin: 'Marco oficial: NBO assinada.',
  }

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>NBO firmada · {codename}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{SITE_NAME}</Text>
            <Heading style={h1}>NBO firmada</Heading>
            <Text style={codenameStyle}>{codename}</Text>
          </Section>

          <Section style={body}>
            <Text style={text}>{intro[recipientRole ?? 'advisor'] ?? intro.advisor}</Text>

            {dateStr && (
              <Text style={meta}>
                <strong>Data da assinatura:</strong> {dateStr}
              </Text>
            )}
            {advisorName && (
              <Text style={meta}>
                <strong>Advisor responsável:</strong> {advisorName}
              </Text>
            )}

            <Section style={{ textAlign: 'center', margin: '32px 0' }}>
              <Button href={url} style={btn}>Ver par no mari</Button>
            </Section>

            <Text style={footer}>
              Próximas etapas: due diligence, definição final de termos e closing.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NboSignedEmail,
  subject: (data: Record<string, any>) => `NBO firmada · ${data?.codename ?? 'Projeto'}`,
  displayName: 'NBO assinada',
  previewData: {
    codename: 'MARI-TECH-0042',
    signedAt: new Date().toISOString(),
    advisorName: 'Pablo Souza',
    pairUrl: 'https://mari.vispe.com.br/equity-brain/par/exemplo',
    recipientRole: 'advisor',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#0A0A0A' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0' }
const header = { backgroundColor: '#D9F564', padding: '32px 28px', borderRadius: '8px 8px 0 0' }
const brand = { fontSize: '12px', fontWeight: 600, color: '#0A0A0A', margin: '0 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' as const }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0A0A0A', margin: '0 0 12px' }
const codenameStyle = { fontSize: '14px', color: '#2A2A2A', margin: '0', fontFamily: 'monospace' }
const body = { padding: '28px', backgroundColor: '#FAFAF7', borderRadius: '0 0 8px 8px' }
const text = { fontSize: '15px', color: '#2A2A2A', lineHeight: '1.6', margin: '0 0 20px' }
const meta = { fontSize: '14px', color: '#2A2A2A', margin: '8px 0' }
const btn = { backgroundColor: '#0A0A0A', color: '#D9F564', padding: '12px 28px', borderRadius: '6px', fontWeight: 600, fontSize: '14px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#666', margin: '24px 0 0', lineHeight: '1.5' }
