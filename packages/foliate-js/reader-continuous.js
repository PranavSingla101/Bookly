/**
 * Manages the seamless stacked-iframe continuous scroll mode.
 *
 * Architecture: one iframe per spine item, all stacked vertically in a single
 * scrollable outer container. The browser's native scroll handles momentum,
 * rubber-banding, and inertia. IntersectionObserver pre-loads the next chapter
 * before the sentinel div enters the viewport.
 */
export class ContinuousScrollManager {
    #book
    #sections
    #outerEl
    #chaptersEl
    #styleGetter
    #onChapterVisible
    #onDocLoad
    #onChapterLayout

    #sentinelIo
    #currentChapterIndex = -1
    #loadedIndices = new Set()
    #loadingIndices = new Set()
    /** @type {Map<number, { iframe: HTMLIFrameElement, sentinel: HTMLElement, wrapper: HTMLElement, ro: ResizeObserver|null }>} */
    #chapterEls = new Map()
    #scrollRafId = 0

    constructor({ book, outerEl, chaptersEl, styleGetter, onChapterVisible, onDocLoad, onChapterLayout }) {
        this.#book = book
        this.#sections = book.sections
        this.#outerEl = outerEl
        this.#chaptersEl = chaptersEl
        this.#styleGetter = styleGetter
        this.#onChapterVisible = onChapterVisible
        this.#onDocLoad = onDocLoad
        this.#onChapterLayout = onChapterLayout

        this.#setupSentinelObserver()
        this.#setupScrollTracking()
    }

