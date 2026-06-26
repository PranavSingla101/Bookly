import { els } from './reader-elements.js'

/**
 * Needed to widen a collapsed CFI range to something that has a bounding rect.
 * A collapsed range returns a zero-height rect; uncollapsing it picks a
 * neighbouring character so getBoundingClientRect() returns a visible rect.
 */
function uncollapseRange(range) {
    if (!range?.collapsed) return range
    const { endOffset, endContainer } = range
    if (endContainer.nodeType === Node.ELEMENT_NODE) {
        const node = endContainer.childNodes[endOffset]
        if (node?.nodeType === Node.ELEMENT_NODE) return node
        return endContainer
    }
    if (endOffset + 1 < endContainer.length) range.setEnd(endContainer, endOffset + 1)
    else if (endOffset > 1) range.setStart(endContainer, endOffset - 1)
    else return endContainer.parentNode
    return range
}

/**
 * Owns bookmark strips (visual markers), deferred bookmark queues, and the
 * resume-scroll logic. Renders strips in continuous, scrolled, and paginated
 * modes using the container / renderer appropriate for each.
 */
export class BookmarkController {
    // ── Callbacks ─────────────────────────────────────────────────────────────
    #getView
    #isContinuousMode
    #getCsManager
    #postToParent
    #onBookmarkRemoved

    // ── State ─────────────────────────────────────────────────────────────────
    /** @type {Map<string, { element: HTMLElement, cfi: string, yOffset: number, container: Element, cleanupFn: Function|null }>} */
    #bookmarkStrips = new Map()
    /** @type {Array<{ ann: object, yOffset: number }>} */
    #deferredBookmarks = []
    /** @type {{ chapterIdx: number, yOffset: number }|null} */
    #pendingScrollChapter = null
    #pendingCreateCfi = null
    #deleteOnSave = false

    /**
     * @param {{
     *   getView: () => any,
     *   isContinuousMode: () => boolean,
     *   getCsManager: () => any,
     *   postToParent: (msg: object) => void,
     *   onBookmarkRemoved?: () => void,
     * }} opts
     */
    constructor({ getView, isContinuousMode, getCsManager, postToParent, onBookmarkRemoved }) {
        this.#getView = getView
        this.#isContinuousMode = isContinuousMode
        this.#getCsManager = getCsManager
        this.#postToParent = postToParent
        this.#onBookmarkRemoved = onBookmarkRemoved
    }

