// reader-elements.js — single registry of all DOM elements used by the reader.
// Populated at ES module evaluation time, which is guaranteed to run after HTML
// parsing completes. Each value is the live element or null if not found in the
// DOM; callers guard with optional chaining (?.), never try/catch.

const q = id => document.getElementById(id)

export const els = Object.freeze({
    // ── Chrome (top bar) ─────────────────────────────────────────────────────
    readerTopBar:       q('reader-top-bar'),
    sideBarButton:      q('side-bar-button'),
    aaSettingsButton:   q('aa-settings-button'),
    menuButton:         q('menu-button'),
    layoutTrigger:      q('reader-layout-trigger'),
    layoutTriggerValue: q('reader-layout-trigger-value'),
    layoutListbox:      q('reader-layout-listbox'),
    layoutMode:         q('reader-layout-mode'),
    layoutSelectWrap:   q('reader-layout-select-wrap'),
    closeButton:        q('close-button'),
    bookmarkButton:     q('bookmark-button'),
    csViewModeBtn:      q('cs-view-mode-btn'),
    csIconBook:         q('cs-icon-book'),
    csIconFull:         q('cs-icon-full'),

    // ── Reading surfaces ──────────────────────────────────────────────────────
    foliatMount:        q('foliate-mount'),
    csOuter:            q('cs-outer'),
    csChapters:         q('cs-chapters'),
    modeSwitchOverlay:  q('reader-mode-switch-overlay'),

    // ── Sidebar ───────────────────────────────────────────────────────────────
    sideBar:            q('side-bar'),
    dimmingOverlay:     q('dimming-overlay'),
    sideBarTitle:       q('side-bar-title'),
    sideBarAuthor:      q('side-bar-author'),
    sideBarCover:       q('side-bar-cover'),
    sideBarInfo:        q('side-bar-info'),
    tabToc:             q('sidebar-tab-toc'),
    tabHighlights:      q('sidebar-tab-highlights'),
    tocView:            q('toc-view'),
    highlightsView:     q('highlights-view'),

    // ── Dialogs ───────────────────────────────────────────────────────────────
    bookInfoDialog:     q('book-info-dialog'),
    bookInfoDialogClose:q('book-info-dialog-close'),
    bookInfoDialogBody: q('book-info-dialog-body'),
    noteInputDialog:    q('note-input-dialog'),
    noteInputTextarea:  q('note-input-textarea'),

    // ── Toast ─────────────────────────────────────────────────────────────────
    readerToast:        q('reader-toast'),

    // ── Drop target (file open) ───────────────────────────────────────────────
    dropTarget:         q('drop-target'),
    fileInput:          q('file-input'),
    fileButton:         q('file-button'),
})
