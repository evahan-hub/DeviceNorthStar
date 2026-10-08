/* Device North Star — Customer Area prototype.
   Device Intelligence (know) drilling into Device Studio (change), on the Bento DS. */
const DS = window.PXDesignSystem_25da7e;
const {
  Card, Modal, Button, IconButton, Icon, Status, Tag, Chip, Alert, Toggle,
  InputField, Textarea, SegmentedControl, SelectionCard, RadioGroup, Checkbox,
  Menu, Tabs, Stepper, Pagination, Divider, Link, Avatar, EmptyState, LoadingIndicator, Tooltip, Toast,
} = DS;
const { useState, useMemo, useEffect, useRef, useCallback } = React;
const D = window.DATA;
const SCHEMA = window.SCHEMA;

/* ---------------- primitives ---------------- */
const T = {
  page: 'var(--b-color-background-primary)',
  card: 'var(--b-color-background-primary)',
  border: 'var(--b-color-outline-primary)',
  borderStrong: 'var(--b-color-outline-secondary)',
  sep: 'var(--b-color-separator-primary)',
  sepFaint: 'var(--b-color-background-tertiary)', // Perplexity-style hairline separator
  ink: 'var(--b-color-label-primary)',
  sub: 'var(--b-color-label-secondary)',
  faint: 'var(--b-color-label-tertiary)',
  green: 'var(--b-color-decorative-green)',
  radiusL: 'var(--b-border-radius-l)',
  radiusM: 'var(--b-border-radius-m)',
  // spacing rhythm — one scale used everywhere
  s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24, s7: 32,
  navW: 248, // sidebar width, matches reference
  maxW: 1200,
};
// One consistent surface (Bento signature: outlined, not shadowed)
const surface = { background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusL };

function Ico({ name, size = 16, color, style }) {
  return <Icon name={name} size={size} color={color} style={style} />;
}

/* Device event report: deterministic per-device events across every type — reboots, config changes,
   network switches, staff actions, and connectivity/transaction errors (timestamp, type, detail, redacted ref). */
function deviceEvents(dv) {
  if (!dv) return [];
  let s = 0; for (const ch of dv.id) s = (s * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const cause = dv.cause || '';
  const weak = /Wi-?Fi|signal|Cellular/i.test(cause);
  const errType = /Wi-?Fi|signal/i.test(cause) ? 'Weak signal / Wi-Fi drop'
    : /WebSocket|latency|reconnect/i.test(cause) ? 'WebSocket failure'
    : /Cellular/i.test(cause) ? 'Cellular fallback'
    : /offline|boarded/i.test(cause) ? 'Offline / not boarded' : 'Connectivity error';
  const base = { terminal: dv.terminal, store: dv.store, country: dv.country, model: dv.model, appVersion: dv.appVersion };
  const out = [];
  const push = (daysAgo, hh, mm, type, detail, ref = '') => {
    const when = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;
    out.push({ ...base, daysAgo, ts: `${when} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, type, detail, ref });
  };
  // System events — happen across the whole estate (healthy devices included).
  push(0, 8, 10, 'Reboot', 'Scheduled nightly restart');
  if (r() < 0.45) push(1 + Math.floor(r() * 3), 22, 40, 'Config change', ['Payment methods updated · applies after nightly reboot', 'TFM settings updated', 'Merchant account reassigned'][Math.floor(r() * 3)]);
  if (r() < 0.3) push(Math.floor(r() * 4), 18, 5, 'Staff action', 'Refund via admin PIN');
  // Connectivity + error events — only when the device is unhealthy.
  if (dv.status !== 'Healthy' && dv.failed) {
    if (weak) push(0, 14, 32, 'Network', 'Fell back to cellular — Wi-Fi signal lost');
    push(0, 14, 31, 'WebSocket', `Disconnected ×${Math.max(2, Math.round(dv.failed / 6))} during transactions`);
    const n = Math.min(dv.failed, 10);
    for (let i = 0; i < n; i++) {
      const daysAgo = Math.floor(r() * 7), hh = 8 + Math.floor(r() * 12), mm = Math.floor(r() * 60);
      push(daysAgo, hh, mm, errType, cause || errType, 'PSP •••' + Math.floor(1000 + r() * 8999));
    }
  }
  return out.sort((a, b) => a.daysAgo - b.daysAgo);
}

/* Level-0 reporting: build a CSV from columns + rows and trigger a client-side download. */
function downloadCSV(filename, columns, rows) {
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [columns.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Hover popover rendered via a portal (position: fixed) so it never gets clipped
   by a tile/modal's overflow. Use for info icons inside scrollable/clipped cards. */
function InfoTip({ content, children, width = 260, placement = 'auto' }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const show = () => {
    const el = ref.current; if (!el) return; const r = el.getBoundingClientRect();
    if (placement === 'right') { setPos({ x: r.right + 8, y: r.top + r.height / 2, mode: 'right' }); return; }
    const below = r.top < 140; setPos({ x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, mode: below ? 'below' : 'top' });
  };
  const hide = () => setPos(null);
  const tf = pos && (pos.mode === 'right' ? 'translateY(-50%)' : pos.mode === 'below' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)');
  return (
    <span ref={ref} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} tabIndex={0} style={{ display: 'inline-flex', lineHeight: 0, outline: 'none' }}>
      {children}
      {pos && ReactDOM.createPortal(
        <div style={{ position: 'fixed', left: pos.x, top: pos.y, transform: tf, maxWidth: width, width: 'max-content', background: 'var(--b-color-background-inverse-primary)', color: 'var(--b-color-label-inverse-primary)', fontSize: 12, lineHeight: 1.45, padding: '8px 10px', borderRadius: 8, boxShadow: 'var(--b-shadow-high)', zIndex: 9999, pointerEvents: 'none', whiteSpace: 'normal' }}>
          {content}
        </div>, document.body)}
    </span>
  );
}

/* Bento "collapse / side panel" glyph (used to collapse/expand the control panel). */
function PanelToggleIcon({ size = 16, flip }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ display: 'block', transform: flip ? 'scaleX(-1)' : undefined }}>
      <path d="M12 1.25C13.5188 1.25 14.75 2.48122 14.75 4V12C14.75 13.5188 13.5188 14.75 12 14.75H4C2.48122 14.75 1.25 13.5188 1.25 12V4C1.25 2.48122 2.48122 1.25 4 1.25H12ZM10.75 13.25H12C12.6904 13.25 13.25 12.6904 13.25 12V4C13.25 3.30964 12.6904 2.75 12 2.75H10.75V13.25ZM4 2.75C3.30964 2.75 2.75 3.30964 2.75 4V12C2.75 12.6904 3.30964 13.25 4 13.25H9.25V2.75H4Z" />
    </svg>
  );
}

/* Bento expand / collapse glyph (maximize corners; arrows flip inward when expanded). */
function ExpandGlyph({ size = 18, collapsed }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      {collapsed ? (
        <>
          <path d="M9 5 V9 H5" /><path d="M4 4 L9 9" />
          <path d="M11 15 V11 H15" /><path d="M16 16 L11 11" />
        </>
      ) : (
        <>
          <path d="M4 8 V4 H8" /><path d="M4 4 L9 9" />
          <path d="M16 12 V16 H12" /><path d="M16 16 L11 11" />
        </>
      )}
    </svg>
  );
}

/* Bento "arrow-left" glyph (not in the shipped icon set — provided inline). */
function ArrowLeftGlyph({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M3.80655 7.25434L8.06077 3.00011L7.00011 1.93945L0.939453 8.00011L7.00011 14.0608L8.06077 13.0001L3.81499 8.75433L14.7508 8.74316L14.7492 7.24316L3.80655 7.25434Z" />
    </svg>
  );
}

/* Revert / undo glyph (counter-clockwise arrow) for the chat "Revert to this point" control. */
function RevertGlyph({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M3.5 3.5v3h3" stroke="var(--b-color-label-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.9 6.3A5 5 0 1 1 3 9.2" stroke="var(--b-color-label-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Bento List recreation — label/value rows split by hairline dividers (b-list / b-list-item). */
function BentoList({ items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((it, i) => (
        <Row key={i} align="flex-start" style={{ justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: i === items.length - 1 ? 'none' : `1px solid ${T.sepFaint}` }}>
          <span style={{ fontSize: 13, color: T.sub, flexShrink: 0, paddingTop: 1 }}>{it.label}</span>
          <Row gap={4} style={{ minWidth: 0, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right', wordBreak: 'break-all' }}>{it.value}</span>
            {it.copy && <IconButton icon="copy" variant="tertiary" condensed title="Copy" />}
          </Row>
        </Row>
      ))}
    </div>
  );
}

/* Bento Structured List (b-structured-list): two aligned columns — labels then values,
   both left-aligned, no row dividers, 14/20 type, label secondary / value primary. */
function StructuredList({ items, labelWidth = 160 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `minmax(96px, ${labelWidth}px) 1fr`, columnGap: 20, alignItems: 'start' }}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <div style={{ padding: '6px 8px 6px 0', fontSize: 14, lineHeight: '20px', color: 'var(--b-color-label-secondary)' }}>{it.label}</div>
          <div style={{ padding: '6px 0', fontSize: 14, lineHeight: '20px', color: 'var(--b-color-label-primary)', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ minWidth: 0 }}>{it.value}</span>
            {it.copy && <IconButton icon="copy" variant="tertiary" condensed title="Copy" />}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* Icon button rendering a custom (non-Bento) glyph, styled like a tertiary IconButton. */
function GlyphButton({ title, onClick, children }) {
  return (
    <button className="ns-hdrbtn" title={title} aria-label={title} onClick={onClick}
      style={{ width: 32, height: 32, borderRadius: 8, border: 0, background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: T.sub, padding: 0, flexShrink: 0 }}>
      {children}
    </button>
  );
}

function Row({ children, gap = 8, style, align = 'center', ...r }) {
  return <div style={{ display: 'flex', alignItems: align, gap, ...style }} {...r}>{children}</div>;
}
function Col({ children, gap = 8, style, ...r }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }} {...r}>{children}</div>;
}

function TrendPill({ trend, dir }) {
  if (trend == null) return null;
  const map = { positive: ['var(--b-color-label-success)', 'arrow-up'], negative: ['var(--b-color-label-critical)', 'arrow-down'], neutral: ['var(--b-color-label-tertiary)', 'arrow-right'] };
  const [c, ic] = map[dir] || map.neutral;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: c, fontSize: 12, fontWeight: 600 }}>
      <Ico name={ic} size={16} color={c} />{trend}%
    </span>
  );
}

function StatusFor(status) {
  if (status === 'Trading') return <Status variant="green" label="Trading" />;
  if (status === 'Not trading') return <Status variant="red" label="Not trading" />;
  if (status === 'Offline') return <Status variant="grey" label="Offline" />;
  return <Status variant="yellow" label={status} />;
}
function HealthDot(h) {
  const label = { green: 'Healthy', yellow: 'Needs attention', red: 'At risk' }[h];
  return <Status variant={h} label={label} />;
}

/* Popover menu anchored to a trigger */
function MenuButton({ icon = 'options-vertical', label, items, onSelect, variant = 'tertiary', align = 'right', condensed = true }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      {label
        ? <Button variant={variant} condensed={condensed} iconLeft={icon} onClick={() => setOpen(o => !o)}>{label}</Button>
        : <IconButton icon={icon} variant={variant} onClick={() => setOpen(o => !o)} title="More actions" />}
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', [align]: 0, zIndex: 500 }}>
          <Menu items={items} onSelect={(v) => { setOpen(false); onSelect && onSelect(v); }} />
        </div>
      )}
    </div>
  );
}

/* ---------------- charts (hand-built SVG, interactive) ---------------- */
function LineChart({ data, height = 180 }) {
  const [active, setActive] = useState(null); // hovered x index
  const wrapRef = useRef(null);
  // Render the SVG at the container's real pixel size (1:1) so axis labels never distort.
  const [dim, setDim] = useState({ w: 560, h: height });
  useEffect(() => {
    const el = wrapRef.current; if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setDim({ w: el.clientWidth || 560, h: el.clientHeight || height }));
    ro.observe(el); return () => ro.disconnect();
  }, [height]);
  const w = dim.w, h = dim.h, pad = { l: 34, r: 12, t: 12, b: 24 };
  const all = data.series.flatMap(s => s.points);
  const min = data.min != null ? data.min : Math.min(...all) * 0.9;
  const max = data.max != null ? data.max : Math.max(...all) * 1.08;
  const n = data.labels.length;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const x = (i) => pad.l + (iw * i) / (n - 1);
  const y = (v) => pad.t + ih - (ih * (v - min)) / (max - min);
  const ticks = 4;

  const onMove = (e) => {
    const el = wrapRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const vx = e.clientX - rect.left;
    let idx = Math.round((vx - pad.l) / (iw / (n - 1)));
    setActive(Math.max(0, Math.min(n - 1, idx)));
  };
  const leftPct = active != null ? Math.max(10, Math.min(90, (x(active) / w) * 100)) : 0;

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%', minHeight: height }} onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none" style={{ display: 'block' }}>
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const gy = pad.t + (ih * i) / ticks;
          const val = (max - ((max - min) * i) / ticks);
          return (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={gy} y2={gy} stroke="var(--lume-grid)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <text x={pad.l - 6} y={gy + 3} textAnchor="end" fontSize="10" fill="var(--lume-axis)">{Math.round(val)}</text>
            </g>
          );
        })}
        {(() => {
          // Show ~one label per 64px so dates never overlap on narrow charts.
          const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 64))));
          return data.labels.map((l, i) => (i % step === 0 && i <= n - 1 - Math.floor(step / 2)) || i === n - 1 ? (
            <text key={i} x={x(i)} y={h - 7} textAnchor={i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle'} fontSize="10" fill="var(--lume-axis)">{l}</text>
          ) : null);
        })()}
        {/* hover guide */}
        {active != null && <line x1={x(active)} x2={x(active)} y1={pad.t} y2={pad.t + ih} stroke="var(--b-color-outline-secondary)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
        {data.series.map((s, si) => {
          const dd = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
          return (
            <g key={si}>
              <path d={dd} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              {active != null && <circle cx={x(active)} cy={y(s.points[active])} r="4" fill="var(--b-color-background-primary)" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />}
            </g>
          );
        })}
      </svg>
      {/* tooltip */}
      {active != null && (
        <div className="ns-fade" style={{ position: 'absolute', left: `${leftPct}%`, top: 4, transform: 'translateX(-50%)', pointerEvents: 'none', background: 'var(--b-color-background-inverse-primary)', color: 'var(--b-color-label-inverse-primary)', borderRadius: 8, padding: '8px 10px', boxShadow: 'var(--b-shadow-high)', zIndex: 5, whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>{data.labels[active]}</div>
          {data.series.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, lineHeight: '18px' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{s.name}</span>
              <span className="ns-num" style={{ fontWeight: 600, marginLeft: 12 }}>{s.points[active]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
/* Column/bar chart — same axis, gridline & tooltip styling as LineChart; grouped bars per label. */
function BarChart({ data, height = 180 }) {
  const [active, setActive] = useState(null);
  const wrapRef = useRef(null);
  const [dim, setDim] = useState({ w: 560, h: height });
  useEffect(() => {
    const el = wrapRef.current; if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setDim({ w: el.clientWidth || 560, h: el.clientHeight || height }));
    ro.observe(el); return () => ro.disconnect();
  }, [height]);
  const w = dim.w, h = dim.h, pad = { l: 40, r: 12, t: 12, b: 24 };
  const all = data.series.flatMap(s => s.points);
  const rawMin = Math.min(...all), rawMax = Math.max(...all), span = (rawMax - rawMin) || 1;
  const min = data.min != null ? data.min : (rawMin >= 0 ? 0 : rawMin - span * 0.08);
  const max = data.max != null ? data.max : rawMax + span * 0.08;
  const n = data.labels.length;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const y = (v) => pad.t + ih - (ih * (v - min)) / (max - min);
  const base = pad.t + ih, slot = iw / n, ns = data.series.length;
  const groupW = slot * 0.68, barW = Math.max(2, (groupW / ns) - (ns > 1 ? 2 : 0));
  const ticks = 4;
  const fmt = (v) => Math.abs(v) >= 1000 ? +(v / 1000).toFixed(1) + 'k' : Math.round(v);
  const onMove = (e) => { const el = wrapRef.current; if (!el) return; const r = el.getBoundingClientRect(); setActive(Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left - pad.l) / slot)))); };
  const leftPct = active != null ? Math.max(10, Math.min(90, ((pad.l + slot * (active + 0.5)) / w) * 100)) : 0;
  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%', minHeight: height }} onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none" style={{ display: 'block' }}>
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const gy = pad.t + (ih * i) / ticks, val = max - ((max - min) * i) / ticks;
          return <g key={i}><line x1={pad.l} x2={w - pad.r} y1={gy} y2={gy} stroke="var(--lume-grid)" strokeWidth="1" vectorEffect="non-scaling-stroke" /><text x={pad.l - 6} y={gy + 3} textAnchor="end" fontSize="10" fill="var(--lume-axis)">{fmt(val)}</text></g>;
        })}
        {(() => { const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 64)))); return data.labels.map((l, i) => i % step === 0 ? <text key={i} x={pad.l + slot * (i + 0.5)} y={h - 7} textAnchor="middle" fontSize="10" fill="var(--lume-axis)">{l}</text> : null); })()}
        {active != null && <rect x={pad.l + slot * active} y={pad.t} width={slot} height={ih} fill="var(--b-color-background-secondary)" opacity="0.6" />}
        {data.series.map((s, si) => s.points.map((p, i) => {
          const gx = pad.l + slot * i + (slot - groupW) / 2 + si * (groupW / ns), yv = y(p);
          return <rect key={si + '-' + i} x={gx} y={yv} width={barW} height={Math.max(0, base - yv)} rx={Math.min(3, barW / 2)} fill={s.color} />;
        }))}
      </svg>
      {active != null && (
        <div className="ns-fade" style={{ position: 'absolute', left: `${leftPct}%`, top: 4, transform: 'translateX(-50%)', pointerEvents: 'none', background: 'var(--b-color-background-inverse-primary)', color: 'var(--b-color-label-inverse-primary)', borderRadius: 8, padding: '8px 10px', boxShadow: 'var(--b-shadow-high)', zIndex: 5, whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>{data.labels[active]}</div>
          {data.series.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, lineHeight: '18px' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{s.name}</span>
              <span className="ns-num" style={{ fontWeight: 600, marginLeft: 12 }}>{D.fmt(s.points[active])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function Legend({ series }) {
  return (
    <Row gap={16} style={{ flexWrap: 'wrap' }}>
      {series.map(s => (
        <Row key={s.name} gap={8}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, lineHeight: '18px', color: T.sub }}>{s.name}</span>
        </Row>
      ))}
    </Row>
  );
}

/* Simple table used inside tiles / explore */
function Grid({ columns, rows, onCell, dense = false, rightAlignFrom = 1, renderCell, hideHeaderInfo = false }) {
  return (
    <div style={{ width: '100%', overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: T.radiusM, background: T.card }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {columns.map((c, ci) => {
              const right = ci >= rightAlignFrom;
              const label = typeof c === 'string' ? c : c.label;
              const info = typeof c === 'object' ? c.info : null;
              return (
                <th key={ci} style={{ textAlign: right ? 'right' : 'left', padding: dense ? '8px 16px' : '10px 16px', fontSize: 13, color: T.ink, fontWeight: 600, background: T.card, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {label}
                    {info && !hideHeaderInfo && <InfoTip content={info} placement={right ? 'left' : 'right'}><Ico name="info" size={16} color={T.ink} /></InfoTip>}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="ns-row" style={{ cursor: onCell ? 'pointer' : 'default' }} onClick={() => onCell && onCell(r, ri)}>
              {r.map((cell, ci) => (
                <td key={ci} style={{ textAlign: ci >= rightAlignFrom ? 'right' : 'left', padding: dense ? '8px 12px' : '11px 14px', borderBottom: ri === rows.length - 1 ? 'none' : `1px solid ${T.sepFaint}`, color: ci === 0 ? T.ink : T.sub, fontWeight: ci === 0 ? 500 : 400, whiteSpace: 'nowrap', fontFamily: ci >= rightAlignFrom ? 'var(--b-font-family-secondary)' : 'inherit' }}>
                  {renderCell ? renderCell(cell, ci, r) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- full page overlay ---------------- */
function FullPage({ title, subtitle, badge, onBack, backLabel = 'Back', backVariant = 'tertiary', backIcon = 'chevron-left', onClose, actions, children, tone, bodyBg, inline }) {
  useEffect(() => {
    if (inline) return; // inline = rendered as a normal page (no ESC-to-close overlay behaviour)
    const onEsc = (e) => { if (e.key === 'Escape') (onClose || onBack) && (onClose || onBack)(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);
  const canClose = !!(onClose || onBack);
  const root = inline
    ? { position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: T.card }
    : { position: 'fixed', inset: 0, zIndex: 400, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: T.card, isolation: 'isolate' };
  return (
    <div style={root} className="ns-sheet">
      {/* b-modal-fullscreen · header — back left · title centered · actions/close right */}
      <div style={{ flexShrink: 0, alignSelf: 'stretch', height: 64, display: 'flex', alignItems: 'center', gap: 24, padding: '12px 24px', background: T.card, borderBottom: `1px solid ${T.sep}`, position: 'relative' }}>
        {/* left — back: labeled "← Previous page" when a backLabel is given, else icon-only */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', zIndex: 2 }}>
          {onBack && (backLabel && backLabel !== 'Back'
            ? <button type="button" onClick={onBack} title={backLabel} className="ns-accord-row" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 10px 0 6px', border: 0, background: 'transparent', cursor: 'pointer', color: T.ink, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, borderRadius: 8, maxWidth: '100%' }}>
                <span style={{ lineHeight: 0, flexShrink: 0 }}><ArrowLeftGlyph /></span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{backLabel}</span>
              </button>
            : <GlyphButton title="Back" onClick={onBack}><ArrowLeftGlyph /></GlyphButton>)}
        </div>
        {/* center — title + optional subtitle + badge */}
        <div style={{ position: 'absolute', left: '50%', top: 0, height: '100%', transform: 'translateX(-50%)', maxWidth: '52%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <Row gap={8} style={{ minWidth: 0, justifyContent: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700, lineHeight: '26px', color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
            {badge && <span style={{ pointerEvents: 'auto', lineHeight: 0, display: 'inline-flex' }}>{badge}</span>}
          </Row>
          {subtitle && <span style={{ fontSize: 12, lineHeight: '16px', color: T.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{subtitle}</span>}
        </div>
        {/* right — actions · separator · close */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 24, zIndex: 2 }}>
          {actions && <Row gap={8}>{actions}</Row>}
          {canClose && (
            <Row gap={16} align="center" style={{ flexShrink: 0 }}>
              <span style={{ width: 1, height: 26, background: T.sep, flexShrink: 0 }} />
              <IconButton icon="cross" variant="tertiary" onClick={onClose || onBack} title="Close" />
            </Row>
          )}
        </div>
      </div>
      {/* body */}
      <div style={{ flex: 1, minHeight: 0, alignSelf: 'stretch', overflowY: 'auto', background: bodyBg, zIndex: 0 }}>{children}</div>
    </div>
  );
}

function Section({ title, description, actions, children, padded = true, style, headerBorder = true }) {
  return (
    <div style={{ ...surface, ...style }} className="ns-tile">
      {(title || actions) && (
        <Row style={{ padding: `${T.s4}px ${T.s5}px`, borderBottom: (children && headerBorder) ? `1px solid ${T.sepFaint}` : 'none', minHeight: 56 }}>
          <Col gap={1} style={{ flex: 1, minWidth: 0 }}>
            {title && <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</span>}
            {description && <span style={{ fontSize: 13, color: T.sub }}>{description}</span>}
          </Col>
          <Row gap={T.s2}>{actions}</Row>
        </Row>
      )}
      {children && <div style={{ padding: padded ? T.s5 : 0 }}>{children}</div>}
    </div>
  );
}

/* ============================================================= SHELL */
const NAV = [
  { id: 'home', label: 'Home', icon: 'nav-home' },
  { id: 'payments', label: 'Payments', icon: 'nav-payments' },
  { id: 'balances', label: 'Balances', icon: 'nav-balances' },
  { id: 'analytics', label: 'Analytics', icon: 'nav-analytics' },
  { id: 'risk', label: 'Risk & disputes', icon: 'nav-risk' },
  { id: 'devices', label: 'Devices', icon: 'nav-devices', children: [
    { id: 'device-intelligence', label: 'Devices Intelligence' },
    { id: 'stores', label: 'Devices & locations' },
    { id: 'device-studio', label: 'Device studio' },
    { id: 'fleet-health', label: 'Fleet health', testOnly: true },
  ] },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function Header({ env, setEnv, crumb, onToggleNav }) {
  return (
    <header style={{ ...(env === 'Test' ? ENV_TEST_VARS : null), height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: `1px solid ${T.sep}`, background: T.page, zIndex: 300 }}>
      {/* left zone — aligns with the sidebar */}
      <div style={{ width: T.navW, flexShrink: 0, display: 'flex', alignItems: 'center', gap: T.s2, height: '100%', paddingRight: T.s3 }}>
        <button className="ns-hdrbtn" aria-label="Toggle navigation" onClick={onToggleNav} style={{ width: 32, height: 32, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 0, background: 'none', borderRadius: 8, cursor: 'pointer', color: T.ink, padding: 0 }}>
          <Ico name="menu" size={16} />
        </button>
        <button className="ns-hdrbtn" title="Switch account" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 8px', border: 0, borderRadius: 8, cursor: 'pointer', background: 'none', color: T.ink }}>
          <span style={{ width: 28, height: 28, borderRadius: 7, overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src="assets/tx/uniqlo.svg" alt="Uniqlo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0, textAlign: 'left' }}>
            <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Uniqlo APAC</span>
            <span style={{ fontSize: 12, color: T.sub }}>Merchant account</span>
          </span>
          <span style={{ marginLeft: 'auto', lineHeight: 0, color: T.faint }}><Ico name="expand-vertical" size={16} color={T.faint} /></span>
        </button>
      </div>
      {/* right zone */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 0 20px', height: '100%' }}>
        <Row gap={8}>
          {crumb.map((c, i) => (
            <Row key={i} gap={8}>
              <span style={{ fontSize: 13, color: i === crumb.length - 1 ? T.ink : T.sub, fontWeight: i === crumb.length - 1 ? 500 : 400, whiteSpace: 'nowrap' }}>{c}</span>
              {i < crumb.length - 1 && <Ico name="chevron-right-small" size={16} color={T.faint} />}
            </Row>
          ))}
        </Row>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <SegmentedControl condensed value={env} onChange={setEnv} options={[{ value: 'Test', label: 'Test' }, { value: 'Live', label: 'Live' }]} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 260, height: 36, padding: '0 12px', border: `1px solid ${T.borderStrong}`, borderRadius: 8, background: T.card, color: T.faint }}>
            <Ico name="search" size={16} color={T.faint} /><span style={{ fontSize: 14 }}>Search…</span>
          </div>
          <IconButton icon="notification" variant="tertiary" title="Notifications" />
          <IconButton icon="help-center" variant="tertiary" title="Help" />
          <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--b-color-background-inverse-primary)', color: 'var(--b-color-label-inverse-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>EV</span>
        </div>
      </div>
    </header>
  );
}

/* Test-mode dev theme — a dark-navy inversion applied to the sidebar + top header so it's
   obvious you're in the Test environment. Overriding the Bento tokens on the container flips
   every child (backgrounds, labels, borders) to the inverse palette automatically. */
const ENV_TEST_VARS = {
  '--b-color-background-primary': 'var(--b-color-background-inverse-primary)',
  '--b-color-background-secondary': 'rgba(255,255,255,0.08)',
  '--b-color-background-tertiary': 'rgba(255,255,255,0.08)',
  '--b-color-label-primary': 'var(--b-color-label-inverse-primary)',
  '--b-color-label-secondary': 'var(--b-color-label-inverse-secondary)',
  '--b-color-label-tertiary': 'rgba(255,255,255,0.55)',
  '--b-color-separator-primary': 'rgba(255,255,255,0.14)',
  '--b-color-outline-primary': 'rgba(255,255,255,0.18)',
  '--b-color-outline-secondary': 'rgba(255,255,255,0.28)',
  // Active nav item highlight → Adyen green in the dark Test theme.
  '--b-color-background-navigation': 'var(--b-color-decorative-green)',
  '--b-color-background-navigation-hover': 'var(--b-color-decorative-green)',
};

function Sidebar({ active, onNav, env }) {
  // Groups expand/collapse independently (Bento b-navigation-menu-group). Default: the group
  // containing the active page starts open.
  const [open, setOpen] = useState(() => {
    const s = new Set();
    NAV.forEach(it => { if (it.children && it.children.some(c => c.id === active)) s.add(it.id); });
    return s;
  });
  const toggle = (id) => setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <aside style={{ ...(env === 'Test' ? ENV_TEST_VARS : null), width: T.navW, flexShrink: 0, height: '100%', background: T.page, borderRight: `1px solid ${T.borderStrong}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 8px' }}>
        <Row style={{ padding: '6px 8px', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: T.faint }}>Pages</span>
          <Ico name="search" size={16} color={T.sub} />
        </Row>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {NAV.map(item => {
            const isParentActive = item.children && item.children.some(c => c.id === active);
            const isOpen = item.children && open.has(item.id);
            const pill = active === item.id; // active leaf pill (top-level pages only)
            return (
              <div key={item.id}>
                <div className={`ns-nav ${pill ? 'is-active' : ''}`}
                  onClick={() => item.children ? toggle(item.id) : onNav(item.id)}
                  aria-expanded={item.children ? isOpen : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, borderRadius: 8, cursor: 'pointer', color: T.ink, fontWeight: (pill || isParentActive) ? 600 : 500, fontSize: 14 }}>
                  <Ico name={item.icon} size={16} color={(pill || isParentActive) ? T.ink : T.sub} />
                  <span>{item.label}</span>
                  {item.children && <span style={{ marginLeft: 'auto', lineHeight: 0, transition: 'transform 120ms' }}><Ico name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={T.faint} /></span>}
                </div>
                {item.children && isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '1px 0' }}>
                    {item.children.filter(c => !c.testOnly || env === 'Test').map(c => (
                      <div key={c.id} className={`ns-nav ${active === c.id ? 'is-active' : ''}`} onClick={() => onNav(c.id)}
                        style={{ padding: '8px 8px 8px 40px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: active === c.id ? 600 : 500, color: active === c.id ? T.ink : T.sub }}>
                        {c.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

/* ============================================================= DEVICE INTELLIGENCE */
const ALL_TILES = [
  { id: 'kpis', name: 'Fleet overview', kind: 'kpi', w: 'full' },
  { id: 'business', name: 'Business insight', kind: 'business', w: 'half' },
  { id: 'sdkHealth', name: 'SDK & OS health', kind: 'sdkHealth', w: 'half' },
  { id: 'firmware', name: 'Firmware health', kind: 'firmwareHealth', w: 'half' },
  { id: 'connectivity', name: 'Fleet health', kind: 'connectivity', w: 'half' },
  { id: 'auth', name: 'Authorisation-rate trend', kind: 'chart', chart: 'authTrend', w: 'half',
    info: <span><b>Authorisation rate</b> = approved authorisations ÷ total authorisation attempts — the share of payments the card issuer says yes to.<br /><br /><b>Why it matters:</b> it&rsquo;s the clearest measure of revenue you capture vs lose at the moment of payment. Around <b>5% of card payments are wrongly refused</b> by legacy systems, and Adyen&rsquo;s revenue-optimisation tooling (RevenueAccelerate) is credited with lifting merchant revenue by <b>~1.4%</b>. A downward trend means more shoppers are being declined — check issuer refusals, network tokens and routing.</span> },
  { id: 'notTradingTrend', name: 'Failed transactions', kind: 'chart', chart: 'failedTxTrend', w: 'half',
    info: <span><b>Failed transactions</b> = payments that were declined or aborted at the terminal (not by the issuer).<br /><br /><b>Why it matters:</b> most terminal-side failures trace back to <b>connectivity</b> — WebSocket drops, high latency or weak signal — so this is the leading signal that a store is about to lose sales. <b>Explore</b> to see the terminals to troubleshoot and the underlying signals, then fix them.</span> },
  { id: 'notReady', name: 'Not-ready reasons', kind: 'grid', grid: 'notReadyReasons', topic: 'notReady', w: 'half' },
  { id: 'compliance', name: 'Firmware & PCI compliance', kind: 'grid', grid: 'compliance', topic: 'compliance', w: 'half' },
  { id: 'storesAttention', name: 'Stores needing attention', kind: 'grid', grid: 'storesAttention', topic: 'storesAttention', w: 'full' },
  { id: 'notTransacting', name: 'Not-transacting reasons', kind: 'grid', grid: 'notTransacting', w: 'half' },
  { id: 'featureByModel', name: 'Feature adoption by model', kind: 'grid', grid: 'featureByModel', w: 'half' },
  { id: 'transactionSpeed', name: 'Transaction speed', kind: 'grid', grid: 'transactionSpeed', topic: 'transactionSpeed', w: 'half' },
];
// Business insight ↔ Connectivity & health · SDK & OS health ↔ Firmware health · Auth trend ↔ Failed transactions.
// (Feature adoption lives in the Business insight Explore; battery is covered inside Connectivity & health.)
const DEFAULT_TILE_IDS = ['kpis', 'business', 'connectivity', 'sdkHealth', 'firmware', 'auth', 'notTradingTrend', 'transactionSpeed', 'notReady'];

// Shared data-period options for every Explore modal (keeps the "scope of the data" consistent).
const DATA_PERIODS = [
  { value: '1h', label: 'Last 1 hour' }, { value: '6h', label: 'Last 6 hours' }, { value: '24h', label: 'Last 24 hours' },
  { value: 'today', label: 'Today' }, { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: '90d', label: 'Last 90 days' }, { value: '12m', label: 'Last 12 months' },
];
const fmtRangeDate = (s) => { const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }); };
const periodLabel = (v) => {
  if (typeof v === 'string' && v.startsWith('custom:')) { const p = v.split(':'); return `${fmtRangeDate(p[1])} – ${fmtRangeDate(p[2])}`; }
  return (DATA_PERIODS.find(p => p.value === v) || DATA_PERIODS.find(p => p.value === '30d')).label;
};

/* ---- Dashboard layout persistence ----
   The user's saved tile order survives reloads via localStorage. Bump LAYOUT_VERSION on any
   push that changes the default layout — that invalidates old saves so the new default wins;
   otherwise the user's own layout is always restored. */
const LAYOUT_VERSION = 11;
const LAYOUT_KEY = 'ns_fleet_layout';
function loadLayout() {
  try {
    const o = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
    if (o && o.v === LAYOUT_VERSION && Array.isArray(o.ids)) {
      const ids = o.ids.filter(id => ALL_TILES.some(t => t.id === id));
      if (ids.length) return ids;
    }
  } catch (e) { /* ignore malformed/blocked storage */ }
  return null;
}
function saveLayout(ids) {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify({ v: LAYOUT_VERSION, ids })); } catch (e) { /* ignore */ }
}

// Fleet overview = headline health; Feature insight = adoption + feature-level metrics.
const FLEET_KPIS = ['active', 'transacting', 'auth', 'atv'];
const FEATURE_KPIS = ['dcc', 'offline'];
const kpiById = (id) => D.kpis.find(k => k.id === id) || {};

/* Bento summary-grid recreation: grey-filled metric cells (b-summary-grid-item-*),
   each = title + info on top, value + trend below. No heading inside the box. */
function SummaryGrid({ items, cols = 4, style }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: T.s3, ...style }}>
      {items.map((k, i) => (
        <div key={k.id || i} className="ns-kpi" onClick={k.onClick} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 10, padding: '14px 16px', borderRadius: T.radiusM, background: 'var(--b-color-background-secondary)', cursor: k.onClick ? 'pointer' : 'default' }}>
          <Row gap={6}>
            <span style={{ fontSize: 12, color: T.sub, fontWeight: 500, flex: 1, minWidth: 0 }}>{k.title}</span>
            {k.hint && <InfoTip content={k.hint} placement="right"><Ico name="info" size={16} color={T.ink} /></InfoTip>}
          </Row>
          <Row gap={6} align="baseline">
            <span className="ns-num" style={{ fontSize: 26, fontWeight: 600 }}>{k.value}</span>
            <TrendPill trend={k.trend} dir={k.dir} />
            {k.onClick && <span style={{ lineHeight: 0, alignSelf: 'center', marginLeft: 'auto' }}><Ico name="chevron-right" size={16} color={T.faint} /></span>}
          </Row>
        </div>
      ))}
    </div>
  );
}

function KPITile({ actions, onOpenStores, onOpenDevices }) {
  // Merchant-specific headline metrics (not Adyen-wide totals).
  const fleetItems = [
    { id: 'stores', title: 'All locations', value: String(SM_STORES.length), hint: 'Locations in this account. Click to view all.', onClick: onOpenStores },
    { id: 'devices', title: 'All devices', value: D.fmt(FLEET_DEVICES), hint: 'Devices across all your stores. Click to view all.', onClick: onOpenDevices },
    kpiById('auth'),
    kpiById('atv'),
  ];
  return (
    <div>
      {actions && <Row style={{ justifyContent: 'flex-end', marginBottom: 8 }}>{actions}</Row>}
      <SummaryGrid items={fleetItems} cols={4} />
    </div>
  );
}

/* Shared tile header — one title/subtitle style across the Fleet Intelligence page:
   title 15/600 ink · subtitle 12/500 faint · info icon (ink) · optional right node & badge. */
function TileHeader({ title, info, subtitle, right, badge }) {
  return (
    <Row align="flex-start" style={{ padding: `${T.s4}px ${T.s5}px`, gap: 12 }}>
      <Col gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Row gap={6}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: T.ink }}>{title}</span>
          {badge}
          {info && <InfoTip content={info} placement="right"><Ico name="info" size={16} color={T.ink} /></InfoTip>}
        </Row>
        {subtitle && <span style={{ fontSize: 12, color: T.faint, fontWeight: 500 }}>{subtitle}</span>}
      </Col>
      {right}
    </Row>
  );
}

/* Feature insight — same card anatomy as SDK & OS Health: header (title + info +
   subtitle) with legend top-right, then chart beside its feature-level metrics. */
function FeatureInsightTile({ onExplore }) {
  const data = D.featureAdoption;
  return (
    <div style={{ ...surface, overflow: 'hidden' }} className="ns-tile">
      <TileHeader title="Feature insight" subtitle="Feature adoption · last 12 months"
        info="Adoption of DCC, tipping and installments across your fleet over the last 12 months."
        right={<Row gap={12} align="center"><Legend series={data.series} />{onExplore && <Button variant="tertiary" condensed iconRight="arrow-right" onClick={onExplore}>Explore</Button>}</Row>} />
      <div style={{ padding: `0 ${T.s5}px ${T.s5}px`, height: 220 }}>
        <LineChart data={data} height={200} />
      </div>
    </div>
  );
}

function ChartTile({ chart }) {
  const data = D[chart];
  return (
    <Col gap={12}>
      <LineChart data={data} />
      <Legend series={data.series} />
    </Col>
  );
}

/* Adyen Customer-Area style chart card: title + info, "Last update" caption,
   legend top-right, chart body. */
function ChartCard({ t, actions, onExplore }) {
  const data = D[t.chart];
  const updated = t.updated || '4 min ago';
  return (
    <div style={{ ...surface, overflow: 'hidden' }} className="ns-tile">
      <TileHeader title={t.name} subtitle={`Last update: ${updated}`}
        info={t.info || 'How this metric is measured and the period it covers.'}
        right={actions || <Row gap={12} align="center"><Legend series={data.series} />{onExplore && <Button variant="tertiary" condensed iconRight="arrow-right" onClick={onExplore}>{t.exploreLabel || 'Explore'}</Button>}</Row>} />
      <div style={{ padding: `0 ${T.s5}px ${T.s5}px`, height: 240 }}>
        <LineChart data={data} height={200} />
      </div>
    </div>
  );
}

const NL_SUG_ICONS = ['nav-analytics', 'list', 'store', 'shield', 'search', 'grid'];

/* Notion-AI-style prompt: free-text area + Bento action toolbar with an add-menu. */
const NL_ADD_ITEMS = [
  { value: 'files', label: 'Add photos and files', icon: 'image' },
  { value: 'mention', label: 'Mention a store or device', icon: 'store' },
  { value: 'view', label: 'Insert a saved view', icon: 'grid' },
  { divider: true },
  { value: 'skills', label: 'Skills', icon: 'sparkles' },
];
/* ---- Ask contexts (JTBD) ----
   Each page gets its own AI models (routed by the kind of data on that page) and a set of
   grouped, job-to-be-done starter prompts. Keyed by page: fleet · devices · studio. */
const MODES = [
  { id: 'analytics', label: 'Analytic', icon: 'analytics-outline' },
  { id: 'ops', label: 'Operation', icon: 'store' },
  { id: 'compliance', label: 'Compliance', icon: 'shield-checkmark' },
  { id: 'custom', label: 'Customise', icon: 'palette-outline' },
];
const DEFAULT_ASK_MODELS = MODES;
const ASK_CONTEXTS = {
  fleet: {
    placeholder: 'Ask about fleet health, security or operations…',
    intro: 'Ask across your whole fleet — analytics, security, operations and troubleshooting.',
    // Surfaced first when the panel opens; everything else collapses under "See more insights".
    featured: [
      { cat: 'Firmware locks', icon: 'settings', q: 'Show only terminals with locked firmware. Group them by lock reason and flag which ones can be safely unlocked and updated.', desc: 'Grouped by lock reason, with the ones safe to unlock and update flagged.' },
      { cat: 'Apps per device', icon: 'grid', q: 'List Android apps installed per device across the fleet in one view, without sending me to Reports.', desc: 'One view — apps installed per device, no separate trip to Reports.' },
      { cat: 'Business enablement', icon: 'sparkles', q: 'How is tipping configured across all my fleets?', desc: 'Overview and what it means — high-performing vs misconfiguration — linked to action points.' },
      { cat: 'Fleet security', icon: 'settings', q: 'How many SDKs / firmware are expiring?', desc: 'Current status plus immediate action points.' },
      { cat: 'Feature analysis', icon: 'settings', q: 'How many terminals have Standalone enabled? List them.', desc: 'Count, list and report link — device.enableStandalone.' },
    ],
    models: MODES,
    defaultMode: 'analytics',
    groups: [
      { label: 'Business enablement', icon: 'sparkles', prompts: ['Order new terminals for a store I\u2019m opening', 'Set up kitting and custom packaging for my next rollout', 'Create a new store and pre-configure its devices'] },
      { label: 'Fleet security analysis', icon: 'settings', prompts: ['Show firmware and SDK version distribution across my fleet', 'Which devices fall short of our security baseline?', 'What should I update first to meet PCI requirements?'] },
      { label: 'Operational intelligence', icon: 'store', prompts: ['Which terminals should I redistribute between stores?', 'Summarise fleet performance from the Management API', 'Where is device utilisation lowest across my locations?'] },
      { label: 'Settings & inheritance', icon: 'settings', prompts: ['Which settings are overridden at device level vs inherited?', 'Show the configuration distribution overview'] },
      { label: 'Troubleshooting visibility', icon: 'search', prompts: ['Pull the latest terminal logs for a device', 'Open the audit log for recent changes'] },
    ],
  },
  devices: {
    placeholder: 'Ask about ordering, onboarding or fulfilment…',
    intro: 'Ask about the device lifecycle — ordering, onboarding, supply chain and returns.',
    models: MODES,
    defaultMode: 'ops',
    // Surfaced first when the panel opens; everything else collapses under "See more insights".
    featured: [
      { cat: 'Look up a device', icon: 'search', q: "Why isn't this terminal working?", desc: 'Scan or enter a device ID for live status — connectivity, battery, SDK/firmware, last transaction and recent changes — with clear next steps to get it trading again.' },
      { cat: 'Reassignment by prompt', icon: 'refresh', q: 'Reassign all terminals from Tokyo stores to Osaka stores.', desc: 'Reassign in plain language — the AI resolves the terminals and shows a confirm card, flagging any stuck mid-move, before it acts.' },
    ],
    groups: [
      { label: 'Merchant lifecycle services', icon: 'refresh', prompts: ['Order a replacement for a damaged terminal', 'Start a return and generate the shipping label', 'Check warranty and insurance status for a device'] },
      { label: 'Onboarding', icon: 'store', prompts: ['What\u2019s needed for this terminal to transact on arrival?', 'Pre-board a new device to a location', 'Show devices waiting to be activated'] },
      { label: 'Supply chain & fulfilment', icon: 'grid', prompts: ['Track orders from approval to fulfilment', 'Register new stock into inventory', 'Show shipments and returns in progress'] },
    ],
  },
  studio: {
    placeholder: 'Ask AI to customise or configure devices…',
    intro: 'Ask AI to customise devices and launch payment features — I\u2019ll update the preview.',
    models: MODES,
    defaultMode: 'custom',
    // Surfaced first when the panel opens; everything else collapses under "See more insights".
    featured: [
      { cat: 'Market setup', icon: 'sparkles', q: 'Create a configuration for devices for international clients in Japan', desc: 'Enable DCC, offline payments, JCB & e-money and Japanese localisation — bundled into one ready-to-apply configuration.' },
    ],
    groups: [
      { label: 'Customisation', icon: 'settings', prompts: ['Install an Android app on these devices', 'Upload a media asset to the home screen', 'Push a configuration update to this scope'] },
      { label: 'Payment integration', icon: 'bank', prompts: ['Launch a new payment method for this configuration', 'Enable a new feature and confirm billing', 'Turn on DCC and set the margin'] },
    ],
  },
};

/* ============================================================= ASK CHAT DESIGN SYSTEM
   Reusable building blocks shared by every AI chat (Fleet · Location · Studio):
   · AskPromptCard  — a featured "main prompt" card (category · question · description)
   · AskSectionTitle — small caps section label
   · AskInsightRow  — one-line insight/prompt row (icon · text · arrow)
   · AskLine        — one-line callout with a leading icon and an optional right-side CTA
                      (used for the Tip and the Next-best-action rows)                    */
function AskPromptCard({ item, onClick }) {
  return (
    <button type="button" className="ns-tile" onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', textAlign: 'left', border: `1px solid ${T.border}`, borderRadius: T.radiusM, background: T.card, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.faint, marginBottom: 5 }}>{item.cat}</span>
      <Row gap={8} align="flex-start">
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: '19px' }}>{item.q}</span>
        <Ico name="arrow-right" size={16} color={T.faint} />
      </Row>
      <span style={{ display: 'block', fontSize: 12, color: T.sub, lineHeight: '17px', marginTop: 4 }}>{item.desc}</span>
    </button>
  );
}
function AskSectionTitle({ children }) {
  return <span style={{ fontSize: 12, fontWeight: 600, color: T.faint, padding: '0 10px 4px' }}>{children}</span>;
}
function AskInsightRow({ icon = 'sparkles', text, onClick }) {
  return (
    <button className="ns-suggest" onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', border: 0, background: 'transparent', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: T.ink, fontSize: 14 }}>
      <Ico name={icon} size={16} color={T.sub} />
      <span style={{ flex: 1 }}>{text}</span>
      <Ico name="arrow-right" size={16} color={T.faint} />
    </button>
  );
}
function AskLine({ icon, iconColor, children, action }) {
  return (
    <Row gap={10} align="center" style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--b-color-background-secondary)' }}>
      <span style={{ lineHeight: 0, flexShrink: 0 }}><Ico name={icon} size={16} color={iconColor || T.sub} /></span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.ink, lineHeight: '18px' }}>{children}</span>
      {action}
    </Row>
  );
}
/* Known status words → coloured Tag, so table Status columns read at a glance. */
const ASK_STATUS_TAG = {
  Healthy: 'green', Good: 'green', OK: 'grey', Fine: 'grey',
  Underperforming: 'red', Poor: 'red', Critical: 'red', 'At risk': 'orange', Review: 'orange', Warning: 'orange',
  Supported: 'green', Expiring: 'orange', Expired: 'red', Behind: 'orange', Offline: 'red', Online: 'green',
  Enabled: 'green', On: 'green', Off: 'grey', Disabled: 'grey', Ready: 'green',
};
const askRenderCell = (cell, ci, r) => (typeof cell === 'string' && ASK_STATUS_TAG[cell])
  ? <Tag label={cell} variant={ASK_STATUS_TAG[cell]} />
  : cell;

/* Text CTA used on the right of an AskLine (e.g. the Next-best-action row). */
function AskLineCTA({ label, onClick }) {
  return (
    <button onClick={onClick} className="ns-suggest"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--b-color-link-primary)', padding: '4px 6px', borderRadius: 8 }}>
      {label}<Ico name="arrow-right" size={16} color="var(--b-color-link-primary)" />
    </button>
  );
}

function PromptBox({ q, setQ, onSend, thinking, onAdd, models, defaultMode, placeholder = 'Ask your fleet anything…' }) {
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useOutside(addOpen, () => setAddOpen(false));
  const mList = models && models.length ? models : DEFAULT_ASK_MODELS;
  const [modelOpen, setModelOpen] = useState(false);
  const modelRef = useOutside(modelOpen, () => setModelOpen(false));
  const initialMode = (defaultMode && mList.find(m => m.id === defaultMode)) ? defaultMode : mList[0].id;
  const [modelId, setModelId] = useState(initialMode);
  const model = mList.find(m => m.id === modelId) || mList[0];
  return (
    <div className="ns-ask-box" style={{ border: `1px solid ${T.borderStrong}`, borderRadius: T.radiusL, background: T.card, boxShadow: 'var(--b-shadow-low)' }}>
      {/* free text */}
      <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        placeholder={placeholder}
        style={{ width: '100%', border: 0, outline: 'none', resize: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, lineHeight: '20px', color: T.ink, padding: '12px 12px 6px' }} />
      {/* action toolbar — Plus + Mode aligned to the same height and vertically centered */}
      <Row gap={6} align="center" style={{ padding: '6px 8px 8px' }}>
        <div ref={addRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: 28 }}>
          <button onClick={() => setAddOpen(o => !o)} title="Add" aria-label="Add" className="ns-suggest"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}>
            <Ico name="plus" size={16} color={T.sub} />
          </button>
          {addOpen && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 600 }}>
              <Menu items={NL_ADD_ITEMS} onSelect={(v) => { setAddOpen(false); onAdd && onAdd(v); }} />
            </div>
          )}
        </div>
        <div ref={modelRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: 28 }}>
          <span onClick={() => setModelOpen(o => !o)} title="Choose mode (e.g. Devin)" className="ns-suggest"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 8px', borderRadius: 8, fontSize: 13, color: T.sub, cursor: 'pointer' }}>
            <Ico name={model.icon || 'sparkles'} size={16} color={T.sub} />
            Mode: {model.label}
            <Ico name="chevron-down-small" size={16} color={T.faint} />
          </span>
          {modelOpen && mList.length > 1 && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 600 }}>
              <Menu items={mList.map(m => ({ value: m.id, label: m.label, icon: m.icon }))}
                onSelect={(v) => { setModelId(v); setModelOpen(false); }} />
            </div>
          )}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <IconButton icon="arrow-up" variant="primary" condensed onClick={onSend} disabled={thinking || !q.trim()} title="Send" />
        </div>
      </Row>
    </div>
  );
}

function NLSearch({ onSaveTile, onExplore, onMinimize, onToggleExpand, expanded, notify, context }) {
  const ctx = context || ASK_CONTEXTS.fleet;
  const [q, setQ] = useState('');
  const [thinking, setThinking] = useState(false);
  const [ans, setAns] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [history, setHistory] = useState([]); // drilled-down insights: { id, q, ans, pinned }
  const [histOpen, setHistOpen] = useState(true);
  const run = (text) => {
    const raw = (text || q).trim();
    const query = raw.toLowerCase();
    if (!query) return;
    setThinking(true); setAns(null);
    setTimeout(() => {
      const hasId = /[a-z0-9]{2,6}-\d{5,}/i.test(raw); // terminal ID e.g. SFO1-0544000067
      let best = null;
      // 1) exact canned question (clicking a featured/starter card)
      best = D.nlAnswers.find(a => a.question.toLowerCase() === query) || null;
      // 2) "resolve/fix" a terminal → resolution answer
      if (!best && hasId && /resolve|fix|solve|repair/.test(query)) best = D.nlAnswers.find(a => a.resolve) || null;
      // 3) a bare terminal ID → run the diagnosis
      if (!best && hasId) best = D.nlAnswers.find(a => a.diag) || null;
      // 4) fall back to keyword scoring
      if (!best) {
        best = D.nlAnswers[0]; let bestScore = -1;
        D.nlAnswers.forEach(a => { const score = a.match.filter(m => query.includes(m)).length; if (score > bestScore) { bestScore = score; best = a; } });
      }
      setAns(best); setThinking(false);
      // record in history (latest first; move an existing one to top, keep its pin)
      setHistory(h => { const ex = h.find(x => x.q === best.question); return ex ? [ex, ...h.filter(x => x !== ex)] : [{ id: Date.now(), q: best.question, ans: best, pinned: false }, ...h]; });
    }, 650);
  };
  const togglePin = (id) => setHistory(h => h.map(x => x.id === id ? { ...x, pinned: !x.pinned } : x));
  const openHistory = (item) => { setAns(item.ans); setQ(''); setThinking(false); };
  const newSession = () => { setQ(''); setAns(null); setThinking(false); setMoreOpen(false); };
  const sortedHistory = [...history].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  const pinned = sortedHistory.filter(x => x.pinned);
  const recent = sortedHistory.filter(x => !x.pinned);
  return (
    <div style={{ ...surface, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="ns-tile">
      {/* header */}
      <Row gap={10} style={{ flexShrink: 0, padding: `${T.s3}px ${T.s4}px`, borderBottom: `1px solid ${T.sep}` }}>
        <span style={{ lineHeight: 0, flexShrink: 0 }}><Ico name="sparkles" size={18} color="#00D16A" /></span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>What would you like to know?</span>
        <Row gap={2}>
          {onToggleExpand && <GlyphButton title={expanded ? 'Collapse' : 'Expand'} onClick={onToggleExpand}><ExpandGlyph collapsed={expanded} /></GlyphButton>}
          {onMinimize && <IconButton icon="minus" variant="tertiary" onClick={onMinimize} title="Minimize" />}
        </Row>
      </Row>

      {/* body — collapsible history sidebar + conversation/composer column */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* history sidebar (collapsible, max 200px) — only in the expanded panel */}
        {expanded && (
        <div style={{ width: histOpen ? 220 : 44, flexShrink: 0, borderRight: `1px solid ${T.sep}`, background: T.card, display: 'flex', flexDirection: 'column', minHeight: 0, transition: 'width 120ms' }}>
          <Row style={{ padding: '8px 10px', alignItems: 'center', justifyContent: histOpen ? 'space-between' : 'center', flexShrink: 0 }}>
            {histOpen ? (
              <button onClick={newSession} title="Start a new session" className="ns-suggest"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 0, background: 'transparent', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: T.ink }}>
                <Ico name="plus" size={14} color="var(--b-color-label-primary)" />
                New session
              </button>
            ) : <span />}
            <GlyphButton title={histOpen ? 'Hide history' : 'Show history'} onClick={() => setHistOpen(o => !o)}><PanelToggleIcon size={16} flip={!histOpen} /></GlyphButton>
          </Row>
          {histOpen && (
            <div className="ns-chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 6px 8px' }}>
              {sortedHistory.length === 0 ? (
                <span style={{ fontSize: 12, color: T.faint, padding: '4px 8px', display: 'block', lineHeight: '16px' }}>Insights you open appear here.</span>
              ) : (
                <>
                  {pinned.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ display: 'block', fontSize: 10, fontWeight: 600, color: T.faint, padding: '4px 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pinned</span>
                      {pinned.map(item => (
                        <div key={item.id} className="ns-suggest" style={{ display: 'flex', alignItems: 'flex-start', gap: 4, borderRadius: 8, padding: '6px', background: ans === item.ans ? 'var(--b-color-background-secondary)' : undefined }}>
                          <button onClick={() => openHistory(item)} title={item.q} style={{ flex: 1, minWidth: 0, border: 0, background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 12.5, color: T.ink, lineHeight: '16px', padding: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.q}</button>
                          <button onClick={() => togglePin(item.id)} title="Unpin" style={{ border: 0, background: 'none', cursor: 'pointer', lineHeight: 0, padding: 2, flexShrink: 0 }}><Ico name="star-fill" size={13} color="var(--b-color-decorative-blue)" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  {recent.length > 0 && (
                    <div>
                      <span style={{ display: 'block', fontSize: 10, fontWeight: 600, color: T.faint, padding: '4px 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>History</span>
                      {recent.map(item => (
                        <div key={item.id} className="ns-suggest" style={{ display: 'flex', alignItems: 'flex-start', gap: 4, borderRadius: 8, padding: '6px', background: ans === item.ans ? 'var(--b-color-background-secondary)' : undefined }}>
                          <button onClick={() => openHistory(item)} title={item.q} style={{ flex: 1, minWidth: 0, border: 0, background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 12.5, color: T.ink, lineHeight: '16px', padding: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.q}</button>
                          <button onClick={() => togglePin(item.id)} title="Pin" style={{ border: 0, background: 'none', cursor: 'pointer', lineHeight: 0, padding: 2, flexShrink: 0 }}><Ico name="star-fill" size={13} color={T.faint} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        )}
        {/* conversation + composer */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      {/* scrollable conversation area */}
      <div className="ns-chat-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: T.s4 }}>
        {!ans && !thinking && (
          <Col gap={T.s4}>
            <span style={{ fontSize: 13, color: T.sub, lineHeight: '19px' }}>{ctx.intro}</span>
            {/* Featured "main prompt" cards — side-by-side when the panel is expanded */}
            {ctx.featured && (
              <div style={{ display: 'grid', gridTemplateColumns: expanded ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 10, alignItems: 'stretch' }}>
                {ctx.featured.map(f => <AskPromptCard key={f.q} item={f} onClick={() => run(f.q)} />)}
              </div>
            )}
            {/* "See more insights" — collapsed when featured prompts exist */}
            {ctx.featured && (
              <button type="button" onClick={() => setMoreOpen(o => !o)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#00A152', padding: '2px 6px', borderRadius: 8 }}>
                {moreOpen ? 'Hide insights' : 'See more insights'}
                <Ico name={moreOpen ? 'chevron-up-small' : 'chevron-down-small'} size={16} color="#00A152" />
              </button>
            )}
            {/* Insights list — grouped title + insight prompt rows */}
            {(!ctx.featured || moreOpen) && ctx.groups.map(g => (
              <Col key={g.label} gap={1}>
                <AskSectionTitle>{g.label}</AskSectionTitle>
                {g.prompts.map(p => <AskInsightRow key={p} icon={g.icon} text={p} onClick={() => run(p)} />)}
              </Col>
            ))}
          </Col>
        )}
        {thinking && <Row gap={10} style={{ padding: '8px 2px' }}><LoadingIndicator size={18} /><span style={{ fontSize: 13, color: T.sub }}>Querying the fleet data model…</span></Row>}
        {ans && (() => {
          const followups = D.nlAnswers.filter(a => a !== ans).slice(0, 3);
          return (
          <div className="ns-fade">
            {/* question + save */}
            <Row style={{ marginBottom: 24 }}>
              <Row gap={8} style={{ flex: 1, minWidth: 0 }}><Ico name="sparkles" size={16} color="var(--b-color-label-primary)" /><span style={{ fontSize: 13, color: T.sub }}>{ans.question}</span></Row>
              {onSaveTile && <Button variant="secondary" condensed iconLeft="plus" onClick={() => onSaveTile(ans)}>Save as tile</Button>}
            </Row>
            {/* headline number + summary, stacked above the table (full width in the modal) */}
            <Col gap={6} style={{ marginBottom: 24 }}>
              <Row gap={10} align="baseline">
                <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em', fontFamily: 'var(--b-font-family-secondary)' }}>{ans.metric.value}</span>
                <TrendPill trend={ans.metric.trend} dir={ans.metric.dir} />
              </Row>
              <span style={{ fontSize: 12, color: T.sub, fontWeight: 500 }}>{ans.metric.label}</span>
            </Col>
            {/* evidence — supporting table (status cells as tags, no per-header info noise) */}
            <Grid columns={ans.grid.columns} rows={ans.grid.rows.slice(0, 6)} dense hideHeaderInfo renderCell={askRenderCell} />
            {/* insight — plain line under the table, full width (no alert box) */}
            {ans.note && (
              <Row gap={8} align="flex-start" style={{ marginTop: 16 }}>
                <span style={{ lineHeight: 0, flexShrink: 0 }}><Ico name="insight" size={18} color="var(--b-color-label-primary)" /></span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.ink, lineHeight: '18px' }}>{ans.note}</span>
              </Row>
            )}
            {/* act — consistent action pills; next-best-action is a pill too (arrow + link colour) */}
            {((ans.actions && ans.actions.length > 0) || ans.deepDive) && (
              <Row gap={8} align="center" style={{ flexWrap: 'wrap', marginTop: 24 }}>
                {ans.actions && ans.actions.map(a => (
                  <button key={a.label} className="ns-chip-btn" onClick={() => notify && notify(a.msg)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${T.borderStrong}`, background: T.card, borderRadius: 999, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: T.ink }}>
                    {a.label}
                  </button>
                ))}
                {ans.deepDive && (
                  <button onClick={() => run(ans.deepDive.q)} className="ns-chip-btn" title={ans.deepDive.prompt}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${T.borderStrong}`, background: T.card, borderRadius: 999, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: T.ink }}>
                    {ans.deepDive.label}
                  </button>
                )}
              </Row>
            )}
            {/* you might also ask — insights list (title + insight prompt rows) */}
            <Col gap={1} style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${T.sepFaint}` }}>
              <AskSectionTitle>You might also ask</AskSectionTitle>
              {followups.map(f => <AskInsightRow key={f.question} icon="sparkles" text={f.question} onClick={() => run(f.question)} />)}
            </Col>
          </div>
          );
        })()}
      </div>

      {/* pinned prompt */}
      <div style={{ flexShrink: 0, padding: T.s4, borderTop: `1px solid ${T.sep}` }}>
        <PromptBox q={q} setQ={setQ} onSend={() => run()} thinking={thinking} models={ctx.models} defaultMode={ctx.defaultMode} placeholder={ctx.placeholder}
          onAdd={(v) => notify && notify((NL_ADD_ITEMS.find(i => i.value === v) || {}).label + ' — coming soon')} />
      </div>
        </div>{/* /conversation+composer */}
      </div>{/* /body row */}
    </div>
  );
}

/* Floating "Ask" launcher — Bento action-bar-styled FAB opening the chat panel.
   Minimize (–) collapses back to the FAB; Expand blows it up to a full-page modal. */
function FloatingAsk({ onSaveTile, onExplore, notify, context = 'fleet' }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const ctx = ASK_CONTEXTS[context] || ASK_CONTEXTS.fleet;
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key !== 'Escape') return; if (expanded) setExpanded(false); else setOpen(false); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, expanded]);

  const panel = (
    <NLSearch onSaveTile={onSaveTile} onExplore={onExplore} notify={notify} context={ctx}
      onMinimize={() => setOpen(false)} onToggleExpand={() => setExpanded(e => !e)} expanded={expanded} />
  );

  return (
    <>
      {open && expanded && (
        <div className="ns-scrim" onClick={() => setExpanded(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,18,34,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="ns-sheet" onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(960px, 100%)', height: 'min(860px, 92vh)', borderRadius: T.radiusL, boxShadow: 'var(--b-shadow-high)', overflow: 'hidden' }}>
            {panel}
          </div>
        </div>
      )}
      {open && !expanded && (
        <div className="ns-fade" style={{ position: 'fixed', bottom: 88, right: 24, width: 420, maxWidth: 'calc(100vw - 48px)', height: 560, maxHeight: 'calc(100vh - 128px)', zIndex: 360, boxShadow: 'var(--b-shadow-high)', borderRadius: T.radiusL }}>
          {panel}
        </div>
      )}
      {!open && (
        <button className="ns-fab" onClick={() => setOpen(true)} aria-label="Ask your fleet" title="Ask your fleet"
          style={{ position: 'fixed', bottom: 24, right: 24, height: 48, padding: '0 18px 0 16px', borderRadius: 12, border: 0, cursor: 'pointer', background: 'var(--b-color-background-inverse-primary)', color: 'var(--b-color-label-inverse-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, boxShadow: 'var(--b-shadow-high)', zIndex: 361 }}>
          <Ico name="sparkles" size={18} color="var(--b-color-label-inverse-primary)" />
          <span>Ask</span>
        </button>
      )}
    </>
  );
}

/* ============================================================= SDK & OS HEALTH */
const SDK_STATUS_VARIANT = { Supported: 'green', Expiring: 'orange', Expired: 'red' };

/* Summary tile on Fleet Intelligence — the few numbers that drive action + a status mini-bar. */
function SdkHealthTile({ onExplore }) {
  const d = D.sdkHealth, sdk = d.sdk.kpis, os = d.os.kpis;
  const bar = [
    { n: sdk.expired.count, c: 'var(--b-color-decorative-red)', label: 'Expired' },
    { n: sdk.expiring.count, c: 'var(--b-color-decorative-orange)', label: 'Expiring' },
    { n: sdk.supported.count, c: 'var(--b-color-decorative-green)', label: 'Supported' },
  ];
  const metric = (dot, label, value, pct, variant) => (
    <Row style={{ justifyContent: 'space-between', gap: 10 }}>
      <Row gap={8} style={{ minWidth: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: T.ink }}>{label}</span>
      </Row>
      <Row gap={8}>
        <span className="ns-num" style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
        <Tag label={pct} variant={variant} />
      </Row>
    </Row>
  );
  return (
    <div style={{ ...surface, overflow: 'hidden' }} className="ns-tile">
      <TileHeader title="SDK & OS health" subtitle={`Tap to Pay & card readers · ${d.totalDevices} devices`}
        info="SDK & OS versions across your Tap to Pay and card-reader fleet. Severity reflects the worst metric."
        right={<Button variant="tertiary" condensed iconRight="arrow-right" onClick={onExplore}>Explore</Button>} />
      <Col gap={14} style={{ padding: `0 ${T.s5}px ${T.s5}px` }}>
        <Col gap={10}>
          {metric('var(--b-color-decorative-red)', 'Devices on expired SDKs', sdk.expired.count, `${sdk.expired.pct}%`, 'red')}
          {metric('var(--b-color-decorative-orange)', 'Devices on expiring SDKs', sdk.expiring.count, `${sdk.expiring.pct}%`, 'orange')}
        </Col>
        <div style={{ height: 1, background: T.sepFaint }} />
        <BentoList items={[
          { label: 'Next SDK expiry', value: <span>Android {sdk.upcomingAndroid.version} · <b>in {sdk.upcomingAndroid.inDays} days</b></span> },
          { label: 'Unsupported OS', value: os.onUnsupported },
          { label: 'Minimum OS', value: os.onMinimum },
        ]} />
        {/* SDK mix mini-bar */}
        <Col gap={6}>
          <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', background: T.page }}>
            {bar.map(s => s.n > 0 && <div key={s.label} title={`${s.label} ${s.n}`} style={{ width: `${(s.n / sdk.total) * 100}%`, background: s.c }} />)}
          </div>
          <Row gap={16} style={{ flexWrap: 'wrap' }}>
            {bar.map(s => (
              <Row key={s.label} gap={6}><span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }} /><span style={{ fontSize: 12, color: T.sub }}>{s.label} <b className="ns-num" style={{ color: T.ink }}>{s.n}</b></span></Row>
            ))}
          </Row>
        </Col>
      </Col>
    </div>
  );
}

/* Connectivity & health tile — fleet rollup of the per-terminal Core Terminal Dashboard signals
   (websocket failures/latency, primary interface split, weak signal, battery, firmware installs). */
function ConnectivityTile({ notify, onExplore }) {
  const d = D.connectivity;
  const metric = (dot, label, value, pct, variant) => (
    <Row style={{ justifyContent: 'space-between', gap: 10 }}>
      <Row gap={8} style={{ minWidth: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: T.ink }}>{label}</span>
      </Row>
      <Row gap={8}>
        <span className="ns-num" style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
        {pct != null && <Tag label={pct} variant={variant} />}
      </Row>
    </Row>
  );
  const iface = [
    { n: d.iface.wifi, c: 'var(--b-color-decorative-blue)', label: 'Wi-Fi' },
    { n: d.iface.cellular, c: 'var(--b-color-decorative-orange)', label: 'Cellular' },
  ];
  return (
    <div style={{ ...surface, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }} className="ns-tile">
      <TileHeader title="Fleet health" subtitle={`Terminal telemetry · ${d.period}`}
        info={<span><b>Find and fix at-risk terminals.</b> Spot the ones failing payments or about to drop offline — from their connectivity, signal and battery — and troubleshoot them before they cost you sales.</span>}
        right={<Button variant="tertiary" condensed iconRight="arrow-right" onClick={onExplore}>Explore</Button>} />
      <Col gap={14} style={{ padding: `0 ${T.s5}px ${T.s5}px`, flex: 1 }}>
        <Col gap={10}>
          {metric('var(--b-color-decorative-red)', 'Failed transactions (connectivity-linked)', D.fmt(d.failedTx.count), `${d.failedTx.connectivityLinked}% linked`, 'red')}
          {metric('var(--b-color-decorative-orange)', 'WebSocket connection failures', D.fmt(d.wsFailures.count), `${d.wsFailures.pct}%`, 'orange')}
          {metric('var(--b-color-decorative-orange)', 'Terminals on weak signal', D.fmt(d.weakSignal.count), `${d.weakSignal.pct}%`, 'orange')}
        </Col>
        <div style={{ height: 1, background: T.sepFaint }} />
        <BentoList items={[
          { label: 'Avg connection latency', value: <span><b>{d.avgLatencyMs} ms</b></span> },
          { label: 'Terminals under 20% battery', value: D.fmt(d.lowBattery.count) },
          { label: 'Firmware installs', value: d.firmwareInstalls },
        ]} />
        {/* primary interface mini-bar (Wi-Fi vs Cellular) */}
        <Col gap={6}>
          <span style={{ fontSize: 12, color: T.sub, fontWeight: 500 }}>Primary connected interface</span>
          <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', background: T.page }}>
            {iface.map(s => s.n > 0 && <div key={s.label} title={`${s.label} ${s.n}%`} style={{ width: `${s.n}%`, background: s.c }} />)}
          </div>
          <Row gap={16} style={{ flexWrap: 'wrap' }}>
            {iface.map(s => (
              <Row key={s.label} gap={6}><span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }} /><span style={{ fontSize: 12, color: T.sub }}>{s.label} <b className="ns-num" style={{ color: T.ink }}>{s.n}%</b></span></Row>
            ))}
          </Row>
        </Col>
      </Col>
    </div>
  );
}

/* Explore → full-screen Connectivity & health, mirroring the per-terminal Core Terminal Dashboard
   (communication events, websocket failed/latency, bootups, interface split, signal & battery). */
const CONN_SCOPES = [
  { value: 'all', label: 'All terminals', factor: 1 },
  { value: 'model:S1F2', label: 'S1F2 terminals', factor: 0.28 },
  { value: 'model:AMS1', label: 'AMS1 terminals', factor: 0.34 },
  { value: 'model:V400m', label: 'V400m terminals', factor: 0.18 },
  // Individual terminals — derived from the failed-transaction troubleshoot list so every one is selectable/scoped.
  ...D.connectivity.troubleshoot.map(t => ({ value: t.id, label: t.terminal, factor: 0.00004 })),
];
/* Store/merchant leaderboard — connects fleet metrics to "which store". Rows are pre-sorted by the caller.
   Columns: store · merchant · devices · WebSocket drops · lowest Wi-Fi · needs-attention count. Click → drill. */
// Why a store/merchant is on the watchlist — its dominant issue as a short, intuitive tag.
function storeWatchReason(s) {
  if (s.wsDrops >= 500) return { key: 'ws', label: 'WebSocket failures', variant: 'red' };
  if (s.offline > 0) return { key: 'offline', label: 'Offline', variant: 'red' };
  if ((s.failed || 0) >= 60) return { key: 'failed', label: 'Failed payments', variant: 'orange' };
  if (s.minWifi <= -85) return { key: 'weak', label: 'Weak signal', variant: 'orange' };
  if (s.atRisk > 0) return { key: 'risk', label: 'At risk', variant: 'orange' };
  return { key: 'stable', label: 'Stable', variant: 'grey' };
}
const WATCH_REASON_OPTS = [
  { value: 'ws', label: 'WebSocket failures' }, { value: 'offline', label: 'Offline terminals' }, { value: 'failed', label: 'Failed payments' },
  { value: 'weak', label: 'Weak signal' }, { value: 'risk', label: 'At risk' }, { value: 'stable', label: 'Stable' },
];
// Guided fix steps for a store's dominant connectivity issue.
function storeFixSteps(key, s) {
  switch (key) {
    case 'ws': return { heading: 'WebSocket connection keeps dropping', steps: [
      'Check the store\u2019s internet connection \u2014 confirm the router/modem is online and the link is stable.',
      'Make sure terminals aren\u2019t all on one overloaded access point; spread them across APs where possible.',
      'Enable cellular fallback on the affected terminals so payments keep working when Wi\u2011Fi drops.',
      'Restart the terminals that are dropping most often.',
    ] };
    case 'offline': return { heading: `${s.offline} terminal${s.offline > 1 ? 's are' : ' is'} offline`, steps: [
      'Confirm the offline terminals are powered on and within Wi\u2011Fi or cellular range.',
      'Check the store network \u2014 is the router / access point reachable?',
      'Power\u2011cycle the offline terminals.',
    ] };
    case 'failed': return { heading: 'Payments are failing on this store\u2019s terminals', steps: [
      'Review connection latency and signal on the affected terminals.',
      'Enable cellular fallback so transactions complete if Wi\u2011Fi is unstable.',
      'Check for a pending app or firmware issue on the affected models.',
    ] };
    case 'weak': case 'risk': return { heading: 'Terminals are on a weak signal', steps: [
      'Reposition the terminals closer to the access point.',
      'Remove obstructions or sources of interference between the terminal and the AP.',
      'If coverage is poor across the floor, add or relocate an access point.',
      'Enable cellular fallback as a backup path.',
    ] };
    default: return { heading: 'This store looks stable', steps: ['No action needed right now \u2014 connection health is within the normal range.'] };
  }
}
// Adaptive "Detail" value — the number behind the row's reason.
function storeWatchDetail(s) {
  switch (storeWatchReason(s).key) {
    case 'ws': return { label: `${D.fmt(s.wsDrops)} drops`, critical: true };
    case 'offline': return { label: `${s.offline} offline`, critical: true };
    case 'failed': return { label: `${D.fmt(s.failed || 0)} failed`, critical: true };
    case 'weak': return { label: `${s.minWifi} dBm`, critical: true };
    case 'risk': return { label: `${s.minWifi} dBm`, critical: s.minWifi <= -80 };
    default: return { label: `${D.fmt(s.wsDrops)} drops`, critical: false };
  }
}
function StoreLeaderboard({ rows, onPick, limit = 8, title, subtitle, info, right, byMerchant }) {
  const top = rows.slice(0, limit);
  const th = { textAlign: 'left', padding: '10px 14px', fontSize: 12, color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.sep}`, whiteSpace: 'nowrap', background: T.card };
  const thR = { ...th, textAlign: 'right' };
  const td = { padding: '11px 14px', fontSize: 13, color: T.ink, borderBottom: `1px solid ${T.sepFaint}`, whiteSpace: 'nowrap' };
  const tdR = { ...td, textAlign: 'right', fontFamily: 'var(--b-font-family-secondary)' };
  return (
    <div style={{ ...surface, overflow: 'hidden', height: '100%' }} className="ns-tile">
      <TileHeader title={title} subtitle={subtitle} info={info} right={right} />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>{byMerchant ? 'Merchant' : 'Store'}</th>
            <th style={th}>Why</th>
            <th style={thR}>Needs attention</th>
            <th style={thR}>Detail</th>
          </tr></thead>
          <tbody>
            {top.map((s, i) => {
              const last = i === top.length - 1;
              const r = storeWatchReason(s);
              const dt = storeWatchDetail(s);
              return (
              <tr key={s.key} className="ns-row" style={{ cursor: onPick ? 'pointer' : 'default' }} onClick={() => onPick && onPick(s)}>
                <td style={{ ...td, fontWeight: 500, borderBottom: last ? 'none' : td.borderBottom }}>{byMerchant ? s.merchant : s.store}</td>
                <td style={{ ...td, borderBottom: last ? 'none' : td.borderBottom }}><Tag label={r.label} variant={r.variant} /></td>
                <td style={{ ...tdR, borderBottom: last ? 'none' : td.borderBottom, color: T.ink, fontWeight: 500 }}>{s.attention ? `${s.attention} of ${s.devices}` : <span style={{ color: T.faint, fontWeight: 400 }}>All healthy</span>}</td>
                <td style={{ ...tdR, borderBottom: last ? 'none' : td.borderBottom, color: T.ink }}>{dt.label}</td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function ConnectivityDetail({ onBack, notify, initialScope, focus, asPage, onOpenStudio, onOpenStore }) {
  const d = D.connectivity;
  const [range, setRange] = useState('90d');
  const [scope, setScope] = useState(initialScope || 'all'); // device-level filter
  const [troubleshootId, setTroubleshootId] = useState(null); // per-terminal troubleshoot full-page drill-down
  const [studioScope, setStudioScope] = useState(null); // Config → Device Studio simulator (opened over the device overview)
  const [trendMetrics, setTrendMetrics] = useState([0]); // Fleet trends chart — selected signals (indices into c.panels)
  const [trendGran, setTrendGran] = useState('day'); // Fleet trends granularity — day | week | month (re-buckets the series)
  const [devicesOpen, setDevicesOpen] = useState(false); // the device list lives in a full-page modal, opened from the action cards / leaderboard
  const [storeInfo, setStoreInfo] = useState(null); // storeId → store information modal (same as Devices & locations)
  const [storesListOpen, setStoresListOpen] = useState(false); // Stores-to-watch "Explore" → full ranked store/merchant list
  const [failStores, setFailStores] = useState(null); // which stores are plotted in the Failing stores trend (null = top 5)
  const [reasonFilter, setReasonFilter] = useState([]); // Stores-to-watch list: filter by "Why" reason
  const [troubleStore, setTroubleStore] = useState(null); // store id for the guided Troubleshoot modal
  const [storeQ, setStoreQ] = useState(''); // search in the stores-to-watch list
  const [selStores, setSelStores] = useState([]); // selected store keys in the stores list (for bulk troubleshoot)
  const [bulkOpen, setBulkOpen] = useState(false); // bulk Troubleshoot modal
  const scrollToDevices = () => setDevicesOpen(true); // (name kept: callers "go to devices" → open the modal)
  // ---- Level 2 fleet-devices reporting: independent filters for the device list, Explore report & export ----
  const [countryF, setCountryF] = useState([]);
  const [modelF, setModelF] = useState([]);
  const [versionF, setVersionF] = useState([]);
  const [statusF, setStatusF] = useState(['At risk', 'Offline']); // default view = terminals with connectivity-linked failed transactions
  const [storeF, setStoreF] = useState([]); // filter the device list to specific store(s) — driven by the store leaderboards
  const [devSearch, setDevSearch] = useState('');
  // Explore-signals filters (drive the Device signals charts): country/version re-seed, event type filters panels.
  const [sigCountry, setSigCountry] = useState([]);
  const [sigVersion, setSigVersion] = useState([]);
  // Which signal graphs are shown — the section is modular/customizable; the choice persists across sessions.
  // null = show all (panels are derived later in `c`, so we resolve the concrete list at render time).
  const [sigCharts, setSigCharts] = useState(() => { try { const s = JSON.parse(localStorage.getItem('ns_sig_charts') || 'null'); return Array.isArray(s) ? s : null; } catch (e) { return null; } });
  const [customizeOpen, setCustomizeOpen] = useState(false);
  useEffect(() => { try { localStorage.setItem('ns_sig_charts', JSON.stringify(sigCharts)); } catch (e) { /* ignore */ } }, [sigCharts]);
  const [trendsOpen, setTrendsOpen] = useState(false); // collapsible "Explore trends" zone (charts are secondary to the device list)
  const [boardBy, setBoardBy] = useState('store'); // Explore leaderboard grouping — by store | by merchant
  const [devPage, setDevPage] = useState(1);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [groupBy, setGroupBy] = useState('country');
  const DEV_PAGE = 50;
  const fleet = CONN_FLEET; // the estate fleet (derived from SM_STORES) so totals match Locations / Device intelligence
  const uniq = (k) => Array.from(new Set(fleet.map(x => x[k])));
  const toggle = (setter) => (v) => { setter(a => a.includes(v) ? a.filter(x => x !== v) : [...a, v]); setDevPage(1); };
  const fleetFiltered = useMemo(() => fleet.filter(dv =>
    (!countryF.length || countryF.includes(dv.country)) &&
    (!modelF.length || modelF.includes(dv.model)) &&
    (!versionF.length || versionF.includes(dv.appVersion)) &&
    (!statusF.length || statusF.includes(dv.status)) &&
    (!storeF.length || storeF.includes(dv.store)) &&
    (!devSearch || dv.terminal.toLowerCase().includes(devSearch.trim().toLowerCase()))
  ), [countryF, modelF, versionF, statusF, storeF, devSearch]);
  // Drill from a store leaderboard into the device list, scoped to that store.
  const focusStore = (name) => { setStoreF([name]); setStatusF([]); setCountryF([]); setModelF([]); setVersionF([]); setDevSearch(''); setDevPage(1); scrollToDevices(); };
  // Level 3 proactive: devices trending toward failure (at-risk / offline) and those on older app versions.
  const atRiskDevices = fleet.filter(dv => dv.status !== 'Healthy');
  const oldVerDevices = fleet.filter(dv => dv.appVersion === '1.39.2' || dv.appVersion === '1.40.3');
  const statusCounts = { Healthy: fleet.filter(dv => dv.status === 'Healthy').length, 'At risk': fleet.filter(dv => dv.status === 'At risk').length, Offline: fleet.filter(dv => dv.status === 'Offline').length };
  // Single source of truth for failed transactions — the sum of the device list, so every number on the page reconciles.
  const failedTotal = fleet.reduce((s2, dv) => s2 + dv.failed, 0);
  const failedDeviceCount = fleet.filter(dv => dv.failed > 0).length;
  const revenueAtRiskK = d.failedTx.revenueAtRiskK; // same figure as the Device intelligence › Fleet health tile
  const scopeDef = CONN_SCOPES.find(s => s.value === scope) || CONN_SCOPES[0];
  const isDevice = scope.startsWith('dev:');
  const kpiGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: T.s3 };
  const chartGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: T.s5 };
  // Deterministic daily series, re-seeded per scope so the drill-down changes with the filter.
  const c = useMemo(() => {
    const N = 24, MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const start = new Date(2026, 6, 17).getTime(), end = new Date(2026, 8, 18).getTime();
    const labels = Array.from({ length: N }, (_, i) => { const dt = new Date(start + (end - start) * i / (N - 1)); return MON[dt.getMonth()] + ' ' + dt.getDate(); });
    // Seed from scope + the signal filters (country/version) so the charts re-aggregate when they change.
    let sk = 7; for (const ch of (scope + '|' + sigCountry.join(',') + '|' + sigVersion.join(','))) sk = (sk * 31 + ch.charCodeAt(0)) & 0x7fffffff;
    const f = scopeDef.factor;
    const rand = (seed) => { let x = (seed + sk) & 0x7fffffff; return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; }; };
    // count-type series scale with scope; signal/battery are per-device readings (unscaled).
    // o.trend = linear ramp across the window (e.g. comm events rising to a Sept peak, battery drifting down).
    const genC = (seed, base, amp, o = {}) => { const r = rand(seed); return Array.from({ length: N }, (_, i) => { let v = (base * (1 + (o.trend || 0) * (i / (N - 1))) + (r() - 0.5) * 2 * amp) * f; if (o.spike && r() > 0.85) v += o.spike * f * r(); return Math.max(0, Math.round(v)); }); };
    const gen = (seed, base, amp, o = {}) => { const r = rand(seed); return Array.from({ length: N }, (_, i) => { let v = base * (1 + (o.trend || 0) * (i / (N - 1))) + (r() - 0.5) * 2 * amp; if (o.spike && r() > 0.85) v += o.spike * r(); if (o.min != null) v = Math.max(o.min, v); if (o.max != null) v = Math.min(o.max, v); return Math.round(v); }); };
    // Series tuned to the per-terminal Core Terminal Dashboard: choppy comm rising, spiky ws-fails, flat-low latency w/ spikes, uniform bootups w/ a spike, near-zero firmware, wavy battery.
    const comm = genC(11, 380, 190, { trend: 0.9 }), wsFail = genC(23, 2, 2.2, { spike: 8 }), boot = genC(37, 26, 7, { spike: 70 }), fw = genC(53, 1, 1.4, { spike: 40 }), pay = genC(59, 240, 55), failedTx = genC(61, 90, 30, { spike: 60 });
    const latency = gen(31, 230, 90, { min: 120, spike: 1500 });
    const battery = gen(41, 82, 9, { min: 55, max: 96, trend: -0.1 });
    const wifiSig = gen(43, -62, 20, { min: -92, max: -38 });
    const cellSig = gen(47, -70, 8, { min: -95, max: -55 });
    const wifiPct = gen(51, 62, 8, { min: 45, max: 78 });
    const sum = (a) => a.reduce((x, y) => x + y, 0), avg = (a) => Math.round(sum(a) / a.length);
    return {
      labels, wifiPct, cellPct: wifiPct.map(v => 100 - v),
      panels: [
        // Failed transactions leads — the reason people open this page — then the connectivity signals that explain it.
        { title: 'Failed transactions', color: 'var(--b-color-decorative-red)', pts: failedTx, min: 0 },
        { title: 'WebSocket connection failed', color: 'var(--b-color-decorative-red)', pts: wsFail, min: 0 },
        { title: 'WebSocket connection latency', unit: 'ms', color: 'var(--b-color-decorative-green)', pts: latency, min: 0 },
        { title: 'Wi-Fi signal level', unit: 'dBm', color: '#3BA7A0', pts: wifiSig, min: -100, max: -20 },
        { title: 'Cellular signal level', unit: 'dBm', color: '#7B94B5', pts: cellSig, min: -110, max: -40 },
        { title: 'Communication events', color: 'var(--b-color-decorative-blue)', pts: comm, min: 0 },
        { title: 'Payment requests', color: 'var(--b-color-decorative-blue)', pts: pay, min: 0 },
        { title: 'Terminal bootups', color: '#E9A23B', pts: boot, min: 0 },
        { title: 'Battery level', unit: '%', color: '#E7C34B', pts: battery, min: 0, max: 100 },
      ],
      k: { comm: sum(comm), wsFail: sum(wsFail), latency: avg(latency), boot: sum(boot), fw: sum(fw), avgBattery: avg(battery), curBattery: battery[battery.length - 1], avgWifi: avg(wifiSig), avgCell: avg(cellSig), failedTx: sum(failedTx) },
    };
  }, [scope, sigCountry, sigVersion]);
  const chartCard = (p) => (
    <div key={p.title} style={{ ...surface, overflow: 'hidden' }}>
      <TileHeader title={p.title} subtitle={p.unit ? `Per day · ${p.unit}` : 'Per day'} />
      <div style={{ padding: `0 ${T.s5}px ${T.s5}px`, height: 200 }}>
        <LineChart data={{ labels: c.labels, min: p.min, max: p.max, unit: p.unit, series: [{ color: p.color, points: p.pts }] }} height={180} />
      </div>
    </div>
  );
  // Scope-aware KPI blocks — each carries a short explanation.
  // Same four at-risk blocks in every scope; a filtered device shows its own readouts so the summary stays consistent.
  const kpis = isDevice ? [
    { label: 'WebSocket failures', value: D.fmt(c.k.wsFail), hint: 'Failed connection attempts — spikes precede an outage.' },
    { label: 'Failed transactions', value: D.fmt(c.k.failedTx), hint: 'Declined/aborted at the terminal — often connectivity-linked.' },
    { label: 'Avg Wi-Fi signal', value: `${c.k.avgWifi} dBm`, hint: 'Weaker than -75 dBm risks drops.' },
    { label: 'Current battery', value: `${c.k.curBattery}%`, hint: 'Latest reported battery level.' },
  ] : [
    { label: 'WebSocket failures', value: `${D.fmt(d.wsFailures.count)} (${d.wsFailures.pct}%)`, hint: 'Failed persistent-connection attempts; spikes precede outages.' },
    { label: 'Failed transactions', value: D.fmt(failedTotal), hint: `Connectivity-linked failed payments across ${failedDeviceCount} terminals — ≈€${revenueAtRiskK}k revenue at risk.` },
    { label: 'Terminals on weak signal', value: `${D.fmt(d.weakSignal.count)} (${d.weakSignal.pct}%)`, hint: 'Devices below the safe Wi-Fi/cellular threshold.' },
    { label: 'Terminals under 20% battery', value: `${D.fmt(d.lowBattery.count)} (${d.lowBattery.pct}%)`, hint: 'At risk of shutting down mid-shift.' },
  ];
  // Primary connected interface donut (Wi-Fi vs Cellular).
  const R = 16, C = 2 * Math.PI * R, wifiLen = C * d.iface.wifi / 100;
  // Shared device-list body (filters + table + pagination) — reused by the inline Devices section and the "View all" modal.
  const renderDevicesBody = () => {
    const anyF = countryF.length || modelF.length || versionF.length || statusF.length || storeF.length || devSearch;
    const clearAll = () => { setCountryF([]); setModelF([]); setVersionF([]); setStatusF([]); setStoreF([]); setDevSearch(''); setDevPage(1); };
    const pages = Math.max(1, Math.ceil(fleetFiltered.length / DEV_PAGE));
    const page = Math.min(devPage, pages);
    const slice = fleetFiltered.slice((page - 1) * DEV_PAGE, page * DEV_PAGE);
    const sv = { Healthy: 'green', 'At risk': 'yellow', Offline: 'grey' };
    const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.sep}`, whiteSpace: 'nowrap', background: 'var(--b-color-background-secondary)' };
    const td = { padding: '11px 12px', fontSize: 13, color: T.ink, borderBottom: `1px solid ${T.sepFaint}`, whiteSpace: 'nowrap' };
    return (
      <>
        <Row gap={10} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', lineHeight: 0, color: T.faint, pointerEvents: 'none' }}><Ico name="search" size={16} color={T.faint} /></span>
            <input value={devSearch} onChange={e => { setDevSearch(e.target.value); setDevPage(1); }} placeholder="Search terminal ID…" style={{ height: 36, width: '100%', boxSizing: 'border-box', border: `1px solid ${T.sep}`, borderRadius: T.radiusM, padding: '0 12px 0 36px', fontFamily: 'inherit', fontSize: 14, color: T.ink, background: T.card }} />
          </div>
          <FilterChip label="Status" options={[{ value: 'At risk', label: 'At risk' }, { value: 'Offline', label: 'Offline' }, { value: 'Healthy', label: 'Healthy' }]} selected={statusF} onChange={toggle(setStatusF)} onClear={() => { setStatusF([]); setDevPage(1); }} />
          <FilterChip label="Store" options={uniq('store').sort().map(x => ({ value: x, label: x }))} selected={storeF} onChange={toggle(setStoreF)} onClear={() => { setStoreF([]); setDevPage(1); }} />
          <FilterChip label="Country" options={uniq('country').map(x => ({ value: x, label: x }))} selected={countryF} onChange={toggle(setCountryF)} onClear={() => { setCountryF([]); setDevPage(1); }} />
          <FilterChip label="Model" options={uniq('model').map(x => ({ value: x, label: x }))} selected={modelF} onChange={toggle(setModelF)} onClear={() => { setModelF([]); setDevPage(1); }} />
          <FilterChip label="App version" options={uniq('appVersion').map(x => ({ value: x, label: x }))} selected={versionF} onChange={toggle(setVersionF)} onClear={() => { setVersionF([]); setDevPage(1); }} />
          {anyF ? <Button variant="tertiary" condensed onClick={clearAll}>Clear filters</Button> : null}
        </Row>
        <div style={{ ...surface, overflow: 'auto', marginTop: T.s4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead><tr>
              <th style={th}>Terminal ID</th><th style={th}>Store</th><th style={th}>Country</th><th style={th}>Model</th><th style={th}>App version</th><th style={th}>Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Failed</th><th style={{ ...th, textAlign: 'right' }}>Wi-Fi</th><th style={{ ...th, width: 1 }}></th>
            </tr></thead>
            <tbody>
              {slice.map(dv => (
                <tr key={dv.id} className="ns-row" style={{ cursor: 'pointer' }} onClick={() => setTroubleshootId(dv.id)}>
                  <td style={{ ...td, fontFamily: 'var(--b-font-family-secondary)', fontWeight: 500 }}>{dv.terminal}</td>
                  <td style={td}>{dv.store}</td>
                  <td style={td}>{dv.country}</td>
                  <td style={td}>{dv.model}</td>
                  <td style={{ ...td, fontFamily: 'var(--b-font-family-secondary)' }}>{dv.appVersion}</td>
                  <td style={td}><Status variant={sv[dv.status]} label={dv.status} /></td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--b-font-family-secondary)', color: dv.failed ? 'var(--b-color-label-critical)' : T.faint, fontWeight: dv.failed ? 600 : 400 }}>{dv.failed || '—'}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--b-font-family-secondary)' }}>{dv.wifi} dBm</td>
                  <td style={{ ...td, textAlign: 'right', width: 1 }}><button type="button" title={dv.status !== 'Healthy' ? 'Troubleshoot' : 'View logs'} onClick={(e) => { e.stopPropagation(); setTroubleshootId(dv.id); }} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: T.faint, lineHeight: 0, padding: 4, display: 'inline-flex', borderRadius: 6 }}><Ico name="chevron-right" size={18} /></button></td>
                </tr>
              ))}
              {slice.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: T.faint, borderBottom: 'none' }}>No devices match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: T.s4 }}>
          <span style={{ fontSize: 13, color: T.sub }}>{fleetFiltered.length ? `${(page - 1) * DEV_PAGE + 1}–${Math.min(page * DEV_PAGE, fleetFiltered.length)} of ${fleetFiltered.length}` : '0 results'}</span>
          <Row gap={8}>
            <Button variant="secondary" condensed iconLeft="chevron-left" disabled={page <= 1} onClick={() => setDevPage(page - 1)}>Prev</Button>
            <Button variant="secondary" condensed iconRight="chevron-right" disabled={page >= pages} onClick={() => setDevPage(page + 1)}>Next</Button>
          </Row>
        </Row>
      </>
    );
  };
  // Shared per-terminal troubleshoot modal — opened from the Failed-transactions list AND the fleet banner.
  // Streamlined device detail — same holistic layout as Devices & locations (DeviceDetail).
  const troubleshootModal = (() => {
    const tt = d.troubleshoot.find(x => x.id === troubleshootId) || fleet.find(x => x.id === troubleshootId);
    if (!tt) return null;
    const store = SM_STORES.find(s => s.name === tt.store || s.code === tt.store) || { code: tt.store, name: tt.store, country: tt.country };
    const dotFor = tt.status === 'Healthy' ? 'var(--b-color-decorative-green)' : tt.status === 'Offline' ? 'var(--b-color-decorative-red)' : 'var(--b-color-decorative-orange)';
    const row = {
      id: tt.id, _type: 'Terminal', model: tt.model, serial: tt.terminal, version: tt.appVersion,
      dot: dotFor, lastActivity: 'Today', lastTx: tt.failed ? 'Today' : '\u2014',
      store: tt.store, storeId: store.id || null, country: tt.country, address: store.street || '\u2014', integration: 'Standalone',
      __battery: tt.battery, __wifi: tt.wifi, __cause: tt.cause || '', __failed: tt.failed || 0,
    };
    return <DeviceDetail row={row} store={store}
      onBack={() => { setTroubleshootId(null); setTimeout(scrollToDevices, 60); }}
      onOpenStudio={(sc) => setStudioScope(sc)} notify={notify} />;
  })();
  // Config → Device Studio simulator, opened over the device overview; back returns to the overview.
  const studioModal = studioScope ? <DeviceStudio scope={studioScope} onBack={() => setStudioScope(null)} notify={notify} /> : null;

  // Level-2 Explore report — bird's-eye aggregation of the (filtered) fleet, grouped by country / model / version.
  const exploreModal = exploreOpen ? (() => {
    const key = groupBy === 'country' ? 'country' : groupBy === 'model' ? 'model' : 'appVersion';
    const groups = {};
    fleetFiltered.forEach(dv => { (groups[dv[key]] = groups[dv[key]] || []).push(dv); });
    const rows = Object.entries(groups).map(([g, list]) => {
      const atrisk = list.filter(x => x.status !== 'Healthy');
      const failed = list.reduce((s2, x) => s2 + x.failed, 0);
      const avgWifi = Math.round(list.reduce((s2, x) => s2 + x.wifi, 0) / list.length);
      return { g, total: list.length, atrisk: atrisk.length, failed, avgWifi };
    }).sort((a, b) => b.atrisk - a.atrisk || b.failed - a.failed);
    const th = { textAlign: 'left', padding: '8px 12px', fontSize: 12, color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.sep}`, whiteSpace: 'nowrap' };
    const thR = { ...th, textAlign: 'right' };
    const td = { padding: '10px 12px', fontSize: 13, color: T.ink, borderBottom: `1px solid ${T.sepFaint}`, whiteSpace: 'nowrap' };
    const tdR = { ...td, textAlign: 'right', fontFamily: 'var(--b-font-family-secondary)' };
    return (
      <Modal open onClose={() => setExploreOpen(false)} title="Summary report" description={`Bird's-eye view · ${D.fmt(fleetFiltered.length)} devices${countryF.length || modelF.length || versionF.length ? ' (filtered)' : ''}`} width={720}
        footer={<Row gap={8} style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}><span style={{ fontSize: 12, color: T.faint }}>Grouped totals reflect the active filters.</span><Button variant="secondary" iconLeft="download" onClick={() => { downloadCSV(`fleet-report-by-${groupBy}.csv`, [groupBy, 'Terminals', 'At risk', 'Failed payments', 'Avg Wi-Fi (dBm)'], rows.map(r => [r.g, r.total, r.atrisk, r.failed, r.avgWifi])); notify && notify('Exported report to CSV'); }}>Export</Button></Row>}>
        <Col gap={14}>
          <Col gap={6}>
            <span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>Group by</span>
            <ChipPicker value={groupBy} onChange={setGroupBy} options={[{ value: 'country', label: 'Country' }, { value: 'model', label: 'Model' }, { value: 'appVersion', label: 'App version' }]} />
          </Col>
          <div style={{ ...surface, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>{groupBy === 'appVersion' ? 'App version' : groupBy === 'model' ? 'Model' : 'Country'}</th><th style={thR}>Terminals</th><th style={thR}>At risk</th><th style={thR}>Failed payments</th><th style={thR}>Avg Wi-Fi</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.g}>
                    <td style={{ ...td, fontWeight: 500, borderBottom: i === rows.length - 1 ? 'none' : td.borderBottom }}>{r.g}</td>
                    <td style={{ ...tdR, borderBottom: i === rows.length - 1 ? 'none' : td.borderBottom }}>{D.fmt(r.total)}</td>
                    <td style={{ ...tdR, borderBottom: i === rows.length - 1 ? 'none' : td.borderBottom, color: r.atrisk ? 'var(--b-color-label-critical)' : T.sub, fontWeight: r.atrisk ? 600 : 400 }}>{r.atrisk}</td>
                    <td style={{ ...tdR, borderBottom: i === rows.length - 1 ? 'none' : td.borderBottom }}>{D.fmt(r.failed)}</td>
                    <td style={{ ...tdR, borderBottom: i === rows.length - 1 ? 'none' : td.borderBottom }}>{r.avgWifi} dBm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Col>
      </Modal>
    );
  })() : null;
  // Level-0/2 reporting: export the fleet devices currently in scope (all active filters applied) as CSV.
  const exportCSV = () => {
    const rows = fleetFiltered;
    downloadCSV('fleet-health-devices.csv',
      ['Terminal ID', 'Store', 'Country', 'Model', 'Android app', 'App version', 'OS', 'Status', 'Failed payments', 'Wi-Fi (dBm)', 'Battery %', 'Issue'],
      rows.map(t => [t.terminal, t.store, t.country, t.model, t.app, t.appVersion, t.os, t.status, t.failed, t.wifi, t.battery, t.cause]));
    notify && notify(`Exported ${rows.length} device${rows.length === 1 ? '' : 's'} to CSV`);
  };
  // Event report: event-level CSV across the filtered devices — all event types (answers "download all events/errors").
  const exportEvents = () => {
    const rows = fleetFiltered.flatMap(deviceEvents);
    downloadCSV('fleet-health-events.csv',
      ['When', 'Terminal ID', 'Store', 'Country', 'Model', 'App version', 'Event type', 'Detail', 'Reference'],
      rows.map(e => [e.ts, e.terminal, e.store, e.country, e.model, e.appVersion, e.type, e.detail, e.ref]));
    notify && notify(`Exported ${rows.length} event${rows.length === 1 ? '' : 's'} to CSV`);
  };
  const headerActions = <Row gap={8}><RangeChip value={range} onChange={setRange} options={DATA_PERIODS} /><Button variant="secondary" iconLeft="download" onClick={exportCSV}>Export</Button></Row>;
  const pageSubtitle = `${isDevice ? scopeDef.label : 'All terminals · all locations'} · ${periodLabel(range)}`;
  // Focused "Failed transactions" view — only the failed-tx chart + the affected device list.
  if (focus === 'failed') {
    const fp = c.panels.find(p => p.title === 'Failed transactions');
    const summaryCell = (label, value) => (
      <Col gap={2}><span style={{ fontSize: 12, color: T.sub, fontWeight: 500 }}>{label}</span><span className="ns-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>{value}</span></Col>
    );
    const failedChart = (
      <div style={{ ...surface, overflow: 'hidden' }}>
        <TileHeader title="Failed transactions" subtitle={`Count of failed payments · ${isDevice ? scopeDef.label : 'all terminals'} · last 90 days`}
          info="Payments declined or aborted at the terminal (not by the issuer) — a count of transactions, not a euro amount. Most correlate with connectivity events: WebSocket drops, high latency or weak signal." />
        <Row gap={28} style={{ padding: `0 ${T.s5}px ${T.s3}px`, flexWrap: 'wrap' }}>
          {isDevice ? summaryCell('Failed payments', D.fmt(c.k.failedTx)) : summaryCell('Connectivity-linked failures', D.fmt(d.failedTx.count))}
          {isDevice ? summaryCell('WebSocket drops', D.fmt(c.k.wsFail)) : summaryCell('Share of all failures', `${d.failedTx.connectivityLinked}%`)}
          {isDevice ? summaryCell('Avg Wi-Fi signal', `${c.k.avgWifi} dBm`) : summaryCell('Affected terminals', d.troubleshoot.length)}
          {!isDevice && summaryCell('Est. revenue at risk', `≈€${d.failedTx.revenueAtRiskK}k`)}
        </Row>
        <div style={{ padding: `0 ${T.s5}px ${T.s5}px`, height: 240 }}>
          <LineChart data={{ labels: c.labels, min: fp.min, series: [{ color: fp.color, points: fp.pts }] }} height={220} />
        </div>
      </div>
    );
    return (
      <FullPage title="Failed transactions" subtitle={`${isDevice ? scopeDef.label : 'All terminals · all locations'} · ${periodLabel(range)}`} onBack={onBack} backLabel="" backIcon={<ArrowLeftGlyph />} onClose={onBack}
        actions={<Row gap={8}><RangeChip value={range} onChange={setRange} options={DATA_PERIODS} /><Button variant="secondary" iconLeft="download" onClick={() => notify && notify('Exporting failed transactions to CSV…')}>Export</Button></Row>} bodyBg={T.page}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px`, display: 'flex', flexDirection: 'column', gap: T.s6 }}>
          {isDevice ? (
            <Row align="flex-start" gap={16} style={{ padding: '16px 20px', borderRadius: T.radiusL, background: 'var(--b-color-background-warning-weak)' }}>
              <Ico name="warning-filled" size={24} color="var(--b-color-background-warning-strong)" style={{ flexShrink: 0, marginTop: 2 }} />
              <Col gap={10} style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{D.fmt(c.k.failedTx)} failed transactions linked to connectivity</span>
                <span style={{ fontSize: 14, color: T.sub, lineHeight: '20px' }}>On <b>{scopeDef.label}</b>, failures line up with {D.fmt(c.k.wsFail)} WebSocket drops and weak Wi-Fi (avg {c.k.avgWifi} dBm). Likely cause: connectivity — not the card or the shopper.</span>
                <Row gap={8} style={{ flexWrap: 'wrap' }}>
                  {['Restart terminal', 'Re-sync config', 'Reassign'].map(a => <Button key={a} variant="secondary" condensed onClick={() => notify && notify(`${a} · ${scopeDef.label}…`)}>{a}</Button>)}
                  <Button variant="tertiary" condensed iconLeft="arrow-left" onClick={() => setScope('all')}>All terminals</Button>
                </Row>
              </Col>
            </Row>
          ) : (
            <span style={{ fontSize: 14, color: T.sub, lineHeight: '20px' }}><b>{d.failedTx.connectivityLinked}%</b> of failed transactions correlate with connectivity events. Diagnose a terminal below to see its signals and fix it.</span>
          )}
          {failedChart}
          {!isDevice && (
            <DetailSection title="Terminals to troubleshoot" info="Terminals whose failed payments correlate with connectivity issues, worst first. Troubleshoot one to see its signals and the fix actions.">
              <div style={{ ...surface, overflow: 'hidden' }}>
                {d.troubleshoot.map((tt, i) => (
                  <Row key={tt.id} gap={12} align="center" style={{ padding: '12px 16px', borderTop: i ? `1px solid ${T.sepFaint}` : 'none' }}>
                    <Col gap={1} style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--b-font-family-secondary)' }}>{tt.terminal}</span>
                      <span style={{ fontSize: 12, color: T.faint }}>{tt.store} · {tt.model} · {tt.cause}</span>
                    </Col>
                    <span className="ns-num" style={{ fontSize: 13, color: 'var(--b-color-label-critical)', fontWeight: 600, flexShrink: 0, width: 74, textAlign: 'right' }}>{tt.failed} failed</span>
                    <Button variant="secondary" condensed iconRight="arrow-right" onClick={() => setTroubleshootId(tt.id)}>Troubleshoot</Button>
                  </Row>
                ))}
              </div>
            </DetailSection>
          )}
        </div>
        {troubleshootModal}
        {studioModal}
      </FullPage>
    );
  }
  // Action block — a card: dot + label + badge · big value · hint · action button pinned to the bottom.
  const actionBlock = (dot, label, value, badge, variant, hint, action, onClick) => (
    <Col gap={10} className="ns-kpi" style={{ padding: '14px 16px', borderRadius: T.radiusM, background: 'var(--b-color-background-secondary)', minWidth: 0 }}>
      <Row gap={7} align="center">
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: T.sub, fontWeight: 500, flex: 1, minWidth: 0 }}>{label}</span>
        {badge && <Tag label={badge} variant={variant} />}
      </Row>
      <span className="ns-num" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>{value}</span>
      <span style={{ fontSize: 12, color: T.sub, lineHeight: '17px', flex: 1 }}>{hint}</span>
      <div style={{ marginTop: 2 }}><Button variant="secondary" condensed iconRight="arrow-right" onClick={onClick}>{action}</Button></div>
    </Col>
  );
  // Fleet trends bar chart — shared by the home overview card and the Explore modal (same graph on top).
  const trendsCard = (inModal) => {
    const sel = (trendMetrics.length ? trendMetrics : [0]).filter(i => c.panels[i]);
    const panels = (sel.length ? sel : [0]).map(i => c.panels[i]);
    const nPts = range === '7d' ? 7 : range === '30d' ? 12 : c.labels.length;
    const bSize = { day: 1, week: 3, month: 12 }[trendGran] || 1;
    const chunk = (arr) => { if (bSize <= 1) return [arr.slice()]; const out = []; for (let i = 0; i < arr.length; i += bSize) out.push(arr.slice(i, i + bSize)); return out.length ? out : [arr.slice()]; };
    const labels = bSize <= 1 ? c.labels.slice(-nPts) : chunk(c.labels.slice(-nPts)).map(ch => ch[ch.length - 1]);
    const roll = (pts, agg) => bSize <= 1 ? pts : chunk(pts).map(ch => agg === 'avg' ? Math.round(ch.reduce((a, b) => a + b, 0) / ch.length) : ch.reduce((a, b) => a + b, 0));
    const TREND_COLORS = ['#006BD7', '#9CC9F5', '#17315A', '#5BB4C4', '#C7DEF7'];
    const tColor = (idx) => TREND_COLORS[idx % TREND_COLORS.length];
    const series = panels.map((p, idx) => ({ color: tColor(idx), points: roll(p.pts.slice(-nPts), p.unit ? 'avg' : 'sum'), name: p.title }));
    const single = panels.length === 1;
    const granWord = trendGran === 'week' ? 'Weekly' : trendGran === 'month' ? 'Monthly' : 'Daily';
    const total = single ? (panels[0].unit ? Math.round(series[0].points.reduce((a, b) => a + b, 0) / series[0].points.length) : series[0].points.reduce((a, b) => a + b, 0)) : null;
    return (
      <div style={{ ...surface, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }} className="ns-tile">
        <TileHeader title="Fleet trends" subtitle={`Daily telemetry · ${periodLabel(range)}`}
          info="Track any fleet signal over time. Pick one or more metrics; the chart updates below."
          right={<Row gap={8} align="center">
            <MultiDropdown ghost values={sel.map(String)} onChange={(vals) => setTrendMetrics(vals.length ? vals.map(Number) : [0])} options={c.panels.map((p, i) => ({ value: String(i), label: p.title }))} />
            {!inModal && <Button variant="tertiary" condensed iconRight="arrow-right" onClick={() => setTrendsOpen(true)}>Explore</Button>}
          </Row>} />
        <Col gap={16} style={{ padding: `0 ${T.s5}px ${T.s5}px`, flex: 1, minHeight: 0 }}>
          <Col gap={10} style={{ flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, minHeight: 240 }}>
              <BarChart data={{ labels, min: single && panels[0].min != null ? panels[0].min : undefined, series }} height={240} />
            </div>
            {single
              ? <span style={{ fontSize: 13, color: T.sub }}>{granWord} {panels[0].title.toLowerCase()} <b className="ns-num" style={{ color: T.ink, fontWeight: 600 }}>· {panels[0].unit ? 'Avg' : 'Total'} {D.fmt(total)}</b></span>
              : <Row gap={16} style={{ flexWrap: 'wrap' }}>{panels.map((p, idx) => <Row key={p.title} gap={6} align="center"><span style={{ width: 8, height: 8, borderRadius: 2, background: tColor(idx), flexShrink: 0 }} /><span style={{ fontSize: 13, color: T.sub }}>{p.title}</span></Row>)}</Row>}
          </Col>
        </Col>
      </div>
    );
  };
  // Body content shared by the Explore overlay (FullPage) and the inline Fleet health page.
  const sections = (
      <>
        {/* Section 1 — Action required: fleet-status donut + a grid of KPI-style action cards. Device scope shows its own banner. */}
        {!isDevice ? (
          <div style={{ ...surface, overflow: 'hidden', border: 'none', background: 'transparent' }}>
            <TileHeader title="Fleet health" subtitle={`Terminal telemetry · ${periodLabel(range)}`}
              info="Your fleet at a glance — status composition, the key health metrics, and the issues to act on now."
              right={<Button variant="tertiary" condensed iconRight="arrow-right" onClick={() => setTrendsOpen(true)}>Explore</Button>} />
            <Col gap={0} style={{ padding: `0 ${T.s5}px ${T.s5}px` }}>
              {/* Status zone — donut + legend + sentence (flat) */}
              <div style={{ padding: '8px 0 18px' }}>
                {(() => {
                  const total = fleet.length || 1;
                  const segs = [
                    { label: 'Healthy', n: statusCounts.Healthy, c: 'var(--b-color-decorative-green)' },
                    { label: 'At risk', n: statusCounts['At risk'], c: 'var(--b-color-decorative-orange)' },
                    { label: 'Offline', n: statusCounts.Offline, c: '#9AA4AE' },
                  ];
                  const pctOf = (n) => Math.round(n / total * 100);
                  const healthyPct = pctOf(statusCounts.Healthy);
                  // Per-status definitions — surfaced via an info icon on each status, not one combined tooltip.
                  const STATUS_INFO = {
                    Healthy: 'Trading normally — stable connection, strong signal, and no connectivity-linked failures.',
                    'At risk': 'Still taking payments, but telemetry shows early warning signs: weak Wi-Fi/cellular signal, repeated WebSocket drops, or payments already failing from connectivity. Left alone these usually turn into an outage or a sub-merchant complaint — so it’s the moment to act, before the shopper or the store notices.',
                    Offline: 'Not reachable or not boarded — can’t take payments right now.',
                  };
                  return (
                    <Col gap={16}>
                      {/* header — title + narrative (definitions live on each status below) */}
                      <Row gap={16} align="baseline" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Fleet status</span>
                        <span style={{ fontSize: 12, color: T.sub, lineHeight: '18px', flex: '1 1 260px', textAlign: 'right', minWidth: 220 }}>{healthyPct}% of your {D.fmt(total)} terminals are healthy · {D.fmt(atRiskDevices.length)} need attention before they affect sales.</span>
                      </Row>
                      {/* segmented status bar (Cloudflare-style) */}
                      <div style={{ display: 'flex', width: '100%', height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--b-color-background-tertiary)' }}>
                        {segs.map(s => s.n > 0 && <div key={s.label} title={`${s.label} · ${D.fmt(s.n)}`} style={{ width: (s.n / total * 100) + '%', background: s.c }} />)}
                      </div>
                      {/* stat columns — label · big % · count · plain-language definition */}
                      <Row gap={0} style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        {segs.map((s, i) => (
                          <Col key={s.label} gap={6} style={{ flex: '1 1 160px', minWidth: 150, paddingRight: 20, borderLeft: i ? `1px solid ${T.sepFaint}` : 'none', paddingLeft: i ? 20 : 0 }}>
                            <Row gap={6} align="center"><span style={{ width: 8, height: 8, borderRadius: '50%', background: s.c, flexShrink: 0 }} /><span style={{ fontSize: 12, color: T.sub }}>{s.label}</span><InfoTip width={300} content={STATUS_INFO[s.label]}><Ico name="info" size={16} color={T.faint} /></InfoTip></Row>
                            <Row gap={8} align="baseline"><span className="ns-num" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>{pctOf(s.n)}%</span><span style={{ fontSize: 12, color: T.faint }}>{D.fmt(s.n)} terminals</span></Row>
                            <span style={{ fontSize: 11, color: T.faint, lineHeight: '15px' }}>{{ Healthy: 'Trading normally.', 'At risk': 'Still trading, but failing or likely to soon.', Offline: 'Can’t take payments.' }[s.label]}</span>
                          </Col>
                        ))}
                      </Row>

                    </Col>
                  );
                })()}
              </div>
              {/* Actions zone — what to act on, 3 blocks side by side */}
              <Col gap={10} style={{ borderTop: `1px solid ${T.sepFaint}`, marginTop: 18, paddingTop: 14 }}>
                <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>What to act on</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: T.s3 }}>
                  {actionBlock('var(--b-color-decorative-red)', 'Failed transactions', D.fmt(failedTotal), `${d.failedTx.connectivityLinked}% linked`, 'red', `Across ${D.fmt(failedDeviceCount)} terminals · ≈€${revenueAtRiskK}k at risk`, 'View all', scrollToDevices)}
                  {actionBlock('var(--b-color-decorative-orange)', 'Needs attention', D.fmt(atRiskDevices.length), 'at risk · offline', 'orange', 'Terminals at risk or offline — fix before they cost sales', 'Review', () => { setStatusF(['At risk', 'Offline']); setCountryF([]); setModelF([]); setVersionF([]); setDevSearch(''); setDevPage(1); scrollToDevices(); })}
                  {actionBlock('var(--b-color-decorative-blue)', 'Outdated app version', D.fmt(oldVerDevices.length), '≤ 1.40.3', 'blue', 'Known WebSocket issues — schedule an update', 'Show devices', () => { setVersionF(['1.40.3', '1.39.2']); setStatusF([]); setCountryF([]); setModelF([]); setDevSearch(''); setDevPage(1); scrollToDevices(); })}
                </div>
              </Col>
            </Col>
          </div>
        ) : (
          <Row align="flex-start" gap={16} style={{ padding: '16px 20px', borderRadius: T.radiusL, background: 'var(--b-color-background-warning-weak)' }}>
            <Ico name="warning-filled" size={24} color="var(--b-color-background-warning-strong)" style={{ flexShrink: 0, marginTop: 2 }} />
            <Col gap={10} style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{D.fmt(c.k.failedTx)} failed transactions linked to connectivity</span>
              <span style={{ fontSize: 14, color: T.sub, lineHeight: '20px' }}>On <b>{scopeDef.label}</b>, failures line up with {D.fmt(c.k.wsFail)} WebSocket drops and weak Wi-Fi (avg {c.k.avgWifi} dBm). Likely cause: connectivity — not the card or the shopper.</span>
              <Row gap={8} style={{ flexWrap: 'wrap' }}>
                {['Restart terminal', 'Re-sync config', 'Reassign'].map(a => (
                  <Button key={a} variant="secondary" condensed onClick={() => notify && notify(`${a} · ${scopeDef.label}…`)}>{a}</Button>
                ))}
              </Row>
            </Col>
          </Row>
        )}
        {/* Fleet trends + Stores to watch — same row (proactive overview so a platform spots a sub-merchant's issue first). */}
        {!isDevice && (
          <Row gap={T.s6} align="stretch" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 480px', minWidth: 340 }}>{trendsCard(false)}</div>
            <div style={{ flex: '1 1 420px', minWidth: 340 }}>
              <StoreLeaderboard rows={[...CONN_STORES].sort((a, b) => b.wsDrops - a.wsDrops || b.attention - a.attention)}
                onPick={(s) => setStoreInfo(s.storeId)} limit={5}
                title="Stores to watch" subtitle="Flagged by their main issue · tap a store to see its devices"
                info="The stores most likely to trigger a sub-merchant complaint — highest connection drops and weakest signal first. Act before it reaches support."
                right={<Button variant="tertiary" condensed iconRight="arrow-right" onClick={() => { setStoreInfo(null); setStoresListOpen(true); }}>Explore</Button>} />
            </div>
          </Row>
        )}
      </>
  );
  // "Explore" full-page modal — the trend charts & signal filters, opened from the Fleet health section header.
  const trendsModal = trendsOpen ? (() => {
    const modelOptions = [{ value: 'model:S1F2', label: 'S1F2' }, { value: 'model:AMS1', label: 'AMS1' }, { value: 'model:V400m', label: 'V400m' }];
    const pick = (v) => setScope(scope === v ? 'all' : v);
    const allTitles = c.panels.map(p => p.title); // concrete panel list (null sigCharts = all shown)
    const shown = sigCharts == null ? allTitles : sigCharts;
    return (
      <FullPage title="Explore trends" subtitle={`Fleet telemetry signals over time · ${periodLabel(range)}`} onBack={() => setTrendsOpen(false)} backLabel="Fleet health overview" backIcon={<ArrowLeftGlyph />} onClose={() => setTrendsOpen(false)} bodyBg={T.page}
        actions={<RangeChip value={range} onChange={setRange} options={DATA_PERIODS} />}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px`, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: T.s6 }}>
          {/* Fleet signals at a glance — the key metrics (moved here from the home overview) */}
          <div style={{ ...surface, overflow: 'hidden' }}>
            <TileHeader title="Fleet signals" subtitle={`Key telemetry · ${periodLabel(range)}`}
              info="The headline connectivity metrics for the whole fleet. Use the leaderboard and charts below to see which stores drive them." />
            <div style={{ ...kpiGrid, padding: `0 ${T.s5}px ${T.s5}px` }}>
              {kpis.map(kp => (
                <Col key={kp.label} gap={2} style={{ minWidth: 0 }}>
                  <Row gap={5} align="center">
                    <span style={{ fontSize: 12, color: T.sub, fontWeight: 500 }}>{kp.label}</span>
                    {kp.hint && <InfoTip content={kp.hint} placement="top"><Ico name="info" size={16} color={T.faint} /></InfoTip>}
                  </Row>
                  <span className="ns-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>{kp.value}</span>
                </Col>
              ))}
            </div>
          </div>
          {/* Fleet trends + Primary connected interface — side by side */}
          <Row gap={T.s6} align="stretch" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 460px', minWidth: 320 }}>{trendsCard(true)}</div>
            <div style={{ flex: '1 1 380px', minWidth: 320 }}>
              <div style={{ ...surface, overflow: 'hidden', height: '100%' }}>
                <TileHeader title="Primary connected interface" subtitle="Share of terminals by uplink · trend over time"
                  info="Which uplink each terminal is actively using — Wi-Fi vs cellular. The split and how it shifts over the period; sustained cellular use often flags Wi-Fi problems."
                  right={<Row gap={16}>
                    <Row gap={6}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--b-color-decorative-blue)' }} /><span style={{ fontSize: 12, color: T.sub }}>Wi-Fi</span></Row>
                    <Row gap={6}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--b-color-decorative-orange)' }} /><span style={{ fontSize: 12, color: T.sub }}>Cellular</span></Row>
                  </Row>} />
                <Row gap={24} style={{ padding: `0 ${T.s5}px ${T.s5}px`, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Row gap={18} style={{ alignItems: 'center', flexShrink: 0 }}>
                    <svg width={110} height={110} viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                      <circle cx="22" cy="22" r={R} fill="none" stroke="var(--b-color-decorative-orange)" strokeWidth="8" />
                      <circle cx="22" cy="22" r={R} fill="none" stroke="var(--b-color-decorative-blue)" strokeWidth="8" strokeDasharray={`${wifiLen} ${C - wifiLen}`} />
                    </svg>
                    <Col gap={10}>
                      <Row gap={8}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--b-color-decorative-blue)' }} /><span style={{ fontSize: 13, color: T.ink }}>Wi-Fi (WLAN0) <b className="ns-num">{d.iface.wifi}%</b></span></Row>
                      <Row gap={8}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--b-color-decorative-orange)' }} /><span style={{ fontSize: 13, color: T.ink }}>Cellular <b className="ns-num">{d.iface.cellular}%</b></span></Row>
                    </Col>
                  </Row>
                  <div style={{ flex: 1, minWidth: 220, height: 200 }}>
                    <LineChart data={{ labels: c.labels, min: 0, max: 100, unit: '%', series: [{ color: 'var(--b-color-decorative-blue)', points: c.wifiPct }, { color: 'var(--b-color-decorative-orange)', points: c.cellPct }] }} height={190} />
                  </div>
                </Row>
              </div>
            </div>
          </Row>
          {/* Failing stores — WebSocket-drop trend for the worst-performing stores */}
          {(() => {
            const FAIL_COLORS = ['#006BD7', '#E9A23B', '#D64550', '#3BA7A0', '#7B94B5', '#9C6ADE', '#2E7D5B'];
            const ranked = [...CONN_STORES].sort((a, b) => b.wsDrops - a.wsDrops);
            const sel = failStores == null ? ranked.slice(0, 5).map(s => s.key) : failStores;
            const chosen = sel.map(k => ranked.find(s => s.key === k)).filter(Boolean);
            const npts = c.labels.length;
            const series = chosen.map((s, idx) => {
              let h = 0; for (const ch of s.store) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff;
              const rr = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
              const base = s.wsDrops / npts;
              // Scenario: Uniqlo Tokyo Flagship is the outlier — stable until mid-period, then a sharp WebSocket-failure surge.
              const outlier = /Tokyo Flagship/i.test(s.store);
              const pts = c.labels.map((_, i) => {
                const t = i / (npts - 1);
                if (outlier) { const surge = t < 0.55 ? 0 : (t - 0.55) / 0.45; return Math.max(0, Math.round(base * 0.3 + base * 4 * Math.pow(surge, 1.7) + (rr() - 0.5) * base * 0.4)); }
                return Math.max(0, Math.round(base * (0.55 + 0.9 * t) + (rr() - 0.5) * base));
              });
              return { color: outlier ? 'var(--b-color-decorative-red)' : FAIL_COLORS[idx % FAIL_COLORS.length], points: pts, name: s.store };
            });
            return (
              <div style={{ ...surface, overflow: 'hidden' }}>
                <TileHeader title="Failing stores" subtitle={`WebSocket drops over time · ${periodLabel(range)}`}
                  info="Connection drops over the period for the stores you pick — tap a store name to open it."
                  right={<div style={{ minWidth: 180, display: 'flex', justifyContent: 'flex-end' }}><MultiDropdown ghost summaryNoun="stores" values={sel} onChange={(v) => setFailStores(v.length ? v : ranked.slice(0, 5).map(s => s.key))} options={ranked.map(s => ({ value: s.key, label: s.store }))} /></div>} />
                {(() => {
                  const legend = (
                    <Row gap={16} style={{ flexWrap: 'wrap' }}>
                      {chosen.map((s, idx) => (
                        <button key={s.key} onClick={() => setStoreInfo(s.storeId)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: series[idx].color, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: /Tokyo Flagship/i.test(s.store) ? 'var(--b-color-label-critical)' : T.sub, fontWeight: /Tokyo Flagship/i.test(s.store) ? 600 : 400, textDecoration: 'underline', textUnderlineOffset: 2 }}>{s.store}</span>
                        </button>
                      ))}
                    </Row>
                  );
                  return (
                    <Col gap={12} style={{ padding: `0 ${T.s5}px ${T.s5}px` }}>
                      <div style={{ height: 260 }}><LineChart data={{ labels: c.labels, min: 0, series }} height={260} /></div>
                      {legend}
                    </Col>
                  );
                })()}
              </div>
            );
          })()}
        </div>
        {customizeOpen && (
          <Modal open onClose={() => setCustomizeOpen(false)} title="Customize signals" width={460}
            description="Show only the graphs you need. Your selection is remembered and applies across the Signals section."
            footer={<Row gap={8} style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button variant="tertiary" condensed onClick={() => setSigCharts(c.panels.map(p => p.title))}>Reset to all</Button>
              <Button variant="primary" onClick={() => setCustomizeOpen(false)}>Done</Button>
            </Row>}>
            {(() => {
              const all = allTitles;
              const allOn = shown.length === all.length;
              const some = shown.length > 0 && !allOn;
              const tog = (t) => setSigCharts(prev => { const base = prev == null ? all : prev; return base.includes(t) ? base.filter(x => x !== t) : [...base, t]; });
              const box = (on, dash) => <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${on ? 'var(--b-color-label-primary)' : '#8C959D'}`, background: on ? 'var(--b-color-label-primary)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{dash ? <span style={{ width: 8, height: 2, background: '#fff', borderRadius: 1 }} /> : on ? <Ico name="checkmark-small" size={12} color="#fff" /> : null}</span>;
              return (
                <Col gap={0}>
                  <label className="b-menu-item" onClick={() => setSigCharts(allOn ? [] : all)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', cursor: 'pointer', fontSize: 14, borderBottom: `1px solid ${T.sepFaint}` }}>
                    {box(allOn || some, some)}<span style={{ flex: 1, fontWeight: 600 }}>Select all</span>
                  </label>
                  {c.panels.map(p => (
                    <label key={p.title} className="b-menu-item" onClick={() => tog(p.title)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', cursor: 'pointer', fontSize: 14 }}>
                      {box(shown.includes(p.title))}<span style={{ flex: 1 }}>{p.title}</span>
                    </label>
                  ))}
                </Col>
              );
            })()}
          </Modal>
        )}
      </FullPage>
    );
  })() : null;
  // Devices list — full-page modal (opened from the action cards / Stores-to-watch, not inline on the home page).
  const devicesModal = devicesOpen ? (
    <FullPage title="Devices" subtitle={`${D.fmt(fleetFiltered.length)} of ${D.fmt(fleet.length)} devices`} onBack={() => setDevicesOpen(false)} backLabel="Fleet health overview" backIcon={<ArrowLeftGlyph />} onClose={() => setDevicesOpen(false)} bodyBg={T.page}
      actions={<Row gap={8}><Button variant="secondary" condensed iconLeft="download" onClick={exportEvents}>Event report</Button><Button variant="secondary" condensed iconLeft="nav-analytics" onClick={() => setExploreOpen(true)}>Summary report</Button></Row>}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px`, width: '100%', boxSizing: 'border-box' }}>{renderDevicesBody()}</div>
    </FullPage>
  ) : null;
  // Store info popup — a quick peek (basic store info + its device list), opened from the Stores-to-watch leaderboard.
  const storeInfoModal = storeInfo ? (() => {
    const st = SM_STORES.find(x => x.id === storeInfo);
    if (!st) return null;
    const closeInfo = () => setStoreInfo(null);
    const devs = CONN_FLEET.filter(d => d.storeId === st.id);
    const atRisk = devs.filter(d => d.status !== 'Healthy').length;
    const th = { textAlign: 'left', padding: '8px 12px', fontSize: 12, color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.sep}`, background: T.card, position: 'sticky', top: 0, whiteSpace: 'nowrap' };
    return (
      <Modal open onClose={closeInfo} title={st.name} width={620}
        description={`${st.city ? st.city + ', ' : ''}${st.country} · ${st.terminals} devices · ${atRisk} need attention`}
        footer={<Row gap={8} style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={closeInfo}>Close</Button>
          <Button variant="primary" onClick={() => setTroubleStore(st.id)}>Troubleshoot</Button>
        </Row>}>
        <Col gap={16}>
          <StructuredList labelWidth={140} items={[
            { label: 'Store reference', value: st.code, copy: true },
            { label: 'Store ID', value: st.storeId, copy: true },
            { label: 'Address', value: [st.street, st.city, st.country].filter(Boolean).join(', ') },
            { label: 'Merchant', value: st.merchant },
          ]} />
          <Col gap={8}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Devices ({devs.length})</span>
            <div style={{ border: `1px solid ${T.sep}`, borderRadius: T.radiusM, overflow: 'hidden' }}>
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr><th style={th}>Device</th><th style={th}>Status</th><th style={{ ...th, textAlign: 'right' }}>Failed</th><th style={{ ...th, textAlign: 'right' }}>Wi-Fi</th></tr></thead>
                  <tbody>
                    {devs.map((d, i) => {
                      const last = i === devs.length - 1;
                      const td = { padding: '8px 12px', borderBottom: last ? 'none' : `1px solid ${T.sepFaint}`, whiteSpace: 'nowrap' };
                      return (
                        <tr key={d.id} className="ns-row">
                          <td style={{ ...td, fontWeight: 500 }}>{d.model} <span style={{ color: T.faint, fontFamily: 'var(--b-font-family-secondary)', fontSize: 12 }}>· {d.terminal}</span></td>
                          <td style={td}><Tag label={d.status} variant={d.status === 'Healthy' ? 'green' : d.status === 'Offline' ? 'red' : 'orange'} /></td>
                          <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--b-font-family-secondary)', color: d.failed ? 'var(--b-color-label-critical)' : T.sub }}>{d.failed || 0}</td>
                          <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--b-font-family-secondary)', color: d.wifi <= -80 ? 'var(--b-color-label-critical)' : T.ink }}>{d.wifi} dBm</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Col>
        </Col>
      </Modal>
    );
  })() : null;
  // Guided Troubleshoot modal — reason-specific fix steps, layered over the store popup.
  const storeTroubleshootModal = troubleStore ? (() => {
    const st = SM_STORES.find(x => x.id === troubleStore);
    if (!st) return null;
    const sr = CONN_STORES.find(x => x.storeId === st.id) || CONN_FLEET.filter(d => d.storeId === st.id).reduce((a, d) => ({ ...a, wsDrops: (a.wsDrops || 0) + (d.wsDrops || 0), offline: (a.offline || 0) + (d.status === 'Offline' ? 1 : 0), atRisk: (a.atRisk || 0) + (d.status !== 'Healthy' ? 1 : 0), failed: (a.failed || 0) + (d.failed || 0), minWifi: Math.min(a.minWifi ?? 0, d.wifi) }), {});
    const r = storeWatchReason(sr);
    const fix = storeFixSteps(r.key, sr);
    const close = () => setTroubleStore(null);
    return (
      <Modal open onClose={close} title={`Troubleshoot · ${st.name}`} width={560} description={fix.heading}
        footer={<Row gap={8} style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={close}>Close</Button>
          <Button variant="primary" onClick={() => { notify && notify('Opening a support request with this store\u2019s diagnostics…'); }}>Contact support</Button>
        </Row>}>
        <Col gap={16}>
          <Row gap={8} style={{ alignItems: 'center' }}><span style={{ fontSize: 13, color: T.sub }}>Detected issue</span><Tag label={r.label} variant={r.variant} /></Row>
          <Col gap={10}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Recommended steps</span>
            <Col gap={8}>
              {fix.steps.map((t, i) => (
                <Row key={i} gap={10} style={{ alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--b-color-background-secondary)', color: T.ink, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--b-font-family-secondary)' }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: T.ink, lineHeight: 1.5 }}>{t}</span>
                </Row>
              ))}
            </Col>
          </Col>
        </Col>
      </Modal>
    );
  })() : null;
  // Bulk Troubleshoot — selected stores grouped by their issue, each group with its fix steps.
  const bulkTroubleshootModal = bulkOpen ? (() => {
    const chosen = CONN_STORES.filter(s => selStores.includes(s.key));
    const groups = {};
    chosen.forEach(s => { const r = storeWatchReason(s); (groups[r.key] = groups[r.key] || { reason: r, stores: [] }).stores.push(s); });
    const close = () => setBulkOpen(false);
    return (
      <Modal open onClose={close} title={`Troubleshoot ${chosen.length} store${chosen.length > 1 ? 's' : ''}`} width={600}
        description="Grouped by issue so you can work through each group at once." bodyBg={T.page}
        footer={<Row gap={8} style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={close}>Close</Button>
          <Button variant="primary" onClick={() => { notify && notify(`Opening a support request for ${chosen.length} stores…`); }}>Contact support</Button>
        </Row>}>
        <Col gap={14}>
          {Object.values(groups).map(g => { const fix = storeFixSteps(g.reason.key, g.stores[0]); return (
            <div key={g.reason.key} style={{ border: `1px solid ${T.sep}`, borderRadius: T.radiusM, background: T.card, padding: 16 }}>
              <Row gap={8} style={{ alignItems: 'center', marginBottom: 6 }}>
                <Tag label={g.reason.label} variant={g.reason.variant} />
                <span style={{ fontSize: 13, color: T.sub }}>{g.stores.length} store{g.stores.length > 1 ? 's' : ''}</span>
              </Row>
              <div style={{ fontSize: 12, color: T.faint, marginBottom: 10 }}>{g.stores.map(s => s.store).join(' · ')}</div>
              <Col gap={8}>
                {fix.steps.map((t, i) => (
                  <Row key={i} gap={10} style={{ alignItems: 'flex-start' }}>
                    <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--b-color-background-secondary)', color: T.ink, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--b-font-family-secondary)' }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: T.ink, lineHeight: 1.5 }}>{t}</span>
                  </Row>
                ))}
              </Col>
            </div>
          ); })}
        </Col>
      </Modal>
    );
  })() : null;
  // Stores to watch → full ranked list of every store/merchant (distinct from the Fleet trends Explore).
  const storesListModal = storesListOpen ? (
    <FullPage title="Stores to watch" subtitle={`All ${boardBy === 'merchant' ? `${CONN_MERCHANTS.length} merchants` : `${CONN_STORES.length} stores`} ranked by connection health`}
      onBack={() => { setStoresListOpen(false); setStoreInfo(null); }} backLabel="Fleet health overview" backIcon={<ArrowLeftGlyph />} onClose={() => { setStoresListOpen(false); setStoreInfo(null); }} bodyBg={T.page}
      actions={<RangeChip value={range} onChange={setRange} options={DATA_PERIODS} />}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px`, display: 'flex', flexDirection: 'column', gap: T.s5, width: '100%', boxSizing: 'border-box' }}>
        {(() => {
          const byM = boardBy === 'merchant';
          const total = byM ? CONN_MERCHANTS.length : CONN_STORES.length;
          const qq = storeQ.trim().toLowerCase();
          const list = [...(byM ? CONN_MERCHANTS : CONN_STORES)].sort((a, b) => b.wsDrops - a.wsDrops || a.minWifi - b.minWifi)
            .filter(s => reasonFilter.length === 0 || reasonFilter.includes(storeWatchReason(s).key))
            .filter(s => !qq || (byM ? s.merchant : s.store).toLowerCase().includes(qq));
          const numHead = (label, w) => <div style={{ width: w, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>{label}</div>;
          const visKeys = list.map(s => s.key);
          const allSel = !byM && visKeys.length > 0 && visKeys.every(k => selStores.includes(k));
          const toggleStore = (k) => setSelStores(sel => sel.includes(k) ? sel.filter(x => x !== k) : [...sel, k]);
          const cb = (checked, onClick) => <span onClick={onClick} style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${checked ? 'var(--b-color-label-primary)' : '#8C959D'}`, background: checked ? 'var(--b-color-label-primary)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>{checked && <Ico name="checkmark-small" size={12} color="#fff" />}</span>;
          return (
            <Col gap={T.s4}>
              <Row style={{ flexWrap: 'wrap', alignItems: 'center' }} gap={8}>
                <SearchBar value={storeQ} onChange={setStoreQ} placeholder={`Search ${byM ? 'merchant' : 'store'}…`} width={260} />
                <FacetChip label="Reason" options={WATCH_REASON_OPTS} selected={reasonFilter} onChange={setReasonFilter} onRemove={() => setReasonFilter([])} />
                {reasonFilter.length > 0 && <Button variant="tertiary" condensed onClick={() => setReasonFilter([])}>Clear</Button>}
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: T.sub }}>{list.length} of {total} {byM ? 'merchants' : 'stores'}</span>
                  <SegmentedControl condensed value={boardBy} onChange={setBoardBy} options={[{ value: 'store', label: 'By store' }, { value: 'merchant', label: 'By merchant' }]} />
                </span>
              </Row>
              {!byM && selStores.length > 0 && (
                <Row style={{ justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: 'var(--b-color-background-secondary)', borderRadius: T.radiusM }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{selStores.length} store{selStores.length > 1 ? 's' : ''} selected</span>
                  <Row gap={8}>
                    <Button variant="secondary" condensed onClick={() => setSelStores([])}>Clear</Button>
                    <Button variant="primary" condensed onClick={() => setBulkOpen(true)}>Troubleshoot {selStores.length}</Button>
                  </Row>
                </Row>
              )}
              <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusM, overflow: 'hidden', background: T.card }}>
                <div style={{ overflow: 'auto' }}>
                  <div style={{ minWidth: byM ? 740 : 940 }}>
                    <SMHead noTop>
                      {!byM && <div style={{ width: 24, flexShrink: 0 }}>{cb(allSel, () => setSelStores(allSel ? [] : visKeys))}</div>}
                      <div style={{ flex: 1, minWidth: 200 }}>{byM ? 'Merchant' : 'Store'}</div>
                      <div style={{ width: 150, flexShrink: 0 }}>Why</div>
                      {!byM && <div style={{ width: 150, flexShrink: 0 }}>Merchant</div>}
                      {numHead('Needs attention', 150)}
                      {numHead('Detail', 140)}
                    </SMHead>
                    {list.length === 0 && <div style={{ padding: '24px 16px', color: T.sub, fontSize: 13 }}>No {byM ? 'merchants' : 'stores'} match this reason.</div>}
                    {list.map(s => { const r = storeWatchReason(s); const dt = storeWatchDetail(s); return (
                      <SMRowEl key={s.key} onClick={byM ? undefined : () => setStoreInfo(s.storeId)} style={{ cursor: byM ? 'default' : 'pointer' }}>
                        {!byM && <div style={{ width: 24, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>{cb(selStores.includes(s.key), () => toggleStore(s.key))}</div>}
                        <div style={{ flex: 1, minWidth: 200, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{byM ? s.merchant : s.store}</div>
                        <div style={{ width: 150, flexShrink: 0 }}><Tag label={r.label} variant={r.variant} /></div>
                        {!byM && <div style={{ width: 150, flexShrink: 0, color: T.sub, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.merchant}</div>}
                        <div style={{ width: 150, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', fontFamily: 'var(--b-font-family-secondary)', fontSize: 13, color: s.attention ? T.ink : T.faint, fontWeight: s.attention ? 500 : 400 }}>{s.attention ? `${s.attention} of ${s.devices}` : 'All healthy'}</div>
                        <div style={{ width: 140, flexShrink: 0, textAlign: 'right', fontFamily: 'var(--b-font-family-secondary)', fontSize: 13, color: T.ink }}>{dt.label}</div>
                      </SMRowEl>
                    ); })}
                  </div>
                </div>
              </div>
            </Col>
          );
        })()}
      </div>
    </FullPage>
  ) : null;
  // Inline page (Devices → Fleet health) — same layout as Devices Intelligence: left title + info + subtitle, actions right.
  if (asPage) {
    return (
      <div style={{ padding: `${T.s7}px ${T.s7}px ${T.s7}px`, maxWidth: T.maxW, margin: '0 auto' }}>
        <Row style={{ marginBottom: T.s5 }} align="flex-start">
          <Col gap={4} style={{ flex: 1 }}>
            <Row gap={6}>
              <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Fleet health</span>
              <InfoTip width={320} content={<span><b>Find and fix at-risk terminals.</b> Spot the ones failing payments or about to drop offline — from their connectivity, signal and battery — and troubleshoot them before they cost you sales.</span>} placement="right"><Ico name="info" size={16} color={T.ink} /></InfoTip>
            </Row>
            <span style={{ fontSize: 13, color: T.sub }}>{pageSubtitle}</span>
          </Col>
          {headerActions}
        </Row>
        <Col gap={T.s7}>{sections}</Col>
        {devicesModal}
        {storesListModal}
        {storeInfoModal}
        {storeTroubleshootModal}
        {bulkTroubleshootModal}
        {exploreModal}
        {trendsModal}
        {troubleshootModal}
        {studioModal}
      </div>
    );
  }
  return (
    <FullPage title="Fleet health" subtitle={`Terminal telemetry · ${pageSubtitle}`} onBack={onBack} backLabel="Device intelligence" backIcon={<ArrowLeftGlyph />} onClose={onBack}
      actions={headerActions} bodyBg={T.page}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px`, display: 'flex', flexDirection: 'column', gap: T.s7 }}>{sections}</div>
      {devicesModal}
      {storesListModal}
      {storeInfoModal}
      {storeTroubleshootModal}
      {bulkTroubleshootModal}
      {exploreModal}
      {trendsModal}
      {troubleshootModal}
      {studioModal}
    </FullPage>
  );
}

/* Bento Summary (b-summary) — borderless label/value block used across explore detail pages. */
function SdkKpi({ label, value, onClick, hint }) {
  return (
    <div className={onClick ? 'ns-kpi' : undefined} onClick={onClick} style={{ borderRadius: T.radiusM, padding: '14px 16px', background: 'var(--b-color-background-secondary)', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, cursor: onClick ? 'pointer' : 'default' }}>
      <span style={{ fontSize: 12, color: T.sub, fontWeight: 500 }}>{label}</span>
      <span className="ns-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', color: onClick ? 'var(--b-color-link-primary)' : T.ink, textDecoration: onClick ? 'underline' : 'none', textUnderlineOffset: 3 }}>{value}</span>
      {hint && <span style={{ fontSize: 11, color: T.faint, lineHeight: '15px' }}>{hint}</span>}
    </div>
  );
}

/* Shared explore-detail primitives — aligned tables, filter bars and bare sections. */
const dtTh = (align) => ({ textAlign: align || 'left', padding: '12px 14px', fontSize: 12, color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.sep}`, background: 'var(--b-color-background-secondary)', whiteSpace: 'nowrap' });
const dtTd = (last, align) => ({ padding: '12px 14px', borderBottom: last ? 'none' : `1px solid ${T.sepFaint}`, textAlign: align || 'left', whiteSpace: 'nowrap', fontSize: 13, color: T.ink });
const DetailTableWrap = ({ children, minWidth }) => (
  <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusM, overflow: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: minWidth || 'auto' }}>{children}</table>
  </div>
);
/* Bare section (no card outline) with an info icon on the title — used across explore modals. */
function DetailSection({ title, info, description, actions, children }) {
  return (
    <Col gap={14}>
      <Row align="flex-start" style={{ gap: 12 }}>
        <Col gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Row gap={6}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</span>
            {info && <InfoTip content={info} placement="right"><Ico name="info" size={16} color={T.ink} /></InfoTip>}
          </Row>
          {description && <span style={{ fontSize: 13, color: T.sub }}>{description}</span>}
        </Col>
        {actions}
      </Row>
      {children}
    </Col>
  );
}

/* Filterable, paginated version table (SDK or OS) — matches the reference detail. */
function VersionTable({ rows, kind, notify }) {
  const [platform, setPlatform] = useState('All');
  const [status, setStatus] = useState('All');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const statuses = ['All', ...Array.from(new Set(rows.map(r => r.status)))];
  const filtered = rows.filter(r =>
    (platform === 'All' || r.platform === platform) &&
    (status === 'All' || r.status === status) &&
    (!q || r.version.toLowerCase().includes(q.toLowerCase())));
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const pg = Math.min(page, pages);
  const view = filtered.slice((pg - 1) * pageSize, pg * pageSize);
  const cols = kind === 'sdk'
    ? ['Platform', 'SDK version', 'Status', 'Expiry date', 'Devices', 'Stores', 'Merchant accounts', '']
    : ['Platform', 'OS version', 'Status', 'Devices', 'Stores', 'Merchant accounts'];
  const numFrom = kind === 'sdk' ? 4 : 3;
  return (
    <Col gap={12}>
      <Row gap={8} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <SegmentedControl condensed value={platform} onChange={(v) => { setPlatform(v); setPage(1); }} options={[{ value: 'All', label: 'All' }, { value: 'Android', label: 'Android' }, { value: 'iOS', label: 'iOS' }]} />
        {kind === 'sdk' && <div style={{ width: 150 }}><Dropdown condensed value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={statuses.map(s => ({ value: s, label: s === 'All' ? 'All statuses' : s }))} /></div>}
        <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search version…" width={220} />
        <span style={{ marginLeft: 'auto', fontSize: 13, color: T.sub }}>{total} of {rows.length} versions</span>
      </Row>
      <DetailTableWrap>
          <thead><tr>
            {cols.map((c, ci) => <th key={ci} style={dtTh(ci >= numFrom && c ? 'right' : 'left')}>{c}</th>)}
          </tr></thead>
          <tbody>
            {view.map((r, ri) => { const last = ri === view.length - 1; return (
              <tr key={ri} className="ns-row">
                <td style={dtTd(last)}>{r.platform}</td>
                <td style={{ ...dtTd(last), fontFamily: 'var(--b-font-family-secondary)', fontWeight: 500 }}>{r.version}</td>
                <td style={dtTd(last)}><Tag label={r.status} variant={SDK_STATUS_VARIANT[r.status] || 'grey'} /></td>
                {kind === 'sdk' && <td style={{ ...dtTd(last, 'right'), color: T.sub, fontFamily: 'var(--b-font-family-secondary)' }}>{r.expiry}</td>}
                <td style={{ ...dtTd(last, 'right'), fontFamily: 'var(--b-font-family-secondary)' }}>{r.devices}</td>
                <td style={{ ...dtTd(last, 'right'), color: T.sub, fontFamily: 'var(--b-font-family-secondary)' }}>{r.stores}</td>
                <td style={{ ...dtTd(last, 'right'), color: T.sub, fontFamily: 'var(--b-font-family-secondary)' }}>{r.accounts}</td>
                {kind === 'sdk' && <td style={{ ...dtTd(last, 'right') }}><Button variant="tertiary" condensed onClick={() => notify && notify(`Release notes — ${r.platform} ${r.version}`)}>Release notes</Button></td>}
              </tr>
            ); })}
            {view.length === 0 && <tr><td colSpan={cols.length} style={{ padding: 24, textAlign: 'center', color: T.faint, fontSize: 13 }}>No versions match</td></tr>}
          </tbody>
      </DetailTableWrap>
      {pages > 1 && (
        <Row gap={10} style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: T.sub }}>Page {pg} of {pages}</span>
          <IconButton icon="chevron-left" variant="secondary" condensed disabled={pg <= 1} onClick={() => setPage(pg - 1)} title="Previous" />
          <IconButton icon="chevron-right" variant="secondary" condensed disabled={pg >= pages} onClick={() => setPage(pg + 1)} title="Next" />
        </Row>
      )}
    </Col>
  );
}

/* SDK releases — horizontal timeline (gantt) of installed vs newly-available versions. */
function SdkReleasesChart() {
  const months = ['July', 'August', 'September', 'October', 'November', 'December'];
  const N = months.length;
  const rows = [
    { label: 'Android 1.8.4 (Current)', start: 0, end: 1.3, installed: true },
    { label: 'Android 1.9.6 (Current)', start: 0, end: 2.3, installed: true },
    { label: 'iOS 2.2.3', start: 0.6, end: 4.7, installed: false },
    { label: 'iOS 2.3.3', start: 1.9, end: 6, installed: false },
  ];
  const pct = (v) => (v / N) * 100;
  return (
    <div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* month gridlines */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
          {months.map((m, i) => <div key={i} style={{ flex: 1, borderRight: i < N - 1 ? `1px solid ${T.sepFaint}` : 'none' }} />)}
        </div>
        {rows.map(r => (
          <div key={r.label} style={{ position: 'relative', height: 30 }}>
            <div style={{ position: 'absolute', left: pct(r.start) + '%', width: pct(r.end - r.start) + '%', minWidth: 90, height: '100%', background: r.installed ? 'var(--b-color-decorative-blue)' : 'var(--lume-skyblue, #a9d6ff)', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px', boxSizing: 'border-box' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: r.installed ? '#fff' : 'var(--b-color-label-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', marginTop: 14 }}>
        {months.map((m, i) => <span key={i} style={{ flex: 1, fontSize: 11, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? T.ink : T.faint, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{m} 2024</span>)}
      </div>
    </div>
  );
}

/* Explore → full-screen SDK & OS Health detail. */
function SdkHealthDetail({ onBack, notify }) {
  const d = D.sdkHealth, sdk = d.sdk.kpis, os = d.os.kpis;
  const kpiGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: T.s3 };
  const [range, setRange] = useState('30d');
  return (
    <FullPage title="SDK & OS health — Tap to Pay & card readers" subtitle={`All locations · ${d.totalDevices} devices · ${periodLabel(range)}`} onBack={onBack} backLabel="Device intelligence" backIcon={<ArrowLeftGlyph />} onClose={onBack}
      actions={<Row gap={8}><RangeChip value={range} onChange={setRange} options={DATA_PERIODS} /><Button variant="secondary" iconLeft="download" onClick={() => notify && notify('Exporting SDK & OS health to CSV…')}>Export</Button></Row>} bodyBg={T.page}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px`, display: 'flex', flexDirection: 'column', gap: T.s7 }}>
        <DetailSection title="SDK versions" info="Adyen SDK versions running across the fleet. Expiry drives whether devices keep accepting payments." description={`As of ${d.asOf} · single fleet of ${d.totalDevices} devices`}>
          <div style={kpiGrid}>
            <SdkKpi label="Upcoming Android SDK expiry" value={`In ${sdk.upcomingAndroid.inDays} days (${sdk.upcomingAndroid.version})`} />
            <SdkKpi label="Upcoming iOS SDK expiry" value={`In ${sdk.upcomingIos.inDays} days (${sdk.upcomingIos.version})`} />
            <SdkKpi label="Devices on expiring SDKs" value={`${sdk.expiring.count} (${sdk.expiring.pct.toFixed(2)}%)`} />
            <SdkKpi label="Total devices in fleet" value={sdk.total} />
          </div>
        </DetailSection>
        {/* SDK releases graph — outlined card */}
        <div style={{ ...surface, overflow: 'hidden' }}>
          <TileHeader title="SDK releases"
            info="Installed SDK versions and newly-available releases across the timeline. Dark = installed on your fleet, light = available to adopt."
            right={<Row gap={16}>
              <Row gap={6}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--b-color-decorative-blue)' }} /><span style={{ fontSize: 12, color: T.sub }}>Installed</span></Row>
              <Row gap={6}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--lume-skyblue, #a9d6ff)' }} /><span style={{ fontSize: 12, color: T.sub }}>New</span></Row>
              <MenuButton icon="options-vertical" variant="tertiary" items={[{ value: 'export', label: 'Export' }, { value: 'notes', label: 'Release notes' }]} onSelect={() => notify && notify('SDK releases')} />
            </Row>} />
          <div style={{ padding: `0 ${T.s5}px ${T.s5}px` }}><SdkReleasesChart /></div>
        </div>
        <DetailSection title="Installed SDKs" info="Every SDK version in use, with its expiry and the devices, stores and merchant accounts affected." description="Versions running across the fleet, with expiry and blast radius.">
          <VersionTable rows={d.sdk.installed} kind="sdk" notify={notify} />
        </DetailSection>
        <DetailSection title="OS versions" info="Operating-system floors for Tap to Pay and card readers. Devices below the minimum can’t transact.">
          <div style={kpiGrid}>
            <SdkKpi label="Minimum Android version" value={os.minAndroid} />
            <SdkKpi label="Minimum iOS version" value={os.minIos} />
            <SdkKpi label="Devices on minimum OS version" value={os.onMinimum} />
            <SdkKpi label="Devices on unsupported OS" value={os.onUnsupported} />
          </div>
        </DetailSection>
        <DetailSection title="Installed OS versions" info="Operating systems running across the fleet, with the devices, stores and accounts on each." description="Operating systems running across the fleet.">
          <VersionTable rows={d.os.installed} kind="os" notify={notify} />
        </DetailSection>
      </div>
    </FullPage>
  );
}

/* ============================================================= FIRMWARE HEALTH */
const FW_STATUS_VARIANT = { Finished: 'green', Scheduled: 'blue', Failed: 'red', Cancelled: 'grey', '-': 'grey' };
const FW_VALIDATION_VARIANT = { Approved: 'green', Cancelled: 'grey', Pending: 'orange' };

/* Summary tile — action-oriented firmware health + a mini status bar. */
function FirmwareHealthTile({ onExplore }) {
  const d = D.firmwareHealth, s = d.summary;
  const bar = [
    { n: s.failed, c: 'var(--b-color-decorative-red)', label: 'Failed' },
    { n: s.behind.count, c: 'var(--b-color-decorative-orange)', label: 'Update available' },
    { n: s.onLatest.count, c: 'var(--b-color-decorative-green)', label: 'On latest' },
  ];
  const metric = (dot, label, value, pct, variant) => (
    <Row style={{ justifyContent: 'space-between', gap: 10 }}>
      <Row gap={8} style={{ minWidth: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: T.ink }}>{label}</span>
      </Row>
      <Row gap={8}>
        <span className="ns-num" style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
        {pct != null && <Tag label={pct} variant={variant} />}
      </Row>
    </Row>
  );
  return (
    <div style={{ ...surface, overflow: 'hidden' }} className="ns-tile">
      <TileHeader title="Firmware health" subtitle={`Terminal software · ${d.totalDevices} devices`}
        info="Terminal software across your fleet — versions, scheduled updates and failures. Severity reflects the worst metric."
        right={<Button variant="tertiary" condensed iconRight="arrow-right" onClick={onExplore}>Explore</Button>} />
      <Col gap={14} style={{ padding: `0 ${T.s5}px ${T.s5}px` }}>
        <Col gap={10}>
          {metric('var(--b-color-decorative-red)', 'Failed updates', s.failed, s.failed > 0 ? 'Action' : 'OK', s.failed > 0 ? 'red' : 'green')}
          {metric('var(--b-color-decorative-orange)', 'Update available', s.behind.count, `${s.behind.pct}%`, 'orange')}
        </Col>
        <div style={{ height: 1, background: T.sepFaint }} />
        <BentoList items={[
          { label: 'Scheduled updates', value: `${s.scheduled} pending` },
          { label: 'Next scheduled', value: <span>{s.nextUpdate.version} · <b>{s.nextUpdate.date}</b></span> },
          { label: 'On latest software', value: `${s.onLatest.count} (${s.onLatest.pct}%)` },
        ]} />
        <Col gap={6}>
          <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', background: T.page }}>
            {bar.map(x => x.n > 0 && <div key={x.label} title={`${x.label} ${x.n}`} style={{ width: `${(x.n / d.totalDevices) * 100}%`, background: x.c }} />)}
          </div>
          <Row gap={16} style={{ flexWrap: 'wrap' }}>
            {bar.map(x => (
              <Row key={x.label} gap={6}><span style={{ width: 8, height: 8, borderRadius: 2, background: x.c }} /><span style={{ fontSize: 12, color: T.sub }}>{x.label} <b className="ns-num" style={{ color: T.ink }}>{x.n}</b></span></Row>
            ))}
          </Row>
        </Col>
      </Col>
    </div>
  );
}

/* Simple underline tab bar (Bento tabs). */
function UnderlineTabs({ value, onChange, tabs }) {
  return (
    <div style={{ display: 'flex', gap: 20, borderBottom: `1px solid ${T.sep}` }}>
      {tabs.map(t => {
        const on = value === t.value;
        return (
          <button key={t.value} onClick={() => onChange(t.value)} style={{ border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: on ? 600 : 500, color: on ? T.ink : T.sub, padding: '10px 2px', borderBottom: `2px solid ${on ? T.ink : 'transparent'}`, marginBottom: -1 }}>{t.label}</button>
        );
      })}
    </div>
  );
}

/* Explore → full-screen firmware detail: Updates · Releases · Default versions. */
function FirmwareDetail({ onBack, notify }) {
  const d = D.firmwareHealth;
  const [tab, setTab] = useState('updates');
  const [range, setRange] = useState('30d');
  const miniLabel = { fontSize: 11, color: T.faint, fontWeight: 600 };
  const num = (n) => n === 0 ? <span style={{ color: T.faint }}>–</span> : <span className="ns-num">{n}</span>;
  return (
    <FullPage title="Terminal software" subtitle={`All locations · ${periodLabel(range)}`} onBack={onBack} backLabel="Device intelligence" backIcon={<ArrowLeftGlyph />} onClose={onBack}
      actions={<Row gap={8}><RangeChip value={range} onChange={setRange} options={DATA_PERIODS} /><Button variant="primary" iconLeft="plus" onClick={() => notify && notify('Schedule update…')}>Schedule update</Button></Row>} bodyBg={T.page}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: `${T.s5}px ${T.s7}px ${T.s7}px`, display: 'flex', flexDirection: 'column', gap: T.s6 }}>
        <UnderlineTabs value={tab} onChange={setTab} tabs={[{ value: 'updates', label: 'Updates' }, { value: 'releases', label: 'Releases' }, { value: 'defaults', label: 'Default versions' }]} />

        {tab === 'updates' && (
          <DetailSection title="Software updates" info="Batches you’ve scheduled to move terminals onto new software. Failed batches need action.">
            <Alert type="info" variant="tip" description="Keep your terminal fleet on the latest software and schedule updates yourself — roll out in preconfigured batches for the safest path, or create your own." />
            <DetailTableWrap minWidth={1040}>
                <thead><tr>
                  {['Deployment & batch', 'Validation', 'Update status', 'Versions', 'Scheduled', 'Total', 'Fleet %', 'Successful', 'Failed', 'Pending', 'Cancelled', 'Created'].map((c, i) => <th key={i} style={dtTh(i >= 5 && i <= 10 ? 'right' : 'left')}>{c}</th>)}
                </tr></thead>
                <tbody>
                  {d.updates.map((r, ri) => { const last = ri === d.updates.length - 1; return (
                    <tr key={ri} className="ns-row">
                      <td style={dtTd(last)}><a href="#" onClick={(e) => { e.preventDefault(); notify && notify(r.batch); }} style={{ color: 'var(--b-color-link-primary)', textDecoration: 'none' }}>{r.batch}</a></td>
                      <td style={dtTd(last)}><Tag label={r.validation} variant={FW_VALIDATION_VARIANT[r.validation] || 'grey'} /></td>
                      <td style={dtTd(last)}>{r.status === '-' ? <span style={{ color: T.faint }}>–</span> : <Row gap={6}><Ico name={r.status === 'Finished' ? 'checkmark-circle' : r.status === 'Scheduled' ? 'timer' : r.status === 'Failed' ? 'cross-circle' : 'info'} size={16} color={r.status === 'Failed' ? 'var(--b-color-label-critical)' : r.status === 'Finished' ? 'var(--b-color-label-success)' : T.sub} /><span>{r.status}</span></Row>}</td>
                      <td style={{ ...dtTd(last), fontFamily: 'var(--b-font-family-secondary)' }}>{r.version}</td>
                      <td style={{ ...dtTd(last), color: T.sub, fontFamily: 'var(--b-font-family-secondary)' }}>{r.scheduled}</td>
                      <td style={{ ...dtTd(last, 'right'), fontFamily: 'var(--b-font-family-secondary)' }}>{r.total}</td>
                      <td style={{ ...dtTd(last, 'right'), color: T.sub, fontFamily: 'var(--b-font-family-secondary)' }}>{r.pct}</td>
                      <td style={dtTd(last, 'right')}>{num(r.successful)}</td>
                      <td style={dtTd(last, 'right')}>{r.failed > 0 ? <span className="ns-num" style={{ color: 'var(--b-color-label-critical)', fontWeight: 600 }}>{r.failed}</span> : num(r.failed)}</td>
                      <td style={dtTd(last, 'right')}>{num(r.pending)}</td>
                      <td style={dtTd(last, 'right')}>{num(r.cancelled)}</td>
                      <td style={{ ...dtTd(last), color: T.sub }}>{r.created}</td>
                    </tr>
                  ); })}
                </tbody>
            </DetailTableWrap>
          </DetailSection>
        )}

        {tab === 'releases' && (
          <DetailSection title="Latest releases" info="Available software per terminal family, with the current stable and beta configurations.">
            {d.releases.map(r => (
              <div key={r.family} style={{ ...surface, padding: `${T.s4}px ${T.s5}px`, display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.4fr 1fr auto', gap: 16, alignItems: 'center' }}>
                <Col gap={2}><span style={{ fontSize: 14, fontWeight: 600 }}>{r.family}</span><a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 12, color: 'var(--b-color-link-primary)', textDecoration: 'none' }}>All releases</a></Col>
                <Col gap={2}><span style={miniLabel}>Version</span><span style={{ fontSize: 13, fontFamily: 'var(--b-font-family-secondary)' }}>{r.version}</span></Col>
                <Col gap={4}><span style={miniLabel}>Configuration</span>
                  <Row gap={8}><span style={{ fontSize: 13, fontFamily: 'var(--b-font-family-secondary)' }}>{r.stable}</span><Tag label="Stable" variant="blue" /></Row>
                  <Row gap={8}><span style={{ fontSize: 13, fontFamily: 'var(--b-font-family-secondary)' }}>{r.beta}</span><Tag label="Beta" variant="orange" /></Row>
                </Col>
                <Col gap={2}><span style={miniLabel}>Date</span><span style={{ fontSize: 13, color: T.sub }}>{r.date}</span></Col>
                <Button variant="secondary" condensed onClick={() => notify && notify(`${r.family} — release details`)}>Show more</Button>
              </div>
            ))}
          </DetailSection>
        )}

        {tab === 'defaults' && (
          <DetailSection title="Default versions" info="The software a model receives when a terminal is newly (re)assigned." description="Changing the default version means newly (re)assigned terminals receive it upon boarding.">
            <DetailTableWrap minWidth={640}>
                <thead><tr>{['Model', 'Family', 'Default software version', 'Settings level', ''].map((c, i) => <th key={i} style={dtTh()}>{c}</th>)}</tr></thead>
                <tbody>
                  {d.defaults.map((r, ri) => { const last = ri === d.defaults.length - 1; return (
                    <tr key={ri} className="ns-row">
                      <td style={{ ...dtTd(last), fontWeight: 500 }}>{r.model}</td>
                      <td style={{ ...dtTd(last), color: T.sub }}>{r.family}</td>
                      <td style={{ ...dtTd(last), fontFamily: 'var(--b-font-family-secondary)' }}>{r.version}</td>
                      <td style={dtTd(last)}><a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--b-color-link-primary)', textDecoration: 'none' }}>{r.level}</a></td>
                      <td style={{ ...dtTd(last), textAlign: 'right' }}><Button variant="secondary" condensed onClick={() => notify && notify(`Change default version — ${r.model}`)}>Change default versions</Button></td>
                    </tr>
                  ); })}
                </tbody>
            </DetailTableWrap>
          </DetailSection>
        )}
      </div>
    </FullPage>
  );
}

/* ============================================================= BUSINESS INSIGHT (merchant lens)
   Each card answers a real merchant question with a EUR consequence, a next action, and a
   data-readiness tag. All euro figures are ILLUSTRATIVE MOCK (Uniqlo APAC retail / unified-commerce demo). */
function DeltaChip({ text, tone }) {
  const color = tone === 'risk' ? 'var(--b-color-label-critical)' : 'var(--b-color-label-success)';
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600, color }}><Ico name={tone === 'risk' ? 'arrow-down' : 'arrow-up'} size={14} color={color} />{text}</span>;
}
function MiniBar({ pct, color }) {
  return <div style={{ height: 6, borderRadius: 3, background: 'var(--b-color-background-tertiary)', overflow: 'hidden' }}><div style={{ width: Math.max(0, Math.min(100, pct)) + '%', height: '100%', background: color || 'var(--b-color-decorative-blue)' }} /></div>;
}
/* Clean Stripe-style metric card: short title + info · big value · muted sub · top-right link. */
function BizCard({ title, value, delta, tone, sub, info, action, onAction, children }) {
  return (
    <div style={{ ...surface, padding: `${T.s4}px ${T.s5}px`, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }} className="ns-tile">
      <Row align="flex-start" style={{ gap: 8 }}>
        <Row gap={6} style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{title}</span>
          {info && <InfoTip content={info} placement="right"><Ico name="info" size={16} color={T.ink} /></InfoTip>}
        </Row>
        {action && <Button variant="tertiary" condensed iconRight="arrow-right" onClick={onAction}>{action}</Button>}
      </Row>
      <Row gap={8} align="baseline">
        <span className="ns-num" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>{value}</span>
        {delta && <DeltaChip text={delta} tone={tone} />}
      </Row>
      {sub && <span style={{ fontSize: 12, color: T.sub, lineHeight: '17px' }}>{sub}</span>}
      {children}
    </div>
  );
}
function businessGroups({ say, onOpenStores, onOpenDevices, onFirmware }) {
  return [
    {
      label: 'Revenue at risk', cards: [
        <BizCard key="idle" title="Revenue at risk" value="~€340k/mo" delta="at risk" tone="risk" info="Where am I losing sales right now?" sub="12 idle devices should be trading." action="View" onAction={onOpenDevices} />,
        <BizCard key="decl" title="Recoverable declines" value="~€48k/mo" delta="recoverable" tone="up" info="How much is being declined, and how much is recoverable?" sub="5.8% declined (~€265k/mo)." action="Recover" onAction={say('Decline recovery — coming soon')} />,
        <BizCard key="stale" title="Stale-software risk" value="~€90k/mo" delta="at risk" tone="risk" info="Is stale software costing me volume?" sub="15 devices on expired SDK." action="Update" onAction={onFirmware} />,
      ],
    },
    {
      label: 'Revenue optimization', cards: [
        <BizCard key="dcc" title="DCC uplift" value="+~€22k/mo" delta="uplift" tone="up" info="How many terminals have DCC enabled?" sub="58% enabled · 49 eligible off." action="Enable" onAction={say('DCC roll-out — 49 eligible terminals')}>
          <MiniBar pct={58} color="var(--b-color-decorative-blue)" />
        </BizCard>,
        <BizCard key="instal" title="Installments uplift" value="+~€18k/mo" delta="uplift" tone="up" info="Are shoppers offered installments / BNPL at checkout? Common in APAC retail — lifts basket size and conversion." sub="Offered in 3 of 6 markets." action="Enable" onAction={say('Enable installments in 3 more markets')}>
          <MiniBar pct={50} color="var(--b-color-decorative-blue)" />
        </BizCard>,
      ],
    },
    {
      label: 'Benchmark & cross-channel', cards: [
        <BizCard key="bench" title="Peer benchmark" value="+~€36k/mo" delta="gap to close" tone="up" action="Compare" onAction={onOpenStores}
          info={<span>Uniqlo APAC’s card <b>authorisation rate</b> compared with the median of similar Adyen <b>retail / unified-commerce</b> merchants — same region and size band, last 30 days, anonymised and aggregated. You sit <b>0.8pt below</b> the sector median; closing that gap is worth ~€36k/mo.</span>}
          sub="Auth rate · Uniqlo APAC vs retail sector median">
          <Col gap={20} style={{ marginTop: 10, flex: 1, justifyContent: 'center' }}>
            {[['Uniqlo APAC', 94.2, 'var(--b-color-decorative-blue)'], ['Retail sector median', 95.0, 'var(--b-color-label-tertiary)']].map(([lbl, rate, c]) => (
              <Col key={lbl} gap={6}>
                <Row style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: T.sub }}>{lbl}</span><span className="ns-num" style={{ fontSize: 13, fontWeight: 600 }}>{rate}%</span></Row>
                <div style={{ height: 10, borderRadius: 5, background: 'var(--b-color-background-tertiary)', overflow: 'hidden' }}><div style={{ width: ((rate - 90) / 6 * 100) + '%', height: '100%', background: c }} /></div>
              </Col>
            ))}
          </Col>
        </BizCard>,
        <BizCard key="cross" title="Cross-channel" value="~€151k/30d" delta="2.3× spend" tone="up"
          info={<span>In-store sales in the last 30 days from shoppers Adyen first saw <b>online</b>, matched by the network token on their card. Unified commerce lets you recognise the same shopper across web and store.</span>}
          sub="In-store sales from online-acquired shoppers">
          <Col gap={12} style={{ marginTop: 2 }}>
            <Row gap={12} style={{ borderTop: `1px solid ${T.sepFaint}`, paddingTop: 12 }}>
              <Col gap={2} style={{ flex: 1, minWidth: 0 }}><span style={{ fontSize: 12, color: T.faint }}>Omnichannel shoppers</span><span className="ns-num" style={{ fontSize: 18, fontWeight: 600 }}>3,140</span></Col>
              <Col gap={2} style={{ flex: 1, minWidth: 0 }}><span style={{ fontSize: 12, color: T.faint }}>Spend vs single-channel</span><span className="ns-num" style={{ fontSize: 18, fontWeight: 600 }}>2.3×</span></Col>
            </Row>
            <span style={{ fontSize: 12, color: T.sub, lineHeight: '17px' }}>Recognise the same card across web and store with network tokens to grow repeat conversion.</span>
            <Row gap={8}>
              <Button variant="secondary" condensed onClick={say('Enabling stored-card recognition across channels…')}>Enable stored-card recognition</Button>
            </Row>
          </Col>
        </BizCard>,
        <BizCard key="next" title="Next best action" value="2 recommended" delta="+~€70k/mo total" tone="up"
          info="A ranked to-do list — the highest-impact changes for Uniqlo APAC right now, each with estimated monthly value and effort. Apply directly, or hand the list to your Adyen contact."
          sub="Ranked by impact · one-click apply">
          <Col gap={0} style={{ marginTop: 2 }}>
            {[
              { n: 1, t: 'Enable DCC on 49 eligible terminals', v: '+~€22k/mo', e: 'Low effort', act: 'Apply', m: 'Rolling out DCC to 49 terminals…' },
              { n: 2, t: 'Recover wrongly-declined payments', v: '+~€48k/mo', e: 'Medium effort', act: 'Review', m: 'Opening decline recovery…' },
            ].map((r, i) => (
              <Row key={r.n} gap={10} align="center" style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${T.sepFaint}` }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--b-color-background-secondary)', color: T.ink, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{r.n}</span>
                <Col gap={1} style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{r.t}</span>
                  <Row gap={6} align="center"><span className="ns-num" style={{ fontSize: 12, fontWeight: 600, color: 'var(--b-color-label-success)' }}>{r.v}</span><span style={{ fontSize: 12, color: T.faint }}>· {r.e}</span></Row>
                </Col>
                <Button variant="secondary" condensed onClick={say(r.m)}>{r.act}</Button>
              </Row>
            ))}
          </Col>
        </BizCard>,
      ],
    },
  ];
}

/* Full-screen business-impact detail — trend over time + the categorised metric cards. */
function BusinessInsightDetail({ onBack, notify, onOpenStores, onOpenDevices, onFirmware }) {
  const say = (m) => () => notify && notify(m);
  const RANGES = DATA_PERIODS;
  const [range, setRange] = useState('30d');
  const rangeLabel = `All locations · ${periodLabel(range)}`;
  const groups = businessGroups({ say, onOpenStores, onOpenDevices, onFirmware });
  const trend = {
    labels: D.volumeTrend.labels, unit: '€k', min: 0, max: 900,
    series: [
      // A connectivity crisis in Dec–Jan spikes revenue-at-risk, then it's brought back under control.
      { name: 'Revenue at risk (€k)', color: 'var(--b-color-decorative-red)', points: [300, 315, 330, 620, 860, 690, 500, 410, 470, 560, 400, 340] },
      { name: 'Opportunity (€k)', color: 'var(--b-color-decorative-green)', points: [58, 61, 63, 66, 68, 70, 72, 73, 74, 75, 76, 76] },
    ],
  };
  return (
    <FullPage title="Business insight" subtitle={rangeLabel} tone="nav-analytics"
      onBack={onBack} backLabel="Device intelligence" backIcon={<ArrowLeftGlyph />} onClose={onBack} bodyBg={T.page}
      actions={<Row gap={8}>
        <RangeChip value={range} onChange={setRange} options={RANGES} />
        <Button variant="secondary" iconLeft="download" onClick={say('Exporting business insight…')}>Export</Button>
      </Row>}>
      <div style={{ maxWidth: T.maxW, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px`, display: 'flex', flexDirection: 'column', gap: T.s6 }}>
        <SummaryGrid cols={2} items={[
          { title: 'Revenue at risk / month', value: '~€340k', hint: 'Recovered from a ~€860k Jan peak · idle devices, declines & stale software.' },
          { title: 'Opportunity identified / month', value: '+~€76k', hint: 'DCC, installments and benchmark gap.' },
        ]} />
        <Alert type="critical" title="Revenue-at-risk spiked to ~€860k in Jan"
          description="A 3-day network outage took 22 stores offline over the holiday peak, nearly tripling monthly revenue-at-risk. Connectivity is restored and it’s recovered to ~€340k — now driven by 12 idle devices and 15 terminals on expired SDKs." />
        <div style={{ ...surface, overflow: 'hidden' }}>
          <TileHeader title="Business impact over time" subtitle="Last 12 months · illustrative · Jan outage marked by the spike"
            right={<Legend series={trend.series} />} />
          <div style={{ padding: `0 ${T.s5}px ${T.s5}px`, height: 240 }}><LineChart data={trend} height={200} /></div>
        </div>
        {/* Feature adoption — folded in from the former standalone tile (the opportunity side of business insight) */}
        <div style={{ ...surface, overflow: 'hidden' }}>
          <TileHeader title="Feature adoption" subtitle="DCC, tipping & installments · last 12 months"
            info="Adoption of DCC, tipping and installments across your fleet over the last 12 months — the opportunity side of business insight."
            right={<Legend series={D.featureAdoption.series} />} />
          <div style={{ padding: `0 ${T.s5}px ${T.s5}px`, height: 240 }}><LineChart data={D.featureAdoption} height={200} /></div>
        </div>
        {groups.map(g => (
          <Col key={g.label} gap={T.s4}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{g.label}</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: T.s4 }}>{g.cards}</div>
          </Col>
        ))}
      </div>
    </FullPage>
  );
}

/* Getting-started onboarding steps — each linked to a doc. */
const ONBOARDING_STEPS = [
  { done: true, title: 'Board your first device', desc: 'At least one device is active in a location.' },
  { done: true, title: 'Add payment methods', desc: 'Visa, Mastercard, Maestro and local methods enabled.' },
  { done: false, title: "Accept Apple's Terms & Conditions", desc: "Accept and manage Apple's Tap to Pay Terms & Conditions." },
  { done: false, title: 'Generate SDK tokens', desc: 'Generate and manage the SDK tokens required for your mobile products.' },
  { done: false, title: 'Add Google Play certificate', desc: 'Add your app certificate from the Google Play Console to verify authenticity.' },
  { done: false, title: 'Add Apple Tap to Pay certificate', desc: 'Upload the Apple entitlement certificate to go live on iPhone.' },
  { done: false, title: 'Enable Tap to Pay on iPhone', desc: 'Accept contactless on iPhone — no separate reader.' },
  { done: false, title: 'Configure receipts & branding', desc: 'Set your logo, receipt header and footer.' },
  { done: false, title: 'Complete PCI attestation', desc: 'Annual self-assessment questionnaire is due.' },
  { done: false, title: 'Set default software versions', desc: 'Choose the firmware/SDK new devices receive on boarding.' },
];
/* Numbered step rows (Bento stepper look); each row opens its doc. */
function OnboardingList({ steps, onDoc }) {
  return (
    <div>
      {steps.map((st, i) => (
        <button key={st.title} type="button" className="ns-row" onClick={() => onDoc(st.title)}
          style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: '14px 4px', border: 0, borderTop: i === 0 ? 'none' : `1px solid ${T.sepFaint}`, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          {st.done
            ? <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--b-color-decorative-green)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ico name="checkmark" size={14} color="#fff" /></span>
            : <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#001222', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 600 }}>{i + 1}</span>}
          <Col gap={1} style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{st.title}</span>
            <span style={{ fontSize: 13, color: T.sub }}>{st.desc}</span>
          </Col>
          <Ico name="chevron-right" size={16} color={T.faint} />
        </button>
      ))}
    </div>
  );
}
function ProgressPill({ done, total }) {
  const pct = Math.round((done / total) * 100);
  return (
    <Row gap={12} align="center">
      <span className="ns-num" style={{ fontSize: 14, lineHeight: '18px', color: '#00112C' }}>{done}/{total}</span>
      <div style={{ width: 120, height: 9, borderRadius: 100, background: '#F7F7F8', overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: '#0063D7', borderRadius: 100 }} /></div>
    </Row>
  );
}
/* Full-screen — all onboarding tasks. */
function OnboardingDetail({ onBack, notify }) {
  const doc = (title) => notify && notify(`Opening guide: ${title}`);
  const done = ONBOARDING_STEPS.filter(s => s.done).length;
  return (
    <FullPage title="Getting started" subtitle="Complete setup to go live" tone="nav-devices"
      onBack={onBack} backLabel="" backIcon={<ArrowLeftGlyph />} onClose={onBack} bodyBg={T.page}
      actions={<><ProgressPill done={done} total={ONBOARDING_STEPS.length} /><Button variant="secondary" iconRight="external-link" onClick={() => notify && notify('Opening documentation…')}>View docs</Button></>}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px` }}>
        <div style={{ ...surface, overflow: 'hidden', padding: `0 ${T.s5}px` }}>
          <OnboardingList steps={ONBOARDING_STEPS} onDoc={doc} />
        </div>
      </div>
    </FullPage>
  );
}
/* Getting-started tile — first 4 steps + kebab (View all tasks · View docs). */
function OnboardingTasks({ notify }) {
  const [detail, setDetail] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useOutside(menuOpen, () => setMenuOpen(false));
  const doc = (title) => notify && notify(`Opening guide: ${title}`);
  const done = ONBOARDING_STEPS.filter(s => s.done).length;
  const menuItem = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', border: 0, background: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: T.ink, textAlign: 'left', whiteSpace: 'nowrap' };
  const kebab = (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <IconButton icon="options-vertical" variant="tertiary" title="More actions" onClick={() => setMenuOpen(o => !o)} />
      {menuOpen && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 500, minWidth: 200, background: T.card, border: `1px solid ${T.sep}`, borderRadius: T.radiusL, boxShadow: 'var(--b-shadow-medium)', padding: 4 }}>
          <button className="b-menu-item" style={menuItem} onClick={() => { setMenuOpen(false); setDetail(true); }}><Ico name="list" size={16} color={T.sub} />View all tasks</button>
          <button className="b-menu-item" style={menuItem} onClick={() => { setMenuOpen(false); notify && notify('Opening documentation…'); }}><Ico name="external-link" size={16} color={T.sub} />View docs</button>
        </div>
      )}
    </div>
  );
  return (
    <>
      <div style={{ ...surface, overflow: 'hidden' }} className="ns-tile">
        <TileHeader title="Getting started"
          info="Finish setup to go live — accept payment methods, enable Tap to Pay, add certificates and stay compliant."
          right={<Row gap={16} align="center"><ProgressPill done={done} total={ONBOARDING_STEPS.length} />{kebab}</Row>} />
        <div style={{ padding: `0 ${T.s5}px ${T.s3}px` }}>
          <OnboardingList steps={ONBOARDING_STEPS.slice(0, 4)} onDoc={doc} />
        </div>
        <div style={{ padding: `0 ${T.s5}px ${T.s4}px` }}>
          <Button variant="tertiary" condensed iconRight="arrow-right" onClick={() => setDetail(true)}>View all tasks</Button>
        </div>
      </div>
      {detail && <OnboardingDetail onBack={() => setDetail(false)} notify={notify} />}
    </>
  );
}

function BusinessInsight({ notify, onOpenStores, onOpenDevices, onFirmware }) {
  const [detail, setDetail] = useState(false);
  const open = () => setDetail(true);
  return (
    <>
      <div style={{ ...surface, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }} className="ns-tile">
        <TileHeader title="Business insight" subtitle="Last 30 days"
          info={<span>What your fleet is <b>costing or making</b> you — and where to act. Explore for the trend and full breakdown.</span>}
          right={<Button variant="tertiary" condensed iconRight="arrow-right" onClick={open}>Explore</Button>} />
        <div style={{ padding: `0 ${T.s5}px ${T.s5}px`, flex: 1, minHeight: 0 }}>
          <SummaryGrid cols={2} style={{ gridAutoRows: '1fr', height: '100%' }} items={[
            { title: 'Revenue at risk / month', value: '~€695k', hint: 'Idle devices, declines and stale software.', onClick: open },
            { title: 'Opportunity identified / month', value: '+~€76k', hint: 'DCC, installments and benchmark gap.', onClick: open },
            kpiById('dcc'),
            kpiById('offline'),
          ]} />
        </div>
      </div>
      {detail && <BusinessInsightDetail onBack={() => setDetail(false)} notify={notify} onOpenStores={onOpenStores} onOpenDevices={onOpenDevices} onFirmware={onFirmware} />}
    </>
  );
}

function DeviceIntelligence({ onOpenAllStores, onOpenAllDevices, onOpenExplore, onOpenStudio, notify }) {
  // Committed layout (drives the dashboard + persisted). Restored from the user's last save.
  const [tileIds, setTileIds] = useState(() => loadLayout() || DEFAULT_TILE_IDS);
  // Working copy while editing — Save commits it, Cancel discards it.
  const [draftIds, setDraftIds] = useState(null);
  const [savedTiles, setSavedTiles] = useState([]);
  const [customize, setCustomize] = useState(false);
  const [dragId, setDragId] = useState(null);
  // Luma / CA-analytics scope filter bar
  const [dateRange, setDateRange] = useState('30d');
  const [fScope, setFScope] = useState([]);
  const [fPlatform, setFPlatform] = useState([]);
  const [fStatus, setFStatus] = useState([]);
  const [fModel, setFModel] = useState([]);
  const fToggle = (setter) => (v) => setter(a => a.includes(v) ? a.filter(x => x !== v) : [...a, v]);
  const filtersActive = fScope.length || fPlatform.length || fStatus.length || fModel.length || dateRange !== '30d';
  const resetFilters = () => { setDateRange('30d'); setFScope([]); setFPlatform([]); setFStatus([]); setFModel([]); };
  const [sdkOpen, setSdkOpen] = useState(false);
  const [fwOpen, setFwOpen] = useState(false);
  const [connOpen, setConnOpen] = useState(false);

  const tiles = tileIds.map(id => ALL_TILES.find(t => t.id === id)).filter(Boolean);
  const editIds = draftIds || tileIds;
  const available = ALL_TILES.filter(t => !editIds.includes(t.id));

  // Edit-mode mutations operate on the draft only.
  const removeTile = (id) => setDraftIds(ids => ids.filter(x => x !== id));
  const addTile = (id) => setDraftIds(ids => [...ids, id]);
  const moveTile = (fromId, toId) => setDraftIds(ids => { const a = [...ids]; const fi = a.indexOf(fromId), ti = a.indexOf(toId); if (fi < 0 || ti < 0 || fi === ti) return ids; a.splice(ti, 0, a.splice(fi, 1)[0]); return a; });
  const startEdit = () => { setDraftIds(tileIds); setCustomize(true); };
  const cancelEdit = () => { setCustomize(false); setDraftIds(null); };
  const saveEdit = () => { setTileIds(draftIds); saveLayout(draftIds); setCustomize(false); setDraftIds(null); notify('Layout saved'); };
  const saveNLTile = (ans) => { setSavedTiles(t => [...t, { id: 'nl-' + Date.now(), ans }]); notify('Saved to your dashboard'); };

  const renderTileBody = (t) => {
    if (t.kind === 'kpi') return <KPITile />;
    if (t.kind === 'featureInsight') return <FeatureInsightTile />;
    if (t.kind === 'chart') return <ChartTile chart={t.chart} />;
    if (t.kind === 'grid') {
      const g = D[t.grid];
      return <Grid columns={g.columns} rows={g.rows} onCell={t.topic === 'storesAttention' ? onOpenAllStores : undefined} />;
    }
    return null;
  };

  const tileActions = (t) => (t.topic ? <Button variant="tertiary" condensed iconRight="arrow-right" onClick={() => onOpenExplore(t)}>Explore</Button> : null);

  // ---- Customize homepage (Edit layout) — dedicated page: drag to re-order, add/remove ----
  if (customize) {
    const Grip = () => (
      <span style={{ display: 'grid', gridTemplateColumns: '3px 3px', gap: 3, flexShrink: 0, cursor: 'grab' }}>
        {Array.from({ length: 6 }).map((_, i) => <span key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: T.faint }} />)}
      </span>
    );
    return (
      <div style={{ padding: `${T.s7}px ${T.s7}px ${T.s7}px`, maxWidth: T.maxW, margin: '0 auto' }}>
        <div style={{ marginBottom: T.s3 }}><Button variant="tertiary" condensed iconLeft="chevron-left" onClick={cancelEdit}>Devices Intelligence</Button></div>
        <Row align="flex-start" style={{ marginBottom: T.s6 }}>
          <Col gap={4} style={{ flex: 1 }}>
            <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Customise dashboard</span>
            <span style={{ fontSize: 13, color: T.sub }}>Drag widgets to re-order · your saved layout is remembered on this device</span>
          </Col>
          <Row gap={8}>
            <Button variant="tertiary" onClick={() => setDraftIds(DEFAULT_TILE_IDS)}>Reset to default</Button>
            <MenuButton variant="secondary" icon="plus" label="Add widget" align="right" condensed={false}
              items={available.length ? available.map(a => ({ value: a.id, label: a.name, icon: a.kind === 'chart' ? 'nav-analytics' : a.kind === 'grid' ? 'list' : 'grid' })) : [{ value: '_', label: 'All widgets added', disabled: true }]}
              onSelect={(v) => v !== '_' && addTile(v)} />
            <Button variant="primary" iconLeft="checkmark" onClick={saveEdit}>Save</Button>
          </Row>
        </Row>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
          {editIds.map(id => {
            const t = ALL_TILES.find(x => x.id === id); if (!t) return null;
            return (
              <div key={id} draggable onDragStart={() => setDragId(id)} onDragEnd={() => setDragId(null)}
                onDragOver={(e) => e.preventDefault()} onDrop={() => { moveTile(dragId, id); setDragId(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusM, background: T.card, opacity: dragId === id ? 0.4 : 1 }}>
                <Grip />
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                <IconButton icon="cross" variant="tertiary" condensed title="Remove widget" onClick={() => removeTile(id)} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: `${T.s7}px ${T.s7}px ${T.s7}px`, maxWidth: T.maxW, margin: '0 auto' }}>
      {/* header */}
      <Row style={{ marginBottom: T.s5 }} align="flex-start">
        <Col gap={4} style={{ flex: 1 }}>
          <Row gap={6}>
            <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Devices Intelligence</span>
            <InfoTip width={320} content={<span>A single, queryable view of every payment device across your fleet — <b>Terminals</b> and <b>SoftPOS</b> — covering health, adoption and compliance. Ask questions in plain language or build your own dashboard.</span>} placement="right"><Ico name="info" size={16} color={T.ink} /></InfoTip>
          </Row>
          <span style={{ fontSize: 13, color: T.sub }}>Every payment device across your fleet — Terminals and SoftPOS · last sync 4 min ago</span>
        </Col>
        <Row gap={T.s2}>
          <Button variant="secondary" iconLeft="download" onClick={() => notify('Exporting dashboard to CSV…')}>Export</Button>
          <Button variant="secondary" iconLeft="grid" onClick={startEdit}>Edit layout</Button>
        </Row>
      </Row>

      <Col gap={T.s7}>

        {/* saved NL tiles */}
        {savedTiles.map(st => (
          <Section key={st.id} title={st.ans.question} description="Saved from Ask your fleet"
            actions={<IconButton icon="cross" variant="tertiary" title="Remove" onClick={() => setSavedTiles(t => t.filter(x => x.id !== st.id))} />}>
            <Row gap={T.s6} align="flex-start" style={{ flexWrap: 'wrap' }}>
              <Col gap={4} style={{ minWidth: 160 }}>
                <span className="ns-num" style={{ fontSize: 28, fontWeight: 600 }}>{st.ans.metric.value}</span>
                <span style={{ fontSize: 12, color: T.sub }}>{st.ans.metric.label}</span>
              </Col>
              <div style={{ flex: 1, minWidth: 280 }}><Grid columns={st.ans.grid.columns} rows={st.ans.grid.rows.slice(0, 4)} dense /></div>
            </Row>
          </Section>
        ))}

        {/* tile grid — dense flow so half-width tiles backfill gaps (no empty spots) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: T.s6, gridAutoFlow: 'dense' }}>
          {tiles.map(t => (
            <div key={t.id} className="ns-tile-cell" style={{ gridColumn: t.w === 'full' ? 'span 2' : 'span 1' }}>
              {t.kind === 'kpi'
                ? <KPITile actions={tileActions(t)} onOpenStores={onOpenAllStores} onOpenDevices={onOpenAllDevices} />
                : t.kind === 'featureInsight'
                  ? <FeatureInsightTile onExplore={() => onOpenExplore({ name: 'Feature adoption', grid: 'featureByModel' })} />
                : t.kind === 'business'
                  ? <BusinessInsight notify={notify} onOpenStores={onOpenAllStores} onOpenDevices={onOpenAllDevices} onFirmware={() => setFwOpen(true)} />
                : t.kind === 'onboarding'
                  ? <OnboardingTasks notify={notify} onOpenStores={onOpenAllStores} />
                : t.kind === 'sdkHealth'
                  ? <SdkHealthTile onExplore={() => setSdkOpen(true)} />
                : t.kind === 'firmwareHealth'
                  ? <FirmwareHealthTile onExplore={() => setFwOpen(true)} />
                : t.kind === 'connectivity'
                  ? <ConnectivityTile notify={notify} onExplore={() => setConnOpen(true)} />
                : t.kind === 'chart'
                  ? <ChartCard t={t} actions={customize ? tileActions(t) : undefined} onExplore={t.id === 'notTradingTrend' ? () => setConnOpen('failed') : undefined} />
                : t.kind === 'grid'
                  ? <Col gap={10}>
                      <Row style={{ minHeight: 28 }}>
                        <Row gap={6} style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{t.name}</span>
                          <InfoTip content="What this grid shows and how it's calculated." placement="right"><Ico name="info" size={16} color={T.ink} /></InfoTip>
                        </Row>
                        <Row gap={8}>{tileActions(t)}</Row>
                      </Row>
                      {renderTileBody(t)}
                    </Col>
                  : <Section title={t.name} actions={tileActions(t)}>{renderTileBody(t)}</Section>}
            </div>
          ))}
        </div>
      </Col>

      <FloatingAsk onSaveTile={saveNLTile} onExplore={onOpenExplore} notify={notify} context="fleet" />
      {sdkOpen && <SdkHealthDetail onBack={() => setSdkOpen(false)} notify={notify} />}
      {fwOpen && <FirmwareDetail onBack={() => setFwOpen(false)} notify={notify} />}
      {connOpen && <ConnectivityDetail onBack={() => setConnOpen(false)} notify={notify} focus={connOpen === 'failed' ? 'failed' : null} />}
    </div>
  );
}

/* ============================================================= EXPLORE */
/* Optional analysis block shown above the list for richer Explore views (stat cards + an insight). */
const EXPLORE_ANALYSIS = {
  batteryHealth: {
    stats: [
      { label: 'Battery-powered devices', value: '338,750' },
      { label: 'Avg battery health', value: '88%', sub: 'portable & mobile fleet' },
      { label: 'Needs replacement', value: '16,990', sub: 'below 80% health' },
      { label: 'Weakest model', value: 'e355', sub: '81% · 9,410 to swap' },
    ],
    insight: { type: 'warning', title: 'e355 handhelds are aging fastest',
      description: 'At 81% average battery health with 9,410 units below the 80% replacement threshold, e355 handhelds are most at risk of mid-shift shutdowns — prioritise battery swaps here. Countertop (AMS1) and kiosk (NYC1) are mains-powered and unaffected.' },
  },
  transactionSpeed: {
    stats: [
      { label: 'Fleet median time', value: '2.1s' },
      { label: 'Fleet P95', value: '4.4s' },
      { label: 'Slow (>5s)', value: '2.9%', sub: 'of transactions' },
      { label: 'Slowest model', value: 'SoftPOS', sub: '3.2s median · 6.9% slow' },
    ],
    insight: { type: 'highlight', title: 'Mobile devices are the slow tail',
      description: 'SoftPOS (3.2s) and e355 (2.9s) have the slowest median times and the highest share of >5s transactions (~6–7%), typically online-authorisation latency over mobile networks. Countertop and kiosk terminals are fastest at ~1.8s. Network tokens and offline auth can tighten the slow tail.' },
  },
};
function ExploreModal({ tile, onBack }) {
  const g = D[tile.grid];
  const analysis = EXPLORE_ANALYSIS[tile.grid];
  const [sortCol, setSortCol] = useState(0);
  const [sortDir, setSortDir] = useState('asc');
  const [q, setQ] = useState('');
  const [range, setRange] = useState('30d');
  const [filters, setFilters] = useState({}); // { [colIndex]: string[] } — one facet per column
  const colLabel = (ci) => { const c = g.columns[ci]; return typeof c === 'string' ? c : c.label; };
  const distinctFor = (ci) => [...new Set(g.rows.map(r => r[ci]))];
  // Only offer categorical-ish columns as filters (a handful of distinct values).
  const filterableCols = g.columns.map((_, ci) => ci).filter(ci => { const d = distinctFor(ci); return d.length >= 2 && d.length <= 12; });
  const activeCols = Object.keys(filters).map(Number);
  const availableCols = filterableCols.filter(ci => !(ci in filters));
  const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : n; };
  const rows = useMemo(() => {
    let r = g.rows.filter(row => (!q || row.join(' ').toLowerCase().includes(q.toLowerCase()))
      && Object.entries(filters).every(([ci, vals]) => vals.length === 0 || vals.includes(row[ci])));
    r = [...r].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol], an = num(av), bn = num(bv);
      let c = (an != null && bn != null) ? an - bn : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? c : -c;
    });
    return r;
  }, [g, sortCol, sortDir, q, filters]);
  const toggleSort = (ci) => { if (ci === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(ci); setSortDir('asc'); } };
  const setColFilter = (ci, vals) => setFilters(f => ({ ...f, [ci]: vals }));
  const removeColFilter = (ci) => setFilters(f => { const n = { ...f }; delete n[ci]; return n; });
  return (
    <FullPage title={tile.name} subtitle={`All locations · ${periodLabel(range)}`} tone="nav-analytics" onBack={onBack} backLabel="Dashboard"
      actions={<Button variant="secondary" iconLeft="download">Export</Button>}>
      <div style={{ padding: '32px 20px 20px', maxWidth: 1040, margin: '0 auto' }}>
        {analysis && (
          <Col gap={12} style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {analysis.stats.map(s => (
                <div key={s.label} style={{ ...surface, padding: '14px 16px' }} className="ns-tile">
                  <span style={{ fontSize: 12, color: T.faint, fontWeight: 500 }}>{s.label}</span>
                  <div className="ns-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', marginTop: 4 }}>{s.value}</div>
                  {s.sub && <span style={{ fontSize: 12, color: T.sub }}>{s.sub}</span>}
                </div>
              ))}
            </div>
            <Alert type={analysis.insight.type} title={analysis.insight.title} description={analysis.insight.description} />
          </Col>
        )}
        {/* Bento-style filter bar: search · data period · per-field facet chips · add-filter menu */}
        <Row style={{ marginBottom: 12, flexWrap: 'wrap' }} gap={8}>
          <SearchBar value={q} onChange={setQ} placeholder="Search…" width={260} />
          <RangeChip value={range} onChange={setRange} options={DATA_PERIODS} />
          {activeCols.map(ci => (
            <FacetChip key={ci} label={colLabel(ci)} options={distinctFor(ci)} selected={filters[ci]}
              onChange={(vals) => setColFilter(ci, vals)} onRemove={() => removeColFilter(ci)} />
          ))}
          <MenuButton variant="secondary" icon="filter" label="Add filter" align="left" condensed={false}
            items={availableCols.length ? availableCols.map(ci => ({ value: String(ci), label: colLabel(ci) })) : [{ value: '_', label: 'No more fields', disabled: true }]}
            onSelect={(v) => v !== '_' && setColFilter(Number(v), [])} />
          {activeCols.length > 0 && <Button variant="tertiary" condensed onClick={() => setFilters({})}>Clear</Button>}
          <span style={{ marginLeft: 'auto', fontSize: 13, color: T.sub }}>{rows.length} of {g.rows.length} rows</span>
        </Row>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusL, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {g.columns.map((c, ci) => {
                  const info = typeof c === 'object' ? c.info : null;
                  return (
                  <th key={ci} onClick={() => toggleSort(ci)} style={{ textAlign: ci === 0 ? 'left' : 'right', padding: '10px 14px', fontSize: 12, color: sortCol === ci ? T.ink : T.sub, fontWeight: 500, background: 'var(--b-color-background-secondary)', borderBottom: `1px solid ${T.sepFaint}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', minWidth: 0, justifyContent: ci === 0 ? 'flex-start' : 'flex-end' }}>{colLabel(ci)}{info && <InfoTip content={info} placement="top"><Ico name="info" size={16} color={T.faint} /></InfoTip>}<Ico name={sortCol === ci ? (sortDir === 'asc' ? 'chevron-up-small' : 'chevron-down-small') : 'expand-vertical'} size={16} color={sortCol === ci ? T.sub : T.faint} /></span>
                  </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="ns-row">
                  {r.map((cell, ci) => (
                    <td key={ci} style={{ textAlign: ci === 0 ? 'left' : 'right', padding: '12px 14px', borderBottom: `1px solid ${T.sepFaint}`, color: ci === 0 ? T.ink : T.sub, fontWeight: ci === 0 ? 500 : 400, fontFamily: ci === 0 ? 'inherit' : 'var(--b-font-family-secondary)', whiteSpace: 'nowrap' }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </FullPage>
  );
}

/* ============================================================= ALL STORES (full store management)
   Ported from the standalone "Store management" prototype: 74 stores across
   merchant accounts, with status/country filters, selection + bulk status
   changes, an edit side-panel, a store detail page, a payment-devices page,
   and a multi-step add-stores wizard. Rendered inside the app's FullPage shell. */
const SM_MERCHANTS = ['Uniqlo APAC'];
const SM_COUNTRIES = ['Japan', 'South Korea', 'China', 'Singapore', 'Taiwan', 'Hong Kong'];
const SM_CITY = {
  Japan: ['Tokyo', 'Osaka', 'Kyoto', 'Nagoya', 'Fukuoka', 'Yokohama'],
  'South Korea': ['Seoul', 'Busan', 'Incheon', 'Daegu'],
  China: ['Shanghai', 'Beijing', 'Shenzhen', 'Guangzhou'],
  Singapore: ['Singapore'],
  Taiwan: ['Taipei', 'Kaohsiung', 'Taichung'],
  'Hong Kong': ['Hong Kong'],
};
const SM_PROVINCES = {
  Japan: ['Kanto', 'Kansai', 'Chubu', 'Kyushu', 'Hokkaido', 'Tohoku'],
  'South Korea': ['Seoul Capital Area', 'Gyeongsang', 'Jeolla', 'Chungcheong'],
  China: ['Shanghai', 'Beijing', 'Guangdong', 'Jiangsu'],
  Taiwan: ['Taipei', 'Kaohsiung', 'Taichung'],
};
const SM_ZIP_RULES = {
  Japan: { re: /^\d{3}-?\d{4}$/, example: '150-0002', gen: (i) => (150 + (i % 800)) + '-' + String(1000 + (i % 8999)) },
  'South Korea': { re: /^\d{5}$/, example: '04533', gen: (i) => String(4000 + (i % 9000)).padStart(5, '0') },
  China: { re: /^\d{6}$/, example: '200001', gen: (i) => String(200000 + (i % 800)) },
  Singapore: { re: /^\d{6}$/, example: '238801', gen: (i) => String(238000 + (i % 800)) },
  Taiwan: { re: /^\d{3,6}$/, example: '10041', gen: (i) => String(10000 + (i % 800)) },
  'Hong Kong': { re: /^.*$/, example: '—', gen: () => '' },
};
function smBadZip(value, country) {
  const rule = SM_ZIP_RULES[country];
  const v = (value || '').trim();
  return !!rule && v.length > 0 && !rule.re.test(v);
}
function smZipError(country) {
  const rule = SM_ZIP_RULES[country];
  return rule ? 'Postal code · Doesn\u2019t match the format for ' + country + ' (' + rule.example + ') · Check and re-enter.' : '';
}
function smZipFor(country, i) {
  const rule = SM_ZIP_RULES[country];
  return rule ? rule.gen(i) : String(1000 + i);
}
const SM_STREETS = {
  Japan: ['Chuo-dori', 'Omotesando', 'Shijo-dori', 'Sakae', 'Tenjin', 'Motomachi'],
  'South Korea': ['Myeongdong-gil', 'Gangnam-daero', 'Hongik-ro', 'Seomyeon-ro'],
  China: ['Nanjing Road', 'Wangfujing', 'Huaihai Road', 'Tianhe Road'],
  Singapore: ['Orchard Road', 'Marina Boulevard', 'Bugis Street'],
  Taiwan: ['Zhongxiao E Road', 'Ximending', 'Yizhong Street'],
  'Hong Kong': ['Canton Road', "Queen's Road", 'Nathan Road'],
};
// Fleet size per store is always 0 / 3 / 5 / 10; the online/last-7-days/off split is derived.
function smBreak(t) {
  if (!t) return { termOff: 0, termWeek: 0, termOnline: 0 };
  const termOff = Math.round(t * 0.07);      // switched off / not seen
  const termWeek = Math.round(t * 0.08);     // only seen in the last 7 days
  return { termOff, termWeek, termOnline: Math.max(0, t - termOff - termWeek) };
}
const SM_DIAL = { Japan: '+81 3 5555 ', 'South Korea': '+82 2 555 ', China: '+86 21 5555 ', Singapore: '+65 6555 ', Taiwan: '+886 2 5555 ', 'Hong Kong': '+852 2555 ' };
// Realistic apparel-retail POS density per store size: flagship/large 20-40, standard 8-15, small 3-6.
function smStoreSize(i) {
  const roll = i % 10;
  if (roll === 0) return { type: 'Flagship', base: 30, varc: 8 };   // ~10%
  if (roll < 3) return { type: 'Large', base: 18, varc: 5 };        // ~20%
  if (roll < 7) return { type: 'Standard', base: 11, varc: 4 };     // ~40%
  return { type: 'Express', base: 5, varc: 2 };                     // ~30%
}
function smBuildStores() {
  const out = [];
  const names = ['Flagship', 'Outlet', 'Pop-up', 'Concept', 'Airport', 'Central', 'Station', 'Mall', 'Riverside', 'Downtown'];
  for (let i = 0; i < 289; i++) {
    const country = SM_COUNTRIES[i % SM_COUNTRIES.length];
    const cities = SM_CITY[country];
    const city = cities[i % cities.length];
    const roads = SM_STREETS[country];
    const statusRoll = i % 13;
    const status = statusRoll === 12 ? 'Closed' : (statusRoll >= 11 ? 'Inactive' : 'Active');
    const sz = smStoreSize(i);
    const terminals = status === 'Closed' ? 0 : Math.max(0, sz.base + ((i * 7) % (sz.varc * 2 + 1)) - sz.varc);
    const { termOnline, termWeek, termOff } = smBreak(terminals);
    const zip = smZipFor(country, i);
    out.push({
      id: 'st' + i, code: 'ST_' + (10420 + i * 7), name: 'Uniqlo ' + city + ' ' + names[i % names.length],
      status, country, city, street: roads[i % roads.length] + ' ' + (12 + (i * 3) % 180), zip,
      phone: (SM_DIAL[country] || '+81 3 5555 ') + (1000 + i), merchant: SM_MERCHANTS[i % SM_MERCHANTS.length],
      terminals, termOnline, termWeek, termOff,
      storeId: 'ST' + (32940 + i * 137) + 'D22322BD5PPM' + (6852 + i) + 'ZKW',
    });
  }
  return out;
}
// Uniqlo APAC flagship stores — the headline locations across Asia.
const SM_FLAGSHIP = [
  ['Ginza', 'Chuo-dori 6', '104-0061', 'Tokyo', 'Japan', '+81 3 5537 1000'],
  ['Shibuya', 'Jingumae 1', '150-0001', 'Tokyo', 'Japan', '+81 3 5537 1010'],
  ['Shinjuku', 'Shinjuku 3', '160-0022', 'Tokyo', 'Japan', '+81 3 5537 1020'],
  ['Kyoto Shijo', 'Shijo-dori 1', '600-8001', 'Kyoto', 'Japan', '+81 75 555 1030'],
  ['Osaka Umeda', 'Umeda 1', '530-0001', 'Osaka', 'Japan', '+81 6 6555 1040'],
  ['Seoul Myeongdong', 'Myeongdong-gil 1', '04533', 'Seoul', 'South Korea', '+82 2 555 1050'],
  ['Seoul Gangnam', 'Gangnam-daero 1', '06034', 'Seoul', 'South Korea', '+82 2 555 1060'],
  ['Shanghai', 'Nanjing Road 1', '200001', 'Shanghai', 'China', '+86 21 5555 1070'],
  ['Singapore Orchard', 'Orchard Road 1', '238801', 'Singapore', 'Singapore', '+65 6555 1080'],
  ['Hong Kong', "Canton Road 1", '', 'Hong Kong', 'Hong Kong', '+852 2555 1090'],
  ['Taipei', 'Zhongxiao E Road 1', '10041', 'Taipei', 'Taiwan', '+886 2 5555 1100'],
].map(function (a, i) {
  const t = [42, 34, 30, 26, 32, 30, 26, 36, 28, 24, 30][i]; const b = smBreak(t);
  return { id: 'uq' + i, code: 'Uniqlo_' + a[0].replace(/\s+/g, '_'), name: 'Uniqlo ' + a[0], status: 'Active', country: a[4], city: a[3], street: a[1], zip: a[2], phone: a[5], merchant: 'Uniqlo APAC', terminals: t, termOnline: b.termOnline, termWeek: b.termWeek, termOff: b.termOff, storeId: 'ST' + (30000 + i * 137) + 'D22322BD5PPM' + (6000 + i) + 'ZKW' };
});
const SM_STORES = SM_FLAGSHIP.concat(smBuildStores());
// Fleet totals derived from the stores so Locations, Device list and KPIs all reconcile.
const smMobileCount = (t) => Math.round((t || 0) / 4);       // ~1 mobile/SoftPOS per 4 terminals
const FLEET_TERMINALS = SM_STORES.reduce((n, s) => n + (s.terminals || 0), 0);
const FLEET_MOBILES = SM_STORES.reduce((n, s) => n + smMobileCount(s.terminals), 0);
const FLEET_DEVICES = FLEET_TERMINALS + FLEET_MOBILES;

// ---- Fleet health connectivity fleet — one device per terminal/mobile across the real estate, so Fleet health
// reconciles with Locations / Device intelligence (same total). Tile metrics are derived from it below.
const CONN_MODELS = ['S1F2', 'AMS1', 'V400m', 'e355'];
const CONN_VERS = [['1.42.1', 0.46], ['1.41.0', 0.26], ['1.40.3', 0.17], ['1.39.2', 0.11]];
const CONN_CAUSES = ['Wi-Fi drops · weak signal', 'WebSocket timeouts · high latency', 'Cellular fallback · weak signal', 'Offline windows · not boarded', 'WebSocket reconnect loop'];
const CONN_FLEET = (() => {
  let s = 1337; const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const wpick = (arr) => { let t = r(); for (const [v, w] of arr) { if ((t -= w) <= 0) return v; } return arr[0][0]; };
  const out = [];
  SM_STORES.forEach((st) => {
    const nTerm = st.terminals || 0;
    const total = nTerm + smMobileCount(nTerm); // terminals + mobiles = this store's device count
    for (let i = 0; i < total; i++) {
      const isMobile = i >= nTerm;
      const model = isMobile ? (r() < 0.5 ? 'e355' : 'SoftPOS') : CONN_MODELS[Math.floor(r() * 3)];
      const appVersion = wpick(CONN_VERS);
      const serial = String(Math.floor(1e11 + r() * 8e11));
      const terminal = `${model}-${serial}`;
      const old = appVersion === '1.40.3' || appVersion === '1.39.2';
      const roll = r() + (old ? 0.05 : 0) + (st.status === 'Inactive' ? 0.25 : 0);
      let status = 'Healthy', cause = '';
      if (roll > 0.97) { status = 'Offline'; cause = 'Offline windows · not boarded'; }
      else if (roll > 0.90) { status = 'At risk'; cause = CONN_CAUSES[Math.floor(r() * CONN_CAUSES.length)]; }
      const healthy = status === 'Healthy';
      const weakCause = /weak|signal|Cellular/i.test(cause);
      const uplink = isMobile ? 'Cellular' : 'Wi-Fi';
      // Only at-risk terminals (still trading) accrue failed payments; offline ones aren't boarded/trading, so 0.
      const failed = status === 'At risk' ? 1 + Math.floor(r() * 7) : 0;
      const wifi = healthy ? -(52 + Math.floor(r() * 16)) : weakCause ? -(80 + Math.floor(r() * 12)) : -(66 + Math.floor(r() * 8));
      const battery = r() < 0.03 ? 5 + Math.floor(r() * 14) : 42 + Math.floor(r() * 56);
      // WebSocket drops: tied to failures for at-risk; offline terminals log the drops that pushed them offline.
      const wsDrops = healthy ? Math.floor(r() * 3) : status === 'Offline' ? 10 + Math.floor(r() * 22) : Math.round(failed * (1 + r() * 0.6)) + Math.floor(r() * 5);
      out.push({
        id: 'fd:' + terminal, terminal, store: st.name, storeId: st.id, merchant: st.merchant, country: st.country, model, app: 'Payments', appVersion,
        os: old ? (appVersion === '1.39.2' ? 'Android 11' : 'Android 12') : 'Android 13',
        status, cause, uplink, failed, wsDrops, wifi, battery,
      });
    }
  });
  return out.sort((a, b) => b.failed - a.failed);
})();
// Per-store and per-merchant rollups — so every metric connects to "which store / which merchant".
function connRollup(keyFn) {
  const m = {};
  CONN_FLEET.forEach(d => {
    const k = keyFn(d); if (!k) return;
    const g = m[k] || (m[k] = { key: k, store: d.store, storeId: d.storeId, merchant: d.merchant, country: d.country, devices: 0, failed: 0, wsDrops: 0, weak: 0, offline: 0, atRisk: 0, lowBat: 0, wifiSum: 0, minWifi: 0 });
    g.devices++; g.failed += d.failed; g.wsDrops += d.wsDrops; g.wifiSum += d.wifi;
    g.minWifi = g.minWifi ? Math.min(g.minWifi, d.wifi) : d.wifi;
    if (d.wifi <= -75) g.weak++;
    if (d.status === 'Offline') g.offline++;
    if (d.status === 'At risk') g.atRisk++;
    if (d.battery < 20) g.lowBat++;
  });
  return Object.values(m).map(g => ({ ...g, avgWifi: Math.round(g.wifiSum / g.devices), attention: g.offline + g.atRisk }));
}
const CONN_STORES = connRollup(d => d.store);
const CONN_MERCHANTS = connRollup(d => d.merchant);
// Derive the Fleet-health / Device-intelligence tile metrics from the estate fleet so every number matches.
(() => {
  const f = CONN_FLEET, N = f.length || 1, c = D.connectivity;
  const failed = f.reduce((a, d) => a + d.failed, 0);
  const pct = (n) => +((n / N) * 100).toFixed(1);
  c.failedTx.count = failed;
  c.failedTx.revenueAtRiskK = Math.max(1, Math.round(failed * 42 / 1000));
  c.weakSignal = { count: f.filter(d => d.wifi <= -75).length, pct: pct(f.filter(d => d.wifi <= -75).length) };
  c.lowBattery = { count: f.filter(d => d.battery < 20).length, pct: pct(f.filter(d => d.battery < 20).length) };
  c.wsFailures = { count: f.reduce((a, d) => a + d.wsDrops, 0), pct: 1.9, trend: -0.4, dir: 'positive' };
  c.firmwareInstalls = Math.max(1, Math.round(N * 0.05));
  c.reconnects = { count: Math.round(N * 2.4), trend: 2.1, dir: 'negative' };
})();
const SM_SV = { Active: 'green', Inactive: 'orange', Closed: 'grey' };
const SM_TV = { Active: 'green', Inactive: 'grey', 'Inactive with modifications': 'orange', Closed: 'red' };
const SM_NON_POS = ['Jersey'];
const SM_PAY_METHODS = [
  { id: 'visa', name: 'Visa', countries: null },
  { id: 'mc', name: 'Mastercard', countries: null },
  { id: 'maestro', name: 'Maestro', countries: null },
  { id: 'amex', name: 'American Express', countries: null, needsInput: true },
  { id: 'ideal', name: 'iDEAL', countries: ['Netherlands'] },
  { id: 'bancontact', name: 'Bancontact', countries: ['Belgium'] },
  { id: 'cartesb', name: 'Cartes Bancaires', countries: ['France'] },
  { id: 'girocard', name: 'girocard', countries: ['Germany'] },
  { id: 'alipay', name: 'Alipay', countries: null, viaSource: true },
  { id: 'wechat', name: 'WeChat Pay', countries: null, viaSource: true },
];
function smMethodStatus(pm, country, copiedFromStore) {
  if (SM_NON_POS.indexOf(country) !== -1) return { state: 'Not available here', variant: 'grey', reason: 'Stores in ' + country + ' are created without payment methods and configured afterwards.' };
  if (pm.countries && pm.countries.indexOf(country) === -1) return { state: 'Not available here', variant: 'grey', reason: 'A domestic scheme for ' + pm.countries.join(', ') + ' — not supported in ' + country + '.' };
  if (pm.needsInput) return { state: 'Needs input', variant: 'orange', reason: 'Needs an Amex MID or Adyen M-level acquiring.' };
  return { state: 'Available', variant: 'green', reason: (pm.viaSource && copiedFromStore) ? 'Live on the source store — copied across.' : 'Configured automatically when the store is created.' };
}
const SM_DIAL_BY_COUNTRY = { Netherlands: '+31', France: '+33', Germany: '+49', 'United Kingdom': '+44', Austria: '+43', Spain: '+34', 'United States': '+1', Belgium: '+32', Italy: '+39' };
const SM_INK = 'var(--b-color-label-primary)';
const SM_DASH = '\u2013';

/* Shared little building blocks for the store-management views */
function SMSummaryCard({ label, value, dot }) {
  return (
    <div style={{ padding: '20px 24px', background: 'var(--b-color-background-secondary)', borderRadius: T.radiusL, boxSizing: 'border-box' }}>
      <Row gap={8}><span style={{ width: 10, height: 10, borderRadius: '50%', background: dot }} /><span style={{ fontSize: 13, color: T.sub }}>{label}</span></Row>
      <div style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 600, color: T.ink, marginTop: 4 }}>{value}</div>
    </div>
  );
}
/* A generic dropdown pill: trigger button + a popover list. Closes on outside click. */
function SMDropdown({ open, onToggle, border, label, width = 230, align = 'left', children, pill = true, full = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onToggle(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', width: full ? '100%' : undefined }}>
      <button type="button" className={pill ? 'b-pill' : undefined} onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${border}`, borderRadius: 8, background: T.card, fontFamily: 'inherit', fontSize: 14, fontWeight: pill ? 500 : 400, color: T.ink, padding: '0 12px', height: pill ? 36 : 40, cursor: 'pointer', whiteSpace: 'nowrap', width: full ? '100%' : undefined, boxSizing: 'border-box', textAlign: 'left' }}>
        <span style={{ flex: full ? 1 : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <Ico name="chevron-down" size={14} color={T.faint} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: pill ? 42 : 44, [align]: 0, zIndex: 30, width, maxHeight: 280, overflowY: 'auto', padding: 8, background: T.card, border: `1px solid ${T.sep}`, borderRadius: T.radiusL, boxShadow: 'var(--b-shadow-medium)', boxSizing: 'border-box' }}>
          {children}
        </div>
      )}
    </div>
  );
}
function SMCheckOption({ label, checked, onClick }) {
  return (
    <button type="button" className="b-menu-item" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: 8, border: 0, borderRadius: 8, background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: T.ink, textAlign: 'left' }}>
      <span style={{ flex: 1 }}>{label}</span>
      <Ico name="checkmark" size={14} color={checked ? SM_INK : 'transparent'} />
    </button>
  );
}
/* radio card used by bulk targets, pay-mode and amex options */
function SMRadioCard({ selected, onClick, children, dotBorder, border, bg = T.card }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', gap: 14, padding: 16, border: `2px solid ${border}`, borderRadius: T.radiusL, background: bg, cursor: 'pointer' }}>
      <span style={{ width: 18, height: 18, marginTop: 2, borderRadius: '50%', border: `2px solid ${dotBorder}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: SM_INK }} />}
      </span>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}
/* labelled text input matching the Bento field styling used across the wizard/edit panel */
function SMField({ label, value, onChange, placeholder, error, hint, style }) {
  return (
    <label style={{ display: 'block', ...style }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}</span>
      <input type="text" value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', height: 40, border: `1px solid ${error ? 'var(--b-color-background-critical-strong)' : 'var(--b-color-outline-secondary)'}`, borderRadius: T.radiusM, padding: '0 12px', fontFamily: 'inherit', fontSize: 14, background: T.card, color: T.ink, boxSizing: 'border-box' }} />
      {error && (
        <span style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6, fontSize: 13, color: 'var(--b-color-label-on-background-critical-weak)' }}>
          <Ico name="warning-circle-fill" size={14} color="var(--b-color-background-critical-strong)" style={{ marginTop: 2, flexShrink: 0 }} />{error}
        </span>
      )}
      {hint && <span style={{ display: 'block', marginTop: 6, fontSize: 12.5, color: T.faint }}>{hint}</span>}
    </label>
  );
}
/* One stepper header shared by the bulk modal and the add wizard */
function SMStepper({ steps }) {
  return (
    <Row gap={32} style={{ flexWrap: 'wrap' }}>
      {steps.map((st, i) => (
        <div key={i} onClick={st.onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: st.onClick ? 'pointer' : 'default' }}>
          {st.done
            ? <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--b-color-green-1400)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ico name="checkmark-small" size={16} color="#fff" /></span>
            : <span style={{ width: 24, height: 24, borderRadius: '50%', background: st.active ? 'var(--b-color-grey-3200)' : 'var(--b-color-background-secondary-active)', color: st.active ? '#fff' : T.faint, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 600 }}>{st.num}</span>}
          <span style={{ fontSize: 16, fontWeight: st.active ? 600 : 400, color: T.ink, whiteSpace: 'nowrap' }}>{st.label}</span>
        </div>
      ))}
    </Row>
  );
}
/* Data-grid header/row helpers (fixed-width columns, matching the prototype) */
function SMHead({ children, noTop }) {
  return <div className="b-dg-head" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: noTop ? 'none' : `1px solid ${T.sep}`, borderBottom: `1px solid ${T.sep}`, fontSize: 14, fontWeight: 600, color: T.ink, background: T.card }}>{children}</div>;
}
function SMRowEl({ children, onClick, style }) {
  return <div className="b-dg-row" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${T.sep}`, fontSize: 14, ...style }}>{children}</div>;
}

/* ============================================================= STORE SETTINGS (unified modal)
   Same anatomy as Device Studio — full-page modal · right-docked control panel · live preview —
   scoped to a single store, with an "About this store" section holding the store's identity,
   payment methods and terminals. Device settings are the real SCHEMA groups (editable + previewed). */
/* A store's mixed fleet: several terminal models + SoftPOS on iOS. Selecting a device in the
   preview dropdown decouples the settings — only the properties relevant to that device show. */
/* The store's actual fleet — a mixed set of devices the store policy applies to.
   (Prototype: a representative 5-device fleet of terminals + a SoftPOS iPhone.) */
function storeFleet(store) {
  const seed = parseInt((store.id || 'st0').slice(2), 10) || 0;
  const TERMS = [
    { model: 'S1F2', preview: 'S1F2', deviceType: 'Terminal' },
    { model: 'AMS1', preview: 'AMS1', deviceType: 'Terminal' },
    { model: 'SFO1', preview: 'SFO1', deviceType: 'Terminal' },
    { model: 'e355', preview: 'AMS1', deviceType: 'Terminal' },
  ];
  const out = TERMS.map((t, i) => ({ id: 'd' + i, name: 'Counter ' + (i + 1), serial: 'S' + (100 + ((seed * 7 + i * 31) % 900)), ...t }));
  out.push({ id: 'ios', name: 'Manager iPhone', serial: 'iOS-' + (10 + (seed % 90)), model: 'softpos-ios', preview: 'IOS1', deviceType: 'SoftPOS' });
  return out;
}
/* Store detail — default insights dashboard (before switching to Settings mode). */
function StoreInsights({ store, fleet, methods, currency, termRows, onOpenDevices, onOpenSettings, onEditStore, onOpenStudio, notify }) {
  const seed = parseInt((store.id.match(/\d+/) || ['1'])[0], 10) || 1;
  const online = store.termOnline;
  const uptime = store.terminals ? Math.round((online / store.terminals) * 100) : 0;
  const tx7 = store.terminals ? store.terminals * (200 + (seed % 120)) : 0;
  const authRate = store.terminals ? (92 + (seed % 38) / 10).toFixed(1) + '%' : '—';
  const atv = store.terminals ? '€' + (34 + (seed % 26)) + '.' + String(10 + (seed % 80)).slice(0, 2) : '—';
  const statusBar = termRows.map(([label, value, c]) => ({ label, n: value, c }));
  const data = D.volumeTrend;
  // Tabs — mirror the individual device page: Store info / Device signals / Settings & config.
  const [tab, setTab] = useState('info');
  const [sRange, setSRange] = useState('7d');
  const [sShown, setSShown] = useState(null);
  const [sCustomize, setSCustomize] = useState(false);
  const [sDrill, setSDrill] = useState(null);
  const S_RANGES = [{ value: '1h', label: 'Last 1 hour' }, { value: '24h', label: 'Last 24 hours' }, { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: '90d', label: 'Last 90 days' }];
  const sMeta = ({ '1h': { n: 12, u: 'm', s: 5 }, '24h': { n: 24, u: 'h', s: 1 }, '7d': { n: 7, u: 'd', s: 1 }, '30d': { n: 30, u: 'd', s: 1 }, '90d': { n: 30, u: 'd', s: 3 } })[sRange] || { n: 7, u: 'd', s: 1 };
  const sN = sMeta.n;
  const sLabels = Array.from({ length: sN }, (_, i) => { const back = (sN - 1 - i) * sMeta.s; if (i === sN - 1) return sMeta.u === 'd' ? 'Today' : 'Now'; if (sMeta.u === 'd' && sMeta.s === 1 && i === sN - 2) return 'Yest'; return back + sMeta.u; });
  const sRangeLabel = (S_RANGES.find(o => o.value === sRange) || S_RANGES[2]).label;
  let hz = (seed * 2654435761) & 0x7fffffff; for (const ch of sRange) hz = (hz * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  const rz = () => { hz = (hz * 1103515245 + 12345) & 0x7fffffff; return hz / 0x7fffffff; };
  const sMk = (base, amp, o = {}) => sLabels.map((_, i) => { let v = base * (1 + (o.trend || 0) * (i / Math.max(1, sN - 1))) + (rz() - 0.5) * 2 * amp; if (o.spike && rz() > 0.85) v += o.spike * rz(); if (o.min != null) v = Math.max(o.min, v); if (o.max != null) v = Math.min(o.max, v); return Math.round(v); });
  const sf = Math.max(1, store.terminals || 1);
  const sWifiShare = Math.max(20, Math.min(90, Math.round(60 + (rz() - 0.5) * 40)));
  const sWifiPct = sLabels.map(() => Math.max(0, Math.min(100, Math.round(sWifiShare + (rz() - 0.5) * 20))));
  // Store-level telemetry (sum of its devices) — same panels as the device page.
  const sPanels = [
    { title: 'Communication Events', color: 'var(--b-color-decorative-blue)', points: sMk(220 * sf, 80 * sf, { trend: 0.6 }), min: 0 },
    { title: 'Websocket connection failed', color: 'var(--b-color-decorative-red)', points: sMk(2 * sf, 1.5 * sf, { spike: 5 * sf }), min: 0 },
    { title: 'Payment Requests', color: 'var(--b-color-decorative-blue)', points: sMk(180 * sf, 45 * sf), min: 0 },
    { title: 'Websocket connection latency', unit: 'ms', color: 'var(--b-color-decorative-green)', points: sMk(230, 90, { min: 120, spike: 1200 }), min: 0 },
    { title: 'Terminal Bootup', color: '#E9A23B', points: sMk(0.4 * sf, 0.5 * sf, { spike: 3 }), min: 0 },
    { title: 'Primary connected interface', type: 'donut', wifi: sWifiShare },
    { title: 'Active interface across time', type: 'multi', unit: '%', min: 0, max: 100, series: [{ color: '#006BD7', points: sWifiPct }, { color: 'var(--b-color-decorative-orange)', points: sWifiPct.map(v => 100 - v) }] },
    { title: 'Firmware Installer', empty: true },
    { title: 'WiFi Signal Level', unit: 'dBm', color: '#3BA7A0', points: sMk(-64, 10, { min: -100, max: -20 }), min: -100, max: -20 },
    { title: 'Cellular Signal Level', unit: 'dBm', color: '#7B94B5', points: sMk(-70, 8, { min: -110, max: -40 }), min: -110, max: -40 },
    { title: 'Battery level', unit: '%', color: '#E7C34B', points: sMk(80, 9, { min: 40, max: 100, trend: -0.1 }), min: 0, max: 100 },
  ];
  const S_DEFAULT = ['Communication Events', 'Websocket connection failed', 'Websocket connection latency', 'WiFi Signal Level'];
  const allSTitles = sPanels.map(p => p.title);
  const shownSTitles = sShown == null ? S_DEFAULT.filter(t => allSTitles.includes(t)) : sShown;
  const shownSPanels = sPanels.filter(p => shownSTitles.includes(p.title));
  const cfgRows = buildSettingsRows(store);

  // Devices in this store (mixed terminals + SoftPOS), for the table below.
  const devRows = useMemo(() => makeTerminals(store.terminals, { seed, store: store.name, country: store.country, address: store.street }).map(r => ({ ...r, _type: 'Terminal' }))
    .concat(makeMobiles(Math.max(0, Math.round(store.terminals / 4)), { seed: seed + 5, store: store.name, country: store.country }).map(r => ({ ...r, _type: 'Mobile' }))), [store.id, store.terminals]);
  const openDev = (r) => onOpenStudio && onOpenStudio({ type: 'device', deviceIds: [r.id], model: r.model, name: r.model, deviceType: r._type === 'Mobile' ? 'SoftPOS' : 'Terminal', storeId: store.id });
  const devCols = [
    { key: 'model', label: 'Device model', w: 200, info: 'The hardware model of the payment device. Click to open its details.', render: r => <button type="button" onClick={() => openDev(r)} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: 'var(--b-color-label-primary)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{r.model}</button> },
    { key: 'type', label: 'Type', w: 100, sortField: '_type', info: 'Whether the device is a dedicated Terminal or a Mobile (SoftPOS) device.', render: r => <Tag label={r._type} variant={r._type === 'Mobile' ? 'blue' : 'grey'} /> },
    { key: 'ident', label: 'Identifier', w: 220, sortField: 'serial', info: 'The device serial number (Terminal) or install ID (SoftPOS) used to identify it.', render: r => <span style={{ fontFamily: 'var(--b-font-family-secondary)', fontSize: 13 }}>{r._type === 'Mobile' ? r.install : r.serial}</span> },
    { key: 'act', label: 'Last activity', w: 170, sortField: 'lastActivity', info: 'When the device last processed a transaction. The dot shows online (green), idle (orange) or offline (red).', render: r => <Row gap={8}><span style={{ width: 10, height: 10, borderRadius: '50%', background: r.dot, flexShrink: 0 }} /><span style={{ fontSize: 13, color: T.sub }}>{r.lastActivity}</span></Row> },
    { key: 'ver', label: 'Software', w: 130, sortField: 'version', info: 'The firmware version (Terminal) or SDK version (SoftPOS) currently installed.', render: r => <span style={{ fontFamily: 'var(--b-font-family-secondary)', fontSize: 13 }}>{r._type === 'Mobile' ? r.sdkVersion : r.version}</span> },
  ];
  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: T.page }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px`, display: 'flex', flexDirection: 'column', gap: T.s6 }}>
        {store.terminals === 0 && (
          <Alert type="warning" variant="tip" description="This store has no payment devices yet. Add devices to start accepting payments." />
        )}
        {/* headline summaries (Bento summary, borderless) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: T.s3 }}>
          <SdkKpi label="Payment devices" value={store.terminals} />
          <SdkKpi label="Online today" value={`${online} / ${store.terminals}`} />
          <SdkKpi label="Transactions · last 7 days" value={D.fmt(tx7)} />
          <SdkKpi label="Authorisation rate" value={authRate} />
        </div>
        <UnderlineTabs value={tab} onChange={setTab} tabs={[{ value: 'info', label: 'Store info' }, { value: 'signals', label: 'Device signals' }, { value: 'config', label: 'Settings & config' }]} />

        {tab === 'info' && (<>
        {/* Same layout as the device page: info cards in a 2-column grid, data table below. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: T.s6, alignItems: 'flex-start' }}>
          {/* left — store information + payment methods */}
          <Col gap={T.s6}>
            <Section title="Store information" actions={<Button variant="secondary" condensed iconLeft="edit-1" onClick={() => onEditStore && onEditStore()}>Edit</Button>}>
              {(() => {
                const sv = store.status === 'Active' ? 'green' : store.status === 'Inactive' ? 'orange' : 'grey';
                const dotC = sv === 'grey' ? '#9AA4AE' : `var(--b-color-decorative-${sv})`;
                const fact = (k, v, mono) => (
                  <Row key={k} style={{ justifyContent: 'space-between', gap: 16, padding: '9px 0', borderBottom: `1px solid ${T.sepFaint}` }}>
                    <span style={{ fontSize: 13, color: T.sub, flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.ink, textAlign: 'right', fontFamily: mono ? 'var(--b-font-family-secondary)' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
                  </Row>
                );
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '0 32px' }}>
                    {fact('Status', <Row gap={6} style={{ justifyContent: 'flex-end' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: dotC, flexShrink: 0 }} /><span>{store.status}</span></Row>)}
                    {fact('Merchant', store.merchant)}
                    {fact('Store reference', store.code, true)}
                    {fact('Store ID', store.storeId, true)}
                    {fact('Address', store.street)}
                    {fact('City', store.city)}
                    {fact('Zip code', store.zip, true)}
                    {fact('Country/Region', store.country)}
                  </div>
                );
              })()}
            </Section>
            <Section title="Payment methods">
              <Col gap={12}>
                <Row gap={8}><span style={{ fontSize: 13, color: T.sub }}>Currency</span><Tag label={currency} variant="grey" /><span style={{ marginLeft: 'auto', fontSize: 13, color: T.sub }}>Avg. ticket <b className="ns-num" style={{ color: T.ink }}>{atv}</b></span></Row>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {methods.map(m => <span key={m} style={{ display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 10px', border: `1px solid ${T.sep}`, borderRadius: T.radiusM, fontSize: 12, fontWeight: 500 }}>{m}</span>)}
                </div>
              </Col>
            </Section>
          </Col>
          {/* right — device status */}
          <Section title="Device status">
            <Col gap={14}>
              <Row gap={12} align="baseline">
                <span className="ns-num" style={{ fontSize: 26, fontWeight: 600 }}>{uptime}%</span>
                <span style={{ fontSize: 13, color: T.sub }}>online now</span>
              </Row>
              <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', background: T.page }}>
                {statusBar.map(x => x.n > 0 && <div key={x.label} title={`${x.label} ${x.n}`} style={{ width: `${(x.n / Math.max(1, store.terminals)) * 100}%`, background: x.c }} />)}
              </div>
              <Row gap={16} style={{ flexWrap: 'wrap' }}>
                {statusBar.map(x => (
                  <Row key={x.label} gap={6}><span style={{ width: 8, height: 8, borderRadius: 2, background: x.c }} /><span style={{ fontSize: 12, color: T.sub }}>{x.label} <b className="ns-num" style={{ color: T.ink }}>{x.n}</b></span></Row>
                ))}
              </Row>
            </Col>
          </Section>
        </div>

        {/* devices — data table */}
        <Col gap={12}>
          <Row style={{ minHeight: 28 }}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', flex: 1 }}>Devices</span>
          </Row>
          {devRows.length > 0
            ? <DeviceGrid columns={devCols} rows={devRows} notify={notify} bordered />
            : <EmptyState icon="terminal-2" title="No devices" description="This location has no payment devices yet." />}
        </Col>
        </>)}

        {tab === 'signals' && (<>
          <Section title="Device signals" style={{ border: 'none', background: 'transparent' }} headerBorder={false} padded={false}
            description={`Telemetry across ${store.terminals} device${store.terminals === 1 ? '' : 's'} · ${shownSTitles.length} of ${allSTitles.length} signals · ${sRangeLabel}`}
            actions={<Row gap={8} align="center">
              <div style={{ width: 160 }}><Dropdown value={sRange} onChange={setSRange} options={S_RANGES} /></div>
              <Button variant="secondary" iconLeft="settings" onClick={() => setSCustomize(true)}>Customize ({shownSTitles.length}/{allSTitles.length})</Button>
            </Row>}>
            {shownSPanels.length === 0
              ? <EmptyState icon="nav-analytics" title="No graphs selected" description="Use “Customize” to choose which signals to show." />
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: T.s5 }}>
                  {shownSPanels.map(p => {
                    const clickable = !p.empty && p.type !== 'donut';
                    return (
                    <div key={p.title} className="ns-tile" style={{ ...surface, overflow: 'hidden', cursor: clickable ? 'pointer' : 'default' }} onClick={clickable ? () => setSDrill(p) : undefined}>
                      <TileHeader title={p.title} subtitle={p.empty ? 'No results' : p.type === 'donut' ? 'Share of uplink' : (p.unit ? `Over time · ${p.unit}` : 'Over time')} right={clickable ? <Ico name="arrow-right" size={16} color={T.faint} /> : null} />
                      <div style={{ padding: `0 ${T.s3}px ${T.s4}px`, height: 180, display: (p.empty || p.type === 'donut') ? 'flex' : 'block', alignItems: 'center', justifyContent: 'center' }}>
                        {p.empty
                          ? <span style={{ fontSize: 13, color: T.faint }}>No results found</span>
                          : p.type === 'donut'
                            ? (() => { const dR = 15.5, dC = 2 * Math.PI * dR, wlen = dC * (p.wifi / 100); return (
                                <Row gap={18} align="center">
                                  <svg width={108} height={108} viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                                    <circle cx="22" cy="22" r={dR} fill="none" stroke="var(--b-color-decorative-orange)" strokeWidth="8" />
                                    <circle cx="22" cy="22" r={dR} fill="none" stroke="#006BD7" strokeWidth="8" strokeDasharray={`${wlen} ${dC - wlen}`} />
                                  </svg>
                                  <Col gap={8}>
                                    <Row gap={8}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#006BD7' }} /><span style={{ fontSize: 13 }}>Wi-Fi <b className="ns-num">{p.wifi}%</b></span></Row>
                                    <Row gap={8}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--b-color-decorative-orange)' }} /><span style={{ fontSize: 13 }}>Cellular <b className="ns-num">{100 - p.wifi}%</b></span></Row>
                                  </Col>
                                </Row>
                              ); })()
                            : <LineChart data={{ labels: sLabels, min: p.min, max: p.max, unit: p.unit, series: p.series || [{ color: p.color, points: p.points }] }} height={160} />}
                      </div>
                    </div>
                  ); })}
                </div>}
          </Section>
          {sCustomize && (
            <Modal open onClose={() => setSCustomize(false)} title="Customize device signals" width={460}
              description="Choose which telemetry graphs to show for this store."
              footer={<Row gap={8} style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <Button variant="tertiary" condensed onClick={() => setSShown(S_DEFAULT.filter(t => allSTitles.includes(t)))}>Reset to default</Button>
                <Button variant="primary" onClick={() => setSCustomize(false)}>Done</Button>
              </Row>}>
              {(() => {
                const allOn = shownSTitles.length === allSTitles.length;
                const some = shownSTitles.length > 0 && !allOn;
                const tog = (t) => setSShown(prev => { const base = prev == null ? shownSTitles : prev; return base.includes(t) ? base.filter(x => x !== t) : [...base, t]; });
                const box = (on, dash) => <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${on ? 'var(--b-color-label-primary)' : '#8C959D'}`, background: on ? 'var(--b-color-label-primary)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{dash ? <span style={{ width: 8, height: 2, background: '#fff', borderRadius: 1 }} /> : on ? <Ico name="checkmark-small" size={12} color="#fff" /> : null}</span>;
                return (
                  <Col gap={0}>
                    <label className="b-menu-item" onClick={() => setSShown(allOn ? [] : allSTitles)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', cursor: 'pointer', fontSize: 14, borderBottom: `1px solid ${T.sepFaint}` }}>{box(allOn || some, some)}<span style={{ flex: 1, fontWeight: 600 }}>Select all</span></label>
                    {allSTitles.map(t => (
                      <label key={t} className="b-menu-item" onClick={() => tog(t)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', cursor: 'pointer', fontSize: 14 }}>{box(shownSTitles.includes(t))}<span style={{ flex: 1 }}>{t}</span></label>
                    ))}
                  </Col>
                );
              })()}
            </Modal>
          )}
          {sDrill && (
            <Modal open onClose={() => setSDrill(null)} title={sDrill.title} width={760}
              description={`Over time · ${sRangeLabel}${sDrill.unit ? ' · ' + sDrill.unit : ''}`}>
              <div style={{ height: 320 }}>
                <LineChart data={{ labels: sLabels, min: sDrill.min, max: sDrill.max, unit: sDrill.unit, series: sDrill.series || [{ color: sDrill.color, points: sDrill.points }] }} height={300} />
              </div>
              {sDrill.points && (
                <Row gap={28} style={{ marginTop: 16, flexWrap: 'wrap', borderTop: `1px solid ${T.sepFaint}`, paddingTop: 16 }}>
                  {(() => { const pts = sDrill.points; const avg = Math.round(pts.reduce((a, b) => a + b, 0) / pts.length); const stat = (k, v) => <Col key={k} gap={2}><span style={{ fontSize: 12, color: T.sub }}>{k}</span><span className="ns-num" style={{ fontSize: 18, fontWeight: 600 }}>{D.fmt(v)}{sDrill.unit ? ' ' + sDrill.unit : ''}</span></Col>; return [stat('Average', avg), stat('Min', Math.min(...pts)), stat('Max', Math.max(...pts)), stat('Latest', pts[pts.length - 1])]; })()}
                </Row>
              )}
            </Modal>
          )}
        </>)}

        {tab === 'config' && (
          <Section title="Settings & config" description={`Resolved settings for this store · ${cfgRows.length} settings`}
            actions={<Button variant="secondary" condensed iconLeft="settings" onClick={() => onOpenStudio && onOpenStudio({ type: 'store', storeId: store.id, name: store.name, deviceType: 'Terminal' })}>Configure in Studio</Button>}>
            <div style={{ background: T.card, border: `1px solid ${T.sep}`, borderRadius: T.radiusM, overflow: 'auto', maxHeight: 560 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead><tr>{['Setting', 'Value', 'Config level', 'Last changed by', 'Category'].map((c, i) => <th key={i} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.sep}`, whiteSpace: 'nowrap', background: T.card, position: 'sticky', top: 0 }}>{c}</th>)}</tr></thead>
                <tbody>
                  {cfgRows.map((r, ri) => { const override = r.level === store.code; return (
                    <tr key={ri} className="ns-row">
                      <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'var(--b-font-family-secondary)', fontWeight: 500, borderBottom: `1px solid ${T.sepFaint}` }}>{r.setting}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: T.sub, fontFamily: 'var(--b-font-family-secondary)', borderBottom: `1px solid ${T.sepFaint}`, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.value || '–'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: `1px solid ${T.sepFaint}`, color: override ? 'var(--b-color-decorative-orange)' : T.ink }}>{r.level}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: T.sub, borderBottom: `1px solid ${T.sepFaint}` }}>{r.user} · {r.date}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: T.sub, borderBottom: `1px solid ${T.sepFaint}` }}>{r.category}</td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

/* Flatten SCHEMA into a per-setting audit list (Setting · value · config level · changed by · category). */
function buildSettingsRows(store) {
  const defs = SCHEMA.defaults();
  const users = ['accounttool-test-vs@Psp.AdyenPspService', 'nicclap@Psp.AdyenPspService', 'sanden@Psp.AdyenPspService', 'maarams@Psp.AdyenPspService', 'jorde@Psp.AdyenPspService'];
  const dates = ['Mar 8, 2021, 21:31', 'May 6, 2026, 10:55', 'Aug 7, 2024, 10:50', 'Dec 12, 2016, 11:41', 'Apr 17, 2020, 09:14'];
  const rows = [];
  SCHEMA.groups.forEach((g, gi) => g.fields.forEach((f, fi) => {
    const v = (defs[g.id] || {})[f.id];
    const k = gi * 7 + fi * 3;
    rows.push({
      setting: `${g.id}.${f.id}`,
      value: Array.isArray(v) ? v.join(', ') : (v === true ? 'true' : v === false ? 'false' : String(v == null ? '' : v)),
      level: k % 3 === 0 ? store.code : 'AdyenPspService',
      user: users[k % users.length], date: dates[k % dates.length],
      category: g.title,
    });
  }));
  return rows;
}

/* "View all settings" — full-screen audit table (matches Adyen's All terminal settings). */
function AllSettingsModal({ store, onBack, notify }) {
  const [q, setQ] = useState('');
  const rows = useMemo(() => buildSettingsRows(store), [store]);
  const filtered = rows.filter(r => !q || (r.setting + ' ' + r.value + ' ' + r.category).toLowerCase().includes(q.toLowerCase()));
  return (
    <FullPage title={store.name} subtitle={`${store.city}, ${store.country} · All terminal settings`} tone="store" onBack={onBack} backLabel="" backIcon={<ArrowLeftGlyph />} onClose={onBack} bodyBg={T.page}
      actions={<>
        <Button variant="secondary" iconLeft="eye" onClick={() => notify && notify('Showing decrypted settings…')}>View decrypted settings</Button>
        <Button variant="primary" iconLeft="plus" onClick={() => notify && notify('Add setting…')}>Add setting</Button>
      </>}>
      <div style={{ maxWidth: T.maxW, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px` }}>
        <Row style={{ marginBottom: 16 }} gap={8}>
          <SearchBar value={q} onChange={setQ} placeholder="Search setting or value" width={280} />
          <span style={{ marginLeft: 'auto', fontSize: 13, color: T.sub }}>{filtered.length} settings</span>
        </Row>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusM, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead><tr>{['Setting', 'Setting value', 'Config level', 'Last changed by', 'Category'].map((c, i) => <th key={i} style={dtTh()}>{c}</th>)}</tr></thead>
            <tbody>
              {filtered.map((r, ri) => { const last = ri === filtered.length - 1; return (
                <tr key={ri} className="ns-row">
                  <td style={{ ...dtTd(last), fontFamily: 'var(--b-font-family-secondary)', fontWeight: 500 }}>{r.setting}</td>
                  <td style={{ ...dtTd(last), color: T.sub, fontFamily: 'var(--b-font-family-secondary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.value || '–'}</td>
                  <td style={dtTd(last)}><a href="#" onClick={(e) => e.preventDefault()} style={{ color: r.level === store.code ? 'var(--b-color-decorative-orange)' : 'var(--b-color-decorative-red)', textDecoration: 'none', fontFamily: 'var(--b-font-family-secondary)' }}>{r.level}</a></td>
                  <td style={{ ...dtTd(last), color: T.sub }}>{r.user} · {r.date}</td>
                  <td style={{ ...dtTd(last), color: T.sub }}>{r.category}</td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </div>
    </FullPage>
  );
}

function StoreSettingsModal({ storeId, onBack, onOpenDevices, onEditStore, onOpenStudio, notify }) {
  const store = SM_STORES.find(x => x.id === storeId);
  const [vals, setVals] = useState(() => SCHEMA.defaults());
  const [initial] = useState(() => JSON.parse(JSON.stringify(SCHEMA.defaults())));
  const [openGroups, setOpenGroups] = useState(() => new Set(['__about', 'homeScreen', 'gratuities']));
  const [screen, setScreen] = useState('transaction');
  const [txAmountVar, setTxAmountVar] = useState(true);
  const [tip, setTip] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true); // control-panel collapse (matches Device Studio)
  const [panelW, startResize] = useResizer(440, 320, 680); // drag-resizable control panel
  const [mode, setMode] = useState('insights'); // 'insights' (default) → 'settings'
  const [studioOpen, setStudioOpen] = useState(false); // Device configuration → Device Studio overlay
  const [settingsListOpen, setSettingsListOpen] = useState(false); // View all settings → audit table
  const [chatMode, setChatMode] = useState('agent'); // default to Ask; toggle to Edit for manual settings
  const [selModel, setSelModel] = useState('S1F2'); // which device type to preview in the canvas
  const [infoOpen, setInfoOpen] = useState(false);  // store-info (view mode) modal
  const [messages, setMessages] = useState([{ role: 'assistant', text: "Describe the change you want and I'll configure this store's devices." }]);
  const [draft, setDraft] = useState('');

  const setField = (gid, fid, v) => setVals(prev => ({ ...prev, [gid]: { ...prev[gid], [fid]: v } }));
  const toggleGroup = (gid) => setOpenGroups(s => { const n = new Set(s); n.has(gid) ? n.delete(gid) : n.add(gid); return n; });

  // Natural-language → settings (same rules as Device Studio).
  const applyFromText = (text) => {
    const t = text.toLowerCase(); const changes = []; let pv = null;
    const put = (gid, fid, v, desc, p) => { setField(gid, fid, v); changes.push(desc); if (p) pv = p; };
    if (/\bdark\b/.test(t)) put('homeScreen', 'theme', 'Dark', 'set the home screen theme to Dark', 'home');
    else if (/\blight\b/.test(t)) put('homeScreen', 'theme', 'Light', 'set the home screen theme to Light', 'home');
    else if (/\bbrand\b/.test(t)) put('homeScreen', 'theme', 'Brand', 'set the home screen theme to Brand', 'home');
    if (/(enable|turn on|add|switch on).*(tip|gratuit)|tipping on/.test(t)) {
      put('gratuities', 'enabled', true, 'enabled tipping', 'tipping');
      const nums = (t.match(/\d+/g) || []).map(Number).filter(n => n > 0 && n <= 100);
      if (nums.length) put('gratuities', 'presets', nums.slice(0, 4), `set tip presets to ${nums.slice(0, 4).join(', ')}%`, 'tipping');
    }
    if (/(disable|turn off|remove).*(tip|gratuit)|no tip/.test(t)) put('gratuities', 'enabled', false, 'disabled tipping', 'tipping');
    if (/dcc|currency conversion/.test(t)) {
      if (/off|disable|no /.test(t)) put('dcc', 'enabled', false, 'disabled DCC', 'transaction');
      else { put('dcc', 'enabled', true, 'enabled DCC', 'transaction'); const m = t.match(/(\d+(?:\.\d+)?)\s*%/); if (m) put('dcc', 'markup', Number(m[1]), `set DCC markup to ${m[1]}%`, 'transaction'); }
    }
    if (/contactless/.test(t)) put('payment', 'contactless', !/off|disable/.test(t), (/off|disable/.test(t) ? 'disabled' : 'enabled') + ' contactless', 'transaction');
    if (/surcharg/.test(t)) put('payment', 'surcharge', !/off|disable|remove|no /.test(t), (/off|disable|remove|no /.test(t) ? 'removed' : 'enabled') + ' surcharging', 'transaction');
    if (/german|deutsch/.test(t)) put('localization', 'language', 'German', 'set the language to German', 'home');
    else if (/french|français|francais/.test(t)) put('localization', 'language', 'French', 'set the language to French', 'home');
    else if (/japanese|日本/.test(t)) put('localization', 'language', 'Japanese', 'set the language to Japanese', 'home');
    else if (/spanish|español|espanol/.test(t)) put('localization', 'language', 'Spanish', 'set the language to Spanish', 'home');
    if (/(hide|remove).*(logo)/.test(t)) put('homeScreen', 'showLogo', false, 'hid the store logo', 'home');
    else if (/(show|add).*(logo)/.test(t)) put('homeScreen', 'showLogo', true, 'showed the store logo', 'home');
    const gm = text.match(/greeting[^"“]*["“]([^"”]+)["”]/i); if (gm) put('homeScreen', 'greeting', gm[1].trim(), `set the greeting to “${gm[1].trim()}”`, 'home');
    const hm = text.match(/header[^"“]*["“]([^"”]+)["”]/i); if (hm) put('receiptPrinting', 'header', hm[1].trim(), `set the receipt header to “${hm[1].trim()}”`, 'receipt');
    if (pv) setScreen(pv);
    return changes;
  };
  const sendChat = (text) => {
    const qq = (text != null ? text : draft).trim(); if (!qq) return;
    const changes = applyFromText(qq);
    const reply = changes.length
      ? `Done — I ${changes.join(', ')}. The preview and the change list are updated; review and apply when ready.`
      : "I couldn't map that to a setting yet. Try mentioning theme, tipping, DCC, contactless, language, logo, greeting, or receipt header.";
    setMessages(m => [...m, { role: 'user', text: qq }, { role: 'assistant', text: reply }]);
    setDraft('');
  };

  const diff = useMemo(() => {
    const out = [];
    SCHEMA.groups.forEach(g => g.fields.forEach(f => {
      const a = initial[g.id][f.id], b = vals[g.id][f.id];
      if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ group: g.title, label: f.label, from: Array.isArray(a) ? a.join(', ') : String(a), to: Array.isArray(b) ? b.join(', ') : String(b) });
    }));
    return out;
  }, [vals, initial]);

  if (!store) return null;

  // ---- About facts ----
  const CUR = { Netherlands: 'EUR', France: 'EUR', Germany: 'EUR', Belgium: 'EUR', 'United Kingdom': 'GBP', Jersey: 'GBP' };
  const base = ['Visa', 'Mastercard', 'Maestro', 'Apple Pay', 'Google Pay'];
  const domestic = { Netherlands: ['iDEAL'], Belgium: ['Bancontact'], France: ['Cartes Bancaires'], Germany: ['girocard'] };
  const methods = base.concat(domestic[store.country] || []);
  const currency = CUR[store.country] || 'EUR';
  const otp = (948416 + (parseInt(store.id.slice(2), 10) * 7)) + ' \u2014 18s left';
  const termRows = [
    ['Online today', store.termOnline, 'var(--b-color-decorative-green)'],
    ['Online last 7 days', store.termWeek, 'var(--b-color-decorative-orange)'],
    ['Switched off', store.termOff, 'var(--b-color-decorative-red)'],
  ];
  const affected = store.terminals;
  const tipValue = tip == null ? 0 : tip === 'custom' ? 5 : 100 * tip / 100;

  const fleet = storeFleet(store);
  // Distinct device types in the store (handles many types — surfaced via a dropdown, not a wall of devices).
  const deviceTypes = fleet.reduce((acc, dv) => {
    const ex = acc.find(x => x.model === dv.model);
    if (ex) ex.count++;
    else acc.push({ model: dv.model, preview: dv.preview, deviceType: dv.deviceType, count: 1, label: dv.model === 'softpos-ios' ? 'SoftPOS · iOS' : dv.model });
    return acc;
  }, []);
  const selDev = deviceTypes.find(dv => dv.model === selModel) || deviceTypes[0];
  const previewDevice = selDev.preview, deviceType = selDev.deviceType;

  return (
    <>
    <FullPage title={store.name} subtitle={`${store.city}, ${store.country}`} tone="store"
      badge={mode === 'settings'
        ? <InfoTip width={300} content={<span>You're editing <b>store settings</b> — the policy that applies to <b>every device</b> in this location: receipts, payments, tax, language and branding. Device‑only settings (connectivity, hardware, passcodes) are managed on each device.</span>}><Ico name="info" size={16} color={T.ink} /></InfoTip>
        : HealthDot(store.termOff > 0 ? 'red' : store.termWeek > 0 ? 'yellow' : 'green')}
      onBack={onBack} backLabel="" backIcon={<ArrowLeftGlyph />} onClose={onBack}
      actions={mode === 'settings'
        ? <>
            <Button variant="secondary" onClick={() => setMode('insights')}>Cancel</Button>
            <Button variant="primary" iconLeft="checkmark" disabled={diff.length === 0} onClick={() => setReviewOpen(true)}>Review{diff.length ? ` (${diff.length})` : ''}</Button>
          </>
        : null}>
      {mode === 'insights' ? (
        <StoreInsights store={store} fleet={fleet} methods={methods} currency={currency} termRows={termRows} notify={notify}
          onOpenDevices={onOpenDevices} onOpenSettings={() => setMode('settings')} onEditStore={onEditStore}
          onOpenStudio={(scope) => (onOpenStudio ? onOpenStudio(scope) : setStudioOpen(true))} />
      ) : (
      <div style={{ display: 'flex', flexDirection: 'row', height: '100%', minHeight: 0 }}>
        {/* collapsed rail */}
        {!panelOpen && (
          <div style={{ width: 48, flexShrink: 0, borderRight: `1px solid ${T.sep}`, background: T.card, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
            <GlyphButton title="Show control panel" onClick={() => setPanelOpen(true)}><PanelToggleIcon /></GlyphButton>
          </div>
        )}

        {/* control panel (docked left, drag-resizable) — nav folded in as section accordions, AI composer at bottom */}
        {panelOpen && (
          <div style={{ width: panelW, flexShrink: 0, borderRight: `1px solid ${T.sep}`, background: T.card, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Row style={{ padding: '8px 12px 8px 20px', borderBottom: `1px solid ${T.sepFaint}`, gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Store settings</span>
              <ModeSwitch mode={chatMode} setMode={setChatMode} />
              <GlyphButton title="Hide control panel" onClick={() => setPanelOpen(false)}><PanelToggleIcon flip /></GlyphButton>
            </Row>
            {chatMode === 'agent' ? (
              <DockedAsk expanded messages={messages} draft={draft} setDraft={setDraft} onSend={sendChat} notify={notify}
                onNewSession={() => { setMessages([{ role: 'assistant', text: "Describe the change you want and I'll configure this store's devices." }]); setDraft(''); notify && notify('Started a new session'); }} />
            ) : (<>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px' }}>
              {/* Device-related settings only — store identity lives on the overview page. */}
              {SCHEMA.groups.filter(g => !g.market && g.level !== 'device').map(g => (
                <Accordion key={g.id} open={openGroups.has(g.id)} onToggle={() => toggleGroup(g.id)}
                  title={g.title} desc={g.desc}>
                  <Col gap={16}>
                    {g.fields.filter(f => isVisible(f, vals[g.id])).map(f => (
                      <div key={f.id} onFocus={() => g.preview && setScreen(g.preview)} onClickCapture={() => g.preview && setScreen(g.preview)}>
                        <SettingRow field={f} val={vals[g.id][f.id]} onChange={(fid, v) => setField(g.id, fid, v)} />
                      </div>
                    ))}
                  </Col>
                </Accordion>
              ))}
            </div>
            </>)}
          </div>
        )}

        {panelOpen && <ResizeHandle onMouseDown={startResize} />}
        {/* canvas — screen-flow tab bar on top, device centered, device/state dropdowns on the right */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', background: T.page }}>
          <FlowTabs value={screen} onChange={setScreen} options={PAGE_TYPES} />
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'stretch', gap: 32, padding: '28px 32px 36px' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Simulator vals={vals} screen={screen} deviceId={previewDevice} txAmount={txAmountVar} deviceType={deviceType}
                tx={{ base: 100, tip, tipValue, total: 100 + tipValue, setTip }} />
            </div>
            <Col gap={16} style={{ width: 240, flexShrink: 0, alignSelf: 'flex-start' }}>
              <Col gap={6}><span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>Device model ({fleet.length} in store)</span>
                <Dropdown value={selModel} onChange={setSelModel} options={deviceTypes.map(dt => ({ value: dt.model, label: dt.count != null ? `${dt.label} · ${dt.count}` : dt.label }))} />
              </Col>
              {screen === 'transaction' && (
                <Col gap={6}><span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>Transaction state</span>
                  <Dropdown value={txAmountVar ? 'amt' : 'noamt'} onChange={(v) => setTxAmountVar(v === 'amt')} options={[{ value: 'amt', label: 'Amount entered' }, { value: 'noamt', label: 'Awaiting card' }]} />
                </Col>
              )}
            </Col>
          </div>
        </div>
      </div>
      )}

      {/* review & apply */}
      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Review changes" width={560}
        description={`${store.name} · ${affected} terminal${affected === 1 ? '' : 's'}`}
        footer={<Row gap={8} style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setReviewOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => { setReviewOpen(false); notify && notify(`Applied ${diff.length} change(s) to ${store.name}`); onBack(); }}>Apply to {affected} terminal{affected === 1 ? '' : 's'}</Button>
        </Row>}>
        <Col gap={12}>
          <Alert type="warning" variant="tip" description={`This updates the ${affected} terminal${affected === 1 ? '' : 's'} in ${store.name}. Unsupported settings are skipped per device capability. Every change is audit-logged.`} />
          <div style={{ ...surface, overflow: 'hidden' }}>
            {diff.map((dd, i) => (
              <Row key={i} style={{ padding: '12px 14px', borderBottom: i < diff.length - 1 ? `1px solid ${T.sepFaint}` : 'none' }} gap={12} align="center">
                <Col gap={2} style={{ flex: 1, minWidth: 0 }}><span style={{ fontSize: 13, fontWeight: 500 }}>{dd.label}</span><span style={{ fontSize: 11, color: T.faint }}>{dd.group}</span></Col>
                <Row gap={8} align="center" style={{ flexShrink: 0 }}>
                  {dd.from && dd.from !== '—' ? <Tag label={String(dd.from)} variant="grey" /> : <span style={{ fontSize: 13, color: T.faint }}>—</span>}
                  <Ico name="arrow-right" size={16} color={T.faint} />
                  <Tag label={String(dd.to)} variant="blue" />
                </Row>
              </Row>
            ))}
          </div>
        </Col>
      </Modal>

      {/* store information — view mode, with an Edit CTA that switches to edit */}
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Store information" width={520}
        description={`${store.city}, ${store.country}`}
        footer={<Row gap={8} style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setInfoOpen(false)}>Close</Button>
          <Button variant="primary" iconLeft="edit-1" onClick={() => { setInfoOpen(false); onEditStore && onEditStore(); }}>Edit store</Button>
        </Row>}>
        <Col gap={20}>
          <StructuredList items={[
            { label: 'Store reference', value: store.code, copy: true },
            { label: 'Store ID', value: store.storeId, copy: true },
            { label: 'Address', value: store.street },
            { label: 'Zip code', value: store.zip },
            { label: 'City', value: store.city },
            { label: 'Country/Region', value: store.country },
            { label: 'One-time password', value: otp, copy: true },
          ]} />
          <div style={{ height: 1, background: T.sepFaint }} />
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.sub }}>Payment methods & currencies</span>
            <div style={{ marginTop: 8 }}><StructuredList items={[{ label: 'Currency', value: <Tag label={currency} variant="grey" /> }]} /></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {methods.map(m => <span key={m} style={{ display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 10px', border: `1px solid ${T.sep}`, borderRadius: T.radiusM, fontSize: 12, fontWeight: 500 }}>{m}</span>)}
            </div>
          </div>
          <div style={{ height: 1, background: T.sepFaint }} />
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.sub }}>Terminals</span>
            <div style={{ marginTop: 8 }}>
              <StructuredList items={[
                { label: 'Total terminals', value: store.terminals > 0
                  ? <a href="#" onClick={(e) => { e.preventDefault(); setInfoOpen(false); onOpenDevices && onOpenDevices(store.id); }} style={{ color: T.ink, textDecoration: 'underline', textUnderlineOffset: 2, fontFamily: 'var(--b-font-family-secondary)', fontWeight: 500 }}>{store.terminals}</a>
                  : <span style={{ fontFamily: 'var(--b-font-family-secondary)', color: T.faint }}>0</span> },
                ...termRows.map(([label, value, dot]) => ({ label, value: <Row gap={6}><span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} /><span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--b-font-family-secondary)' }}>{value}</span></Row> })),
              ]} />
            </div>
          </div>
        </Col>
      </Modal>
    </FullPage>
    {studioOpen && <DeviceStudio scope={{ type: 'store', storeId: store.id, name: store.name, deviceType: 'Terminal' }} onBack={() => setStudioOpen(false)} notify={notify} />}
    {settingsListOpen && <AllSettingsModal store={store} onBack={() => setSettingsListOpen(false)} notify={notify} />}
    </>
  );
}

function AllStoresModal({ onBack, onOpenStore, inline, notify, initialStore, onOpenStudio }) {
  const [S, setRaw] = useState({
    query: '', statusFilter: {}, country: 'All countries', page: 1, pageSize: 20,
    selected: {}, menuRow: null, menuTop: 0, menuLeft: 0, statusMenuOpen: false,
    countryMenuOpen: false, storeMenuOpen: false, dd: null, pendingStores: [],
    efStatusMenuOpen: false, pageStore: initialStore || null, devicesStore: null,
    // true once a store is opened FROM the list; false when we deep-linked straight to a store.
    storeFromList: false,
    bulkOpen: false, bulkStep: 0, bulkTarget: null, ack: false, typed: '', outcome: null,
    editId: null, editVals: {}, addOpen: false, addStep: 0, addMode: 'Single store', addDone: false,
    payMode: 'copy', payOff: {}, amexRoute: null, amexMidValue: '', newCountry: 'Netherlands',
    newMerchant: null, sourceStore: null, details: {},
    addDevOpen: false, addDevStore: null, addDevModel: 'S1F2', addDevQty: '1',
  });
  // Force a re-render after we mutate a store object in place (bulk / edit apply).
  const [, forceTick] = useState(0);
  const forceUpdate = () => forceTick(t => t + 1);
  const setState = useCallback((patch) => setRaw(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) })), []);
  const s = S;

  // Resizable data-grid columns (drag the right edge of a header cell).
  const [colW, setColW] = useState({ code: 220, status: 120, devices: 90, devstatus: 170, address: 280, merchant: 190 });
  const startResize = (key) => (e) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startW = colW[key];
    const move = (ev) => setColW(w => ({ ...w, [key]: Math.max(70, startW + (ev.clientX - startX)) }));
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.body.style.cursor = ''; };
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  };
  const HCell = ({ k, children }) => (
    <div style={{ width: colW[k], flexShrink: 0, position: 'relative', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {children}
      <span onMouseDown={startResize(k)} className="b-col-resize" style={{ position: 'absolute', top: -12, right: -6, width: 12, height: 'calc(100% + 24px)', cursor: 'col-resize', zIndex: 3 }} />
    </div>
  );
  const gridMin = 32 + 44 + Object.values(colW).reduce((a, b) => a + b, 0) + 12 * 7 + 32;

  const q = (s.query || '').trim().toLowerCase();
  const activeStatuses = Object.keys(s.statusFilter).filter(k => s.statusFilter[k]);
  const filtered = SM_STORES.filter(st => {
    if (activeStatuses.length && activeStatuses.indexOf(st.status) === -1) return false;
    if (s.country !== 'All countries' && st.country !== s.country) return false;
    if (q) { const hay = (st.code + ' ' + st.name + ' ' + st.street + ' ' + st.city).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / s.pageSize));
  const page = Math.min(s.page, totalPages);
  const start = (page - 1) * s.pageSize;
  const pageStores = filtered.slice(start, start + s.pageSize);
  const sel = SM_STORES.filter(st => s.selected[st.id]);
  const selCount = sel.length;
  const termDot = (n) => n > 0 ? 'var(--b-color-decorative-green)' : 'var(--b-color-decorative-grey)';
  const counts = {
    Active: SM_STORES.filter(x => x.status === 'Active').length,
    Inactive: SM_STORES.filter(x => x.status === 'Inactive').length,
    Closed: SM_STORES.filter(x => x.status === 'Closed').length,
  };
  const hasFilters = !!(s.query || s.country !== 'All countries' || activeStatuses.length);
  const clearFilters = () => setState({ query: '', country: 'All countries', statusFilter: {}, page: 1 });
  const allOnPageSelected = pageStores.length > 0 && pageStores.every(st => s.selected[st.id]);
  const toggleAllOnPage = () => {
    const all = pageStores.every(st => s.selected[st.id]);
    const next = Object.assign({}, s.selected);
    pageStores.forEach(st => { if (all) delete next[st.id]; else next[st.id] = true; });
    setState({ selected: next });
  };

  // ---- valid bulk targets ----
  const validTargets = (stores) => {
    const actionable = stores.filter(st => st.status !== 'Closed');
    if (!actionable.length) return [];
    const out = [];
    if (actionable.some(st => st.status === 'Active')) out.push('Inactive');
    out.push('Closed');
    return out;
  };
  const targets = validTargets(sel);
  const target = s.bulkTarget && targets.indexOf(s.bulkTarget) !== -1 ? s.bulkTarget : null;
  const eligible = sel.filter(st => st.status !== 'Closed');
  const skipped = sel.filter(st => st.status === 'Closed');
  const withTerminals = eligible.filter(st => st.terminals > 0);
  const isClose = target === 'Closed';
  const needsTyped = isClose && eligible.length > 1;
  const typedOk = !needsTyped || String(s.typed).trim() === String(eligible.length);

  // ---- edit validity ----
  const PHONE_OK = /^\+?[\d\s()-]{7,}$/;
  const editStore = SM_STORES.find(x => x.id === s.editId);
  const ev = s.editVals || {};
  const editPhone = editStore ? (ev.phone !== undefined ? ev.phone : editStore.phone) : '';
  const editPhoneBad = editPhone.trim().length > 0 && !PHONE_OK.test(editPhone.trim());
  const editZip = editStore ? (ev.zip !== undefined ? ev.zip : editStore.zip) : '';
  const editZipBad = editStore ? smBadZip(editZip, editStore.country) : false;
  const editInvalid = editPhoneBad || editZipBad;
  const editDirty = !!editStore && ['name', 'code', 'street', 'zip', 'city', 'phone', 'status', 'addr2', 'addr3', 'dial'].some(k => ev[k] !== undefined && ev[k] !== editStore[k]);

  // ---- add wizard derived ----
  const single = s.addMode === 'Single store';
  const addLabels = single
    ? ['Merchant account and region', 'Payment methods', 'Store details', 'Review and create']
    : ['Upload CSV', 'Payment methods', 'Review and create'];
  const addStep = Math.min(s.addStep, addLabels.length - 1);
  const d = s.details || {};
  const zip = d.zip !== undefined ? d.zip : '';
  const zipBad = smBadZip(zip, s.newCountry);
  const noProvince = s.newCountry === 'Jersey' || s.newCountry === 'Netherlands';
  const detailsInvalid = zipBad;
  const payOn = (id) => !(s.payOff || {})[id];
  const methodAvailable = (pm) => smMethodStatus(pm, s.newCountry, s.payMode === 'copy').state !== 'Not available here';
  const amexDef = SM_PAY_METHODS.find(p => p.id === 'amex');
  const amexOn = payOn('amex') && methodAvailable(amexDef);
  const selectedMethodCount = SM_PAY_METHODS.filter(p => methodAvailable(p) && payOn(p.id)).length;
  const amexMid = s.amexRoute === 'mid';
  const midLen = (s.amexMidValue || '').replace(/\D/g, '').length;
  const amexLevelKnown = amexMid && midLen >= 8;
  const cLevel = midLen % 2 === 0;
  const newMerchant = s.newMerchant || SM_MERCHANTS[0];
  const sourceStore = s.sourceStore || (SM_STORES[0].name + ' \u00b7 ' + SM_STORES[0].city + ', ' + SM_STORES[0].country);

  // ---- navigation state ----
  const isListPage = !s.pageStore && !s.devicesStore;
  const isStorePage = !!s.pageStore && !s.devicesStore;
  const isDevicesPage = !!s.devicesStore;

  const openStorePage = (id) => setState({ pageStore: id, menuRow: null, storeFromList: true });
  const backToList = () => setState({ pageStore: null });
  // Back from a store: return to the list if we came from it, else to the previous page.
  const storeBack = () => (s.storeFromList ? backToList() : onBack());
  const openDevices = (id) => setState({ devicesStore: id || s.pageStore });
  const backToStorePage = () => setState({ devicesStore: null });

  const editValsFor = (st) => st ? { name: st.name, code: st.code, street: st.street, zip: st.zip, city: st.city, phone: st.phone } : {};
  const openEdit = (id) => { const st = SM_STORES.find(x => x.id === id); setState({ editId: id, menuRow: null, storeMenuOpen: false, editVals: editValsFor(st) }); };
  const closeEdit = () => setState({ editId: null });
  const saveEdit = () => {
    if (!editDirty || editInvalid) return;
    if (editStore) ['name', 'code', 'street', 'zip', 'city', 'phone', 'addr2', 'addr3', 'dial', 'status'].forEach(k => { if (ev[k] !== undefined) editStore[k] = ev[k]; });
    setState({ editId: null }); forceUpdate();
  };
  const efSetter = (k) => (e) => setState({ editVals: Object.assign({}, s.editVals, { [k]: e.target.value }) });

  // ---- bulk actions ----
  const openBulk = () => setState({ bulkOpen: true, bulkStep: 0, bulkTarget: null, ack: false, typed: '' });
  const openBulkForRow = (id) => setState({ selected: { [id]: true }, menuRow: null, bulkOpen: true, bulkStep: 0, bulkTarget: null, ack: false, typed: '' });
  const closeBulk = () => setState(p => ({ bulkOpen: false, selected: p.bulkStep === 3 ? {} : p.selected }));
  const bulkNext = () => {
    if (s.bulkStep < 2) { setState({ bulkStep: s.bulkStep + 1 }); return; }
    const outcome = { verb: isClose ? 'Closed' : 'Deactivated', succeeded: eligible.length, skipped: skipped.length };
    eligible.forEach(st => { st.status = target; if (target === 'Closed') st.terminals = 0; });
    setState({ bulkStep: 3, outcome }); forceUpdate();
  };

  // ---- add wizard actions ----
  const openAdd = () => setState({ addOpen: true, addStep: 0, addDone: false });
  const closeAdd = () => setState({ addOpen: false });
  const addNextDisabled = single && detailsInvalid && (addStep === 2 || addStep === 3);
  const addNext = () => {
    if (addNextDisabled) return;
    if (addStep < addLabels.length - 1) setState({ addStep: addStep + 1 });
    else setState({ addDone: true });
  };
  const addPendingDisabled = detailsInvalid || !(d.name || d.ref);
  const addPendingStore = () => {
    if (addPendingDisabled) return;
    const entry = { name: d.ref || d.name, address: [d.street, d.zip, d.city].filter(Boolean).join(' '), meta: [s.newCountry, d.phone].filter(Boolean).join('  ') };
    setState({ pendingStores: (s.pendingStores || []).concat([entry]), details: Object.assign({}, s.details, { name: '', ref: '', street: '', zip: '', city: '', phone: '' }) });
  };

  // Escape closes the topmost overlay (else the whole modal).
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key !== 'Escape') return;
      if (s.addOpen) return closeAdd();
      if (s.bulkOpen) return closeBulk();
      if (s.editId) return closeEdit();
      if (s.menuRow) return setState({ menuRow: null });
      if (s.devicesStore) return backToStorePage();
      if (s.pageStore) return storeBack();
      if (!inline) onBack(); // inline is a normal page — Escape shouldn't navigate away
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  });

  // FullPage chrome is context-aware: back returns to the previous view.
  const pageTitle = isDevicesPage ? 'Payment devices' : isStorePage ? 'Store settings' : 'Locations';
  const pageBack = isDevicesPage ? backToStorePage : isStorePage ? storeBack : onBack;
  const pageBackLabel = isDevicesPage ? 'Store' : isStorePage ? 'All stores' : 'Dashboard';

  const showActionBar = selCount > 0 && isListPage;

  const inner = (
    <>

      {/* ====================== LIST VIEW ====================== */}
      {isListPage && (
        <div style={{ maxWidth: T.maxW, margin: '0 auto', padding: `${T.s7}px ${T.s7}px 120px` }}>
          <Row align="flex-start" style={{ marginBottom: T.s5, gap: 24 }}>
            <Col gap={4} style={{ flex: 1 }}>
              <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Locations</span>
              <span style={{ fontSize: 13, color: T.sub }}>Create, edit and close the locations across your merchant accounts.</span>
            </Col>
            <Row gap={8} style={{ flexShrink: 0 }}>
              <Button variant="secondary" iconLeft="download">Export</Button>
              <Button variant="primary" iconLeft="plus" onClick={openAdd}>Add location</Button>
            </Row>
          </Row>

          {/* summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
            <SMSummaryCard label="All locations" value={SM_STORES.length} dot="var(--b-color-decorative-grey)" />
            <SMSummaryCard label="Active" value={counts.Active} dot="var(--b-color-decorative-green)" />
            <SMSummaryCard label="Inactive" value={counts.Inactive} dot="var(--b-color-decorative-orange)" />
            <SMSummaryCard label="Closed" value={counts.Closed} dot="var(--b-color-decorative-grey)" />
          </div>

          {/* filters */}
          <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 20 }}>
            <SearchBar value={s.query} onChange={(v) => setState({ query: v, page: 1 })} placeholder="Search code, name or address" width={260} />
            <SMDropdown open={s.statusMenuOpen} onToggle={() => setState({ statusMenuOpen: !s.statusMenuOpen, countryMenuOpen: false })}
              border={activeStatuses.length ? SM_INK : 'var(--b-color-outline-secondary)'} label={'Store status' + (activeStatuses.length ? ' · ' + activeStatuses.length : '')}>
              {['Active', 'Inactive', 'Closed'].map(k => (
                <label key={k} className="b-menu-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
                  <Checkbox checked={!!s.statusFilter[k]} onChange={() => setState({ statusFilter: Object.assign({}, s.statusFilter, { [k]: !s.statusFilter[k] }), page: 1 })} />
                  <span style={{ flex: 1 }}>{k}</span>
                  <span style={{ fontFamily: 'var(--b-font-family-secondary)', fontSize: 13, color: T.faint }}>{counts[k]}</span>
                </label>
              ))}
            </SMDropdown>
            <SMDropdown open={s.countryMenuOpen} onToggle={() => setState({ countryMenuOpen: !s.countryMenuOpen, statusMenuOpen: false })}
              border={s.country !== 'All countries' ? SM_INK : 'var(--b-color-outline-secondary)'} label={s.country === 'All countries' ? 'Country/Region' : 'Country/Region · ' + s.country}>
              {['All countries'].concat(SM_COUNTRIES).map(c => (
                <SMCheckOption key={c} label={c} checked={s.country === c} onClick={() => setState({ country: c, page: 1, countryMenuOpen: false })} />
              ))}
            </SMDropdown>
            {hasFilters && <button onClick={clearFilters} style={{ border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: '#0F75DC', padding: '0 4px' }}>Clear filters</button>}
          </Row>

          {/* grid */}
          <div style={{ background: T.card, overflow: 'auto' }}>
            <div style={{ minWidth: gridMin }}>
              <SMHead>
                <div style={{ width: 32, flexShrink: 0 }}><Checkbox checked={allOnPageSelected} onChange={toggleAllOnPage} /></div>
                <HCell k="code">Store</HCell>
                <HCell k="status">Store status</HCell>
                <HCell k="devices">Devices</HCell>
                <HCell k="devstatus">Device status</HCell>
                <HCell k="address">Address</HCell>
                <HCell k="merchant">Merchant account</HCell>
                <div style={{ width: 44, flexShrink: 0, position: 'sticky', right: 0, background: 'transparent', zIndex: 2 }} />
              </SMHead>
              {pageStores.map(st => (
                <SMRowEl key={st.id}>
                  <div style={{ width: 32, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}><Checkbox checked={!!s.selected[st.id]} onChange={() => setState({ selected: Object.assign({}, s.selected, { [st.id]: !s.selected[st.id] }) })} /></div>
                  <div style={{ width: colW.code, flexShrink: 0, overflow: 'hidden' }}><a href="#" onClick={(e) => { e.preventDefault(); openStorePage(st.id); }} style={{ fontFamily: 'inherit', fontSize: 13, color: T.ink, textDecoration: 'underline', textUnderlineOffset: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{st.name}</a></div>
                  <div style={{ width: colW.status, flexShrink: 0 }}><Tag label={st.status} variant={SM_TV[st.status] || 'grey'} /></div>
                  <div style={{ width: colW.devices, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>{st.terminals > 0 ? <button type="button" onClick={() => openDevices(st.id)} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--b-font-family-secondary)', fontSize: 13, color: 'var(--b-color-link-primary)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{st.terminals}</button> : <span style={{ fontFamily: 'var(--b-font-family-secondary)', fontSize: 13, color: T.faint }}>0</span>}</div>
                  <div style={{ width: colW.devstatus, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
                    {[['var(--b-color-decorative-green)', st.termOnline, 'Online today'], ['var(--b-color-decorative-orange)', st.termWeek, 'Online last 7 days'], ['var(--b-color-decorative-red)', st.termOff, 'Switched off']].map(([c, n, tt], i) => (
                      <span key={i} title={tt} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: c }} /><span style={{ fontFamily: 'var(--b-font-family-secondary)', fontSize: 13 }}>{n}</span></span>
                    ))}
                  </div>
                  <div style={{ width: colW.address, flexShrink: 0, fontSize: 13, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.street + ', ' + st.zip + ' ' + st.city + ', ' + st.country}</div>
                  <div style={{ width: colW.merchant, flexShrink: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.merchant}</div>
                  <div style={{ width: 44, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', position: 'sticky', right: 0, background: 'transparent', zIndex: 1 }}>
                    {st.status !== 'Closed' && (
                      <IconButton icon="options-vertical" variant="secondary" condensed title="More actions" onClick={(e) => {
                        e.stopPropagation();
                        if (s.menuRow === st.id) { setState({ menuRow: null }); return; }
                        const r = e.currentTarget.getBoundingClientRect();
                        const H = 84, GAP = 6;
                        const openUp = r.bottom + GAP + H > window.innerHeight && r.top - GAP - H > 0;
                        setState({ menuRow: st.id, menuTop: Math.round(openUp ? r.top - GAP - H : r.bottom + GAP), menuLeft: Math.round(Math.max(8, Math.min(r.right - 190, window.innerWidth - 198))) });
                      }} />
                    )}
                  </div>
                </SMRowEl>
              ))}

              {filtered.length === 0 && (
                <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No stores match your filters</div>
                  <div style={{ fontSize: 14, color: T.sub, marginBottom: 16 }}>Try a different search term, status or country.</div>
                  <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>
                </div>
              )}

            </div>
          </div>
          {/* pager — sticky to the bottom of the page (full width, not part of the horizontal scroll) */}
          <Row gap={16} style={{ position: 'sticky', bottom: 0, zIndex: 3, background: T.card, borderTop: `1px solid ${T.sep}`, padding: '12px 16px', fontSize: 14, color: T.ink }}>
            <select value={s.pageSize} onChange={(e) => setState({ pageSize: parseInt(e.target.value, 10), page: 1 })}
              style={{ height: 32, border: '1px solid var(--b-color-outline-secondary)', borderRadius: T.radiusM, background: T.card, fontFamily: 'inherit', fontSize: 14, color: T.ink, padding: '0 8px', cursor: 'pointer' }}>
              <option>20</option><option>50</option><option>100</option>
            </select>
            <span style={{ color: T.sub }}>of {filtered.length} items</span>
            <Row gap={10} style={{ marginLeft: 'auto' }}>
              <span style={{ color: T.sub }}>Page</span>
              <span style={{ fontFamily: 'var(--b-font-family-secondary)', minWidth: 52, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--b-color-outline-secondary)', borderRadius: T.radiusM }}>{page}</span>
              <span style={{ color: T.sub }}>of {totalPages}</span>
              <Row gap={4} style={{ marginLeft: 6 }}>
                {[['skip-left', () => setState({ page: 1 }), 'First page'], ['chevron-left', () => setState({ page: Math.max(1, page - 1) }), 'Previous page'], ['chevron-right', () => setState({ page: Math.min(totalPages, page + 1) }), 'Next page'], ['skip-right', () => setState({ page: totalPages }), 'Last page']].map(([ic, fn, lbl]) => (
                  <button key={lbl} className="b-pager-nav" aria-label={lbl} onClick={fn} style={{ width: 28, height: 28, border: 0, background: 'none', color: T.sub, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, borderRadius: T.radiusM }}><Ico name={ic} size={16} /></button>
                ))}
              </Row>
            </Row>
          </Row>
        </div>
      )}

      {/* ====================== STORE SETTINGS (unified full-page modal) ====================== */}
      {s.pageStore && <StoreSettingsModal storeId={s.pageStore} onBack={storeBack}
        onOpenDevices={(id) => setState({ devicesStore: id || s.pageStore })}
        onEditStore={() => openEdit(s.pageStore)} onOpenStudio={onOpenStudio} notify={notify} />}

      {/* ====================== PAYMENT DEVICES (full-page modal, over settings) ====================== */}
      {s.devicesStore && (
        <FullPage title="Payment devices" subtitle={(() => { const d = SM_STORES.find(x => x.id === s.devicesStore); return d ? `${d.name} · ${d.city}, ${d.country}` : undefined; })()} tone="terminal-1"
          onBack={backToStorePage} backLabel="" backIcon={<ArrowLeftGlyph />} onClose={() => setState({ pageStore: null, devicesStore: null })}>
          <SMDevicesPage store={SM_STORES.find(x => x.id === s.devicesStore)} onBack={backToStorePage} />
        </FullPage>
      )}

      {/* ====================== ACTION BAR ====================== */}
      {showActionBar && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 450, maxWidth: 'calc(100vw - 48px)' }}>
          <Row gap={16} style={{ height: 56, padding: '0 24px', borderRadius: 28, background: 'var(--b-color-background-inverse-primary)', color: 'var(--b-color-label-inverse-primary)', boxShadow: 'var(--b-shadow-high)', width: 550 }}>
            <button aria-label="Close" onClick={() => setState({ selected: {} })} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, padding: 0, border: 0, borderRadius: T.radiusM, background: 'none', color: 'inherit', cursor: 'pointer', flexShrink: 0 }}><Ico name="cross" size={16} color="currentColor" /></button>
            <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>{selCount} selected</span>
            <Row gap={8} style={{ marginLeft: 'auto' }}>
              {[['download', 'Export', () => {}], ['refresh', 'Change status', openBulk]].map(([ic, lbl, fn]) => (
                <button key={lbl} onClick={fn} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px', border: '1px solid rgba(255,255,255,0.32)', borderRadius: T.radiusM, background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}><Ico name={ic} size={16} color="currentColor" />{lbl}</button>
              ))}
            </Row>
          </Row>
        </div>
      )}

      {/* ====================== ROW ACTIONS MENU ====================== */}
      {s.menuRow && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000 }}>
          <div onClick={() => setState({ menuRow: null })} style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', top: s.menuTop, left: s.menuLeft, width: 190, padding: 4, background: T.card, border: `1px solid ${T.sep}`, borderRadius: T.radiusL, boxShadow: 'var(--b-shadow-medium)' }}>
            <button className="b-menu-item" onClick={() => openEdit(s.menuRow)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: 8, border: 0, borderRadius: 8, background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: T.ink, textAlign: 'left' }}><Ico name="edit-1" size={16} color={T.sub} />Edit store</button>
            <button className="b-menu-item" onClick={() => openBulkForRow(s.menuRow)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: 8, border: 0, borderRadius: 8, background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: T.ink, textAlign: 'left' }}><Ico name="refresh" size={16} color={T.sub} />Change status</button>
          </div>
        </div>
      )}

      {/* ====================== BULK STATUS MODAL ====================== */}
      {s.bulkOpen && <SMBulkModal {...{ s, setState, closeBulk, bulkNext, targets, target, eligible, skipped, withTerminals, isClose, needsTyped, typedOk, selCount, termDot }} />}

      {/* ====================== EDIT STORE MODAL ====================== */}
      {s.editId && editStore && <SMEditPanel {...{ s, setState, editStore, ev, editZip, editZipBad, editPhone, editPhoneBad, editDirty, editInvalid, closeEdit, saveEdit, efSetter }} />}

      {/* ====================== ADD STORES WIZARD ====================== */}
      {s.addOpen && <SMAddWizard {...{ s, setState, single, addLabels, addStep, d, zipBad, noProvince, detailsInvalid, payOn, methodAvailable, amexOn, amexMid, amexLevelKnown, cLevel, selectedMethodCount, newMerchant, sourceStore, closeAdd, addNext, addNextDisabled, addPendingStore, addPendingDisabled }} />}

      {/* ====================== ADD DEVICES (assign to a store) ====================== */}
      {s.addDevOpen && (() => {
        const st = SM_STORES.find(x => x.id === s.addDevStore);
        const qty = Math.max(0, parseInt(s.addDevQty, 10) || 0);
        return (
          <Modal open onClose={() => setState({ addDevOpen: false })} title="Add devices" width={460}
            description="Assign new payment devices to a store. Every device belongs to exactly one store."
            footer={<Row gap={8} style={{ justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setState({ addDevOpen: false })}>Cancel</Button>
              <Button variant="primary" disabled={qty < 1 || !st} onClick={() => {
                if (st) { st.terminals += qty; st.termOnline += qty; }
                setState({ addDevOpen: false }); forceUpdate();
                notify && notify(`Added ${qty} ${s.addDevModel} to ${st ? st.name : 'store'}`);
              }}>Add {qty > 0 ? qty + ' ' : ''}device{qty === 1 ? '' : 's'}</Button>
            </Row>}>
            <Col gap={16}>
              <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Assign to store</span>
                <Dropdown value={s.addDevStore} onChange={(v) => setState({ addDevStore: v })} options={SM_STORES.map(x => ({ value: x.id, label: `${x.name} · ${x.city}, ${x.country}` }))} />
              </Col>
              <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Device model</span>
                <Dropdown value={s.addDevModel} onChange={(v) => setState({ addDevModel: v })} options={['S1F2', 'AMS1', 'V400m', 'e355', 'S1E2', 'SFO1'].map(m => ({ value: m, label: m }))} />
              </Col>
              <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Quantity</span>
                <InputField value={s.addDevQty} onChange={(e) => setState({ addDevQty: (e.target ? e.target.value : e).replace(/[^0-9]/g, '') })} placeholder="1" />
              </Col>
              {st && <div style={{ padding: '10px 12px', background: 'var(--b-color-background-secondary)', borderRadius: T.radiusM, fontSize: 13, color: T.sub }}><Ico name="info" size={16} color={T.ink} style={{ verticalAlign: 'middle', marginRight: 6 }} />{st.name} currently has {st.terminals} device{st.terminals === 1 ? '' : 's'}.</div>}
            </Col>
          </Modal>
        );
      })()}
    </>
  );

  // Rendered inline as a normal shell page (same layout as Fleet Intelligence),
  // or as a full-page overlay when opened as a modal.
  if (inline) return inner;
  return (
    <FullPage title={pageTitle} subtitle={isListPage ? `${SM_STORES.length} locations across your merchant accounts` : undefined} tone="store" onBack={pageBack} backLabel={pageBackLabel} onClose={onBack} bodyBg={T.card}>
      {inner}
    </FullPage>
  );
}

/* ---------------- store management: store detail page ---------------- */
function SMStorePage({ store, storeMenuOpen, onToggleMenu, onCloseMenu, onEdit, onBackToList, onOpenDevices }) {
  const menuRef = useRef(null);
  useEffect(() => {
    if (!storeMenuOpen) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onCloseMenu(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [storeMenuOpen]);
  if (!store) return null;
  const CUR = { Netherlands: 'EUR', France: 'EUR', Germany: 'EUR', Belgium: 'EUR', 'United Kingdom': 'GBP', Jersey: 'GBP' };
  const base = ['Visa', 'Mastercard', 'Maestro', 'Apple Pay', 'Google Pay'];
  const domestic = { Netherlands: ['iDEAL'], Belgium: ['Bancontact'], France: ['Cartes Bancaires'], Germany: ['girocard'] };
  const methods = base.concat(domestic[store.country] || []);
  const currency = CUR[store.country] || 'EUR';
  const otp = (948416 + (parseInt(store.id.slice(2), 10) * 7)) + ' \u2014 18 seconds remaining';
  const termRows = [
    ['Online today', store.termOnline, 'var(--b-color-decorative-green)'],
    ['Online last 7 days', store.termWeek, 'var(--b-color-decorative-orange)'],
    ['Switched off', store.termOff, 'var(--b-color-decorative-red)'],
  ];
  const settingsGroups = [
    { title: 'Device', items: ['Location & language', 'Device name', 'Sound', 'Theme', 'Home screen', 'Kiosk mode', 'Maintenance', 'Passcodes', 'Logos', 'Background'] },
    { title: 'Device connectivity', items: ['Wi-Fi profiles', 'Beacons', 'USB', 'Base station'] },
    { title: 'Payment features', items: ['Card application selection', 'Tipping', 'Transaction limits', 'Manual Key Entry (MKE)', 'Refunds', 'Offline processing'] },
  ];
  const detailRow = (label, node) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px,200px) 1fr', alignItems: 'flex-start', gap: 16, padding: '6px 0' }}>
      <div style={{ fontSize: 14, color: T.sub }}>{label}</div>
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, flexWrap: 'wrap' }}>{node}</div>
    </div>
  );
  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', padding: '32px 24px 24px' }}>
      <Row gap={10} style={{ flexWrap: 'wrap', marginBottom: 20 }}>
        <Ico name="globe" size={16} color={T.sub} />
        <a href="#" onClick={(e) => { e.preventDefault(); onBackToList(); }} style={{ fontSize: 12, color: T.ink }}>AdyenTechSupport</a>
        <Ico name="chevron-right" size={14} color={T.faint} />
        <Ico name="bank" size={16} color={T.sub} />
        <a href="#" onClick={(e) => { e.preventDefault(); onBackToList(); }} style={{ fontSize: 12, color: T.ink }}>{store.merchant}</a>
        <Ico name="chevron-right" size={14} color={T.faint} />
        <Ico name="store" size={16} color={T.sub} />
        <span style={{ fontSize: 12, fontWeight: 500 }}>{store.name}</span>
        <Tag label="Config version: 1734" variant="grey" />
      </Row>

      <Row style={{ justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em' }}>Settings</h1>
        <Row gap={8} style={{ flexShrink: 0 }}>
          <Button variant="secondary" iconRight="external-link">View all settings</Button>
          <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <IconButton icon="options-vertical" variant="secondary" title="Store actions" onClick={onToggleMenu} />
            {storeMenuOpen && (
              <div style={{ position: 'absolute', top: 48, right: 0, zIndex: 41, minWidth: 216, background: T.card, border: `1px solid ${T.sep}`, borderRadius: T.radiusL, boxShadow: 'var(--b-shadow-medium)', padding: '6px 0' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); onCloseMenu(); }} className="b-nav-item" style={{ display: 'block', padding: '10px 20px', fontSize: 14, color: T.ink, textDecoration: 'none', whiteSpace: 'nowrap' }}>View payment methods</a>
                <div style={{ height: 1, background: T.sep, margin: '6px 0' }} />
                <a href="#" onClick={(e) => { e.preventDefault(); onEdit(); }} className="b-nav-item" style={{ display: 'block', padding: '10px 20px', fontSize: 14, color: T.ink, textDecoration: 'none', whiteSpace: 'nowrap' }}>Edit store</a>
                <a href="#" onClick={(e) => { e.preventDefault(); onCloseMenu(); }} className="b-nav-item" style={{ display: 'block', padding: '10px 20px', fontSize: 14, color: T.ink, textDecoration: 'none', whiteSpace: 'nowrap' }}>Change store ownership</a>
              </div>
            )}
          </div>
        </Row>
      </Row>

      <div style={{ display: 'flex', gap: 64, alignItems: 'stretch' }}>
        {/* settings nav */}
        <aside style={{ width: 200, flexShrink: 0 }}>
          <div style={{ padding: '10px 12px', borderRadius: T.radiusM, background: 'var(--b-color-background-secondary-active)', fontSize: 14, marginBottom: 16 }}>About this store</div>
          <div style={{ height: 1, background: T.sep, marginBottom: 16 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px', border: '1px solid var(--b-color-outline-secondary)', borderRadius: T.radiusM, background: T.card, marginBottom: 20 }}>
            <Ico name="search" size={16} color={T.faint} />
            <input type="text" placeholder="Search" style={{ border: 0, outline: 'none', background: 'none', fontFamily: 'inherit', fontSize: 14, width: '100%', color: T.ink }} />
          </label>
          {settingsGroups.map(g => (
            <div key={g.title} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.faint, padding: '0 12px', marginBottom: 8 }}>{g.title}</div>
              {g.items.map(it => <a key={it} href="#" onClick={(e) => e.preventDefault()} className="b-nav-item" style={{ display: 'block', padding: '8px 12px', borderRadius: T.radiusM, fontSize: 14, color: T.ink, textDecoration: 'none' }}>{it}</a>)}
            </div>
          ))}
        </aside>

        {/* detail */}
        <div style={{ flex: 1, minWidth: 0, maxWidth: 760, paddingBottom: 40 }}>
          <Row gap={20} style={{ marginBottom: 24 }}>
            <span style={{ width: 56, height: 56, flexShrink: 0, border: `1px solid ${T.sep}`, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Ico name="store" size={24} color={T.ink} /></span>
            <div style={{ minWidth: 0, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{store.name}</div>
          </Row>

          <h2 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>Details</h2>
          <div style={{ marginBottom: 24 }}>
            {detailRow('Store reference', <><span style={{ fontFamily: 'var(--b-font-family-secondary)' }}>{store.code}</span><IconButton icon="copy" variant="tertiary" condensed title="Copy" /></>)}
            {detailRow('Store ID', <><span style={{ fontFamily: 'var(--b-font-family-secondary)', wordBreak: 'break-all', minWidth: 0 }}>{store.storeId}</span><IconButton icon="copy" variant="tertiary" condensed title="Copy" /></>)}
            {detailRow('Address', <span>{store.street}</span>)}
            {detailRow('Zip code', <span style={{ fontFamily: 'var(--b-font-family-secondary)' }}>{store.zip}</span>)}
            {detailRow('City', <span>{store.city}</span>)}
            {detailRow('Country/Region', <span>{store.country}</span>)}
            {detailRow('One-time password', <><span style={{ fontFamily: 'var(--b-font-family-secondary)' }}>{otp}</span><IconButton icon="copy" variant="tertiary" condensed title="Copy" /></>)}
          </div>

          <h2 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>Payment methods and currencies</h2>
          <div style={{ marginBottom: 24 }}>
            {detailRow('Currencies', <Tag label={currency} variant="grey" />)}
            {detailRow('Payment methods', (
              <div style={{ minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {methods.map(m => <span key={m} style={{ display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 10px', border: `1px solid ${T.sep}`, borderRadius: T.radiusM, background: T.card, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>{m}</span>)}
              </div>
            ))}
          </div>

          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>
            Terminal status
            <a href="#" onClick={(e) => { e.preventDefault(); onOpenDevices(); }} aria-label="View payment devices" style={{ display: 'inline-flex', color: '#0F75DC' }}><Ico name="external-link" size={16} color="#0F75DC" /></a>
          </h2>
          <div>
            {detailRow('Total terminals', <span style={{ fontFamily: 'var(--b-font-family-secondary)' }}>{store.terminals}</span>)}
            {termRows.map(([label, value, dot]) => detailRow(label, <><span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: dot }} /><span style={{ fontFamily: 'var(--b-font-family-secondary)' }}>{value}</span></>))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- store management: payment devices page ---------------- */
/* ---------------- Device Explorer (Terminals + Mobile devices tabs) ----------------
   Full data grid with checkbox selection, horizontal scroll, sticky checkbox/actions,
   and an inline pager. Shared by the store Payment-devices page and Fleet > All devices. */
const DEV_TERM_MODELS = ['AMS1', 'S1F2', 'V400m', 'e355', 'S1E2', 'SFO1', 'NYC1'];
const DEV_MOBILE_MODELS = ['iPhone13,2', 'iPhone14,2', 'iPhone15,4', 'SM-A536B', 'SM-F766B', 'SM-S731B', 'PPG-AN00'];
const DEV_ASSIGN = [{ label: 'Boarded', variant: 'green' }, { label: 'Inventory', variant: 'grey' }, { label: 'Deployed', variant: 'blue' }, { label: 'Reassigning', variant: 'orange' }, { label: 'Assigned', variant: 'orange' }];
const DEV_COUNTRIES = ['Japan', 'South Korea', 'China', 'Singapore', 'Taiwan', 'Hong Kong', 'Thailand', 'Malaysia'];
const DEV_DATES = ['Oct 18, 2025, 09:07', 'May 7, 2026, 15:17', 'Aug 4, 2026, 02:01', 'Jul 25, 2024, 06:07', 'Nov 25, 2025, 19:19', 'Aug 13, 2026, 07:31', 'Apr 1, 2025, 12:59', 'Feb 9, 2024, 23:45', 'Mar 17, 2026, 00:12', '—'];
const DEV_DOTS = ['var(--b-color-decorative-green)', 'var(--b-color-decorative-orange)', 'var(--b-color-decorative-red)'];
const SDK_STATUS = { Supported: 'green', Expiring: 'orange', Expired: 'red' };
const DEV_INTEGRATION = ['Standalone', 'SDK', 'Cloud'];
function makeTerminals(count, opts) {
  const o = opts || {}; const rows = [];
  for (let i = 0; i < count; i++) {
    const s = ((o.seed || 1) * 13 + i * 7);
    const a = DEV_ASSIGN[s % DEV_ASSIGN.length];
    const loc = o.stores ? o.stores[i % o.stores.length] : null;
    rows.push({
      id: 't' + (o.seed || 0) + '_' + i, model: DEV_TERM_MODELS[s % DEV_TERM_MODELS.length],
      serial: '000168' + (2208 + (s % 90)) + (100000 + (s * 137) % 900000),
      dot: DEV_DOTS[s % 3], lastActivity: DEV_DATES[s % DEV_DATES.length],
      assign: a.label, assignV: a.variant,
      store: loc ? loc.name : (o.store || ('Store_' + (1000 + (s % 8999)))), storeId: loc ? loc.id : null,
      merchant: loc ? loc.merchant : (o.merchant || 'Uniqlo APAC'),
      country: loc ? loc.country : (o.country || DEV_COUNTRIES[s % DEV_COUNTRIES.length]),
      address: loc ? loc.street : (o.address || (['Prinsengracht ' + (10 + s % 80), 'Oxford St ' + (10 + s % 80), 'Rue de Rivoli ' + (10 + s % 80), '—'][s % 4])),
      version: '1.' + (110 + s % 30) + '.' + (s % 12), lastTx: DEV_DATES[(s + 3) % DEV_DATES.length],
    });
  }
  return rows;
}
function makeMobiles(count, opts) {
  const o = opts || {}; const rows = [];
  const sdkStates = ['Supported', 'Expiring', 'Expired'];
  for (let i = 0; i < count; i++) {
    const s = ((o.seed || 3) * 17 + i * 11);
    const model = DEV_MOBILE_MODELS[s % DEV_MOBILE_MODELS.length];
    const ios = model.indexOf('iPhone') === 0;
    const sdk = sdkStates[s % sdkStates.length];
    const a = DEV_ASSIGN[s % DEV_ASSIGN.length];
    const loc = o.stores ? o.stores[i % o.stores.length] : null;
    rows.push({
      id: 'm' + (o.seed || 0) + '_' + i, model,
      install: (s.toString(16).toUpperCase().padStart(6, '0')) + '-' + ((s * 31).toString(16).toUpperCase().slice(0, 4)) + '-' + ((s * 7) % 9999),
      assign: a.label, assignV: a.variant,
      dot: DEV_DOTS[s % 3], lastActivity: DEV_DATES[s % DEV_DATES.length],
      country: loc ? loc.country : (o.country || DEV_COUNTRIES[s % DEV_COUNTRIES.length]),
      sdkVersion: (ios ? '3.1' : '2.1') + (s % 9) + '.0', sdk, sdkV: SDK_STATUS[sdk],
      sdkExpiry: DEV_DATES[(s + 2) % DEV_DATES.length],
      osVersion: ios ? '1' + (7 + s % 2) + '.' + (s % 6) : '1' + (3 + s % 4),
      osStatus: (s % 5 === 0 ? 'Unsupported' : 'Supported'), platform: ios ? 'iOS' : 'Android',
      integration: DEV_INTEGRATION[s % DEV_INTEGRATION.length],
      store: loc ? loc.name : (o.store || ('Store_' + (1000 + (s % 8999)))), storeId: loc ? loc.id : null,
      merchant: loc ? loc.merchant : (o.merchant || 'Uniqlo APAC'),
      lastTx: DEV_DATES[(s + 3) % DEV_DATES.length],
    });
  }
  return rows;
}

/* Single-select filter chip (e.g. date range) — 36px bordered button + popover, Luma filter-bar style. */
function RangeChip({ value, onChange, options, icon = 'timer' }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(null); // Date | null
  const [to, setTo] = useState(null);
  const [view, setView] = useState(() => { const d = new Date(); d.setDate(1); return d; }); // first month shown
  const ref = useOutside(open, () => setOpen(false));
  const isCustom = typeof value === 'string' && value.startsWith('custom:');
  const label = isCustom ? periodLabel(value) : (options.find(o => o.value === value) || options[0]).label;
  const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const pick = (d) => { if (!from || (from && to)) { setFrom(d); setTo(null); } else if (d < from) { setTo(from); setFrom(d); } else setTo(d); };
  const clear = () => { setFrom(null); setTo(null); };
  const apply = () => { if (from && to) { onChange(`custom:${iso(from)}:${iso(to)}`); setOpen(false); } };
  const monthDays = (base) => { const y = base.getFullYear(), m = base.getMonth(); const startDow = (new Date(y, m, 1).getDay() + 6) % 7; const n = new Date(y, m + 1, 0).getDate(); const cells = []; for (let i = 0; i < startDow; i++) cells.push(null); for (let d = 1; d <= n; d++) cells.push(new Date(y, m, d)); return cells; };
  const fld = (d) => d ? `${String(d.getMonth() + 1).padStart(2, '0')} / ${String(d.getDate()).padStart(2, '0')} / ${d.getFullYear()}` : 'MM / DD / YYYY';
  const renderMonth = (base) => (
    <div style={{ width: 236 }}>
      <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{base.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 2 }}>
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: T.faint, padding: '4px 0', fontWeight: 500 }}>{d}</div>)}
        {monthDays(base).map((d, i) => {
          if (!d) return <div key={i} />;
          const end = sameDay(d, from) || sameDay(d, to);
          const rng = from && to && d > from && d < to;
          return <button key={i} onClick={() => pick(d)} style={{ height: 32, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: end ? '#fff' : 'var(--b-color-link-primary)', background: end ? 'var(--b-color-label-primary)' : rng ? 'var(--b-color-background-selected, #EEEAFE)' : 'transparent', borderRadius: end ? '50%' : rng ? 0 : 6 }}>{d.getDate()}</button>;
        })}
      </div>
    </div>
  );
  const nextMonth = (base, n) => { const d = new Date(base); d.setMonth(d.getMonth() + n); return d; };
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 10px 0 12px', border: '1px solid #8C959D', borderRadius: 8, background: T.card, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: T.ink, boxSizing: 'border-box' }}>
        <Ico name={icon} size={16} color={T.sub} /><span>{label}</span><Ico name="chevron-down-small" size={16} color={T.faint} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 600, display: 'flex', background: '#fff', boxShadow: '0px 6px 12px rgba(0,18,34,0.08), 0px 2px 4px rgba(0,18,34,0.04), 0px 0px 0px 1px #DADDDF', borderRadius: 12 }}>
          {/* presets */}
          <div style={{ width: 160, borderRight: `1px solid ${T.sepFaint}`, padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {options.map(o => (
              <button key={o.value} className="b-menu-item" onClick={() => { onChange(o.value); setOpen(false); }} style={{ display: 'block', width: '100%', padding: '7px 10px', border: 0, background: o.value === value ? 'var(--b-color-background-selected, #EEEAFE)' : 'transparent', color: o.value === value ? 'var(--b-color-link-primary)' : T.ink, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: o.value === value ? 600 : 400, textAlign: 'left' }}>{o.label}</button>
            ))}
          </div>
          {/* calendar */}
          <div style={{ padding: 16 }}>
            <Row gap={16} style={{ marginBottom: 14, flexWrap: 'wrap' }}>
              <Col gap={3}><span style={{ fontSize: 12, color: T.sub }}>Start</span><div style={{ height: 34, minWidth: 130, border: `1px solid ${from ? 'var(--b-color-link-primary)' : T.sep}`, borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, fontFamily: 'var(--b-font-family-secondary)', color: from ? T.ink : T.faint }}>{fld(from)}</div></Col>
              <Col gap={3}><span style={{ fontSize: 12, color: T.sub }}>End</span><div style={{ height: 34, minWidth: 130, border: `1px solid ${T.sep}`, borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 13, fontFamily: 'var(--b-font-family-secondary)', color: to ? T.ink : T.faint }}>{fld(to)}</div></Col>
            </Row>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <button onClick={() => setView(nextMonth(view, -1))} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 4, lineHeight: 0, borderRadius: 6 }}><Ico name="chevron-left" size={16} color={T.sub} /></button>
              <button onClick={() => setView(nextMonth(view, 1))} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 4, lineHeight: 0, borderRadius: 6 }}><Ico name="chevron-right" size={16} color={T.sub} /></button>
            </Row>
            <Row gap={24} align="flex-start">
              {renderMonth(view)}
              {renderMonth(nextMonth(view, 1))}
            </Row>
            <Row gap={8} style={{ justifyContent: 'flex-end', marginTop: 14 }}>
              <Button variant="secondary" condensed onClick={clear}>Clear</Button>
              <Button variant="primary" condensed disabled={!from || !to} onClick={apply}>Apply</Button>
            </Row>
          </div>
        </div>
      )}
    </div>
  );
}

/* Multi-select facet filter — 36px bordered chip + checkbox popover, removable. Bento filter-bar style. */
function FacetChip({ label, options, selected, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  const active = selected.length > 0;
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 6px 0 12px', border: `1px solid ${active ? 'var(--b-color-label-primary)' : '#8C959D'}`, borderRadius: 8, background: T.card, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: T.ink, boxSizing: 'border-box' }}>
        <span>{active ? `${label}: ${selected.length}` : label}</span>
        <Ico name="chevron-down-small" size={16} color={T.faint} />
        <span onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Remove filter" style={{ display: 'inline-flex', lineHeight: 0, padding: 2, borderRadius: 4 }}><Ico name="cross-small" size={14} color={T.faint} /></span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 600, minWidth: 200, maxHeight: 280, overflowY: 'auto', background: '#fff', boxShadow: '0px 6px 12px rgba(0,18,34,0.08), 0px 2px 4px rgba(0,18,34,0.04), 0px 0px 0px 1px #DADDDF', borderRadius: 8, padding: 4 }}>
          {options.map(o => { const v = typeof o === 'string' ? o : o.value; const lab = typeof o === 'string' ? o : o.label; return (
            <button key={v} className="b-menu-item" onClick={() => toggle(v)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', border: 0, background: 'transparent', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: T.ink, textAlign: 'left' }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${selected.includes(v) ? 'var(--b-color-label-primary)' : '#8C959D'}`, background: selected.includes(v) ? 'var(--b-color-label-primary)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{selected.includes(v) && <Ico name="checkmark-small" size={12} color="#fff" />}</span>
              <span style={{ flex: 1 }}>{lab}</span>
            </button>
          ); })}
        </div>
      )}
    </div>
  );
}

/* Bento search bar — 36px, matches b-search-bar spec (border #8C959D · radius 8 · leading icon). */
function SearchBar({ value, onChange, placeholder = 'Search…', width = 260 }) {
  return (
    <label className="ns-searchbar" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px', border: '1px solid #8C959D', borderRadius: 8, background: T.card, width, boxSizing: 'border-box', flexShrink: 0 }}>
      <Ico name="search" size={16} color={T.ink} />
      <input value={value} onChange={(e) => onChange(e.target ? e.target.value : e)} placeholder={placeholder}
        style={{ border: 0, outline: 'none', background: 'none', fontFamily: 'inherit', fontSize: 14, color: T.ink, width: '100%' }} />
    </label>
  );
}

/* Bento filter button (b-filter-bar) — outlined when empty; dark-filled #364553 with a counter
   chip (#001222) and a divided clear (×) when a value is applied. 36px to align with the search bar. */
function FilterChip({ label, options, selected, onChange, onClear }) {
  const [open, setOpen] = useState(false);
  const [pq, setPq] = useState('');
  const ref = useOutside(open, () => setOpen(false));
  const n = selected.length;
  const active = n > 0;
  const list = options.filter(o => !pq || o.label.toLowerCase().includes(pq.toLowerCase()));
  const allOn = list.length > 0 && list.every(o => selected.includes(o.value));
  // Chip visual: full black only when EVERY option is selected; a lighter "intermediate" style for a partial selection.
  const dark = options.length > 0 && options.every(o => selected.includes(o.value));
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{ display: 'inline-flex', alignItems: 'stretch', height: 36, borderRadius: 8, background: dark ? 'var(--b-color-background-inverse-primary)' : (active ? 'var(--b-color-background-secondary)' : T.card), border: dark ? 'none' : `1px solid ${active ? 'var(--b-color-label-primary)' : '#8C959D'}`, boxSizing: 'border-box', overflow: 'hidden' }}>
        <button onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: active ? '0 8px 0 10px' : '0 10px', border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: dark ? 'var(--b-color-label-inverse-primary)' : T.ink }}>
          <span>{label}</span>
          {active
            ? <span style={{ minWidth: 16, height: 20, padding: '0 4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: dark ? 'rgba(255,255,255,0.2)' : 'var(--b-color-label-primary)', borderRadius: 4, color: '#fff', fontSize: 14, fontWeight: 500 }}>{n}</span>
            : <Ico name="chevron-down-small" size={16} color={T.faint} />}
        </button>
        {active && (
          <button onClick={() => { onClear && onClear(); }} title={`Clear ${label}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, border: 0, borderLeft: dark ? '1px solid rgba(255,255,255,0.24)' : '1px solid var(--b-color-separator-primary)', background: 'transparent', cursor: 'pointer' }}>
            <Ico name="cross" size={16} color={dark ? 'var(--b-color-label-inverse-primary)' : T.sub} />
          </button>
        )}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 600, width: 320, background: '#fff', boxShadow: '0px 6px 12px rgba(0,18,34,0.08), 0px 2px 4px rgba(0,18,34,0.04), 0px 0px 0px 1px #DADDDF', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 420 }}>
          <div style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: '#001222' }}>Filter by {label.toLowerCase()}</div>
          <div style={{ height: 1, background: '#DADDDF' }} />
          {options.length > 8 && <div style={{ padding: '8px 16px 4px' }}><SearchBar value={pq} onChange={setPq} placeholder={`Search ${label.toLowerCase()}…`} width="100%" /></div>}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {list.length > 1 && (() => {
              const some = list.some(o => selected.includes(o.value));
              const partial = some && !allOn; // indeterminate: some (not all) selected
              const on = allOn || partial;
              return (
                <label className="b-menu-item" onClick={() => { const vals = list.map(o => o.value); if (allOn) vals.forEach(v => selected.includes(v) && onChange(v)); else vals.forEach(v => !selected.includes(v) && onChange(v)); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', cursor: 'pointer', fontSize: 14 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${on ? 'var(--b-color-label-primary)' : '#8C959D'}`, background: on ? 'var(--b-color-label-primary)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {allOn ? <Ico name="checkmark-small" size={12} color="#fff" /> : partial ? <span style={{ width: 8, height: 2, background: '#fff', borderRadius: 1 }} /> : null}
                  </span>
                  <span style={{ flex: 1 }}>Select all</span>
                </label>
              );
            })()}
            {list.map(o => (
              <label key={o.value} className="b-menu-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', cursor: 'pointer', fontSize: 14 }}>
                <Checkbox checked={selected.includes(o.value)} onChange={() => onChange(o.value)} />
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
                {o.count != null && <span style={{ fontFamily: 'var(--b-font-family-secondary)', fontSize: 13, color: T.faint }}>{o.count}</span>}
              </label>
            ))}
            {list.length === 0 && <div style={{ padding: '16px', textAlign: 'center', color: T.faint, fontSize: 13 }}>No matches</div>}
          </div>
          <div style={{ height: 1, background: '#DADDDF' }} />
          <Row gap={12} style={{ padding: '12px 16px', justifyContent: 'space-between' }}>
            <Button variant="secondary" condensed disabled={!active} onClick={() => onClear && onClear()}>Clear</Button>
            <Button variant="primary" condensed onClick={() => setOpen(false)}>Apply</Button>
          </Row>
        </div>
      )}
    </div>
  );
}

/* Device row actions — shared by the row 3-dots menu and the selection action bar. */
const DEVICE_ACTIONS = [
  { value: 'configure', label: 'Configure', icon: 'settings' },
  { value: 'reassign', label: 'Reassign', icon: 'store' },
  { value: 'return', label: 'Return', icon: 'arrow-right' },
  { value: 'replace', label: 'Replace', icon: 'refresh' },
];
const deviceActionMsg = (v, n) => {
  const who = n && n > 1 ? `${n} devices` : 'device';
  return v === 'assign' ? `Assigning ${who}…`
    : v === 'return' ? `Return label generated for ${who}`
    : v === 'reassign' ? `Reassigning ${who}…`
    : v === 'configure' ? `Opening settings for ${who}…`
    : `Replacement ordered for ${who}`;
};

/* Selectable, horizontally-scrollable data grid — Store-list table style. columns: {key,label,w,render,align} */
function DeviceGrid({ columns, rows, notify, bordered, onReassign, onConfigure }) {
  const [sel, setSel] = useState({});
  const [page, setPage] = useState(1);
  // Default to the first column sorted ascending so the sort indicator is always visible.
  const [sort, setSort] = useState(() => ({ key: (columns[0] || {}).key || null, dir: 'asc' }));
  const pageSize = 20;
  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const col = columns.find(c => c.key === sort.key); if (!col) return rows;
    const f = col.sortField || col.key;
    const arr = [...rows].sort((a, b) => String(a[f] == null ? '' : a[f]).localeCompare(String(b[f] == null ? '' : b[f]), undefined, { numeric: true, sensitivity: 'base' }));
    if (sort.dir === 'desc') arr.reverse();
    return arr;
  }, [rows, sort, columns]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pg = Math.min(page, totalPages);
  const pageRows = sorted.slice((pg - 1) * pageSize, pg * pageSize);
  const allOn = pageRows.length > 0 && pageRows.every(r => sel[r.id]);
  const toggleAll = () => { const n = { ...sel }; pageRows.forEach(r => { n[r.id] = !allOn; }); setSel(n); };
  const toggleSort = (c) => setSort(s => s.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'asc' });
  const gridMin = 32 + 44 + columns.reduce((a, c) => a + c.w, 0) + 12 * (columns.length + 1) + 32;
  const stickyL = { position: 'sticky', left: 0, background: 'transparent', zIndex: 1, flexShrink: 0 };
  const stickyR = { position: 'sticky', right: 0, background: 'transparent', zIndex: 1, flexShrink: 0 };
  const selCount = Object.keys(sel).filter(k => sel[k]).length;
  const selectedRows = useMemo(() => rows.filter(r => sel[r.id]), [rows, sel]);
  const clearSel = () => setSel({});
  // Route reassign/configure to the parent (modal / studio); everything else toasts.
  const dispatch = (v, list) => {
    if (v === 'reassign' && onReassign) return onReassign(list);
    if (v === 'configure' && onConfigure) return onConfigure(list);
    notify && notify(deviceActionMsg(v, list.length || 1));
  };
  const runAction = (v) => dispatch(v, selectedRows);
  return (
    <div style={bordered ? { border: `1px solid ${T.border}`, borderRadius: T.radiusM, overflow: 'hidden', background: T.card } : undefined}>
      <div style={{ background: T.card, overflow: 'auto' }}>
        <div style={{ minWidth: gridMin }}>
          <SMHead noTop={bordered}>
            <div style={{ ...stickyL, width: 32 }}><Checkbox checked={allOn} indeterminate={!allOn && pageRows.some(r => sel[r.id])} onChange={toggleAll} /></div>
            {columns.map(c => (
              <div key={c.key} style={{ width: c.w, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none', justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start', color: sort.key === c.key ? T.ink : undefined, paddingRight: c.padRight || undefined, boxSizing: c.padRight ? 'border-box' : undefined }}>
                <span onClick={() => toggleSort(c)} title="Sort" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>{c.label}</span>
                {sort.key === c.key && <Ico name={sort.dir === 'asc' ? 'arrow-up' : 'arrow-down'} size={14} color={T.ink} />}
                {c.info && <span onClick={(e) => e.stopPropagation()} style={{ lineHeight: 0 }}><InfoTip content={c.info} placement="right"><Ico name="info" size={16} color={T.ink} /></InfoTip></span>}
              </div>
            ))}
            <div style={{ ...stickyR, width: 44 }} />
          </SMHead>
          {pageRows.map(r => (
            <SMRowEl key={r.id} onClick={() => setSel(s => ({ ...s, [r.id]: !s[r.id] }))} style={{ cursor: 'pointer', background: sel[r.id] ? 'var(--b-color-background-selected)' : undefined }}>
              <div style={{ ...stickyL, width: 32, background: sel[r.id] ? 'var(--b-color-background-selected)' : 'transparent' }} onClick={(e) => e.stopPropagation()}><Checkbox checked={!!sel[r.id]} onChange={() => setSel(s => ({ ...s, [r.id]: !s[r.id] }))} /></div>
              {columns.map(c => <div key={c.key} style={{ width: c.w, flexShrink: 0, textAlign: c.align || 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.render(r)}</div>)}
              <div style={{ ...stickyR, width: 44, display: 'flex', justifyContent: 'flex-end', background: sel[r.id] ? 'var(--b-color-background-selected)' : 'transparent' }} onClick={(e) => e.stopPropagation()}>
                <MenuButton icon="options-vertical" variant="tertiary" items={DEVICE_ACTIONS} onSelect={(v) => dispatch(v, [r])} />
              </div>
            </SMRowEl>
          ))}
          {rows.length === 0 && <div style={{ padding: '48px 24px', textAlign: 'center', color: T.sub, fontSize: 14 }}>No devices match your filters.</div>}
        </div>
      </div>

      {/* selection action bar — floating, matches Bento multi-select bar */}
      {selCount > 0 && (
        <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 390, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px 8px 16px', background: 'var(--b-color-background-inverse-primary)', color: 'var(--b-color-label-inverse-primary)', borderRadius: 999, boxShadow: 'var(--b-shadow-high)' }}>
          <button onClick={clearSel} title="Clear selection" style={{ display: 'inline-flex', border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 4, lineHeight: 0 }}><Ico name="cross" size={16} color="currentColor" /></button>
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{selCount} selected</span>
          <span style={{ width: 1, height: 20, background: 'var(--b-color-separator-inverse-primary)', margin: '0 4px' }} />
          {DEVICE_ACTIONS.map(a => (
            <button key={a.value} onClick={() => runAction(a.value)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '6px 10px', borderRadius: 8 }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--b-color-background-inverse-primary-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <Ico name={a.icon} size={16} color="currentColor" />{a.label}
            </button>
          ))}
        </div>
      )}
      <Row gap={16} style={{ position: 'sticky', bottom: 0, zIndex: 3, background: T.card, borderTop: `1px solid ${T.sep}`, padding: '12px 16px', fontSize: 14, color: T.ink }}>
        <span style={{ color: T.sub }}>{sorted.length} items</span>
        <Row gap={10} style={{ marginLeft: 'auto' }}>
          <span style={{ color: T.sub }}>Page</span>
          <span style={{ fontFamily: 'var(--b-font-family-secondary)', minWidth: 40, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.borderStrong}`, borderRadius: T.radiusM }}>{pg}</span>
          <span style={{ color: T.sub }}>of {totalPages}</span>
          <Row gap={4} style={{ marginLeft: 6 }}>
            {[['chevron-left', () => setPage(p => Math.max(1, p - 1))], ['chevron-right', () => setPage(p => Math.min(totalPages, p + 1))]].map(([ic, fn]) => (
              <button key={ic} className="b-pager-nav" onClick={fn} style={{ width: 28, height: 28, border: 0, background: 'none', color: T.sub, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, borderRadius: T.radiusM }}><Ico name={ic} size={16} /></button>
            ))}
          </Row>
        </Row>
      </Row>
    </div>
  );
}

/* Bento-style segmented control (single-select pill row). */
function SegControl({ value, onChange, options }) {
  return (
    <div style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: T.radiusM, background: 'var(--b-color-background-secondary)' }}>
      {options.map(o => {
        const on = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, cursor: 'pointer', padding: '6px 14px', borderRadius: T.radiusS, background: on ? T.card : 'transparent', boxShadow: on ? 'var(--b-shadow-low)' : 'none', color: on ? T.ink : T.sub, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'background 100ms linear, color 100ms linear' }}>
            {o.icon && <Ico name={o.icon} size={16} color={on ? T.ink : T.sub} />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

function DeviceExplorer({ terminals, mobiles, onOpenStore, onOpenDevice, title, subtitle, actions, storeLabel = 'Store', info, notify, view, onView, locationView, onReassign, onConfigure }) {
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [fType, setFType] = useState([]);
  const [fLoc, setFLoc] = useState([]);
  const [fMerch, setFMerch] = useState([]);
  const [fAssign, setFAssign] = useState([]);
  const toggle = (setter) => (v) => setter(a => a.includes(v) ? a.filter(x => x !== v) : [...a, v]);

  const termList = useMemo(() => terminals.map(r => ({ ...r, _type: 'Terminal' })), [terminals]);
  const mobList = useMemo(() => mobiles.map(r => ({ ...r, _type: 'Mobile' })), [mobiles]);
  const allList = useMemo(() => { const out = []; const m = Math.max(termList.length, mobList.length); for (let i = 0; i < m; i++) { if (i < termList.length) out.push(termList[i]); if (i < mobList.length) out.push(mobList[i]); } return out; }, [termList, mobList]);
  const locOpts = useMemo(() => Array.from(new Set(allList.map(r => r.store))).map(c => ({ value: c, label: c })), [allList]);
  const merchOpts = useMemo(() => Array.from(new Set(allList.map(r => r.merchant))).map(m => ({ value: m, label: m })), [allList]);
  const assignOpts = useMemo(() => Array.from(new Set(allList.map(r => r.assign).filter(Boolean))).map(a => ({ value: a, label: a })), [allList]);

  const dot = (r) => <Row gap={8}><span style={{ width: 10, height: 10, borderRadius: '50%', background: r.dot, flexShrink: 0 }} /><span style={{ fontSize: 13, color: T.sub }}>{r.lastActivity}</span></Row>;
  const storeCell = (r) => r.store === '—' ? <span style={{ color: T.faint }}>—</span> : <a href="#" onClick={(e) => { e.preventDefault(); onOpenStore && onOpenStore(r.storeId || r.store); }} style={{ color: T.ink, textDecoration: 'underline', textUnderlineOffset: 2, fontSize: 13 }}>{r.store}</a>;
  const mono = (v) => <span style={{ fontFamily: 'var(--b-font-family-secondary)', fontSize: 13 }}>{v}</span>;
  const sub = (v) => <span style={{ color: T.sub, fontSize: 13 }}>{v}</span>;
  const modelCell = (r) => onOpenDevice
    ? <button type="button" onClick={() => onOpenDevice(r)} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: 'var(--b-color-label-primary)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{r.model}</button>
    : <span style={{ fontWeight: 500 }}>{r.model}</span>;
  const ACT_INFO = 'When the device last processed a transaction. The dot shows online (green), idle (orange) or offline (red).';
  const ASSIGN_INFO = 'Where the device is in its lifecycle: Inventory (not yet assigned), Deployed (assigned to a store), Boarded (live and transacting) or Reassigning (moving to another store).';
  const assignCell = (r) => r.assign ? <Tag label={r.assign} variant={r.assignV} /> : <span style={{ color: T.faint }}>—</span>;
  const allCols = [
    { key: 'model', label: 'Device model', w: 130, render: modelCell },
    { key: 'type', label: 'Type', w: 110, sortField: '_type', render: r => <Tag label={r._type === 'Mobile' ? 'Mobile' : 'Terminal'} variant={r._type === 'Mobile' ? 'blue' : 'grey'} /> },
    { key: 'act', label: 'Last activity', w: 170, sortField: 'lastActivity', info: ACT_INFO, render: dot },
    { key: 'tx', label: 'Last transaction', w: 160, sortField: 'lastTx', render: r => sub(r.lastTx) },
    { key: 'assign', label: 'Assignment status', w: 150, padRight: 16, sortField: 'assign', info: ASSIGN_INFO, render: assignCell },
    { key: 'store', label: storeLabel, w: 170, render: storeCell },
    { key: 'country', label: 'Country/Region', w: 150, render: r => sub(r.country) },
    { key: 'merchant', label: 'Merchant', w: 180, render: r => sub(r.merchant) },
  ];
  const termCols = [
    { key: 'model', label: 'Device model', w: 120, render: modelCell },
    { key: 'serial', label: 'Serial number', w: 150, render: r => mono(r.serial) },
    { key: 'act', label: 'Last activity', w: 170, sortField: 'lastActivity', info: ACT_INFO, render: dot },
    { key: 'tx', label: 'Last transaction', w: 160, sortField: 'lastTx', render: r => sub(r.lastTx) },
    { key: 'assign', label: 'Assignment status', w: 150, padRight: 16, sortField: 'assign', info: ASSIGN_INFO, render: assignCell },
    { key: 'store', label: storeLabel, w: 160, render: storeCell },
    { key: 'country', label: 'Country/Region', w: 140, render: r => sub(r.country) },
    { key: 'addr', label: 'Location address', w: 200, sortField: 'address', render: r => sub(r.address) },
    { key: 'ver', label: 'Software version', w: 140, sortField: 'version', render: r => mono(r.version) },
  ];
  const mobileCols = [
    { key: 'model', label: 'Device model', w: 120, render: modelCell },
    { key: 'install', label: 'Installation ID', w: 240, render: r => mono(r.install) },
    { key: 'act', label: 'Last activity', w: 170, sortField: 'lastActivity', info: ACT_INFO, render: dot },
    { key: 'assign', label: 'Assignment status', w: 150, padRight: 16, sortField: 'assign', info: ASSIGN_INFO, render: assignCell },
    { key: 'store', label: storeLabel, w: 160, render: storeCell },
    { key: 'country', label: 'Country/Region', w: 140, render: r => sub(r.country) },
    { key: 'sdkv', label: 'SDK version', w: 110, sortField: 'sdkVersion', render: r => mono(r.sdkVersion) },
    { key: 'sdk', label: 'SDK status', w: 120, render: r => <Tag label={r.sdk} variant={r.sdkV} /> },
    { key: 'exp', label: 'SDK expiry date', w: 150, sortField: 'sdkExpiry', render: r => sub(r.sdkExpiry) },
    { key: 'osv', label: 'OS version', w: 110, sortField: 'osVersion', render: r => mono(r.osVersion) },
    { key: 'os', label: 'OS status', w: 120, sortField: 'osStatus', render: r => <Tag label={r.osStatus} variant={r.osStatus === 'Supported' ? 'green' : 'red'} /> },
    { key: 'integration', label: 'Integration type', w: 140, sortField: 'integration', render: r => sub(r.integration) },
    { key: 'plat', label: 'Platform', w: 100, sortField: 'platform', render: r => sub(r.platform) },
  ];

  const base = tab === 'terminals' ? termList : tab === 'mobiles' ? mobList : allList;
  const columns = tab === 'terminals' ? termCols : tab === 'mobiles' ? mobileCols : allCols;
  const rows = base.filter(r => {
    if (fType.length && !fType.includes(r._type)) return false;
    if (fLoc.length && !fLoc.includes(r.store)) return false;
    if (fMerch.length && !fMerch.includes(r.merchant)) return false;
    if (fAssign.length && !fAssign.includes(r.assign)) return false;
    if (q && !Object.values(r).join(' ').toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const hasFilters = fType.length || fLoc.length || fMerch.length || fAssign.length || q;

  return (
    <div style={{ maxWidth: title ? T.maxW : 1500, margin: '0 auto', padding: title ? `${T.s7}px ${T.s7}px ${T.s7}px` : '16px 24px 40px' }}>
      {title && (
        <Row align="flex-start" style={{ marginBottom: T.s5, gap: 24 }}>
          <Col gap={4} style={{ flex: 1 }}>
            <Row gap={6}>
              <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</span>
              {info && <InfoTip width={320} content={info} placement="right"><Ico name="info" size={16} color={T.ink} /></InfoTip>}
            </Row>
            {subtitle && <span style={{ fontSize: 13, color: T.sub }}>{subtitle}</span>}
          </Col>
          {actions && <Row gap={8} style={{ flexShrink: 0 }}>{actions}</Row>}
        </Row>
      )}
      {onView && (
        <div style={{ marginBottom: 16 }}>
          <SegControl value={view} onChange={onView} options={[{ value: 'byLocation', label: 'By location', icon: 'store' }, { value: 'devices', label: 'All devices', icon: 'terminal-1' }]} />
        </div>
      )}
      {view === 'byLocation' && locationView ? locationView : (
        <>
          <div style={{ marginBottom: 16 }}>
            <Tabs value={tab} onChange={setTab} tabs={[{ value: 'all', label: `All (${allList.length})` }, { value: 'terminals', label: `Terminals (${terminals.length})` }, { value: 'mobiles', label: `Mobile devices (${mobiles.length})` }]} />
          </div>
          {/* search + Bento filters — persist across tabs */}
          <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
            <SearchBar value={q} onChange={setQ} placeholder="Search…" width={260} />
            <FilterChip label="Device type" options={[{ value: 'Terminal', label: 'Terminals', count: terminals.length }, { value: 'Mobile', label: 'Mobile devices', count: mobiles.length }]} selected={fType} onChange={toggle(setFType)} onClear={() => setFType([])} />
            <FilterChip label="Location" options={locOpts} selected={fLoc} onChange={toggle(setFLoc)} onClear={() => setFLoc([])} />
            <FilterChip label="Assignment status" options={assignOpts} selected={fAssign} onChange={toggle(setFAssign)} onClear={() => setFAssign([])} />
            <FilterChip label="Merchant" options={merchOpts} selected={fMerch} onChange={toggle(setFMerch)} onClear={() => setFMerch([])} />
            {hasFilters && <button onClick={() => { setFType([]); setFLoc([]); setFMerch([]); setFAssign([]); setQ(''); }} style={{ border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: '#0F75DC', padding: '0 4px' }}>Clear filters</button>}
          </Row>
          <DeviceGrid key={tab} columns={columns} rows={rows} notify={notify} onReassign={onReassign} onConfigure={onConfigure} />
        </>
      )}
    </div>
  );
}

/* Location-first lens — each location with its device counts, health and performance;
   rows expand to reveal that location's devices. Answers "which location has which devices". */
function LocationDeviceTable({ stores, onOpenLocation, onOpenDevice, onConfigureStore, onCloseLocation, notify, deviceTotal }) {
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState({});
  const [sort, setSort] = useState({ key: 'code', dir: 'asc' });
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const rows = useMemo(() => stores.map(s => {
    const seed = parseInt((s.id.match(/\d+/) || ['1'])[0], 10) || 1;
    return {
      ...s, devices: s.terminals || 0, online: s.termOnline || 0, idle: s.termWeek || 0, off: s.termOff || 0,
      auth: s.terminals ? 91 + (seed % 80) / 10 : null,
      atv: s.terminals ? 30 + (seed % 40) : null,
      lastTx: DEV_DATES[seed % DEV_DATES.length],
    };
  }), [stores]);
  const filtered = rows.filter(r => !q || (r.code + ' ' + r.city + ' ' + r.country).toLowerCase().includes(q.toLowerCase()));
  const sorted = useMemo(() => {
    const f = sort.key; const arr = [...filtered].sort((a, b) => {
      const av = a[f], bv = b[f];
      if (typeof av === 'number' || typeof bv === 'number') return (av || 0) - (bv || 0);
      return String(av == null ? '' : av).localeCompare(String(bv == null ? '' : bv), undefined, { numeric: true });
    });
    if (sort.dir === 'desc') arr.reverse();
    return arr;
  }, [filtered, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pg = Math.min(page, totalPages);
  const pageRows = sorted.slice((pg - 1) * pageSize, pg * pageSize);
  const toggleSort = (k) => setSort(s => s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' });

  // widths hug content and include a 16px right padding (border-box); all left-aligned
  const cols = [
    { key: 'code', label: 'Location', w: 260 },
    { key: 'devices', label: 'Devices', w: 88 },
    { key: 'status', label: 'Device status', w: 190, nosort: true },
    { key: 'auth', label: 'Auth rate', w: 96 },
    { key: 'atv', label: 'ATV', w: 72 },
    { key: 'lastTx', label: 'Last transaction', w: 170 },
  ];
  const gridMin = 32 + 44 + cols.reduce((a, c) => a + c.w, 0) + 12 * (cols.length + 1) + 32;
  const stickyL = { position: 'sticky', left: 0, background: 'transparent', zIndex: 1, flexShrink: 0 };
  const stickyR = { position: 'sticky', right: 0, background: 'transparent', zIndex: 1, flexShrink: 0 };
  const statusChip = (color, n) => n > 0 ? <Row gap={4} key={color}><span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} /><span style={{ fontSize: 12, color: T.sub }}>{n}</span></Row> : null;
  const genDevices = (s) => {
    const seed = parseInt((s.id.match(/\d+/) || ['1'])[0], 10) || 1;
    return makeTerminals(s.terminals || 0, { seed, store: s.name, country: s.country, address: s.street }).map(r => ({ ...r, _type: 'Terminal' }))
      .concat(makeMobiles(Math.max(0, Math.round((s.terminals || 0) / 4)), { seed: seed + 5, store: s.name, country: s.country }).map(r => ({ ...r, _type: 'Mobile' })));
  };
  const cell = (c, r) => {
    if (c.key === 'code') return <a href="#" onClick={(e) => { e.preventDefault(); onOpenLocation(r.id); }} style={{ color: T.ink, fontWeight: 500, textDecoration: 'none' }}>{r.name}<span style={{ color: T.sub, fontWeight: 400 }}> · {r.city}, {r.country}</span></a>;
    if (c.key === 'devices') return <span className="ns-num">{r.devices}</span>;
    if (c.key === 'status') return r.devices ? <Row gap={12}>{[statusChip('var(--b-color-decorative-green)', r.online), statusChip('var(--b-color-decorative-orange)', r.idle), statusChip('var(--b-color-decorative-red)', r.off)].filter(Boolean)}</Row> : <span style={{ color: T.faint }}>No devices</span>;
    if (c.key === 'auth') return r.auth ? <span>{r.auth.toFixed(1)}%</span> : <span style={{ color: T.faint }}>—</span>;
    if (c.key === 'atv') return r.atv ? <span>€{r.atv}</span> : <span style={{ color: T.faint }}>—</span>;
    if (c.key === 'lastTx') return <span style={{ color: T.sub, fontSize: 13 }}>{r.lastTx}</span>;
    return null;
  };
  return (
    <div>
      <div style={{ background: T.card, overflow: 'auto' }}>
        <div style={{ minWidth: gridMin }}>
          <SMHead>
            <div style={{ ...stickyL, width: 32 }} />
            {cols.map(c => (
              <div key={c.key} onClick={() => !c.nosort && toggleSort(c.key)} title={c.nosort ? undefined : 'Sort'} style={{ width: c.w, flexShrink: 0, boxSizing: 'border-box', paddingRight: 16, display: 'flex', alignItems: 'center', gap: 4, cursor: c.nosort ? 'default' : 'pointer', userSelect: 'none', justifyContent: 'flex-start', color: sort.key === c.key ? T.ink : undefined }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                {sort.key === c.key && <Ico name={sort.dir === 'asc' ? 'arrow-up' : 'arrow-down'} size={14} color={T.ink} />}
              </div>
            ))}
            <div style={{ ...stickyR, width: 44 }} />
          </SMHead>
          {pageRows.map(r => {
            const open = !!expanded[r.id];
            return (
              <div key={r.id}>
                <SMRowEl onClick={() => setExpanded(e => ({ ...e, [r.id]: !e[r.id] }))} style={{ cursor: 'pointer' }}>
                  <div style={{ ...stickyL, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}><Ico name={open ? 'chevron-down' : 'chevron-right'} size={16} color={T.sub} /></div>
                  {cols.map(c => <div key={c.key} style={{ width: c.w, flexShrink: 0, boxSizing: 'border-box', paddingRight: 16, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={c.key === 'code' ? (e) => e.stopPropagation() : undefined}>{cell(c, r)}</div>)}
                  <div style={{ ...stickyR, width: 44, display: 'flex', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                    <MenuButton icon="options-vertical" variant="tertiary" items={[
                      { value: 'edit', label: 'Edit location', icon: 'edit-1' },
                      { value: 'configure', label: 'Configure devices', icon: 'settings' },
                      { value: 'close', label: 'Close location', icon: 'cross' },
                    ]} onSelect={(v) => v === 'edit' ? onOpenLocation(r.id) : v === 'configure' ? onConfigureStore(r) : onCloseLocation ? onCloseLocation(r) : notify && notify(`Closing ${r.name}…`)} />
                  </div>
                </SMRowEl>
                {open && (
                  <div style={{ background: '#FAFBFC', padding: '4px 16px 12px 60px' }}>
                    {r.devices === 0
                      ? <span style={{ fontSize: 13, color: T.sub }}>This location has no devices yet.</span>
                      : (
                        <>
                          <Row gap={20} style={{ padding: '8px 0 6px', borderBottom: `1px solid ${T.sep}`, fontSize: 12, fontWeight: 600, color: T.ink }}>
                            <span style={{ width: 180, flexShrink: 0 }}>Device model</span>
                            <span style={{ width: 100, flexShrink: 0 }}>Type</span>
                            <span style={{ width: 180, flexShrink: 0 }}>Last activity</span>
                            <span style={{ width: 120, flexShrink: 0 }}>Software</span>
                          </Row>
                          {genDevices(r).map((d, di) => (
                            <Row key={d.id} gap={20} style={{ padding: '10px 0', borderBottom: `1px solid ${T.sepFaint}` }}>
                              <button type="button" onClick={() => onOpenDevice(d)} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: T.ink, textDecoration: 'underline', textUnderlineOffset: 2, width: 180, textAlign: 'left', flexShrink: 0 }}>{d.model}</button>
                              <span style={{ width: 100, flexShrink: 0 }}><Tag label={d._type} variant={d._type === 'Mobile' ? 'blue' : 'grey'} /></span>
                              <Row gap={6} style={{ width: 180, flexShrink: 0 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: d.dot }} /><span style={{ fontSize: 13, color: T.sub }}>{d.lastActivity}</span></Row>
                              <span style={{ width: 120, flexShrink: 0, fontFamily: 'var(--b-font-family-secondary)', fontSize: 13, color: T.sub }}>{d._type === 'Mobile' ? d.sdkVersion : d.version}</span>
                            </Row>
                          ))}
                        </>
                      )}
                  </div>
                )}
              </div>
            );
          })}
          {sorted.length === 0 && <div style={{ padding: '48px 24px', textAlign: 'center', color: T.sub, fontSize: 14 }}>No locations match your search.</div>}
        </div>
      </div>
      <Row gap={16} style={{ position: 'sticky', bottom: 0, zIndex: 3, background: T.card, borderTop: `1px solid ${T.sep}`, padding: '12px 16px', fontSize: 14, color: T.ink }}>
        <span style={{ color: T.sub }}>{sorted.length} locations · {deviceTotal != null ? deviceTotal : sorted.reduce((a, r) => a + r.devices, 0)} devices</span>
        <Row gap={10} style={{ marginLeft: 'auto' }}>
          <span style={{ color: T.sub }}>Page</span>
          <span style={{ fontFamily: 'var(--b-font-family-secondary)', minWidth: 40, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.borderStrong}`, borderRadius: T.radiusM }}>{pg}</span>
          <span style={{ color: T.sub }}>of {totalPages}</span>
          <Row gap={4} style={{ marginLeft: 6 }}>
            {[['chevron-left', () => setPage(p => Math.max(1, p - 1))], ['chevron-right', () => setPage(p => Math.min(totalPages, p + 1))]].map(([ic, fn]) => (
              <button key={ic} className="b-pager-nav" onClick={fn} style={{ width: 28, height: 28, border: 0, background: 'none', color: T.sub, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, borderRadius: T.radiusM }}><Ico name={ic} size={16} /></button>
            ))}
          </Row>
        </Row>
      </Row>
    </div>
  );
}

/* ============================================================= TERMINAL SELECTOR
   Device-Studio-styled "Order devices" popup: a left control panel of guided questions,
   a right canvas that shows an animated empty/loading state until enough is answered, then a
   device recommendation. Mock rules map answers → an Adyen terminal. */
const SELECTOR_QUESTIONS = [
  { id: 'country', label: 'Which country will the devices operate in?', ph: 'Select a country', opts: ['Netherlands', 'United Kingdom', 'United States', 'Germany', 'France', 'Spain', 'Australia', 'Japan'].map(c => [c, c]) },
  { id: 'industry', label: 'In which industry does the client operate?', ph: 'Select an industry', opts: [['large_retail', 'Large format retail'], ['small_retail', 'Small format retail'], ['fnb', 'Food & Beverage'], ['hospitality', 'Hospitality'], ['luxury', 'Luxury retail']] },
  { id: 'use_case', label: 'Where will the payment take place?', ph: 'Select an environment', opts: [['countertop', 'At a fixed counter / checkout'], ['mobile', 'On the move, next to the customer'], ['unattended', 'In a self-service kiosk'], ['smartphone', "On the seller's smartphone"]] },
  { id: 'card_read', label: 'What are the card acceptance requirements?', ph: 'Select an option', opts: [['all', 'Chip / swipe + contactless'], ['contactless_only', 'Contactless payments only']] },
  { id: 'input_type', label: 'Is a physical keypad required?', ph: 'Select an option', opts: [['physical', 'Yes, a physical keypad is necessary'], ['touchscreen', 'No, touchscreen only is ideal']] },
  { id: 'os_type', label: 'Does it need to run other business apps (all-in-one)?', ph: 'Select a requirement', opts: [['payment_only', 'No, payments only (Linux OS)'], ['all_in_one', 'Yes, other apps (Android OS)']] },
  { id: 'offline', label: 'Must it work if the internet connection fails?', ph: 'Select a requirement', opts: [['no', 'No, internet is reliable'], ['yes', 'Yes, offline processing is critical']] },
  { id: 'intl', label: 'Does the business serve many international tourists?', ph: 'Select an audience', opts: [['no', 'No, mainly local customers'], ['yes', 'Yes, frequently (needs DCC)']] },
  { id: 'printer', label: 'Is a built-in printer required?', ph: 'Select a feature', opts: [['yes', 'Yes, a printer is required'], ['no', 'No, a printer is not needed']] },
];
/* Playful per-question scenes for the right canvas. Using placeholder image per request. */
const SELECTOR_VISUALS = {
  country: { bg: 'https://media.ffycdn.net/eu/adyen/BJWqxK2T2NxT9Dzrm6fd.jpg', caption: 'We ship the right power supply & certifications for each country.' },
  industry: { bg: 'https://media.ffycdn.net/eu/adyen/BJWqxK2T2NxT9Dzrm6fd.jpg', caption: 'Every industry has a sweet-spot device mix.' },
  use_case: { bg: 'https://media.ffycdn.net/eu/adyen/BJWqxK2T2NxT9Dzrm6fd.jpg', caption: 'Counter, handheld, kiosk or phone — placement drives the form factor.' },
  card_read: { bg: 'https://media.ffycdn.net/eu/adyen/BJWqxK2T2NxT9Dzrm6fd.jpg', caption: 'Tap, chip and swipe — pick what the client needs to accept.' },
  input_type: { bg: 'https://media.ffycdn.net/eu/adyen/BJWqxK2T2NxT9Dzrm6fd.jpg', caption: 'Physical keypad or full touchscreen?' },
  os_type: { bg: 'https://media.ffycdn.net/eu/adyen/BJWqxK2T2NxT9Dzrm6fd.jpg', caption: 'Payments-only Linux, or all-in-one Android for business apps.' },
  offline: { bg: 'https://media.ffycdn.net/eu/adyen/BJWqxK2T2NxT9Dzrm6fd.jpg', caption: 'Keep trading even when the connection drops.' },
  intl: { bg: 'https://media.ffycdn.net/eu/adyen/BJWqxK2T2NxT9Dzrm6fd.jpg', caption: 'International shoppers? DCC lets them pay in their own currency.' },
  printer: { bg: 'https://media.ffycdn.net/eu/adyen/BJWqxK2T2NxT9Dzrm6fd.jpg', caption: 'Print paper receipts, or keep it digital.' },
};

function SelectorScene({ qid }) {
  const v = SELECTOR_VISUALS[qid] || SELECTOR_VISUALS.industry;
  return (
    <Col gap={20} style={{ alignItems: 'center', textAlign: 'center', maxWidth: 420 }} className="ns-fade" key={qid}>
      <div style={{ position: 'relative', width: 300, height: 300, borderRadius: 32, overflow: 'hidden', boxShadow: 'var(--b-shadow-high)' }}>
        <img src={v.bg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <span style={{ fontSize: 14, color: T.sub, lineHeight: '20px' }}>{v.caption}</span>
    </Col>
  );
}
function recommendTerminals(a) {
  const common = [];
  if (a.country) common.push(`Certified and shipped for ${a.country}`);
  if (a.intl === 'yes') common.push('Supports Dynamic Currency Conversion for international shoppers');
  if (a.offline === 'yes') common.push('Store-and-forward keeps you trading if the internet drops');
  if (a.card_read === 'contactless_only') common.push('Contactless-first acceptance');
  const mk = (o) => ({ price: 0, ...o, reasons: [...(o.reasons || []), ...common] });
  if (a.use_case === 'smartphone') return [mk({ model: 'Tap to Pay', type: 'SoftPOS', icon: 'mobile', price: 0, blurb: 'Accept contactless right on the seller’s own phone — no extra hardware.', specs: ['SoftPOS', 'Contactless', 'iOS & Android'], reasons: ['Runs on the seller’s smartphone', 'Zero hardware to ship'] })];
  if (a.use_case === 'unattended') return [mk({ model: 'NYC1', type: 'Unattended', icon: 'terminal-1', price: 249, blurb: 'Rugged contactless reader built for self-service kiosks.', specs: ['Unattended', 'Contactless', 'Vandal-resistant'], reasons: ['Designed for self-service kiosks', 'Contactless-only acceptance'] })];
  if (a.use_case === 'mobile') {
    if (a.os_type === 'all_in_one') return a.printer === 'yes'
      ? [mk({ model: 'S1F2', type: 'Android · portable', icon: 'mobile', price: 395, blurb: 'All-in-one Android handheld with a built-in printer.', specs: ['Android', 'Portable', '4G', 'Printer'], reasons: ['Android for other business apps', 'Built-in receipt printer', 'Portable, use next to the customer'] })]
      : [mk({ model: 'S1EL', type: 'Android · portable', icon: 'mobile', price: 349, blurb: 'Sleek Android handheld, big screen, no printer.', specs: ['Android', 'Portable', '4G'], reasons: ['Android for other business apps', 'Lightweight, no printer needed'] })];
    return a.printer === 'yes'
      ? [mk({ model: 'V400m', type: 'Portable', icon: 'mobile', price: 289, blurb: 'Portable Linux terminal with a built-in printer.', specs: ['Portable', 'Wi-Fi + 4G', 'Printer'], reasons: ['Payments-only, secure Linux OS', 'Built-in receipt printer', 'Portable'] })]
      : [mk({ model: 'e285p', type: 'Portable', icon: 'mobile', price: 199, blurb: 'Compact handheld card reader for payments only.', specs: ['Portable', 'Wi-Fi', 'Compact'], reasons: ['Payments-only, secure Linux OS', 'Compact and lightweight'] })];
  }
  // countertop (default)
  if (a.os_type === 'all_in_one') return [mk({ model: 'AMS1', type: 'Android · countertop', icon: 'terminal-2', price: 329, blurb: 'Android countertop terminal for the checkout.', specs: ['Android', 'Countertop', 'Ethernet + Wi-Fi'], reasons: ['Android for other business apps', 'Fixed counter placement', a.input_type === 'physical' ? 'Physical PIN pad' : 'Touchscreen entry'].filter(Boolean) })];
  return [mk({ model: 'P400 Plus', type: 'Countertop', icon: 'terminal-2', price: 299, blurb: 'Reliable Linux countertop terminal with PIN pad.', specs: ['Countertop', 'Ethernet + Wi-Fi', 'PIN pad'], reasons: ['Payments-only, secure Linux OS', 'Fixed counter placement', 'Physical PIN pad'] })];
}
/* Ask mode — infer selector answers from a free-text description of the business. */
function inferFilters(text) {
  const t = ' ' + text.toLowerCase() + ' ';
  const has = (re) => re.test(t);
  const out = {};
  const country = ['Netherlands', 'United Kingdom', 'United States', 'Germany', 'France', 'Spain', 'Australia', 'Japan'].find(c => t.includes(c.toLowerCase()));
  if (country) out.country = country;
  else if (has(/\buk\b|britain|england/)) out.country = 'United Kingdom';
  else if (has(/\bus\b|usa|america/)) out.country = 'United States';
  if (has(/coffee|caf[eé]|restaurant|\bbar\b|food|beverage|f&b|dining|pub|takeaway/)) out.industry = 'fnb';
  else if (has(/hotel|hospitality|resort/)) out.industry = 'hospitality';
  else if (has(/luxury|boutique|high-end|premium/)) out.industry = 'luxury';
  else if (has(/supermarket|grocery|department|large|big-box/)) out.industry = 'large_retail';
  else if (has(/shop|store|retail|market/)) out.industry = 'small_retail';
  if (has(/table|on the move|floor|queue|roam|handheld|portable|aisle|pay-at-table/)) out.use_case = 'mobile';
  else if (has(/kiosk|self-service|self service|unattended|vending/)) out.use_case = 'unattended';
  else if (has(/phone|smartphone|tap to pay|softpos|own device/)) out.use_case = 'smartphone';
  else if (has(/counter|checkout|till|fixed|lane|register/)) out.use_case = 'countertop';
  if (has(/contactless only|tap only|nfc only/)) out.card_read = 'contactless_only';
  else if (has(/chip|swipe|magstripe|insert/)) out.card_read = 'all';
  if (has(/keypad|pin pad|pin-pad|physical button/)) out.input_type = 'physical';
  else if (has(/touchscreen|touch screen|touch only/)) out.input_type = 'touchscreen';
  if (has(/android|other apps|loyalty|ordering app|all-in-one|all in one|business apps/)) out.os_type = 'all_in_one';
  else if (has(/payments only|payment only|linux/)) out.os_type = 'payment_only';
  if (has(/offline|no internet|connection fails|unreliable|patchy|spotty/)) out.offline = 'yes';
  if (has(/tourist|international|foreign|dcc|overseas|visitors/)) out.intl = 'yes';
  if (has(/print|receipt/)) out.printer = 'yes';
  return out;
}

function getMatches(vals) {
  return ORDER_PRODUCTS.filter(p => {
    if (vals.use_case && !p.filter.use.includes(vals.use_case)) return false;
    if (vals.card_read === 'contactless_only' && p.filter.card !== 'contactless_only') return false;
    if (vals.input_type && p.filter.input !== vals.input_type) return false;
    if (vals.os_type && p.filter.os !== vals.os_type) return false;
    if (vals.offline === 'yes' && p.filter.offline === 'no') return false;
    if (vals.printer && p.filter.print !== vals.printer) return false;
    return true;
  });
}

function TerminalSelector({ onBack, onOrder, notify }) {
  const [vals, setVals] = useState({});
  const [selected, setSelected] = useState([]); // selected product ids (multi-select)
  const [step, setStep] = useState('select');   // select · review · cart
  const [cartTab, setCartTab] = useState('devices');
  const [cart, setCart] = useState([]);         // added line items
  const [ship, setShip] = useState({ country: 'Netherlands' });
  const setShipField = (k, v) => setShip(s => ({ ...s, [k]: v }));
  const [detailItem, setDetailItem] = useState(null); // cart item detail modal
  const [delivery, setDelivery] = useState('standard');
  const [promo, setPromo] = useState('');
  const [promoOpen, setPromoOpen] = useState(false);
  const [orderRef, setOrderRef] = useState(null);
  const setCartQty = (i, q) => setCart(c => c.map((l, j) => j === i ? { ...l, qty: Math.max(1, q) } : l));
  const removeCartLine = (i) => setCart(c => c.filter((_, j) => j !== i));
  const [mode, setMode] = useState('ask');     // ask · filters
  const [panelOpen, setPanelOpen] = useState(true);
  const [askText, setAskText] = useState('');
  const runAsk = (text) => { const q = (text != null ? text : askText).trim(); if (!q) return; const inferred = inferFilters(q); setAskText(q); setVals(v => ({ ...v, ...inferred })); const n = Object.keys(inferred).length; notify && notify(n ? `Applied ${n} filter${n === 1 ? '' : 's'} from your description` : 'Couldn’t detect specifics — try mentioning where you sell and your industry'); };
  const ASK_EXAMPLES = ['Flagship apparel store with fixed checkout lanes and many tourists', 'Line-busting on the shop floor with handheld devices', 'Pop-up store taking payments on staff phones'];
  const answeredCount = SELECTOR_QUESTIONS.filter(q => vals[q.id]).length;
  const matches = getMatches(vals);
  const setVal = (id, v) => setVals(s => ({ ...s, [id]: v }));
  const reset = () => { setVals({}); setSelected([]); };
  const toggleSel = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const selectedProducts = ORDER_PRODUCTS.filter(p => selected.includes(p.id));
  const addToCart = (line) => { setCart(c => [...c, line]); notify && notify(`Added ${line.name} to cart`); };
  const cartCount = cart.reduce((n, i) => n + i.qty, 0);

  // AI reconciled recommendation — one answer that balances cost + technical fit, and spells out
  // what's in the box (incl. USB-A) and how fast it ships (the merchant's real blockers).
  const [recOpen, setRecOpen] = useState(false);
  const recPick = matches[0] || ORDER_PRODUCTS.find(p => p.id === 'sfo1') || ORDER_PRODUCTS[0];
  const recIsSoftPOS = recPick && recPick.type === 'SoftPOS';
  const recIncludes = (orderIncludes(recPick) || []).concat(recIsSoftPOS ? [] : ['USB-A to USB-C cable (the USB-A end plugs into most tills / POS)']);
  const recDelivery = recIsSoftPOS
    ? 'Available instantly — download the app, no hardware to ship'
    : 'Ships in 2 business days · free standard delivery, or next-day for €15';
  const recReason = recIsSoftPOS
    ? 'Zero hardware cost and instant to deploy for your setup — cheaper than any reader, with the same contactless acceptance.'
    : `Best balance of cost and fit at €${recPick.price}: covers ${(recPick.specs || []).join(', ')}. Cheaper readers drop offline/printing; pricier all-in-ones add screens you don't need here.`;
  const openRec = () => { setRecOpen(true); notify && notify('Reconciled cost, technical fit and delivery into one recommendation'); };

  // ---------- Step 1: select matching devices (multi-select) ----------
  if (step === 'select') {
    return (
      <FullPage title="Order devices" subtitle="Terminal selector · find the right device" tone="nav-devices"
        onBack={onBack} backLabel="Devices & locations" backIcon={<ArrowLeftGlyph />} onClose={onBack} bodyBg={T.page}
        actions={<Button variant="primary" iconRight="arrow-right" disabled={selected.length === 0} onClick={() => setStep('cart')}>Next{selected.length ? ` (${selected.length})` : ''}</Button>}>
        <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
          {/* collapsed rail — click the panel icon to reopen the control panel */}
          {!panelOpen && (
            <div style={{ width: 48, flexShrink: 0, borderRight: `1px solid ${T.sep}`, background: T.card, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
              <GlyphButton title="Show control panel" onClick={() => setPanelOpen(true)}><PanelToggleIcon /></GlyphButton>
            </div>
          )}
          {/* control panel (docked left) — header with Ask · Filters switch, body, footer */}
          {panelOpen && (
          <div style={{ width: 440, flexShrink: 0, borderRight: `1px solid ${T.sep}`, background: T.card, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Row style={{ padding: '8px 12px 8px 20px', borderBottom: `1px solid ${T.sepFaint}`, gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Choose your devices</span>
              <ModeSwitch mode={mode} setMode={setMode} opts={[{ v: 'ask', label: 'Ask', icon: 'sparkles' }, { v: 'filters', label: 'Filter', icon: 'filter' }]} />
              <GlyphButton title="Hide control panel" onClick={() => setPanelOpen(false)}><PanelToggleIcon flip /></GlyphButton>
            </Row>
            {mode === 'ask' ? (<>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: T.s4, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span style={{ fontSize: 13, color: T.sub, lineHeight: '19px' }}>Describe the business in your own words — I’ll pick the filters and narrow the list.</span>
                {/* AI reconciled recommendation — one answer: cost + fit + what's in the box + delivery */}
                <button type="button" className="ns-suggest" onClick={openRec}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', padding: '12px', border: `1px solid ${T.border}`, borderRadius: T.radiusM, background: T.card, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <Ico name="sparkles" size={16} color="#00A152" style={{ marginTop: 1, flexShrink: 0 }} />
                  <Col gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Recommend the best device for me</span>
                    <span style={{ fontSize: 12, color: T.sub, lineHeight: '16px' }}>One answer that balances cost and technical fit — with what’s in the box and how fast it ships.</span>
                  </Col>
                </button>
                {recOpen && recPick && (
                  <div style={{ ...surface, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }} className="ns-fade">
                    <Row gap={6} align="center">
                      <Ico name="sparkles" size={16} color="#00A152" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#00A152', letterSpacing: '0.02em' }}>RECOMMENDED FOR YOU</span>
                      <span style={{ flex: 1 }} />
                      <IconButton icon="cross" variant="tertiary" condensed title="Dismiss" onClick={() => setRecOpen(false)} />
                    </Row>
                    <Row gap={12} align="flex-start">
                      <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: T.radiusM, background: '#f7f7f8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {recPick.img ? <img src={recPick.img} alt={recPick.name} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'darken', transform: (ORDER_IMG_SCALE[recPick.id] || 1) !== 1 ? `scale(${ORDER_IMG_SCALE[recPick.id]})` : undefined }} /> : <Ico name={recPick.icon || 'terminal-2'} size={28} color={T.sub} />}
                      </div>
                      <Col gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{recPick.name}</span>
                        <span style={{ fontSize: 13, color: T.sub }}>{recPick.type} · {recPick.price > 0 ? `€${recPick.price}` : 'No charge'}</span>
                      </Col>
                    </Row>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div><span style={{ fontSize: 12, fontWeight: 600, color: T.faint }}>Why this one</span><div style={{ fontSize: 13, color: T.ink, lineHeight: '18px' }}>{recReason}</div></div>
                      <div><span style={{ fontSize: 12, fontWeight: 600, color: T.faint }}>Delivery</span><div style={{ fontSize: 13, color: T.ink, lineHeight: '18px' }}>{recDelivery}</div></div>
                      <div><span style={{ fontSize: 12, fontWeight: 600, color: T.faint }}>What’s in the box</span>
                        <Col gap={4} style={{ marginTop: 4 }}>
                          {recIncludes.map(x => <Row key={x} gap={8} align="flex-start"><Ico name="checkmark" size={15} color="var(--b-color-decorative-green)" /><span style={{ fontSize: 13, color: T.sub, lineHeight: '17px' }}>{x}</span></Row>)}
                        </Col>
                      </div>
                    </div>
                    <Row gap={8}>
                      <Button variant="primary" iconLeft={selected.includes(recPick.id) ? 'checkmark' : 'plus'} onClick={() => { if (!selected.includes(recPick.id)) toggleSel(recPick.id); notify && notify(`Selected ${recPick.name}`); }}>{selected.includes(recPick.id) ? 'Selected' : 'Select this device'}</Button>
                      <Button variant="secondary" onClick={() => setRecOpen(false)}>Compare alternatives</Button>
                    </Row>
                  </div>
                )}
                <Col gap={1}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.faint, padding: '0 10px 4px' }}>Try</span>
                  {ASK_EXAMPLES.map(ex => (
                    <button key={ex} className="ns-suggest" onClick={() => runAsk(ex)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', border: 0, background: 'transparent', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: T.ink, fontSize: 14, lineHeight: '18px' }}>
                      <Ico name="sparkles" size={16} color={T.sub} /><span style={{ flex: 1 }}>{ex}</span><Ico name="arrow-right" size={16} color={T.faint} />
                    </button>
                  ))}
                </Col>
                {answeredCount > 0 && (
                  <Col gap={8} style={{ marginTop: 4, paddingTop: 14, borderTop: `1px solid ${T.sepFaint}` }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.faint }}>Applied filters ({answeredCount})</span>
                    <Row gap={6} style={{ flexWrap: 'wrap' }}>
                      {SELECTOR_QUESTIONS.filter(q => vals[q.id]).map(q => {
                        const opt = q.opts.find(([v]) => v === vals[q.id]);
                        return <Chip key={q.id} label={opt ? opt[1] : vals[q.id]} condensed onRemove={() => setVal(q.id, '')} />;
                      })}
                    </Row>
                    <button onClick={() => setMode('filters')} style={{ alignSelf: 'flex-start', border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--b-color-link-primary)', padding: '2px 0' }}>Fine-tune in Filters →</button>
                  </Col>
                )}
              </div>
              {/* pinned composer — same PromptBox used by Device Studio / Fleet AI */}
              <div style={{ flexShrink: 0, padding: T.s4, borderTop: `1px solid ${T.sep}` }}>
                <PromptBox q={askText} setQ={setAskText} onSend={() => runAsk()} thinking={false}
                  models={ASK_CONTEXTS.devices.models} defaultMode={ASK_CONTEXTS.devices.defaultMode}
                  placeholder="e.g. Coffee shop, table service, tips, some tourists"
                  onAdd={(v) => notify && notify((NL_ADD_ITEMS.find(i => i.value === v) || {}).label + ' — coming soon')} />
              </div>
            </>) : (<>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {SELECTOR_QUESTIONS.map((q, i) => (
                  <Col key={q.id} gap={6} className="ns-fade">
                    <span style={{ fontSize: 13, color: T.sub }}>{i + 1}. {q.label}</span>
                    <Dropdown value={vals[q.id] || ''} placeholder={`— ${q.ph} —`} onChange={(v) => setVal(q.id, v)} options={q.opts.map(([value, label]) => ({ value, label }))} />
                  </Col>
                ))}
              </div>
              <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.sepFaint}`, flexShrink: 0 }}>
                <Button variant="tertiary" condensed iconLeft="refresh" onClick={() => { reset(); setAskText(''); }} disabled={answeredCount === 0 && selected.length === 0}>Reset</Button>
              </div>
            </>)}
          </div>
          )}
          {/* canvas — matching devices grid (click to select) */}
          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 40, background: T.page }}>
            <div style={{ maxWidth: 840, margin: '0 auto' }}>
              <Row style={{ marginBottom: 24, justifyContent: 'space-between' }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{matches.length} matching device{matches.length === 1 ? '' : 's'}</span>
                <span style={{ fontSize: 13, color: T.sub }}>{selected.length} selected</span>
              </Row>
              {matches.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: T.s4 }}>
                  {matches.map(p => {
                    const on = selected.includes(p.id);
                    return (
                      <div key={p.id} className="ns-fade" onClick={() => toggleSel(p.id)}
                        style={{ ...surface, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer', border: on ? '2px solid var(--b-color-outline-primary-active, var(--b-color-label-primary))' : `1px solid ${T.border}`, position: 'relative' }}>
                        {on && <span style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: '50%', background: 'var(--b-color-label-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Ico name="checkmark" size={14} color="#fff" /></span>}
                        <OrderProductImg p={p} />
                        <Col gap={2}>
                          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{p.name}</span>
                          <span style={{ fontSize: 13, color: T.sub }}>{p.type}</span>
                        </Col>
                        <Button variant={on ? 'primary' : 'secondary'} condensed iconLeft={on ? 'checkmark' : undefined} onClick={(e) => { e.stopPropagation(); toggleSel(p.id); }}>{on ? 'Selected' : 'Select'}</Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon="search" title="No matching devices" description="Try removing or changing some of your answers on the left." />
              )}
            </div>
          </div>
        </div>
      </FullPage>
    );
  }

  // ---------- Step 4: order confirmed — thank-you page ----------
  if (step === 'placed') {
    const lines = cart.length ? cart : selectedProducts.map(p => ({ id: p.id, name: p.name, qty: 1, price: p.price }));
    const money = (n) => `€ ${n.toFixed(2)}`;
    const subtotal = lines.reduce((s, l) => s + (l.price || 0) * l.qty, 0);
    const shipCost = delivery === 'express' ? 15 : 0;
    const total = subtotal + shipCost + (subtotal + shipCost) * 0.21;
    const units = lines.reduce((n, l) => n + l.qty, 0);
    const eta = delivery === 'express' ? '1–2 business days' : '3–5 business days';
    const dest = [ship.city, ship.country].filter(Boolean).join(', ') || ship.country;
    return (
      <FullPage title="Order confirmed" tone="nav-devices" onBack={onBack} backLabel="Devices & locations" backIcon={<ArrowLeftGlyph />} onClose={onBack} bodyBg={T.page}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
          <img className="ns-pop" src="assets/tx/order-success.svg" alt="" style={{ width: 208, height: 208, objectFit: 'contain', display: 'block' }} />
          <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 8 }}>Thank you — your order is confirmed</span>
          <span style={{ fontSize: 14, color: T.sub, lineHeight: '21px', maxWidth: 420 }}>We’ve emailed your receipt{ship.email ? ` to ${ship.email}` : ''}. You can track fulfilment any time under Orders &amp; returns.</span>
          {/* order recap card */}
          <div style={{ ...surface, width: '100%', padding: 20, marginTop: 20, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Col gap={2}><span style={{ fontSize: 12, color: T.faint }}>Order number</span><span className="ns-num" style={{ fontSize: 15, fontWeight: 600 }}>{orderRef}</span></Col>
              <Tag label="Confirmed" variant="green" />
            </Row>
            <div style={{ borderTop: `1px solid ${T.sepFaint}` }} />
            <Row style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: T.sub }}>Items</span><span style={{ fontSize: 13 }}>{units} device{units === 1 ? '' : 's'}</span></Row>
            <Row style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: T.sub }}>Total paid</span><span className="ns-num" style={{ fontSize: 13, fontWeight: 600 }}>{money(total)}</span></Row>
            {dest && <Row style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: T.sub }}>Shipping to</span><span style={{ fontSize: 13 }}>{dest}</span></Row>}
            <Row style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: T.sub }}>Estimated delivery</span><span style={{ fontSize: 13 }}>{eta}</span></Row>
          </div>
          <Row gap={10} style={{ marginTop: 20 }}>
            <Button variant="secondary" onClick={() => notify && notify('Opening Orders & returns…')}>View order</Button>
            <Button variant="primary" onClick={onBack}>Done</Button>
          </Row>
        </div>
      </FullPage>
    );
  }

  // ---------- Step 3: view cart → checkout (contact · shipping · delivery + summary) ----------
  if (step === 'summary') {
    const allItems = [...ORDER_PRODUCTS, ...ORDER_ACCESSORIES, ...ORDER_KITS];
    const editable = cart.length > 0;
    const lines = editable ? cart : selectedProducts.map(p => ({ id: p.id, name: p.name, qty: 1, price: p.price }));
    const lineImg = (id) => (allItems.find(x => x.id === id) || {}).img;
    const money = (n) => `€ ${n.toFixed(2)}`;
    const subtotal = lines.reduce((s, l) => s + (l.price || 0) * l.qty, 0);
    const shipCost = delivery === 'express' ? 15 : 0;
    const vat = (subtotal + shipCost) * 0.21;
    const total = subtotal + shipCost + vat;
    // plain function (not a component) so inputs keep focus while typing
    const field = (label, k, placeholder, half) => (
      <Col key={k} gap={6} style={{ width: half ? 'calc(50% - 8px)' : '100%' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{label}</span>
        <input value={ship[k] || ''} onChange={(e) => setShipField(k, e.target.value)} placeholder={placeholder}
          style={{ height: 36, border: `1px solid #8C959D`, borderRadius: 8, padding: '0 12px', fontFamily: 'inherit', fontSize: 14, background: T.card, color: T.ink, outline: 'none', boxSizing: 'border-box', width: '100%' }} />
      </Col>
    );
    const sectionTitle = (n, title, sub) => (
      <Col gap={4}>
        <Row gap={10} align="center">
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--b-color-background-secondary)', color: T.ink, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{n}</span>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</span>
        </Row>
        {sub && <span style={{ fontSize: 12, color: T.faint, marginLeft: 34 }}>{sub}</span>}
      </Col>
    );
    const deliveryOpt = (id, label, sub, price) => {
      const on = delivery === id;
      return (
        <button key={id} onClick={() => setDelivery(id)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', border: `1px solid ${on ? 'var(--b-color-label-primary)' : T.border}`, borderRadius: T.radiusM, background: T.card, padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: on ? 'inset 0 0 0 1px var(--b-color-label-primary)' : 'none' }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${on ? 'var(--b-color-label-primary)' : '#8C959D'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--b-color-label-primary)' }} />}</span>
          <Col gap={2} style={{ flex: 1, minWidth: 0 }}><span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span><span style={{ fontSize: 12, color: T.faint }}>{sub}</span></Col>
          <span className="ns-num" style={{ fontSize: 14, fontWeight: 500, color: price === 0 ? 'var(--b-color-label-success)' : T.ink }}>{price === 0 ? 'Free' : money(price)}</span>
        </button>
      );
    };
    const placeOrder = () => { setOrderRef('ADY-' + String(Date.now()).slice(-8)); setStep('placed'); };
    return (
      <FullPage title="Checkout" subtitle={`${lines.reduce((n, l) => n + l.qty, 0)} item${lines.reduce((n, l) => n + l.qty, 0) === 1 ? '' : 's'} · secure order`} tone="nav-devices"
        onBack={() => setStep('cart')} backLabel="Cart" backIcon={<ArrowLeftGlyph />} onClose={onBack} bodyBg={T.page}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: `${T.s6}px 24px`, display: 'flex', gap: T.s7, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* left — contact · shipping · delivery */}
          <div style={{ flex: '1 1 500px', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 40 }}>
            {/* contact */}
            <Col gap={12}>
              {sectionTitle(1, 'Contact', 'For order updates and tracking.')}
              {field('Email', 'email', 'you@company.com')}
            </Col>
            {/* shipping */}
            <Col gap={12}>
              {sectionTitle(2, 'Shipping address', 'Where should we send these devices?')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gap={16} style={{ flexWrap: 'wrap' }}>
                  {field('Full name', 'name', 'e.g. Eva Hansen', true)}
                  {field('Company (optional)', 'company', 'Uniqlo APAC', true)}
                </Row>
                {field('Address line 1', 'addr1', 'Street and number')}
                {field('Address line 2 (optional)', 'addr2', 'Apartment, suite, unit')}
                <Row gap={16} style={{ flexWrap: 'wrap' }}>
                  {field('City', 'city', 'Tokyo', true)}
                  {field('Postal code', 'zip', '150-0002', true)}
                </Row>
                <Row gap={16} style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <Col gap={6} style={{ width: 'calc(50% - 8px)' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>Country</span>
                    <Dropdown value={ship.country} options={ORDER_COUNTRIES.map(c => ({ value: c, label: c }))} onChange={(v) => setShipField('country', v)} />
                  </Col>
                  {field('Phone', 'phone', '+31 6 1234 5678', true)}
                </Row>
              </div>
            </Col>
            {/* delivery */}
            <Col gap={12}>
              {sectionTitle(3, 'Delivery method')}
              <Col gap={8}>
                {deliveryOpt('standard', 'Standard delivery', '3–5 business days', 0)}
                {deliveryOpt('express', 'Express delivery', '1–2 business days', 15)}
              </Col>
            </Col>
          </div>
          {/* right — sticky order summary (borderless · Stripe-style) */}
          <div style={{ flex: '1 1 340px', minWidth: 300 }}>
            <div style={{ background: '#F6F7F9', borderRadius: T.radiusL, padding: 24, display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 20 }}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Order summary</span>
                <button onClick={() => setStep('cart')} style={{ border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--b-color-link-primary)' }}>Edit</button>
              </Row>
              <Col gap={24}>
                {lines.length === 0 && <span style={{ fontSize: 13, color: T.faint }}>Your cart is empty.</span>}
                {lines.map((l, i) => (
                  <Row key={l.id + i} gap={12} align="center">
                    <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 8, background: '#FFFFFF', border: `1px solid ${T.sepFaint}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {lineImg(l.id) ? <img src={lineImg(l.id)} alt={l.name} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'darken', transform: (ORDER_IMG_SCALE[l.id] || 1) !== 1 ? `scale(${ORDER_IMG_SCALE[l.id]})` : undefined }} /> : <Ico name="package" size={20} color={T.sub} />}
                    </div>
                    <Col gap={3} style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{l.name}</span>
                      {editable ? (
                        <Row gap={8} align="center">
                          <Row gap={2} align="center">
                            <button onClick={() => setCartQty(i, l.qty - 1)} className="ns-suggest" title="Decrease" style={{ width: 20, height: 20, border: 0, background: 'transparent', cursor: 'pointer', borderRadius: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><Ico name="minus" size={12} color={T.sub} /></button>
                            <span className="ns-num" style={{ minWidth: 16, textAlign: 'center', fontSize: 12, color: T.sub }}>{l.qty}</span>
                            <button onClick={() => setCartQty(i, l.qty + 1)} className="ns-suggest" title="Increase" style={{ width: 20, height: 20, border: 0, background: 'transparent', cursor: 'pointer', borderRadius: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><Ico name="plus" size={12} color={T.sub} /></button>
                          </Row>
                          {l.variant && <span style={{ fontSize: 12, color: T.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {l.variant}</span>}
                          <button onClick={() => removeCartLine(i)} title="Remove" style={{ border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: T.faint }}>Remove</button>
                        </Row>
                      ) : <span style={{ fontSize: 12, color: T.faint }}>Qty {l.qty}{l.variant ? ` · ${l.variant}` : ''}</span>}
                    </Col>
                    <span className="ns-num" style={{ fontSize: 14, fontWeight: 500 }}>{l.price > 0 ? money(l.price * l.qty) : '—'}</span>
                  </Row>
                ))}
              </Col>
              {/* discount — hidden behind a link until needed (Stripe-style) */}
              {promoOpen ? (
                <Row gap={8} style={{ alignItems: 'center' }}>
                  <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Discount code" autoFocus
                    style={{ flex: 1, height: 36, border: `1px solid #8C959D`, borderRadius: 8, padding: '0 12px', fontFamily: 'inherit', fontSize: 14, background: T.card, color: T.ink, outline: 'none', boxSizing: 'border-box' }} />
                  <Button variant="secondary" onClick={() => notify && notify(promo ? `Code “${promo}” isn’t valid` : 'Enter a discount code')}>Apply</Button>
                </Row>
              ) : (
                <button onClick={() => setPromoOpen(true)} style={{ alignSelf: 'flex-start', border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--b-color-link-primary)', padding: 0 }}>Add discount code</button>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 20, borderTop: `1px solid ${T.sepFaint}` }}>
                <Row style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: T.sub }}>Subtotal</span><span className="ns-num" style={{ fontSize: 13 }}>{money(subtotal)}</span></Row>
                <Row style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: T.sub }}>Shipping</span><span className="ns-num" style={{ fontSize: 13, color: shipCost === 0 ? 'var(--b-color-label-success)' : T.ink }}>{shipCost === 0 ? 'Free' : money(shipCost)}</span></Row>
                <Row style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: T.sub }}>VAT (21%)</span><span className="ns-num" style={{ fontSize: 13 }}>{money(vat)}</span></Row>
                <Row style={{ justifyContent: 'space-between', marginTop: 4, paddingTop: 12, borderTop: `1px solid ${T.sepFaint}` }}><span style={{ fontSize: 16, fontWeight: 600 }}>Total due</span><span className="ns-num" style={{ fontSize: 16, fontWeight: 600 }}>{money(total)}</span></Row>
              </div>
              <Button variant="primary" iconLeft="lock" disabled={lines.length === 0} onClick={placeOrder} style={{ width: '100%' }}>Place order · {money(total)}</Button>
              <Row gap={6} align="center" style={{ justifyContent: 'center' }}>
                <Ico name="shield-checkmark" size={14} color={T.faint} />
                <span style={{ fontSize: 11, color: T.faint }}>Secure checkout · billed to your Adyen account</span>
              </Row>
            </div>
          </div>
        </div>
      </FullPage>
    );
  }

  // ---------- Step 2: add to cart (Devices · Accessories · Device kits) ----------
  return (
    <FullPage title="Add to cart" subtitle="Devices, accessories & hardware kits" tone="nav-devices"
      onBack={() => setStep('select')} backLabel="Terminal selector" backIcon={<ArrowLeftGlyph />} onClose={onBack} bodyBg={T.page}
      actions={<Button variant={cartCount ? 'primary' : 'secondary'} iconLeft="shopping-bag" onClick={() => cartCount ? setStep('summary') : notify && notify('Your cart is empty')}>View cart{cartCount ? ` (${cartCount})` : ''}</Button>}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: `${T.s6}px 24px` }}>
        <UnderlineTabs value={cartTab} onChange={setCartTab} tabs={[{ value: 'devices', label: 'Devices' }, { value: 'accessories', label: 'Accessories' }, { value: 'kits', label: 'Device kits' }]} />
        <Col gap={T.s4} style={{ marginTop: T.s5 }}>
          {cartTab === 'devices' && (selectedProducts.length
            ? selectedProducts.map(p => <CartRow key={p.id} item={p} onAdd={addToCart} notify={notify} onOpen={setDetailItem} />)
            : <EmptyState icon="package" title="No devices selected" description="Go back to add device models to your order." />)}
          {cartTab === 'accessories' && ORDER_ACCESSORIES.map(a => <CartRow key={a.id} item={a} onAdd={addToCart} notify={notify} onOpen={setDetailItem} />)}
          {cartTab === 'kits' && ORDER_KITS.map(k => <CartRow key={k.id} item={k} onAdd={addToCart} notify={notify} onOpen={setDetailItem} />)}
        </Col>
      </div>
      {detailItem && <CartDetailModal item={detailItem} onClose={() => setDetailItem(null)} onAdd={addToCart} />}
    </FullPage>
  );
}

/* ============================================================= ORDER FLOW
   Full-page "Add devices" purchasing flow (matches Adyen Orders & returns):
   region → product catalogue → product detail → checkout. All mock data. */
const ORDER_COUNTRIES = ['Netherlands', 'United Kingdom', 'United States', 'Germany', 'France', 'Spain', 'Australia', 'Japan'];
const ORDER_PRODUCTS = [
  { id: 's1f2', name: 'S1F2', type: 'Mobile', acc: 12, price: 395, blurb: 'An all-in-one Android device with printing power', specs: ['Portable', '2.4 and 5 GHz', '4G'], icon: 'mobile', img: 'assets/devices/s1f2.webp',
    filter: { use: ['mobile'], card: 'all', input: 'touchscreen', os: 'all_in_one', offline: 'yes', print: 'yes' } },
  { id: 'ams1', name: 'AMS1', type: 'Mobile', acc: 5, price: 249, blurb: 'Designed by Adyen; your all-in-one terminal running on Android.', specs: ['Portable', 'Wi-Fi', '4G'], icon: 'mobile', img: 'assets/devices/ams1.png',
    filter: { use: ['mobile'], card: 'all', input: 'touchscreen', os: 'all_in_one', offline: 'yes', print: 'no' } },
  { id: 'nyc1', name: 'NYC1', type: 'Mobile', acc: 0, price: 79, blurb: 'Designed by us, inspired by you; a card reader for businesses on the move.', specs: ['Portable', 'Bluetooth'], icon: 'terminal-1', img: 'assets/devices/nyc1.png',
    filter: { use: ['mobile', 'unattended'], card: 'contactless_only', input: 'touchscreen', os: 'payment_only', offline: 'no', print: 'no' } },
  { id: 'sfo1', name: 'Adyen SFO1', type: 'Countertop', acc: 10, price: 329, blurb: 'Payment, branding, and customer engagement — all in one terminal.', specs: ['Countertop', 'Ethernet', 'Wi-Fi'], icon: 'terminal-2', img: 'assets/devices/sfo1.png',
    filter: { use: ['countertop'], card: 'all', input: 'touchscreen', os: 'all_in_one', offline: 'yes', print: 'yes' } },
  { id: 'v400m', name: 'V400m', type: 'Mobile', acc: 6, price: 289, blurb: 'Go-to portable, with fast printing and many connections.', specs: ['Portable', 'Wi-Fi', '4G'], icon: 'mobile', img: 'assets/devices/v400m.png',
    filter: { use: ['mobile'], card: 'all', input: 'physical', os: 'payment_only', offline: 'yes', print: 'yes' } },
  { id: 'v400c', name: 'V400c Plus', type: 'Countertop', acc: 6, price: 309, blurb: 'Standalone countertop, with added printer.', specs: ['Countertop', 'Wi-Fi', 'Ethernet'], icon: 'terminal-2', img: 'assets/devices/v400c.png',
    filter: { use: ['countertop'], card: 'all', input: 'physical', os: 'payment_only', offline: 'yes', print: 'yes' } },
  { id: 'e285p', name: 'e285', type: 'Mobile', acc: 2, price: 199, blurb: 'Pocket-sized and mobile, for personal shopping.', specs: ['Portable', 'Wi-Fi'], icon: 'mobile', img: 'assets/devices/e285p.png',
    filter: { use: ['mobile'], card: 'all', input: 'physical', os: 'payment_only', offline: 'yes', print: 'no' } },
  { id: 'm450', name: 'M450', type: 'Countertop', acc: 5, price: 299, blurb: 'Impact, insights and two-way interactions.', specs: ['Countertop', 'Ethernet'], icon: 'terminal-2', img: 'assets/devices/m450.png',
    filter: { use: ['countertop'], card: 'all', input: 'physical', os: 'payment_only', offline: 'yes', print: 'no' } },
  { id: 's1u2', name: 'S1U2', type: 'Unattended', acc: 3, price: 399, blurb: 'All-in-one unattended Android device.', specs: ['Unattended', 'Android'], icon: 'terminal-1', img: 'assets/devices/s1u2.png',
    filter: { use: ['unattended'], card: 'all', input: 'touchscreen', os: 'all_in_one', offline: 'yes', print: 'no' } },
  { id: 'p630', name: 'P630', type: 'Countertop', acc: 5, price: 349, blurb: 'Premium design, full of features and ultra-reliable.', specs: ['Countertop', 'Ethernet'], icon: 'terminal-2', img: 'assets/devices/p630.png',
    filter: { use: ['countertop'], card: 'all', input: 'physical', os: 'payment_only', offline: 'yes', print: 'no' } },
  { id: 'ttp', name: 'Tap to Pay on Android', type: 'SoftPOS', acc: 0, price: 0, blurb: 'Accept contactless right on the seller’s own Android phone.', specs: ['SoftPOS', 'Android'], icon: 'mobile', img: 'assets/devices/ttp.png',
    filter: { use: ['smartphone'], card: 'contactless_only', input: 'touchscreen', os: 'all_in_one', offline: 'no', print: 'no' } },
  { id: 'ttp-ios', name: 'Tap to Pay on iPhone', type: 'SoftPOS', acc: 0, price: 0, blurb: 'Accept contactless right on the seller’s own iPhone.', specs: ['SoftPOS', 'iOS'], icon: 'mobile', img: 'assets/devices/ttp-ios.png',
    filter: { use: ['smartphone'], card: 'contactless_only', input: 'touchscreen', os: 'all_in_one', offline: 'no', print: 'no' } },
];
/* Accessories & device kits for the add-to-cart step (mock, images pulled from adyen-main). */
const ORDER_ACCESSORIES = [
  { id: 'charging-base', name: 'S1F2 Charging Base', sku: '10091003', price: 37.70, img: 'assets/devices/acc/charging-base.png', variants: ['With 2 meter power cord', 'Base only'], desc: 'Desk charging dock that keeps the S1F2 powered and ready between shifts.' },
  { id: 'power-cable', name: 'Power cable', sku: 'CBL435-011', price: 12.50, img: 'assets/devices/acc/power-cable.png', variants: ['EU plug', 'UK plug', 'US plug'], desc: 'Replacement mains power cable for countertop terminals.' },
  { id: 'multi-dock', name: 'Multi-terminal dock', sku: '10084018', price: 89.00, img: 'assets/devices/acc/dock.png', variants: ['3-bay', '6-bay'], desc: 'Charge and store several handhelds together in the back office.' },
  { id: 'battery', name: 'Spare battery pack', sku: 'BPK475-001', price: 45.00, img: 'assets/devices/acc/battery.png', variants: ['Standard capacity'], desc: 'Keep a charged battery on hand for uninterrupted all-day trading.' },
];
const ORDER_KITS = [
  { id: 'kit-retail', name: 'Retail lane kit', price: 459, img: 'assets/devices/sfo1.png', desc: 'Adyen SFO1 countertop + charging base + power cable — everything for a fixed checkout lane.' },
  { id: 'kit-mobile', name: 'Mobile seller kit', price: 429, img: 'assets/devices/s1f2.webp', desc: 'S1F2 handheld + spare battery + charging base for floor selling and queue-busting.' },
  { id: 'kit-hospitality', name: 'Hospitality kit', price: 349, img: 'assets/devices/v400m.png', desc: 'V400m portable + charging base — pay-at-table for restaurants, bars and cafés.' },
];
function QtyStepper({ value, onChange }) {
  return (
    <Row gap={0} style={{ border: `1px solid ${T.borderStrong}`, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
      <button onClick={() => onChange(Math.max(1, value - 1))} style={{ width: 32, height: 34, border: 0, background: T.card, cursor: 'pointer', color: T.ink, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Ico name="minus" size={14} color={T.sub} /></button>
      <span style={{ minWidth: 34, textAlign: 'center', fontSize: 14, fontWeight: 500, lineHeight: '34px', borderLeft: `1px solid ${T.sepFaint}`, borderRight: `1px solid ${T.sepFaint}` }}>{value}</span>
      <button onClick={() => onChange(value + 1)} style={{ width: 32, height: 34, border: 0, background: T.card, cursor: 'pointer', color: T.ink, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Ico name="plus" size={14} color={T.sub} /></button>
    </Row>
  );
}
/* What ships in the box — used by the product detail modal. */
function orderIncludes(item) {
  if (item.includes) return item.includes;
  if (item.type === 'SoftPOS') return ['App download link', 'Onboarding guide', 'No hardware — runs on your phone'];
  if (item.id && item.id.startsWith('kit-')) return null; // kits describe contents in their text
  if (item.type) return ['Terminal device', 'Power adapter', 'Charging / data cable', 'Quick-start guide'];
  return null;
}
/* Product detail modal — bigger image, full explanation, specs, variant, qty, add. */
function CartDetailModal({ item, onClose, onAdd }) {
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState(item && item.variants ? item.variants[0] : null);
  if (!item) return null;
  const includes = orderIncludes(item);
  return (
    <Modal open onClose={onClose} title={item.name} width={640}
      footer={<Row style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <span className="ns-num" style={{ fontSize: 18, fontWeight: 600 }}>{item.price > 0 ? `€ ${item.price.toFixed(2)}` : 'No charge'}</span>
        <Row gap={10} align="center"><QtyStepper value={qty} onChange={setQty} /><Button variant="primary" iconLeft="shopping-bag" onClick={() => { onAdd({ id: item.id, name: item.name, qty, variant, price: item.price }); onClose(); }}>Add to cart</Button></Row>
      </Row>}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ width: 200, height: 200, flexShrink: 0, borderRadius: T.radiusM, background: '#f7f7f8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {item.img ? <img src={item.img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'darken', transform: (ORDER_IMG_SCALE[item.id] || 1) !== 1 ? `scale(${ORDER_IMG_SCALE[item.id]})` : undefined }} /> : <Ico name={item.icon || 'package'} size={64} color={T.sub} />}
        </div>
        <Col gap={12} style={{ flex: 1, minWidth: 240 }}>
          <Row gap={8} align="center" style={{ flexWrap: 'wrap' }}>
            {item.type && <Tag label={item.type} variant="blue" />}
            {item.sku && <span className="ns-num" style={{ fontSize: 12, color: T.faint }}>{item.sku}</span>}
          </Row>
          <span style={{ fontSize: 14, color: T.ink, lineHeight: '21px' }}>{item.desc || item.blurb}</span>
          {item.specs && <Row gap={6} style={{ flexWrap: 'wrap' }}>{item.specs.map(s => <Tag key={s} label={s} variant="grey" />)}</Row>}
          {item.variants && <Col gap={6}><span style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>Option</span><div style={{ maxWidth: 320 }}><Dropdown value={variant} options={item.variants.map(v => ({ value: v, label: v }))} onChange={setVariant} /></div></Col>}
          {includes && <Col gap={6} style={{ marginTop: 2 }}><span style={{ fontSize: 12, fontWeight: 600, color: T.faint }}>What’s included</span>{includes.map(x => <Row key={x} gap={8} align="flex-start"><Ico name="checkmark" size={16} color="var(--b-color-decorative-green)" /><span style={{ fontSize: 13, color: T.sub }}>{x}</span></Row>)}</Col>}
        </Col>
      </div>
    </Modal>
  );
}
/* One purchasable row (device / accessory / kit) — picture · details · variant · qty · add. */
function CartRow({ item, onAdd, notify, onOpen }) {
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState(item.variants ? item.variants[0] : null);
  return (
    <div style={{ ...surface, padding: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <button onClick={() => onOpen && onOpen(item)} title={`View ${item.name} details`} style={{ width: 96, height: 96, flexShrink: 0, borderRadius: T.radiusM, background: '#f7f7f8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: 0, cursor: 'pointer', padding: 0 }}>
        {item.img ? <img src={item.img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'darken', transform: (ORDER_IMG_SCALE[item.id] || 1) !== 1 ? `scale(${ORDER_IMG_SCALE[item.id]})` : undefined }} /> : <Ico name={item.icon || 'package'} size={40} color={T.sub} />}
      </button>
      <Col gap={6} style={{ flex: 1, minWidth: 0 }}>
        <Col gap={2}>
          <button onClick={() => onOpen && onOpen(item)} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: T.ink }}>{item.name}</button>
          {item.sku && <span className="ns-num" style={{ fontSize: 12, color: T.faint }}>{item.sku}</span>}
        </Col>
        <span style={{ fontSize: 13, color: T.sub, lineHeight: '18px' }}>{item.desc || item.blurb}</span>
        <button onClick={() => onOpen && onOpen(item)} style={{ alignSelf: 'flex-start', border: 0, background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--b-color-link-primary)' }}>View details</button>
        {item.variants && <div style={{ maxWidth: 320 }}><Dropdown value={variant} options={item.variants.map(v => ({ value: v, label: v }))} onChange={setVariant} condensed /></div>}
        <Row style={{ marginTop: 4, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span className="ns-num" style={{ fontSize: 16, fontWeight: 600 }}>{item.price > 0 ? `€ ${item.price.toFixed(2)}` : 'No charge'}</span>
          <Row gap={10} align="center">
            <QtyStepper value={qty} onChange={setQty} />
            <Button variant="primary" iconLeft="shopping-bag" onClick={() => onAdd({ id: item.id, name: item.name, qty, variant, price: item.price })}>Add to cart</Button>
          </Row>
        </Row>
      </Col>
    </div>
  );
}
/* Delivered-but-not-yet-assigned devices awaiting activation (mock). */
const ACTIVATE_PENDING = [
  { model: 'S1F2', icon: 'mobile', type: 'Mobile', spec: 'Android · portable · 4G · built-in printer', serial: '0000CC-18B4-2231' },
  { model: 'V400m', icon: 'mobile', type: 'Mobile', spec: 'Portable · Wi-Fi + 4G · colour touchscreen', serial: '0001682249-1057' },
  { model: 'P400 Plus', icon: 'terminal-2', type: 'Countertop', spec: 'Countertop · Ethernet + Wi-Fi · PIN pad', serial: '0001682221-7781' },
  { model: 'AMS 1', icon: 'mobile', type: 'Mobile', spec: 'Android · portable · Wi-Fi', serial: '0000CC-18B4-9942' },
  { model: 'NYC 1', icon: 'terminal-1', type: 'Mobile', spec: 'Pocket reader · Bluetooth · pairs with phone', serial: '0000CC-22A1-3380' },
];
// Per-device zoom so every render fills the tile evenly. Clean product photos ship with a lot
// of surrounding whitespace (so they look tiny); tightly-cropped Verifone photos already fill.
const ORDER_IMG_SCALE = { nyc1: 1.85, ams1: 1.5, s1u2: 1.55, ttp: 1.35, 'ttp-ios': 1.35, s1f2: 1.4, sfo1: 1.3 };
function OrderProductImg({ p, size = 48, h = 140 }) {
  const [failed, setFailed] = useState(false);
  const scale = ORDER_IMG_SCALE[p.id] || 1;
  if (p.img && !failed) return <div style={{ height: h, borderRadius: T.radiusM, background: '#f7f7f8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><img src={p.img} alt={p.name} onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'darken', transform: scale !== 1 ? `scale(${scale})` : undefined }} /></div>;
  return <div style={{ height: h, borderRadius: T.radiusM, background: 'var(--b-color-background-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ico name={p.icon || 'terminal-2'} size={size} color={T.sub} /></div>;
}
function OrderFlow({ onBack, notify }) {
  const [step, setStep] = useState('region'); // region · products · detail · checkout
  const [region, setRegion] = useState('');
  const [ptab, setPtab] = useState('terminals');
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState(0);
  const openDetail = (p) => { setProduct(p); setQty(1); setStep('detail'); };
  const cartBtn = <Button variant={cart ? 'primary' : 'secondary'} iconLeft="package" onClick={() => cart ? setStep('checkout') : notify && notify('Your cart is empty')}>Cart{cart ? ` (${cart})` : ''}</Button>;
  const back = () => step === 'products' ? setStep('region') : step === 'detail' ? setStep('products') : step === 'checkout' ? setStep('detail') : onBack();
  const backLabel = step === 'region' ? 'Devices & locations' : step === 'products' ? 'Region' : 'All products';

  const region1 = (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
      <span style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--b-color-background-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Ico name="globe" size={44} color="var(--b-color-decorative-green)" /></span>
      <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>Where will you be using these terminals?</span>
      <span style={{ fontSize: 13, color: T.sub }}>We need this information to send the right power supply for your country or region.</span>
      <div style={{ width: 320, marginTop: 8 }}>
        <Dropdown value={region} onChange={(v) => { setRegion(v); setStep('products'); }} placeholder="Select" options={ORDER_COUNTRIES.map(c => ({ value: c, label: c }))} />
      </div>
    </div>
  );

  const catalogue = ORDER_PRODUCTS.filter(p => ptab === 'terminals');
  const products = (
    <div style={{ maxWidth: T.maxW, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px` }}>
      <Row align="flex-start" style={{ marginBottom: T.s5 }}>
        <span style={{ flex: 1, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Products in {region}</span>
        <Row gap={8}>
          <Button variant="secondary" iconLeft="settings" onClick={() => notify && notify('Spare parts catalogue — coming soon')}>I need a spare part</Button>
          {cartBtn}
        </Row>
      </Row>
      <div style={{ marginBottom: T.s5 }}>
        <Tabs value={ptab} onChange={setPtab} tabs={[{ value: 'terminals', label: 'Terminals & Card readers' }, { value: 'kits', label: 'Hardware kits' }]} />
      </div>
      {ptab === 'kits' ? (
        <EmptyState icon="grid" title="No hardware kits" description="Pre-bundled kits will appear here." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: T.s4 }}>
          {catalogue.map(p => (
            <button key={p.id} type="button" onClick={() => openDetail(p)} className="ns-tile"
              style={{ textAlign: 'left', border: `1px solid ${T.border}`, borderRadius: T.radiusL, background: T.card, padding: 16, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <OrderProductImg p={p} />
              <Col gap={2}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: T.sub }}>{p.acc ? `${p.acc} accessories` : 'No accessories'}</span>
              </Col>
              <Tag label={p.type} variant={p.type === 'Countertop' ? 'grey' : 'blue'} />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const p = product || ORDER_PRODUCTS[0];
  const detail = (
    <div style={{ maxWidth: T.maxW, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px` }}>
      <Row style={{ marginBottom: T.s5 }}>
        <div style={{ flex: 1 }} />
        <Row gap={8}>
          <Button variant="secondary" iconLeft="settings" onClick={() => notify && notify('Replacement parts — coming soon')}>I need a replacement part</Button>
          {cartBtn}
        </Row>
      </Row>
      <Row gap={T.s7} align="flex-start" style={{ flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 380px', minWidth: 320 }}>
          <OrderProductImg p={p} size={140} h={420} />
        </div>
        <Col gap={14} style={{ flex: '1 1 360px', minWidth: 320 }}>
          <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>{p.name} package</span>
          <span className="ns-num" style={{ fontSize: 24, fontWeight: 600 }}>USD {p.price.toFixed(2)}</span>
          <span style={{ fontSize: 13, color: T.sub }}>{p.blurb}</span>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>{p.specs.map(s => <Tag key={s} label={s} variant="grey" />)}</Row>
          <Accordion open title="Package includes" desc={`Terminal device, power adapter, USB-C cable${p.type === 'Mobile' ? ', receipt roll' : ''}`} onToggle={() => {}} />
          <Row gap={12} align="center" style={{ marginTop: 4 }}>
            <div style={{ width: 90 }}><Dropdown value={String(qty)} onChange={(v) => setQty(parseInt(v, 10))} options={[1, 2, 5, 10, 25, 50, 100, 500].map(n => ({ value: String(n), label: String(n) }))} /></div>
            <Button variant="primary" iconLeft="package" onClick={() => { setCart(c => c + qty); notify && notify(`Added ${qty} × ${p.name} package to cart`); }}>Add to cart</Button>
          </Row>
        </Col>
      </Row>
    </div>
  );

  const lineTotal = (p.price * qty);
  const chargeBase = Math.round(p.price * 0.5 * qty);
  const checkout = (
    <div style={{ maxWidth: T.maxW, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px` }}>
      <Row gap={T.s7} align="flex-start" style={{ flexWrap: 'wrap' }}>
        <Col gap={T.s6} style={{ flex: '1 1 460px', minWidth: 340 }}>
          <Col gap={4}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>Shipping address</span>
            <span style={{ fontSize: 13, color: T.sub }}>Your order will be delivered to this address.</span>
          </Col>
          <div style={{ ...surface, padding: 20 }}>
            <Row style={{ marginBottom: 12 }}><span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>Uniqlo Ginza flagship</span><Button variant="secondary" condensed onClick={() => notify && notify('Edit shipping address')}>Edit</Button></Row>
            <StructuredList items={[{ label: 'Contact', value: 'Yi-ning' }, { label: 'Email', value: 'yining.chuang@adyen.com' }, { label: 'Phone', value: '+81 3 5537 1000' }, { label: 'Street address', value: 'Chuo-dori 6, Ginza' }, { label: 'City', value: 'Tokyo' }, { label: 'Country/Region', value: region || 'Japan' }]} />
          </div>
          <Col gap={4} style={{ marginTop: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>Order reference <span style={{ fontSize: 13, color: T.faint, fontWeight: 400 }}>(optional)</span></span>
          </Col>
          <InputField placeholder="Add a reference for your records" />
          <div><Button variant="primary" onClick={() => { setCart(0); onBack(); notify && notify('Order placed — you\u2019ll get a confirmation email'); }}>Place order</Button></div>
        </Col>
        <div style={{ ...surface, padding: 20, flex: '1 1 320px', minWidth: 300, background: 'var(--b-color-background-secondary)' }}>
          <Row style={{ marginBottom: 4 }}><span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>Order summary</span><Button variant="secondary" condensed onClick={() => setStep('detail')}>Edit</Button></Row>
          <span style={{ fontSize: 12, color: T.sub }}>Expected shipment by Dec 28, 2023</span>
          <div style={{ height: 1, background: T.sep, margin: '14px 0' }} />
          <Row style={{ marginBottom: 8 }}><span style={{ flex: 1, fontSize: 12, color: T.sub }}>Item</span><span style={{ width: 60, textAlign: 'right', fontSize: 12, color: T.sub }}>Qty</span><span style={{ width: 90, textAlign: 'right', fontSize: 12, color: T.sub }}>Subtotal</span></Row>
          <Row align="flex-start" style={{ marginBottom: 12 }}>
            <Col gap={2} style={{ flex: 1 }}><span style={{ fontSize: 13, fontWeight: 500 }}>{p.name} package</span><span style={{ fontSize: 12, color: T.faint }}>Terminal · power adapter · USB-C cable</span></Col>
            <span style={{ width: 60, textAlign: 'right', fontSize: 13 }}>{qty}</span>
            <span style={{ width: 90, textAlign: 'right', fontSize: 13 }} className="ns-num">USD {lineTotal.toFixed(2)}</span>
          </Row>
          <div style={{ height: 1, background: T.sep, margin: '4px 0 12px' }} />
          <Row><span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Subtotal</span><span className="ns-num" style={{ fontSize: 14, fontWeight: 600 }}>USD {lineTotal.toFixed(2)}</span></Row>
        </div>
      </Row>
    </div>
  );

  return (
    <FullPage title="Order devices" subtitle={region ? `Shipping to ${region}` : 'Adyen Orders & returns'} tone="nav-devices"
      onBack={back} backLabel={backLabel} backIcon={<ArrowLeftGlyph />} onClose={onBack} bodyBg={T.page}
      actions={step === 'region' ? null : cartBtn}>
      {step === 'region' ? region1 : step === 'products' ? products : step === 'detail' ? detail : checkout}
    </FullPage>
  );
}

/* Location creation flow — a focused form that adds a new location to the fleet. */
function AddLocationModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [merchant, setMerchant] = useState(SM_MERCHANTS[0]);
  const [country, setCountry] = useState(SM_COUNTRIES[0]);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [zip, setZip] = useState('');
  const val = (e) => (e && e.target ? e.target.value : e);
  const label = { fontSize: 13, color: T.sub };
  const valid = name.trim() && country;
  return (
    <Modal open onClose={onClose} title="Add location" width={480}
      description="Create a new location. You can assign or activate devices for it afterwards."
      footer={<Row gap={8} style={{ justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!valid} onClick={() => onCreate({ name: name.trim(), merchant, country, city: city.trim(), address: address.trim(), zip: zip.trim() })}>Create location</Button>
      </Row>}>
      <Col gap={16}>
        <Col gap={6}><span style={label}>Location reference</span>
          <InputField value={name} onChange={(e) => setName(val(e))} placeholder="e.g. Berlin Mitte Flagship" />
        </Col>
        <Col gap={6}><span style={label}>Merchant account</span>
          <Dropdown value={merchant} onChange={setMerchant} options={SM_MERCHANTS.map(m => ({ value: m, label: m }))} />
        </Col>
        <Row gap={12} align="stretch">
          <Col gap={6} style={{ flex: 1 }}><span style={label}>Country/Region</span>
            <Dropdown value={country} onChange={setCountry} options={SM_COUNTRIES.map(c => ({ value: c, label: c }))} />
          </Col>
          <Col gap={6} style={{ flex: 1 }}><span style={label}>City</span>
            <InputField value={city} onChange={(e) => setCity(val(e))} placeholder="City" />
          </Col>
        </Row>
        <Row gap={12} align="stretch">
          <Col gap={6} style={{ flex: 2 }}><span style={label}>Address</span>
            <InputField value={address} onChange={(e) => setAddress(val(e))} placeholder="Street and number" />
          </Col>
          <Col gap={6} style={{ flex: 1 }}><span style={label}>Zip code</span>
            <InputField value={zip} onChange={(e) => setZip(val(e))} placeholder="Zip" />
          </Col>
        </Row>
      </Col>
    </Modal>
  );
}

/* Holistic device detail — identity, live state, final resolved config, terminal logs, event
   timeline and problem history. "Config" opens the Device Studio preview scoped to this device. */
function DeviceDetail({ row, store, onBack, onOpenStudio, onOpenStore, notify }) {
  const [devTab, setDevTab] = useState('info'); // Device info | Device events | Settings & config
  const [devRange, setDevRange] = useState('7d'); // event/activity period — default last 7 days
  const [logFilter, setLogFilter] = useState('all'); // event log — All | Problems
  const [devShown, setDevShown] = useState(() => { try { const s = JSON.parse(localStorage.getItem('ns_dev_signals') || 'null'); return Array.isArray(s) ? s : null; } catch (e) { return null; } }); // which signal graphs show — null = default top 4
  const [devCustomize, setDevCustomize] = useState(false);
  const [drillSignal, setDrillSignal] = useState(null); // a signal graph opened full-size
  useEffect(() => { try { localStorage.setItem('ns_dev_signals', JSON.stringify(devShown)); } catch (e) { /* ignore */ } }, [devShown]);
  useEffect(() => { setDevTab('info'); setDevRange('7d'); setLogFilter('all'); setDevCustomize(false); setDrillSignal(null); }, [row && row.id]); // reset when a different device opens
  if (!row) return null;
  const isMobile = row._type === 'Mobile';
  const serial = row.serial || row.install || '—';
  const dot = row.dot || '';
  const statusWord = dot.includes('green') ? 'Online' : dot.includes('orange') ? 'Idle' : 'Offline';
  const health = statusWord === 'Online' ? 'Healthy' : statusWord === 'Idle' ? 'At risk' : 'Offline';
  const sv = statusWord === 'Online' ? 'green' : statusWord === 'Idle' ? 'orange' : 'grey';
  // deterministic per-device derived telemetry
  let h = 0; for (const ch of row.id) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  const rnd = (n) => { h = (h * 1103515245 + 12345) & 0x7fffffff; return Math.floor((h / 0x7fffffff) * n); };
  const termId = (row.model + '-' + serial).replace(/[^A-Za-z0-9-]/g, '');
  const uniqueId = 'UID-' + String(serial).replace(/\D/g, '').slice(-8).padStart(8, '0');
  const software = isMobile ? `SDK ${row.sdkVersion || '3.14.0'}` : `Firmware ${row.version || '1.42.1'}`;
  const battery = isMobile ? null : (row.__battery != null ? row.__battery + '%' : (health === 'Offline' ? '—' : (42 + rnd(56)) + '%'));
  const signal = row.__wifi != null ? (row.__wifi + ' dBm') : (health === 'Offline' ? 'No connection' : -(55 + rnd(24)) + ' dBm');
  const conn = health === 'Offline' ? 'Offline' : (rnd(2) ? 'Wi-Fi' : 'Cellular');
  const ssid = store ? (store.code.replace(/[^A-Za-z0-9]/g, '').slice(0, 10) + '-POS') : 'Store-POS';
  const locName = store ? (store.name || store.code) : (row.store || '—');
  const addr = (store && store.street) || row.address || '—';
  const city = (store && store.city) || '';
  const country = (store && store.country) || row.country || '—';

  // human-readable event log + problem history (reuses the fleet-health event builder)
  const dvFailed = row.__failed != null ? row.__failed : (health === 'Healthy' ? 0 : 3 + rnd(12));
  const dvCause = row.__cause !== undefined ? row.__cause : (health === 'Healthy' ? '' : ['Wi-Fi drops · weak signal', 'WebSocket timeouts · high latency', 'Offline windows · not boarded'][rnd(3)]);
  const dv = { id: row.id, terminal: termId, store: locName, country, model: row.model, appVersion: row.version || row.sdkVersion || '1.42.1', status: health, failed: dvFailed, cause: dvCause };
  const events = deviceEvents(dv);
  const problems = events.filter(e => /failure|signal|Cellular|Offline|error/i.test(e.type));
  const isProblem = (e) => problems.includes(e); // highlight these inline in the merged event log

  // final resolved configuration (schema defaults + inheritance source)
  const cfg = buildSettingsRows(store || { code: locName, id: row.storeId || 'x' });
  const cats = [];
  cfg.forEach(c => { let g = cats.find(x => x.cat === c.category); if (!g) { g = { cat: c.category, rows: [] }; cats.push(g); } g.rows.push(c); });

  const openStudio = () => onOpenStudio && onOpenStudio({ type: 'device', deviceIds: [row.id], model: row.model, name: row.model, deviceType: isMobile ? 'SoftPOS' : 'Terminal', storeId: row.storeId });
  const fact = (k, v, mono) => (
    <Row key={k} style={{ justifyContent: 'space-between', gap: 16, padding: '9px 0', borderBottom: `1px solid ${T.sepFaint}` }}>
      <span style={{ fontSize: 13, color: T.sub, flexShrink: 0 }}>{k}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: T.ink, textAlign: 'right', fontFamily: mono ? 'var(--b-font-family-secondary)' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
    </Row>
  );
  const dotEl = <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot || 'var(--b-color-decorative-grey)', flexShrink: 0 }} />;

  // Per-device telemetry (Core Terminal Dashboard) — stable per device + granular range.
  const RANGE_OPTIONS = [{ value: '1h', label: 'Last 1 hour' }, { value: '24h', label: 'Last 24 hours' }, { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: '90d', label: 'Last 90 days' }];
  const dMeta = ({ '1h': { n: 12, u: 'm', s: 5 }, '24h': { n: 24, u: 'h', s: 1 }, '7d': { n: 7, u: 'd', s: 1 }, '30d': { n: 30, u: 'd', s: 1 }, '90d': { n: 30, u: 'd', s: 3 } })[devRange] || { n: 7, u: 'd', s: 1 };
  const dN = dMeta.n;
  const dLabels = Array.from({ length: dN }, (_, i) => { const back = (dN - 1 - i) * dMeta.s; if (i === dN - 1) return dMeta.u === 'd' ? 'Today' : 'Now'; if (dMeta.u === 'd' && dMeta.s === 1 && i === dN - 2) return 'Yest'; return back + dMeta.u; });
  const devRangeLabel = (RANGE_OPTIONS.find(o => o.value === devRange) || RANGE_OPTIONS[2]).label;
  let hs = 0; for (const ch of (row.id + devRange)) hs = (hs * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  const rr = () => { hs = (hs * 1103515245 + 12345) & 0x7fffffff; return hs / 0x7fffffff; };
  const dropBase = health === 'Healthy' ? 0.5 : (dvFailed / 3 + 1);
  const wifiNum = health === 'Offline' ? -100 : (parseInt(signal, 10) || -70);
  const battNum = battery ? parseInt(battery, 10) : null;
  const mk = (base, amp, o = {}) => dLabels.map((_, i) => { let v = base * (1 + (o.trend || 0) * (i / Math.max(1, dN - 1))) + (rr() - 0.5) * 2 * amp; if (o.spike && rr() > 0.85) v += o.spike * rr(); if (o.min != null) v = Math.max(o.min, v); if (o.max != null) v = Math.min(o.max, v); return Math.round(v); });
  const wifiShare = health === 'Offline' ? 0 : Math.max(20, Math.min(90, Math.round(60 + (rr() - 0.5) * 40)));
  const wifiPctS = dLabels.map(() => Math.max(0, Math.min(100, Math.round(wifiShare + (rr() - 0.5) * 20))));
  // Mirror the Core Terminal Dashboard panels for this terminal.
  const devPanels = [
    { title: 'Communication Events', color: 'var(--b-color-decorative-blue)', points: mk(380, 120, { trend: 0.6 }), min: 0 },
    { title: 'Websocket connection failed', color: 'var(--b-color-decorative-red)', points: mk(dropBase, dropBase + 1, { spike: 5 }), min: 0 },
    { title: 'Payment Requests', color: 'var(--b-color-decorative-blue)', points: mk(240, 55), min: 0 },
    { title: 'Websocket connection latency', unit: 'ms', color: 'var(--b-color-decorative-green)', points: mk(230, 90, { min: 120, spike: 1200 }), min: 0 },
    { title: 'Terminal Bootup', color: '#E9A23B', points: mk(1, 1, { spike: 4 }), min: 0 },
    { title: 'Primary connected interface', type: 'donut', wifi: wifiShare },
    { title: 'Active interface across time', type: 'multi', unit: '%', min: 0, max: 100, series: [{ color: '#006BD7', points: wifiPctS }, { color: 'var(--b-color-decorative-orange)', points: wifiPctS.map(v => 100 - v) }] },
    { title: 'Firmware Installer', empty: true },
    { title: 'WiFi Signal Level', unit: 'dBm', color: '#3BA7A0', points: mk(wifiNum, 10, { min: -100, max: -20 }), min: -100, max: -20 },
    { title: 'Cellular Signal Level', unit: 'dBm', color: '#7B94B5', points: mk(-70, 8, { min: -110, max: -40 }), min: -110, max: -40 },
    ...(battNum != null ? [{ title: 'Battery level', unit: '%', color: '#E7C34B', points: mk(battNum, 9, { min: 0, max: 100, trend: -0.1 }), min: 0, max: 100 }] : []),
  ];
  // Default to the 4 most important signals; the block is customizable (remembered across devices).
  const DEV_DEFAULT = ['Communication Events', 'Websocket connection failed', 'Websocket connection latency', 'WiFi Signal Level'];
  const allDevTitles = devPanels.map(p => p.title);
  const devShownTitles = devShown == null ? DEV_DEFAULT.filter(t => allDevTitles.includes(t)) : devShown;
  const shownPanels = devPanels.filter(p => devShownTitles.includes(p.title));

  return (
    <FullPage title={row.model} subtitle={`${serial} · ${locName}`} tone="nav-devices" badge={<Tag label={statusWord} variant={sv} />}
      onBack={onBack} backLabel="All devices" backIcon={<ArrowLeftGlyph />} onClose={onBack} bodyBg={T.page}
      actions={<>
        <MenuButton variant="secondary" condensed={false} icon="options-vertical" label="Actions" items={[
          { value: 'restart', label: 'Restart', icon: 'refresh' }, { value: 'replace', label: 'Replace device', icon: 'refresh' }, { value: 'return', label: 'Return device', icon: 'arrow-right' },
        ]} onSelect={(v) => notify && notify(v === 'restart' ? 'Restart command sent' : v === 'replace' ? 'Replacement ordered' : 'Return label generated')} />
        <Button variant="secondary" iconLeft="download" onClick={() => { downloadCSV(`device-${termId}-events.csv`, ['Time', 'Type', 'Detail', 'Reference'], events.map(e => [e.ts, e.type, e.detail, e.ref || ''])); notify && notify('Exported device events to CSV'); }}>Export</Button>
      </>}>
      <div style={{ maxWidth: T.maxW, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px`, display: 'flex', flexDirection: 'column', gap: T.s5 }}>
        {health !== 'Healthy' && (
          <Alert type={health === 'Offline' ? 'warning' : 'critical'} variant="default"
            title={health === 'Offline' ? 'This device is offline' : 'This device is at risk of failing payments'}
            description={dv.cause ? `${dv.cause}. ${dv.failed} connectivity-linked failed transactions recently.` : 'Check connectivity and recent events below.'} />
        )}
        <UnderlineTabs value={devTab} onChange={setDevTab} tabs={[{ value: 'info', label: 'Device info' }, { value: 'signals', label: 'Device signals' }, { value: 'settings', label: 'Settings & config' }]} />

        {devTab === 'info' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: T.s6, alignItems: 'flex-start' }}>
            {/* left column — identity, network, location */}
            <Col gap={T.s6}>
              <Section title="Device info" description="Identity and live state — all identifiers linked.">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '0 32px' }}>
                  {fact('Status', <Row gap={6} style={{ justifyContent: 'flex-end' }}>{dotEl}<span>{statusWord}</span></Row>)}
                  {fact('Model', `${row.model} (${isMobile ? 'SoftPOS' : 'Terminal'})`)}
                  {fact('Serial number', serial, true)}
                  {fact('Terminal ID', termId, true)}
                  {fact('Unique ID', uniqueId, true)}
                  {fact('Integration', row.integration || 'Standalone')}
                  {fact('Software', software, true)}
                  {!isMobile && fact('Battery', battery)}
                  {fact('Last activity', row.lastActivity || '—')}
                  {fact('Last transaction', row.lastTx || '—')}
                </div>
              </Section>
              <Section title="Network">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '0 32px' }}>
                  {fact('Connection', conn)}
                  {fact('Signal strength', signal)}
                  {fact('Wi-Fi network', conn === 'Cellular' ? '—' : ssid)}
                  {fact('Connection status', health === 'Offline' ? 'Disconnected' : 'Connected')}
                </div>
              </Section>
              <Section title="Location" actions={<Button variant="tertiary" condensed iconRight="arrow-right" onClick={() => onOpenStore && row.storeId && onOpenStore(row.storeId)}>Open location</Button>}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '0 32px' }}>
                  {fact('Location', locName)}
                  {fact('Country/Region', country)}
                  {fact('Address', addr)}
                  {fact('City', city || '—')}
                </div>
              </Section>
            </Col>
            {/* right column — event log (merged from the old Device events tab) */}
            {(() => {
              const logList = (logFilter === 'problems' ? problems : events).slice(0, 24);
              return (
                <Section title="Event log" description={`${problems.length ? `${problems.length} issue${problems.length === 1 ? '' : 's'}` : 'No issues'} · reboots, config, network & errors`}
                  actions={<SegmentedControl condensed value={logFilter} onChange={setLogFilter} options={[{ value: 'all', label: 'All' }, { value: 'problems', label: `Problems${problems.length ? ` (${problems.length})` : ''}` }]} />}>
                  {logList.length === 0
                    ? <EmptyState icon="checkmark-circle" title={logFilter === 'problems' ? 'No problems' : 'No events'} description={logFilter === 'problems' ? 'No connectivity or payment problems recorded for this device.' : 'No events recorded for this device.'} />
                    : <Col gap={0}>
                        {logList.map((e, i) => {
                          const prob = isProblem(e);
                          const ongoing = prob && health !== 'Healthy' && problems.indexOf(e) === 0;
                          return (
                            <Row key={i} gap={10} align="flex-start" style={{ padding: '11px 12px', borderTop: i ? `1px solid ${T.sepFaint}` : 'none' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: prob ? 'var(--b-color-decorative-red)' : 'var(--b-color-decorative-grey)', flexShrink: 0, marginTop: 6 }} />
                              <Col gap={1} style={{ flex: 1, minWidth: 0 }}>
                                <Row style={{ justifyContent: 'space-between', gap: 8 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600 }}>{e.type}</span>
                                  {prob && <Tag label={ongoing ? 'Ongoing' : 'Issue'} variant={ongoing ? 'red' : 'orange'} />}
                                </Row>
                                <span style={{ fontSize: 12, color: T.sub }}>{e.detail}</span>
                                <span style={{ fontSize: 11, color: T.faint }}>{e.ts}{e.ref ? ` · ${e.ref}` : ''}</span>
                              </Col>
                            </Row>
                          );
                        })}
                      </Col>}
                </Section>
              );
            })()}
          </div>
        )}

        {devTab === 'signals' && (
          <>
          <Section title="Device signals" description={`Per-device telemetry · ${devShownTitles.length} of ${allDevTitles.length} signals · ${devRangeLabel}`}
            style={{ border: 'none', background: 'transparent' }} headerBorder={false} padded={false}
            actions={<Row gap={8} align="center">
              <div style={{ width: 160 }}><Dropdown value={devRange} onChange={setDevRange} options={RANGE_OPTIONS} /></div>
              <Button variant="secondary" iconLeft="settings" onClick={() => setDevCustomize(true)}>Customize ({devShownTitles.length}/{allDevTitles.length})</Button>
            </Row>}>
            {shownPanels.length === 0
              ? <EmptyState icon="nav-analytics" title="No graphs selected" description="Use “Customize” to choose which signals to show." />
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: T.s5 }}>
                  {shownPanels.map(p => {
                    const clickable = !p.empty && p.type !== 'donut';
                    return (
                    <div key={p.title} className="ns-tile" style={{ ...surface, overflow: 'hidden', cursor: clickable ? 'pointer' : 'default' }} onClick={clickable ? () => setDrillSignal(p) : undefined}>
                      <TileHeader title={p.title} subtitle={p.empty ? 'No results' : p.type === 'donut' ? 'Share of uplink' : p.type === 'multi' ? `Over time · ${p.unit}` : (p.unit ? `Over time · ${p.unit}` : 'Over time')} right={clickable ? <Ico name="arrow-right" size={16} color={T.faint} /> : null} />
                      <div style={{ padding: `0 ${T.s3}px ${T.s4}px`, height: 180, display: (p.empty || p.type === 'donut') ? 'flex' : 'block', alignItems: 'center', justifyContent: 'center' }}>
                        {p.empty
                          ? <span style={{ fontSize: 13, color: T.faint }}>No results found</span>
                          : p.type === 'donut'
                            ? (() => { const dR = 15.5, dC = 2 * Math.PI * dR, wlen = dC * (p.wifi / 100); return (
                                <Row gap={18} align="center">
                                  <svg width={108} height={108} viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                                    <circle cx="22" cy="22" r={dR} fill="none" stroke="var(--b-color-decorative-orange)" strokeWidth="8" />
                                    <circle cx="22" cy="22" r={dR} fill="none" stroke="#006BD7" strokeWidth="8" strokeDasharray={`${wlen} ${dC - wlen}`} />
                                  </svg>
                                  <Col gap={8}>
                                    <Row gap={8}><span style={{ width: 10, height: 10, borderRadius: 3, background: '#006BD7' }} /><span style={{ fontSize: 13 }}>Wi-Fi <b className="ns-num">{p.wifi}%</b></span></Row>
                                    <Row gap={8}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--b-color-decorative-orange)' }} /><span style={{ fontSize: 13 }}>Cellular <b className="ns-num">{100 - p.wifi}%</b></span></Row>
                                  </Col>
                                </Row>
                              ); })()
                            : <LineChart data={{ labels: dLabels, min: p.min, max: p.max, unit: p.unit, series: p.series || [{ color: p.color, points: p.points }] }} height={160} />}
                      </div>
                    </div>
                  ); })}
                </div>}
          </Section>
          {drillSignal && (
            <Modal open onClose={() => setDrillSignal(null)} title={drillSignal.title} width={760}
              description={`Per day · ${devRangeLabel}${drillSignal.unit ? ' · ' + drillSignal.unit : ''}`}>
              <div style={{ height: 320 }}>
                <LineChart data={{ labels: dLabels, min: drillSignal.min, max: drillSignal.max, unit: drillSignal.unit, series: drillSignal.series || [{ color: drillSignal.color, points: drillSignal.points }] }} height={300} />
              </div>
              {drillSignal.points && (
                <Row gap={28} style={{ marginTop: 16, flexWrap: 'wrap', borderTop: `1px solid ${T.sepFaint}`, paddingTop: 16 }}>
                  {(() => { const pts = drillSignal.points; const sum = pts.reduce((a, b) => a + b, 0); const avg = Math.round(sum / pts.length); const stat = (k, v) => <Col key={k} gap={2}><span style={{ fontSize: 12, color: T.sub }}>{k}</span><span className="ns-num" style={{ fontSize: 18, fontWeight: 600 }}>{D.fmt(v)}{drillSignal.unit ? ' ' + drillSignal.unit : ''}</span></Col>; return [stat('Average', avg), stat('Min', Math.min(...pts)), stat('Max', Math.max(...pts)), stat('Latest', pts[pts.length - 1])]; })()}
                </Row>
              )}
            </Modal>
          )}
          {devCustomize && (
            <Modal open onClose={() => setDevCustomize(false)} title="Customize device signals" width={460}
              description="Choose which telemetry graphs to show. Your selection is remembered across devices."
              footer={<Row gap={8} style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <Button variant="tertiary" condensed onClick={() => setDevShown(DEV_DEFAULT.filter(t => allDevTitles.includes(t)))}>Reset to default</Button>
                <Button variant="primary" onClick={() => setDevCustomize(false)}>Done</Button>
              </Row>}>
              {(() => {
                const allOn = devShownTitles.length === allDevTitles.length;
                const some = devShownTitles.length > 0 && !allOn;
                const tog = (t) => setDevShown(prev => { const base = prev == null ? devShownTitles : prev; return base.includes(t) ? base.filter(x => x !== t) : [...base, t]; });
                const box = (on, dash) => <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${on ? 'var(--b-color-label-primary)' : '#8C959D'}`, background: on ? 'var(--b-color-label-primary)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{dash ? <span style={{ width: 8, height: 2, background: '#fff', borderRadius: 1 }} /> : on ? <Ico name="checkmark-small" size={12} color="#fff" /> : null}</span>;
                return (
                  <Col gap={0}>
                    <label className="b-menu-item" onClick={() => setDevShown(allOn ? [] : allDevTitles)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', cursor: 'pointer', fontSize: 14, borderBottom: `1px solid ${T.sepFaint}` }}>{box(allOn || some, some)}<span style={{ flex: 1, fontWeight: 600 }}>Select all</span></label>
                    {allDevTitles.map(t => (
                      <label key={t} className="b-menu-item" onClick={() => tog(t)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', cursor: 'pointer', fontSize: 14 }}>{box(devShownTitles.includes(t))}<span style={{ flex: 1 }}>{t}</span></label>
                    ))}
                  </Col>
                );
              })()}
            </Modal>
          )}
          </>
        )}

        {devTab === 'settings' && (
          <DetailSection title="Final configuration" description={`The resolved settings applied to this device, with where each value comes from · ${cfg.length} settings`}
            actions={<Button variant="secondary" condensed iconLeft="settings" onClick={openStudio}>Configuration</Button>}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusM, overflow: 'auto', maxHeight: 560 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                <thead><tr>{['Setting', 'Setting value', 'Config level', 'Last changed by', 'Category'].map((c, i) => <th key={i} style={dtTh()}>{c}</th>)}</tr></thead>
                <tbody>
                  {cfg.map((r, ri) => { const last = ri === cfg.length - 1; const override = store && r.level === store.code; return (
                    <tr key={ri} className="ns-row">
                      <td style={{ ...dtTd(last), fontFamily: 'var(--b-font-family-secondary)', fontWeight: 500 }}>{r.setting}</td>
                      <td style={{ ...dtTd(last), color: T.sub, fontFamily: 'var(--b-font-family-secondary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.value || '–'}</td>
                      <td style={dtTd(last)}><a href="#" onClick={(e) => e.preventDefault()} style={{ color: override ? 'var(--b-color-decorative-orange)' : 'var(--b-color-decorative-red)', textDecoration: 'none', fontFamily: 'var(--b-font-family-secondary)' }}>{r.level}</a></td>
                      <td style={{ ...dtTd(last), color: T.sub }}>{r.user} · {r.date}</td>
                      <td style={{ ...dtTd(last), color: T.sub }}>{r.category}</td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          </DetailSection>
        )}
      </div>
    </FullPage>
  );
}

/* Device-first "Device locations" page — the full device list with Location as a column.
   "View all locations" flips to the store (location) list. */
function DeviceLocationsPage({ notify, onOpenStore, onOpenStudio }) {
  const [locations, setLocations] = useState(null); // null = closed; { store: id|undefined } opens the Locations modal
  const [addOpen, setAddOpen] = useState(false);
  const [addStore, setAddStore] = useState((SM_STORES[0] || {}).id);
  const [addModel, setAddModel] = useState('S1F2');
  const [addQty, setAddQty] = useState('1');
  const [selectorOpen, setSelectorOpen] = useState(false); // "Add devices" (By location) → terminal selector
  const [orderOpen, setOrderOpen] = useState(false); // recommendation → full-page order flow
  const [view, setView] = useState('byLocation'); // byLocation | devices
  const [reassign, setReassign] = useState(null); // { rows } while the reassign modal is open
  const [reassignTarget, setReassignTarget] = useState((SM_STORES[0] || {}).id);
  const [addLocOpen, setAddLocOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null); // clicked device → holistic Device detail overlay
  const [ver, setVer] = useState(0); // bumped after creating a location so the table refreshes
  const createLocation = (data) => {
    const s = { id: 'loc' + Date.now(), code: data.name, name: data.name, status: 'Active', country: data.country, city: data.city, street: data.address, zip: data.zip, phone: '', merchant: data.merchant, terminals: 0, termOnline: 0, termWeek: 0, termOff: 0, storeId: 'ST' + Date.now() + 'ZKW' };
    SM_STORES.unshift(s); setVer(v => v + 1); setAddLocOpen(false);
    notify && notify(`Location “${data.name}” created`);
  };
  // Single source of truth: generate the fleet device list per store, so per-store counts,
  // the flat "All devices" list, and the fleet KPI all reconcile (≈ FLEET_DEVICES total).
  const terminals = useMemo(() => SM_STORES.flatMap((s, si) => makeTerminals(s.terminals || 0, { seed: si + 1, stores: [s] })), []);
  const mobiles = useMemo(() => SM_STORES.flatMap((s, si) => makeMobiles(smMobileCount(s.terminals), { seed: si + 1, stores: [s] })), []);
  const st = SM_STORES.find(x => x.id === addStore);
  const qty = Math.max(0, parseInt(addQty, 10) || 0);
  const rt = SM_STORES.find(x => x.id === reassignTarget);
  // Open the Locations modal, optionally deep-linked to a single location's detail (where Edit store lives).
  const openLocation = (id) => setLocations({ store: SM_STORES.find(x => x.id === id) ? id : undefined });
  const openDeviceStudio = (r) => onOpenStudio && onOpenStudio({ type: 'device', deviceIds: [r.id], model: r.model, name: r.model, deviceType: r._type === 'Mobile' ? 'SoftPOS' : 'Terminal', storeId: r.storeId });
  // Clicking a device opens the holistic Device detail (info + config + logs); "Config" there opens Device Studio.
  const openDeviceDetail = (r) => setDetailRow(r);
  // Configure one/many devices → Device Studio scoped to the selection.
  const configureDevices = (rows) => {
    if (!onOpenStudio || !rows || !rows.length) return;
    const one = rows.length === 1;
    onOpenStudio({ type: 'device', deviceIds: rows.map(r => r.id), model: one ? rows[0].model : `${rows.length} devices`, name: one ? rows[0].model : `${rows.length} devices`, deviceType: rows[0]._type === 'Mobile' ? 'SoftPOS' : 'Terminal', storeId: rows[0].storeId });
  };
  const configureStore = (s) => onOpenStudio && onOpenStudio({ type: 'store', storeId: s.id, name: s.name, deviceType: 'Terminal' });
  return (
    <>
      <DeviceExplorer terminals={terminals} mobiles={mobiles} onOpenStore={openLocation} storeLabel="Location" notify={notify}
        view={view} onView={setView} onReassign={(rows) => setReassign({ rows })} onConfigure={configureDevices}
        locationView={<LocationDeviceTable key={ver} stores={SM_STORES.slice()} deviceTotal={terminals.length + mobiles.length} onOpenLocation={openLocation} onOpenDevice={openDeviceDetail} onConfigureStore={configureStore} onCloseLocation={(s) => notify && notify(`Closing ${s.name}…`)} notify={notify} />}
        onOpenDevice={openDeviceDetail}
        title="Devices & locations" subtitle="Set up locations and order, replace and return devices."
        info={<span>“<b>Location</b>” replaces the old “Store” concept so it can represent any level of your Adyen account structure — a <b>business line</b>, a <b>merchant account</b> acting as a single shop, or a physical store. One umbrella term for wherever a device operates.</span>}
        actions={<>
          {view === 'byLocation'
            ? <Button variant="primary" iconLeft="store" onClick={() => setAddLocOpen(true)}>Add location</Button>
            : <>
                <Button variant="secondary" iconLeft="checkmark-circle" onClick={() => setAddOpen(true)}>Activate devices</Button>
                <Button variant="primary" iconLeft="plus" onClick={() => setSelectorOpen(true)}>Order devices</Button>
              </>}
        </>} />
      {addLocOpen && <AddLocationModal onClose={() => setAddLocOpen(false)} onCreate={createLocation} />}
      {detailRow && <DeviceDetail row={detailRow} store={SM_STORES.find(x => x.id === detailRow.storeId)} onBack={() => setDetailRow(null)} onOpenStudio={onOpenStudio} onOpenStore={openLocation} notify={notify} />}
      {reassign && (
        <Modal open onClose={() => setReassign(null)} title="Reassign devices" width={460}
          description={`Move ${reassign.rows.length} device${reassign.rows.length === 1 ? '' : 's'} to a different location. Each device always belongs to exactly one location.`}
          footer={<Row gap={8} style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setReassign(null)}>Cancel</Button>
            <Button variant="primary" disabled={!rt} onClick={() => { const n = reassign.rows.length; setReassign(null); notify && notify(`Reassigned ${n} device${n === 1 ? '' : 's'} to ${rt ? rt.name : 'location'}`); }}>Reassign</Button>
          </Row>}>
          <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Move to location</span>
            {/* Native select — its option list is drawn by the browser, so it isn't clipped by the modal's overflow */}
            <select value={reassignTarget} onChange={(e) => setReassignTarget(e.target.value)}
              style={{ height: 40, width: '100%', boxSizing: 'border-box', border: `1px solid ${T.sep}`, borderRadius: T.radiusM, padding: '0 34px 0 12px', fontFamily: 'inherit', fontSize: 14, color: T.ink, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none', backgroundColor: T.card, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundImage: 'url(data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2216%22%20height=%2216%22%20fill=%22none%22%3E%3Cpath%20fill=%22%235C6670%22%20d=%22M2.99988%204.43923L7.99988%209.43923L12.9999%204.43923L14.0605%205.49989L7.99988%2011.5605L1.93922%205.49989L2.99988%204.43923Z%22/%3E%3C/svg%3E)' }}>
              {SM_STORES.map(x => <option key={x.id} value={x.id}>{`${x.name} · ${x.city}, ${x.country}`}</option>)}
            </select>
          </Col>
        </Modal>
      )}
      {locations && <AllStoresModal key={locations.store || 'list'} initialStore={locations.store} notify={notify} onBack={() => setLocations(null)} onOpenStore={onOpenStore} onOpenStudio={onOpenStudio} />}
      {selectorOpen && <TerminalSelector onBack={() => setSelectorOpen(false)} notify={notify} onOrder={() => { setSelectorOpen(false); setOrderOpen(true); }} />}
      {orderOpen && <OrderFlow onBack={() => setOrderOpen(false)} notify={notify} />}
      {addOpen && (
        <FullPage title="Activate devices" subtitle="Two steps: first assign each delivered device to a location, then activate it to go live and start accepting payments."
          onBack={() => setAddOpen(false)} backLabel="Devices & locations" backIcon={<ArrowLeftGlyph />} onClose={() => setAddOpen(false)} bodyBg={T.page}
          actions={<>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" iconLeft="checkmark" onClick={() => { setAddOpen(false); notify && notify(`Activating ${ACTIVATE_PENDING.length} devices…`); }}>Activate {ACTIVATE_PENDING.length} devices</Button>
          </>}>
          <div style={{ maxWidth: 900, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px`, display: 'flex', flexDirection: 'column', gap: T.s6 }}>
            <div style={{ ...surface, overflow: 'hidden' }}>
              <TileHeader title="Devices to activate" subtitle="Delivered devices not yet assigned to a location"
                right={<Tag label={`${ACTIVATE_PENDING.length} not assigned`} variant="orange" />} />
              <div style={{ padding: `0 ${T.s5}px ${T.s5}px` }}>
                {ACTIVATE_PENDING.map((d, i) => (
                  <Row key={d.serial} gap={12} align="center" style={{ padding: '12px 0', borderTop: i ? `1px solid ${T.sepFaint}` : 'none' }}>
                    <span style={{ width: 40, height: 40, borderRadius: T.radiusM, background: 'var(--b-color-background-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ico name={d.icon} size={20} color={T.sub} /></span>
                    <Col gap={1} style={{ flex: 1, minWidth: 0 }}>
                      <Row gap={8} align="center"><span style={{ fontSize: 14, fontWeight: 600 }}>{d.model}</span><Tag label={d.type} variant={d.type === 'Countertop' ? 'grey' : 'blue'} /></Row>
                      <span style={{ fontSize: 12, color: T.sub }}>{d.spec}</span>
                    </Col>
                    <span style={{ fontFamily: 'var(--b-font-family-secondary)', fontSize: 12, color: T.faint, flexShrink: 0 }}>{d.serial}</span>
                    <Button variant="secondary" condensed onClick={() => notify && notify(`Assign ${d.model} to a location`)}>Assign</Button>
                  </Row>
                ))}
              </div>
            </div>
            <div style={{ ...surface, overflow: 'hidden' }}>
              <TileHeader title="Getting started" info="Finish these steps to get your new devices live."
                right={<ProgressPill done={ONBOARDING_STEPS.filter(x => x.done).length} total={ONBOARDING_STEPS.length} />} />
              <div style={{ padding: `0 ${T.s5}px ${T.s5}px` }}>
                <OnboardingList steps={ONBOARDING_STEPS} onDoc={(t) => notify && notify(`Opening guide: ${t}`)} />
              </div>
            </div>
          </div>
        </FullPage>
      )}
    </>
  );
}

function SMDevicesPage({ store, onBack }) {
  if (!store) return null;
  const terminals = makeTerminals(store.terminals, { seed: parseInt(store.id.slice(2), 10) || 1, store: store.name, country: store.country, address: store.street });
  const mobiles = makeMobiles(Math.max(0, Math.round(store.terminals / 3)), { seed: (parseInt(store.id.slice(2), 10) || 1) + 5, store: store.name, country: store.country });
  return <DeviceExplorer terminals={terminals} mobiles={mobiles} />;
}

/* ---------------- store management: bulk status modal ---------------- */
function SMBulkModal({ s, setState, closeBulk, bulkNext, targets, target, eligible, skipped, withTerminals, isClose, needsTyped, typedOk, selCount, termDot }) {
  const stepNames = ['Choose status', 'Review changes', 'Confirm'];
  const cur = Math.min(s.bulkStep, 2);
  const steps = stepNames.map((label, i) => ({ label, num: i + 1, done: i < cur, active: i === cur }));
  const stepView = s.bulkStep;
  const dash = SM_DASH;
  const bulkNoTargets = targets.length === 0;
  const bulkNoTargetsBody = skipped.length === selCount && selCount > 0
    ? (selCount === 1 ? 'The store you selected is already closed, and closed stores cannot be reopened.' : 'All ' + selCount + ' selected stores are already closed, and closed stores cannot be reopened.')
    : 'None of the selected stores can change status right now.';
  const bulkChooseLead = skipped.length && targets.length
    ? 'Applies to the ' + eligible.length + ' stores that can still change status. ' + skipped.length + ' already-closed ' + (skipped.length === 1 ? 'store is' : 'stores are') + ' excluded.'
    : 'Only transitions that are valid for the selected stores are shown.';
  const targetCards = [
    { key: 'Inactive', title: 'Set to Inactive', desc: 'New transactions stop. Refunds and modifications still work, and you can reactivate at any time.', irreversible: false },
    { key: 'Closed', title: 'Close permanently', desc: 'Payments stop and terminals return to your inventory. Closed stores cannot be reopened.', irreversible: true },
  ].filter(t => targets.indexOf(t.key) !== -1);
  const bulkCounts = (() => {
    const verb = isClose ? 'closed' : 'set to inactive';
    const parts = [eligible.length + ' will be ' + verb];
    if (withTerminals.length) parts.push(withTerminals.length + ' have active terminals');
    if (skipped.length) parts.push(skipped.length + ' skipped');
    return parts.join(' · ');
  })();
  const confirmTitle = isClose
    ? (eligible.length === 1 ? 'Close ' + (eligible[0] ? eligible[0].name : '') + '?' : 'Close ' + eligible.length + ' stores?')
    : (eligible.length === 1 ? 'Deactivate ' + (eligible[0] ? eligible[0].name : '') + '?' : 'Deactivate ' + eligible.length + ' stores?');
  const confirmBody = isClose ? 'This is permanent. Read what happens before you continue.' : 'You can reactivate these stores at any time.';
  const confirmPoints = isClose
    ? ['Payment processing stops immediately.', withTerminals.length ? withTerminals.length + ' assigned terminals return to your merchant inventory.' : 'No terminals need reassigning.', 'Closed stores cannot be reopened.']
    : ['New transactions are blocked.', 'Refunds and modifications keep working.', 'Reactivating removes floor limits and cancels terminal remove-config actions.'];
  const o = s.outcome || { verb: 'Updated', succeeded: 0, skipped: 0 };
  const resultTitle = o.verb + ' ' + o.succeeded + (o.succeeded === 1 ? ' store' : ' stores');
  const resultBody = o.skipped ? o.skipped + (o.skipped === 1 ? ' store was' : ' stores were') + ' skipped because they were already closed. Download the report to see every row.' : 'Every selected store was updated. The list below is already up to date.';
  const resultStats = [['Succeeded', o.succeeded, 'var(--b-color-decorative-green)'], ['Skipped', o.skipped || dash, 'var(--b-color-decorative-orange)']];

  const nextLabel = stepView === 0 ? 'Continue' : (stepView === 1 ? 'Continue' : (isClose ? 'Close stores' : 'Deactivate stores'));
  const nextDisabled = (stepView === 0 && !target) || (stepView === 2 && isClose && (!s.ack || !typedOk));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,18,34,0.5)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 600, height: '100%', maxHeight: 760, display: 'flex', flexDirection: 'column', background: T.card, borderRadius: 12, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,18,34,0.28)' }}>
        <Row gap={14} style={{ flexShrink: 0, padding: '18px 24px', borderBottom: `1px solid ${T.sep}` }}>
          <Col gap={1} style={{ minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 600 }}>Change store status</div>
            <div style={{ fontSize: 13, color: T.sub }}>{selCount + (selCount === 1 ? ' store selected' : ' stores selected')}</div>
          </Col>
          <span style={{ marginLeft: 'auto' }}><IconButton icon="cross" variant="tertiary" title="Close" onClick={closeBulk} /></span>
        </Row>

        {stepView < 3 && <div style={{ flexShrink: 0, padding: '20px 24px 4px' }}><SMStepper steps={steps} /></div>}

        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {stepView === 0 && (
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600 }}>Choose the new status</h3>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: T.sub }}>{bulkChooseLead}</p>
              {bulkNoTargets && (
                <Row align="flex-start" gap={16} style={{ padding: '20px 24px', borderRadius: T.radiusL, background: 'var(--b-color-background-secondary)', maxWidth: 640 }}>
                  <Ico name="info-filled" size={24} color={T.faint} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Nothing to change here</div>
                    <div style={{ fontSize: 14, color: T.sub, marginTop: 4 }}>{bulkNoTargetsBody}</div>
                  </div>
                </Row>
              )}
              <div style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
                {targetCards.map(t => (
                  <SMRadioCard key={t.key} selected={target === t.key} onClick={() => setState({ bulkTarget: t.key, ack: false, typed: '' })}
                    border={target === t.key ? SM_INK : T.sep} bg={target === t.key ? 'var(--b-color-background-secondary)' : T.card} dotBorder={target === t.key ? SM_INK : 'var(--b-color-outline-secondary)'}>
                    <Row gap={10}><span style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</span>{t.irreversible && <Tag label="Irreversible" variant="red" />}</Row>
                    <div style={{ fontSize: 14, color: T.sub, marginTop: 4 }}>{t.desc}</div>
                  </SMRadioCard>
                ))}
              </div>
            </div>
          )}

          {stepView === 1 && (
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600 }}>Review changes</h3>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: T.sub }}>{bulkCounts}</p>
              {withTerminals.length > 0 && (
                <Row align="flex-start" gap={16} style={{ padding: '16px 20px', borderRadius: T.radiusL, background: 'var(--b-color-background-warning-weak)', marginBottom: 16 }}>
                  <Ico name="warning-filled" size={24} color="var(--b-color-background-warning-strong)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{withTerminals.length + (withTerminals.length === 1 ? ' store still has an assigned terminal' : ' stores still have assigned terminals')}</div>
                    <div style={{ fontSize: 14, marginTop: 4 }}>Their terminals will be unassigned and returned to your merchant inventory. Reassign them before closing if they are still in use.</div>
                  </div>
                </Row>
              )}
              <div style={{ overflow: 'auto', marginBottom: 20 }}>
                <div style={{ minWidth: 720 }}>
                  <SMHead>
                    <div style={{ width: 150 }}>Store code</div><div style={{ width: 180 }}>Description</div><div style={{ width: 190 }}>Status change</div><div style={{ width: 110 }}>Terminals</div><div style={{ width: 120 }}>Eligibility</div>
                  </SMHead>
                  {eligible.map(st => (
                    <SMRowEl key={st.id}>
                      <div style={{ width: 150, fontFamily: 'var(--b-font-family-secondary)', fontSize: 13 }}>{st.name}</div>
                      <div style={{ width: 180 }}>{st.name}</div>
                      <div style={{ width: 190, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><span style={{ color: T.sub }}>{st.status}</span><Ico name="arrow-right" size={14} color={T.faint} /><span style={{ fontWeight: 600 }}>{target || dash}</span></div>
                      <div style={{ width: 110, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: termDot(st.terminals) }} /><span style={{ fontFamily: 'var(--b-font-family-secondary)', fontSize: 13 }}>{st.terminals === 0 ? 'None' : st.terminals}</span></div>
                      <div style={{ width: 120 }}><Tag label={st.terminals > 0 && isClose ? 'Has terminals' : 'Ready'} variant={st.terminals > 0 && isClose ? 'orange' : 'green'} /></div>
                    </SMRowEl>
                  ))}
                </div>
              </div>
              {skipped.length > 0 && (
                <div style={{ padding: '16px 20px', border: `1px solid ${T.sep}`, borderRadius: T.radiusL, background: 'var(--b-color-background-secondary)' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{skipped.length + (skipped.length === 1 ? ' store is not eligible' : ' stores are not eligible')}</div>
                  <div style={{ fontSize: 13, color: T.sub }}>These are excluded from this action — the rest will still be applied.</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {skipped.map(st => <span key={st.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 8px', borderRadius: T.radiusM, background: T.card, border: `1px solid ${T.sep}`, fontSize: 12 }}><span style={{ fontFamily: 'var(--b-font-family-secondary)' }}>{st.name}</span>· already closed</span>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {stepView === 2 && (
            <div style={{ maxWidth: 620 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>{confirmTitle}</h3>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: T.sub }}>{confirmBody}</p>
              <ul style={{ margin: '0 0 22px', paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }}>{confirmPoints.map((c, i) => <li key={i}>{c}</li>)}</ul>
              {isClose && (
                <div style={{ padding: 16, border: '1px solid var(--b-color-background-critical-strong)', borderRadius: T.radiusL, background: 'var(--b-color-background-critical-weak)' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                    <Checkbox checked={s.ack} onChange={() => setState({ ack: !s.ack })} /><span>I understand this can’t be undone.</span>
                  </label>
                  {needsTyped && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 13, color: T.ink, marginBottom: 6 }}>Type <b>{String(eligible.length)}</b> to confirm you want to close this many stores.</div>
                      <input type="text" value={s.typed} onChange={(e) => setState({ typed: e.target.value })} placeholder={String(eligible.length)}
                        style={{ height: 36, width: 160, border: '1px solid var(--b-color-outline-secondary)', borderRadius: 8, padding: '0 12px', fontFamily: 'var(--b-font-family-secondary)', fontSize: 14, background: T.card }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {stepView === 3 && (
            <div style={{ maxWidth: 640 }}>
              <span style={{ width: 52, height: 52, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--b-color-background-success-weak)', color: 'var(--b-color-background-success-strong)', marginBottom: 16 }}><Ico name="checkmark-circle-fill" size={28} color="var(--b-color-background-success-strong)" /></span>
              <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>{resultTitle}</h3>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: T.sub }}>{resultBody}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                {resultStats.map(([label, value, dot]) => <SMSummaryCard key={label} label={label} value={value} dot={dot} />)}
              </div>
            </div>
          )}
        </div>

        <Row gap={12} style={{ flexShrink: 0, padding: '14px 24px', borderTop: `1px solid ${T.sep}` }}>
          {stepView > 0 && stepView < 3 && <Button variant="tertiary" onClick={() => setState({ bulkStep: Math.max(0, s.bulkStep - 1) })}>Back</Button>}
          <Row gap={12} style={{ marginLeft: 'auto' }}>
            <Button variant="secondary" onClick={closeBulk}>{stepView === 3 ? 'Close' : 'Cancel'}</Button>
            {stepView < 3 && <Button variant="primary" critical={stepView === 2 && isClose} disabled={nextDisabled} onClick={bulkNext}>{nextLabel}</Button>}
          </Row>
        </Row>
      </div>
    </div>
  );
}

/* ---------------- store management: edit side panel ---------------- */
function SMEditPanel({ s, setState, editStore, ev, editZip, editZipBad, editPhone, editPhoneBad, editDirty, editInvalid, closeEdit, saveEdit, efSetter }) {
  const pick = (k, dflt) => ev[k] !== undefined ? ev[k] : dflt;
  const status = pick('status', editStore.status);
  const dialOptions = [['+31', 'NL (+31)'], ['+33', 'FR (+33)'], ['+49', 'DE (+49)'], ['+44', 'GB (+44)'], ['+43', 'AT (+43)'], ['+34', 'ES (+34)'], ['+1', 'US (+1)']];
  const efInactiveWarning = editStore.status === 'Active' && ev.status === 'Inactive';
  const editHasRiskyChange = ['code', 'street', 'zip', 'city'].some(k => ev[k] !== undefined && ev[k] !== editStore[k]);
  const fieldStyle = { width: '100%', height: 40, border: '1px solid var(--b-color-outline-secondary)', borderRadius: T.radiusM, padding: '0 12px', fontFamily: 'inherit', fontSize: 14, background: T.card, color: T.ink, boxSizing: 'border-box' };
  const errNode = (msg) => <span style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6, fontSize: 13, color: 'var(--b-color-label-on-background-critical-weak)' }}><Ico name="warning-circle-fill" size={14} color="var(--b-color-background-critical-strong)" style={{ flexShrink: 0, marginTop: 2 }} />{msg}</span>;
  return (
    <Modal open onClose={closeEdit} title="Edit store" description={`${editStore.name} · ${editStore.city}, ${editStore.country}`} width={560}
      footer={<>
        <Button variant="secondary" onClick={closeEdit}>Cancel</Button>
        <Button variant="primary" disabled={!editDirty || editInvalid} onClick={saveEdit}>Save changes</Button>
      </>}>
      <div style={{ display: 'grid', gap: 16 }}>
        {efInactiveWarning && <Alert type="warning" title="Setting this store to inactive stops new payments" description="Terminals assigned to this store will stop accepting transactions once the change is applied." />}
        <div>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Store status</span>
          <SMDropdown full pill={false} open={s.efStatusMenuOpen} onToggle={() => setState({ efStatusMenuOpen: !s.efStatusMenuOpen })}
            border={s.efStatusMenuOpen ? SM_INK : 'var(--b-color-outline-secondary)'} label={status} width="100%">
            {['Active', 'Inactive', 'Inactive with modifications', 'Closed'].map(v => (
              <SMCheckOption key={v} label={v} checked={status === v} onClick={() => setState({ editVals: Object.assign({}, s.editVals, { status: v }), efStatusMenuOpen: false })} />
            ))}
          </SMDropdown>
        </div>
        <label style={{ display: 'block' }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Description</span>
          <input type="text" value={pick('name', editStore.name)} onChange={efSetter('name')} style={fieldStyle} />
        </label>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', marginTop: 4 }}>Address</div>
        <label style={{ display: 'block' }}><span style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Address line 1</span><input type="text" value={pick('street', editStore.street)} onChange={efSetter('street')} style={fieldStyle} /></label>
        <label style={{ display: 'block' }}><span style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Address line 2</span><input type="text" value={pick('addr2', '')} onChange={efSetter('addr2')} style={fieldStyle} /></label>
        <label style={{ display: 'block' }}><span style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Address line 3</span><input type="text" value={pick('addr3', '')} onChange={efSetter('addr3')} style={fieldStyle} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16, alignItems: 'start' }}>
          <label style={{ display: 'block' }}><span style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>City</span><input type="text" value={pick('city', editStore.city)} onChange={efSetter('city')} style={fieldStyle} /></label>
          <label style={{ display: 'block' }}><span style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Postal code</span><input type="text" value={editZip} onChange={efSetter('zip')} style={fieldStyle} />{editZipBad && errNode(smZipError(editStore.country))}</label>
        </div>
        <label style={{ display: 'block' }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Phone number</span>
          <span style={{ display: 'flex', gap: 16 }}>
            <select value={pick('dial', SM_DIAL_BY_COUNTRY[editStore.country] || '+31')} onChange={efSetter('dial')} style={{ ...fieldStyle, width: 120, flexShrink: 0, cursor: 'pointer' }}>
              {dialOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input type="text" value={editPhone} onChange={efSetter('phone')} style={fieldStyle} />
          </span>
          {editPhoneBad && errNode('Enter a valid phone number.')}
        </label>
        <label style={{ display: 'block' }}><span style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>External reference ID</span><input type="text" value={pick('code', editStore.code)} onChange={efSetter('code')} style={fieldStyle} /></label>
      </div>
      {editHasRiskyChange && (
        <Row align="flex-start" gap={16} style={{ padding: 16, borderRadius: T.radiusL, background: 'var(--b-color-background-warning-weak)', marginTop: 20 }}>
          <Ico name="warning-filled" size={24} color="var(--b-color-background-warning-strong)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Before you save</div>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 14, lineHeight: 1.6 }}>
              <li>Changing the store reference may require updates in your ERP and reporting exports.</li>
              <li>Address changes flow through to reconciliation, acquirer records and terminal routing.</li>
            </ul>
          </div>
        </Row>
      )}
    </Modal>
  );
}

/* ---------------- store management: add-stores wizard ---------------- */
function SMAddWizard({ s, setState, single, addLabels, addStep, d, zipBad, noProvince, detailsInvalid, payOn, methodAvailable, amexOn, amexMid, amexLevelKnown, cLevel, selectedMethodCount, newMerchant, sourceStore, closeAdd, addNext, addNextDisabled, addPendingStore, addPendingDisabled }) {
  const dash = SM_DASH;
  const addSummaries = single
    ? [s.newCountry + ' · ' + SM_MERCHANTS[0], s.payMode === 'copy' ? 'Copied from an existing store' : 'Configured manually', d.name ? d.name : 'Not filled in yet', 'Ready to create']
    : ['stores.csv · 24 rows', s.payMode === 'copy' ? 'Copied from an existing store' : 'Configured manually', 'Ready to create'];
  const steps = addLabels.map((label, i) => ({ label, num: i + 1, done: i < addStep, active: i === addStep, onClick: () => setState({ addStep: i }) }));
  const addHint = 'Step ' + (addStep + 1) + ' of ' + addLabels.length + ' · ' + addLabels[addStep];
  const pending = s.pendingStores || [];
  const setDetail = (k) => (e) => setState({ details: Object.assign({}, s.details, { [k]: e.target.value }) });
  const detailFields = [
    { label: 'Description', key: 'name', span: 'span 2', ph: 'Uniqlo Ginza' },
    { label: 'Store reference', key: 'ref', span: 'auto', ph: 'Uniqlo_Ginza' },
    { label: 'Phone number', key: 'phone', span: 'auto', ph: '+81 3 5537 1000', hint: 'Any international format — we validate against the country dial code.' },
    { label: 'Street and number', key: 'street', span: 'span 2', ph: 'Chuo-dori 6' },
    { label: 'Postal code', key: 'zip', span: 'auto', ph: '150-0002' },
    { label: 'City', key: 'city', span: 'auto', ph: 'Tokyo' },
  ];
  const showProvince = !noProvince && !!SM_PROVINCES[s.newCountry];
  const province = (s.details && s.details.province) || (SM_PROVINCES[s.newCountry] || [])[0] || '';
  const payMethods = SM_PAY_METHODS.map(pm => {
    const st = smMethodStatus(pm, s.newCountry, s.payMode === 'copy');
    const off = st.state === 'Not available here';
    return { id: pm.id, name: pm.name, state: st.state, variant: st.variant, reason: st.reason, on: off ? false : payOn(pm.id), locked: off };
  });
  const amexOptions = [
    { key: 'adyen', title: 'Use Adyen M-level acquiring', desc: 'We set Amex up for you. Nothing else needed.' },
    { key: 'mid', title: 'Provide my own Amex MID', desc: 'We detect whether it is C-level or R-level.' },
  ];
  const reviewGroups = single ? [
    { title: 'Account and region', step: 0, items: [['Merchant account', SM_MERCHANTS[0]], ['Country/Region', s.newCountry]] },
    { title: 'Payment methods', step: 1, items: [['Setup', s.payMode === 'copy' ? 'Copied from an existing store' : (s.payMode === 'skip' ? 'Skipped — finish later' : 'Configured manually')], ['Methods', selectedMethodCount + ' selected']] },
    { title: 'Store details', step: 2, items: [['Description', d.name || dash], ['Store reference', d.ref || dash], ['Address', (d.street || dash) + ', ' + (d.zip || '') + ' ' + (d.city || '')], ['Phone', d.phone || dash]] },
  ] : [
    { title: 'Upload', step: 0, items: [['File', 'stores.csv'], ['Rows', '24 stores']] },
    { title: 'Payment methods', step: 1, items: [['Setup', s.payMode === 'copy' ? 'Copied from an existing store' : 'Configured manually'], ['Applied to', 'All 24 stores, per-store overrides allowed']] },
  ];
  const addNextLabel = addStep === addLabels.length - 1
    ? (single ? (pending.length > 1 ? 'Create ' + pending.length + ' stores' : 'Create store') : 'Create 24 stores')
    : 'Continue';
  const addDoneTitle = single ? (pending.length > 1 ? pending.length + ' stores created' : 'Store created') : '24 stores created';
  const addDoneBody = s.payMode === 'skip'
    ? 'Payment-method setup is still pending — you can finish it any time from the store’s Payment methods tab.'
    : 'Payment methods were copied across. Anything that needs input is waiting on the store’s Payment methods tab.';
  const ddToggle = (name) => setState({ dd: s.dd === name ? null : name });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,18,34,0.5)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 800, height: '100%', maxHeight: 880, display: 'flex', flexDirection: 'column', background: T.card, borderRadius: T.radiusL, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,18,34,0.28)' }}>
        <Row gap={14} style={{ flexShrink: 0, padding: '18px 24px', borderBottom: `1px solid ${T.sep}` }}>
          <Col gap={1} style={{ minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 600 }}>Add stores</div>
            <div style={{ fontSize: 13, color: T.sub }}>{addHint}</div>
          </Col>
          <span style={{ marginLeft: 'auto' }}><IconButton icon="cross" variant="tertiary" title="Close" onClick={closeAdd} /></span>
        </Row>

        {!s.addDone ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 32px 32px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flexShrink: 0, padding: '20px 0 24px' }}><SMStepper steps={steps} /></div>

              {addStep === 0 && (
                <Row gap={14} style={{ marginBottom: 26 }}>
                  <span style={{ fontSize: 13, color: T.sub }}>How many stores?</span>
                  <SegmentedControl value={s.addMode} onChange={(v) => setState({ addMode: v, addStep: 0 })} options={[{ value: 'Single store', label: 'Single store' }, { value: 'Bulk upload', label: 'Bulk upload' }]} />
                </Row>
              )}

              {/* SINGLE step 0 */}
              {single && addStep === 0 && (
                <div>
                  <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600 }}>Merchant account and region</h2>
                  <p style={{ margin: '0 0 26px', fontSize: 14, color: T.sub }}>The region decides which validations and payment methods apply to this store.</p>
                  <div style={{ marginBottom: 20 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Merchant account</span>
                    <SMDropdown full pill={false} open={s.dd === 'merchant'} onToggle={() => ddToggle('merchant')} border={s.dd === 'merchant' ? SM_INK : 'var(--b-color-outline-secondary)'} label={newMerchant} width="100%">
                      {SM_MERCHANTS.map(m => <SMCheckOption key={m} label={m} checked={newMerchant === m} onClick={() => setState({ newMerchant: m, dd: null })} />)}
                    </SMDropdown>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Country/Region</span>
                    <SMDropdown full pill={false} open={s.dd === 'newCountry'} onToggle={() => ddToggle('newCountry')} border={s.dd === 'newCountry' ? SM_INK : 'var(--b-color-outline-secondary)'} label={s.newCountry} width="100%">
                      {SM_COUNTRIES.map(c => <SMCheckOption key={c} label={c} checked={s.newCountry === c} onClick={() => setState({ newCountry: c, dd: null })} />)}
                    </SMDropdown>
                  </div>
                  {s.newCountry === 'Jersey' && (
                    <Row gap={8} style={{ marginBottom: 12 }}><Tag label="Recently available" variant="green" /><span style={{ fontSize: 13, color: T.sub }}>Newly approved. Stores here are created without payment methods and configured afterwards.</span></Row>
                  )}
                  <p style={{ margin: 0, fontSize: 13, color: T.sub }}>Not seeing a country you’re approved for? <a href="#" onClick={(e) => e.preventDefault()}>Request access</a></p>
                </div>
              )}

              {/* BULK step 0 */}
              {!single && addStep === 0 && (
                <div>
                  <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600 }}>Upload your stores</h2>
                  <p style={{ margin: '0 0 26px', fontSize: 14, color: T.sub }}>Add up to 300 stores at once. Download the template so every column validates on the first try.</p>
                  <Col gap={12} style={{ alignItems: 'center', padding: '40px 24px', border: '2px dashed var(--b-color-outline-secondary)', borderRadius: T.radiusL, background: 'var(--b-color-background-secondary)', textAlign: 'center', marginBottom: 16 }}>
                    <Ico name="upload" size={32} color={T.faint} />
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Drop your CSV here</div>
                    <div style={{ fontSize: 13, color: T.sub }}>or</div>
                    <Button variant="secondary">Choose file</Button>
                  </Col>
                  <Button variant="tertiary" iconLeft="download">Download CSV template</Button>
                </div>
              )}

              {/* PAYMENT step */}
              {addStep === 1 && (
                <div>
                  <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600 }}>Payment methods</h2>
                  <p style={{ margin: '0 0 24px', fontSize: 14, color: T.sub }}>Payment-method setup never blocks store creation. Anything unfinished stays available on the store’s Payment methods tab.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <SMRadioCard selected={s.payMode === 'copy'} onClick={() => setState({ payMode: 'copy' })} border={s.payMode === 'copy' ? SM_INK : T.sep} bg={s.payMode === 'copy' ? 'var(--b-color-background-secondary)' : T.card} dotBorder={s.payMode === 'copy' ? SM_INK : 'var(--b-color-outline-secondary)'}>
                      <Row gap={10} style={{ marginBottom: 8 }}><span style={{ fontSize: 15, fontWeight: 600 }}>Copy from an existing store</span><span style={{ marginLeft: 'auto' }}><Tag label="Recommended" variant="green" /></span></Row>
                      <div style={{ fontSize: 13.5, color: T.sub }}>Mirrors every method already live on another store, including ones this form doesn’t list.</div>
                    </SMRadioCard>
                    <SMRadioCard selected={s.payMode === 'manual'} onClick={() => setState({ payMode: 'manual' })} border={s.payMode === 'manual' ? SM_INK : T.sep} bg={s.payMode === 'manual' ? 'var(--b-color-background-secondary)' : T.card} dotBorder={s.payMode === 'manual' ? SM_INK : 'var(--b-color-outline-secondary)'}>
                      <Row gap={10} style={{ marginBottom: 8 }}><span style={{ fontSize: 15, fontWeight: 600 }}>Configure manually</span></Row>
                      <div style={{ fontSize: 13.5, color: T.sub }}>Pick each method yourself and see what still needs input.</div>
                    </SMRadioCard>
                  </div>

                  {s.payMode === 'copy' && (
                    <div style={{ marginBottom: 20 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Source store</span>
                      <SMDropdown full pill={false} open={s.dd === 'source'} onToggle={() => ddToggle('source')} border={s.dd === 'source' ? SM_INK : 'var(--b-color-outline-secondary)'} label={sourceStore} width="100%">
                        {SM_STORES.slice(0, 6).map(st => { const label = st.name + ' \u00b7 ' + st.city + ', ' + st.country; return <SMCheckOption key={st.id} label={label} checked={sourceStore === label} onClick={() => setState({ sourceStore: label, dd: null })} />; })}
                      </SMDropdown>
                    </div>
                  )}

                  <div style={{ background: T.card, overflow: 'auto' }}>
                    <div style={{ minWidth: 620 }}>
                      <SMHead><div style={{ width: 36 }} /><div style={{ width: 190 }}>Payment method</div><div style={{ width: 140 }}>Status</div><div style={{ width: 240 }}>What this means</div></SMHead>
                      {payMethods.map(pm => (
                        <SMRowEl key={pm.id}>
                          <div style={{ width: 36 }}><Checkbox checked={pm.on} disabled={pm.locked} onChange={() => setState({ payOff: Object.assign({}, s.payOff, { [pm.id]: payOn(pm.id) }) })} /></div>
                          <div style={{ width: 190, fontWeight: 500 }}>{pm.name}</div>
                          <div style={{ width: 140 }}><Tag label={pm.state} variant={pm.variant} /></div>
                          <div style={{ width: 240, fontSize: 13, color: T.sub }}>{pm.reason}</div>
                        </SMRowEl>
                      ))}
                    </div>
                  </div>

                  {amexOn && (
                    <div style={{ marginTop: 16, padding: 16, border: `1px solid ${T.sep}`, borderRadius: T.radiusL, background: 'var(--b-color-background-secondary)' }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>American Express needs one more answer</div>
                      <div style={{ fontSize: 13.5, color: T.sub, marginBottom: 16 }}>This account has no Amex M-level acquirer yet, so tell us which route to take.</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {amexOptions.map(ax => (
                          <SMRadioCard key={ax.key} selected={s.amexRoute === ax.key} onClick={() => setState({ amexRoute: ax.key })} border={s.amexRoute === ax.key ? SM_INK : T.sep} dotBorder={s.amexRoute === ax.key ? SM_INK : 'var(--b-color-outline-secondary)'}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{ax.title}</div><div style={{ fontSize: 13, color: T.sub, marginTop: 3 }}>{ax.desc}</div>
                          </SMRadioCard>
                        ))}
                      </div>
                      {amexMid && (
                        <div style={{ marginTop: 16 }}>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Your Amex MID</span>
                          <input type="text" value={s.amexMidValue} onChange={(e) => setState({ amexMidValue: e.target.value })} placeholder="e.g. 3412345678" style={{ width: '100%', height: 40, border: '1px solid var(--b-color-outline-secondary)', borderRadius: T.radiusM, padding: '0 12px', fontFamily: 'var(--b-font-family-secondary)', fontSize: 14, background: T.card, boxSizing: 'border-box' }} />
                          {amexLevelKnown && <Row gap={8} style={{ marginTop: 10, fontSize: 13 }}><Tag label={cLevel ? 'C-level' : 'R-level'} variant={cLevel ? 'green' : 'orange'} /><span style={{ color: T.sub }}>{cLevel ? 'Added directly — no escalation needed.' : 'Routed to the R-level path. Amex setup pending — we’ll confirm when active.'}</span></Row>}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: 16 }}>
                    <Button variant="tertiary" onClick={() => setState({ payMode: 'skip', addStep: Math.min(addStep + 1, addLabels.length - 1) })}>Skip for now — finish later</Button>
                  </div>
                </div>
              )}

              {/* SINGLE details step */}
              {single && addStep === 2 && (
                <div>
                  <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600 }}>Store details</h2>
                  <p style={{ margin: '0 0 26px', fontSize: 14, color: T.sub }}>Fields are checked as you go — we tell you the exact rule instead of failing at the end.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {detailFields.map(f => (
                      <SMField key={f.key} style={{ gridColumn: f.span }} label={f.label} placeholder={f.ph} value={d[f.key] !== undefined ? d[f.key] : ''} onChange={setDetail(f.key)}
                        error={f.key === 'zip' && zipBad ? smZipError(s.newCountry) : ''} hint={f.hint} />
                    ))}
                    {showProvince && (
                      <div>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Province/State</span>
                        <SMDropdown full pill={false} open={s.dd === 'province'} onToggle={() => ddToggle('province')} border={s.dd === 'province' ? SM_INK : 'var(--b-color-outline-secondary)'} label={province} width="100%">
                          {(SM_PROVINCES[s.newCountry] || []).map(pv => <SMCheckOption key={pv} label={pv} checked={province === pv} onClick={() => setState({ details: Object.assign({}, s.details, { province: pv }), dd: null })} />)}
                        </SMDropdown>
                      </div>
                    )}
                  </div>

                  <Row gap={12} style={{ margin: '40px 0 16px' }}>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Stores</h3>
                    <span style={{ fontSize: 20, color: T.faint }}>{pending.length}</span>
                    <Row gap={12} style={{ marginLeft: 'auto' }}>
                      <Button variant="secondary">Upload a CSV</Button>
                      <Button variant="secondary" iconLeft="plus" disabled={addPendingDisabled} onClick={addPendingStore}>Add store</Button>
                    </Row>
                  </Row>
                  <div style={{ border: `1px solid ${T.sep}`, borderRadius: T.radiusL, background: T.card }}>
                    {pending.length === 0 && <div style={{ padding: 24, fontSize: 14, color: T.sub }}>No stores added yet. Fill in the details above and select Add store — each one is listed here before you create them.</div>}
                    {pending.map((p, i) => (
                      <Row key={i} align="flex-start" gap={16} style={{ padding: '16px 24px', borderTop: i === 0 ? '0' : `1px solid ${T.sep}` }}>
                        <span style={{ width: 20, flexShrink: 0, fontFamily: 'var(--b-font-family-secondary)', fontSize: 13, color: T.faint, lineHeight: '20px' }}>{i + 1}</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 14, color: T.sub, marginTop: 2 }}>{p.address}</div>
                          <div style={{ fontSize: 14, color: T.sub, marginTop: 2 }}>{p.meta}</div>
                        </div>
                        <IconButton icon="bin" variant="secondary" title="Remove store" onClick={() => setState({ pendingStores: pending.filter((_, j) => j !== i) })} />
                      </Row>
                    ))}
                  </div>
                </div>
              )}

              {/* REVIEW step */}
              {addStep === addLabels.length - 1 && (
                <div>
                  <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600 }}>Review and create</h2>
                  <p style={{ margin: '0 0 26px', fontSize: 14, color: T.sub }}>{single ? 'Check the details, then create the store. Payment-method setup can continue afterwards.' : '24 stores from stores.csv are ready. Rows that fail validation are reported afterwards — the rest still get created.'}</p>
                  {reviewGroups.map(g => (
                    <div key={g.title} style={{ border: `1px solid ${T.sep}`, borderRadius: T.radiusL, padding: 16, marginBottom: 16 }}>
                      <Row style={{ marginBottom: 16 }}><span style={{ fontWeight: 600 }}>{g.title}</span><span style={{ marginLeft: 'auto' }}><Button variant="tertiary" condensed onClick={() => setState({ addStep: g.step })}>Edit</Button></span></Row>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        {g.items.map(([label, value]) => <div key={label}><div style={{ fontSize: 12.5, color: T.faint }}>{label}</div><div style={{ fontSize: 14, marginTop: 2 }}>{value}</div></div>)}
                      </div>
                    </div>
                  ))}
                  {pending.length > 0 && (
                    <div style={{ border: `1px solid ${T.sep}`, borderRadius: T.radiusL, padding: 16, marginBottom: 16 }}>
                      <Row style={{ marginBottom: 16 }}><span style={{ fontWeight: 600 }}>Stores</span><span style={{ marginLeft: 8, color: T.faint }}>{pending.length}</span></Row>
                      {pending.map((p, i) => (
                        <Row key={i} align="flex-start" gap={16} style={{ padding: '12px 0', borderTop: i === 0 ? '0' : `1px solid ${T.sep}` }}>
                          <span style={{ width: 20, flexShrink: 0, fontFamily: 'var(--b-font-family-secondary)', fontSize: 13, color: T.faint, lineHeight: '20px' }}>{i + 1}</span>
                          <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 14, color: T.sub, marginTop: 2 }}>{p.address}</div><div style={{ fontSize: 14, color: T.sub, marginTop: 2 }}>{p.meta}</div></div>
                        </Row>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Row gap={12} style={{ flexShrink: 0, padding: '14px 24px', borderTop: `1px solid ${T.sep}` }}>
              {addStep > 0 && <Button variant="tertiary" onClick={() => setState({ addStep: Math.max(0, addStep - 1) })}>Back</Button>}
              <Row gap={12} style={{ marginLeft: 'auto' }}>
                <Button variant="secondary" onClick={closeAdd}>Cancel</Button>
                <Button variant="primary" disabled={addNextDisabled} onClick={addNext}>{addNextLabel}</Button>
              </Row>
            </Row>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div style={{ maxWidth: 520, textAlign: 'center' }}>
              <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--b-color-background-success-weak)', color: 'var(--b-color-background-success-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><Ico name="checkmark-circle-fill" size={32} color="var(--b-color-background-success-strong)" /></span>
              <h2 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 600 }}>{addDoneTitle}</h2>
              <p style={{ margin: '0 0 26px', fontSize: 14, color: T.sub }}>{addDoneBody}</p>
              <Row gap={12} style={{ justifyContent: 'center' }}>
                <Button variant="secondary" onClick={closeAdd}>Back to stores</Button>
                <Button variant="primary" onClick={closeAdd}>Finish payment methods</Button>
              </Row>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================= ALL DEVICES
   Fleet Intelligence › All devices — the same device list as the "Devices & locations"
   page (same data tied to SM_STORES, same columns, Location links + Add devices). */
function AllDevicesModal({ onBack, onOpenDevice, onOpenStore, onOpenStudio, notify }) {
  const [locations, setLocations] = useState(null); // null = closed; { store: id|undefined } opens the Locations modal
  const [addOpen, setAddOpen] = useState(false);
  const [addStore, setAddStore] = useState((SM_STORES[0] || {}).id);
  const [addModel, setAddModel] = useState('S1F2');
  const [addQty, setAddQty] = useState('1');
  // Single source of truth: generate the fleet device list per store, so per-store counts,
  // the flat "All devices" list, and the fleet KPI all reconcile (≈ FLEET_DEVICES total).
  const terminals = useMemo(() => SM_STORES.flatMap((s, si) => makeTerminals(s.terminals || 0, { seed: si + 1, stores: [s] })), []);
  const mobiles = useMemo(() => SM_STORES.flatMap((s, si) => makeMobiles(smMobileCount(s.terminals), { seed: si + 1, stores: [s] })), []);
  const st = SM_STORES.find(x => x.id === addStore);
  const qty = Math.max(0, parseInt(addQty, 10) || 0);
  const openLocation = (id) => setLocations({ store: SM_STORES.find(x => x.id === id) ? id : undefined });
  const openDev = (r) => onOpenStudio
    ? onOpenStudio({ type: 'device', deviceIds: [r.id], model: r.model, name: r.model, deviceType: r._type === 'Mobile' ? 'SoftPOS' : 'Terminal', storeId: r.storeId })
    : (onOpenDevice && onOpenDevice(r.id));
  return (
    <FullPage title="All devices" subtitle={`${terminals.length + mobiles.length} devices across your fleet`} tone="terminal-1" onBack={onBack} backLabel="Dashboard" bodyBg={T.card}
      actions={<>
        <Button variant="secondary" iconLeft="download" onClick={() => notify && notify('Exporting devices to CSV…')}>Export</Button>
        <Button variant="secondary" iconLeft="store" onClick={() => setLocations({ store: undefined })}>All locations</Button>
        <Button variant="primary" iconLeft="plus" onClick={() => setAddOpen(true)}>Add devices</Button>
      </>}>
      <DeviceExplorer terminals={terminals} mobiles={mobiles} storeLabel="Location" notify={notify}
        onOpenStore={openLocation} onOpenDevice={openDev} />
      {locations && <AllStoresModal key={locations.store || 'list'} initialStore={locations.store} notify={notify} onBack={() => setLocations(null)} onOpenStore={onOpenStore} onOpenStudio={onOpenStudio} />}
      {addOpen && (
        <Modal open onClose={() => setAddOpen(false)} title="Add devices" width={460}
          description="Assign new payment devices to a location. Every device belongs to exactly one location."
          footer={<Row gap={8} style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={qty < 1 || !st} onClick={() => { if (st) { st.terminals += qty; st.termOnline += qty; } setAddOpen(false); notify && notify(`Added ${qty} ${addModel} to ${st ? st.name : 'location'}`); }}>Add {qty > 0 ? qty + ' ' : ''}device{qty === 1 ? '' : 's'}</Button>
          </Row>}>
          <Col gap={16}>
            <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Assign to location</span>
              <Dropdown value={addStore} onChange={setAddStore} options={SM_STORES.map(x => ({ value: x.id, label: `${x.name} · ${x.city}, ${x.country}` }))} />
            </Col>
            <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Device model</span>
              <Dropdown value={addModel} onChange={setAddModel} options={['S1F2', 'AMS1', 'V400m', 'e355', 'S1E2', 'SFO1'].map(m => ({ value: m, label: m }))} />
            </Col>
            <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Quantity</span>
              <InputField value={addQty} onChange={(e) => setAddQty((e.target ? e.target.value : e).replace(/[^0-9]/g, ''))} placeholder="1" />
            </Col>
          </Col>
        </Modal>
      )}
    </FullPage>
  );
}

/* ============================================================= STORE MODAL */
function StoreModal({ storeId, onBack, onOpenDevice, onOpenStudio, notify }) {
  const store = D.stores.find(s => s.id === storeId);
  const devices = D.devices.filter(d => d.storeId === storeId);
  const [sel, setSel] = useState([]);
  const [reassignOpen, setReassignOpen] = useState(false);
  const allChecked = sel.length === devices.length && devices.length > 0;
  const toggle = (id) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSel(allChecked ? [] : devices.map(d => d.id));

  const facts = [
    ['Location', `${store.city}, ${store.country}`], ['Type', store.type], ['Currency', store.currency],
    ['Timezone', store.timezone], ['Merchant ID', store.mid], ['Devices', String(store.deviceCount)],
  ];

  return (
    <FullPage title={store.name} subtitle={`${store.city}, ${store.country} · ${store.deviceCount} devices`} tone="store" badge={HealthDot(store.health)} onBack={onBack} backLabel="All stores"
      actions={<Button variant="secondary" iconLeft="settings" onClick={() => onOpenStudio({ type: 'store', storeId })}>Configure in Studio</Button>}>
      <div style={{ padding: '32px 20px 20px', maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Section title="Store settings" description="Applies to all devices in this store unless overridden"
          actions={<Button variant="tertiary" condensed iconRight="arrow-right" onClick={() => onOpenStudio({ type: 'store', storeId })}>Open in Studio</Button>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px 24px' }}>
            {facts.map(([k, v]) => (
              <Col key={k} gap={2}><span style={{ fontSize: 12, color: T.sub }}>{k}</span><span style={{ fontSize: 14, fontWeight: 500 }}>{v}</span></Col>
            ))}
          </div>
        </Section>

        <Section title="Devices" description="Select devices to reassign or configure" padded={false}>
          {sel.length > 0 && (
            <Row style={{ padding: '10px 16px', background: 'var(--b-color-background-selected)', borderBottom: `1px solid ${T.sep}` }} gap={10}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{sel.length} selected</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <Button variant="secondary" condensed iconLeft="move" onClick={() => setReassignOpen(o => !o)}>Reassign</Button>
                  {reassignOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 500 }}>
                      <Menu items={[{ value: '_h', label: 'MOVE TO STORE', disabled: true }, ...D.stores.filter(s => s.id !== storeId).map(s => ({ value: s.id, label: s.name, icon: 'store' })), { divider: true }, { value: '__inv', label: 'Move to inventory', icon: 'package' }]}
                        onSelect={(v) => { if (v === '_h') return; setReassignOpen(false); const dest = v === '__inv' ? 'inventory' : D.stores.find(s => s.id === v).name; notify(`Reassigned ${sel.length} device(s) to ${dest}`); setSel([]); }} />
                    </div>
                  )}
                </div>
                <Button variant="secondary" condensed iconLeft="settings" onClick={() => onOpenStudio({ type: 'store', storeId, deviceIds: sel })}>Configure ({sel.length})</Button>
              </div>
            </Row>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', borderBottom: `1px solid ${T.sepFaint}`, background: 'var(--b-color-background-secondary)', width: 40 }}><Checkbox checked={allChecked} indeterminate={sel.length > 0 && !allChecked} onChange={toggleAll} /></th>
                {['Device', 'Model', 'Status', 'Connectivity', 'Battery', 'Firmware', 'Last seen', ''].map((c, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, color: T.sub, fontWeight: 500, background: 'var(--b-color-background-secondary)', borderBottom: `1px solid ${T.sepFaint}` }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} className="ns-row ns-clickable">
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${T.sepFaint}` }} onClick={(e) => e.stopPropagation()}><Checkbox checked={sel.includes(d.id)} onChange={() => toggle(d.id)} /></td>
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${T.sepFaint}`, fontWeight: 500, fontFamily: 'var(--b-font-family-secondary)' }} onClick={() => onOpenDevice(d.id)}>{d.serial}</td>
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${T.sepFaint}`, color: T.sub }} onClick={() => onOpenDevice(d.id)}>{d.model}</td>
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${T.sepFaint}` }} onClick={() => onOpenDevice(d.id)}>{StatusFor(d.status)}</td>
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${T.sepFaint}`, color: T.sub }} onClick={() => onOpenDevice(d.id)}><Row gap={6}><Ico name={d.connectivity === 'Wi-Fi' ? 'wifi' : d.connectivity === 'Offline' ? 'cross-circle' : 'mobile'} size={16} color={T.faint} />{d.connectivity}</Row></td>
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${T.sepFaint}`, color: T.sub, fontFamily: 'var(--b-font-family-secondary)' }} onClick={() => onOpenDevice(d.id)}>{d.battery != null ? d.battery + '%' : '—'}</td>
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${T.sepFaint}` }} onClick={() => onOpenDevice(d.id)}>{d.firmware === 'Up to date' ? <span style={{ color: T.sub }}>Up to date</span> : <Tag label="Update" variant="orange" />}</td>
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${T.sepFaint}`, color: T.sub }} onClick={() => onOpenDevice(d.id)}>{d.lastSeen}</td>
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${T.sepFaint}`, textAlign: 'right' }} onClick={() => onOpenDevice(d.id)}><Ico name="chevron-right" size={16} color={T.faint} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </FullPage>
  );
}

/* ============================================================= DEVICE MODAL */
function DeviceModal({ deviceId, onBack, onOpenStudio, notify }) {
  const d = D.devices.find(x => x.id === deviceId);
  const facts = [
    ['Status', StatusFor(d.status)], ['Store', d.storeName], ['Model', d.model + ' (' + d.className + ')'],
    ['Connectivity', d.connectivity], ['Battery', d.battery != null ? d.battery + '%' : 'Mains powered'],
    ['Firmware', d.firmware], ['Last seen', d.lastSeen], ['Serial', d.serial],
  ];
  return (
    <FullPage title={d.serial} subtitle={`${d.model} · ${d.storeName}`} tone="terminal-1" badge={StatusFor(d.status)} onBack={onBack} backLabel="Store"
      actions={<>
        <MenuButton variant="secondary" condensed={false} icon="options-vertical" label="Actions" items={[
          { value: 'replace', label: 'Replace device', icon: 'refresh' }, { value: 'return', label: 'Return device', icon: 'arrow-right' }, { divider: true }, { value: 'restart', label: 'Restart', icon: 'refresh' },
        ]} onSelect={(v) => notify(v === 'replace' ? 'Replacement ordered' : v === 'return' ? 'Return label generated' : 'Restart command sent')} />
        <Button variant="primary" iconLeft="settings" onClick={() => onOpenStudio({ type: 'device', deviceIds: [d.id], storeId: d.storeId, deviceType: d.className === 'softpos' ? 'SoftPOS' : 'Terminal', model: d.model })}>Open in Device Studio</Button>
      </>}>
      <div style={{ padding: '32px 20px 20px', maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {d.status !== 'Trading' && (
          <Alert type={d.status === 'Not trading' ? 'critical' : 'warning'} variant="default"
            title={d.status === 'Not trading' ? 'This terminal is active but not trading' : 'This terminal is offline'}
            description={d.status === 'Not trading' ? 'A configuration error is blocking payments. Open Device Studio to review payment settings.' : 'No connection in the last 3 days. Check connectivity or restart the device.'} />
        )}
        <Section title="Overview">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px 24px' }}>
            {facts.map(([k, v]) => (
              <Row key={k} style={{ justifyContent: 'space-between', borderBottom: `1px solid ${T.sep}`, paddingBottom: 10 }}>
                <span style={{ fontSize: 13, color: T.sub }}>{k}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{v}</span>
              </Row>
            ))}
          </div>
        </Section>
        <Section title="Configuration" description="Merchant-facing settings for this device">
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <Tag label={d.dcc ? 'DCC on' : 'DCC off'} variant={d.dcc ? 'green' : 'grey'} />
            <Tag label={d.tipping ? 'Tipping on' : 'Tipping off'} variant={d.tipping ? 'green' : 'grey'} />
            <Tag label="Contactless on" variant="green" />
            <Tag label="Receipts: print + digital" variant="grey" />
          </Row>
          <div style={{ marginTop: 14 }}>
            <Button variant="secondary" iconLeft="settings" onClick={() => onOpenStudio({ type: 'device', deviceIds: [d.id], storeId: d.storeId, deviceType: d.className === 'softpos' ? 'SoftPOS' : 'Terminal', model: d.model })}>Edit in Device Studio</Button>
          </div>
        </Section>
      </div>
    </FullPage>
  );
}

/* ============================================================= DEVICE STUDIO */
const CLASS_LABEL = { countertop: 'Countertop', portable: 'Portable', mobile: 'Mobile', softpos: 'SoftPOS' };

function isVisible(field, groupVals) {
  if (!field.dependsOn) return true;
  return Object.entries(field.dependsOn).every(([k, v]) => groupVals[k] === v);
}
function groupSupported(group, deviceType, model) {
  const isSoftPOS = typeof deviceType === 'string' && deviceType.indexOf('SoftPOS') === 0;
  if (group.unsupportedOn && model && group.unsupportedOn.includes(model)) return false;
  if (isSoftPOS && group.unsupportedOn && group.unsupportedOn.includes('SoftPOS')) return false;
  if (!isSoftPOS && group.unsupportedOn && group.unsupportedOn.includes('Terminal')) return false;
  return true;
}

/* Custom select-style dropdown (single or multi). */
function useOutside(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return ref;
}
const selBtn = { width: '100%', height: 36, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px 0 12px', border: `1px solid var(--b-color-outline-tertiary)`, borderRadius: 8, background: T.card, color: T.ink, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 };
const popover = { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 500, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: 'var(--b-shadow-medium)', padding: 4, maxHeight: 260, overflowY: 'auto' };
const optRow = { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: T.ink, borderRadius: 6, textAlign: 'left' };

function Dropdown({ value, options, onChange, placeholder = 'Select', condensed }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  const cur = opts.find(o => o.value === value);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button style={{ ...selBtn, ...(condensed ? { height: 32, fontSize: 13 } : {}) }} onClick={() => setOpen(o => !o)}>
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: cur ? T.ink : T.faint }}>{cur ? cur.label : placeholder}</span>
        <Ico name="chevron-down" size={16} color={T.faint} />
      </button>
      {open && (
        <div style={popover}>
          {opts.map(o => (
            <button key={o.value} style={{ ...optRow, background: o.value === value ? 'var(--b-color-background-secondary)' : 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--b-color-background-secondary)'} onMouseLeave={(e) => e.currentTarget.style.background = o.value === value ? 'var(--b-color-background-secondary)' : 'transparent'}
              onClick={() => { onChange(o.value); setOpen(false); }}>
              <span style={{ flex: 1 }}>{o.label}</span>
              {o.value === value && <Ico name="checkmark" size={16} color={T.ink} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Small check box glyph used inside dropdown option rows. */
function CheckBox({ on, dash }) {
  const filled = on || dash;
  return (
    <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${filled ? 'var(--b-color-background-inverse-primary)' : T.borderStrong}`, background: filled ? 'var(--b-color-background-inverse-primary)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {dash ? <span style={{ width: 8, height: 2, borderRadius: 1, background: '#fff' }} /> : on ? <Ico name="checkmark-small" size={16} color="#fff" /> : null}
    </span>
  );
}

function MultiDropdown({ values = [], options, onChange, placeholder = 'Select', emptyLabel, ghost, summaryNoun = 'metrics' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [rect, setRect] = useState(null);
  const triggerRef = useRef(null);
  const popRef = useRef(null);

  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  const labelOf = (v) => (opts.find(o => o.value === v) || {}).label || v;
  const toggle = (v) => { const has = values.includes(v); onChange(has ? values.filter(x => x !== v) : [...values, v]); };
  const remove = (v) => onChange(values.filter(x => x !== v));
  const allValues = opts.map(o => o.value);
  const allSelected = allValues.length > 0 && allValues.every(v => values.includes(v));
  const some = values.length > 0 && !allSelected;
  const toggleAll = () => onChange(allSelected ? [] : allValues);
  const filtered = opts.filter(o => !q || String(o.label).toLowerCase().includes(q.toLowerCase()));

  const place = useCallback(() => { const el = triggerRef.current; if (el) setRect(el.getBoundingClientRect()); }, []);
  useEffect(() => {
    if (!open) { setQ(''); return; }
    place();
    const onDoc = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (popRef.current && popRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const reflow = () => place();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', reflow, true);
    window.addEventListener('resize', reflow);
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('scroll', reflow, true); window.removeEventListener('resize', reflow); };
  }, [open, place]);

  // Popover geometry: prefer below, flip above when there's more room up top.
  let popStyle = null;
  if (rect) {
    const margin = 8;
    const below = window.innerHeight - rect.bottom;
    const above = rect.top;
    const openUp = below < 240 && above > below;
    const maxH = Math.max(180, Math.min(360, (openUp ? above : below) - margin));
    popStyle = {
      position: 'fixed', left: rect.left, width: ghost ? Math.max(rect.width, 240) : rect.width, maxHeight: maxH, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: 'var(--b-shadow-high)', overflow: 'hidden',
      ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    };
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* trigger — chips (default) or a subtle text summary (ghost, used in chart headers) */}
      <div ref={triggerRef} role="button" tabIndex={0} onClick={() => setOpen(o => !o)}
        style={ghost
          ? { display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 14, fontWeight: 600, maxWidth: '100%' }
          : { ...selBtn, height: 'auto', minHeight: 36, padding: values.length ? '4px 8px 4px 6px' : '0 10px 0 12px' }}>
        {ghost
          ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: values.length ? T.ink : T.faint }}>{values.length === 0 ? (emptyLabel || placeholder) : values.length === 1 ? labelOf(values[0]) : `${values.length} ${summaryNoun}`}</span>
          : (values.length === 0
            ? <span style={{ flex: 1, textAlign: 'left', color: T.faint }}>{emptyLabel || placeholder}</span>
            : <span style={{ flex: 1, display: 'flex', flexWrap: 'nowrap', gap: 4, minWidth: 0, overflow: 'hidden' }}>
                {values.slice(0, 3).map(v => (
                  <span key={v} onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                    <Chip label={labelOf(v)} condensed onRemove={() => remove(v)} />
                  </span>
                ))}
                {values.length > 3 && <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13, color: T.sub, fontWeight: 500, whiteSpace: 'nowrap', paddingLeft: 2 }}>+{values.length - 3} more</span>}
              </span>)}
        <Ico name="chevron-down" size={16} color={T.faint} />
      </div>
      {open && popStyle && ReactDOM.createPortal(
        <div ref={popRef} style={popStyle}>
          {/* search — keeps the list scalable */}
          {opts.length > 6 && (
            <div style={{ padding: 6, borderBottom: `1px solid ${T.sepFaint}`, flexShrink: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 8px', border: `1px solid ${T.border}`, borderRadius: 6, background: T.page }}>
                <Ico name="search" size={16} color={T.faint} />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ flex: 1, border: 0, outline: 'none', background: 'none', fontFamily: 'inherit', fontSize: 14, color: T.ink, minWidth: 0 }} />
              </label>
            </div>
          )}
          {/* select all / clear all */}
          <button style={{ ...optRow, fontWeight: 600, borderRadius: 0, flexShrink: 0 }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--b-color-background-secondary)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={toggleAll}>
            <CheckBox on={allSelected} dash={some} />
            <span style={{ flex: 1 }}>{allSelected ? 'Clear all' : 'Select all'}</span>
            <span style={{ fontSize: 12, color: T.faint, fontWeight: 400 }}>{values.length}/{allValues.length}</span>
          </button>
          <div style={{ height: 1, background: T.sep, flexShrink: 0 }} />
          {/* scrollable options */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 4 }}>
            {filtered.length === 0
              ? <div style={{ padding: '10px', fontSize: 13, color: T.faint, textAlign: 'center' }}>No matches</div>
              : filtered.map(o => {
                  const on = values.includes(o.value);
                  return (
                    <button key={o.value} style={optRow} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--b-color-background-secondary)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} onClick={() => toggle(o.value)}>
                      <CheckBox on={on} />
                      <span style={{ flex: 1 }}>{o.label}</span>
                    </button>
                  );
                })}
          </div>
        </div>, document.body)}
    </div>
  );
}

/* One setting row: toggles sit on the right; everything else is label-above. */
function SettingRow({ field, val, onChange }) {
  const set = (v) => onChange(field.id, v);
  if (field.type === 'toggle') return (
    <Row style={{ justifyContent: 'space-between', gap: 16 }}>
      <span style={{ fontSize: 14, color: T.ink }}>{field.label}</span>
      <Toggle checked={!!val} onChange={(e) => set(e && e.target ? e.target.checked : !val)} />
    </Row>
  );
  let control = null;
  if (field.type === 'segmented') control = <SegmentedControl className="ns-seg-full" style={{ display: 'flex', width: '100%' }} value={val} onChange={set} options={field.options.map(o => ({ value: o, label: o }))} />;
  else if (field.type === 'select') control = <Dropdown value={val} onChange={set} options={field.options} />;
  else if (field.type === 'text') control = <InputField value={val} placeholder={field.placeholder} onChange={(e) => set(e.target ? e.target.value : e)} />;
  else if (field.type === 'number') control = <InputField type="number" value={String(val)} onChange={(e) => set(Number(e.target ? e.target.value : e))} />;
  else if (field.type === 'percent') control = <InputField type="number" value={String(val)} staticValue="%" staticValuePosition="end" onChange={(e) => set(Number(e.target ? e.target.value : e))} />;
  else if (field.type === 'color') control = (
    <Row gap={8}>{['#00D16A', '#0F75DC', '#001222', '#FF6B4A', '#8B5CF6'].map(c => (
      <button key={c} onClick={() => set(c)} style={{ width: 28, height: 28, borderRadius: 8, background: c, border: val === c ? '2px solid var(--b-color-label-primary)' : `1px solid ${T.border}`, cursor: 'pointer' }} />
    ))}</Row>
  );
  else if (field.type === 'numbers') control = (
    <Row gap={6}>{(val || []).map((n, i) => (
      <div key={i} style={{ width: 64 }}><InputField condensed type="number" value={String(n)} staticValue="%" staticValuePosition="end" onChange={(e) => { const arr = [...val]; arr[i] = Number(e.target ? e.target.value : e); set(arr); }} /></div>
    ))}</Row>
  );
  return <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>{field.label}</span>{control}</Col>;
}

/* --- Simulator --- */
/* Device catalog from the Ekiben Android Catalog Figma (instrument-selection screens). */
const TX_DEVICES = [
  { id: 'SFO1', name: 'SFO1', w: 1080, h: 672, layout: 'landscape', size: 'l', waves: true, note: 'Countertop · landscape' },
  { id: 'M450', name: 'M450', w: 1080, h: 672, layout: 'landscape', size: 'l', waves: true, note: 'Countertop · landscape' },
  { id: 'S1F2', name: 'S1F2', w: 428, h: 760, layout: 'portrait', size: 'm', tapTop: true, note: 'Portable · tap at top' },
  { id: 'S1E2', name: 'S1E2', w: 400, h: 712, layout: 'portrait', size: 'm', waves: true, note: 'Portable' },
  { id: 'S1U2', name: 'S1U2', w: 400, h: 712, layout: 'portrait', size: 'm', waves: true, note: 'Portable' },
  { id: 'LDN1', name: 'LDN1', w: 400, h: 712, layout: 'portrait', size: 'm', waves: true, note: 'Portable' },
  { id: 'AMS1', name: 'AMS1', w: 334, h: 556, layout: 'portrait', size: 's', waves: true, note: 'Compact' },
  { id: 'P630', name: 'P630', w: 320, h: 480, layout: 'portrait', size: 's', waves: true, note: 'Handheld · compact' },
  { id: 'IOS1', name: 'iPhone', w: 390, h: 844, layout: 'portrait', size: 'm', waves: true, note: 'SoftPOS · iOS' },
];
// Type ramps per device size class (native px, matching the Figma "Transactional" text styles).
const RAMP = {
  l: { headerH: 60, padX: 80, padY: 40, gap: 28, led: 16, sub: 32, amount: 80, instr: 40, btnH: 60, btnPad: 24, btnText: 32, logoW: 90, iconBtn: 32, cross: 32, waves: 150, dcc: 22 },
  m: { headerH: 60, padX: 16, padY: 16, gap: 16, led: 16, sub: 24, amount: 48, instr: 32, btnH: 60, btnPad: 24, btnText: 24, logoW: 74, iconBtn: 24, cross: 24, waves: 116, dcc: 18 },
  s: { headerH: 48, padX: 14, padY: 14, gap: 10, led: 12, sub: 18, amount: 36, instr: 24, btnH: 48, btnPad: 16, btnText: 18, logoW: 60, iconBtn: 20, cross: 20, waves: 84, dcc: 14 },
};
const LANG_CODE = { English: 'en', German: 'de', French: 'fr', Dutch: 'nl', Spanish: 'es', Japanese: 'ja' };
const TX_FONT = "'Inter', 'Adyen UI', var(--b-font-family-primary)";
const NATIVE_SCREENS = ['transaction', 'tipping', 'pin', 'processing', 'authorizing', 'approved'];
// Page types in transaction-flow order.
const PAGE_TYPES = [
  { value: 'home', label: 'Home', icon: 'image' },
  { value: 'tipping', label: 'Tip', icon: 'percent' },
  { value: 'loyalty', label: 'Loyalty', icon: 'star-fill' },
  { value: 'transaction', label: 'Present card', icon: 'card' },
  { value: 'processing', label: 'Processing', icon: 'timer' },
  { value: 'pin', label: 'PIN', icon: 'settings' },
  { value: 'authorizing', label: 'Authorizing', icon: 'timer' },
  { value: 'approved', label: 'Approved', icon: 'checkmark-circle' },
  { value: 'receipt', label: 'Receipt', icon: 'receipt' },
];

/* Fun, one-tap selector — a row of icon chips (active = filled inverse pill). */
function ChipPicker({ value, onChange, options, style }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', ...style }}>
      {options.map(o => {
        const on = value === o.value;
        const fg = on ? 'var(--b-color-label-inverse-primary)' : T.ink;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} title={o.label}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
              border: `1px solid ${on ? 'var(--b-color-background-inverse-primary)' : T.border}`,
              background: on ? 'var(--b-color-background-inverse-primary)' : T.card, color: fg,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', transition: 'background 100ms linear, border-color 100ms linear, color 100ms linear' }}>
            {o.icon && <Ico name={o.icon} size={16} color={on ? 'var(--b-color-label-inverse-primary)' : T.sub} />}
            <span>{o.label}</span>
            {o.count != null && <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.65 }}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* Draggable width (Figma-style panel resize). Returns [width, startDrag]. */
function useResizer(initial, min, max) {
  const [w, setW] = useState(initial);
  const start = (e) => {
    e.preventDefault();
    const startX = e.clientX, startW = w;
    const move = (ev) => setW(Math.min(max, Math.max(min, startW + (ev.clientX - startX))));
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
  };
  return [w, start];
}
/* Drag strip between the control panel and the canvas — hover shows an accent line. */
function ResizeHandle({ onMouseDown }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseDown={onMouseDown} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} title="Drag to resize"
      style={{ width: 7, flexShrink: 0, marginLeft: -4, cursor: 'col-resize', zIndex: 4, display: 'flex', justifyContent: 'center', alignItems: 'stretch' }}>
      <div style={{ width: 2, background: hov ? 'var(--b-color-background-inverse-primary)' : 'transparent', transition: 'background 90ms linear' }} />
    </div>
  );
}

/* Top screen-flow tab bar (builder/Figma style) — active = dark pill, hover = soft bg, horizontally scrollable. */
function FlowTabs({ value, onChange, options }) {
  const [hov, setHov] = useState(null);
  return (
    <div className="ns-flowtabs" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, padding: '8px 16px', background: T.page, overflowX: 'auto', overflowY: 'hidden', whiteSpace: 'nowrap' }}>
      {options.map(o => {
        const on = value === o.value;
        const hovered = !on && hov === o.value;
        const bg = on ? 'var(--b-color-background-inverse-primary)' : hovered ? 'var(--b-color-background-secondary)' : 'transparent';
        const fg = on ? 'var(--b-color-label-inverse-primary)' : hovered ? T.ink : T.sub;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} title={o.label}
            onMouseEnter={() => setHov(o.value)} onMouseLeave={() => setHov(h => (h === o.value ? null : h))}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, border: 0, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, background: bg, color: fg, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', transition: 'background 100ms linear, color 100ms linear' }}>
            {o.icon && <Ico name={o.icon} size={16} color={fg} />}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const money = (n) => '€' + Number(n || 0).toFixed(2);
function txPalette(theme, brand) {
  if (theme === 'Light') return { bg: '#f7f7f7', on: '#070707', sub: '#6f6f6f', border: '#efefef', scanBg: '#070707', scanOn: '#f7f7f7', cardBg: '#ffffff', cardBorder: '#efefef', cardOn: '#070707', accent: '#0ABF53', ledOff: '#d9d9d9' };
  const accent = theme === 'Brand' ? (brand || '#0ABF53') : '#0ABF53';
  return { bg: '#070707', on: '#ffffff', sub: '#959595', border: '#313131', scanBg: '#ffffff', scanOn: '#070707', cardBg: '#313131', cardBorder: 'transparent', cardOn: '#ffffff', accent, ledOff: '#3a3a3a' };
}

/* SVG (from Figma) rendered as a tintable mask. */
function TxGlyph({ src, w, h, color }) {
  return <span style={{ display: 'inline-block', width: w, height: h, background: color, WebkitMask: `url(${src}) center/contain no-repeat`, mask: `url(${src}) center/contain no-repeat`, flexShrink: 0 }} />;
}

/* Shared terminal header bar (accessibility · language · Adyen logo · close). */
function TxHeader({ r, p, code, logo }) {
  return (
    <div style={{ height: r.headerH, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${p.border}`, background: p.bg }}>
      <Row style={{ flex: 1, minWidth: 0 }}>
        <div style={{ width: r.headerH, height: r.headerH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TxGlyph src="assets/tx/accessibility.svg" w={r.iconBtn} h={r.iconBtn} color={p.on} /></div>
        <div style={{ fontFamily: TX_FONT, width: r.headerH, height: r.headerH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: r.btnText, fontWeight: 600, color: p.on }}>{code}</div>
      </Row>
      <div style={{ padding: '0 24px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {logo
          ? <img src={logo} alt="" style={{ height: Math.round(r.headerH * 0.5), maxWidth: r.logoW, objectFit: 'contain', display: 'block' }} />
          : <img src="assets/tx/adyen.svg" alt="Adyen" style={{ width: r.logoW, height: r.logoW * 24 / 74, display: 'block' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}><div style={{ width: r.headerH, height: r.headerH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ico name="cross" size={r.cross} color={p.on} /></div></div>
    </div>
  );
}

function TxScreen({ device, vals, txAmount, tx }) {
  const r = RAMP[device.size];
  const home = vals.homeScreen || {}, pay = vals.payment || {}, dcc = vals.dcc || {}, loc = vals.localization || {};
  const p = txPalette(home.theme || 'Dark', home.brandColor);
  const code = LANG_CODE[loc.language] || 'en';
  const contactless = pay.contactless !== false;
  const total = (tx && tx.total) || 100;
  const F = (extra) => ({ fontFamily: TX_FONT, ...extra });

  const leds = (
    <Row gap={4}>{[0, 1, 2, 3].map(i => <span key={i} style={{ width: r.led, height: r.led, borderRadius: '50%', background: i === 0 ? p.accent : p.ledOff }} />)}</Row>
  );
  const scanBtn = (
    <div style={F({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: r.btnH, padding: `0 ${r.btnPad}px`, borderRadius: 8, background: p.scanBg, color: p.scanOn, fontSize: r.btnText, fontWeight: 600 })}>Scan</div>
  );
  const cardBtn = (full) => (
    <div style={F({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: r.gap / 2, minHeight: r.btnH, padding: `0 ${r.btnPad}px`, borderRadius: 8, background: p.cardBg, color: p.cardOn, border: `1px solid ${p.cardBorder}`, fontSize: r.btnText, fontWeight: 600, width: full ? '100%' : 'auto', alignSelf: full ? 'stretch' : 'flex-start' })}>
      <TxGlyph src="assets/tx/card-selection.svg" w={r.iconBtn} h={r.iconBtn} color={p.cardOn} />Card options
    </div>
  );
  const instrText = txAmount ? (contactless ? 'Tap, insert, swipe,' : 'Insert or swipe,') : (contactless ? 'Tap, insert, or swipe' : 'Insert or swipe');
  const amountBlock = txAmount && (
    <Col gap={4}>
      <div style={F({ fontSize: r.sub, color: p.sub })}>Total amount</div>
      <div style={F({ fontSize: r.amount, fontWeight: 500, color: p.on, lineHeight: 1 })}>{money(total)}</div>
      {tx && tx.tipValue > 0 && <div style={F({ fontSize: r.dcc, color: p.sub })}>incl. {money(tx.tipValue)} tip</div>}
      {dcc.enabled && <div style={F({ fontSize: r.dcc, color: p.sub })}>≈ ${(total * 1.092).toFixed(2)} (+{dcc.markup}%)</div>}
    </Col>
  );
  const waves = device.waves && contactless && (
    <img src="assets/tx/contactless.svg" alt="" style={{ width: r.waves, height: r.waves * 120 / 160, filter: home.theme === 'Light' ? 'invert(1)' : 'none' }} />
  );

  if (device.layout === 'landscape') return (
    <div style={{ width: device.w, height: device.h, background: p.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TxHeader r={r} p={p} code={code} logo={home.showLogo && home.logoSrc} />
      {/* two columns keep the waves from overlapping the text/buttons */}
      <div style={{ flex: 1, display: 'flex', padding: `${r.padY}px ${r.padX}px`, gap: r.padX, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: r.gap }}>
          <Col gap={16}>{leds}{amountBlock}</Col>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Row gap={24} style={{ flexWrap: 'wrap' }}>
              <span style={F({ fontSize: r.instr, fontWeight: 600, color: p.on })}>{instrText}</span>
              {txAmount && contactless && <><span style={F({ fontSize: r.instr, fontWeight: 600, color: p.on })}>or</span>{scanBtn}</>}
            </Row>
          </div>
          {cardBtn(false)}
        </div>
        {waves && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{waves}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ width: device.w, height: device.h, background: p.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TxHeader r={r} p={p} code={code} logo={home.showLogo && home.logoSrc} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: `${r.padY}px ${r.padX}px`, gap: r.gap, minHeight: 0 }}>
        {device.tapTop && (
          <Col gap={4} style={{ alignItems: 'center' }}>
            <Ico name="chevron-up" size={24} color={p.on} />
            <span style={F({ fontSize: r.sub, fontWeight: 600, color: p.on })}>Tap up here</span>
          </Col>
        )}
        <Col gap={8}>{leds}{amountBlock}</Col>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: r.gap, minHeight: 0 }}>
          <Row gap={16} style={{ flexWrap: 'wrap' }}>
            <span style={F({ fontSize: r.instr, fontWeight: 600, color: p.on })}>{instrText}</span>
            {txAmount && contactless && <><span style={F({ fontSize: r.instr, fontWeight: 600, color: p.on })}>or</span>{scanBtn}</>}
          </Row>
          {waves && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>{waves}</div>}
        </div>
        {cardBtn(true)}
      </div>
    </div>
  );
}

/* Faithful "Choose tip" screen (EKIBEN Tipping 2024 Figma). */
function TipScreen({ device, vals }) {
  const r = RAMP[device.size];
  const home = vals.homeScreen || {}, grat = vals.gratuities || {}, loc = vals.localization || {};
  const p = txPalette(home.theme || 'Dark', home.brandColor);
  const code = LANG_CODE[loc.language] || 'en';
  const F = (extra) => ({ fontFamily: TX_FONT, ...extra });
  const base = 100;
  const presets = grat.presets || [];
  const tipAmt = { l: 64, m: 36, s: 30 }[device.size];
  const tileMinH = { l: 64, m: 60, s: 60 }[device.size];

  if (!grat.enabled) return (
    <div style={{ width: device.w, height: device.h, background: p.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TxHeader r={r} p={p} code={code} logo={home.showLogo && home.logoSrc} />
      <Col gap={10} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: r.padX, textAlign: 'center' }}>
        <Ico name="percent" size={r.instr} color={p.sub} />
        <span style={F({ fontSize: r.instr, fontWeight: 600, color: p.on })}>Tipping is off</span>
        <span style={F({ fontSize: r.sub, color: p.sub })}>Enable tipping to preview this screen.</span>
      </Col>
    </div>
  );

  // A single preset tile: "10%  |  €10.00" — Figma tile-button: min-h 60, px16 py12, radius 8, gap 8
  const presetTile = (pc, i) => (
    <div key={i} style={F({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: tileMinH, padding: '12px 16px', borderRadius: 8, background: p.scanBg, color: p.scanOn, width: '100%' })}>
      <span style={{ fontSize: r.btnText, fontWeight: 600 }}>{pc}%</span>
      <span style={{ width: 1, alignSelf: 'stretch', margin: '10px 0', background: p.scanOn, opacity: 0.25 }} />
      <span style={{ fontSize: r.btnText - 4, fontWeight: 600 }}>€{(base * pc / 100).toFixed(2)}</span>
    </div>
  );
  const plainTile = (label) => (
    <div style={F({ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: tileMinH, padding: '12px 16px', borderRadius: 8, background: p.scanBg, color: p.scanOn, width: '100%', fontSize: r.btnText, fontWeight: 600 })}>{label}</div>
  );
  // Figma tx-button (No tip): min-h 60, px24 py16, radius 8
  const noTip = (
    <div style={F({ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: tileMinH, padding: '16px 24px', borderRadius: 8, background: p.cardBg, color: p.cardOn, border: `1px solid ${p.cardBorder}`, width: '100%', fontSize: r.btnText, fontWeight: 600 })}>No tip</div>
  );
  const info = (
    <Col gap={16}>
      <Col gap={4}>
        <span style={F({ fontSize: r.sub, color: p.sub })}>Original amount</span>
        <span style={F({ fontSize: tipAmt, fontWeight: 500, color: p.on, lineHeight: 1 })}>€{base.toFixed(2)}</span>
      </Col>
      <span style={F({ fontSize: r.instr, fontWeight: 600, color: p.on })}>Choose tip</span>
    </Col>
  );

  // compact = 2-col grid (% over €); medium = stacked rows; landscape = info left / choices right
  if (device.size === 's') {
    // AMS1 / compact: 2-column grid of tall tiles (% over €) that fill the height, No tip below.
    const tileStyle = F({ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, background: p.scanBg, color: p.scanOn, padding: '10px 8px' });
    return (
      <div style={{ width: device.w, height: device.h, background: p.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TxHeader r={r} p={p} code={code} logo={home.showLogo && home.logoSrc} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: `${r.padY}px ${r.padX}px`, gap: 16, minHeight: 0 }}>
          {info}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: '1fr', gap: 12, minHeight: 0 }}>
            {presets.map((pc, i) => (
              <div key={i} style={tileStyle}>
                <span style={{ fontSize: r.btnText + 4, fontWeight: 600 }}>{pc}%</span>
                <span style={{ fontSize: r.btnText - 2, fontWeight: 600 }}>€{(base * pc / 100).toFixed(2)}</span>
              </div>
            ))}
            {grat.allowCustom && <div key="custom" style={tileStyle}><span style={{ fontSize: r.btnText + 4, fontWeight: 600 }}>Custom</span></div>}
          </div>
          {grat.allowNoTip && noTip}
        </div>
      </div>
    );
  }

  if (device.layout === 'landscape') return (
    <div style={{ width: device.w, height: device.h, background: p.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TxHeader r={r} p={p} code={code} logo={home.showLogo && home.logoSrc} />
      <div style={{ flex: 1, display: 'flex', padding: `${r.padY}px ${r.padX}px`, gap: r.padX, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>{info}</div>
        <Col gap={12} style={{ width: '46%', justifyContent: 'center' }}>
          {presets.map(presetTile)}
          {grat.allowCustom && plainTile('Custom')}
          {grat.allowNoTip && noTip}
        </Col>
      </div>
    </div>
  );

  return (
    <div style={{ width: device.w, height: device.h, background: p.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TxHeader r={r} p={p} code={code} logo={home.showLogo && home.logoSrc} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: `${r.padY}px ${r.padX}px`, gap: 16, minHeight: 0 }}>
        {info}
        <Col gap={12} style={{ flex: 1, justifyContent: 'flex-end' }}>
          {presets.map(presetTile)}
          {grat.allowCustom && plainTile('Custom')}
          {grat.allowNoTip && noTip}
        </Col>
      </div>
    </div>
  );
}

/* Enter PIN (CVM PIN, EKIBEN). */
function PinScreen({ device, vals }) {
  const r = RAMP[device.size];
  const home = vals.homeScreen || {}, loc = vals.localization || {};
  const p = txPalette(home.theme || 'Dark', home.brandColor);
  const code = LANG_CODE[loc.language] || 'en';
  const F = (extra) => ({ fontFamily: TX_FONT, ...extra });
  const surface = home.theme === 'Light' ? '#eeeeee' : '#181818';
  const keyH = { l: 68, m: 58, s: 44 }[device.size];
  const keyFont = { l: 28, m: 24, s: 20 }[device.size];
  const amount = { l: 64, m: 36, s: 30 }[device.size];
  const key = (content, bg, fg) => (
    <div style={F({ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: keyH, borderRadius: 12, background: bg || surface, color: fg || p.on, fontSize: keyFont, fontWeight: 600 })}>{content}</div>
  );
  return (
    <div style={{ width: device.w, height: device.h, background: p.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TxHeader r={r} p={p} code={code} logo={home.showLogo && home.logoSrc} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: `${r.padY}px ${r.padX}px`, gap: 16, minHeight: 0 }}>
        <Col gap={4}>
          <span style={F({ fontSize: r.sub, color: p.sub })}>Total amount</span>
          <span style={F({ fontSize: amount, fontWeight: 500, color: p.on, lineHeight: 1 })}>€110.00</span>
        </Col>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'flex-end', minHeight: 0 }}>
          <Col gap={12} style={{ alignItems: 'center' }}>
            <span style={F({ fontSize: r.instr, fontWeight: 600, color: p.on, width: '100%' })}>Enter PIN</span>
            <div style={F({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56, width: '100%', borderRadius: 8, background: surface, color: p.sub, fontSize: r.sub })}>or skip with <Ico name="checkmark" size={20} color={p.sub} /></div>
          </Col>
          <Col gap={10}>
            {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, i) => (
              <Row key={i} gap={10} style={{ alignItems: 'stretch' }}>{row.map(n => <React.Fragment key={n}>{key(n)}</React.Fragment>)}</Row>
            ))}
            <Row gap={10} style={{ alignItems: 'stretch' }}>
              {key(<Ico name="chevron-left" size={20} color={p.on} />)}
              {key('0')}
              {key(<Ico name="checkmark" size={20} color={p.scanOn} />, p.scanBg, p.scanOn)}
            </Row>
          </Col>
        </div>
      </div>
    </div>
  );
}

/* Progress (Processing / Authorizing). */
function ProgressScreen({ device, vals, label }) {
  const r = RAMP[device.size];
  const home = vals.homeScreen || {}, loc = vals.localization || {};
  const p = txPalette(home.theme || 'Dark', home.brandColor);
  const code = LANG_CODE[loc.language] || 'en';
  const sz = { l: 96, m: 72, s: 56 }[device.size];
  const C = 2 * Math.PI * 20;
  return (
    <div style={{ width: device.w, height: device.h, background: p.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TxHeader r={r} p={p} code={code} logo={home.showLogo && home.logoSrc} />
      <Col gap={20} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: r.padX }}>
        <svg width={sz} height={sz} viewBox="0 0 48 48" className="ns-spin">
          <circle cx="24" cy="24" r="20" fill="none" stroke={p.border} strokeWidth="4" />
          <circle cx="24" cy="24" r="20" fill="none" stroke={p.on} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${C * 0.72} ${C}`} />
        </svg>
        <span style={{ fontFamily: TX_FONT, fontSize: device.size === 'l' ? 28 : 22, color: p.sub }}>{label}</span>
      </Col>
    </div>
  );
}

/* Result (Approved). */
function ResultScreen({ device, vals }) {
  const r = RAMP[device.size];
  const home = vals.homeScreen || {}, loc = vals.localization || {};
  const p = txPalette(home.theme || 'Dark', home.brandColor);
  const code = LANG_CODE[loc.language] || 'en';
  const sz = { l: 120, m: 96, s: 72 }[device.size];
  return (
    <div style={{ width: device.w, height: device.h, background: p.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TxHeader r={r} p={p} code={code} logo={home.showLogo && home.logoSrc} />
      <Col gap={16} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: r.padX, textAlign: 'center' }}>
        <span className="ns-pop" style={{ lineHeight: 0 }}>
          <svg width={sz} height={sz} viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="21" stroke="#0ABF53" strokeWidth="3" />
            <path d="M14.5 24.5 L21 31 L34 17.5" stroke="#0ABF53" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <Col gap={10} style={{ alignItems: 'center' }}>
          <span style={{ fontFamily: TX_FONT, fontSize: device.size === 'l' ? 40 : device.size === 'm' ? 32 : 26, fontWeight: 600, color: p.on, lineHeight: 1.1 }}>Approved</span>
          <span style={{ fontFamily: TX_FONT, fontSize: r.sub, color: p.sub, lineHeight: 1.2 }}>Thank you, take your card</span>
        </Col>
      </Col>
    </div>
  );
}

/* Non-transactional preview screens (home / receipt) — filled to the frame. */
function LegacyScreen({ screen, vals, printable }) {
  const home = vals.homeScreen || {}, grat = vals.gratuities || {}, rec = vals.receiptPrinting || {}, loc = vals.localization || {};
  const lang = SCHEMA.i18n[loc.language] || SCHEMA.i18n.English;
  const theme = home.theme || 'Dark';
  const brand = home.brandColor || '#0ABF53';
  const bg = theme === 'Dark' ? '#070707' : theme === 'Brand' ? brand : '#f7f7f7';
  const fg = theme === 'Light' ? '#070707' : '#ffffff';
  const subFg = theme === 'Light' ? '#6f6f6f' : 'rgba(255,255,255,0.72)';
  if (screen === 'home') {
    // Idle screen — clean & minimal: a single centred brand logo tile on a dark canvas.
    const idleBg = theme === 'Light' ? '#f2f3f4' : '#0a0a0a';
    const logo = (home.showLogo && home.logoSrc) ? home.logoSrc : 'assets/tx/adyen.svg';
    return (
      <Col style={{ height: '100%', background: idleBg, alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: TX_FONT }}>
        <div style={{ width: 128, height: 128, borderRadius: 28, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 12px 34px rgba(0,0,0,0.35)' }}>
          <img src={logo} alt="" style={{ width: '66%', height: '66%', objectFit: 'contain' }} />
        </div>
      </Col>
    );
  }
  if (screen === 'tipping') {
    if (!grat.enabled) return <Col style={{ height: '100%', alignItems: 'center', justifyContent: 'center', color: subFg, background: bg, padding: 20, textAlign: 'center' }}><Ico name="percent" size={28} color={subFg} /><div style={{ fontSize: 13, marginTop: 10, fontFamily: TX_FONT }}>Tipping is turned off</div></Col>;
    return (
      <Col style={{ height: '100%', background: bg, color: fg, padding: 16, fontFamily: TX_FONT }}>
        <div style={{ fontSize: 18, fontWeight: 600, textAlign: 'center', margin: '8px 0 4px' }}>{lang.tip}</div>
        <div style={{ fontSize: 12, color: subFg, textAlign: 'center', marginBottom: 14 }}>{lang.total} €100.00</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(grat.presets || []).map(pc => (
            <div key={pc} style={{ height: 46, borderRadius: 10, border: `1px solid ${theme === 'Light' ? '#dcdcdc' : '#313131'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
              <span>{pc}%</span><span style={{ fontSize: 10, color: subFg, fontWeight: 400 }}>€{(100 * pc / 100).toFixed(2)}</span>
            </div>
          ))}
          {grat.allowCustom && <div style={{ height: 46, borderRadius: 10, border: `1px dashed ${theme === 'Light' ? '#c4c4c4' : '#4a4a4a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: subFg }}>{lang.custom}</div>}
        </div>
        {grat.allowNoTip && <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: 13, color: subFg, paddingTop: 12 }}>{lang.noTip}</div>}
      </Col>
    );
  }
  if (screen === 'receipt') {
    if (!printable) return <Col style={{ height: '100%', alignItems: 'center', justifyContent: 'center', color: subFg, background: bg, padding: 20, textAlign: 'center' }}><Ico name="printer" size={28} color={subFg} /><div style={{ fontSize: 13, marginTop: 10, fontFamily: TX_FONT }}>Printer unavailable — digital receipt only</div></Col>;
    return (
      <Col style={{ height: '100%', background: theme === 'Light' ? '#e9ebed' : '#111', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '84%', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', padding: 16, fontFamily: 'var(--b-font-family-secondary)', fontSize: 11, color: '#070707' }}>
          {rec.printLogo && <div style={{ textAlign: 'center', marginBottom: 8 }}><img src="assets/tx/uniqlo.svg" alt="Uniqlo" style={{ height: 20 }} /></div>}
          <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: 8 }}>{rec.header}</div>
          <div style={{ borderTop: '1px dashed #bbb', borderBottom: '1px dashed #bbb', padding: '6px 0', margin: '6px 0' }}>
            <Row style={{ justifyContent: 'space-between' }}><span>Dinner · Table 12</span><span>€100.00</span></Row>
            <Row style={{ justifyContent: 'space-between', marginTop: 4 }}><span>{lang.total}</span><span style={{ fontWeight: 700 }}>€100.00</span></Row>
          </div>
          <div style={{ textAlign: 'center', color: '#6f6f6f', marginTop: 8 }}>{rec.footer}</div>
          {(vals.loyalty || {}).enabled && (vals.loyalty || {}).pointsOnReceipt && (
            <div style={{ borderTop: '1px dashed #bbb', marginTop: 8, paddingTop: 8, textAlign: 'center', color: '#070707' }}>
              <div style={{ fontWeight: 700 }}>{(vals.loyalty || {}).programName || 'Rewards'}</div>
              <div style={{ color: '#6f6f6f' }}>+50 points earned · 340 total</div>
            </div>
          )}
        </div>
      </Col>
    );
  }
  if (screen === 'loyalty') {
    const loy = vals.loyalty || {};
    if (!loy.enabled) return <Col style={{ height: '100%', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', background: '#0a0a0a', padding: 20, textAlign: 'center' }}><Ico name="star-fill" size={28} color="rgba(255,255,255,0.6)" /><div style={{ fontSize: 13, marginTop: 10, fontFamily: TX_FONT }}>Loyalty is turned off</div></Col>;
    // Branded Uniqlo loyalty theme (dark) — mirrors the retailer reference.
    const BG = '#0a0a0a', FG = '#ffffff', SUB = 'rgba(255,255,255,0.6)', CARD = '#1a1a1a', TRACK = 'rgba(255,255,255,0.18)';
    const member = { name: 'Sofie', tier: loy.showTier ? 'UNIQLO member' : (loy.programName || 'Rewards'), points: 820, next: 1250 };
    const pct = Math.min(100, Math.round(member.points / member.next * 100));
    const rewards = [{ t: '10% off birthday reward', d: 'Click to redeem' }, { t: '¥500 off purchase', d: 'Redeem for 1,250 points' }];
    return (
      <Col style={{ height: '100%', background: BG, color: FG, fontFamily: TX_FONT, padding: '14px 16px 16px', overflow: 'hidden' }}>
        {/* terminal chrome — accessibility · brand logo · close */}
        <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <TxGlyph src="assets/tx/accessibility.svg" w={16} h={16} color="rgba(255,255,255,0.85)" />
          <img src={(home.showLogo && home.logoSrc) ? home.logoSrc : 'assets/tx/uniqlo.svg'} alt="" style={{ height: 18, objectFit: 'contain' }} />
          <Ico name="cross" size={16} color="rgba(255,255,255,0.85)" />
        </Row>
        {/* greeting */}
        <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 12 }}>Welcome back, {member.name}!</span>
        {/* tier progress card */}
        <div style={{ background: CARD, borderRadius: 12, padding: '14px 16px', marginBottom: 22 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{member.tier}</span>
          <Row style={{ alignItems: 'baseline', gap: 3, margin: '4px 0 12px' }}>
            <span className="ns-num" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{member.points.toLocaleString()}</span>
            <span style={{ fontSize: 13, color: SUB }}>/{member.next.toLocaleString()}</span>
          </Row>
          <div style={{ height: 6, borderRadius: 999, background: TRACK, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: FG, borderRadius: 999 }} /></div>
        </div>
        {/* use a reward */}
        <span style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Use a reward?</span>
        <Col gap={10}>
          {rewards.map(r => (
            <div key={r.t} style={{ background: '#ffffff', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a' }}>{r.t}</div>
              <div style={{ fontSize: 12, color: '#6f6f6f', marginTop: 2 }}>{r.d}</div>
            </div>
          ))}
        </Col>
        {/* dismiss */}
        {loy.allowSkip && <div style={{ marginTop: 'auto', paddingTop: 14 }}><div style={{ height: 44, borderRadius: 10, background: CARD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: FG }}>Not now</div></div>}
      </Col>
    );
  }
  return null;
}

function Simulator({ vals, screen, deviceId, txAmount, deviceType, tx, maxH = 468, maxW = 560, hideCaption }) {
  const device = TX_DEVICES.find(d => d.id === deviceId) || TX_DEVICES[3];
  const s = device.layout === 'landscape' ? Math.min(1, maxW / device.w) : Math.min(1, maxH / device.h);
  const Wo = Math.round(device.w * s), Ho = Math.round(device.h * s);
  const printable = deviceType !== 'SoftPOS';
  return (
    <Col gap={14} style={{ alignItems: 'center' }}>
      {!hideCaption && <Row gap={6}><Ico name={device.layout === 'landscape' ? 'terminal-1' : 'terminal-2'} size={16} color={T.faint} /><span style={{ fontSize: 12, color: T.sub }}>{device.name} · {device.note} · {device.w}×{device.h}</span></Row>}
      <div style={{ width: Wo, height: Ho, borderRadius: 16, overflow: 'hidden', position: 'relative', boxShadow: 'var(--b-shadow-high)', border: '1px solid var(--b-color-outline-primary)', background: '#070707' }}>
        {NATIVE_SCREENS.includes(screen)
          ? <div className="ns-txroot" style={{ width: device.w, height: device.h, transform: `scale(${s})`, transformOrigin: 'top left' }}>
              {screen === 'transaction' && <TxScreen device={device} vals={vals} txAmount={txAmount} tx={tx} />}
              {screen === 'tipping' && <TipScreen device={device} vals={vals} tx={tx} />}
              {screen === 'pin' && <PinScreen device={device} vals={vals} tx={tx} />}
              {screen === 'processing' && <ProgressScreen device={device} vals={vals} label="Processing…" />}
              {screen === 'authorizing' && <ProgressScreen device={device} vals={vals} label="Authorizing…" />}
              {screen === 'approved' && <ResultScreen device={device} vals={vals} tx={tx} />}
            </div>
          : <div className="ns-txroot" style={{ width: Wo, height: Ho }}><LegacyScreen screen={screen} vals={vals} printable={printable} tx={tx} /></div>}
      </div>
    </Col>
  );
}

/* Flat, boxless accordion (Google AI Studio style). */
function Accordion({ open, onToggle, title, desc, icon, right, disabled, children }) {
  return (
    <div style={{ opacity: disabled ? 0.5 : 1 }}>
      <button onClick={onToggle} className="ns-accord-row" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px', margin: '0 -8px', borderRadius: 10, background: 'transparent', border: 0, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
        {icon && <Ico name={icon} size={16} color={T.sub} />}
        <Col gap={1} style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</span>
          {desc && <span style={{ fontSize: 12, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</span>}
        </Col>
        {right}
        {!disabled && <Ico name={open ? 'chevron-up' : 'chevron-down'} size={16} color={T.faint} />}
      </button>
      {open && !disabled && <div style={{ padding: '2px 0 18px' }}>{children}</div>}
    </div>
  );
}

/* One chat bubble. Assistant replies can be structured — intro/text + a bulleted list of
   changes + "Learn more" doc links — so long answers stay scannable. */
function ChatBubble({ m, notify }) {
  const isUser = m.role === 'user';
  const bubble = {
    maxWidth: '84%', borderRadius: 12, padding: '10px 12px', fontSize: 13, lineHeight: 1.5,
    background: isUser ? 'var(--b-color-background-inverse-primary)' : 'var(--b-color-background-secondary)',
    color: isUser ? 'var(--b-color-label-inverse-primary)' : T.ink,
  };
  return (
    <div style={bubble}>
      {m.text && <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>}
      {m.bullets && m.bullets.length > 0 && (
        <ul style={{ margin: m.text ? '8px 0 0' : 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {m.bullets.map((b, i) => <li key={i} style={{ paddingLeft: 2 }}>{b}</li>)}
        </ul>
      )}
      {m.outro && <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{m.outro}</div>}
      {m.docs && m.docs.length > 0 && (
        <Col gap={10} style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.sepFaint}`, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.faint }}>Learn more</span>
          {m.docs.map(d => (
            <Col key={d.label} gap={2} style={{ alignItems: 'flex-start' }}>
              <a href={d.url || '#'} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--b-color-link-primary)', textDecoration: 'underline', textUnderlineOffset: 2, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', fontWeight: 400, fontSize: 13 }}>
                {d.label}<Ico name="external-link-small" size={16} color="currentColor" />
              </a>
              {d.desc && <span style={{ fontSize: 12, color: T.sub, lineHeight: '16px' }}>{d.desc}</span>}
            </Col>
          ))}
        </Col>
      )}
      {m.action && (
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" condensed onClick={m.action.onClick}>{m.action.label}</Button>
        </div>
      )}
    </div>
  );
}

/* AI assistant. Manual mode = docked composer under the settings (typing updates them live).
   Agent mode (expanded) = the whole panel becomes a chat: message thread + composer. */
function DockedAsk({ messages, draft, setDraft, onSend, expanded, notify, onRevert, onNewSession }) {
  // Studio JTBD: customisation + payment integration. First = scripted market-setup scenario.
  const suggestions = ['Enable devices for international clients in Japan', 'Set up this configuration for Australia', 'Install an Android app on these devices', 'Enable DCC and set the margin'];
  const suggIcons = ['sparkles', 'globe', 'settings', 'percent'];
  const last = messages[messages.length - 1];
  const showReply = messages.length > 1 && last && last.role === 'assistant';
  const firstTurn = messages.length <= 1;
  const threadRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  // Featured one-card prompt (mirrors Fleet Intelligence) + secondary prompts under "See more".
  const featuredPrompt = { cat: 'Market setup', q: 'Create a configuration for devices for international clients in Japan', desc: 'I\u2019ll enable DCC, offline payments, JCB & e-money and Japanese localisation — then update the preview.' };
  const featuredPrompt2 = { cat: 'Region compliance', q: 'Set up this configuration for Australia', desc: 'Australia doesn\u2019t allow surcharging, so I\u2019ll remove it automatically and apply AU-compliant defaults — explaining what changed.' };
  const morePrompts = [
    { icon: 'settings', q: 'Install an Android app on these devices' },
    { icon: 'image', q: 'Upload a media asset to the home screen' },
    { icon: 'percent', q: 'Enable DCC and set the margin' },
  ];
  const sq = search.trim().toLowerCase();
  const msgText = (m) => ((m.text || '') + ' ' + (m.bullets || []).join(' ') + ' ' + (m.outro || '')).toLowerCase();
  const shown = messages.map((m, i) => ({ m, i })).filter(({ m }) => !sq || msgText(m).includes(sq));
  useEffect(() => { if (expanded && threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [messages, expanded]);

  const composer = (
    <div className="ns-ask-box" style={{ display: 'flex', alignItems: 'flex-end', gap: 6, border: `1px solid ${T.borderStrong}`, borderRadius: 12, padding: '4px 4px 4px 10px', background: T.card }}>
      <span style={{ paddingBottom: 9, lineHeight: 0, color: 'var(--b-color-label-primary)', flexShrink: 0 }}><Ico name="sparkles" size={16} color="var(--b-color-label-primary)" /></span>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        placeholder="Ask AI to change settings…" rows={1}
        style={{ flex: 1, border: 0, outline: 'none', resize: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, lineHeight: '20px', color: T.ink, padding: '8px 0', maxHeight: expanded ? 140 : 96 }} />
      <IconButton icon="arrow-right" variant="primary" onClick={() => onSend()} title="Send" />
    </div>
  );

  // Agent mode — mirrors the Fleet Intelligence "Ask" panel: header, scrollable
  // conversation (suggestion list when empty), and the PromptBox composer pinned below.
  if (expanded) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: T.card }}>
        {/* AI chat nav — New session (revert to a fresh chat) + Search */}
        <Row style={{ flexShrink: 0, padding: '6px 8px', borderBottom: `1px solid ${T.sepFaint}`, gap: 2, alignItems: 'center' }}>
          {onNewSession && (
            <button onClick={() => { setSearch(''); setSearchOpen(false); onNewSession(); }} title="Start a new session — clears this chat"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, background: 'transparent', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: T.ink }} className="ns-suggest">
              <Ico name="plus" size={16} color={T.sub} />New session
            </button>
          )}
          <span style={{ flex: 1 }} />
          <IconButton icon="search" variant="tertiary" title="Search this session" onClick={() => setSearchOpen(o => !o)} />
        </Row>
        {searchOpen && (
          <div style={{ flexShrink: 0, padding: '8px 12px', borderBottom: `1px solid ${T.sepFaint}` }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this session…" autoFocus
              style={{ width: '100%', height: 32, border: `1px solid ${T.borderStrong}`, borderRadius: 8, padding: '0 10px', fontFamily: 'inherit', fontSize: 13, background: T.card, color: T.ink, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        )}
        <div ref={threadRef} className="ns-chat-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: T.s4 }}>
          {firstTurn ? (
            <Col gap={T.s4}>
              <span style={{ fontSize: 13, color: T.sub, lineHeight: '19px' }}>Ask in plain language — I'll change the settings and update the preview.</span>
              {/* Featured prompt cards — same card design as Fleet Intelligence */}
              <AskPromptCard item={featuredPrompt} onClick={() => onSend(featuredPrompt.q)} />
              <AskPromptCard item={featuredPrompt2} onClick={() => onSend(featuredPrompt2.q)} />
              {/* See more insights → the remaining prompts as insight rows */}
              <button type="button" onClick={() => setMoreOpen(o => !o)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#00A152', padding: '2px 6px', borderRadius: 8 }}>
                {moreOpen ? 'Hide insights' : 'See more insights'}
                <Ico name={moreOpen ? 'chevron-up-small' : 'chevron-down-small'} size={16} color="#00A152" />
              </button>
              {moreOpen && (
                <Col gap={1}>
                  <AskSectionTitle>More things to try</AskSectionTitle>
                  {morePrompts.map(p => <AskInsightRow key={p.q} icon={p.icon} text={p.q} onClick={() => onSend(p.q)} />)}
                </Col>
              )}
            </Col>
          ) : (
            <Col gap={12}>
              {sq && shown.length === 0 && <span style={{ fontSize: 13, color: T.faint, padding: '4px 2px' }}>No messages match “{search}”.</span>}
              {shown.map(({ m, i }) => (
                <Row key={i} className="ns-msg" align="flex-start" gap={8} style={{ flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                  {m.role === 'assistant' && <span style={{ lineHeight: 0, flexShrink: 0, paddingTop: 6 }}><Ico name="sparkles" size={16} color="var(--b-color-label-primary)" /></span>}
                  <ChatBubble m={m} notify={notify} />
                  {onRevert && i > 0 && (
                    <div className="ns-revert" style={{ alignSelf: 'center', flexShrink: 0 }}>
                      <button className="ns-revert-btn" onClick={() => onRevert(i)} title="Revert to this point" aria-label="Revert to this point"
                        style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--b-shadow-low)', padding: 0 }}>
                        <RevertGlyph size={14} />
                      </button>
                    </div>
                  )}
                </Row>
              ))}
              {last && last.role === 'assistant' && last.quick && last.quick.length > 0 && (
                <Row gap={6} style={{ flexWrap: 'wrap', paddingLeft: 24 }}>
                  {last.quick.map(qr => (
                    <button key={qr} onClick={() => onSend(qr)} className="ns-chip-btn"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${T.borderStrong}`, background: T.card, borderRadius: 999, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: T.ink }}>
                      {qr}
                    </button>
                  ))}
                </Row>
              )}
            </Col>
          )}
        </div>
        <div style={{ flexShrink: 0, padding: T.s4, borderTop: `1px solid ${T.sep}` }}>
          <PromptBox q={draft} setQ={setDraft} onSend={() => onSend()} thinking={false} models={ASK_CONTEXTS.studio.models} defaultMode={ASK_CONTEXTS.studio.defaultMode} placeholder="Ask AI to change settings…" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ borderTop: `1px solid ${T.sep}`, background: T.card, padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
      {showReply && (
        <Row gap={8} align="flex-start" style={{ padding: '2px' }}>
          <span style={{ lineHeight: 0, flexShrink: 0, paddingTop: 1 }}><Ico name="sparkles" size={16} color="var(--b-color-label-primary)" /></span>
          <span style={{ fontSize: 12, color: T.sub, lineHeight: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{last.text}</span>
        </Row>
      )}
      {firstTurn && (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {suggestions.map(s => <span key={s} className="ns-chip-btn" onClick={() => onSend(s)}><Tag label={s} variant="grey" /></span>)}
        </Row>
      )}
      {composer}
    </div>
  );
}

/* Edit · Ask switch — icon pill; the AI ("Ask") side lights up with the accent when active. */
function ModeSwitch({ mode, setMode, opts }) {
  opts = opts || [
    { v: 'agent', label: 'Ask', icon: 'sparkles' },
    { v: 'manual', label: 'Edit', icon: 'edit-1' },
  ];
  return (
    <div style={{ display: 'inline-flex', gap: 2, padding: 2, background: 'var(--b-color-background-secondary)', borderRadius: T.radiusM }}>
      {opts.map(o => {
        const on = mode === o.v;
        const fg = on ? T.ink : T.sub;
        return (
          <button key={o.v} onClick={() => setMode(o.v)} title={o.title || o.label}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, cursor: 'pointer', padding: '5px 12px', borderRadius: T.radiusS,
              background: on ? T.card : 'transparent',
              boxShadow: on ? 'var(--b-shadow-low)' : 'none',
              color: fg, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'background 100ms linear, color 100ms linear' }}>
            <Ico name={o.icon} size={16} color={fg} />{o.label}
          </button>
        );
      })}
    </div>
  );
}

function DeviceStudio({ scope: initialScope, onBack, notify, onApply }) {
  const [scope, setScope] = useState(() => ({
    type: initialScope.type || 'store',
    deviceTypes: [initialScope.deviceType || 'Terminal'],
    markets: initialScope.market ? [initialScope.market] : [],
    storeId: initialScope.storeId || D.stores[0].id,
    deviceIds: initialScope.deviceIds || null,
    model: initialScope.model || null,
    storeIds: initialScope.storeId ? [initialScope.storeId] : [D.stores[0].id],
  }));
  const [vals, setVals] = useState(() => SCHEMA.defaults());
  const [initial] = useState(() => JSON.parse(JSON.stringify(SCHEMA.defaults())));
  const [openGroups, setOpenGroups] = useState(() => new Set(['__scope', 'homeScreen', 'gratuities']));
  const [screen, setScreen] = useState('transaction');
  const [previewDevice, setPreviewDevice] = useState(() => {
    const m = initialScope.model;
    if (m && TX_DEVICES.find(d => d.id === m)) return m;
    if ((initialScope.deviceType || 'Terminal') === 'SoftPOS') return 'P630';
    const cls = m && (D.models.find(x => x.id === m) || {}).className;
    return cls === 'countertop' ? 'SFO1' : 'S1E2';
  });
  const [txAmountVar, setTxAmountVar] = useState(true);
  const [tip, setTip] = useState(null); // null = none chosen · number = percent · 'custom'
  const [reviewOpen, setReviewOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true); // control panel collapse
  const [panelW, startResize] = useResizer(440, 320, 680); // drag-resizable control panel
  const [chatMode, setChatMode] = useState('agent'); // default to Ask; toggle to Edit for manual settings
  const [scopeName, setScopeName] = useState(initialScope.name || 'Uniqlo APAC');
  const [scopeDesc, setScopeDesc] = useState('');
  // Snapshot of the scope at open, so a scope change also counts as a reviewable change.
  const [scope0] = useState(() => ({
    deviceTypes: [initialScope.deviceType || 'Terminal'],
    markets: initialScope.market ? [initialScope.market] : [],
    storeIds: initialScope.storeId ? [initialScope.storeId] : [D.stores[0].id],
    deviceIds: initialScope.deviceIds || null,
    name: initialScope.name || 'Uniqlo APAC',
    desc: '',
  }));
  // Per scoping rule: on the Device screen, policy groups (Store-owned) are inherited/read-only
  // until explicitly overridden for the device(s). Device-only groups are always editable here.
  const [overrides, setOverrides] = useState(() => new Set());
  const toggleOverride = (gid) => setOverrides(s => { const n = new Set(s); n.has(gid) ? n.delete(gid) : n.add(gid); return n; });
  const isDeviceScreen = (initialScope.type || scope.type) === 'device';
  const [messages, setMessages] = useState([{ role: 'assistant', text: "Describe the change you want and I'll configure the selected devices." }]);
  const [draft, setDraft] = useState('');
  const [flow, setFlow] = useState(null); // scripted market-setup scenario: { step, name, device }

  const deviceClass = useMemo(() => {
    if (scope.model) return (D.models.find(m => m.id === scope.model) || {}).className || 'portable';
    return (scope.deviceTypes[0] || 'Terminal').indexOf('SoftPOS') === 0 ? 'softpos' : 'countertop';
  }, [scope]);

  const setField = (gid, fid, v) => setVals(prev => ({ ...prev, [gid]: { ...prev[gid], [fid]: v } }));
  const toggleGroup = (gid) => setOpenGroups(s => { const n = new Set(s); n.has(gid) ? n.delete(gid) : n.add(gid); return n; });

  // Natural-language → settings (chat mode)
  const applyFromText = (text) => {
    const t = text.toLowerCase(); const changes = []; let previewGroup = null;
    const put = (gid, fid, v, desc, pv) => { setField(gid, fid, v); changes.push(desc); if (pv) previewGroup = pv; };
    // Market profile: "set up F&B Japan profile" → switch market + apply Japan F&B defaults.
    if (/japan|日本/.test(t)) {
      setScope(s => ({ ...s, markets: Array.from(new Set([...(s.markets || []), 'Japan'])) }));
      setScopeName('F&B Japan');
      setOpenGroups(prev => new Set([...prev, 'japan', 'localization', 'gratuities']));
      put('localization', 'language', 'Japanese', 'set the language to Japanese', 'home');
      put('gratuities', 'enabled', false, 'turned off tipping (not customary in Japan)', null);
      put('japan', 'jcb', true, 'enabled JCB acceptance', 'transaction');
      put('japan', 'emoney', true, 'enabled iD & QUICPay e-money', 'transaction');
      put('japan', 'transitIC', true, 'enabled Transit IC (Suica/PASMO)', 'transaction');
      put('japan', 'qrWallets', true, 'enabled PayPay & QR wallets', 'transaction');
      put('japan', 'taxMode', 'Reduced 8% (takeaway)', 'set consumption tax to 8% (takeaway)', 'transaction');
      put('japan', 'officialReceipt', true, 'enabled 領収書 official receipts', null);
      if (previewGroup) setScreen(previewGroup);
      return changes;
    }
    if (/\bdark\b/.test(t)) put('homeScreen', 'theme', 'Dark', 'set the home screen theme to Dark', 'home');
    else if (/\blight\b/.test(t)) put('homeScreen', 'theme', 'Light', 'set the home screen theme to Light', 'home');
    else if (/\bbrand\b/.test(t)) put('homeScreen', 'theme', 'Brand', 'set the home screen theme to Brand', 'home');
    if (/(enable|turn on|add|switch on).*(tip|gratuit)|tipping on/.test(t)) {
      put('gratuities', 'enabled', true, 'enabled tipping', 'tipping');
      const nums = (t.match(/\d+/g) || []).map(Number).filter(n => n > 0 && n <= 100);
      if (nums.length) put('gratuities', 'presets', nums.slice(0, 4), `set tip presets to ${nums.slice(0, 4).join(', ')}%`, 'tipping');
    }
    if (/(disable|turn off|remove).*(tip|gratuit)|no tip/.test(t)) put('gratuities', 'enabled', false, 'disabled tipping', 'tipping');
    if (/dcc|currency conversion/.test(t)) {
      if (/off|disable|no /.test(t)) put('dcc', 'enabled', false, 'disabled DCC', 'transaction');
      else { put('dcc', 'enabled', true, 'enabled DCC', 'transaction'); const m = t.match(/(\d+(?:\.\d+)?)\s*%/); if (m) put('dcc', 'markup', Number(m[1]), `set DCC markup to ${m[1]}%`, 'transaction'); }
    }
    if (/contactless/.test(t)) put('payment', 'contactless', !/off|disable/.test(t), (/off|disable/.test(t) ? 'disabled' : 'enabled') + ' contactless', 'transaction');
    if (/surcharg/.test(t)) put('payment', 'surcharge', !/off|disable|remove|no /.test(t), (/off|disable|remove|no /.test(t) ? 'removed' : 'enabled') + ' surcharging', 'transaction');
    if (/german|deutsch/.test(t)) put('localization', 'language', 'German', 'set the language to German', 'home');
    else if (/french|français|francais/.test(t)) put('localization', 'language', 'French', 'set the language to French', 'home');
    else if (/japanese|日本/.test(t)) put('localization', 'language', 'Japanese', 'set the language to Japanese', 'home');
    else if (/spanish|español|espanol/.test(t)) put('localization', 'language', 'Spanish', 'set the language to Spanish', 'home');
    if (/(hide|remove).*(logo)/.test(t)) put('homeScreen', 'showLogo', false, 'hid the store logo', 'home');
    else if (/(show|add).*(logo)/.test(t)) put('homeScreen', 'showLogo', true, 'showed the store logo', 'home');
    const gm = text.match(/greeting[^"“]*["“]([^"”]+)["”]/i); if (gm) put('homeScreen', 'greeting', gm[1].trim(), `set the greeting to “${gm[1].trim()}”`, 'home');
    const hm = text.match(/header[^"“]*["“]([^"”]+)["”]/i); if (hm) put('receiptPrinting', 'header', hm[1].trim(), `set the receipt header to “${hm[1].trim()}”`, 'receipt');
    if (previewGroup) setScreen(previewGroup);
    return changes;
  };
  // Scripted "market setup" scenario — AI enables the right settings, then asks for the
  // inputs it needs (profile name · devices · logo · app · updates) as an interactive chat.
  // ---- reversible chat: snapshot the full editable state before each turn, restore on revert ----
  const snapshot = () => ({
    vals: JSON.parse(JSON.stringify(vals)), scope: JSON.parse(JSON.stringify(scope)),
    openGroups: Array.from(openGroups), overrides: Array.from(overrides),
    screen, scopeName, scopeDesc, flow, previewDevice, tip, txAmountVar,
  });
  const applySnap = (s) => {
    if (!s) return;
    setVals(s.vals); setScope(s.scope);
    setOpenGroups(new Set(s.openGroups)); setOverrides(new Set(s.overrides));
    setScreen(s.screen); setScopeName(s.scopeName); setScopeDesc(s.scopeDesc);
    setFlow(s.flow); setPreviewDevice(s.previewDevice); setTip(s.tip); setTxAmountVar(s.txAmountVar);
  };
  // Revert = keep previous user prompts, remove the assistant outcome and anything after it,
  // then restore settings to the state right before that outcome.
  // Only user messages carry a pre-turn snapshot, so an assistant outcome uses the snap from
  // the preceding user prompt (i.e. the state before the AI changed anything this turn).
  const revertTo = (i) => {
    const cur = messages[i];
    let snap = null;
    let keepTo = i + 1; // keep the clicked bubble
    if (cur && cur.role === 'user') {
      snap = cur.snap; // state before this prompt's turn → remove the assistant outcome after it
    } else {
      // assistant bubble: remove the outcome itself and anything after it
      keepTo = i;
      for (let j = i - 1; j >= 0; j--) { if (messages[j].role === 'user' && messages[j].snap) { snap = messages[j].snap; break; } }
    }
    applySnap(snap);
    setMessages(prev => prev.slice(0, keepTo));
    setDraft('');
    notify && notify('Reverted — changes after this point were undone');
  };
  const newSession = () => {
    setMessages([{ role: 'assistant', text: "Describe the change you want and I'll configure the selected devices." }]);
    setFlow(null); setDraft('');
    notify && notify('Started a new session');
  };

  const startJapanScenario = () => {
    setScope(s => ({ ...s, markets: Array.from(new Set([...(s.markets || []), 'Japan'])) }));
    setOpenGroups(prev => new Set([...prev, 'dcc', 'gratuities', 'offline', 'localization', 'homeScreen', 'japan']));
    setField('dcc', 'enabled', true);
    setField('dcc', 'markup', 3);
    setField('gratuities', 'enabled', true);
    setField('offline', 'enabled', true);
    setField('offline', 'limit', '€100');
    setField('localization', 'language', 'Japanese');
    setField('japan', 'jcb', true);
    setField('japan', 'emoney', true);
    setField('japan', 'qrWallets', true);
    setScreen('transaction');
  };
  // Region compliance: Australia doesn't allow surcharging, so applying an AU market drops it.
  const startAustraliaScenario = () => {
    setScope(s => ({ ...s, markets: Array.from(new Set([...(s.markets || []), 'Australia'])) }));
    setOpenGroups(prev => new Set([...prev, 'payment', 'localization']));
    setField('payment', 'surcharge', false);
    setField('localization', 'language', 'English');
    setScreen('transaction');
  };
  const sendChat = (text) => {
    const q = (text != null ? text : draft).trim(); if (!q) return;
    setDraft('');
    // Capture a checkpoint of the state as it was before this turn, so it can be reverted to.
    const snap = snapshot();
    setMessages(m => [...m, { role: 'user', text: q, snap }]);
    // reply(str) → plain text; reply({intro/bullets/outro/docs}) → structured, scannable answer.
    const reply = (t, quick) => setMessages(m => [...m, typeof t === 'string' ? { role: 'assistant', text: t, quick } : { role: 'assistant', quick, ...t }]);
    const t = q.toLowerCase();
    const step = flow && flow.step;

    // Region fit — Australia: auto-remove disallowed settings (surcharging) and explain why.
    if (!step && /australia|\baus\b|\bau\b/.test(t)) {
      startAustraliaScenario();
      reply({
        text: 'Set this configuration up for Australia and applied the regional compliance rules:',
        bullets: [
          'Removed surcharging — it isn’t allowed in Australia, so I turned it off and locked it for this market',
          'Kept contactless and confirm-amount on (allowed)',
          'Set the primary language to English',
        ],
        outro: 'Surcharging stays off for any device scoped to Australia. Review the change list and apply when ready.',
        docs: [
          { label: 'Surcharging rules by region', url: 'https://docs.adyen.com/point-of-sale/surcharging', desc: 'Where surcharging is and isn’t permitted.' },
        ],
        action: { label: 'Review', onClick: () => setReviewOpen(true) },
      });
      return;
    }

    // kick off the scripted scenario
    if (!step && /international|japan|日本|market[- ]?specific/.test(t)) {
      startJapanScenario();
      setFlow({ step: 'name' });
      reply({
        text: 'Setting this up for international shoppers in Japan. Here\u2019s what I changed:',
        bullets: [
          'Enabled DCC at a 3% margin',
          'Turned on tipping (gratuities)',
          'Enabled offline payments (€100 per-transaction limit)',
          'Enabled JCB, e-money (iD / QUICPay) and QR wallets',
          'Set the device language to Japanese',
        ],
        outro: 'The preview is updated. What should I name this configuration?',
        docs: [
          { label: 'Dynamic Currency Conversion', url: 'https://docs.adyen.com/platforms/in-person-payments/dynamic-currency-conversion', desc: 'Let shoppers pay in their home currency.' },
          { label: 'Payment methods in Japan', url: 'https://www.adyen.com/payment-methods-guides/asia-pacific/japan', desc: 'JCB, iD / QUICPay and QR wallets.' },
          { label: 'Offline payments', url: 'https://docs.adyen.com/point-of-sale/offline-payment', desc: 'Keep trading when the connection drops.' },
        ],
      }, ['Japan retail profile']);
      return;
    }
    if (step === 'name') {
      setScopeName(q);
      setFlow({ step: 'device', name: q });
      reply(`Named it “${q}”. Which devices should this configuration apply to?`, ['S1F2 · Android handheld', 'All Japan terminals']);
      return;
    }
    if (step === 'device') {
      setFlow({ ...flow, step: 'logo', device: q });
      reply(`Scoped to ${q}. Want me to upload the Uniqlo logo to the home screen and switch to a branded theme?`, ['Yes, upload the logo', 'Skip']);
      return;
    }
    if (step === 'logo') {
      if (/yes|logo|upload|brand/.test(t)) {
        setField('homeScreen', 'showLogo', true);
        setField('homeScreen', 'logoSrc', 'assets/tx/uniqlo.svg');
        setField('homeScreen', 'theme', 'Brand');
        setField('homeScreen', 'brandColor', '#E60012');
        setField('homeScreen', 'greeting', 'いらっしゃいませ');
        setField('receiptPrinting', 'header', 'Uniqlo');
        setScreen('home');
        reply('Uploaded the Uniqlo logo, applied their brand colour and set a Japanese welcome greeting on the home screen. Shall I install the Uniqlo retail Android app on these devices?', ['Install the app', 'Not now']);
      } else {
        reply('Skipped the logo. Shall I install the Uniqlo retail Android app on these devices?', ['Install the app', 'Not now']);
      }
      setFlow({ ...flow, step: 'app' });
      return;
    }
    if (step === 'app') {
      reply(/install|yes|app/.test(t)
        ? 'Queued the Uniqlo retail app (v3.4) to install on next sync. Apply the latest media & configuration updates too?'
        : 'No app install. Apply the latest media & configuration updates?', ['Apply updates', 'Skip']);
      setFlow({ ...flow, step: 'updates' });
      return;
    }
    if (step === 'updates') {
      const name = (flow && flow.name) || scopeName;
      setFlow(null);
      reply({
        text: `All set — I've prepared “${name}”:`,
        bullets: [
          'DCC, tipping and offline payments',
          'Japanese localization',
          'JCB, e-money (iD / QUICPay) and QR wallets',
          /apply|updates|yes/.test(t) ? 'Branded home screen, the retail app and the latest media & config updates' : 'Branded home screen',
        ],
        outro: 'Review the changes and apply them to your devices.',
        action: { label: 'Review', onClick: () => setReviewOpen(true) },
      });
      return;
    }

    // free-form fallback
    const changes = applyFromText(q);
    reply(changes.length
      ? `Done — I ${changes.join(', ')}. The preview and the change list are updated; review and apply when ready.`
      : "I couldn't map that to a setting yet. Try the “Enable devices for international clients in Japan” scenario, or mention theme, tipping, DCC, contactless, language, logo, greeting, or receipt header.");
  };

  // affected count
  const affected = useMemo(() => {
    if (scope.type === 'device') return scope.deviceIds ? scope.deviceIds.length : 1;
    let list = D.devices.filter(d => scope.storeIds.includes(d.storeId));
    if (scope.deviceIds) list = list.filter(d => scope.deviceIds.includes(d.id));
    return list.length;
  }, [scope]);

  // settings diff
  const settingsDiff = useMemo(() => {
    const out = [];
    SCHEMA.groups.forEach(g => g.fields.forEach(f => {
      const a = initial[g.id][f.id], b = vals[g.id][f.id];
      if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ group: g.title, label: f.label, from: Array.isArray(a) ? a.join(', ') : String(a), to: Array.isArray(b) ? b.join(', ') : String(b) });
    }));
    return out;
  }, [vals, initial]);

  // scope diff — a scope change is a reviewable change too
  const scopeDiff = useMemo(() => {
    const out = [];
    const list = (x) => (x && x.length ? x.join(', ') : '—');
    const cmp = (label, a, b, fmt = (x) => (x == null || x === '' ? '—' : String(x))) => { const A = fmt(a), B = fmt(b); if (A !== B) out.push({ group: 'Scope', label, from: A, to: B }); };
    cmp('Device types', scope0.deviceTypes, scope.deviceTypes, list);
    cmp('Markets', scope0.markets, scope.markets, list);
    cmp('Stores', scope0.storeIds, scope.storeIds, (x) => (x && x.length ? x.length + (x.length === 1 ? ' store' : ' stores') : '—'));
    cmp('Devices', scope0.deviceIds, scope.deviceIds, (x) => (x && x.length ? x.length + ' selected' : 'All in scope'));
    cmp('Configuration name', scope0.name, scopeName);
    cmp('Description', scope0.desc, scopeDesc);
    return out;
  }, [scope, scope0, scopeName, scopeDesc]);

  const diff = [...scopeDiff, ...settingsDiff];

  const previewScreens = PAGE_TYPES;

  const scopeSummary = scope.type === 'device'
    ? `1 device · ${scope.model || scope.deviceTypes[0] || 'device'}`
    : `${affected} device${affected === 1 ? '' : 's'} across ${scope.storeIds.length} store${scope.storeIds.length === 1 ? '' : 's'}`;

  // Scope card rules:
  //  · configuration/store level → editable scope (you're defining the profile).
  //  · a device that belongs to a configuration profile → shown read-only (inherited).
  //  · a standalone device (no configuration) → no scope card at all.
  const scopeConfig = scope.configuration || (scope.type === 'device' && scope.storeId ? 'Uniqlo APAC' : null);
  const scopeEditable = scope.type !== 'device';
  const showScope = scopeEditable || !!scopeConfig;

  const scopeControls = (
    <Col gap={16}>
      <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Configuration name</span>
        <InputField value={scopeName} onChange={(e) => setScopeName(e.target ? e.target.value : e)} placeholder="e.g. Terminal configuration" />
      </Col>
      <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Description</span>
        <Textarea value={scopeDesc} onChange={(e) => setScopeDesc(e.target ? e.target.value : e)} placeholder="What this scope is for (optional)" rows={2} />
      </Col>
      <div style={{ height: 1, background: T.sepFaint }} />
      <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Market / countries</span>
        <MultiDropdown values={scope.markets} onChange={(v) => setScope(s => ({ ...s, markets: v }))}
          placeholder="All markets" emptyLabel="All markets (no local rules)"
          options={['Japan', 'Germany', 'France', 'Netherlands', 'Belgium', 'Spain', 'Italy', 'United Kingdom', 'United States', 'Australia', 'Singapore', 'Brazil', 'Canada', 'Mexico'].map(c => ({ value: c, label: c }))} />
        {scope.markets.includes('Japan') && <span style={{ fontSize: 12, color: 'var(--b-color-label-highlight)' }}>Japan market settings are now available below.</span>}
      </Col>
      <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Device types</span>
        <MultiDropdown values={scope.deviceTypes} onChange={(v) => setScope(s => ({ ...s, deviceTypes: v }))}
          placeholder="Select device types" emptyLabel="Select device types"
          options={[{ value: 'Terminal', label: 'Terminal' }, { value: 'SoftPOS (Mobile devices)', label: 'SoftPOS (Mobile devices)' }, { value: 'SoftPOS (Card readers)', label: 'SoftPOS (Card readers)' }]} />
      </Col>
      {scope.type === 'device' ? (
        <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Device</span>
          <div style={{ ...selBtn, cursor: 'default' }}><span style={{ flex: 1 }}>{scope.model} · from device</span><Tag label="Locked" variant="grey" /></div>
        </Col>
      ) : (
        <>
          <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Stores</span>
            <MultiDropdown values={scope.storeIds} onChange={(v) => setScope(s => ({ ...s, storeIds: v, deviceIds: null }))} options={D.stores.map(st => ({ value: st.id, label: st.name }))} placeholder="Select stores" emptyLabel="Select stores" />
          </Col>
          <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Devices</span>
            <MultiDropdown values={scope.deviceIds || []} onChange={(v) => setScope(s => ({ ...s, deviceIds: v.length ? v : null }))}
              options={D.devices.filter(d => scope.storeIds.includes(d.storeId)).map(d => ({ value: d.id, label: `${d.serial} · ${d.model}` }))}
              emptyLabel="All devices in scope" />
          </Col>
        </>
      )}
    </Col>
  );

  return (
    <FullPage title={initialScope.type === 'device' ? (initialScope.model || initialScope.name || 'Device') : 'Device Studio'} onBack={onBack} backLabel={initialScope.type === 'device' ? 'Device overview' : initialScope.type === 'store' ? 'Store settings' : 'Back'} backIcon={<ArrowLeftGlyph />}
      badge={<Row gap={4}>
        <InfoTip width={320} content={isDeviceScreen
          ? <span>The <b>Device screen</b> edits device‑only settings (connectivity, hardware, passcodes). Store‑level policy (receipts, payments, language, branding) shows as <b>Inherited · Store</b> and is read‑only until you override it here.</span>
          : <span>Configure the settings that apply across the devices in scope. Store‑level policy sets the inherited default; device‑only settings are edited per device.</span>}>
          <Ico name="info" size={16} color={T.ink} />
        </InfoTip>
      </Row>}
      actions={<>
        <Button variant="secondary" onClick={onBack}>Cancel</Button>
        <Button variant="primary" iconLeft="checkmark" disabled={diff.length === 0} onClick={() => setReviewOpen(true)}>Review{diff.length ? ` (${diff.length})` : ''}</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
        {/* collapsed rail — click the panel icon to reopen the control panel */}
        {!panelOpen && (
          <div style={{ width: 48, flexShrink: 0, borderRight: `1px solid ${T.sep}`, background: T.card, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
            <GlyphButton title="Show control panel" onClick={() => setPanelOpen(true)}><PanelToggleIcon /></GlyphButton>
          </div>
        )}
        {/* control panel (docked left, drag-resizable) — settings always visible, AI composer at the bottom */}
        {panelOpen && (
        <div style={{ width: panelW, flexShrink: 0, borderRight: `1px solid ${T.sep}`, background: T.card, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Row style={{ padding: '8px 12px 8px 20px', borderBottom: `1px solid ${T.sepFaint}`, gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Settings</span>
            <ModeSwitch mode={chatMode} setMode={setChatMode} />
            <GlyphButton title="Hide control panel" onClick={() => setPanelOpen(false)}><PanelToggleIcon flip /></GlyphButton>
          </Row>

          {chatMode === 'agent' ? (
            <DockedAsk expanded messages={messages} draft={draft} setDraft={setDraft} onSend={sendChat} notify={notify} onRevert={revertTo} onNewSession={newSession} />
          ) : (<>
          {/* persistent scope — editable when defining a configuration; read-only (inherited)
              for a device inside a configuration; hidden for a standalone device */}
          {showScope && (
          <div style={{ flexShrink: 0, padding: '12px 16px', borderBottom: `1px solid ${T.sep}`, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--b-color-background-secondary)' }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: T.faint }}>Scope</span>
              <span style={{ fontSize: 11, color: T.faint }}>{scopeEditable ? 'Applies to all settings below' : 'Inherited · read-only'}</span>
            </Row>
            {scopeEditable ? (
              <button className="ns-suggest" onClick={() => setScopeOpen(true)} title="Edit scope & devices"
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: T.radiusM, background: T.card, cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--b-color-background-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Ico name="store" size={16} color={T.sub} />
                </span>
                <Col gap={1} style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scopeName || 'Configuration'}</span>
                  <span style={{ fontSize: 12, color: T.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${scope.storeIds.length} store${scope.storeIds.length === 1 ? '' : 's'} · 15 devices`}</span>
                </Col>
                <Ico name="edit-1" size={16} color={T.faint} />
              </button>
            ) : (<>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: T.radiusM, background: T.card }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--b-color-background-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Ico name="terminal-1" size={16} color={T.sub} />
                </span>
                <Col gap={1} style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scope.model || scopeName || 'Device'}</span>
                  <span style={{ fontSize: 12, color: T.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Inherited from {scopeConfig}</span>
                </Col>
                <Ico name="lock" size={16} color={T.faint} />
              </div>
              <Alert type="highlight" variant="tip" description={<span>Scope is set by the <b>{scopeConfig}</b> configuration profile. Edit that configuration to change which devices these settings apply to.</span>} />
            </>)}
          </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px' }}>
            {/* setting groups — grouped by owning level per the scoping rule; market-specific
               groups appear only for a selected market */}
            {(() => {
              const visibleGroups = SCHEMA.groups.filter(g => !g.market || scope.markets.includes(g.market));
              let lastSection = null;
              return visibleGroups.map(g => {
              const types = scope.deviceTypes.length ? scope.deviceTypes : ['Terminal'];
              const supported = types.some(dt => groupSupported(g, dt, scope.model));
              const groupChanged = g.fields.some(f => JSON.stringify(initial[g.id][f.id]) !== JSON.stringify(vals[g.id][f.id]));
              // Scoping rule: policy (Store-owned) groups are inherited on the Device screen and
              // read-only until the user overrides for this device. Device-only groups edit here.
              const isPolicy = g.level !== 'device';
              const inherited = isDeviceScreen && isPolicy && !overrides.has(g.id);
              const section = isPolicy ? 'policy' : 'device';
              const showHeader = section !== lastSection;
              lastSection = section;
              const sectionLabel = isPolicy
                ? (isDeviceScreen ? 'Store policy · inherited' : 'Policy settings')
                : 'Device-only settings';
              const badge = !supported ? <Tag label="Not on selected devices" variant="grey" />
                : inherited ? <Tag label="Inherited · Store" variant="grey" />
                : (isDeviceScreen && !isPolicy) ? <Tag label="Device-only" variant="blue" />
                : (groupChanged ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0070F5', flexShrink: 0 }} /> : null);
              return (
                <React.Fragment key={g.id}>
                {showHeader && <div style={{ fontSize: 12, fontWeight: 600, color: T.faint, padding: '16px 0 6px' }}>{sectionLabel}</div>}
                <Accordion open={supported && openGroups.has(g.id)} onToggle={() => supported && toggleGroup(g.id)}
                  title={g.title} desc={g.desc} disabled={!supported} right={badge}>
                  <Col gap={16}>
                    {inherited && (
                      <Alert type="highlight" variant="tip" description={
                        <span>Set at Store level — read-only. <button type="button" onClick={() => toggleOverride(g.id)} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 600, color: 'var(--b-color-link-primary)', textDecoration: 'underline', textUnderlineOffset: 2 }}>Override for {scope.type === 'device' ? 'this device' : 'these devices'}</button>.</span>
                      } />
                    )}
                    {isDeviceScreen && isPolicy && overrides.has(g.id) && (
                      <Row gap={8} style={{ justifyContent: 'flex-end' }}>
                        <Button variant="tertiary" condensed iconLeft="refresh" onClick={() => { g.fields.forEach(f => setField(g.id, f.id, Array.isArray(initial[g.id][f.id]) ? initial[g.id][f.id].slice() : initial[g.id][f.id])); toggleOverride(g.id); }}>Reset to inherited</Button>
                      </Row>
                    )}
                    <div style={{ opacity: inherited ? 0.55 : 1, pointerEvents: inherited ? 'none' : 'auto' }}>
                      <Col gap={16}>
                        {g.fields.filter(f => isVisible(f, vals[g.id])).map(f => (
                          <div key={f.id} onFocus={() => g.preview && setScreen(g.preview)} onClickCapture={() => g.preview && setScreen(g.preview)}>
                            <SettingRow field={f} val={vals[g.id][f.id]} onChange={(fid, v) => setField(g.id, fid, v)} />
                          </div>
                        ))}
                      </Col>
                    </div>
                  </Col>
                </Accordion>
                </React.Fragment>
              );
              });
            })()}
          </div>
          </>)}
        </div>
        )}

        {panelOpen && <ResizeHandle onMouseDown={startResize} />}
        {/* simulator — screen-flow tab bar on top, device centered, device/state dropdowns on the right */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: T.page }}>
          <FlowTabs value={screen} onChange={setScreen} options={previewScreens} />
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'stretch', gap: 32, padding: '28px 32px 36px' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Simulator vals={vals} screen={screen} deviceId={previewDevice} txAmount={txAmountVar} deviceType={(scope.deviceTypes[0] || 'Terminal').indexOf('SoftPOS') === 0 ? 'SoftPOS' : 'Terminal'}
                tx={{ base: 100, tip, tipValue: tip == null ? 0 : tip === 'custom' ? 5 : 100 * tip / 100, total: 100 + (tip == null ? 0 : tip === 'custom' ? 5 : 100 * tip / 100), setTip }} />
            </div>
            <Col gap={16} style={{ width: 240, flexShrink: 0, alignSelf: 'flex-start' }}>
              <Col gap={6}><span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>Device model</span>
                <Dropdown value={previewDevice} onChange={setPreviewDevice} options={TX_DEVICES.map(d => ({ value: d.id, label: `${d.name} · ${d.w}×${d.h}` }))} />
              </Col>
              {screen === 'transaction' && (
                <Col gap={6}><span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>Transaction state</span>
                  <Dropdown value={txAmountVar ? 'amt' : 'noamt'} onChange={(v) => setTxAmountVar(v === 'amt')} options={[{ value: 'amt', label: 'Amount entered' }, { value: 'noamt', label: 'Awaiting card' }]} />
                </Col>
              )}
            </Col>
          </div>
        </div>
      </div>

      {/* review & apply */}
      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Review changes" width={560}
        description={scopeSummary}
        footer={<Row gap={8} style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setReviewOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => {
            setReviewOpen(false);
            // Configuration/fleet level → publish it to the configuration library (top of the list).
            if (scopeEditable && onApply) {
              const dt = scope.deviceTypes[0] || 'Terminal';
              const market = (scope.markets || [])[0];
              onApply({
                id: 'cfg-' + Date.now(), name: scopeName || 'New configuration',
                appliesTo: `${scope.deviceTypes.join(', ') || dt}${market ? ' · ' + market : ''}`,
                deviceType: dt, market, stores: scope.storeIds.length, devices: affected,
                status: 'Published', statusV: 'green', updated: 'just now', isNew: true,
              });
              notify(`Published “${scopeName || 'configuration'}” to your configurations`);
            } else {
              notify(`Applied ${diff.length} change(s) to ${affected} device(s)`);
            }
            onBack();
          }}>Apply to {affected} device{affected === 1 ? '' : 's'}</Button>
        </Row>}>
        <Col gap={12}>
          <Alert type="warning" variant="tip" description={`This updates ${affected} device(s). Unsupported settings are skipped per device capability. Every change is audit-logged.`} />
          <div style={{ ...surface, overflow: 'hidden' }}>
            {diff.map((d, i) => (
              <Row key={i} style={{ padding: '12px 14px', borderBottom: i < diff.length - 1 ? `1px solid ${T.sepFaint}` : 'none' }} gap={12} align="center">
                <Col gap={2} style={{ flex: 1, minWidth: 0 }}><span style={{ fontSize: 13, fontWeight: 500 }}>{d.label}</span><span style={{ fontSize: 11, color: T.faint }}>{d.group}</span></Col>
                <Row gap={8} align="center" style={{ flexShrink: 0 }}>
                  {d.from && d.from !== '—' ? <Tag label={String(d.from)} variant="grey" /> : <span style={{ fontSize: 13, color: T.faint }}>—</span>}
                  <Ico name="arrow-right" size={16} color={T.faint} />
                  <Tag label={String(d.to)} variant="blue" />
                </Row>
              </Row>
            ))}
          </div>
        </Col>
      </Modal>

      {/* scope & devices */}
      <Modal open={scopeOpen} onClose={() => setScopeOpen(false)} title="Manage scope" width={600}
        description="Choose which devices this configuration applies to."
        footer={<Row gap={8} style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Row gap={6} style={{ alignItems: 'center', minWidth: 0 }}>
            <span style={{ fontSize: 13, color: T.ink }}>Applies to <b className="ns-num">15</b> devices</span>
          </Row>
          <Button variant="primary" onClick={() => setScopeOpen(false)}>Save</Button>
        </Row>}>
        {scopeControls}
      </Modal>
    </FullPage>
  );
}

/* ============================================================= TOAST
   Bento b-toast-1 — dark surface (#001222), white bold message, close X. */
function ToastHost({ toast, onClose }) {
  useEffect(() => { if (toast) { const t = setTimeout(onClose, 3600); return () => clearTimeout(t); } }, [toast]);
  if (!toast) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 600 }} className="ns-fade">
      <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 16, width: 420, maxWidth: 'calc(100vw - 48px)', background: '#001222', border: '1px solid #2F3E4D', boxShadow: '0px 6px 12px rgba(0,18,34,0.08), 0px 2px 4px rgba(0,18,34,0.04)', borderRadius: 8 }}>
        <span style={{ flex: 1, minWidth: 0, fontFamily: "'Adyen UI', var(--b-font-family-primary)", fontWeight: 700, fontSize: 14, lineHeight: '20px', color: '#FFFFFF' }}>{toast}</span>
        <button onClick={onClose} aria-label="Close" style={{ flexShrink: 0, width: 16, height: 16, marginTop: 2, border: 0, background: 'transparent', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
          <Ico name="cross" size={16} color="#FFFFFF" />
        </button>
      </div>
    </div>
  );
}

/* ============================================================= ROOT */
/* ============================================================= DEVICE STUDIO — SAVED PREVIEW */
const PREVIEW_SCREENS = [
  { value: 'home', label: 'Home' },
  { value: 'transaction', label: 'Payment' },
  { value: 'tipping', label: 'Tipping' },
  { value: 'receipt', label: 'Receipt' },
];

/* Read-only display of a single saved setting value. */
function settingValueNode(field, val) {
  const muted = { color: T.faint };
  if (field.type === 'toggle') return <span style={val ? undefined : muted}>{val ? 'On' : 'Off'}</span>;
  if (field.type === 'percent') return <span>{val}%</span>;
  if (field.type === 'numbers') return <span>{(val || []).join(', ')}%</span>;
  if (field.type === 'color') return (
    <Row gap={6}><span style={{ width: 12, height: 12, borderRadius: 3, background: val, border: `1px solid ${T.border}` }} /><span>{String(val).toUpperCase()}</span></Row>
  );
  const isNone = val === 'None' || val === '' || val == null;
  return <span style={isNone ? muted : undefined}>{isNone ? 'Not set' : String(val)}</span>;
}

/* Merchant's configuration library — reusable, mutually-exclusive device configurations.
   Each device follows exactly one (assignment is scoped by model / lane so they never overlap). */
const CONFIGURATIONS = [
  { id: 'cfg-fnb', name: 'Uniqlo APAC', appliesTo: 'Terminals · S1F2, AMS1', deviceType: 'Terminal', stores: 6, devices: 84, status: 'Published', statusV: 'green', updated: '2 days ago' },
  { id: 'cfg-retail', name: 'Retail counter', appliesTo: 'Terminals · SFO1 (countertop)', deviceType: 'Terminal', stores: 4, devices: 42, status: 'Published', statusV: 'green', updated: '1 week ago' },
  { id: 'cfg-kiosk', name: 'Self-service kiosk', appliesTo: 'Terminals · e355', deviceType: 'Terminal', stores: 2, devices: 12, status: 'Draft', statusV: 'orange', updated: '3 hours ago' },
  { id: 'cfg-softpos', name: 'SoftPOS — iOS', appliesTo: 'SoftPOS · iPhone (Tap to Pay)', deviceType: 'SoftPOS (Mobile devices)', market: 'Japan', stores: 3, devices: 18, status: 'Published', statusV: 'green', updated: 'yesterday' },
];

/* Device studio home — the merchant's configuration library. */
function ConfigLibrary({ onOpen, onNew, configs = CONFIGURATIONS }) {
  const th = (align) => ({ textAlign: align, padding: '12px 16px', fontSize: 14, color: T.ink, fontWeight: 600, background: T.card, borderTop: `1px solid ${T.sep}`, borderBottom: `1px solid ${T.sep}`, whiteSpace: 'nowrap' });
  const td = { padding: '14px 16px', borderBottom: `1px solid ${T.sep}`, whiteSpace: 'nowrap' };
  return (
    <div style={{ padding: `${T.s7}px ${T.s7}px ${T.s7}px`, maxWidth: T.maxW, margin: '0 auto' }}>
      <Row align="flex-start" style={{ marginBottom: T.s5 }}>
        <Col gap={4} style={{ flex: 1 }}>
          <Row gap={6}>
            <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Device studio</span>
            <InfoTip width={320} content={<span>A guided <b>wizard with a live simulator</b> to configure device properties — receipts, payments, branding and more — for a single device or in bulk, previewed before you publish.</span>} placement="right"><Ico name="info" size={16} color={T.ink} /></InfoTip>
          </Row>
          <span style={{ fontSize: 13, color: T.sub }}>A wizard with a live simulator to configure device properties — by device or in bulk.</span>
        </Col>
        <Button variant="primary" iconLeft="plus" onClick={onNew}>Add configuration</Button>
      </Row>
      <div style={{ background: T.card, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead><tr>
            <th style={th('left')}>Configuration</th>
            <th style={th('left')}>Applies to</th>
            <th style={th('right')}>Stores</th>
            <th style={th('right')}>Devices</th>
            <th style={th('left')}>Status</th>
            <th style={th('left')}>Last updated</th>
            <th style={th('right')} />
          </tr></thead>
          <tbody>
            {configs.map(cfg => {
              const soft = cfg.deviceType.indexOf('SoftPOS') === 0;
              return (
                <tr key={cfg.id} className="ns-row ns-clickable" onClick={() => onOpen(cfg)} style={cfg.isNew ? { background: 'var(--b-color-background-selected)' } : undefined}>
                  <td style={td}>
                    <Row gap={10}>
                      <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--b-color-background-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ico name={soft ? 'mobile' : 'terminal-2'} size={16} color={T.sub} /></span>
                      <span style={{ fontWeight: 600 }}>{cfg.name}</span>
                    </Row>
                  </td>
                  <td style={{ ...td, color: T.sub }}>{cfg.appliesTo}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--b-font-family-secondary)' }}>{cfg.stores}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--b-font-family-secondary)' }}>{cfg.devices}</td>
                  <td style={td}><Tag label={cfg.status} variant={cfg.statusV} /></td>
                  <td style={{ ...td, color: T.sub }}>{cfg.updated}</td>
                  <td style={{ ...td, textAlign: 'right' }}><Ico name="chevron-right" size={16} color={T.faint} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* Read-only view of one configuration: live preview + settings summary, then Edit. */
function StudioPreview({ config, onBack, onEdit }) {
  const cfg = config || { name: 'Uniqlo APAC', deviceType: 'Terminal' };
  const deviceType = cfg.deviceType && cfg.deviceType.indexOf('SoftPOS') === 0 ? 'SoftPOS' : 'Terminal';
  const previewId = deviceType === 'SoftPOS' ? 'IOS1' : 'S1E2';
  const vals = useMemo(() => SCHEMA.defaults(), []);
  const [screen, setScreen] = useState('home');
  const tx = { base: 100, tip: null, tipValue: 0, total: 100, setTip: () => {} };
  const groups = SCHEMA.groups.filter(g => groupSupported(g, deviceType, null));
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: `${T.s7}px ${T.s7}px ${T.s7}px`, maxWidth: T.maxW, margin: '0 auto', minHeight: 0 }}>
      {/* header */}
      {onBack && <div style={{ marginBottom: T.s3, flexShrink: 0 }}><Button variant="tertiary" condensed iconLeft="chevron-left" onClick={onBack}>Configurations</Button></div>}
      <Row style={{ marginBottom: T.s5, flexShrink: 0 }} align="flex-start">
        <Col gap={4} style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>{cfg.name}</span>
          <span style={{ fontSize: 13, color: T.sub, lineHeight: 1.3 }}>{deviceType} configuration{cfg.devices ? ` · ${cfg.devices} devices` : ''}{cfg.appliesTo ? ` · ${cfg.appliesTo}` : ''}</span>
        </Col>
        <Button variant="primary" iconLeft="settings" onClick={onEdit}>Edit configuration</Button>
      </Row>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: T.s4, alignItems: 'stretch' }}>
        {/* live preview — full height */}
        <div style={{ ...surface, flex: '1.4 1 380px', minWidth: 320, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} className="ns-tile">
          <Row gap={6} style={{ padding: `${T.s3}px ${T.s4}px`, borderBottom: `1px solid ${T.sepFaint}`, flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Live preview</span>
            <InfoTip content="Preview reflects this configuration applied across every device it targets.">
              <Ico name="info" size={16} color={T.ink} />
            </InfoTip>
          </Row>
          {/* Screen-flow tab bar — same as the Device Studio editor */}
          <FlowTabs value={screen} onChange={setScreen} options={PREVIEW_SCREENS} />
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: T.s6, display: 'flex', justifyContent: 'center', alignItems: 'center', background: T.card }}>
            <Simulator vals={vals} screen={screen} deviceId={previewId} txAmount deviceType={deviceType} tx={tx} />
          </div>
        </div>

        {/* saved settings summary — Bento structured list, independent scroll */}
        <div style={{ ...surface, flex: '1 1 300px', minWidth: 280, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Col gap={1} style={{ padding: `${T.s3}px ${T.s4}px`, borderBottom: `1px solid ${T.sepFaint}`, flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: T.faint }}>Configuration</span>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{cfg.name}</span>
          </Col>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: T.s5 }}>
          <Col gap={T.s6}>
            {groups.map(g => {
              const fields = g.fields.filter(f => isVisible(f, vals[g.id]));
              return (
                <Col key={g.id} gap={8}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{g.title}</span>
                  <StructuredList items={fields.map(f => ({ label: f.label, value: settingValueNode(f, vals[g.id][f.id]) }))} />
                </Col>
              );
            })}
          </Col>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [nav, setNav] = useState('device-intelligence');
  const [navOpen, setNavOpen] = useState(true);
  const [studioCfg, setStudioCfg] = useState(null); // selected configuration in Device studio
  const [configs, setConfigs] = useState(CONFIGURATIONS); // configuration library (new profiles prepend)
  const [env, setEnv] = useState('Test');
  const [stack, setStack] = useState([]); // overlay stack
  const [toast, setToast] = useState(null);
  const notify = useCallback((m) => setToast(m), []);
  const push = (o) => setStack(s => [...s, o]);
  const pop = () => setStack(s => s.slice(0, -1));
  const reset = () => setStack([]);

  // Fleet health is a Test-only page — if you leave Test while on it, fall back to Devices Intelligence.
  useEffect(() => { if (nav === 'fleet-health' && env !== 'Test') setNav('device-intelligence'); }, [env, nav]);

  const crumb = nav === 'device-studio' ? ['Devices', 'Device studio'] : nav === 'stores' ? ['Devices', 'Devices & locations'] : nav === 'fleet-health' ? ['Devices', 'Fleet health'] : ['Devices', 'Devices Intelligence'];

  const top = stack[stack.length - 1];

  const openStore = (storeId) => push({ type: 'store', storeId });
  const openDevice = (deviceId) => push({ type: 'device', deviceId });
  const openStudio = (scope) => push({ type: 'studio', scope });
  // "All stores/locations" opens the full-screen Locations modal (same as the Devices & Locations page CTA).
  const openAllStores = () => push({ type: 'allLocations' });
  const openAllDevices = () => push({ type: 'allDevices' });
  const openExplore = (tile) => push({ type: 'explore', tile });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header env={env} setEnv={setEnv} crumb={crumb} onToggleNav={() => setNavOpen(o => !o)} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {navOpen && <Sidebar active={nav} env={env} onNav={(n) => { reset(); setStudioCfg(null); setNav(n); }} />}
        <div style={{ flex: 1, overflow: 'auto', minWidth: 0, background: T.card, scrollbarGutter: 'stable' }}>
          {nav === 'device-studio' ? (
            studioCfg
              ? <StudioPreview config={studioCfg} onBack={() => setStudioCfg(null)}
                  onEdit={() => openStudio({ type: 'fleet', name: studioCfg.name, deviceType: studioCfg.deviceType, market: studioCfg.market })} />
              : <ConfigLibrary configs={configs} onOpen={setStudioCfg} onNew={() => openStudio({ type: 'fleet', name: 'New configuration', deviceType: 'Terminal' })} />
          ) : nav === 'stores' ? (
            <DeviceLocationsPage notify={notify} onOpenStore={openStore} onOpenStudio={openStudio} />
          ) : nav === 'device-intelligence' ? (
            <DeviceIntelligence notify={notify} onOpenAllStores={openAllStores} onOpenAllDevices={openAllDevices} onOpenExplore={openExplore} onOpenStudio={openStudio} />
          ) : nav === 'fleet-health' && env === 'Test' ? (
            <ConnectivityDetail asPage notify={notify} onOpenStudio={openStudio} onOpenStore={openStore} />
          ) : (
            <div style={{ padding: 40, color: T.sub }}><EmptyState icon="nav-home" title={NAV.find(n => n.id === nav || (n.children || []).some(c => c.id === nav))?.label || 'Section'} description="This area is out of scope for the Device North Star prototype. Use the Devices section." /></div>
          )}
        </div>
      </div>

      {top && top.type === 'allDevices' && <AllDevicesModal onBack={pop} onOpenDevice={openDevice} onOpenStore={openStore} onOpenStudio={openStudio} notify={notify} />}
      {top && top.type === 'allLocations' && <AllStoresModal notify={notify} onBack={pop} onOpenStore={openStore} onOpenStudio={openStudio} />}
      {top && top.type === 'store' && <StoreModal storeId={top.storeId} onBack={pop} onOpenDevice={openDevice} onOpenStudio={openStudio} notify={notify} />}
      {top && top.type === 'device' && <DeviceModal deviceId={top.deviceId} onBack={pop} onOpenStudio={openStudio} notify={notify} />}
      {top && top.type === 'studio' && <DeviceStudio scope={top.scope} onBack={pop} notify={notify}
        onApply={(cfg) => { setConfigs(c => [cfg, ...c.map(x => ({ ...x, isNew: false }))]); setStudioCfg(null); setNav('device-studio'); }} />}
      {top && top.type === 'explore' && <ExploreModal tile={top.tile} onBack={pop} />}

      {/* Global Ask — available on every main page (Fleet Intelligence has its own with Save-as-tile).
          Hidden while a full-page modal is open (those carry their own docked AI). */}
      {!top && nav !== 'device-intelligence' && nav !== 'fleet-health' && (
        <FloatingAsk notify={notify} context={nav === 'stores' ? 'devices' : nav === 'device-studio' ? 'studio' : 'fleet'} />
      )}

      <ToastHost toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
