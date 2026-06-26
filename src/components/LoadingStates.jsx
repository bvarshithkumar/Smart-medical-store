/**
 * LoadingStates.jsx
 *
 * Shared loading UI primitives:
 *   SkeletonBlock  — single animated shimmer rectangle
 *   SkeletonCard   — card with shimmer lines
 *   SkeletonTable  — header + N shimmer rows
 *   SkeletonList   — vertical list of shimmer rows
 *   SkeletonGrid   — grid of shimmer cards
 *   ErrorState     — icon + message + Retry button
 *   EmptyState     — icon + friendly message + optional CTA
 *
 * All components are style-prop only (no external CSS deps).
 * Shimmer animation is injected once via a <style> tag.
 */

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw, InboxIcon } from 'lucide-react';

/* ─── Inject shimmer keyframes once ──────────────────────────── */
let shimmerInjected = false;
function injectShimmer() {
  if (shimmerInjected || typeof document === 'undefined') return;
  shimmerInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ls-shimmer {
      0%   { background-position: -600px 0; }
      100% { background-position:  600px 0; }
    }
    .ls-shimmer {
      background: linear-gradient(
        90deg,
        rgba(255,255,255,0.04) 25%,
        rgba(255,255,255,0.10) 50%,
        rgba(255,255,255,0.04) 75%
      );
      background-size: 600px 100%;
      animation: ls-shimmer 1.4s infinite linear;
      border-radius: 6px;
    }
  `;
  document.head.appendChild(style);
}

/* ─── SkeletonBlock ───────────────────────────────────────────── */
export function SkeletonBlock({ width = '100%', height = 16, style = {} }) {
  useEffect(injectShimmer, []);
  return (
    <div
      className="ls-shimmer"
      style={{ width, height, borderRadius: 6, ...style }}
    />
  );
}

/* ─── SkeletonCard ────────────────────────────────────────────── */
export function SkeletonCard({ lines = 3, style = {} }) {
  useEffect(injectShimmer, []);
  return (
    <div style={{
      background: 'var(--bg-card, rgba(255,255,255,0.04))',
      border: '1px solid var(--border, rgba(255,255,255,0.08))',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      ...style
    }}>
      <div className="ls-shimmer" style={{ height: 16, width: '60%', borderRadius: 6 }} />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div key={i} className="ls-shimmer" style={{ height: 12, width: i % 2 === 0 ? '85%' : '70%', borderRadius: 6 }} />
      ))}
    </div>
  );
}

/* ─── SkeletonTable ───────────────────────────────────────────── */
export function SkeletonTable({ rows = 6, cols = 5 }) {
  useEffect(injectShimmer, []);
  const colWidths = ['30%', '20%', '15%', '15%', '10%', '10%'];
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
      {/* Header */}
      <div style={{
        display: 'flex', gap: 12, padding: '14px 20px',
        background: 'var(--bg-elevated, rgba(255,255,255,0.06))',
        borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))'
      }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="ls-shimmer" style={{ height: 12, width: colWidths[i] || '15%', borderRadius: 4 }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{
          display: 'flex', gap: 12, padding: '14px 20px',
          borderBottom: r < rows - 1 ? '1px solid var(--border, rgba(255,255,255,0.05))' : 'none',
          background: r % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
        }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="ls-shimmer" style={{ height: 14, width: colWidths[c] || '15%', borderRadius: 4 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── SkeletonList ────────────────────────────────────────────── */
export function SkeletonList({ rows = 4 }) {
  useEffect(injectShimmer, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          background: 'var(--bg-card, rgba(255,255,255,0.04))',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div className="ls-shimmer" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="ls-shimmer" style={{ height: 14, width: `${55 + (i % 3) * 15}%`, borderRadius: 4 }} />
            <div className="ls-shimmer" style={{ height: 11, width: `${35 + (i % 2) * 20}%`, borderRadius: 4 }} />
          </div>
          <div className="ls-shimmer" style={{ height: 24, width: 72, borderRadius: 20, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

/* ─── SkeletonGrid ────────────────────────────────────────────── */
export function SkeletonGrid({ cards = 6, minWidth = 220 }) {
  useEffect(injectShimmer, []);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
      gap: 16
    }}>
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} lines={3} />
      ))}
    </div>
  );
}

/* ─── SkeletonStatGrid ────────────────────────────────────────── */
export function SkeletonStatGrid({ cards = 4 }) {
  useEffect(injectShimmer, []);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: 16
    }}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} style={{
          background: 'var(--bg-card, rgba(255,255,255,0.04))',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="ls-shimmer" style={{ height: 32, width: 32, borderRadius: 8 }} />
            <div className="ls-shimmer" style={{ height: 20, width: 48, borderRadius: 10 }} />
          </div>
          <div className="ls-shimmer" style={{ height: 28, width: '55%', borderRadius: 6 }} />
          <div className="ls-shimmer" style={{ height: 12, width: '70%', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

/* ─── ErrorState ──────────────────────────────────────────────── */
export function ErrorState({ message, onRetry, style = {} }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: '48px 24px',
      textAlign: 'center',
      ...style
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <AlertCircle size={26} style={{ color: '#f87171' }} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #f1f5f9)', marginBottom: 6 }}>
          Failed to load data
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)', maxWidth: 360, lineHeight: 1.6 }}>
          {message || 'Something went wrong. Please try again.'}
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 8, cursor: 'pointer',
            color: '#fca5a5', fontSize: 13, fontWeight: 600,
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}

/* ─── EmptyState ──────────────────────────────────────────────── */
export function EmptyState({ icon, title, message, ctaLabel, onCta, style = {} }) {
  const Icon = icon || InboxIcon;
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      padding: '56px 24px',
      textAlign: 'center',
      ...style
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(99,102,241,0.10)',
        border: '1px solid rgba(99,102,241,0.20)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={28} style={{ color: '#818cf8' }} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary, #f1f5f9)', marginBottom: 8 }}>
          {title || 'Nothing here yet'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)', maxWidth: 380, lineHeight: 1.7 }}>
          {message || 'No records found.'}
        </div>
      </div>
      {onCta && ctaLabel && (
        <button
          onClick={onCta}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 22px',
            background: 'var(--cyan, #06b6d4)',
            border: 'none',
            borderRadius: 8, cursor: 'pointer',
            color: '#fff', fontSize: 13, fontWeight: 600,
            marginTop: 4,
            fontFamily: 'inherit',
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
