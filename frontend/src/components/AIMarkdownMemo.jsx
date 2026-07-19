import React from 'react'
import ReactMarkdown from 'react-markdown'
import clsx from 'clsx'

export default function AIMarkdownMemo({ content, className = '' }) {
  if (!content) return null

  return (
    <div className={clsx('ai-markdown-memo space-y-2 text-sm text-brand-800', className)}>
      <ReactMarkdown
        components={{
          h3: ({ node, ...props }) => (
            <h3
              className="text-base font-bold text-brand-900 border-b border-brand-200 pb-2 mb-3 mt-1"
              {...props}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4
              className="text-sm font-semibold text-brand-900 mt-4 mb-2 flex items-center gap-1.5"
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p className="text-sm text-brand-800 leading-relaxed my-1.5" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul
              className="list-disc pl-5 space-y-1.5 my-2 text-sm text-brand-700 marker:text-brand-600"
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="list-decimal pl-5 space-y-1.5 my-2 text-sm text-brand-700 marker:text-brand-600"
              {...props}
            />
          ),
          li: ({ node, ...props }) => <li className="leading-relaxed pl-0.5" {...props} />,
          hr: () => <hr className="my-3 border-brand-200" />,
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-brand-800 pl-3 py-1.5 bg-brand-50/80 text-brand-800 italic rounded-r text-sm my-2"
              {...props}
            />
          ),
          code: ({ node, inline, ...props }) => (
            <code
              className="bg-brand-100/90 text-brand-900 font-mono text-xs px-1.5 py-0.5 rounded border border-brand-200/60"
              {...props}
            />
          ),
          strong: ({ node, children, ...props }) => {
            const text = String(children || '')
            if (
              text.includes('RECOMMEND APPROVAL') ||
              text.includes('VERDICT: APPROVED') ||
              text.includes('LOW RISK')
            ) {
              return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-800 border border-green-200 mx-1">
                  {children}
                </span>
              )
            }
            if (
              text.includes('CONDITIONAL APPROVAL') ||
              text.includes('MODERATE') ||
              text.includes('SPLIT-INSTALLMENT')
            ) {
              return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 mx-1">
                  {children}
                </span>
              )
            }
            if (
              text.includes('RECOMMEND REFUSAL') ||
              text.includes('CRITICAL') ||
              text.includes('HIGH RISK') ||
              text.includes('MANDATORY ROTATION')
            ) {
              return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-800 border border-red-200 mx-1">
                  {children}
                </span>
              )
            }
            return <strong className="font-semibold text-brand-900" {...props}>{children}</strong>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
