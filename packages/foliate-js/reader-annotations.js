import { els } from './reader-elements.js'
import { Overlayer } from './overlayer.js'

export const HIGHLIGHT_COLORS = {
    yellow: '#ffeb3b',
    blue: '#2196f3',
    green: '#4caf50',
    pink: '#e91e63',
}

/**
 * Owns highlights, text-selection popup, note dialog, highlights panel, and all
 * CS-mode annotation rendering. Interacts with the rest of the reader only via
 * the callback interface provided at construction time.
 */
export class AnnotationController {
    // ── Callbacks ─────────────────────────────────────────────────────────────
    #getView
    #isContinuousMode
    #getCsOverlayer       // (index) → { overlayer, doc, ro, imageCleanups } | undefined
    #getCsOverlayerIndices // () → Iterable<number>
    #postToParent
    #onLoadBookmark       // (ann, yOffset, isFirst) → void
    #onBookmarkSaved      // (annotation) → void

    // ── State ─────────────────────────────────────────────────────────────────
    /** @type {Map<string, object>} cfiRange → server annotation */
    #serverAnnotations = new Map()
    /** @type {Map<string, object>} cfiRange → annotation (includes temp entries) */
    #annotationsByValue = new Map()
    /** @type {HTMLElement|null} */
    #selectionPopup = null
    /** @type {Map<Document, number>} doc → spine index */
    #docToIndex = new Map()
    /** @type {Map<number, number>} chapter index → timer id */
    #csHighlightRerenderTimers = new Map()
    /** @type {Map<number, number>} chapter index → retry count */
    #csHighlightRetryCounts = new Map()
    #getCalibreAnnotations
    #annotationMessageListenerReady = false
    #annotationViewListenersReady = false

    /**
     * @param {{
     *   getView: () => any,
     *   isContinuousMode: () => boolean,
     *   getCsOverlayer: (index: number) => any,
     *   getCsOverlayerIndices: () => Iterable<number>,
     *   postToParent: (msg: object) => void,
     *   onLoadBookmark: (ann: object, yOffset: number, isFirst: boolean) => void,
     *   onBookmarkSaved: (annotation: object) => void,
     *   getCalibreAnnotations?: (index: number) => any[] | undefined,
     * }} opts
     */
    constructor({ getView, isContinuousMode, getCsOverlayer, getCsOverlayerIndices, postToParent, onLoadBookmark, onBookmarkSaved, getCalibreAnnotations }) {
        this.#getView = getView
        this.#isContinuousMode = isContinuousMode
        this.#getCsOverlayer = getCsOverlayer
        this.#getCsOverlayerIndices = getCsOverlayerIndices
        this.#postToParent = postToParent
        this.#onLoadBookmark = onLoadBookmark
        this.#onBookmarkSaved = onBookmarkSaved
        this.#getCalibreAnnotations = getCalibreAnnotations ?? (() => undefined)
    }

