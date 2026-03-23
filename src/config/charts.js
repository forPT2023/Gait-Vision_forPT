export const CHART_STREAMING_CONFIG = {
  duration: 20000,
  refresh: 1000,
  delay: 0,
  frameRate: 2,
  pause: true,
  updateIntervalMs: 200
};

export const CHART_DEFINITIONS = {
  speed: {
    elementId: 'chart-speed',
    datasets: [{ label: '歩行速度 (m/s)', borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' }],
    y: { min: 0, max: 2.5 }
  },
  cadence: {
    elementId: 'chart-cadence',
    datasets: [{ label: 'ケイデンス (steps/min)', borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }],
    y: { min: 60, max: 160 }
  },
  symmetry: {
    elementId: 'chart-symmetry',
    datasets: [{ label: '対称性指数 (%)', borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)' }],
    y: { min: 0, max: 110 }
  },
  trunk: {
    elementId: 'chart-trunk',
    datasets: [{ label: '体幹傾斜 (度)', borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }],
    y: { min: 0, max: 30 }
  },
  knee: {
    elementId: 'chart-knee',
    datasets: [
      { label: '左膝関節 (度)', borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' },
      { label: '右膝関節 (度)', borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)' }
    ],
    y: { min: 0, max: 90 }
  },
  hip: {
    elementId: 'chart-hip',
    datasets: [
      { label: '左股関節 (度)', borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
      { label: '右股関節 (度)', borderColor: '#14b8a6', backgroundColor: 'rgba(20, 184, 166, 0.1)' }
    ],
    y: { min: 0, max: 80 }
  },
  ankle: {
    elementId: 'chart-ankle',
    datasets: [
      { label: '左足首 (度)', borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)' },
      { label: '右足首 (度)', borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.1)' }
    ],
    y: { min: 60, max: 140 }
  },
  pelvis: {
    elementId: 'chart-pelvis',
    datasets: [{ label: '骨盤傾斜 (度)', borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }],
    y: { min: 0, max: 20 }
  }
};
