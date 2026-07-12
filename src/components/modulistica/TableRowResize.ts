import { Extension } from "@tiptap/core"
import { TableRow } from "@tiptap/extension-table"
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import type { EditorView } from "@tiptap/pm/view"

export const ROW_MIN_HEIGHT = 20

/**
 * TableRow doesn't declare a `height` attribute by default (prosemirror-tables
 * only ships column-width support out of the box). Extend it so row height
 * survives getJSON()/setContent() round-trips and renders as inline style.
 */
export const TableRowWithHeight = TableRow.extend({
  addAttributes() {
    return {
      height: {
        default: null,
        parseHTML: (element) => {
          const height = element.style.height || element.getAttribute("height")
          if (!height) return null
          const parsed = Number.parseInt(height, 10)
          return Number.isNaN(parsed) ? null : parsed
        },
        renderHTML: (attributes) => {
          const height = attributes.height as number | null
          if (!height) return {}
          return { style: `height: ${height}px` }
        },
      },
    }
  },
})

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableRowResizing: {
      /**
       * Sets the height (px) of the tableRow that contains `pos`. Pass
       * `null` to remove the override and fall back to automatic height.
       */
      setRowHeight: (pos: number, height: number | null) => ReturnType
    }
  }
}

interface RowResizeDragState {
  startY: number
  startHeight: number
}

interface RowResizePluginState {
  activeHandle: number
  dragging: RowResizeDragState | false
}

const rowResizingPluginKey = new PluginKey<RowResizePluginState>("tableRowResizing")

function pointsAtRow(doc: ProseMirrorNode, pos: number): boolean {
  if (pos < 0) return false
  const node = doc.nodeAt(pos)
  return !!node && node.type.name === "tableRow"
}

function domRowAround(target: EventTarget | null): HTMLTableRowElement | null {
  let node = target as HTMLElement | null
  while (node && node.nodeName !== "TR") {
    if (node.classList?.contains("ProseMirror")) return null
    node = node.parentElement
  }
  return node as HTMLTableRowElement | null
}

function currentRowHeight(view: EditorView, rowStart: number, rowNode: ProseMirrorNode): number {
  const height = rowNode.attrs.height as number | null
  if (height) return height
  const dom = view.nodeDOM(rowStart)
  if (dom instanceof HTMLElement) return dom.getBoundingClientRect().height
  return ROW_MIN_HEIGHT
}

function draggedHeight(dragging: RowResizeDragState, event: MouseEvent, minHeight: number): number {
  const offset = event.clientY - dragging.startY
  return Math.max(minHeight, Math.round(dragging.startHeight + offset))
}

function displayRowHeight(view: EditorView, rowStart: number, height: number) {
  const dom = view.nodeDOM(rowStart)
  if (dom instanceof HTMLElement) dom.style.height = `${height}px`
}

function updateHandle(view: EditorView, value: number) {
  view.dispatch(view.state.tr.setMeta(rowResizingPluginKey, { setHandle: value }))
}

function handleDecorations(state: EditorState, rowStart: number) {
  const rowNode = state.doc.nodeAt(rowStart)
  if (!rowNode || rowNode.type.name !== "tableRow") return DecorationSet.empty

  const decorations: Decoration[] = []
  let offset = rowStart + 1

  rowNode.forEach((cellNode) => {
    const endPos = offset + cellNode.nodeSize - 1
    const dom = document.createElement("div")
    dom.className = "row-resize-handle"
    decorations.push(Decoration.widget(endPos, dom))
    offset += cellNode.nodeSize
  })

  return DecorationSet.create(state.doc, decorations)
}

export interface TableRowResizingOptions {
  handleHeight: number
  cellMinHeight: number
}

