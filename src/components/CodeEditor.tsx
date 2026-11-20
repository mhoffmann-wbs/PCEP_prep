import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { python } from '@codemirror/lang-python'
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { EditorView, drawSelection, highlightActiveLine, keymap, lineNumbers, placeholder as placeholderExt } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import { useEffect, useRef } from 'react'

// Colours are fixed, like every other code surface on bg-code: the slate scale
// inverts in dark mode, but the code background stays dark in both themes.
const theme = EditorView.theme(
  {
    '&': { backgroundColor: 'var(--color-code)', color: '#e6edf3', fontSize: '0.875rem', borderRadius: '0.5rem' },
    '&.cm-focused': { outline: '2px solid var(--color-brand)' },
    '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', lineHeight: '1.6' },
    '.cm-content': { padding: '0.75rem 0', caretColor: '#f7f8fa' },
    '.cm-gutters': { backgroundColor: 'transparent', color: '#64748b', border: 'none' },
    '.cm-activeLine': { backgroundColor: '#ffffff0d' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#cbd5e1' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: '#3f7cb066 !important' },
    '.cm-cursor': { borderLeftColor: '#f7f8fa' },
    '.cm-matchingBracket': { backgroundColor: '#f2c23040', outline: 'none' },
    '.cm-placeholder': { color: '#64748b' },
  },
  { dark: true },
)

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword, t.operatorKeyword], color: '#ff7b72' },
  { tag: [t.string, t.special(t.string)], color: '#a5d6ff' },
  { tag: [t.number, t.bool, t.null], color: '#79c0ff' },
  { tag: t.comment, color: '#8b949e', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.definition(t.variableName))], color: '#d2a8ff' },
  { tag: t.definition(t.className), color: '#ffa657' },
])

interface Props {
  value: string
  onChange: (value: string) => void
  /** Ctrl/Cmd+Enter. */
  onRun?: () => void
  label: string
  minLines?: number
  placeholder?: string
}

/**
 * A CodeMirror 6 Python editor. Uncontrolled after mount: `value` seeds it, and
 * a new `value` from outside (e.g. "Reset to starter") replaces the document.
 */
export function CodeEditor({ value, onChange, onRun, label, minLines = 10, placeholder }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  // The latest callbacks, read by the editor's long-lived extensions.
  const handlers = useRef({ onChange, onRun })
  handlers.current = { onChange, onRun }

  useEffect(() => {
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        indentOnInput(),
        indentUnit.of('    '),
        EditorState.tabSize.of(4),
        bracketMatching(),
        closeBrackets(),
        python(),
        syntaxHighlighting(highlight),
        theme,
        EditorView.contentAttributes.of({ 'aria-label': label, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off' }),
        EditorView.theme({ '.cm-content, .cm-gutter': { minHeight: `${minLines * 1.6}em` } }),
        ...(placeholder ? [placeholderExt(placeholder)] : []),
        keymap.of([
          { key: 'Mod-Enter', run: () => (handlers.current.onRun?.(), true) },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) handlers.current.onChange(u.state.doc.toString())
        }),
      ],
    })
    view.current = new EditorView({ state, parent: host.current! })
    return () => {
      view.current?.destroy()
      view.current = null
    }
    // The editor is created once; later `value` changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const v = view.current
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
  }, [value])

  return <div ref={host} className="overflow-hidden rounded-lg border border-slate-300" />
}
