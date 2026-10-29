import { Box, Typography } from '@mui/material'

const INLINE_BOLD_RE = /\*\*(.+?)\*\*/g

const renderInline = (text) => {
  const parts = []
  let lastIndex = 0
  let match

  INLINE_BOLD_RE.lastIndex = 0

  while ((match = INLINE_BOLD_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    parts.push(
      <Box component="strong" key={`${match.index}-${match[1]}`} sx={{ fontWeight: 700 }}>
        {match[1]}
      </Box>
    )

    lastIndex = INLINE_BOLD_RE.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length ? parts : [text]
}

const isHeadingLine = (line) => /^\*\*.+\*\*:?$/.test(line.trim())

const stripDecorators = (line) => line.trim().replace(/^\*\*/, '').replace(/\*\*:?$/, '').trim()

export default function MarkdownMessage({ text }) {
  const lines = String(text ?? '').split(/\r?\n/)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {lines.map((line, index) => {
        const trimmed = line.trim()

        if (!trimmed) {
          return <Box key={`spacer-${index}`} sx={{ height: 4 }} />
        }

        const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
        if (orderedMatch) {
          return (
            <Typography
              key={`ordered-${index}`}
              component="div"
              sx={{ fontSize: '.875rem', lineHeight: 1.55, pl: 1.25 }}
            >
              {orderedMatch[1]}. {renderInline(orderedMatch[2])}
            </Typography>
          )
        }

        const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/)
        if (bulletMatch) {
          return (
            <Typography
              key={`bullet-${index}`}
              component="div"
              sx={{ fontSize: '.875rem', lineHeight: 1.55, pl: 1.25 }}
            >
              • {renderInline(bulletMatch[1])}
            </Typography>
          )
        }

        if (isHeadingLine(trimmed)) {
          return (
            <Typography
              key={`heading-${index}`}
              component="div"
              sx={{ fontSize: '.875rem', lineHeight: 1.55, fontWeight: 700 }}
            >
              {renderInline(stripDecorators(trimmed))}
            </Typography>
          )
        }

        return (
          <Typography key={`line-${index}`} component="div" sx={{ fontSize: '.875rem', lineHeight: 1.55 }}>
            {renderInline(trimmed)}
          </Typography>
        )
      })}
    </Box>
  )
}