    get deferredBookmarks() { return this.#deferredBookmarks }
    set deferredBookmarks(val) { this.#deferredBookmarks = val }
    set pendingScrollChapter(val) { this.#pendingScrollChapter = val }

    /**
     * Try to render deferred bookmarks whose chapter wrappers are now available.
     * @param {number} [chapterIndex] — if provided, only flush entries for this chapter
     */
    flushDeferredBookmarks(chapterIndex) {
        if (!this.#deferredBookmarks.length) return
        const csManager = this.#getCsManager()
        if (!csManager) return
        const remaining = []
        for (const { ann, yOffset } of this.#deferredBookmarks) {
            const idx = this.resolveChapterIndexFromCfi(ann.cfi_range)
            if (chapterIndex != null && idx !== chapterIndex) {
                remaining.push({ ann, yOffset })
                continue
            }
            const wrapper = csManager.getChapterWrapper(idx)
            if (wrapper) {
                this.renderBookmarkStrip(ann.id, yOffset, ann.cfi_range, wrapper)
            } else {
                remaining.push({ ann, yOffset })
            }
        }
        this.#deferredBookmarks = remaining
    }

    get hasBookmark() { return this.#bookmarkStrips.size > 0 }

    getExistingBookmark() {
        const entry = this.#bookmarkStrips.entries().next().value
        if (!entry) return null
        const [id, record] = entry
        return { id, ...record }
    }

    setPendingCreateCfi(cfi) { this.#pendingCreateCfi = cfi }

    removeBookmark() {
        const existing = this.getExistingBookmark()
        if (existing) {
            existing.cleanupFn?.()
            existing.element.remove()
            this.#bookmarkStrips.delete(existing.id)
            if (!existing.id.startsWith('temp-')) {
                this.#postToParent({ type: 'bookly:annotation-delete', id: existing.id, cfiRange: existing.cfi })
            } else if (this.#pendingCreateCfi) {
                this.#deleteOnSave = true
            }
        }

        for (const { ann } of this.#deferredBookmarks) {
            if (ann.id && !String(ann.id).startsWith('temp-')) {
                this.#postToParent({ type: 'bookly:annotation-delete', id: ann.id, cfiRange: ann.cfi_range })
            } else if (this.#pendingCreateCfi) {
                this.#deleteOnSave = true
            }
        }
        this.#deferredBookmarks = []
        this.#pendingCreateCfi = null

        this.#onBookmarkRemoved?.()
        return existing ? { id: existing.id, cfi: existing.cfi } : null
    }

    // ── Chapter index resolution ───────────────────────────────────────────────

    resolveChapterIndexFromCfi(cfi) {
        if (!cfi) return -1
        const view = this.#getView()
        if (!view) return -1
        try {
            const resolved = view.resolveNavigation(cfi)
            return resolved?.index ?? -1
        } catch {
            return -1
        }
    }

    // ── Scroll resume ─────────────────────────────────────────────────────────

    /**
     * Scroll the CS container to the bookmark position when both the chapter
     * and the annotation list have been received (whichever arrives last).
     */
    applyPendingScroll(chapterIdx) {
        if (!this.#pendingScrollChapter || this.#pendingScrollChapter.chapterIdx !== chapterIdx) return
        const csOuter = els.csOuter
        const wrapper = this.#getCsManager()?.getChapterWrapper(chapterIdx)
        if (!csOuter || !wrapper) return
        const { yOffset } = this.#pendingScrollChapter
        this.#pendingScrollChapter = null
        const viewportCenter = csOuter.clientHeight / 2
        requestAnimationFrame(() => requestAnimationFrame(() => {
            csOuter.scrollTop = Math.max(0, wrapper.offsetTop + yOffset - viewportCenter)
        }))
    }

    // ── Position-specific CFI from viewport center ──────────────────────────────

    /**
     * Build a DOM Range at the viewport center inside the chapter iframe.
     * Returns null if the iframe or document is unavailable, or if no
     * text/element node can be resolved at the center point.
     */
    getRangeAtViewportCenter(chapterWrapper) {
        const csManager = this.#getCsManager()
        if (!csManager || !chapterWrapper) return null

        const index = Number(chapterWrapper.dataset?.chapterIndex)
        if (Number.isNaN(index)) return null

        const iframe = csManager.getChapterIframe(index)
        const doc = iframe?.contentDocument
        if (!doc) return null

        const csOuter = els.csOuter
        if (!csOuter) return null

        const localY = csOuter.scrollTop - chapterWrapper.offsetTop + csOuter.clientHeight / 2
        const localX = iframe.clientWidth / 2

        let range = null
        if (doc.caretRangeFromPoint) {
            range = doc.caretRangeFromPoint(localX, localY)
        } else if (doc.caretPositionFromPoint) {
            const pos = doc.caretPositionFromPoint(localX, localY)
            if (pos) {
                range = doc.createRange()
                range.setStart(pos.offsetNode, pos.offset)
                range.collapse(true)
            }
        }

        if (!range) {
            const el = doc.elementFromPoint(localX, localY)
            if (el) {
                range = doc.createRange()
                range.selectNodeContents(el)
                range.collapse(true)
            }
        }

        return range
    }

    // ── Initial y-offset calculation ───────────────────────────────────────────

    /**
     * Compute the content-relative y-offset for a new bookmark.
     * @param {Element|null} chapterWrapper CS chapter wrapper element or null
     */
    getInitialYOffset(chapterWrapper) {
        if (this.#isContinuousMode()) {
            const csOuter = els.csOuter
            if (!csOuter || !chapterWrapper) return 0
            const scrollTop = csOuter.scrollTop
            const chapterTop = chapterWrapper.offsetTop
            const viewportCenter = csOuter.clientHeight / 2
            return Math.max(0, scrollTop - chapterTop + viewportCenter)
        }
        const renderer = this.#getView()?.renderer
        if (this.#getFlowModeFromRenderer(renderer) === 'scroll' && renderer?.scrolled) {
            return Math.max(0, renderer.start + renderer.size / 2)
        }
        return 0
    }

    /** Derive flow mode from the renderer's current attributes (scrolled vs paginated). */
    #getFlowModeFromRenderer(renderer) {
        if (!renderer || renderer.tagName !== 'FOLIATE-PAGINATOR') return null
        return renderer.getAttribute('flow') === 'scrolled' ? 'scroll' : 'paginated'
    }

    // ── Strip lifecycle ────────────────────────────────────────────────────────

    /** Collect all strip data, remove their DOM elements, and clear the map. */
    collectBookmarkData() {
        const data = []
        for (const [id, { element, cfi, yOffset, cleanupFn }] of this.#bookmarkStrips) {
            cleanupFn?.()
            element.remove()
            data.push({ id, cfi, yOffset })
        }
        this.#bookmarkStrips.clear()
        return data
    }

    /**
     * Move all rendered strips to the target mode.
     * toContinuous=true  → remove fixed overlays, defer for CS chapter wrappers.
     * toContinuous=false → remove CS strips, re-render as fixed paginated overlays.
     */
    migrateBookmarkStrips(toContinuous) {
        const saved = this.collectBookmarkData()
        if (toContinuous) {
            this.#deferredBookmarks = saved.map(({ id, cfi, yOffset }) => ({
                ann: { id, cfi_range: cfi },
                yOffset,
            }))
        } else {
            this.#deferredBookmarks = []
            for (const { id, cfi, yOffset } of saved) {
                this.renderBookmarkStrip(id, yOffset, cfi, null)
            }
        }
    }

    repositionAllPaginatorStrips() {
        for (const [, record] of this.#bookmarkStrips) {
            if (record.container === els.foliatMount) {
                this.#positionPaginatorBookmarkStrip(record.element, record.cfi)
            }
        }
    }

    // ── Content column geometry ──────────────────────────────────────────────

    #getContentColumnRect() {
        const renderer = this.#getView()?.renderer
        if (!renderer || renderer.tagName !== 'FOLIATE-PAGINATOR') return null
        const content = renderer.getContents?.()?.[0]
        return content?.doc?.defaultView?.frameElement?.getBoundingClientRect?.() ?? null
    }

    #getContentRightOffset() {
        const iframeRect = this.#getContentColumnRect()
        const mountRect = els.foliatMount?.getBoundingClientRect()
        if (!iframeRect || !mountRect) return 0
        return Math.max(0, mountRect.right - iframeRect.right)
    }

    /**
     * Resolve a viewport clientY to a CFI via the paginator's content iframe.
     * Returns null if the position can't be resolved.
     */
    #resolveDropPositionToCfi(clientY) {
        const view = this.#getView()
        const renderer = view?.renderer
        if (!renderer || renderer.tagName !== 'FOLIATE-PAGINATOR') return null

        const content = renderer.getContents?.()?.[0]
        if (!content?.doc) return null

        const iframe = content.doc.defaultView?.frameElement
        if (!iframe) return null

        const iframeRect = iframe.getBoundingClientRect()
        const localY = clientY - iframeRect.top
        const localX = iframeRect.width / 2

        let range = null
        if (content.doc.caretRangeFromPoint) {
            range = content.doc.caretRangeFromPoint(localX, localY)
        } else if (content.doc.caretPositionFromPoint) {
            const pos = content.doc.caretPositionFromPoint(localX, localY)
            if (pos) {
                range = content.doc.createRange()
                range.setStart(pos.offsetNode, pos.offset)
                range.collapse(true)
            }
        }

        if (!range) {
            const el = content.doc.elementFromPoint(localX, localY)
            if (el) {
                range = content.doc.createRange()
                range.selectNodeContents(el)
                range.collapse(true)
            }
        }

        if (!range) return null

        try {
            return view.getCFI(content.index, range)
        } catch {
            return null
        }
    }