    get annotationsByValue() { return this.#annotationsByValue }

    getAnnotationByValue(value) { return this.#annotationsByValue.get(value) }

    // ── Inbound message listener ───────────────────────────────────────────────

    initAnnotationListener() {
        if (this.#annotationMessageListenerReady) return
        this.#annotationMessageListenerReady = true
        window.addEventListener('message', e => {
            if (e.data?.type === 'bookly:load-annotations') {
                const list = e.data.annotations ?? []
                let firstBookmarkSeen = false
                const staleBookmarkIds = []
                for (const ann of list) {
                    if (ann.annotation_type === 'bookmark') {
                        if (firstBookmarkSeen) {
                            if (ann.id) staleBookmarkIds.push({ id: ann.id, cfiRange: ann.cfi_range })
                            continue
                        }
                        firstBookmarkSeen = true
                        const yOffset = ann.payload?.yOffset ?? 0
                        this.#onLoadBookmark?.(ann, yOffset, true)
                    } else {
                        this.registerAndRenderAnnotation(ann)
                    }
                }
                for (const { id, cfiRange } of staleBookmarkIds) {
                    this.#postToParent({ type: 'bookly:annotation-delete', id, cfiRange })
                }
                if (this.#isContinuousMode()) this.scheduleAllCsHighlightRerenders(25)
            }
            if (e.data?.type === 'bookly:bookmark-saved') {
                this.#onBookmarkSaved?.(e.data.annotation)
            }
            if (e.data?.type === 'bookly:remove-annotation') {
                const { cfiRange } = e.data
                if (cfiRange) {
                    this.#serverAnnotations.delete(cfiRange)
                    this.#annotationsByValue.delete(cfiRange)
                    if (this.#isContinuousMode()) {
                        this.csRemoveAnnotation(cfiRange)
                    } else {
                        this.#getView()?.deleteAnnotation({ value: cfiRange })
                    }
                    this.removeHighlightFromPanel(cfiRange)
                }
            }
            if (e.data?.type === 'bookly:annotation-saved') {
                const { cfiRange, annotation } = e.data
                if (annotation && annotation.annotation_type !== 'bookmark') {
                    const color = annotation.payload?.color ?? 'yellow'
                    const annotationObj = { ...annotation, value: cfiRange, color }
                    this.#serverAnnotations.set(cfiRange, annotationObj)
                    this.#annotationsByValue.set(cfiRange, annotationObj)
                    this.addHighlightToPanel(annotationObj)
                    if (this.#isContinuousMode()) this.csRenderAnnotation(cfiRange, color)
                }
            }
        })
    }

    // ── View annotation event listeners ───────────────────────────────────────

    initAnnotationViewListeners() {
        if (this.#annotationViewListenersReady) return
        const view = this.#getView()
        if (!view) return
        this.#annotationViewListenersReady = true

        view.addEventListener('create-overlay', e => {
            const { index } = e.detail
            // Calibre embedded bookmarks keyed by spine index
            const calibreList = this.#getCalibreAnnotations(index)
            if (calibreList) for (const annotation of calibreList) view.addAnnotation(annotation)

            // Server highlights for this section in paginated / scrolled modes
            for (const [cfiRange, ann] of this.#serverAnnotations) {
                try {
                    const resolved = view.resolveNavigation(cfiRange)
                    if (resolved && resolved.index === index) {
                        const color = ann.color ?? ann.payload?.color ?? 'yellow'
                        view.addAnnotation({ value: cfiRange, color })
                    }
                } catch { }
            }
        })

        view.addEventListener('draw-annotation', e => {
            const { draw, annotation } = e.detail
            const color = annotation.color ?? 'yellow'
            const cssColor = HIGHLIGHT_COLORS[color] ?? HIGHLIGHT_COLORS.yellow
            draw(Overlayer.highlight, { color: cssColor })
        })

        view.addEventListener('show-annotation', e => {
            const { value } = e.detail
            const annotation = this.#annotationsByValue.get(value)
            if (!annotation) return
            try {
                const { index, anchor } = view.resolveNavigation(value)
                const contents = view.renderer?.getContents?.() ?? []
                const content = contents.find(c => c.index === index)
                if (content?.doc && typeof anchor === 'function') {
                    const range = anchor(content.doc)
                    if (range) {
                        this.showAnnotationInSelectionPopup(annotation, { range, doc: content.doc })
                        return
                    }
                }
            } catch { }
            this.showAnnotationInSelectionPopup(annotation)
        })
    }

    // ── Annotation registration ────────────────────────────────────────────────

    /**
     * Store + render one server annotation object.
     * ann shape: { id, cfi_range, annotation_type, payload: { color, note } }
     */
    registerAndRenderAnnotation(ann) {
        const value = ann.cfi_range
        if (!value) return
        const existing = this.#serverAnnotations.get(value)
        if (existing && existing.id) return
        const color = ann.payload?.color ?? 'yellow'
        const annotationObj = { ...ann, value, color }
        this.#serverAnnotations.set(value, annotationObj)
        this.#annotationsByValue.set(value, annotationObj)
        if (this.#isContinuousMode()) {
            this.csRenderAnnotation(value, color)
        } else {
            this.#getView()?.addAnnotation({ value, color })
        }
    }

    // ── Selection handler ──────────────────────────────────────────────────────

    /**
     * Attach a selectionchange listener to an iframe document.
     * @param {Document} doc
     * @param {number} index spine index
     */
    attachSelectionHandlerToDoc(doc, index) {
        this.#docToIndex.set(doc, index)
        doc.addEventListener('selectionchange', () => {
            this.#handleSelectionChange(doc)
        })
        doc.addEventListener('click', () => {
            const sel = doc.defaultView?.getSelection()
            if (!sel || sel.isCollapsed) {
                this.hideSelectionPopup()
            }
        })
    }

    #handleSelectionChange(doc) {
        const sel = doc.defaultView?.getSelection()
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
            window.setTimeout(() => {
                const s = doc.defaultView?.getSelection()
                if (!s || s.isCollapsed) this.hideSelectionPopup()
            }, 120)
            return
        }
        const range = sel.getRangeAt(0)
        if (!range.toString().trim()) {
            this.hideSelectionPopup()
            return
        }
        this.#showSelectionPopup(range, doc)
    }

    // ── Selection popup ────────────────────────────────────────────────────────

    /** Position and show the selection action popup. */
    #showSelectionPopup(range, doc) {
        if (!this.#selectionPopup) {
            this.#selectionPopup = this.#createSelectionPopup()
        }
        const iframe = doc.defaultView?.frameElement
        const iframeRect = iframe ? iframe.getBoundingClientRect() : { top: 0, left: 0, width: 0 }
        const rangeRect = range.getBoundingClientRect()

        const popupWidth = 180
        const rawLeft = iframeRect.left + rangeRect.left + rangeRect.width / 2 - popupWidth / 2
        const clampedLeft = Math.max(8, Math.min(rawLeft, window.innerWidth - popupWidth - 8))
        const rawTop = iframeRect.top + rangeRect.top - 48
        const top = rawTop < 8 ? iframeRect.top + rangeRect.bottom + 8 : rawTop

        this.#selectionPopup.style.left = `${clampedLeft}px`
        this.#selectionPopup.style.top = `${top}px`
        this.#selectionPopup.style.display = 'flex'
        this.#selectionPopup._range = range
        this.#selectionPopup._doc = doc
    }

    hideSelectionPopup() {
        if (this.#selectionPopup) {
            this.#selectionPopup.style.display = 'none'
            this.#selectionPopup._range = null
            this.#selectionPopup._doc = null
            this.#selectionPopup._annotation = null
            this.#selectionPopup.querySelectorAll('.selection-popup__color')
                .forEach(b => b.classList.remove('selection-popup__color--active'))
            const delBtn = this.#selectionPopup.querySelector('.selection-popup__delete')
            if (delBtn) delBtn.style.display = 'none'
            this.#selectionPopup.querySelectorAll('.selection-popup__action-el')
                .forEach(el => el.style.display = '')
        }
    }

    /**
     * Show the selection popup in "edit mode" for an existing highlight.
     * @param {object} annotation
     * @param {{ range?: Range, doc?: Document, clientX?: number, clientY?: number }} [pos]
     */
    showAnnotationInSelectionPopup(annotation, pos = {}) {
        if (!this.#selectionPopup) {
            this.#selectionPopup = this.#createSelectionPopup()
        }
        const popup = this.#selectionPopup
        popup._annotation = annotation
        popup._range = null
        popup._doc = null

        const currentColor = annotation.color ?? annotation.payload?.color ?? 'yellow'
        popup.querySelectorAll('.selection-popup__color').forEach(btn => {
            btn.classList.toggle('selection-popup__color--active', btn.dataset.color === currentColor)
        })

        const delBtn = popup.querySelector('.selection-popup__delete')
        if (delBtn) delBtn.style.display = 'flex'
        popup.querySelectorAll('.selection-popup__action-el').forEach(el => {
            el.style.display = 'none'
        })

        const popupWidth = 200
        let left, top

        if (pos.range && pos.doc) {
            const iframe = pos.doc.defaultView?.frameElement
            const iframeRect = iframe ? iframe.getBoundingClientRect() : { top: 0, left: 0, width: 0 }
            const rangeRect = pos.range.getBoundingClientRect()
            const rawLeft = iframeRect.left + rangeRect.left + rangeRect.width / 2 - popupWidth / 2
            left = Math.max(8, Math.min(rawLeft, window.innerWidth - popupWidth - 8))
            const rawTop = iframeRect.top + rangeRect.top - 48
            top = rawTop < 8 ? iframeRect.top + rangeRect.bottom + 8 : rawTop
        } else {
            const x = pos.clientX ?? window.innerWidth / 2
            const y = pos.clientY ?? window.innerHeight / 2
            left = Math.max(8, Math.min(x - popupWidth / 2, window.innerWidth - popupWidth - 8))
            const rawTop = y - 48
            top = rawTop < 8 ? y + 8 : rawTop
        }

        popup.style.left = `${left}px`
        popup.style.top = `${top}px`
        popup.style.display = 'flex'
    }

    /** Build the floating selection/annotation toolbar DOM element. */
    #createSelectionPopup() {
        const popup = document.createElement('div')
        popup.className = 'selection-popup'
        popup.innerHTML = `
            <div class="selection-popup__colors">
                <button class="selection-popup__color" data-color="yellow" title="Yellow highlight" style="background:rgba(255,220,0,0.85)"></button>
                <button class="selection-popup__color" data-color="blue" title="Blue highlight" style="background:rgba(100,180,255,0.85)"></button>
                <button class="selection-popup__color" data-color="green" title="Green highlight" style="background:rgba(80,210,120,0.85)"></button>
                <button class="selection-popup__color" data-color="pink" title="Pink highlight" style="background:rgba(255,100,170,0.85)"></button>
                <button class="selection-popup__delete" title="Delete highlight" style="display:none">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                </button>
            </div>
            <div class="selection-popup__divider selection-popup__action-el"></div>
            <button class="selection-popup__btn selection-popup__action-el" data-action="note" title="Add note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span>Note</span>
            </button>
            <button class="selection-popup__btn selection-popup__action-el" data-action="copy" title="Copy">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                <span>Copy</span>
            </button>
        `
        popup.addEventListener('mousedown', e => e.preventDefault())
        popup.addEventListener('click', e => {
            e.stopPropagation()

            // ── Delete existing annotation ──────────────────────────────────
            if (e.target.closest('.selection-popup__delete')) {
                const annotation = popup._annotation
                if (!annotation) return
                const cfiRange = annotation.value
                const id = annotation.id
                this.#serverAnnotations.delete(cfiRange)
                this.#annotationsByValue.delete(cfiRange)
                if (this.#isContinuousMode()) {
                    this.csRemoveAnnotation(cfiRange)
                } else {
                    this.#getView()?.deleteAnnotation?.({ value: cfiRange })
                }
                this.removeHighlightFromPanel(cfiRange)
                if (id) this.#postToParent({ type: 'bookly:annotation-delete', id, cfiRange })
                this.hideSelectionPopup()
                return
            }

            // ── Color swatch click ──────────────────────────────────────────
            const colorBtn = e.target.closest('.selection-popup__color')
            if (colorBtn) {
                const color = colorBtn.dataset.color
                if (popup._annotation) {
                    const annotation = popup._annotation
                    const cfiRange = annotation.value
                    const id = annotation.id
                    if (this.#isContinuousMode()) {
                        this.csRemoveAnnotation(cfiRange)
                        this.csRenderAnnotation(cfiRange, color)
                    } else {
                        this.#getView()?.deleteAnnotation?.({ value: cfiRange })
                        this.#getView()?.addAnnotation?.({ value: cfiRange, color })
                    }
                    const updated = { ...annotation, color, payload: { ...annotation.payload, color } }
                    if (this.#serverAnnotations.has(cfiRange)) this.#serverAnnotations.set(cfiRange, updated)
                    this.#annotationsByValue.set(cfiRange, updated)
                    this.#updateHighlightInPanel(cfiRange, color)
                    if (id) this.#postToParent({ type: 'bookly:annotation-update', id, payload: updated.payload })
                } else {
                    const range = popup._range
                    const doc = popup._doc
                    if (range && doc) this.#handleSelectionAction('highlight', range, doc, color)
                }
                this.hideSelectionPopup()
                return
            }

            // ── Note / Copy actions (select mode only) ──────────────────────
            const btn = e.target.closest('[data-action]')
            if (!btn) return
            const action = btn.dataset.action
            const range = popup._range
            const doc = popup._doc
            if (range && doc) this.#handleSelectionAction(action, range, doc)
            this.hideSelectionPopup()
        })
        document.addEventListener('click', () => this.hideSelectionPopup(), { passive: true })
        document.body.appendChild(popup)
        return popup
    }

    // ── Selection action handler ───────────────────────────────────────────────

    /**
     * @param {'highlight'|'note'|'copy'} action
     * @param {Range} range
     * @param {Document} doc
     * @param {string} [color]
     */
    #handleSelectionAction(action, range, doc, color = 'yellow') {
        if (action === 'copy') {
            const text = range.toString().trim()
            navigator.clipboard?.writeText(text).catch(() => { })
            return
        }

        const index = this.#docToIndex.get(doc)
        if (index == null) return

        const view = this.#getView()
        const cfiRange = view.getCFI(index, range)
        if (!cfiRange) return

        const selectedText = range.toString().trim().slice(0, 300)

        if (action === 'highlight') {
            const tempObj = { id: null, value: cfiRange, color, annotation_type: 'highlight', payload: { color, selectedText } }
            this.#serverAnnotations.set(cfiRange, tempObj)
            this.#annotationsByValue.set(cfiRange, tempObj)
            if (this.#isContinuousMode()) {
                this.csRenderAnnotation(cfiRange, color)
            } else {
                view.addAnnotation({ value: cfiRange, color })
            }
            this.#postToParent({
                type: 'bookly:annotation-create',
                cfiRange,
                annotationType: 'highlight',
                payload: { color, selectedText },
            })
        } else if (action === 'note') {
            this.#showNoteDialog(cfiRange, selectedText)
        }

        doc.defaultView?.getSelection()?.removeAllRanges()
    }

