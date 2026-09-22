import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize, AlertCircle } from 'lucide-react';
import { loadDB } from '../lib/db';
import type { DocItem, Exam } from '../lib/types';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
// Enregistre le "fake worker" pdf.js sur le thread principal (via globalThis.pdfjsWorker).
// Même instance que l'API react-pdf (pdfjs-dist 4.8.69 dédupliqué) : aucune divergence de
// version possible, aucun fichier worker externe requis (fiable en dev ET en build single-file).
import 'pdfjs-dist/build/pdf.worker.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = '';

export default function PdfViewer() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1);
  const [fitWidth, setFitWidth] = useState<number>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const db = loadDB();
  const doc = db.documents?.find((d) => d.slug === slug) || db.exams?.find((e) => e.slug === slug);

  const isDoc = doc ? 'fileUrl' in doc : false;
  const fileUrl = isDoc && doc ? (doc as DocItem).fileUrl : doc ? (doc as Exam).pdfUrl : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Ajuste automatiquement la largeur du PDF à la zone visible (resize + plein écran inclus)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setFitWidth(Math.max(240, el.clientWidth - 48));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (fileUrl) console.info('[PdfViewer] slug:', slug, '| fileUrl:', fileUrl);
  }, [slug, fileUrl]);

  if (!doc) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-slate-900">
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center shadow-2xl">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-xl font-bold text-white">Document introuvable</h2>
          <p className="mt-2 text-slate-400">Ce document n'existe pas ou a été retiré.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0956B4]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        </div>
      </div>
    );
  }

  const isWordOrPpt = Boolean(
    (doc as any).fileName?.match(/\.(doc|docx|ppt|pptx)$/i) ||
    (doc as any).fileType?.match(/(word|powerpoint|presentation|msword)/i)
  );

  if (isWordOrPpt) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-slate-900">
        <div className="max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center shadow-2xl">
          <AlertCircle className="mx-auto h-12 w-12 text-[#0B63CE]" />
          <h2 className="mt-4 text-xl font-bold text-white">Format non supporté par le lecteur PDF</h2>
          <p className="mt-2 text-sm text-slate-400">
            Ce document est au format Word ou PowerPoint (<strong>{(doc as any).fileName || 'Document'}</strong>).
            Le lecteur intégré est optimisé pour les fichiers PDF.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0956B4]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        </div>
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-slate-900">
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center shadow-2xl">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-xl font-bold text-white">Document non disponible</h2>
          <p className="mt-2 text-slate-400">Ce document PDF n'est pas encore disponible.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0956B4]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        </div>
      </div>
    );
  }

  const onDocumentLoadSuccess = ({ numPages: pages }: { numPages: number }) => {
    console.info('[PdfViewer] PDF chargé :', pages, 'page(s)');
    setNumPages(pages);
    setPageNumber(1);
    setZoom(1);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));

  const toggleFullScreen = () => {
    if (!document.fullscreenElement && scrollRef.current) {
      scrollRef.current.requestFullscreen().catch((err) => {
        console.error("Erreur lors du passage en plein écran", err);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  const goPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages || 1));

  return (
    <div className="flex h-dvh w-full max-w-full flex-col overflow-hidden bg-slate-900">
      {/* Barre d'outils */}
      <header className="z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 px-2 sm:h-16 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-2.5 sm:px-3 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden md:inline">Retour</span>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-white sm:text-base">{doc.title}</h1>
            <p className="hidden truncate text-[11px] text-slate-400 sm:block">
              {(doc as any).organizationName}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Zoom + / - */}
          <div className="flex items-center rounded-lg bg-slate-800 p-1">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40"
              title="Dézoomer"
              aria-label="Dézoomer"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="hidden w-12 text-center text-xs font-bold text-slate-300 sm:block">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40"
              title="Zoomer"
              aria-label="Zoomer"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden h-6 w-px bg-slate-800 sm:block"></div>

          {/* Plein écran */}
          <button
            onClick={toggleFullScreen}
            className="flex h-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 px-2.5 sm:px-3 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-700"
            title="Plein écran"
            aria-label="Plein écran"
          >
            <Maximize className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden lg:inline">Plein écran</span>
          </button>
        </div>
      </header>

      {/* Zone d'affichage du PDF : pleine largeur, centrée, sans marge énorme */}
      <div ref={scrollRef} className="flex-1 overflow-auto bg-slate-900">
        <div className="flex min-h-full items-start justify-center p-3 sm:p-6">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(err) => {
              console.error('[PdfViewer] Échec de chargement pdf.js :', err);
              if (typeof err === 'object' && err !== null && (err as any)?.name === 'UnknownErrorException') {
                console.error('[PdfViewer] Conflit de version API/Worker pdf.js : assurez-vous que pdfjs-dist et le worker sont identiques (4.8.69).');
              }
            }}
            loading={
              <div className="flex min-h-[50vh] items-center justify-center py-10">
                <span className="text-slate-400 font-medium">Chargement du document…</span>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <AlertCircle className="mb-3 h-10 w-10 text-red-500" />
                <p className="font-medium text-red-400">Impossible de charger ce PDF.</p>
                <p className="mt-1 text-sm text-red-400/80">Le fichier est peut-être corrompu ou inaccessible.</p>
              </div>
            }
            className="flex flex-col items-center"
          >
            <Page
              pageNumber={pageNumber}
              width={fitWidth ? fitWidth * zoom : undefined}
              renderTextLayer
              renderAnnotationLayer
              className="max-w-full shadow-2xl"
            />
          </Document>
        </div>
      </div>

      {/* Barre de pagination en bas (uniquement si le document est chargé) */}
      {numPages && (
        <footer className="flex h-12 shrink-0 items-center justify-center gap-4 border-t border-slate-800 bg-slate-950">
          <button
            onClick={goPrevPage}
            disabled={pageNumber <= 1}
            className="flex h-8 shrink-0 items-center justify-center rounded-md bg-slate-800 px-3 sm:px-4 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-30"
          >
            Précédent
          </button>
          <span className="w-24 text-center text-sm font-bold text-slate-400">
            Page {pageNumber} / {numPages}
          </span>
          <button
            onClick={goNextPage}
            disabled={pageNumber >= numPages}
            className="flex h-8 shrink-0 items-center justify-center rounded-md bg-slate-800 px-3 sm:px-4 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-30"
          >
            Suivant
          </button>
        </footer>
      )}
    </div>
  );
}