    #setupSentinelObserver() {
        this.#sentinelIo = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const nextIndex = Number(entry.target.dataset.nextChapter)
                    this.appendChapter(nextIndex)
                    this.#sentinelIo.unobserve(entry.target)
                }
            }
        }, {
            root: this.#outerEl,
            // Pre-load 800px before the sentinel enters the viewport
            rootMargin: '0px 0px 800px 0px',
        })
    }

    #setupScrollTracking() {
        this.#outerEl.addEventListener('scroll', () => {
            if (this.#scrollRafId) return
            this.#scrollRafId = requestAnimationFrame(() => {
                this.#scrollRafId = 0
                this.#updateCurrentChapter()
            })
        }, { passive: true })
    }

    #updateCurrentChapter() {
        const scrollTop = this.#outerEl.scrollTop
        const viewportH = this.#outerEl.clientHeight
        const viewportCenter = scrollTop + viewportH / 2

        let closestIndex = -1
        let closestDist = Infinity

        for (const [index, { wrapper }] of this.#chapterEls) {
            const top = wrapper.offsetTop
            const h = wrapper.offsetHeight || 1
            const center = top + h / 2
            const dist = Math.abs(center - viewportCenter)
            if (dist < closestDist) {
                closestDist = dist
                closestIndex = index
            }
        }

        if (closestIndex >= 0 && closestIndex !== this.#currentChapterIndex) {
            this.#currentChapterIndex = closestIndex
            this.#onChapterVisible?.(closestIndex)
        }
    }

    async appendChapter(index) {
        if (index < 0 || index >= this.#sections.length) return
        if (this.#loadedIndices.has(index) || this.#loadingIndices.has(index)) return

        // Skip non-linear spine items (cover pages, nav docs, etc.)
        if (this.#sections[index]?.linear === 'no') {
            await this.appendChapter(index + 1)
            return
        }

        this.#loadingIndices.add(index)

        let src
        try {
            src = await this.#sections[index].load()
        } catch (e) {
            console.error('[CS] Failed to load section', index, e)
            this.#loadingIndices.delete(index)
            return
        }

        if (!src) {
            this.#loadingIndices.delete(index)
            await this.appendChapter(index + 1)
            return
        }

        const wrapper = document.createElement('div')
        wrapper.className = 'cs-chapter'
        wrapper.dataset.chapterIndex = String(index)

        const iframe = document.createElement('iframe')
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts')
        iframe.setAttribute('scrolling', 'no')
        iframe.setAttribute('tabindex', '-1')
        iframe.style.cssText = 'display:block;width:100%;border:none;height:150px;'

        wrapper.append(iframe)
        // Set src after the iframe is in the DOM so the load event fires reliably
        iframe.src = src

        // Thin divider between chapters
        const divider = document.createElement('div')
        divider.className = 'cs-chapter-divider'

        // Sentinel triggers next-chapter preload
        const sentinel = document.createElement('div')
        sentinel.className = 'cs-sentinel'
        sentinel.dataset.nextChapter = String(index + 1)

        this.#chaptersEl.append(wrapper, divider, sentinel)

        this.#loadedIndices.add(index)
        this.#loadingIndices.delete(index)
        this.#chapterEls.set(index, { iframe, sentinel, wrapper, ro: null })

        this.#sentinelIo.observe(sentinel)

        iframe.addEventListener('load', () => {
            this.#onIframeLoad(iframe, index)
        }, { once: true })

        // Notify first-chapter visible immediately
        if (this.#currentChapterIndex === -1) {
            this.#currentChapterIndex = index
            this.#onChapterVisible?.(index)
        }
    }

    /** Sequentially load all sections up to (and including) targetIndex. */
    async appendChaptersUpTo(targetIndex) {
        for (let i = 0; i <= targetIndex; i++) {
            if (this.#sections[i]?.linear === 'no') continue
            if (this.#loadedIndices.has(i) || this.#loadingIndices.has(i)) continue
            await this.appendChapter(i)
            // Brief yield so the DOM updates and offsetTop values stabilise
            await new Promise(r => setTimeout(r, 80))
        }
    }

    #onIframeLoad(iframe, index) {
        const doc = iframe.contentDocument
        if (!doc || !doc.body) return

        // Inject reader CSS + suppress internal scroll so content sits at natural height
        const style = doc.createElement('style')
        style.dataset.readerCss = '1'
        style.textContent = this.#styleGetter() + `
            html, body {
                overflow: hidden !important;
                height: auto !important;
                min-height: 0 !important;
            }
            body {
                position: relative !important;
            }
        `
        doc.head.appendChild(style)

        // Size iframe to full content height
        const fitHeight = () => {
            const h = Math.max(
                doc.documentElement.scrollHeight,
                doc.body?.scrollHeight ?? 0,
                doc.documentElement.offsetHeight,
                doc.body?.offsetHeight ?? 0
            )
            if (h > 10) {
                const nextHeight = h + 'px'
                if (iframe.style.height !== nextHeight) iframe.style.height = nextHeight
            }
            this.#onChapterLayout?.(index)
        }
        fitHeight()

        // Re-fit when body resizes (images, web fonts loading in)
        const ro = new ResizeObserver(() => requestAnimationFrame(fitHeight))
        ro.observe(doc.body)
        doc.fonts?.ready?.then(() => requestAnimationFrame(fitHeight))

        const entry = this.#chapterEls.get(index)
        if (entry) entry.ro = ro

        // Notify the Reader so it can attach its own doc-level listeners
        this.#onDocLoad?.(doc, index, iframe)
    }

    scrollToChapterIndex(index) {
        const entry = this.#chapterEls.get(index)
        if (!entry) return
        this.#outerEl.scrollTop = entry.wrapper.offsetTop
    }

    scrollToChapterYOffset(index, yOffset) {
        const entry = this.#chapterEls.get(index)
        if (!entry) return
        const viewportCenter = this.#outerEl.clientHeight / 2
        this.#outerEl.scrollTop = Math.max(0, entry.wrapper.offsetTop + yOffset - viewportCenter)
    }

    /** Re-inject CSS into all loaded iframes (e.g. after font-size or layout change). */
    applyStyles() {
        const baseCSS = this.#styleGetter()
        const overrideCSS = `
            html, body {
                overflow: hidden !important;
                height: auto !important;
                min-height: 0 !important;
            }
            body {
                position: relative !important;
            }
        `
        for (const [, { iframe, wrapper }] of this.#chapterEls) {
            const doc = iframe.contentDocument
            if (!doc) continue
            const style = doc.head?.querySelector('style[data-reader-css]')
            if (style) {
                style.textContent = baseCSS + overrideCSS
                // Re-fit height after CSS change (padding/width affects content height)
                requestAnimationFrame(() => {
                    const h = Math.max(
                        doc.documentElement.scrollHeight,
                        doc.body?.scrollHeight ?? 0,
                        doc.documentElement.offsetHeight,
                        doc.body?.offsetHeight ?? 0
                    )
                    if (h > 10) iframe.style.height = h + 'px'
                    this.#onChapterLayout?.(Number(wrapper.dataset.chapterIndex))
                })
            }
        }
    }

    getChapterWrapper(index) {
        return this.#chapterEls.get(index)?.wrapper ?? null
    }

    getChapterIframe(index) {
        return this.#chapterEls.get(index)?.iframe ?? null
    }

    get currentChapterIndex() { return this.#currentChapterIndex }

    destroy() {
        this.#sentinelIo.disconnect()
        if (this.#scrollRafId) cancelAnimationFrame(this.#scrollRafId)
        for (const [index, { ro }] of this.#chapterEls) {
            ro?.disconnect()
            this.#sections[index]?.unload?.()
        }
        this.#chaptersEl.innerHTML = ''
        this.#loadedIndices.clear()
        this.#loadingIndices.clear()
        this.#chapterEls.clear()
        this.#currentChapterIndex = -1
    }
}