    // ── Viewport rect (paginated mode) ────────────────────────────────────────

    #getBookmarkViewportRect(cfi) {
        const view = this.#getView()
        const renderer = view?.renderer
        if (!renderer || renderer.tagName !== 'FOLIATE-PAGINATOR' || !cfi) return null

        let resolved
        try {
            resolved = view.resolveNavigation(cfi)
        } catch {
            return null
        }
        if (!resolved || typeof resolved.index !== 'number') return null

        const content = renderer.getContents?.()
            ?.find(item => item.index === resolved.index && item.doc)
        if (!content?.doc) return null

        let target
        try {
            target = typeof resolved.anchor === 'function'
                ? resolved.anchor(content.doc)
                : resolved.anchor
        } catch {
            return null
        }
        if (!target) {
            try {
                const body = content.doc.body ?? content.doc.documentElement
                const range = content.doc.createRange()
                range.setStart(body, 0)
                range.collapse(true)
                target = range
            } catch {
                return null
            }
        }
        target = uncollapseRange(target)

        const rects = Array.from(target?.getClientRects?.() ?? [])
            .filter(rect => rect.height > 0)
        const rect = rects[0] ?? target?.getBoundingClientRect?.()
        if (!rect || rect.height <= 0) return null

        const iframeRect = content.doc.defaultView?.frameElement?.getBoundingClientRect?.()
        if (!iframeRect) return null

