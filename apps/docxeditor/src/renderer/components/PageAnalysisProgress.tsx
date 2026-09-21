import { useI18n } from '../i18n/locale'
import type { AnalysisProgressInfo } from '../services/page-analyzer'

export interface PageAnalysisProgressProps {
  progress: AnalysisProgressInfo
  onCancel: () => void
  onDismiss?: () => void
}

export function PageAnalysisProgress({
  progress,
  onCancel,
  onDismiss,
}: PageAnalysisProgressProps) {
  const { t } = useI18n()

  const percent =
    progress.totalPages > 0
      ? Math.round((progress.currentPage / progress.totalPages) * 100)
      : 0

  const isCompleted = progress.status === 'completed'
  const isError = progress.status === 'error'
  const isCancelled = progress.status === 'cancelled'
  const isRunning = progress.status === 'running'

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '36px',
        right: '24px',
        zIndex: 1040,
        width: '380px',
        maxWidth: 'calc(100vw - 48px)',
        background: 'var(--panel-bg, rgba(28, 30, 36, 0.95))',
        backdropFilter: 'blur(16px)',
        border: isError
          ? '1px solid #e74c3c'
          : isCompleted
            ? '1px solid #2ecc71'
            : '1px solid var(--border-color, rgba(255, 255, 255, 0.18))',
        borderRadius: '10px',
        padding: '14px 16px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
        color: 'var(--text-color, #fff)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        animation: 'slideUp 0.25s ease-out',
      }}
    >
      {/* Header & Status message */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>
            {isRunning ? '✨' : isCompleted ? '✅' : isError ? '⚠️' : '⏹️'}
          </span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>
              {isRunning
                ? `${t('pageAnalysisRunning') || 'Menganalisis Halaman'} ${progress.pageNumber} (${progress.currentPage}/${progress.totalPages})`
                : isCompleted
                  ? t('pageAnalysisCompleted') || 'Analisis Halaman Selesai'
                  : isError
                    ? t('pageAnalysisError') || 'Terjadi Masalah Analisis'
                    : t('pageAnalysisCancelled') || 'Analisis Dibatalkan'}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.75 }}>
              {progress.commentsAddedCount} {t('pageAnalysisCommentsAdded') || 'komentar disematkan'}
            </div>
          </div>
        </div>

        {/* Action Button */}
        {isRunning ? (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(231, 76, 60, 0.2)',
              color: '#ff6b6b',
              cursor: 'pointer',
              fontSize: '11.5px',
              fontWeight: 500,
            }}
          >
            Batal
          </button>
        ) : (
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '16px',
              opacity: 0.7,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div
          style={{
            height: '4px',
            borderRadius: '2px',
            background: 'rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${percent}%`,
              background: 'linear-gradient(90deg, #0078d4, #00c6ff)',
              borderRadius: '2px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}

      {/* Error detail if any */}
      {isError && progress.errorMessage && (
        <div
          style={{
            fontSize: '11px',
            color: '#ff6b6b',
            background: 'rgba(231, 76, 60, 0.1)',
            padding: '6px 8px',
            borderRadius: '4px',
          }}
        >
          {progress.errorMessage}
        </div>
      )}
    </div>
  )
}
