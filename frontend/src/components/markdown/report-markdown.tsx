import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ReportMarkdownProps {
  markdown: string
}

export function ReportMarkdown({ markdown }: ReportMarkdownProps) {
  return (
    <div className="prose-report">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  )
}
