/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'pdfjs-dist' {
  export const version: string

  export interface GlobalWorkerOptions {
    workerSrc: string | null
    workerPort?: any
  }

  export const GlobalWorkerOptions: GlobalWorkerOptions

  export interface PDFDocumentProxy {
    numPages: number
    getPage(pageNumber: number): Promise<PDFPageProxy>
    getOutline(): Promise<Outline[]>
    getMetadata(): Promise<Record<string, any>>
    cleanup(): void
    destroy(): void
  }

  export interface PDFPageProxy {
    pageNumber: number
    rotate: number
    view: number[]
    getViewport(options: GetViewportOptions): PageViewport
    render(renderContext: RenderParameters): RenderTask
    getTextContent(): Promise<TextContent>
    cleanup(): void
  }

  export interface GetViewportOptions {
    scale?: number
    rotation?: number
    offsetX?: number
    offsetY?: number
    dontFlip?: boolean
  }

  export interface PageViewport {
    readonly viewBox: number[]
    readonly scale: number
    readonly rotation: number
    readonly offsetX: number
    readonly offsetY: number
    readonly width: number
    readonly height: number
    transform(arg: number[]): number[]
    clone(options?: GetViewportOptions): PageViewport
  }

  export interface RenderParameters {
    canvasContext: CanvasRenderingContext2D
    viewport: PageViewport
    intent?: string
    annotationMode?: number
    transform?: number[]
    background?: string
  }

  export interface RenderTask {
    promise: Promise<void>
    cancel(): void
  }

  export interface TextContent {
    items: TextItem[]
  }

  export interface TextItem {
    str: string
    dir?: string
    width?: number
    height?: number
    transform?: number[]
    fontName?: string
    hasEOL?: boolean
  }

  export interface Outline {
    title: string
    dest: any
    url?: string
    count?: number
    items?: Outline[]
  }

  export interface GetDocumentParameters {
    url?: string
    data?: ArrayBuffer | Uint8Array
    httpHeaders?: Record<string, string>
    withCredentials?: boolean
    password?: string
    workerPort?: any
  }

  export function getDocument(parameters: GetDocumentParameters): Promise<PDFDocumentProxy>
}
