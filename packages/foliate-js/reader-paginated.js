import { els } from './reader-elements.js'

/**
 * Owns everything that touches FOLIATE-PAGINATOR when not in continuous mode:
 * layout attributes, display-mode (book/full), renderer-level scroll listeners,
 * and per-iframe wheel/touch listeners used for scrolled-mode chapter chaining.
 *
 * Initialized with callbacks into the orchestrator so this module remains
 * independent of the Reader class.
 */
export class PaginatedModeController {
    // ── Callbacks ─────────────────────────────────────────────────────────────
    #getView
    #getFlowMode
    #isContinuousMode
    #getCsDisplayMode

    // ── Renderer-level scroll ─────────────────────────────────────────────────
    // The paginator uses a closed shadow DOM so we cannot reach #container
    // directly. We listen on the renderer element instead.
    #rendererScrollCleanup = null
    #continuousScrollCooldown = false
    #continuousScrollEndTimer = 0
    #continuousNavTimer = 0

    // ── Per-iframe scroll (scrolled mode) ─────────────────────────────────────
    #continuousTouchStartY = 0
    #continuousTouchLastY = 0
    #continuousDocListenerCleanup = new Set()
    #continuousDocsHooked = new WeakSet()

    /**
     * @param {{
     *   getView: () => any,
     *   getFlowMode: () => 'paginated' | 'scroll',
     *   isContinuousMode: () => boolean,
     *   getCsDisplayMode: () => 'book' | 'full',
     * }} opts
     */
    constructor({ getView, getFlowMode, isContinuousMode, getCsDisplayMode }) {
        this.#getView = getView
        this.#getFlowMode = getFlowMode
        this.#isContinuousMode = isContinuousMode
        this.#getCsDisplayMode = getCsDisplayMode
    }

    // ── Layout ────────────────────────────────────────────────────────────────

    /** @param {Element} renderer @param {'paginated'|'scroll'} mode */
    applyPaginatorLayout(renderer, mode) {
        if (renderer.tagName !== 'FOLIATE-PAGINATOR') return
        if (mode === 'scroll') {
            renderer.setAttribute('flow', 'scrolled')
            renderer.setAttribute('max-inline-size', '48rem')
            renderer.setAttribute('margin', '0')
            renderer.removeAttribute('max-column-count')
        } else {
            renderer.removeAttribute('flow')
            renderer.setAttribute('max-inline-size', '900px')
            renderer.removeAttribute('margin')
            renderer.setAttribute('max-column-count', '1')
        }
        this.applyPaginatorDisplayMode(renderer)
        this.updatePaginatorBookMode()
    }

    /** Override max-inline-size / margin for the current book/full display mode. */
    applyPaginatorDisplayMode(renderer) {
        if (!renderer || renderer.tagName !== 'FOLIATE-PAGINATOR') return
        if (this.#getCsDisplayMode() === 'full') {
            renderer.setAttribute('max-inline-size', '9999px')
            renderer.setAttribute('margin', '0')
        } else {
            if (this.#getFlowMode() === 'scroll') {
                renderer.setAttribute('max-inline-size', '48rem')
                renderer.setAttribute('margin', '0')
            } else {
                renderer.setAttribute('max-inline-size', '900px')
                renderer.removeAttribute('margin')
            }
        }
    }

    /** Toggle dark side-panels on #foliate-mount to create the book-page visual. */
    updatePaginatorBookMode() {
        const mount = els.foliatMount
        if (!mount) return
        const isBook = !this.#isContinuousMode() && this.#getCsDisplayMode() === 'book'
        mount.classList.toggle('display-book-mode', isBook)
        if (isBook) {
            const halfCol = this.#getFlowMode() === 'scroll' ? '24rem' : '450px'
            document.documentElement.style.setProperty(
                '--page-margin-width',
                `max(0px, calc(50% - ${halfCol}))`
            )
        } else {
            document.documentElement.style.removeProperty('--page-margin-width')
        }
    }

    // ── Renderer-level scroll listener ────────────────────────────────────────

    /**
     * Attach a debounced scroll listener to the renderer element.
     * Only active in scrolled (non-continuous) mode.
     */
    attachContinuousContainerScroll() {
        if (!this.#isContinuousMode() || this.#getFlowMode() !== 'scroll') {
            this.detachContinuousContainerScroll()
            return
        }
        const renderer = this.#getView()?.renderer
        if (!renderer || renderer.tagName !== 'FOLIATE-PAGINATOR') return
        if (this.#rendererScrollCleanup) return

        const onScroll = () => {
            if (!this.#isContinuousMode() || this.#continuousScrollCooldown) return
            if (this.#continuousScrollEndTimer) clearTimeout(this.#continuousScrollEndTimer)
            this.#continuousScrollEndTimer = window.setTimeout(() => {
                this.#continuousScrollEndTimer = 0
                this.#onContainerScrollEnd()
            }, 120)
        }

        renderer.addEventListener('scroll', onScroll)
        this.#rendererScrollCleanup = () => {
            renderer.removeEventListener('scroll', onScroll)
            this.#rendererScrollCleanup = null
        }
    }

    detachContinuousContainerScroll() {
        this.#rendererScrollCleanup?.()
    }

