import './view.js'
import { createMenu } from './ui/menu.js'
import {
    buildTocEntries,
    buildPageLabelLookup,
    createTocListPanel,
} from './reader-toc.js'
import { Overlayer } from './overlayer.js'
import { els } from './reader-elements.js'
import { ContinuousScrollManager } from './reader-continuous.js'
import { PaginatedModeController } from './reader-paginated.js'
import { AnnotationController } from './reader-annotations.js'
import { BookmarkController } from './reader-bookmarks.js'

// ── Constants ────────────────────────────────────────────────────────────────

const READER_BG = '#121214'
const READER_FG = '#e6e4e0'
const READER_LINK = '#9cc4ff'

const FONT_PRESETS = /** @type {const} */ ({
    small: 88,
    medium: 100,
    large: 115,
    xlarge: 132,
})

const getCSS = ({ spacing, justify, hyphenate, fontSizePct }) => `
    @namespace epub "http://www.idpf.org/2007/ops";
    :root {
        --overlayer-highlight-opacity: 0.65;
        --overlayer-highlight-blend-mode: normal;
    }
    html {
        color-scheme: dark;
        background: ${READER_BG} !important;
        color: ${READER_FG} !important;
        font-size: ${fontSizePct}%;
    }
    body {
        margin: 0 !important;
        background: transparent !important;
        color: inherit !important;
    }
    a:link {
        color: ${READER_LINK};
    }
    a:visited {
        color: #c4b5fd;
    }
    p, li, blockquote, dd {
        line-height: ${spacing};
        text-align: ${justify ? 'justify' : 'start'};
        -webkit-hyphens: ${hyphenate ? 'auto' : 'manual'};
        hyphens: ${hyphenate ? 'auto' : 'manual'};
        -webkit-hyphenate-limit-before: 3;
        -webkit-hyphenate-limit-after: 2;
        -webkit-hyphenate-limit-lines: 2;
        hanging-punctuation: allow-end last;
        widows: 2;
    }
    [align="left"] { text-align: left; }
    [align="right"] { text-align: right; }
    [align="center"] { text-align: center; }
    [align="justify"] { text-align: justify; }
    pre {
        white-space: pre-wrap !important;
    }
    aside[epub|type~="endnote"],
    aside[epub|type~="footnote"],
    aside[epub|type~="note"],
    aside[epub|type~="rearnote"] {
        display: none;
    }
`

const READING_MODE_LABELS = {
    paginated: 'Paginated',
    scrolled: 'Scrolled',
    continuous: 'Continuous scroll',
}

const locales = 'en'
const percentFormat = new Intl.NumberFormat(locales, { style: 'percent' })
const listFormat = new Intl.ListFormat(locales, { style: 'short', type: 'conjunction' })

const formatLanguageMap = x => {
    if (!x) return ''
    if (typeof x === 'string') return x
    const keys = Object.keys(x)
    return x[keys[0]]
}

const formatOneContributor = contributor => {
    if (contributor == null) return ''
    if (typeof contributor === 'string') return contributor
    if (typeof contributor === 'object') {
        if (contributor.name != null) return formatLanguageMap(contributor.name)
        return formatLanguageMap(contributor)
    }
    return String(contributor)
}

const formatContributor = contributor => Array.isArray(contributor)
    ? listFormat.format(contributor.map(formatOneContributor))
    : formatOneContributor(contributor)

const asMetadataList = value =>
    value == null ? [] : Array.isArray(value) ? value : [value]

// ── Reader orchestrator ───────────────────────────────────────────────────────

class Reader {
    /** @type {Array<{ label: string, href: string | null, depth: number, isHeader?: boolean }>} */
    #tocEntries = []
    #tocPanel
    #topBarPeekTimer = 0

    /** When true, use the stacked-iframe continuous scroll mode. */
    continuousScroll = true
    /** @type {'paginated' | 'scroll'} */
    flowMode = 'scroll'
    /** @type {'book' | 'full'} */
    #csDisplayMode = 'book'

    /** @type {ContinuousScrollManager|null} */
    #csManager = null
    /** @type {Map<number, {overlayer: import('./overlayer.js').Overlayer, doc: Document, ro?: ResizeObserver, imageCleanups?: Array<() => void>}>} */
    #csOverlayers = new Map()

    #modeSwitchOverlayTimer = 0

    style = {
        spacing: 1.45,
        justify: true,
        hyphenate: true,
        fontSizePct: FONT_PRESETS.medium,
    }

    /** Calibre annotations keyed by spine index */
    annotations = new Map()

    // ── Sub-controllers ───────────────────────────────────────────────────────
    /** @type {PaginatedModeController} */
    #paginated
    /** @type {AnnotationController} */
    #annotation
    /** @type {BookmarkController} */
    #bookmark

    // ── Progress sync ─────────────────────────────────────────────────────────
    #progressSyncTimer = 0
    #lastSyncedCfi = null
    #readerReadySent = false

