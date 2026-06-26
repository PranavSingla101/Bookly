/**
 * Table of contents for the embedded reader: extracts nav/spine data and
 * renders a flat, navigable list with optional page-list labels.
 */

const normalizeHrefKey = href => {
    if (href == null) return ''
    const s = String(href).trim()
    try {
        const [path, hash] = s.split('#')
        const decoded = decodeURI(path)
        return hash ? `${decoded}#${hash}` : decoded
    } catch {
        return s
    }
}

const pathTail = href => {
    const p = normalizeHrefKey(href).split('#')[0]
    const parts = p.split('/')
    return parts[parts.length - 1] ?? ''
}

const prettifyFilename = href => {
    const base = pathTail(href).replace(/\.[^.]+$/, '')
    if (!base) return ''
    return base
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Flatten EPUB nav / NCX tree into rows for the sidebar list.
 * @param {unknown[]} items
 * @param {number} depth
 * @returns {Array<{ label: string, href: string | null, depth: number, isHeader?: boolean }>}
 */
export function flattenNavToc(items, depth = 0) {
    const out = []
    for (const item of items ?? []) {
        const label = (item.label && String(item.label).trim()) || 'Untitled'
        if (item.href) {
            out.push({ label, href: item.href, depth })
        } else if (item.subitems?.length) {
            out.push({ label, href: null, depth, isHeader: true })
        }
        if (item.subitems?.length) {
            out.push(...flattenNavToc(item.subitems, depth + 1))
        }
    }
    return out
}

/**
 * @param {import('./epub.js').EPUB} book
 */
export function buildTocEntries(book) {
    const raw = book.toc
    if (Array.isArray(raw) && raw.length > 0) {
        const flat = flattenNavToc(raw)
        if (flat.some(e => e.href)) return flat
    }
    return spineFallbackEntries(book)
}

/**
 * @param {import('./epub.js').EPUB} book
 */
function spineFallbackEntries(book) {
    const sections = book.sections ?? []
    return sections
        .filter(s => s?.linear !== 'no')
        .map((s, i) => {
            const href = s.id
            const pretty = prettifyFilename(href)
            return {
                label: pretty || `Part ${i + 1}`,
                href,
                depth: 0,
            }
        })
}

/**
 * Map TOC href → printed page label from EPUB page-list nav.
 * @param {unknown[] | null | undefined} pageList
 * @returns {Map<string, string>}
 */
export function buildPageLabelLookup(pageList) {
    const map = new Map()
    const walk = items => {
        for (const item of items ?? []) {
            if (item?.href != null && item.label != null) {
                const label = String(item.label).trim()
                const key = normalizeHrefKey(item.href)
                map.set(key, label)
                const pathOnly = String(item.href).split('#')[0]
                if (pathOnly) map.set(normalizeHrefKey(pathOnly), label)
            }
            if (item?.subitems?.length) walk(item.subitems)
        }
    }
    walk(pageList)
    return map
}

function lookupPageLabel(href, lookup) {
    if (!href || !lookup.size) return ''
    const k = normalizeHrefKey(href)
    if (lookup.has(k)) return lookup.get(k)
    const path = k.split('#')[0]
    if (lookup.has(path)) return lookup.get(path)
    const tail = pathTail(href)
    for (const [key, label] of lookup) {
        if (pathTail(key) === tail && tail) return label
    }
    return ''
}

function findRowEl(rows, href) {
    if (!href) return null
    const h = normalizeHrefKey(href)
    const pathH = h.split('#')[0]
    for (const row of rows) {
        const rh = row.dataset.href
        if (!rh) continue
        const r = normalizeHrefKey(rh)
        if (r === h) return row
        if (r.split('#')[0] === pathH) return row
    }
    for (const row of rows) {
        const rh = row.dataset.href
        if (!rh) continue
        if (pathTail(rh) === pathTail(href)) return row
    }
    return null
}

/**
 * @param {Array<{ label: string, href: string | null, depth: number, isHeader?: boolean }>} entries
 * @param {Map<string, string>} pageLookup
 * @param {{ onNavigate: (href: string) => void }} handlers
 */
export function createTocListPanel(entries, pageLookup, { onNavigate }) {
    const root = document.createElement('div')
    root.className = 'toc-list'
    root.setAttribute('role', 'navigation')
    root.setAttribute('aria-label', 'Table of contents')

    /** @type {HTMLButtonElement[]} */
    const rows = []

    for (const entry of entries) {
        if (entry.isHeader) {
            const h = document.createElement('div')
            h.className = 'toc-section-heading'
            h.textContent = entry.label
            h.style.paddingLeft = `${10 + entry.depth * 14}px`
            root.append(h)
            continue
        }
        if (!entry.href) continue

        const row = document.createElement('button')
        row.type = 'button'
        row.className = 'toc-chapter-row'
        row.dataset.href = entry.href
        row.style.paddingLeft = `${10 + entry.depth * 14}px`

        const title = document.createElement('span')
        title.className = 'toc-chapter-row__title'
        title.textContent = entry.label

        const meta = document.createElement('span')
        meta.className = 'toc-chapter-row__meta'
        meta.textContent = lookupPageLabel(entry.href, pageLookup)

        row.append(title, meta)
        row.addEventListener('click', () => onNavigate(entry.href))
        root.append(row)
        rows.push(row)
    }

    if (!root.querySelector('.toc-chapter-row')) {
        const empty = document.createElement('p')
        empty.className = 'toc-empty'
        empty.textContent = 'No chapters found in this book.'
        root.append(empty)
    }

    return {
        element: root,
        /** @param {string | undefined | null} href */
        setActiveHref(href) {
            for (const r of rows) r.classList.remove('toc-chapter-row--active')
            const el = findRowEl(rows, href ?? '')
            if (el) {
                el.classList.add('toc-chapter-row--active')
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
        },
    }
}