    /** Fired ~120ms after the last scroll event on the paginator container. */
    #onContainerScrollEnd() {
        const view = this.#getView()
        if (!this.#isContinuousMode() || !view?.renderer?.scrolled) return
        const r = view.renderer
        const { start, end, viewSize } = r
        const edgePx = 16

        const resetCooldown = () => window.setTimeout(() => { this.#continuousScrollCooldown = false }, 500)

        if (viewSize - end <= edgePx && viewSize > 100) {
            this.#continuousScrollCooldown = true
            const navPromise = r.nextSection()
            navPromise && typeof navPromise.then === 'function'
                ? navPromise.finally(resetCooldown)
                : resetCooldown()
        } else if (start <= edgePx && viewSize > 100) {
            this.#continuousScrollCooldown = true
            const navPromise = r.prevSection()
            navPromise && typeof navPromise.then === 'function'
                ? navPromise.finally(resetCooldown)
                : resetCooldown()
        }
    }

    // ── Per-iframe wheel / touch listeners (scrolled mode) ────────────────────

    /** Detach all per-doc listeners, reset tracking state. */
    detachContinuousScrollListeners() {
        for (const cleanup of this.#continuousDocListenerCleanup) {
            cleanup()
        }
        this.#continuousDocListenerCleanup.clear()
        this.#continuousDocsHooked = new WeakSet()
    }

    /** Detach then re-attach (called when switching between scrolled sub-modes). */
    updateContinuousScrollListeners() {
        this.detachContinuousScrollListeners()
    }

    /** Attach wheel/touch listeners to an iframe document for scrolled mode. */
    attachContinuousScrollListenersToDoc(doc) {
        if (!doc || this.#continuousDocsHooked.has(doc)) return
        this.#continuousDocsHooked.add(doc)

        const wheelOpts = { capture: true, passive: false }
        const touchActive = { capture: true, passive: false }
        const touchPassive = { capture: true, passive: true }

        doc.addEventListener('wheel', this.#onContinuousWheel, wheelOpts)
        doc.addEventListener('touchstart', this.#onContinuousTouchStart, touchPassive)
        doc.addEventListener('touchmove', this.#onContinuousTouchMove, touchActive)
        doc.addEventListener('touchend', this.#onContinuousTouchEnd, touchPassive)

        const cleanup = () => {
            doc.removeEventListener('wheel', this.#onContinuousWheel, wheelOpts)
            doc.removeEventListener('touchstart', this.#onContinuousTouchStart, touchPassive)
            doc.removeEventListener('touchmove', this.#onContinuousTouchMove, touchActive)
            doc.removeEventListener('touchend', this.#onContinuousTouchEnd, touchPassive)
            this.#continuousDocListenerCleanup.delete(cleanup)
        }
        this.#continuousDocListenerCleanup.add(cleanup)
    }

    // ── Event handlers (arrow functions to preserve `this`) ───────────────────

    /** @param {WheelEvent} e */
    #onContinuousWheel = e => {
        const r = this.#getView()?.renderer
        if (!r?.scrolled) return

        const prevStart = r.start
        r.scrollBy(e.deltaY, 0)
        e.preventDefault()

        if (r.start === prevStart && !this.#continuousScrollCooldown) {
            if (this.#continuousScrollEndTimer) clearTimeout(this.#continuousScrollEndTimer)
            this.#continuousScrollEndTimer = window.setTimeout(() => {
                this.#continuousScrollEndTimer = 0
                this.#onContainerScrollEnd()
            }, 80)
        }
    }

    #onContinuousTouchStart = e => {
        const t = e.touches[0]
        if (t) {
            this.#continuousTouchStartY = t.clientY
            this.#continuousTouchLastY = t.clientY
        }
    }

    /** @param {TouchEvent} e */
    #onContinuousTouchMove = e => {
        const r = this.#getView()?.renderer
        if (!r?.scrolled) return
        const t = e.touches[0]
        if (!t) return
        const dy = this.#continuousTouchLastY - t.clientY
        this.#continuousTouchLastY = t.clientY

        const prevStart = r.start
        r.scrollBy(dy, 0)
        e.preventDefault()

        if (r.start === prevStart && !this.#continuousScrollCooldown) {
            if (this.#continuousScrollEndTimer) clearTimeout(this.#continuousScrollEndTimer)
            this.#continuousScrollEndTimer = window.setTimeout(() => {
                this.#continuousScrollEndTimer = 0
                this.#onContainerScrollEnd()
            }, 80)
        }
    }

    /** @param {TouchEvent} e */
    #onContinuousTouchEnd = e => {
        const view = this.#getView()
        if (!this.#isContinuousMode() || !view?.renderer?.scrolled) return
        const r = view.renderer
        const t = e.changedTouches[0]
        if (!t) return
        const dy = this.#continuousTouchStartY - t.clientY
        const threshold = 30

        const doc = e.currentTarget?.nodeType === Node.DOCUMENT_NODE ? e.currentTarget : null
        const docEl = doc?.documentElement
        const win = doc?.defaultView
        const shortPage = !!docEl && !!win && docEl.scrollHeight <= win.innerHeight + 1

        if (shortPage) {
            r.addEventListener('relocate', () => {
                this.#tryChainContinuousScroll(dy, threshold)
            }, { once: true })
        }
    }

    /** @param {number} dy @param {number} threshold */
    #tryChainContinuousScroll(dy, threshold) {
        const view = this.#getView()
        if (!this.#isContinuousMode() || !view?.renderer?.scrolled) return false
        const r = view.renderer
        const edgePx = 12
        const { start, end, viewSize } = r
        const nearTop = start <= edgePx
        const nearBottom = viewSize - end <= edgePx
        if (nearTop && dy < -threshold) {
            if (this.#continuousNavTimer) clearTimeout(this.#continuousNavTimer)
            this.#continuousNavTimer = window.setTimeout(() => {
                view?.renderer?.prevSection()
            }, 100)
            return true
        }
        if (nearBottom && dy > threshold) {
            if (this.#continuousNavTimer) clearTimeout(this.#continuousNavTimer)
            this.#continuousNavTimer = window.setTimeout(() => {
                view?.renderer?.nextSection()
            }, 100)
            return true
        }
        return false
    }
}