    constructor() {
        this.#paginated = new PaginatedModeController({
            getView: () => this.view,
            getFlowMode: () => this.flowMode,
            isContinuousMode: () => this.continuousScroll,
            getCsDisplayMode: () => this.#csDisplayMode,
        })

        this.#annotation = new AnnotationController({
            getView: () => this.view,
            isContinuousMode: () => this.continuousScroll,
            getCsOverlayer: index => this.#csOverlayers.get(index),
            getCsOverlayerIndices: () => this.#csOverlayers.keys(),
            getCalibreAnnotations: index => this.annotations.get(index),
            postToParent: msg => window.parent.postMessage(msg, '*'),
            onLoadBookmark: (ann, yOffset, isFirst) => {
                let container = null
                if (this.continuousScroll && this.#csManager) {
                    const idx = this.#bookmark.resolveChapterIndexFromCfi(ann.cfi_range)
                    if (idx >= 0) {
                        if (isFirst) {
                            this.#bookmark.pendingScrollChapter = { chapterIdx: idx, yOffset }
                        }
                        container = this.#csManager.getChapterWrapper(idx)
                        if (!container) {
                            this.#bookmark.deferredBookmarks = [
                                ...this.#bookmark.deferredBookmarks,
                                { ann, yOffset },
                            ]
                            setTimeout(() => {
                                this.#bookmark.flushDeferredBookmarks()
                                if (this.#bookmark.hasBookmark) this.#updateBookmarkButtonState(true)
                            }, 200)
                            return
                        }
                    }
                }
                this.#bookmark.renderBookmarkStrip(ann.id, yOffset, ann.cfi_range, container)
                this.#updateBookmarkButtonState(true)
                if (isFirst && this.continuousScroll) {
                    const idx = this.#bookmark.resolveChapterIndexFromCfi(ann.cfi_range)
                    if (idx >= 0) this.#bookmark.applyPendingScroll(idx)
                }
            },
            onBookmarkSaved: annotation => {
                this.#bookmark.swapBookmarkId(null, annotation)
                this.#updateBookmarkButtonState(this.#bookmark.hasBookmark)
            },
        })

        this.#bookmark = new BookmarkController({
            getView: () => this.view,
            isContinuousMode: () => this.continuousScroll,
            getCsManager: () => this.#csManager,
            postToParent: msg => window.parent.postMessage(msg, '*'),
            onBookmarkRemoved: () => this.#updateBookmarkButtonState(false),
        })

        // ── Sidebar button ─────────────────────────────────────────────────────
        els.sideBarButton?.addEventListener('click', () => {
            const willOpen = !els.sideBar?.classList.contains('show')
            els.sideBar?.classList.toggle('show', willOpen)
            els.dimmingOverlay?.classList.toggle('show', willOpen)
        })
        els.dimmingOverlay?.addEventListener('click', () => this.closeSideBar())

        // ── Sidebar tab switching ──────────────────────────────────────────────
        els.tabToc?.addEventListener('click', () => {
            els.tabToc.classList.add('side-bar-tab--active')
            els.tabHighlights?.classList.remove('side-bar-tab--active')
            if (els.tocView) els.tocView.style.display = ''
            if (els.highlightsView) els.highlightsView.style.display = 'none'
        })
        els.tabHighlights?.addEventListener('click', () => {
            els.tabHighlights.classList.add('side-bar-tab--active')
            els.tabToc?.classList.remove('side-bar-tab--active')
            if (els.tocView) els.tocView.style.display = 'none'
            if (els.highlightsView) els.highlightsView.style.display = ''
            this.#annotation.renderHighlightsPanel()
        })

        // ── Font size menu ─────────────────────────────────────────────────────
        const menu = createMenu([
            {
                name: 'fontSize',
                label: 'Text size',
                type: 'radio',
                items: [
                    ['Small', 'small'],
                    ['Medium', 'medium'],
                    ['Large', 'large'],
                    ['Extra large', 'xlarge'],
                ],
                onclick: value => {
                    this.style.fontSizePct = FONT_PRESETS[value] ?? FONT_PRESETS.medium
                    this.#applyChromeStyles()
                },
            },
        ])
        menu.element.classList.add('menu')
        menu.groups.fontSize.select('medium')

        els.menuButton?.append(menu.element)
        els.aaSettingsButton?.addEventListener('click', e => {
            e.stopPropagation()
            menu.element.classList.toggle('show')
        })

        // ── Book info dialog ───────────────────────────────────────────────────
        if (els.sideBarInfo && els.bookInfoDialog?.showModal) {
            els.sideBarInfo.addEventListener('click', () => els.bookInfoDialog.showModal())
            els.bookInfoDialogClose?.addEventListener('click', () => els.bookInfoDialog.close())
            els.bookInfoDialog.addEventListener('click', e => {
                if (e.target === els.bookInfoDialog) els.bookInfoDialog.close()
            })
        }

        // ── Reading mode selector ──────────────────────────────────────────────
        els.layoutMode?.addEventListener('change', e => {
            const v = e.target.value
            if (v === 'paginated' || v === 'scrolled' || v === 'continuous') this.setReadingMode(v)
        })
        this.#initLayoutDropdown()
        this.#syncReadingModeSelect()
    }

    closeSideBar() {
        els.dimmingOverlay?.classList.remove('show')
        els.sideBar?.classList.remove('show')
    }

    #applyChromeStyles() {
        this.view?.renderer?.setStyles?.(getCSS(this.style))
        this.#csManager?.applyStyles()
    }

    #peekTopBar(durationMs = 3200) {
        const bar = els.readerTopBar
        bar?.classList.add('reader-top-bar--peek')
        if (this.#topBarPeekTimer) clearTimeout(this.#topBarPeekTimer)
        this.#topBarPeekTimer = window.setTimeout(() => {
            bar?.classList.remove('reader-top-bar--peek')
            this.#topBarPeekTimer = 0
        }, durationMs)
    }

    #setModeSwitchLoading(isLoading) {
        const overlay = els.modeSwitchOverlay
        if (!overlay) return
        if (this.#modeSwitchOverlayTimer) {
            clearTimeout(this.#modeSwitchOverlayTimer)
            this.#modeSwitchOverlayTimer = 0
        }
        overlay.classList.toggle('is-visible', isLoading)
    }

    // ── Layout dropdown ───────────────────────────────────────────────────────

    #initLayoutDropdown() {
        const trigger = els.layoutTrigger
        const listbox = els.layoutListbox
        const select = els.layoutMode
        if (!trigger || !listbox || !select) return

        const close = () => {
            listbox.hidden = true
            trigger.setAttribute('aria-expanded', 'false')
        }
        const open = () => {
            listbox.hidden = false
            trigger.setAttribute('aria-expanded', 'true')
        }

        trigger.addEventListener('click', e => {
            e.stopPropagation()
            listbox.hidden ? open() : close()
        })

        listbox.querySelectorAll('.reader-layout-option').forEach(opt => {
            opt.addEventListener('click', e => {
                e.stopPropagation()
                const v = opt.dataset.value
                if (v === 'paginated' || v === 'scrolled' || v === 'continuous') {
                    select.value = v
                    select.dispatchEvent(new Event('change', { bubbles: true }))
                }
                close()
            })
        })

        document.addEventListener('click', () => {
            if (!listbox.hidden) close()
        })
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !listbox.hidden) {
                close()
                trigger.focus()
            }
        })
    }

    // ── Reading mode state machine ─────────────────────────────────────────────

    /** @param {'paginated' | 'scrolled' | 'continuous'} mode */
    #readingModeFromState() {
        if (this.flowMode === 'paginated') return 'paginated'
        if (this.continuousScroll) return 'continuous'
        return 'scrolled'
    }

    #syncReadingModeSelect() {
        const mode = this.#readingModeFromState()
        if (els.layoutTriggerValue) els.layoutTriggerValue.textContent = READING_MODE_LABELS[mode] ?? mode
        if (els.layoutMode) els.layoutMode.value = mode
        if (els.layoutListbox) {
            els.layoutListbox.querySelectorAll('.reader-layout-option').forEach(li => {
                const selected = li.dataset.value === mode
                li.classList.toggle('reader-layout-option--selected', selected)
                li.setAttribute('aria-selected', selected ? 'true' : 'false')
            })
        }
    }

    static #STORAGE_KEY = 'bookly:readingMode'

    static #savedMode() {
        try { return localStorage.getItem(Reader.#STORAGE_KEY) } catch { return null }
    }

    static #saveMode(mode) {
        try { localStorage.setItem(Reader.#STORAGE_KEY, mode) } catch { }
    }

    /**
     * @param {'paginated' | 'scrolled' | 'continuous'} mode
     * @param {boolean} [persist]
     */
    setReadingMode(mode, persist = true) {
        const wasContinuous = this.continuousScroll
        const continuousSwitchTarget =
            mode === 'continuous' && !wasContinuous && this.view?.book
                ? this.#getContinuousSwitchTarget()
                : null
        if (continuousSwitchTarget) this.#setModeSwitchLoading(true)

        if (mode === 'paginated') {
            this.flowMode = 'paginated'
            this.continuousScroll = false
        } else if (mode === 'scrolled') {
            this.flowMode = 'scroll'
            this.continuousScroll = false
        } else {
            this.flowMode = 'scroll'
            this.continuousScroll = true
        }
        if (persist) Reader.#saveMode(mode)

        const isContinuous = this.continuousScroll
        const mount = els.foliatMount
        const csOuter = els.csOuter

        if (mount) {
            mount.style.visibility = isContinuous ? 'hidden' : ''
            mount.setAttribute('aria-hidden', String(isContinuous))
        }
        if (csOuter) {
            csOuter.style.display = isContinuous ? 'block' : 'none'
            csOuter.setAttribute('aria-hidden', String(!isContinuous))
        }
        if (els.csViewModeBtn) els.csViewModeBtn.classList.add('cs-mode-visible')

        if (isContinuous) {
            this.#paginated.detachContinuousContainerScroll()
            this.#paginated.detachContinuousScrollListeners()
            els.foliatMount?.classList.remove('display-book-mode')
            document.documentElement.style.removeProperty('--page-margin-width')
            if (this.view?.book && !this.#csManager) {
                this.#bookmark.migrateBookmarkStrips(true)
                this.#initContinuousScroll(this.view.book, continuousSwitchTarget)
            }
        } else {
            this.#setModeSwitchLoading(false)
            if (this.#csManager) {
                const lastIndex = this.#csManager.currentChapterIndex
                const migratedBookmarks = this.#bookmark.collectBookmarkData()
                this.#csManager.destroy()
                this.#csManager = null
                for (const { ro, imageCleanups } of this.#csOverlayers.values()) {
                    ro?.disconnect()
                    imageCleanups?.forEach(cleanup => cleanup())
                }
                this.#csOverlayers.clear()
                this.#annotation.clearCsHighlightTimers()
                const renderMigratedBookmarks = () => {
                    this.#bookmark.deferredBookmarks = []
                    for (const { id, cfi, yOffset } of migratedBookmarks) {
                        this.#bookmark.renderBookmarkStrip(id, yOffset, cfi, null)
                    }
                    if (this.#bookmark.hasBookmark) this.#updateBookmarkButtonState(true)
                }
                if (lastIndex >= 0 && this.view?.renderer) {
                    this.view.renderer.goTo({ index: lastIndex, anchor: 0 })
                        .then(() => requestAnimationFrame(() => requestAnimationFrame(renderMigratedBookmarks)))
                        .catch(() => renderMigratedBookmarks())
                } else {
                    renderMigratedBookmarks()
                }
            }
            const renderer = this.view?.renderer
            if (renderer?.tagName === 'FOLIATE-PAGINATOR') {
                this.#paginated.applyPaginatorLayout(renderer, this.flowMode === 'scroll' ? 'scroll' : 'paginated')
                this.#paginated.updateContinuousScrollListeners()
                this.#paginated.attachContinuousContainerScroll()
                this.#applyChromeStyles()
            }
        }

        this.#syncReadingModeSelect()
    }

    // ── Continuous scroll init ─────────────────────────────────────────────────

    #initContinuousScroll(book, switchTarget = null) {
        const csOuter = els.csOuter
        const csChapters = els.csChapters
        if (!csOuter || !csChapters || !book) return

        csChapters.innerHTML = ''

        this.#csManager = new ContinuousScrollManager({
            book,
            outerEl: csOuter,
            chaptersEl: csChapters,
            styleGetter: () => {
                const layoutCSS = this.#csDisplayMode === 'full'
                    ? `body { max-width: none !important; padding: 1.5rem 2rem !important; }`
                    : `body { padding: 1.5rem 2.5rem !important; }`
                return getCSS(this.style) + layoutCSS + `
                    img, svg, video { max-width: 100% !important; height: auto !important; }
                `
            },
            onChapterVisible: chapterIndex => {
                const cfi = this.view?.getCFI?.(chapterIndex, null)
                const total = book.sections.length || 1
                const fraction = chapterIndex / (total - 1 || 1)
                if (cfi) this.#debouncedProgressSync(cfi, fraction)
                if (this.#tocPanel) {
                    const entry = this.#tocEntries.find(e => e && !e.isHeader && e.href)
                    if (entry?.href) this.#tocPanel.setActiveHref?.(entry.href)
                }
                this.#bookmark.flushDeferredBookmarks(chapterIndex)
            },
            onChapterLayout: index => {
                this.#annotation.scheduleCsHighlightRerender(index, 75)
            },
            onDocLoad: (doc, index) => {
                this.#annotation.attachSelectionHandlerToDoc(doc, index)
                doc.addEventListener('keydown', this.#handleKeydown.bind(this))
                doc.addEventListener('touchstart', e => {
                    const t = e.changedTouches?.[0]
                    if (t && t.clientY < 72) this.#peekTopBar()
                }, { passive: true })

                // ── Per-chapter Overlayer for CS highlight rendering ───────────
                const overlayer = new Overlayer(doc)
                if (doc.body) {
                    doc.body.appendChild(overlayer.element)
                }

                const ro = new ResizeObserver(() => {
                    this.#annotation.scheduleCsHighlightRerender(index, 75)
                })
                ro.observe(doc.body)

                const imageCleanups = []
                const pendingImages = []
                for (const img of Array.from(doc.images ?? [])) {
                    const rerenderOnImageLoad = () => this.#annotation.scheduleCsHighlightRerender(index, 75)
                    img.addEventListener('load', rerenderOnImageLoad)
                    img.addEventListener('error', rerenderOnImageLoad)
                    imageCleanups.push(() => {
                        img.removeEventListener('load', rerenderOnImageLoad)
                        img.removeEventListener('error', rerenderOnImageLoad)
                    })
                    if (!img.complete) {
                        pendingImages.push(new Promise(resolve => {
                            img.addEventListener('load', resolve, { once: true })
                            img.addEventListener('error', resolve, { once: true })
                        }))
                    }
                    if (img.complete) requestAnimationFrame(rerenderOnImageLoad)
                }

                this.#csOverlayers.set(index, { overlayer, doc, ro, imageCleanups })
                this.#annotation.fitCsOverlayerSize(index)

                doc.addEventListener('click', e => {
                    const [value] = overlayer.hitTest(e)
                    if (value) {
                        const annotation = this.#annotation.getAnnotationByValue(value)
                        if (annotation) {
                            const iframe = doc.defaultView?.frameElement
                            const iframeRect = iframe ? iframe.getBoundingClientRect() : { top: 0, left: 0 }
                            this.#annotation.showAnnotationInSelectionPopup(annotation, {
                                clientX: iframeRect.left + e.clientX,
                                clientY: iframeRect.top + e.clientY,
                            })
                            e.stopPropagation()
                        }
                    }
                })

                this.#annotation.scheduleCsHighlightRerender(index)

                doc.fonts?.ready?.then(() => {
                    this.#annotation.scheduleCsHighlightRerender(index, 75)
                })
                Promise.allSettled([doc.fonts?.ready, ...pendingImages].filter(Boolean))
                    .then(() => this.#annotation.scheduleCsHighlightRerender(index, 0))

                this.view?.dispatchEvent?.(new CustomEvent('create-overlay', { detail: { index } }))

                this.#bookmark.flushDeferredBookmarks(index)
                this.#bookmark.applyPendingScroll(index)
            },
        })

        const savedCsMode = localStorage.getItem('bookly:csDisplayMode')
        if (savedCsMode === 'book' || savedCsMode === 'full') this.#csDisplayMode = savedCsMode
        this.#applyCsDisplayMode()

        const initialIndex = Math.max(0, switchTarget?.index ?? 0)
        this.#restoreContinuousStart(initialIndex, switchTarget)
    }

    async #restoreContinuousStart(initialIndex, switchTarget) {
        try {
            if (!this.#csManager) {
                if (switchTarget) this.#setModeSwitchLoading(false)
                return
            }
            await this.#csManager.appendChaptersUpTo(initialIndex)
            if (!this.#csManager) {
                if (switchTarget) this.#setModeSwitchLoading(false)
                return
            }

            const restore = () => {
                if (!this.#csManager) return
                if (switchTarget && Number.isFinite(switchTarget.yOffset)) {
                    this.#csManager.scrollToChapterYOffset(initialIndex, switchTarget.yOffset)
                    return
                }
                if (initialIndex > 0 || switchTarget) {
                    this.#csManager.scrollToChapterIndex(initialIndex)
                }
            }

            restore()
            requestAnimationFrame(() => requestAnimationFrame(restore))
            window.setTimeout(restore, 250)
            if (switchTarget) {
                this.#modeSwitchOverlayTimer = window.setTimeout(() => {
                    restore()
                    this.#setModeSwitchLoading(false)
                }, 320)
            }
        } catch (e) {
            this.#setModeSwitchLoading(false)
            throw e
        }
    }

    #getContinuousSwitchTarget() {
        const cfi = this.view?.lastLocation?.cfi
        const index = this.#bookmark.resolveChapterIndexFromCfi(cfi)
        if (index < 0) return null

        const renderer = this.view?.renderer
        const yOffset = this.flowMode === 'scroll' && renderer?.scrolled
            ? Math.max(0, renderer.start + renderer.size / 2)
            : null

        return { index, yOffset }
    }

    // ── Display mode (book / full) ────────────────────────────────────────────

    #setCsDisplayMode(mode) {
        this.#csDisplayMode = mode
        localStorage.setItem('bookly:csDisplayMode', mode)
        this.#applyCsDisplayMode()
        this.#csManager?.applyStyles()
    }

    #applyCsDisplayMode() {
        const isFull = this.#csDisplayMode === 'full'
        if (els.csIconBook) els.csIconBook.style.display = isFull ? '' : 'none'
        if (els.csIconFull) els.csIconFull.style.display = isFull ? 'none' : ''

        const csOuter = els.csOuter
        if (csOuter) {
            csOuter.classList.toggle('cs-mode-full', isFull)
            csOuter.classList.toggle('cs-mode-book', !isFull)
        }

        if (!this.continuousScroll) {
            this.#paginated.applyPaginatorDisplayMode(this.view?.renderer)
            this.#paginated.updatePaginatorBookMode()
            requestAnimationFrame(() => requestAnimationFrame(() => {
                this.#bookmark.repositionAllPaginatorStrips()
            }))
        }
    }

    // ── TOC sidebar ───────────────────────────────────────────────────────────

    #initTocSidebar(book) {
        const tocHost = els.tocView
        if (!tocHost) {
            console.warn('[foliate reader] #toc-view missing; sidebar skipped')
            return
        }

        tocHost.replaceChildren()

        try {
            const rawToc = book.toc
            const tocLen = Array.isArray(rawToc) ? rawToc.length : 0
            console.log('[foliate reader] TOC init', {
                tocNavItems: tocLen,
                spineSections: book.sections?.length ?? 0,
                hasPageList: Array.isArray(book.pageList) && book.pageList.length > 0,
            })
            this.#tocEntries = buildTocEntries(book)
            console.log('[foliate reader] TOC rows:', this.#tocEntries.length)
            const pageLookup = buildPageLabelLookup(book.pageList)
            this.#tocPanel = createTocListPanel(this.#tocEntries, pageLookup, {
                onNavigate: href => {
                    console.log('[foliate reader] TOC navigate:', href)
                    if (this.continuousScroll && this.#csManager) {
                        const resolved = this.view.resolveNavigation(href)
                        const targetIndex = resolved?.index ?? 0
                        this.#csManager.appendChaptersUpTo(targetIndex).then(() => {
                            this.#csManager.scrollToChapterIndex(targetIndex)
                        }).catch(e => console.error('[CS] TOC nav failed:', href, e))
                    } else {
                        this.view
                            .goTo(href)
                            .then(() => console.log('[foliate reader] goTo ok:', href))
                            .catch(e => console.error('[foliate reader] goTo failed:', href, e))
                    }
                    this.closeSideBar()
                },
            })
            tocHost.append(this.#tocPanel.element)
        } catch (e) {
            console.error('[foliate reader] TOC build failed', e)
            const err = document.createElement('p')
            err.className = 'toc-empty'
            err.textContent = 'Could not load the table of contents.'
            tocHost.append(err)
        }
    }

    // ── Progress sync ─────────────────────────────────────────────────────────

    #debouncedProgressSync(cfi, fraction) {
        if (this.#progressSyncTimer) clearTimeout(this.#progressSyncTimer)
        this.#progressSyncTimer = window.setTimeout(() => {
            this.#progressSyncTimer = 0
            if (!cfi || cfi === this.#lastSyncedCfi) return
            this.#lastSyncedCfi = cfi
            window.parent.postMessage({
                type: 'bookly:progress',
                cfi,
                progress: Math.round((fraction ?? 0) * 10000) / 100,
                updatedAt: new Date().toISOString(),
            }, '*')
        }, 2000)
    }

    #flushProgressSync() {
        if (this.#progressSyncTimer) {
            clearTimeout(this.#progressSyncTimer)
            this.#progressSyncTimer = 0
        }
        if (this.continuousScroll && this.#csManager) {
            const idx = this.#csManager.currentChapterIndex
            if (idx < 0) return
            const cfi = this.view?.getCFI?.(idx, null)
            if (!cfi || cfi === this.#lastSyncedCfi) return
            this.#lastSyncedCfi = cfi
            const total = this.view?.book?.sections?.length || 1
            window.parent.postMessage({
                type: 'bookly:progress',
                cfi,
                progress: Math.round((idx / (total - 1 || 1)) * 10000) / 100,
                updatedAt: new Date().toISOString(),
            }, '*')
            return
        }
        const loc = this.view?.lastLocation
        if (!loc?.cfi || loc.cfi === this.#lastSyncedCfi) return
        this.#lastSyncedCfi = loc.cfi
        window.parent.postMessage({
            type: 'bookly:progress',
            cfi: loc.cfi,
            progress: Math.round((loc.fraction ?? 0) * 10000) / 100,
            updatedAt: new Date().toISOString(),
        }, '*')
    }

    // ── Bookmark button state ────────────────────────────────────────────────

    #updateBookmarkButtonState(active) {
        if (!els.bookmarkButton) return
        if (active) {
            els.bookmarkButton.classList.add('bookmark-active')
            els.bookmarkButton.title = 'Remove bookmark'
            els.bookmarkButton.setAttribute('aria-label', 'Remove bookmark')
        } else {
            els.bookmarkButton.classList.remove('bookmark-active')
            els.bookmarkButton.title = 'Bookmark this page'
            els.bookmarkButton.setAttribute('aria-label', 'Bookmark this page')
        }
    }

    // ── Toast ─────────────────────────────────────────────────────────────────

    #showToast(message, durationMs = 4000) {
        const toast = els.readerToast
        if (!toast) return
        toast.textContent = message
        toast.classList.add('reader-toast--visible')
        window.setTimeout(() => {
            toast.classList.remove('reader-toast--visible')
        }, durationMs)
    }

    // ── Ready notification ────────────────────────────────────────────────────

    #notifyReaderReady() {
        if (this.#readerReadySent) return
        this.#readerReadySent = true
        window.parent.postMessage({ type: 'bookly:reader-ready' }, '*')
    }

    // ── Open ──────────────────────────────────────────────────────────────────

    async open(file) {
        const params = new URLSearchParams(location.search)
        const modeParam = params.get('mode')
        const flowParam = params.get('flow')
        const continuousParam = params.get('continuousScroll') ?? params.get('continuous')

        /** @type {'paginated' | 'scrolled' | 'continuous'} */
        let initialMode
        if (modeParam === 'paginated' || modeParam === 'scrolled' || modeParam === 'continuous') {
            initialMode = modeParam
        } else if (flowParam === 'paginated' || flowParam === 'pages') {
            initialMode = 'paginated'
        } else if (continuousParam === '0' || continuousParam === 'false' || continuousParam === 'off') {
            initialMode = 'scrolled'
        } else {
            const saved = Reader.#savedMode()
            initialMode = (saved === 'paginated' || saved === 'scrolled' || saved === 'continuous')
                ? saved
                : 'continuous'
        }

        this.setReadingMode(initialMode, false)

        this.view = document.createElement('foliate-view')
        const mount = els.foliatMount
        if (mount) {
            mount.setAttribute('aria-hidden', 'false')
            mount.append(this.view)
        } else document.body.append(this.view)

        const onLoad = this.#onLoad.bind(this)
        const onRelocate = this.#onRelocate.bind(this)
        this.view.addEventListener('load', onLoad)
        this.view.addEventListener('relocate', onRelocate)

        try {
            await this.view.open(file)
        } catch (e) {
            console.error('[foliate reader] view.open failed', e)
            throw e
        }

        const { book } = this.view
        console.log('[foliate reader] book ready', {
            title: book.metadata?.title,
            sections: book.sections?.length,
        })

        book.transformTarget?.addEventListener('data', ({ detail }) => {
            detail.data = Promise.resolve(detail.data).catch(e => {
                console.error(new Error(`Failed to load ${detail.name}`, { cause: e }))
                return ''
            })
        })

        const renderer = this.view.renderer
        if (renderer.tagName !== 'FOLIATE-PAGINATOR')
            els.layoutSelectWrap?.style.setProperty('display', 'none')

        const savedDisplayMode = localStorage.getItem('bookly:csDisplayMode')
        if (savedDisplayMode === 'book' || savedDisplayMode === 'full') this.#csDisplayMode = savedDisplayMode

        this.setReadingMode(this.#readingModeFromState())
        this.#applyChromeStyles()

        await new Promise(resolve => {
            requestAnimationFrame(() => requestAnimationFrame(resolve))
        })

        const cfiParam = params.get('cfi')

        if (this.continuousScroll) {
            let startIndex = 0
            if (cfiParam) {
                try {
                    const resolved = this.view.resolveNavigation(cfiParam)
                    startIndex = resolved?.index ?? 0
                    this.#lastSyncedCfi = cfiParam
                    console.log('[CS] restored to chapter index:', startIndex, 'from CFI:', cfiParam)
                } catch (e) {
                    console.warn('[CS] CFI resolution failed, starting from chapter 0', e)
                    this.#showToast('Reading progress could not be restored. Starting from beginning.')
                    window.parent.postMessage({ type: 'bookly:restore-failed' }, '*')
                }
            }

            if (startIndex > 0) {
                await this.#csManager.appendChaptersUpTo(startIndex)
                this.#csManager.scrollToChapterIndex(startIndex)
            }

            try {
                if (cfiParam) await this.view.init({ lastLocation: cfiParam })
                else await this.view.init({ showTextStart: true })
            } catch (e) {
                console.warn('[CS] ghost view init failed (non-critical)', e)
                try { await this.view.init({}) } catch { }
            }
        } else {
            let restored = false

            if (cfiParam) {
                try {
                    await this.view.init({ lastLocation: cfiParam })
                    console.log('[foliate reader] restored CFI:', cfiParam)
                    restored = true
                    this.#lastSyncedCfi = cfiParam
                } catch (e) {
                    console.warn('[foliate reader] CFI restore failed, starting from beginning', e)
                    this.#showToast('Reading progress could not be restored. Starting from beginning.')
                    window.parent.postMessage({ type: 'bookly:restore-failed' }, '*')
                }
            }

            if (!restored) {
                try {
                    await this.view.init({ showTextStart: true })
                    console.log('[foliate reader] view.init({ showTextStart: true }) done')
                } catch (e) {
                    console.warn('[foliate reader] init showTextStart failed, using default next()', e)
                    try {
                        await this.view.init({})
                        console.log('[foliate reader] view.init({}) done')
                    } catch (e2) {
                        console.error('[foliate reader] view.init failed', e2)
                        throw e2
                    }
                }
            }
        }

        // Initialise annotation listeners now that view is ready
        this.#annotation.initAnnotationViewListeners()
        this.#annotation.initAnnotationListener()
        this.#notifyReaderReady()

        // ── View-mode toggle (book / full) — all reading modes ────────────────
        if (els.csViewModeBtn) {
            els.csViewModeBtn.onclick = () =>
                this.#setCsDisplayMode(this.#csDisplayMode === 'book' ? 'full' : 'book')
        }

        // ── Keyboard navigation ────────────────────────────────────────────────
        document.addEventListener('keydown', this.#handleKeydown.bind(this))

        // ── Close button ──────────────────────────────────────────────────────
        const returnUrl = params.get('return') ?? '/library'
        els.closeButton?.addEventListener('click', () => {
            const idx = this.continuousScroll && this.#csManager ? this.#csManager.currentChapterIndex : -1
            let cfi = null
            let progress = 0
            if (this.continuousScroll && idx >= 0) {
                cfi = this.view?.getCFI?.(idx, null)
                const total = this.view?.book?.sections?.length || 1
                progress = Math.round((idx / (total - 1 || 1)) * 10000) / 100
            } else {
                const loc = this.view?.lastLocation
                cfi = loc?.cfi
                progress = Math.round((loc?.fraction ?? 0) * 10000) / 100
            }

            if (window.parent !== window) {
                window.parent.postMessage({
                    type: 'bookly:close',
                    cfi,
                    progress,
                    updatedAt: new Date().toISOString(),
                    returnUrl
                }, '*')
            } else {
                this.#flushProgressSync()
                window.location.assign(returnUrl)
            }
        })

        // ── Touch top-bar reveal ──────────────────────────────────────────────
        document.addEventListener('touchstart', e => {
            const t = e.changedTouches[0]
            if (!t) return
            if (t.clientY < 72) this.#peekTopBar()
        }, { passive: true })

        // ── Bookmark button (toggle) ─────────────────────────────────────────
        els.bookmarkButton?.addEventListener('click', () => {
            if (this.#bookmark.hasBookmark || this.#bookmark.deferredBookmarks.length > 0) {
                this.#bookmark.removeBookmark()
                this.#updateBookmarkButtonState(false)
                this.#showToast('Bookmark removed.')
            } else {
                let cfi = this.view?.lastLocation?.cfi
                let chapterWrapper = null

                if (this.continuousScroll && this.#csManager) {
                    const idx = this.#csManager.currentChapterIndex
                    if (idx >= 0) {
                        chapterWrapper = this.#csManager.getChapterWrapper(idx)
                        const range = this.#bookmark.getRangeAtViewportCenter(chapterWrapper)
                        cfi = this.view?.getCFI?.(idx, range) ?? cfi
                    }
                }
                if (!cfi) return

                const yOffset = this.#bookmark.getInitialYOffset(chapterWrapper)
                const tempId = `temp-${Date.now()}`

                this.#bookmark.renderBookmarkStrip(tempId, yOffset, cfi, chapterWrapper)
                this.#bookmark.setPendingCreateCfi(cfi)
                window.parent.postMessage({ type: 'bookly:bookmark-create', cfi, yOffset }, '*')
                this.#updateBookmarkButtonState(true)
                this.#showToast('Bookmark saved.')
                this.#peekTopBar(1500)
            }
        })

        // ── Before unload ─────────────────────────────────────────────────────
        window.addEventListener('beforeunload', () => this.#flushProgressSync())

        // ── Metadata display ──────────────────────────────────────────────────
        const title = formatLanguageMap(book.metadata?.title) || 'Untitled Book'
        document.title = title
        if (els.sideBarTitle) els.sideBarTitle.innerText = title
        if (els.sideBarAuthor) els.sideBarAuthor.innerText = formatContributor(book.metadata?.author)
        Promise.resolve(book.getCover?.())
            ?.then(blob =>
                blob
                    ? (els.sideBarCover.src = URL.createObjectURL(blob))
                    : null)
            .catch(e => console.warn('[foliate reader] cover failed', e))

        this.#fillBookInfoDialog(book)
        this.#initTocSidebar(book)

        // ── Calibre bookmarks (optional) ──────────────────────────────────────
        const bookmarks = await book.getCalibreBookmarks?.()
        if (bookmarks) {
            const { fromCalibreHighlight } = await import('./epubcfi.js')
            for (const obj of bookmarks) {
                if (obj.type === 'highlight') {
                    const value = fromCalibreHighlight(obj)
                    const color = obj.style.which
                    const note = obj.notes
                    const annotation = { value, color, note }
                    const list = this.annotations.get(obj.spine_index)
                    if (list) list.push(annotation)
                    else this.annotations.set(obj.spine_index, [annotation])
                    this.#annotation.annotationsByValue.set(value, annotation)
                }
            }
        }

        // Re-register listeners (idempotent guards inside each method)
        this.#annotation.initAnnotationViewListeners()
        this.#annotation.initAnnotationListener()

        if (!this.continuousScroll) {
            this.#paginated.updateContinuousScrollListeners()
            this.#paginated.attachContinuousContainerScroll()
        }

        this.#notifyReaderReady()
    }

    // ── Keyboard handler ──────────────────────────────────────────────────────

    #handleKeydown(event) {
        const k = event.key
        if (this.continuousScroll) {
            const csOuter = els.csOuter
            if (k === 'ArrowDown' || k === 'j' || k === 'ArrowRight' || k === 'l') {
                csOuter?.scrollBy({ top: 120, behavior: 'smooth' })
            } else if (k === 'ArrowUp' || k === 'k' || k === 'ArrowLeft' || k === 'h') {
                csOuter?.scrollBy({ top: -120, behavior: 'smooth' })
            } else if (k === 'Escape') {
                this.closeSideBar()
            }
        } else {
            if (k === 'ArrowLeft' || k === 'h') this.view.goLeft()
            else if (k === 'ArrowRight' || k === 'l') this.view.goRight()
            else if (k === 'Escape') this.closeSideBar()
        }
    }

    // ── Load / relocate handlers ───────────────────────────────────────────────

    #onLoad({ detail: { doc, index } }) {
        doc.addEventListener('keydown', this.#handleKeydown.bind(this))
        if (!this.continuousScroll) {
            this.#paginated.attachContinuousScrollListenersToDoc(doc)
            this.#paginated.attachContinuousContainerScroll()
        }
        this.#annotation.attachSelectionHandlerToDoc(doc, index)
    }

    #onRelocate({ detail }) {
        const { fraction, location, tocItem, pageItem, cfi } = detail
        const percent = percentFormat.format(fraction ?? 0)
        const loc = pageItem?.label
            ? `Page ${pageItem.label}`
            : `Loc ${location?.current ?? '—'}`
        const baseTitle = formatLanguageMap(this.view.book.metadata?.title) || 'Untitled Book'
        document.title = `${percent} · ${loc} — ${baseTitle}`
        if (tocItem?.href) this.#tocPanel?.setActiveHref?.(tocItem.href)

        if (cfi) {
            this.#debouncedProgressSync(cfi, fraction)
        }
    }

    // ── Book info dialog ──────────────────────────────────────────────────────

    #fillBookInfoDialog(book) {
        const body = els.bookInfoDialogBody
        try {
            const meta = book.metadata
            const lines = []
            const t = formatLanguageMap(meta?.title)
            if (t) lines.push(`Title: ${t}`)
            const auth = formatContributor(meta?.author)
            if (auth) lines.push(`Author: ${auth}`)
            const pub = asMetadataList(meta?.publisher)
                .map(formatOneContributor)
                .filter(Boolean)
            if (pub.length) lines.push(`Publisher: ${pub.join(', ')}`)
            const lang = Array.isArray(meta?.language) ? meta.language[0] : meta?.language
            if (lang) lines.push(`Language: ${lang}`)
            if (meta?.identifier) {
                const idStr = typeof meta.identifier === 'string'
                    ? meta.identifier
                    : String(meta.identifier)
                if (idStr) lines.push(`Identifier: ${idStr}`)
            }
            const rawDesc = meta?.description
            const desc = !rawDesc
                ? ''
                : typeof rawDesc === 'string'
                    ? rawDesc
                    : formatLanguageMap(rawDesc)
            if (desc?.trim()) lines.push(`\n${desc.trim()}`)
            body.textContent = lines.join('\n\n').trim() || 'No details available.'
        } catch (e) {
            console.warn('[foliate reader] book info dialog failed', e)
            if (body) body.textContent = 'No details available.'
        }
    }
}

// ── Global entry point ────────────────────────────────────────────────────────

const open = async file => {
    els.dropTarget && document.body.removeChild(els.dropTarget)
    const reader = new Reader()
    globalThis.reader = reader
    await reader.open(file)
}

const dragOverHandler = e => e.preventDefault()
const dropHandler = e => {
    e.preventDefault()
    const item = Array.from(e.dataTransfer.items)
        .find(item => item.kind === 'file')
    if (item) {
        const entry = item.webkitGetAsEntry()
        open(entry.isFile ? item.getAsFile() : entry).catch(e => console.error(e))
    }
}
els.dropTarget?.addEventListener('drop', dropHandler)
els.dropTarget?.addEventListener('dragover', dragOverHandler)

els.fileInput?.addEventListener('change', e =>
    open(e.target.files[0]).catch(e => console.error(e)))
els.fileButton?.addEventListener('click', () => els.fileInput?.click())

const params = new URLSearchParams(location.search)
const url = params.get('url')
if (url) open(url).catch(e => console.error('[foliate reader] open from URL failed', e))
else if (els.dropTarget) els.dropTarget.style.visibility = 'visible'
