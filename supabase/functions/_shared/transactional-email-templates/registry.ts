/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as nboSigned } from './nbo-signed.tsx'
import { template as dealClosed } from './deal-closed.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'nbo-signed': nboSigned,
  'deal-closed': dealClosed,
}
