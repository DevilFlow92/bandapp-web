interface JsonNode {
  type?: string
  attrs?: Record<string, unknown>
  content?: JsonNode[]
}

/**
 * Recursively walks a TipTap `contenuto_json` tree and collects the set of
 * entity prefixes referenced by mergefield nodes (e.g. attrs.chiave
 * "socio.nome" contributes "socio"). Node types (paragraph, heading,
 * bulletList, table, tableCell, ...) are not enumerated explicitly — any
 * node with a `content` array is walked into.
 */
export function extractEntitiesFromContent(contenutoJson: unknown): Set<string> {
  const entities = new Set<string>()

  function walk(node: unknown) {
    if (!node || typeof node !== "object") return
    const n = node as JsonNode

    if (n.type === "mergefield") {
      const chiave = n.attrs?.chiave
      if (typeof chiave === "string") {
        const prefix = chiave.split(".")[0]
        if (prefix) entities.add(prefix)
      }
    }

    if (Array.isArray(n.content)) {
      for (const child of n.content) walk(child)
    }
  }

  walk(contenutoJson)
  return entities
}
