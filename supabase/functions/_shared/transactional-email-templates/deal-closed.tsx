import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'mari · Vispe'
const APP_URL = 'https://mari.vispe.com.br'

interface DealClosedProps {
  codename?: string
  closedAt?: string
  advisorName?: string
  pairUrl?: string
  recipientRole?: 'seller' | 'buyer' | 'advisor' | 'admin'
  dealValueLabel?: string
}

const DealClosedEmail = ({
  codename = 'Projeto',
  closedAt,
  advisorName,
  pairUrl,
  recipientRole,
  dealValueLabel,
}: DealClosedProps) => {
  const dateStr = closedAt
    ? new Date(closedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : ''
  const url = pairUrl || APP_URL

  const intro: Record<string, string> = {
    seller: 'Parabéns! A venda do seu negócio foi oficializada hoje.',
    buyer: 'Parabéns! A aquisição foi oficializada hoje.',
    advisor: 'Deal fechado. Excelente trabalho conduzindo o processo.',
    admin: 'Deal oficialmente fechado na plataforma.',
  }

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>Deal fechado · {codename}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{SITE_NAME}</Text>
            <Heading style={h1}>Deal fechado</Heading>
            <Text style={codenameStyle}>{codename}</Text>
          </Section>

          <Section style={body}>
            <Text style={text}>{intro[recipientRole ?? 'advisor'] ?? intro.advisor}</Text>

            <Section style={summary}>
              {dateStr && (
                <Text style={meta}>
                  <strong>Data do closing:</strong> {dateStr}
                </Text>
              )}
              {dealValueLabel && (
                <Text style={meta}>
                  <strong>Valor da operação:</strong> {dealValueLabel}
                </Text>
              )}
              {advisorName && (
                <Text style={meta}>
                  <strong>Advisor responsável:</strong> {advisorName}
                </Text>
              )}
            </Section>

            <Section style={{ textAlign: 'center', margin: '32px 0' }}>
              <Button href={url} style={btn}>Abrir par no mari</Button>
            </Section>

            <Text style={footer}>
              Próximos passos pós-closing: integração, transferência de obrigações e relatórios finais.
              Em caso de dúvidas, responda este e-mail para falar com o advisor responsável.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DealClosedEmail,
  subject: (data: Record<string, any>) => `Deal fechado · ${data?.codename ?? 'Projeto'}`,
  displayName: 'Deal fechado',
  previewData: {
    codename: 'MARI-TECH-0042',
    closedAt: new Date().toISOString(),
    advisorName: 'Pablo Souza',
    pairUrl: 'https://mari.vispe.com.br/equity-brain/par/exemplo',
    recipientRole: 'seller',
    dealValueLabel: 'R$ 12,5 mi',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', color: '#0A0A0A' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0' }
const header = { backgroundColor: '#0A0A0A', padding: '32px 28px', borderRadius: '8px 8px 0 0' }
const brand = { fontSize: '12px', fontWeight: 600, color: '#D9F564', margin: '0 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' as const }
const h1 = { fontSize: '26px', fontWeight: 700, color: '#D9F564', margin: '0 0 12px' }
const codenameStyle = { fontSize: '14px', color: '#FAFAF7', margin: '0', fontFamily: 'monospace' }
const body = { padding: '28px', backgroundColor: '#FAFAF7', borderRadius: '0 0 8px 8px' }
const text = { fontSize: '15px', color: '#2A2A2A', lineHeight: '1.6', margin: '0 0 20px' }
const summary = { backgroundColor: '#fff', border: '1px solid #e5e5e0', borderRadius: '6px', padding: '16px 18px', margin: '16px 0' }
const meta = { fontSize: '14px', color: '#2A2A2A', margin: '6px 0' }
const btn = { backgroundColor: '#D9F564', color: '#0A0A0A', padding: '12px 28px', borderRadius: '6px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#666', margin: '24px 0 0', lineHeight: '1.5' }
