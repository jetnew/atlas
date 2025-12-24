import { useState, useEffect, useMemo } from 'react';
import { createPluginRegistration } from '@embedpdf/core';
import { EmbedPDF } from '@embedpdf/core/react';
import { usePdfiumEngine } from '@embedpdf/engines/react';

// Import the essential plugins
import { Viewport, ViewportPluginPackage } from '@embedpdf/plugin-viewport/react';
import { Scroller, ScrollPluginPackage } from '@embedpdf/plugin-scroll/react';
import {
  DocumentContent,
  DocumentManagerPluginPackage,
} from '@embedpdf/plugin-document-manager/react';
import { RenderLayer, RenderPluginPackage } from '@embedpdf/plugin-render/react';
import { ZoomPluginPackage, ZoomMode } from '@embedpdf/plugin-zoom/react';
import { getFileUrl } from '@/lib/supabase/storage';

interface PdfViewerProps {
  storagePath: string;
}

export const PdfViewer = ({ storagePath }: PdfViewerProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Initialize the engine with the React hook
  const { engine, isLoading: isEngineLoading } = usePdfiumEngine();

  // Fetch signed URL when storagePath changes
  useEffect(() => {
    let cancelled = false;

    async function fetchSignedUrl() {
      setPdfUrl(null);
      setUrlError(null);

      try {
        const signedUrl = await getFileUrl(storagePath);
        if (cancelled) return;

        if (signedUrl) {
          setPdfUrl(signedUrl);
        } else {
          setUrlError('Failed to get PDF URL');
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching signed URL:', error);
        setUrlError(error instanceof Error ? error.message : 'Failed to load PDF');
      }
    }

    fetchSignedUrl();

    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  // Create plugins with the signed URL
  const plugins = useMemo(() => {
    if (!pdfUrl) return null;

    return [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: pdfUrl }],
      }),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(ScrollPluginPackage),
      createPluginRegistration(RenderPluginPackage),
      createPluginRegistration(ZoomPluginPackage, {
        defaultZoomLevel: ZoomMode.FitWidth,
      }),
    ];
  }, [pdfUrl]);

  if (urlError) {
    return <div className="p-4 text-destructive">{urlError}</div>;
  }

  if (isEngineLoading || !engine || !pdfUrl || !plugins) {
    return null;
  }

  // Wrap UI with the <EmbedPDF> provider
  return (
    <div className="h-full">
      <EmbedPDF engine={engine} plugins={plugins}>
        {({ activeDocumentId }) =>
          activeDocumentId && (
            <DocumentContent documentId={activeDocumentId}>
              {({ isLoaded }) =>
                isLoaded && (
                  <Viewport
                    documentId={activeDocumentId}
                    style={{
                      backgroundColor: '#f1f3f5',
                    }}
                  >
                    <Scroller
                      documentId={activeDocumentId}
                      renderPage={({ width, height, pageIndex }) => (
                        <div style={{ width, height }}>
                          {/* The RenderLayer is responsible for drawing the page */}
                          <RenderLayer
                            documentId={activeDocumentId}
                            pageIndex={pageIndex}
                          />
                        </div>
                      )}
                    />
                  </Viewport>
                )
              }
            </DocumentContent>
          )
        }
      </EmbedPDF>
    </div>
  );
};