export const TableRowResizing = Extension.create<TableRowResizingOptions>({
  name: "tableRowResizing",

  addOptions() {
    return {
      handleHeight: 6,
      cellMinHeight: ROW_MIN_HEIGHT,
    }
  },

  addCommands() {
    return {
      setRowHeight:
        (pos: number, height: number | null) =>
        ({ tr, dispatch }) => {
          const clamped = Math.min(Math.max(pos, 0), tr.doc.content.size)
          const $pos = tr.doc.resolve(clamped)

          let rowDepth = -1
          for (let d = $pos.depth; d >= 0; d -= 1) {
            if ($pos.node(d).type.name === "tableRow") {
              rowDepth = d
              break
            }
          }
          if (rowDepth === -1) return false

          const rowPos = $pos.before(rowDepth)
          const rowNode = $pos.node(rowDepth)

          if (dispatch) {
            tr.setNodeMarkup(rowPos, undefined, { ...rowNode.attrs, height })
          }

          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    const { handleHeight, cellMinHeight } = this.options

    return [
      new Plugin<RowResizePluginState>({
        key: rowResizingPluginKey,

        state: {
          init() {
            return { activeHandle: -1, dragging: false }
          },
          apply(tr, prev) {
            const action = tr.getMeta(rowResizingPluginKey) as
              { setHandle?: number; setDragging?: RowResizeDragState | null } | undefined

            if (action && typeof action.setHandle === "number") {
              return { activeHandle: action.setHandle, dragging: false }
            }
            if (action && action.setDragging !== undefined) {
              return { activeHandle: prev.activeHandle, dragging: action.setDragging ?? false }
            }
            if (prev.activeHandle > -1 && tr.docChanged) {
              const mapped = tr.mapping.map(prev.activeHandle, -1)
              return {
                activeHandle: pointsAtRow(tr.doc, mapped) ? mapped : -1,
                dragging: prev.dragging,
              }
            }
            return prev
          },
        },

        props: {
          attributes: (state): Record<string, string> => {
            const pluginState = rowResizingPluginKey.getState(state)
            return pluginState && pluginState.activeHandle > -1
              ? { class: "row-resize-cursor" }
              : {}
          },

          decorations: (state) => {
            const pluginState = rowResizingPluginKey.getState(state)
            if (pluginState && pluginState.activeHandle > -1) {
              return handleDecorations(state, pluginState.activeHandle)
            }
            return null
          },

          handleDOMEvents: {
            mousemove: (view, event) => {
              if (!view.editable) return false
              const pluginState = rowResizingPluginKey.getState(view.state)
              if (!pluginState || pluginState.dragging) return false

              const target = domRowAround(event.target)
              let rowStart = -1

              if (target) {
                const { bottom } = target.getBoundingClientRect()
                if (Math.abs(event.clientY - bottom) <= handleHeight) {
                  const pos = view.posAtDOM(target, 0)
                  const $pos = view.state.doc.resolve(pos)
                  for (let d = $pos.depth; d >= 0; d -= 1) {
                    if ($pos.node(d).type.name === "tableRow") {
                      rowStart = $pos.before(d)
                      break
                    }
                  }
                }
              }

              if (rowStart !== pluginState.activeHandle) {
                updateHandle(view, rowStart)
              }
              return false
            },

            mouseleave: (view) => {
              if (!view.editable) return false
              const pluginState = rowResizingPluginKey.getState(view.state)
              if (pluginState && pluginState.activeHandle > -1 && !pluginState.dragging) {
                updateHandle(view, -1)
              }
              return false
            },

            mousedown: (view, event) => {
              if (!view.editable) return false
              const pluginState = rowResizingPluginKey.getState(view.state)
              if (!pluginState || pluginState.activeHandle === -1 || pluginState.dragging)
                return false

              const rowStart = pluginState.activeHandle
              const rowNode = view.state.doc.nodeAt(rowStart)
              if (!rowNode) return false

              const win = view.dom.ownerDocument.defaultView ?? window
              const startHeight = currentRowHeight(view, rowStart, rowNode)

              view.dispatch(
                view.state.tr.setMeta(rowResizingPluginKey, {
                  setDragging: { startY: event.clientY, startHeight },
                }),
              )
              displayRowHeight(view, rowStart, startHeight)

              const finish = (finishEvent: MouseEvent) => {
                win.removeEventListener("mouseup", finish)
                win.removeEventListener("mousemove", move)

                const current = rowResizingPluginKey.getState(view.state)
                if (current?.dragging) {
                  const newHeight = draggedHeight(current.dragging, finishEvent, cellMinHeight)
                  view.dispatch(view.state.tr.setMeta(rowResizingPluginKey, { setDragging: null }))
                  editor.commands.setRowHeight(rowStart + 1, newHeight)
                }
              }

              const move = (moveEvent: MouseEvent) => {
                if (!moveEvent.buttons) {
                  finish(moveEvent)
                  return
                }
                const current = rowResizingPluginKey.getState(view.state)
                if (!current?.dragging) return
                displayRowHeight(
                  view,
                  rowStart,
                  draggedHeight(current.dragging, moveEvent, cellMinHeight),
                )
              }

              win.addEventListener("mouseup", finish)
              win.addEventListener("mousemove", move)
              event.preventDefault()
              return true
            },
          },
        },
      }),
    ]
  },
})