        if (!renderer.isRectOnCurrentPage(rect)) return null

        return {
            top: iframeRect.top + rect.top,
            right: iframeRect.left + rect.right,
            bottom: iframeRect.top + rect.bottom,
            left: iframeRect.left + rect.left,
            height: rect.height,
        }
    }

    #positionPaginatorBookmarkStrip(strip, cfi) {
        const renderer = this.#getView()?.renderer
        const containerRect = renderer?.containerRect
        if (!containerRect) {
            strip.style.display = 'none'
            return
        }
        const rect = this.#getBookmarkViewportRect(cfi)
        const STRIP_H = 38

        if (!rect || rect.bottom < containerRect.top || rect.top > containerRect.bottom) {
            strip.style.display = 'none'
            return
        }

        const centerY = rect.top + rect.height / 2
        if (centerY < containerRect.top - STRIP_H / 2 || centerY > containerRect.bottom + STRIP_H / 2) {
            strip.style.display = 'none'
            return
        }

        strip.style.display = 'flex'
        strip.style.top = Math.max(containerRect.top, Math.min(containerRect.bottom - STRIP_H, centerY - STRIP_H / 2)) + 'px'
        strip.style.right = (window.innerWidth - containerRect.right) + 'px'
    }

    // ── Strip render ──────────────────────────────────────────────────────────

    /**
     * Create and append a bookmark strip.
     *
     * Three rendering modes:
     *   continuous — container = .cs-chapter div (position:relative, scrolls with text)
     *   scrolled   — container = null, paginator.scrolled = true: position:fixed tracked
     *   paginated  — container = null, paginator.scrolled = false: static fixed indicator
     *
     * @param {string} id bookmark id
     * @param {number} yOffset content-relative y position
     * @param {string} cfi CFI string
     * @param {Element|null} container CS chapter wrapper, or null for paginator modes
     */
    renderBookmarkStrip(id, yOffset, cfi, container) {
        if (this.#bookmarkStrips.has(id)) return

        const isContinuousMode = !!container
        const renderer = this.#getView()?.renderer
        const isPaginatorMode = !container && renderer?.tagName === 'FOLIATE-PAGINATOR'
        const mountEl = container ?? els.foliatMount
        if (!mountEl) return

        const strip = document.createElement('div')
        strip.dataset.bookmarkId = id
        strip.className = 'bookmark-strip'

        if (isContinuousMode) {
            strip.style.cssText = `
                position: absolute;
                right: 0;
                top: ${yOffset}px;
                width: 88px;
                height: 38px;
                background: #1B3A6B;
                border-radius: 6px 0 0 6px;
                cursor: grab;
                z-index: 200;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 3px 10px rgba(0,0,0,0.3);
                transition: transform 200ms ease, background 200ms ease;
            `
        } else {
            const rightOffset = this.#getContentRightOffset()
            strip.style.cssText = `
                position: fixed;
                right: ${rightOffset}px;
                top: 0;
                width: 88px;
                height: 38px;
                background: #1B3A6B;
                border-radius: 6px 0 0 6px;
                cursor: grab;
                z-index: 200;
                display: none;
                align-items: center;
                justify-content: center;
                box-shadow: 0 3px 10px rgba(0,0,0,0.3);
                transition: transform 200ms ease, background 200ms ease;
            `
        }

        strip.title = 'Bookmark'

        const iconsWrap = document.createElement('div')
        iconsWrap.style.cssText = `
            display: none;
            align-items: center;
            justify-content: center;
            gap: 12px;
            width: 100%;
            height: 100%;
        `

        const del = document.createElement('span')
        del.className = 'bookmark-delete-btn'
        del.innerHTML = `<svg width="16" height="16" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 3h8M4.5 3V2h3v1M3 3l.7 7h4.6l.7-7" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
        del.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            width: 26px;
            height: 26px;
            border-radius: 4px;
            transition: background 100ms;
        `
        del.title = 'Delete Bookmark'
        del.addEventListener('mouseenter', () => {
            del.style.background = 'rgba(239, 68, 68, 0.85)'
        })
        del.addEventListener('mouseleave', () => {
            del.style.background = 'transparent'
        })
        iconsWrap.appendChild(del)

        let grip = null
        if (isContinuousMode || isPaginatorMode) {
            grip = document.createElement('span')
            grip.className = 'bookmark-drag-grip'
            grip.innerHTML = `<svg width="14" height="16" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="4" cy="3" r="1.1" fill="#fff"/>
              <circle cx="4" cy="6" r="1.1" fill="#fff"/>
              <circle cx="4" cy="9" r="1.1" fill="#fff"/>
              <circle cx="8" cy="3" r="1.1" fill="#fff"/>
              <circle cx="8" cy="6" r="1.1" fill="#fff"/>
              <circle cx="8" cy="9" r="1.1" fill="#fff"/>
            </svg>`
            grip.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                width: 26px;
                height: 26px;
                cursor: grab;
            `
            grip.title = 'Drag to reposition'
            iconsWrap.appendChild(grip)
        }

        strip.appendChild(iconsWrap)

        strip.addEventListener('mouseenter', () => {
            strip.style.background = '#2a5298'
            strip.style.transform = 'translateX(-6px)'
            iconsWrap.style.display = 'flex'
        })
        strip.addEventListener('mouseleave', () => {
            strip.style.background = '#1B3A6B'
            strip.style.transform = 'translateX(0)'
            iconsWrap.style.display = 'none'
        })

        // Scroll-tracking for paginated / scrolled mode
        let cleanupFn = null
        let dragging = false
        if (isPaginatorMode && renderer) {
            const view = this.#getView()
            const updatePos = () => {
                if (dragging) return
                strip.style.display = 'none'
                requestAnimationFrame(() => {
                    if (!dragging) this.#positionPaginatorBookmarkStrip(strip, cfi)
                })
            }
            cleanupFn = () => {
                renderer.removeEventListener('scroll', updatePos)
                renderer.removeEventListener('load', updatePos)
                view?.removeEventListener('relocate', updatePos)
                window.removeEventListener('resize', updatePos)
            }
            renderer.addEventListener('scroll', updatePos)
            renderer.addEventListener('load', updatePos)
            view?.addEventListener('relocate', updatePos)
            window.addEventListener('resize', updatePos)
            updatePos()
        }

        del.addEventListener('click', (e) => {
            e.stopPropagation()
            const currentId = strip.dataset.bookmarkId
            const record = this.#bookmarkStrips.get(currentId)
            record?.cleanupFn?.()
            strip.remove()
            this.#bookmarkStrips.delete(currentId)
            this.#postToParent({ type: 'bookly:annotation-delete', id: currentId, cfiRange: cfi })
            this.#onBookmarkRemoved?.()
        })

        // Drag to reposition
        if (isContinuousMode || isPaginatorMode) {
            let dragStartY = 0
            let dragStartTop = 0

            strip.addEventListener('mousedown', (e) => {
                if (e.target.closest('.bookmark-delete-btn')) return

                e.preventDefault()
                dragging = true
                dragStartY = e.clientY
                dragStartTop = parseInt(strip.style.top, 10)
                strip.style.cursor = 'grabbing'
                if (grip) grip.style.cursor = 'grabbing'

                const contentRect = isPaginatorMode ? this.#getContentColumnRect() : null

                const onMove = (ev) => {
                    const dy = ev.clientY - dragStartY
                    if (isPaginatorMode && contentRect) {
                        const minTop = contentRect.top
                        const maxTop = contentRect.bottom - 38
                        strip.style.top = Math.max(minTop, Math.min(maxTop, dragStartTop + dy)) + 'px'
                    } else {
                        strip.style.top = Math.max(0, dragStartTop + dy) + 'px'
                    }
                }
                const onUp = (ev) => {
                    dragging = false
                    document.removeEventListener('mousemove', onMove)
                    document.removeEventListener('mouseup', onUp)
                    strip.style.cursor = 'grab'
                    if (grip) grip.style.cursor = 'grab'
                    const currentId = strip.dataset.bookmarkId
                    const record = this.#bookmarkStrips.get(currentId)

                    if (isPaginatorMode) {
                        const dropY = ev.clientY
                        const newCfi = this.#resolveDropPositionToCfi(dropY)
                        if (newCfi && record) {
                            record.cfi = newCfi
                            record.yOffset = 0
                            this.#positionPaginatorBookmarkStrip(strip, newCfi)
                            if (!currentId.startsWith('temp-')) {
                                this.#postToParent({
                                    type: 'bookly:bookmark-update',
                                    id: currentId,
                                    cfiRange: newCfi,
                                    payload: { label: 'Bookmark', yOffset: 0 },
                                })
                            }
                        } else {
                            this.#positionPaginatorBookmarkStrip(strip, record?.cfi ?? cfi)
                        }
                    } else {
                        const finalTop = parseInt(strip.style.top, 10)
                        if (record) record.yOffset = finalTop
                        if (!currentId.startsWith('temp-')) {
                            this.#postToParent({
                                type: 'bookly:bookmark-update',
                                id: currentId,
                                payload: { label: 'Bookmark', yOffset: finalTop },
                            })
                        }
                    }
                }
                document.addEventListener('mousemove', onMove)
                document.addEventListener('mouseup', onUp)
            })
        }

        mountEl.appendChild(strip)
        this.#bookmarkStrips.set(id, { element: strip, cfi, yOffset, container: mountEl, cleanupFn })
    }

    /** Swap the temp bookmark id for the server-assigned id. */
    swapBookmarkId(tempId, serverAnnotation) {
        if (this.#deleteOnSave) {
            this.#deleteOnSave = false
            this.#pendingCreateCfi = null
            this.#postToParent({ type: 'bookly:annotation-delete', id: serverAnnotation.id, cfiRange: serverAnnotation.cfi_range })
            return
        }
        this.#pendingCreateCfi = null
        for (const [storedId, record] of this.#bookmarkStrips) {
            if (storedId.startsWith('temp-') && record.cfi === serverAnnotation.cfi_range) {
                record.element.dataset.bookmarkId = serverAnnotation.id
                this.#bookmarkStrips.delete(storedId)
                this.#bookmarkStrips.set(serverAnnotation.id, record)
                break
            }
        }
    }
}
