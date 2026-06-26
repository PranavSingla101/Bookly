const createSVGElementDefault = tag =>
    document.createElementNS('http://www.w3.org/2000/svg', tag)

export class Overlayer {
    #doc
    #svg
    #map = new Map()
    constructor(doc = document) {
        this.#doc = doc
        this.#svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg')
        Object.assign(this.#svg.style, {
            position: 'absolute', top: '0', left: '0',
            width: '100%', height: '100%',
            pointerEvents: 'none',
            zIndex: '10',
        })
    }
    get element() {
        return this.#svg
    }
    #createSVGElement(tag) {
        return this.#doc.createElementNS('http://www.w3.org/2000/svg', tag)
    }
    add(key, range, draw, options) {
        if (this.#map.has(key)) this.remove(key)
        if (typeof range === 'function') range = range(this.#svg.getRootNode())
        const win = this.#doc.defaultView
        const scrollX = win ? (win.scrollX || this.#doc.documentElement.scrollLeft || this.#doc.body?.scrollLeft || 0) : 0
        const scrollY = win ? (win.scrollY || this.#doc.documentElement.scrollTop || this.#doc.body?.scrollTop || 0) : 0
        const rects = Array.from(range.getClientRects()).filter(r => r.width > 0 && r.height > 0).map(r => ({
            left: r.left + scrollX,
            top: r.top + scrollY,
            right: r.right + scrollX,
            bottom: r.bottom + scrollY,
            width: r.width,
            height: r.height
        }))
        const element = draw(rects, options, tag => this.#createSVGElement(tag))
        this.#svg.append(element)
        this.#map.set(key, { range, draw, options, element, rects })
    }
    remove(key) {
        if (!this.#map.has(key)) return
        this.#svg.removeChild(this.#map.get(key).element)
        this.#map.delete(key)
    }
    clear() {
        for (const { element } of this.#map.values())
            this.#svg.removeChild(element)
        this.#map.clear()
    }
    getRects(key) {
        return this.#map.get(key)?.rects ?? null
    }
    redraw() {
        const win = this.#doc.defaultView
        const scrollX = win ? (win.scrollX || this.#doc.documentElement.scrollLeft || this.#doc.body?.scrollLeft || 0) : 0
        const scrollY = win ? (win.scrollY || this.#doc.documentElement.scrollTop || this.#doc.body?.scrollTop || 0) : 0
        for (const obj of this.#map.values()) {
            const { range, draw, options, element } = obj
            this.#svg.removeChild(element)
            const rects = Array.from(range.getClientRects()).filter(r => r.width > 0 && r.height > 0).map(r => ({
                left: r.left + scrollX,
                top: r.top + scrollY,
                right: r.right + scrollX,
                bottom: r.bottom + scrollY,
                width: r.width,
                height: r.height
            }))
            const el = draw(rects, options, tag => this.#createSVGElement(tag))
            this.#svg.append(el)
            obj.element = el
            obj.rects = rects
        }
    }
    hitTest({ x, y }) {
        const win = this.#doc.defaultView
        const scrollX = win ? (win.scrollX || this.#doc.documentElement.scrollLeft || this.#doc.body?.scrollLeft || 0) : 0
        const scrollY = win ? (win.scrollY || this.#doc.documentElement.scrollTop || this.#doc.body?.scrollTop || 0) : 0
        const absX = x + scrollX
        const absY = y + scrollY
        const arr = Array.from(this.#map.entries())
        // loop in reverse to hit more recently added items first
        for (let i = arr.length - 1; i >= 0; i--) {
            const [key, obj] = arr[i]
            for (const { left, top, right, bottom } of obj.rects)
                if (top <= absY && left <= absX && bottom > absY && right > absX)
                    return [key, obj.range]
        }
        return []
    }
    static underline(rects, options = {}, createSVGElement = createSVGElementDefault) {
        const { color = 'red', width: strokeWidth = 2, writingMode } = options
        const g = createSVGElement('g')
        g.setAttribute('fill', color)
        if (writingMode === 'vertical-rl' || writingMode === 'vertical-lr')
            for (const { right, top, height } of rects) {
                const el = createSVGElement('rect')
                el.setAttribute('x', right - strokeWidth)
                el.setAttribute('y', top)
                el.setAttribute('height', height)
                el.setAttribute('width', strokeWidth)
                g.append(el)
            }
        else for (const { left, bottom, width } of rects) {
            const el = createSVGElement('rect')
            el.setAttribute('x', left)
            el.setAttribute('y', bottom - strokeWidth)
            el.setAttribute('height', strokeWidth)
            el.setAttribute('width', width)
            g.append(el)
        }
        return g
    }
    static strikethrough(rects, options = {}, createSVGElement = createSVGElementDefault) {
        const { color = 'red', width: strokeWidth = 2, writingMode } = options
        const g = createSVGElement('g')
        g.setAttribute('fill', color)
        if (writingMode === 'vertical-rl' || writingMode === 'vertical-lr')
            for (const { right, left, top, height } of rects) {
                const el = createSVGElement('rect')
                el.setAttribute('x', (right + left) / 2)
                el.setAttribute('y', top)
                el.setAttribute('height', height)
                el.setAttribute('width', strokeWidth)
                g.append(el)
            }
        else for (const { left, top, bottom, width } of rects) {
            const el = createSVGElement('rect')
            el.setAttribute('x', left)
            el.setAttribute('y', (top + bottom) / 2)
            el.setAttribute('height', strokeWidth)
            el.setAttribute('width', width)
            g.append(el)
        }
        return g
    }
    static squiggly(rects, options = {}, createSVGElement = createSVGElementDefault) {
        const { color = 'red', width: strokeWidth = 2, writingMode } = options
        const g = createSVGElement('g')
        g.setAttribute('fill', 'none')
        g.setAttribute('stroke', color)
        g.setAttribute('stroke-width', strokeWidth)
        const block = strokeWidth * 1.5
        if (writingMode === 'vertical-rl' || writingMode === 'vertical-lr')
            for (const { right, top, height } of rects) {
                const el = createSVGElement('path')
                const n = Math.round(height / block / 1.5)
                const inline = height / n
                const ls = Array.from({ length: n },
                    (_, i) => `l${i % 2 ? -block : block} ${inline}`).join('')
                el.setAttribute('d', `M${right} ${top}${ls}`)
                g.append(el)
            }
        else for (const { left, bottom, width } of rects) {
            const el = createSVGElement('path')
            const n = Math.round(width / block / 1.5)
            const inline = width / n
            const ls = Array.from({ length: n },
                (_, i) => `l${inline} ${i % 2 ? block : -block}`).join('')
            el.setAttribute('d', `M${left} ${bottom}${ls}`)
            g.append(el)
        }
        return g
    }
    static highlight(rects, options = {}, createSVGElement = createSVGElementDefault) {
        const { color = 'red' } = options
        const g = createSVGElement('g')
        g.setAttribute('fill', color)
        g.style.opacity = 'var(--overlayer-highlight-opacity, .3)'
        g.style.mixBlendMode = 'var(--overlayer-highlight-blend-mode, normal)'
        for (const { left, top, height, width } of rects) {
            const el = createSVGElement('rect')
            el.setAttribute('x', left)
            el.setAttribute('y', top)
            el.setAttribute('height', height)
            el.setAttribute('width', width)
            g.append(el)
        }
        return g
    }
    static outline(rects, options = {}, createSVGElement = createSVGElementDefault) {
        const { color = 'red', width: strokeWidth = 3, radius = 3 } = options
        const g = createSVGElement('g')
        g.setAttribute('fill', 'none')
        g.setAttribute('stroke', color)
        g.setAttribute('stroke-width', strokeWidth)
        for (const { left, top, height, width } of rects) {
            const el = createSVGElement('rect')
            el.setAttribute('x', left)
            el.setAttribute('y', top)
            el.setAttribute('height', height)
            el.setAttribute('width', width)
            el.setAttribute('rx', radius)
            g.append(el)
        }
        return g
    }
    static copyImage([rect], options = {}, createSVGElement = createSVGElementDefault) {
        const { src } = options
        const image = createSVGElement('image')
        const { left, top, height, width } = rect
        image.setAttribute('href', src)
        image.setAttribute('x', left)
        image.setAttribute('y', top)
        image.setAttribute('height', height)
        image.setAttribute('width', width)
        return image
    }
}
