import { transformerMetaHighlight } from '@shikijs/transformers'
import { createCssVariablesTheme } from 'shiki'

const cssVariablesTheme = createCssVariablesTheme({
  name: 'css-variables',
  variablePrefix: '--shiki-',
  variableDefaults: {},
  fontStyle: true,
})

export const shikiConfig = {
  theme: cssVariablesTheme,
  transformers: [transformerMetaHighlight()],
}
