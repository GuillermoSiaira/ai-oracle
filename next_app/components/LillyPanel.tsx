'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DialogueBubble from './DialogueBubble'

function fixEncoding(raw?: string) {
  if (!raw) return ''
  // Replace literal escape sequences (e.g. "\\n") with real newlines
  let s = raw.replace(/\\r\\n/g, '\r\n').replace(/\\n/g, '\n')
  try {
    // Try to repair common mojibake where UTF-8 bytes were interpreted as Latin1
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    s = decodeURIComponent(escape(s))
  } catch (e) {
    // If that fails, leave the string as-is
  }
  return s
}

export default function LillyPanel({ interpretation }: { interpretation: any }) {
  if (!interpretation) return null

  // Safe extraction with fallbacks
  const headline = fixEncoding(interpretation.headline) || 'Sin título'
  const narrative = fixEncoding(interpretation.narrative) || ''
  const actions: string[] = (interpretation.actions || []).map((a: string) => fixEncoding(a))
  const abuLine = fixEncoding(interpretation.abu_line) || ''
  const lillyLine = fixEncoding(interpretation.lilly_line) || ''
  const reasoning = fixEncoding(interpretation.reasoning) || ''

  return (
    <section className="bg-white/5 p-4 rounded-lg shadow-md max-w-2xl overflow-hidden">
      {/* Dialogue */}
      {(abuLine || lillyLine) && (
        <div className="mb-3 space-y-2">
          {abuLine && <DialogueBubble speaker="abu" text={abuLine} />}
          {lillyLine && <DialogueBubble speaker="lilly" text={lillyLine} />}
        </div>
      )}

      <h3 className="text-xl font-semibold text-yellow-200 break-words">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{headline}</ReactMarkdown>
      </h3>

      <div className="mt-2 text-sm text-gray-200 prose prose-invert max-w-full break-words">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{narrative}</ReactMarkdown>
      </div>

      {actions.length > 0 && (
        <ul className="mt-3 list-disc list-inside space-y-1">
          {actions.map((a: string, i: number) => (
            <li key={i} className="text-sm text-gray-100 break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{a}</ReactMarkdown>
            </li>
          ))}
        </ul>
      )}

      {/* Reasoning (collapsible) */}
      {reasoning && reasoning !== 'No explicit reasoning provided.' && (
        <details className="mt-3 rounded bg-white/5 border border-white/10 p-3">
          <summary className="cursor-pointer text-sm text-white/80">Ver razonamiento</summary>
          <div className="mt-2 text-xs text-white/80 whitespace-pre-wrap break-words">{reasoning}</div>
        </details>
      )}

      {/* Debug metadata (hidden, logged to console) */}
      {typeof window !== 'undefined' && interpretation.astro_metadata && (
        <script dangerouslySetInnerHTML={{ __html: `console.log('[Lilly Metadata]', ${JSON.stringify(interpretation.astro_metadata)})` }} />
      )}
    </section>
  )
}