    /** Show the note-input dialog, then post the annotation to parent. */
    #showNoteDialog(cfiRange, selectedText = '') {
        const dialog = els.noteInputDialog
        const textarea = els.noteInputTextarea
        const saveBtn = dialog?.querySelector('#note-input-save')
        const cancelBtn = dialog?.querySelector('#note-input-cancel')
        if (!dialog || !textarea || !saveBtn || !cancelBtn) return

        textarea.value = ''
        dialog.showModal?.()

        const handleSave = () => {
            const note = textarea.value.trim()
            dialog.close?.()
            cleanup()
            if (!note) return
            const view = this.#getView()
            if (this.#isContinuousMode()) {
                this.csRenderAnnotation(cfiRange, 'yellow')
            } else {
                view.addAnnotation({ value: cfiRange, color: 'yellow' })
            }
            const tempObj = { id: null, value: cfiRange, color: 'yellow', annotation_type: 'note', payload: { color: 'yellow', note, selectedText } }
            this.#serverAnnotations.set(cfiRange, tempObj)
            this.#annotationsByValue.set(cfiRange, tempObj)
            this.#postToParent({
                type: 'bookly:annotation-create',
                cfiRange,
                annotationType: 'note',
                payload: { color: 'yellow', note, selectedText },
            })
        }
        const handleCancel = () => {
            dialog.close?.()
            cleanup()
        }
        const cleanup = () => {
            saveBtn.removeEventListener('click', handleSave)
            cancelBtn.removeEventListener('click', handleCancel)
        }
        saveBtn.addEventListener('click', handleSave)
        cancelBtn.addEventListener('click', handleCancel)
        dialog.addEventListener('close', cleanup, { once: true })
        textarea.focus()
    }

    // ── Highlights panel ───────────────────────────────────────────────────────

    renderHighlightsPanel() {
        const panel = els.highlightsView
        if (!panel) return
        panel.innerHTML = ''
        const annotations = [...this.#serverAnnotations.values()]
            .filter(a => a.annotation_type === 'highlight' || a.annotation_type === 'note')
        if (!annotations.length) {
            panel.innerHTML = '<p class="highlights-empty">No highlights yet.\nSelect text while reading to create one.</p>'
            return
        }
        for (const ann of annotations) panel.appendChild(this.#createHighlightEntry(ann))
    }

    #createHighlightEntry(ann) {
        const entry = document.createElement('button')
        entry.className = 'highlight-entry'
        entry.dataset.cfiRange = ann.value
        const color = ann.color ?? ann.payload?.color ?? 'yellow'
        const cssColor = HIGHLIGHT_COLORS[color] ?? HIGHLIGHT_COLORS.yellow
        const text = ann.payload?.selectedText || ''
        const note = ann.payload?.note || ''
        entry.innerHTML = `
            <span class="highlight-entry__chip" style="background:${cssColor}"></span>
            <span class="highlight-entry__body">
                ${text ? `<span class="highlight-entry__text">"${text.slice(0, 120)}${text.length > 120 ? '…' : ''}"</span>` : ''}
                ${note ? `<span class="highlight-entry__note">${note.slice(0, 80)}${note.length > 80 ? '…' : ''}</span>` : ''}
                ${!text && !note ? '<span class="highlight-entry__text">(no text captured)</span>' : ''}
            </span>
        `
        entry.addEventListener('click', () => {
            this.#getView()?.goTo?.(ann.value)
        })
        return entry
    }

    addHighlightToPanel(ann) {
        const panel = els.highlightsView
        if (!panel) return
        const empty = panel.querySelector('.highlights-empty')
        if (empty) empty.remove()
        panel.querySelector(`[data-cfi-range="${CSS.escape(ann.value)}"]`)?.remove()
        panel.insertBefore(this.#createHighlightEntry(ann), panel.firstChild)
    }

    removeHighlightFromPanel(cfiRange) {
        const panel = els.highlightsView
        if (!panel) return
        panel.querySelector(`[data-cfi-range="${CSS.escape(cfiRange)}"]`)?.remove()
        if (!panel.querySelector('.highlight-entry')) {
            panel.innerHTML = '<p class="highlights-empty">No highlights yet.\nSelect text while reading to create one.</p>'
        }
    }

    #updateHighlightInPanel(cfiRange, newColor) {
        const panel = els.highlightsView
        if (!panel) return
        const entry = panel.querySelector(`[data-cfi-range="${CSS.escape(cfiRange)}"]`)
        if (!entry) return
        const chip = entry.querySelector('.highlight-entry__chip')
        if (chip) chip.style.background = HIGHLIGHT_COLORS[newColor] ?? HIGHLIGHT_COLORS.yellow
    }

    // ── CS annotation rendering ────────────────────────────────────────────────

    /** Schedule a rerender of highlights for one chapter, debounced. */
    scheduleCsHighlightRerender(index, delay = 0) {
        if (!this.#isContinuousMode() || index == null || Number.isNaN(index)) return
        const existing = this.#csHighlightRerenderTimers.get(index)
        if (existing) clearTimeout(existing)
        const timer = window.setTimeout(() => {
            this.#csHighlightRerenderTimers.delete(index)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => this.#csRerenderHighlights(index))
            })
        }, delay)
        this.#csHighlightRerenderTimers.set(index, timer)
    }

    /** Schedule rerenders for all loaded chapters. */
    scheduleAllCsHighlightRerenders(delay = 0) {
        if (!this.#isContinuousMode()) return
        for (const index of this.#getCsOverlayerIndices()) {
            this.scheduleCsHighlightRerender(index, delay)
        }
    }

    /** Refit the overlayer canvas to match the chapter document dimensions. */
    fitCsOverlayerSize(index) {
        const entry = this.#getCsOverlayer(index)
        const root = entry?.doc?.documentElement
        if (!entry || !root) return
        const h = Math.max(
            root.scrollHeight,
            entry.doc.body?.scrollHeight ?? 0,
            root.offsetHeight,
            entry.doc.body?.offsetHeight ?? 0,
            root.clientHeight
        )
        const w = Math.max(
            root.scrollWidth,
            entry.doc.body?.scrollWidth ?? 0,
            root.offsetWidth,
            entry.doc.body?.offsetWidth ?? 0,
            root.clientWidth
        )
        if (h > 10) entry.overlayer.element.style.height = h + 'px'
        if (w > 10) entry.overlayer.element.style.width = w + 'px'
    }

    #resolveCsAnnotationRange(cfiRange, index, doc) {
        const resolved = this.#getView()?.resolveNavigation?.(cfiRange)
        if (!resolved || resolved.index !== index) return null
        return typeof resolved.anchor === 'function'
            ? resolved.anchor(doc)
            : resolved.anchor
    }

    #csRerenderHighlights(index) {
        const view = this.#getView()
        if (!view || !this.#isContinuousMode()) return
        const entry = this.#getCsOverlayer(index)
        if (!entry) return

        try {
            this.fitCsOverlayerSize(index)
            entry.overlayer.clear()

            let needsRetry = false
            for (const [cfiRange, ann] of this.#serverAnnotations) {
                try {
                    const range = this.#resolveCsAnnotationRange(cfiRange, index, entry.doc)
                    if (!range) continue
                    const color = ann.color ?? ann.payload?.color ?? 'yellow'
                    const cssColor = HIGHLIGHT_COLORS[color] ?? HIGHLIGHT_COLORS.yellow
                    entry.overlayer.add(cfiRange, range, Overlayer.highlight, { color: cssColor })
                    const rects = entry.overlayer.getRects?.(cfiRange)
                    if (!rects || rects.length === 0) {
                        needsRetry = true
                    }
                } catch (e) {
                    console.warn('[CS] highlight rerender failed for cfi:', cfiRange, e)
                    needsRetry = true
                }
            }

            if (needsRetry) {
                const retryDelays = [100, 300, 800, 1500]
                const retryCount = this.#csHighlightRetryCounts.get(index) ?? 0
                if (retryCount < retryDelays.length) {
                    this.#csHighlightRetryCounts.set(index, retryCount + 1)
                    this.scheduleCsHighlightRerender(index, retryDelays[retryCount])
                }
            } else {
                this.#csHighlightRetryCounts.delete(index)
            }
        } catch (e) {
            console.warn('[CS] highlight rerender failed for chapter:', index, e)
        }
    }

    /** Trigger a rerender of highlights for the chapter containing cfiRange. */
    csRenderAnnotation(cfiRange, color) {
        void color
        const view = this.#getView()
        if (!view || !this.#isContinuousMode()) return
        try {
            const resolved = view.resolveNavigation(cfiRange)
            if (!resolved) return
            this.scheduleCsHighlightRerender(resolved.index)
        } catch (e) { console.warn('[CS] render annotation failed:', cfiRange, e) }
    }

    /** Remove an annotation from the CS overlayer for its chapter. */
    async csRemoveAnnotation(cfiRange) {
        const view = this.#getView()
        if (!view || !this.#isContinuousMode()) return
        try {
            const { index } = await view.resolveNavigation(cfiRange)
            this.#getCsOverlayer(index)?.overlayer.remove(cfiRange)
        } catch { }
    }

    /** Clear all CS highlight timers (call when leaving continuous mode). */
    clearCsHighlightTimers() {
        for (const timer of this.#csHighlightRerenderTimers.values()) clearTimeout(timer)
        this.#csHighlightRerenderTimers.clear()
        this.#csHighlightRetryCounts.clear()
    }
}
