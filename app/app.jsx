/* Device North Star — Customer Area prototype.
   Device Intelligence (know) drilling into Device Studio (change), on the Bento DS. */
const DS = window.PXDesignSystem_25da7e;
const {
  Card, Modal, Button, IconButton, Icon, Status, Tag, Chip, Alert, Toggle,
  InputField, Textarea, SegmentedControl, SelectionCard, RadioGroup, Checkbox,
  Menu, Tabs, Stepper, Pagination, Divider, Link, Avatar, EmptyState, LoadingIndicator, Tooltip,
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

/* Custom "peek side panel" glyph (used to collapse/expand the control panel). */
function PanelToggleIcon({ size = 20, flip }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style={{ display: 'block', transform: flip ? 'scaleX(-1)' : undefined }}>
      <path d="M10.392 6.125a.5.5 0 0 0-.5.5v6.75a.5.5 0 0 0 .5.5h4.683a.5.5 0 0 0 .5-.5v-6.75a.5.5 0 0 0-.5-.5z" />
      <path d="M4.5 4.125A2.125 2.125 0 0 0 2.375 6.25v7.5c0 1.174.951 2.125 2.125 2.125h11a2.125 2.125 0 0 0 2.125-2.125v-7.5A2.125 2.125 0 0 0 15.5 4.125zM3.625 6.25c0-.483.392-.875.875-.875h11c.483 0 .875.392.875.875v7.5a.875.875 0 0 1-.875.875h-11a.875.875 0 0 1-.875-.875z" />
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
        {data.labels.map((l, i) => (i % 2 === 0 || i === n - 1) && (
          <text key={l} x={x(i)} y={h - 7} textAnchor="middle" fontSize="10" fill="var(--lume-axis)">{l}</text>
        ))}
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
function Grid({ columns, rows, onCell, dense = false, rightAlignFrom = 1, renderCell }) {
  return (
    <div style={{ width: '100%', overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: T.radiusM, background: T.card }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {columns.map((c, ci) => (
              <th key={ci} style={{ textAlign: ci >= rightAlignFrom ? 'right' : 'left', padding: dense ? '8px 12px' : '10px 14px', fontSize: 13, color: T.ink, fontWeight: 600, background: T.card, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{c}</th>
            ))}
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
function FullPage({ title, subtitle, badge, onBack, backLabel = 'Back', backVariant = 'tertiary', backIcon = 'chevron-left', onClose, actions, children, tone, bodyBg }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') (onClose || onBack)(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: T.card, isolation: 'isolate' }} className="ns-sheet">
      {/* b-modal-fullscreen · header — back left · title centered · actions/close right */}
      <div style={{ flexShrink: 0, alignSelf: 'stretch', height: 64, display: 'flex', alignItems: 'center', gap: 24, padding: '12px 24px', background: T.card, borderBottom: `1px solid ${T.sep}`, position: 'relative' }}>
        {/* left — icon-only back (Bento arrow) */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', zIndex: 2 }}>
          {onBack && <GlyphButton title={backLabel && backLabel !== 'Back' ? backLabel : 'Back'} onClick={onBack}><ArrowLeftGlyph /></GlyphButton>}
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
          <Row gap={16} align="center" style={{ flexShrink: 0 }}>
            <span style={{ width: 1, height: 26, background: T.sep, flexShrink: 0 }} />
            <IconButton icon="cross" variant="tertiary" onClick={onClose || onBack} title="Close" />
          </Row>
        </div>
      </div>
      {/* body */}
      <div style={{ flex: 1, minHeight: 0, alignSelf: 'stretch', overflowY: 'auto', background: bodyBg, zIndex: 0 }}>{children}</div>
    </div>
  );
}

function Section({ title, description, actions, children, padded = true, style }) {
  return (
    <div style={{ ...surface, ...style }} className="ns-tile">
      {(title || actions) && (
        <Row style={{ padding: `${T.s4}px ${T.s5}px`, borderBottom: children ? `1px solid ${T.sepFaint}` : 'none', minHeight: 56 }}>
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
    { id: 'device-intelligence', label: 'Fleet Intelligence' },
    { id: 'stores', label: 'Devices & locations' },
    { id: 'device-studio', label: 'Device studio' },
  ] },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function Header({ env, setEnv, crumb, onToggleNav }) {
  return (
    <header style={{ height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: `1px solid ${T.sep}`, background: T.page, zIndex: 300 }}>
      {/* left zone — aligns with the sidebar */}
      <div style={{ width: T.navW, flexShrink: 0, display: 'flex', alignItems: 'center', gap: T.s2, height: '100%', paddingRight: T.s3 }}>
        <button className="ns-hdrbtn" aria-label="Toggle navigation" onClick={onToggleNav} style={{ width: 32, height: 32, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 0, background: 'none', borderRadius: 8, cursor: 'pointer', color: T.ink, padding: 0 }}>
          <Ico name="menu" size={16} />
        </button>
        <button className="ns-hdrbtn" title="Switch account" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 8px', border: 0, borderRadius: 8, cursor: 'pointer', background: 'none', color: T.ink }}>
          <span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--b-color-grey-3200)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Ico name="adyen-a-filled" size={16} color="var(--b-color-green-900)" />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0, textAlign: 'left' }}>
            <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Lightspeed_F&B</span>
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

function Sidebar({ active, onNav }) {
  // Groups expand/collapse independently (Bento b-navigation-menu-group). Default: the group
  // containing the active page starts open.
  const [open, setOpen] = useState(() => {
    const s = new Set();
    NAV.forEach(it => { if (it.children && it.children.some(c => c.id === active)) s.add(it.id); });
    return s;
  });
  const toggle = (id) => setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <aside style={{ width: T.navW, flexShrink: 0, height: '100%', background: T.page, borderRight: `1px solid ${T.borderStrong}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                    {item.children.map(c => (
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
  { id: 'featureInsight', name: 'Feature insight', kind: 'featureInsight', w: 'half' },
  { id: 'sdkHealth', name: 'SDK & OS health', kind: 'sdkHealth', w: 'half' },
  { id: 'firmware', name: 'Firmware health', kind: 'firmwareHealth', w: 'half' },
  { id: 'auth', name: 'Authorisation-rate trend', kind: 'chart', chart: 'authTrend', w: 'half' },
  { id: 'notReady', name: 'Not-ready reasons', kind: 'grid', grid: 'notReadyReasons', topic: 'notReady', w: 'half' },
  { id: 'compliance', name: 'Firmware & PCI compliance', kind: 'grid', grid: 'compliance', topic: 'compliance', w: 'half' },
  { id: 'storesAttention', name: 'Stores needing attention', kind: 'grid', grid: 'storesAttention', topic: 'storesAttention', w: 'full' },
  { id: 'notTransacting', name: 'Not-transacting reasons', kind: 'grid', grid: 'notTransacting', w: 'half' },
  { id: 'featureByModel', name: 'Feature adoption by model', kind: 'grid', grid: 'featureByModel', w: 'half' },
];
// Business insight ↔ Getting started, and SDK & OS health ↔ Firmware health sit side-by-side.
const DEFAULT_TILE_IDS = ['kpis', 'business', 'sdkHealth', 'firmware', 'featureInsight', 'auth', 'notReady'];

/* ---- Dashboard layout persistence ----
   The user's saved tile order survives reloads via localStorage. Bump LAYOUT_VERSION on any
   push that changes the default layout — that invalidates old saves so the new default wins;
   otherwise the user's own layout is always restored. */
const LAYOUT_VERSION = 5;
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
        <div key={k.id || i} className="ns-kpi" onClick={k.onClick} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', borderRadius: T.radiusM, background: 'var(--b-color-background-secondary)', cursor: k.onClick ? 'pointer' : 'default' }}>
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
    { id: 'devices', title: 'All devices', value: D.fmt(D.devices.length), hint: 'Devices across all your stores. Click to view all.', onClick: onOpenDevices },
    kpiById('gap'),
    kpiById('auth'),
    kpiById('atv'),
  ];
  return (
    <div>
      {actions && <Row style={{ justifyContent: 'flex-end', marginBottom: 8 }}>{actions}</Row>}
      <SummaryGrid items={fleetItems} cols={5} />
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
function FeatureInsightTile() {
  const data = D.featureAdoption;
  return (
    <div style={{ ...surface, overflow: 'hidden' }} className="ns-tile">
      <TileHeader title="Feature insight" subtitle="Feature adoption · last 12 months"
        info="Adoption of DCC, tipping and installments across your fleet over the last 12 months."
        right={<Legend series={data.series} />} />
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
        info="How this metric is measured and the period it covers."
        right={actions || <Legend series={data.series} />} />
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
const DEFAULT_ASK_MODELS = [{ id: 'general', label: 'North Star 2.5', desc: 'General fleet assistant', icon: 'sparkles' }];
const ASK_CONTEXTS = {
  fleet: {
    placeholder: 'Ask about fleet health, security or operations…',
    intro: 'Ask across your whole fleet — analytics, security, operations and troubleshooting.',
    models: [
      { id: 'analytics', label: 'Fleet Analytics 2.5', desc: 'Aggregate metrics, trends & reporting', icon: 'nav-analytics' },
      { id: 'security', label: 'Security Advisor', desc: 'Firmware & SDK compliance and risk', icon: 'settings' },
      { id: 'ops', label: 'Operations Copilot', desc: 'Terminal distribution & scaling', icon: 'store' },
    ],
    groups: [
      { label: 'Business enablement', icon: 'sparkles', prompts: ['Order new terminals for a store I\u2019m opening', 'Set up kitting and custom packaging for my next rollout', 'Create a new store and pre-configure its devices'] },
      { label: 'Fleet security analysis', icon: 'settings', prompts: ['Show firmware and SDK version distribution across my fleet', 'Which devices fall short of our security baseline?', 'What should I update first to meet PCI requirements?'] },
      { label: 'Operational intelligence', icon: 'store', prompts: ['Which terminals should I redistribute between stores?', 'Summarise fleet performance from the Management API', 'Where is device utilisation lowest across my locations?'] },
      { label: 'Troubleshooting visibility', icon: 'search', prompts: ['Pull the latest terminal logs for a device', 'Show the configuration distribution overview', 'Open the audit log for recent changes'] },
    ],
  },
  devices: {
    placeholder: 'Ask about ordering, onboarding or fulfilment…',
    intro: 'Ask about the device lifecycle — ordering, onboarding, supply chain and returns.',
    models: [
      { id: 'lifecycle', label: 'Lifecycle Assistant', desc: 'Order, replace, return, repair', icon: 'refresh' },
      { id: 'onboarding', label: 'Onboarding Guide', desc: 'Get terminals transacting on arrival', icon: 'store' },
      { id: 'supply', label: 'Supply Chain Copilot', desc: 'Fulfilment, stock & shipping', icon: 'grid' },
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
    models: [
      { id: 'custom', label: 'Customisation Studio', desc: 'Apps, media assets & configuration', icon: 'settings' },
      { id: 'payments', label: 'Payments Copilot', desc: 'Payment methods, features & billing', icon: 'bank' },
    ],
    groups: [
      { label: 'Customisation', icon: 'settings', prompts: ['Install an Android app on these devices', 'Upload a media asset to the home screen', 'Push a configuration update to this scope'] },
      { label: 'Payment integration', icon: 'bank', prompts: ['Launch a new payment method for this configuration', 'Enable a new feature and confirm billing', 'Turn on DCC and set the margin'] },
    ],
  },
};

function PromptBox({ q, setQ, onSend, thinking, onAdd, models, placeholder = 'Ask your fleet anything…' }) {
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useOutside(addOpen, () => setAddOpen(false));
  const mList = models && models.length ? models : DEFAULT_ASK_MODELS;
  const [modelOpen, setModelOpen] = useState(false);
  const modelRef = useOutside(modelOpen, () => setModelOpen(false));
  const [modelId, setModelId] = useState(mList[0].id);
  const model = mList.find(m => m.id === modelId) || mList[0];
  return (
    <div style={{ border: `1px solid ${T.borderStrong}`, borderRadius: T.radiusL, background: T.card, boxShadow: 'var(--b-shadow-low)' }}>
      {/* free text */}
      <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        placeholder={placeholder}
        style={{ width: '100%', border: 0, outline: 'none', resize: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, lineHeight: '20px', color: T.ink, padding: '12px 12px 6px' }} />
      {/* action toolbar */}
      <Row gap={6} style={{ padding: '6px 8px 8px' }}>
        <div ref={addRef} style={{ position: 'relative' }}>
          <IconButton icon="plus" variant="tertiary" condensed title="Add" onClick={() => setAddOpen(o => !o)} />
          {addOpen && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 600 }}>
              <Menu items={NL_ADD_ITEMS} onSelect={(v) => { setAddOpen(false); onAdd && onAdd(v); }} />
            </div>
          )}
        </div>
        <div ref={modelRef} style={{ position: 'relative' }}>
          <span onClick={() => setModelOpen(o => !o)} title="Choose AI model" className="ns-suggest"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 8px', borderRadius: 8, fontSize: 13, color: T.sub, cursor: 'pointer' }}>
            <Ico name={model.icon || 'sparkles'} size={16} color={T.sub} />
            {model.label}
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
  const run = (text) => {
    const query = (text || q).toLowerCase();
    if (!query.trim()) return;
    setThinking(true); setAns(null);
    setTimeout(() => {
      let best = D.nlAnswers[0], bestScore = -1;
      D.nlAnswers.forEach(a => { const score = a.match.filter(m => query.includes(m)).length; if (score > bestScore) { bestScore = score; best = a; } });
      setAns(best); setThinking(false);
    }, 650);
  };
  return (
    <div style={{ ...surface, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="ns-tile">
      {/* header */}
      <Row gap={10} style={{ flexShrink: 0, padding: `${T.s3}px ${T.s4}px`, borderBottom: `1px solid ${T.sep}` }}>
        <span style={{ lineHeight: 0, flexShrink: 0 }}><Ico name="sparkles" size={18} color="var(--b-color-label-primary)" /></span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>What would you like to know?</span>
        <Row gap={2}>
          {onToggleExpand && <GlyphButton title={expanded ? 'Collapse' : 'Expand'} onClick={onToggleExpand}><ExpandGlyph collapsed={expanded} /></GlyphButton>}
          {onMinimize && <IconButton icon="minus" variant="tertiary" onClick={onMinimize} title="Minimize" />}
        </Row>
      </Row>

      {/* scrollable conversation area */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: T.s4 }}>
        {!ans && !thinking && (
          <Col gap={T.s4}>
            <span style={{ fontSize: 13, color: T.sub, lineHeight: '19px' }}>{ctx.intro}</span>
            {ctx.groups.map(g => (
              <Col key={g.label} gap={1}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.faint, padding: '0 10px 4px' }}>{g.label}</span>
                {g.prompts.map(p => (
                  <button key={p} className="ns-suggest" onClick={() => run(p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', border: 0, background: 'transparent', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: T.ink, fontSize: 14 }}>
                    <Ico name={g.icon} size={16} color={T.sub} />
                    <span style={{ flex: 1 }}>{p}</span>
                    <Ico name="arrow-right" size={16} color={T.faint} />
                  </button>
                ))}
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
            <Row style={{ marginBottom: 14 }}>
              <Row gap={8} style={{ flex: 1, minWidth: 0 }}><Ico name="sparkles" size={16} color="var(--b-color-decorative-blue)" /><span style={{ fontSize: 13, color: T.sub }}>{ans.question}</span></Row>
              {onSaveTile && <Button variant="secondary" condensed iconLeft="plus" onClick={() => onSaveTile(ans)}>Save as tile</Button>}
            </Row>
            {/* headline number + summary, stacked above the table */}
            <Col gap={6} style={{ marginBottom: 16 }}>
              <Row gap={10} align="baseline">
                <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em', fontFamily: 'var(--b-font-family-secondary)' }}>{ans.metric.value}</span>
                <TrendPill trend={ans.metric.trend} dir={ans.metric.dir} />
              </Row>
              <span style={{ fontSize: 12, color: T.sub, fontWeight: 500 }}>{ans.metric.label}</span>
              <span style={{ fontSize: 14, color: T.ink, lineHeight: '20px', marginTop: 2 }}>{ans.answer}</span>
            </Col>
            {/* supporting table — full width */}
            <Grid columns={ans.grid.columns} rows={ans.grid.rows.slice(0, 5)} dense />
            {/* contextual follow-ups */}
            <Col gap={2} style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.sepFaint}` }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.faint, padding: '0 10px 2px' }}>You might also ask</span>
              {followups.map(f => (
                <button key={f.question} className="ns-suggest" onClick={() => run(f.question)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', border: 0, background: 'transparent', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: T.ink, fontSize: 14 }}>
                  <Ico name="sparkles" size={16} color={T.sub} />
                  <span style={{ flex: 1 }}>{f.question}</span>
                  <Ico name="arrow-right" size={16} color={T.faint} />
                </button>
              ))}
            </Col>
          </div>
          );
        })()}
      </div>

      {/* pinned prompt */}
      <div style={{ flexShrink: 0, padding: T.s4, borderTop: `1px solid ${T.sep}` }}>
        <PromptBox q={q} setQ={setQ} onSend={() => run()} thinking={thinking} models={ctx.models} placeholder={ctx.placeholder}
          onAdd={(v) => notify && notify((NL_ADD_ITEMS.find(i => i.value === v) || {}).label + ' — coming soon')} />
      </div>
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
            style={{ width: 'min(1000px, 100%)', height: 'min(860px, 92vh)', borderRadius: T.radiusL, boxShadow: 'var(--b-shadow-high)', overflow: 'hidden' }}>
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

/* Bento Summary (b-summary) — borderless label/value block used across explore detail pages. */
function SdkKpi({ label, value, onClick }) {
  return (
    <div className={onClick ? 'ns-kpi' : undefined} onClick={onClick} style={{ borderRadius: T.radiusM, padding: '14px 16px', background: 'var(--b-color-background-secondary)', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, cursor: onClick ? 'pointer' : 'default' }}>
      <span style={{ fontSize: 12, color: T.sub, fontWeight: 500 }}>{label}</span>
      <span className="ns-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', color: onClick ? 'var(--b-color-link-primary)' : T.ink, textDecoration: onClick ? 'underline' : 'none', textUnderlineOffset: 3 }}>{value}</span>
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
  return (
    <FullPage title="SDK & OS health — Tap to Pay & card readers" onBack={onBack} backLabel="" backIcon={<ArrowLeftGlyph />} onClose={onBack}
      actions={<Button variant="secondary" iconLeft="download" onClick={() => notify && notify('Exporting SDK & OS health to CSV…')}>Export</Button>} bodyBg={T.page}>
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
  const miniLabel = { fontSize: 11, color: T.faint, fontWeight: 600 };
  const num = (n) => n === 0 ? <span style={{ color: T.faint }}>–</span> : <span className="ns-num">{n}</span>;
  return (
    <FullPage title="Terminal software" onBack={onBack} backLabel="" backIcon={<ArrowLeftGlyph />} onClose={onBack}
      actions={<Button variant="primary" iconLeft="plus" onClick={() => notify && notify('Schedule update…')}>Schedule update</Button>} bodyBg={T.page}>
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
   data-readiness tag. All euro figures are ILLUSTRATIVE MOCK (F&B demo · 74 stores · 117 devices). */
function DeltaChip({ text, tone }) {
  const color = tone === 'risk' ? 'var(--b-color-label-critical)' : 'var(--b-color-label-success)';
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600, color }}><Ico name={tone === 'risk' ? 'arrow-down' : 'arrow-up'} size={14} color={color} />{text}</span>;
}
function MiniBar({ pct, color }) {
  return <div style={{ height: 6, borderRadius: 3, background: T.page, overflow: 'hidden' }}><div style={{ width: Math.max(0, Math.min(100, pct)) + '%', height: '100%', background: color || 'var(--b-color-decorative-green)' }} /></div>;
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
          <MiniBar pct={58} color="var(--lume-royalblue, #0066ff)" />
        </BizCard>,
        <BizCard key="tip" title="Tipping uplift" value="+~€18k/mo" delta="uplift" tone="up" info="Am I capturing tips? (F&B)" sub="46% attach · 9 stores off." action="Enable" onAction={say('Enable tipping on 9 stores')}>
          <MiniBar pct={46} color="var(--b-color-decorative-green)" />
        </BizCard>,
      ],
    },
    {
      label: 'Benchmark & cross-channel', cards: [
        <BizCard key="bench" title="Peer benchmark" value="+~€36k/mo" delta="vs sector" tone="up" info="How do I compare to F&B peers?" sub="94.2% auth vs sector ~95.0%." action="Compare" onAction={onOpenStores} />,
        <BizCard key="cross" title="Cross-channel" value="~€151k/30d" delta="2.3× spend" tone="up" info="Cards stored online, settled in-store?" sub="3,140 online → in-store · omnichannel 2.3×." action="Explore" onAction={say('Cross-channel flow — coming soon')} />,
        <BizCard key="next" title="Next best action" value="Enable DCC" delta="+~€22k/mo" tone="up" info="What should I do next, ranked by impact?" sub="49 eligible terminals." action="Apply" onAction={say('Applying recommendation…')} />,
      ],
    },
  ];
}

/* Full-screen business-impact detail — trend over time + the categorised metric cards. */
function BusinessInsightDetail({ onBack, notify, onOpenStores, onOpenDevices, onFirmware }) {
  const say = (m) => () => notify && notify(m);
  const RANGES = [
    { value: 'today', label: 'Today' }, { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: '90d', label: 'Last 90 days' }, { value: '12m', label: 'Last 12 months' },
  ];
  const [range, setRange] = useState('30d');
  const rangeLabel = (RANGES.find(r => r.value === range) || {}).label;
  const groups = businessGroups({ say, onOpenStores, onOpenDevices, onFirmware });
  const trend = {
    labels: D.volumeTrend.labels, unit: '€k', min: 0, max: 800,
    series: [
      { name: 'Revenue at risk (€k)', color: 'var(--b-color-decorative-red)', points: [760, 748, 735, 722, 714, 708, 704, 700, 702, 698, 696, 695] },
      { name: 'Opportunity (€k)', color: 'var(--b-color-decorative-green)', points: [58, 61, 63, 66, 68, 70, 72, 73, 74, 75, 76, 76] },
    ],
  };
  return (
    <FullPage title="Business insight" subtitle={rangeLabel} tone="nav-analytics"
      onBack={onBack} backLabel="" backIcon={<ArrowLeftGlyph />} onClose={onBack} bodyBg={T.page}
      actions={<Row gap={8}>
        <RangeChip value={range} onChange={setRange} options={RANGES} />
        <Button variant="secondary" iconLeft="download" onClick={say('Exporting business insight…')}>Export</Button>
      </Row>}>
      <div style={{ maxWidth: T.maxW, margin: '0 auto', padding: `${T.s7}px ${T.s7}px ${T.s7}px`, display: 'flex', flexDirection: 'column', gap: T.s6 }}>
        <SummaryGrid cols={2} items={[
          { title: 'Revenue at risk / month', value: '~€695k', hint: 'Idle devices, declines and stale software.' },
          { title: 'Opportunity identified / month', value: '+~€76k', hint: 'DCC, tipping and benchmark gap.' },
        ]} />
        <div style={{ ...surface, overflow: 'hidden' }}>
          <TileHeader title="Business impact over time" subtitle="Last 12 months · illustrative"
            right={<Legend series={trend.series} />} />
          <div style={{ padding: `0 ${T.s5}px ${T.s5}px`, height: 240 }}><LineChart data={trend} height={200} /></div>
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
      <div style={{ ...surface, overflow: 'hidden' }} className="ns-tile">
        <TileHeader title="Business insight" subtitle="Last 30 days"
          info={<span>What your fleet is <b>costing or making</b> you — and where to act. Explore for the trend and full breakdown.</span>}
          right={<Button variant="tertiary" condensed iconRight="arrow-right" onClick={open}>Explore</Button>} />
        <div style={{ padding: `0 ${T.s5}px ${T.s5}px` }}>
          <SummaryGrid cols={2} style={{ gridAutoRows: '1fr' }} items={[
            { title: 'Revenue at risk / month', value: '~€695k', hint: 'Idle devices, declines and stale software.', onClick: open },
            { title: 'Opportunity identified / month', value: '+~€76k', hint: 'DCC, tipping and benchmark gap.', onClick: open },
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
        <div style={{ marginBottom: T.s3 }}><Button variant="tertiary" condensed iconLeft="chevron-left" onClick={cancelEdit}>Fleet Intelligence</Button></div>
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
            <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Fleet Intelligence</span>
            <InfoTip width={320} content={<span>A single, queryable view of your whole device fleet across <b>IPP</b>, <b>SoftPOS</b> and <b>Checkout</b> — health, adoption and compliance. Ask questions in plain language or build your own dashboard.</span>} placement="right"><Ico name="info" size={16} color={T.ink} /></InfoTip>
          </Row>
          <span style={{ fontSize: 13, color: T.sub }}>One queryable view of your fleet across IPP, SoftPOS and Checkout · last sync 4 min ago</span>
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
            <div key={t.id} style={{ gridColumn: t.w === 'full' ? 'span 2' : 'span 1' }}>
              {t.kind === 'kpi'
                ? <KPITile actions={tileActions(t)} onOpenStores={onOpenAllStores} onOpenDevices={onOpenAllDevices} />
                : t.kind === 'featureInsight'
                  ? <FeatureInsightTile />
                : t.kind === 'business'
                  ? <BusinessInsight notify={notify} onOpenStores={onOpenAllStores} onOpenDevices={onOpenAllDevices} onFirmware={() => setFwOpen(true)} />
                : t.kind === 'onboarding'
                  ? <OnboardingTasks notify={notify} onOpenStores={onOpenAllStores} />
                : t.kind === 'sdkHealth'
                  ? <SdkHealthTile onExplore={() => setSdkOpen(true)} />
                : t.kind === 'firmwareHealth'
                  ? <FirmwareHealthTile onExplore={() => setFwOpen(true)} />
                : t.kind === 'chart'
                  ? <ChartCard t={t} actions={customize ? tileActions(t) : undefined} />
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
    </div>
  );
}

/* ============================================================= EXPLORE */
function ExploreModal({ tile, onBack }) {
  const g = D[tile.grid];
  const [sortCol, setSortCol] = useState(0);
  const [sortDir, setSortDir] = useState('asc');
  const [q, setQ] = useState('');
  const [facets, setFacets] = useState([]); // active first-column filters
  const facetCol = g.columns[0];
  const distinct = useMemo(() => [...new Set(g.rows.map(r => r[0]))], [g]);
  const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : n; };
  const rows = useMemo(() => {
    let r = g.rows.filter(row => (!q || row.join(' ').toLowerCase().includes(q.toLowerCase())) && (facets.length === 0 || facets.includes(row[0])));
    r = [...r].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol], an = num(av), bn = num(bv);
      let c = (an != null && bn != null) ? an - bn : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? c : -c;
    });
    return r;
  }, [g, sortCol, sortDir, q, facets]);
  const toggleSort = (ci) => { if (ci === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(ci); setSortDir('asc'); } };
  const available = distinct.filter(d => !facets.includes(d));
  return (
    <FullPage title={tile.name} subtitle="Per-topic explore · filter, sort and export" tone="nav-analytics" onBack={onBack} backLabel="Dashboard"
      actions={<Button variant="secondary" iconLeft="download">Export</Button>}>
      <div style={{ padding: '32px 20px 20px', maxWidth: 1040, margin: '0 auto' }}>
        {/* Bento-style filter bar: search · removable Chips · add-filter menu */}
        <Row style={{ marginBottom: 12, flexWrap: 'wrap' }} gap={8}>
          <SearchBar value={q} onChange={setQ} placeholder="Search…" width={260} />
          {facets.map(f => (
            <Chip key={f} label={`${facetCol}: ${f}`} condensed onRemove={() => setFacets(x => x.filter(v => v !== f))} />
          ))}
          <MenuButton variant="secondary" icon="filter" label="Add filter" align="left"
            items={available.length ? available.map(d => ({ value: d, label: d })) : [{ value: '_', label: 'No more values', disabled: true }]}
            onSelect={(v) => v !== '_' && setFacets(x => [...x, v])} />
          {facets.length > 0 && <Button variant="tertiary" condensed onClick={() => setFacets([])}>Clear</Button>}
          <span style={{ marginLeft: 'auto', fontSize: 13, color: T.sub }}>{rows.length} of {g.rows.length} rows</span>
        </Row>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusL, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {g.columns.map((c, ci) => (
                  <th key={ci} onClick={() => toggleSort(ci)} style={{ textAlign: ci === 0 ? 'left' : 'right', padding: '10px 14px', fontSize: 12, color: sortCol === ci ? T.ink : T.sub, fontWeight: 500, background: 'var(--b-color-background-secondary)', borderBottom: `1px solid ${T.sepFaint}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexDirection: ci === 0 ? 'row' : 'row-reverse' }}>{c}<Ico name={sortCol === ci ? (sortDir === 'asc' ? 'chevron-up-small' : 'chevron-down-small') : 'expand-vertical'} size={16} color={sortCol === ci ? T.sub : T.faint} /></span>
                  </th>
                ))}
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
const SM_MERCHANTS = ['Lightspeed F&B'];
const SM_COUNTRIES = ['Netherlands', 'France', 'Germany', 'Belgium', 'United Kingdom', 'Jersey'];
const SM_CITY = {
  Netherlands: ['Amsterdam', 'Rotterdam', 'Utrecht', 'Groningen', 'Eindhoven'],
  France: ['Paris', 'Lyon', 'Lille', 'Bordeaux'],
  Germany: ['Berlin', 'Hamburg', 'Munich'],
  Belgium: ['Antwerp', 'Brussels'],
  'United Kingdom': ['London', 'Manchester'],
  Jersey: ['Saint Helier'],
};
const SM_PROVINCES = {
  France: ['Auvergne-Rhône-Alpes', 'Bretagne', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie', 'Provence-Alpes-Côte d\'Azur'],
  Germany: ['Baden-Württemberg', 'Bayern', 'Berlin', 'Hamburg', 'Hessen', 'Niedersachsen', 'Nordrhein-Westfalen', 'Sachsen'],
  Belgium: ['Antwerpen', 'Brussels', 'Limburg', 'Liège', 'Namur', 'Oost-Vlaanderen', 'West-Vlaanderen'],
};
const SM_ZIP_RULES = {
  Netherlands: { re: /^\d{4}\s?[A-Za-z]{2}$/, example: '1234 AB', gen: (i) => (1011 + (i % 900)) + ' AB' },
  France: { re: /^\d{5}$/, example: '75001', gen: (i) => String(75001 + (i % 900)) },
  Germany: { re: /^\d{5}$/, example: '10115', gen: (i) => String(10115 + (i % 900)) },
  Belgium: { re: /^\d{4}$/, example: '1000', gen: (i) => String(1000 + (i % 8000)) },
  'United Kingdom': { re: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/, example: 'W1D 1AN', gen: (i) => 'W' + (1 + (i % 9)) + 'D ' + (1 + (i % 9)) + 'AN' },
  Jersey: { re: /^JE\d\s?\d[A-Z]{2}$/, example: 'JE1 1AA', gen: (i) => 'JE' + (1 + (i % 5)) + ' ' + (1 + (i % 9)) + 'AA' },
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
  Netherlands: ['Prinsengracht', 'Damrak', 'Coolsingel', 'Keizersgracht', 'Herengracht'],
  France: ['Rue de Rivoli', 'Boulevard Haussmann', 'Rue Sainte-Catherine', 'Cours Mirabeau'],
  Germany: ['Hauptstrasse', 'Kurfürstendamm', 'Mönckebergstrasse', 'Maximilianstrasse'],
  Belgium: ['Meir', 'Rue Neuve', 'Korenmarkt', 'Bondgenotenlaan'],
  'United Kingdom': ['Oxford Street', 'Regent Street', 'Deansgate', 'King Street'],
  Jersey: ['Halkett Place', 'King Street', 'Broad Street'],
};
// Fleet size per store is always 0 / 3 / 5 / 10; the online/last-7-days/off split is derived.
function smBreak(t) {
  const termOff = t >= 10 ? 2 : t >= 5 ? 1 : 0;
  const termWeek = t >= 10 ? 2 : t >= 3 ? 1 : 0;
  return { termOff, termWeek, termOnline: Math.max(0, t - termOff - termWeek) };
}
function smBuildStores() {
  const out = [];
  const names = ['Flagship', 'Outlet', 'Pop-up', 'Concept', 'Airport', 'Central', 'Station', 'Mall', 'Riverside', 'Old Town'];
  for (let i = 0; i < 63; i++) {
    const country = SM_COUNTRIES[i % SM_COUNTRIES.length];
    const cities = SM_CITY[country];
    const city = cities[i % cities.length];
    const roads = SM_STREETS[country];
    const statusRoll = i % 11;
    const status = statusRoll === 10 ? 'Closed' : (statusRoll >= 8 ? 'Inactive' : 'Active');
    const terminals = status === 'Closed' ? 0 : [0, 3, 5, 10, 5, 0, 3, 10, 5, 3][i % 10];
    const { termOnline, termWeek, termOff } = smBreak(terminals);
    const zip = smZipFor(country, i);
    out.push({
      id: 'st' + i, code: 'ST_' + (10420 + i * 7), name: names[i % names.length] + ' ' + city,
      status, country, city, street: roads[i % roads.length] + ' ' + (12 + (i * 3) % 180), zip,
      phone: '+31 20 555 ' + (1000 + i), merchant: SM_MERCHANTS[i % SM_MERCHANTS.length],
      terminals, termOnline, termWeek, termOff,
      storeId: 'ST' + (32940 + i * 137) + 'D22322BD5PPM' + (6852 + i) + 'ZKW',
    });
  }
  return out;
}
const SM_ATELIER = [['AT', 'Ringstrasse 1', '1010', 'Vienna', 'Austria'], ['BE', 'Rue Neuve 1', '1000', 'Brussels', 'Belgium'], ['DE', 'Alexanderplatz 1', '10178', 'Berlin', 'Germany'], ['DK', 'Kobmagergade 1', '1150', 'Copenhagen', 'Denmark'], ['ES', 'Gran Via 1', '28013', 'Madrid', 'Spain'], ['FI', 'Mannerheimintie 1', '00100', 'Helsinki', 'Finland'], ['FR', 'Rue de Rivoli 1', '75001', 'Paris', 'France'], ['IE', 'Grafton Street 1', 'D02X285', 'Dublin', 'Ireland'], ['IT', 'Via del Corso 1', '00186', 'Rome', 'Italy'], ['NL', 'De Pijp', '1075NS', 'Amsterdam', 'Netherlands'], ['PT', 'Rua Augusta 1', '1100148', 'Lisbon', 'Portugal']].map(function (a, i) {
  const cc = a[0]; const t = [5, 0, 3, 10, 0, 3, 5, 3, 10, 5, 0][i]; const b = smBreak(t);
  return { id: 'ae' + i, code: 'Atelier_Eva_' + cc, name: 'Atelier_Eva_' + cc, status: 'Active', country: a[4], city: a[3], street: a[1], zip: a[2], phone: '+00 000 000 ' + (1000 + i), merchant: 'Lightspeed F&B', terminals: t, termOnline: b.termOnline, termWeek: b.termWeek, termOff: b.termOff, storeId: 'ST' + (30000 + i * 137) + 'D22322BD5PPM' + (6000 + i) + 'ZKW' };
});
const SM_STORES = SM_ATELIER.concat(smBuildStores());
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

  // Devices in this store (mixed terminals + SoftPOS), for the table below.
  const devRows = useMemo(() => makeTerminals(store.terminals, { seed, store: store.code, country: store.country, address: store.street }).map(r => ({ ...r, _type: 'Terminal' }))
    .concat(makeMobiles(Math.max(0, Math.round(store.terminals / 4)), { seed: seed + 5, store: store.code, country: store.country }).map(r => ({ ...r, _type: 'Mobile' }))), [store.id, store.terminals]);
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: T.s5, alignItems: 'stretch' }}>
          {/* device status */}
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

          {/* payment methods */}
          <Section title="Payment methods">
            <Col gap={12}>
              <Row gap={8}><span style={{ fontSize: 13, color: T.sub }}>Currency</span><Tag label={currency} variant="grey" /><span style={{ marginLeft: 'auto', fontSize: 13, color: T.sub }}>Avg. ticket <b className="ns-num" style={{ color: T.ink }}>{atv}</b></span></Row>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {methods.map(m => <span key={m} style={{ display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 10px', border: `1px solid ${T.sep}`, borderRadius: T.radiusM, fontSize: 12, fontWeight: 500 }}>{m}</span>)}
              </div>
            </Col>
          </Section>
        </div>

        {/* volume trend */}
        <Section title="Transaction volume · last 12 months" actions={<Legend series={data.series} />}>
          <div style={{ height: 220 }}><LineChart data={data} height={200} /></div>
        </Section>

        {/* store information — below the graph, with an Edit action */}
        <Section title="Store information" actions={<Button variant="secondary" condensed iconLeft="edit-1" onClick={() => onEditStore && onEditStore()}>Edit</Button>}>
          <StructuredList labelWidth={160} items={[
            { label: 'Store reference', value: store.code, copy: true },
            { label: 'Store ID', value: store.storeId, copy: true },
            { label: 'Address', value: store.street },
            { label: 'Zip code', value: store.zip },
            { label: 'City', value: store.city },
            { label: 'Country/Region', value: store.country },
          ]} />
        </Section>

        {/* devices — data table below store information */}
        <Col gap={12}>
          <Row style={{ minHeight: 28 }}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', flex: 1 }}>Devices</span>
          </Row>
          {devRows.length > 0
            ? <DeviceGrid columns={devCols} rows={devRows} notify={notify} bordered />
            : <EmptyState icon="terminal-2" title="No devices" description="This location has no payment devices yet." />}
        </Col>
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
    <FullPage title={store.code} subtitle="All terminal settings" tone="store" onBack={onBack} backLabel="" backIcon={<ArrowLeftGlyph />} onClose={onBack} bodyBg={T.page}
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
  const [mode, setMode] = useState('insights'); // 'insights' (default) → 'settings'
  const [studioOpen, setStudioOpen] = useState(false); // Device configuration → Device Studio overlay
  const [settingsListOpen, setSettingsListOpen] = useState(false); // View all settings → audit table
  const [chatMode, setChatMode] = useState('manual'); // manual settings vs agent chat
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
    <FullPage title={store.name} subtitle={`${store.code} · ${store.city}, ${store.country}`} tone="store"
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

        {/* control panel (docked left) — nav folded in as section accordions, AI composer at bottom */}
        {panelOpen && (
          <div style={{ width: 440, flexShrink: 0, borderRight: `1px solid ${T.sep}`, background: T.card, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Row style={{ padding: '8px 12px 8px 20px', borderBottom: `1px solid ${T.sepFaint}`, gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Store settings</span>
              <ModeSwitch mode={chatMode} setMode={setChatMode} />
              <GlyphButton title="Hide control panel" onClick={() => setPanelOpen(false)}><PanelToggleIcon flip /></GlyphButton>
            </Row>
            {chatMode === 'agent' ? (
              <DockedAsk expanded messages={messages} draft={draft} setDraft={setDraft} onSend={sendChat} />
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

        {/* canvas (left) — left controls pinned to the top · device centered both axes */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', alignItems: 'stretch', gap: 32, padding: '32px 32px 40px', background: T.page }}>
          <div style={{ width: 300, flexShrink: 0, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Col gap={8}><span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>Screen</span>
              <ChipPicker value={screen} onChange={setScreen} options={PAGE_TYPES} />
            </Col>
            <Col gap={8}><span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>Device ({fleet.length} in store)</span>
              <ChipPicker value={selModel} onChange={setSelModel} options={deviceTypes.map(dt => ({ value: dt.model, label: dt.label, count: dt.count, icon: dt.deviceType === 'SoftPOS' ? 'mobile' : 'terminal-2' }))} />
            </Col>
            {screen === 'transaction' && (
              <Col gap={8}><span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>Transaction state</span>
                <ChipPicker value={txAmountVar ? 'amt' : 'noamt'} onChange={(v) => setTxAmountVar(v === 'amt')} options={[{ value: 'amt', label: 'Amount entered' }, { value: 'noamt', label: 'Awaiting card' }]} />
              </Col>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Simulator vals={vals} screen={screen} deviceId={previewDevice} txAmount={txAmountVar} deviceType={deviceType}
              tx={{ base: 100, tip, tipValue, total: 100 + tipValue, setTip }} />
          </div>
          {/* right spacer balances the 300px control column so the device sits in the true center */}
          <div style={{ width: 300, flexShrink: 0 }} aria-hidden />
        </div>
      </div>
      )}

      {/* review & apply */}
      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Review changes" width={560}
        description={`${store.code} · ${affected} terminal${affected === 1 ? '' : 's'}`}
        footer={<Row gap={8} style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setReviewOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => { setReviewOpen(false); notify && notify(`Applied ${diff.length} change(s) to ${store.code}`); onBack(); }}>Apply to {affected} terminal{affected === 1 ? '' : 's'}</Button>
        </Row>}>
        <Col gap={12}>
          <Alert type="warning" variant="tip" description={`This updates the ${affected} terminal${affected === 1 ? '' : 's'} in ${store.code}. Unsupported settings are skipped per device capability. Every change is audit-logged.`} />
          <div style={{ ...surface, overflow: 'hidden' }}>
            {diff.map((dd, i) => (
              <Row key={i} style={{ padding: '12px 14px', borderBottom: i < diff.length - 1 ? `1px solid ${T.sepFaint}` : 'none' }} gap={8}>
                <Col gap={2} style={{ flex: 1 }}><span style={{ fontSize: 13, fontWeight: 500 }}>{dd.label}</span><span style={{ fontSize: 11, color: T.faint }}>{dd.group}</span></Col>
                <span style={{ fontSize: 13, color: T.sub, textDecoration: 'line-through' }}>{dd.from}</span>
                <Ico name="arrow-right" size={16} color={T.faint} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--b-color-link-primary)' }}>{dd.to}</span>
              </Row>
            ))}
          </div>
        </Col>
      </Modal>

      {/* store information — view mode, with an Edit CTA that switches to edit */}
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Store information" width={520}
        description={`${store.code} · ${store.city}, ${store.country}`}
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
  const [colW, setColW] = useState({ code: 150, status: 120, devices: 90, devstatus: 170, address: 280, merchant: 190 });
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
  const sourceStore = s.sourceStore || (SM_STORES[0].code + ' \u2014 ' + SM_STORES[0].name);

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
                <HCell k="code">Store code</HCell>
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
                  <div style={{ width: colW.code, flexShrink: 0 }}><a href="#" onClick={(e) => { e.preventDefault(); openStorePage(st.id); }} style={{ fontFamily: 'inherit', fontSize: 13, color: T.ink, textDecoration: 'underline', textUnderlineOffset: 2 }}>{st.code}</a></div>
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
        <FullPage title="Payment devices" subtitle={(SM_STORES.find(x => x.id === s.devicesStore) || {}).code} tone="terminal-1"
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
                notify && notify(`Added ${qty} ${s.addDevModel} to ${st ? st.code : 'store'}`);
              }}>Add {qty > 0 ? qty + ' ' : ''}device{qty === 1 ? '' : 's'}</Button>
            </Row>}>
            <Col gap={16}>
              <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Assign to store</span>
                <Dropdown value={s.addDevStore} onChange={(v) => setState({ addDevStore: v })} options={SM_STORES.map(x => ({ value: x.id, label: `${x.code} · ${x.city}, ${x.country}` }))} />
              </Col>
              <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Device model</span>
                <Dropdown value={s.addDevModel} onChange={(v) => setState({ addDevModel: v })} options={['S1F2', 'AMS1', 'V400m', 'e355', 'S1E2', 'SFO1'].map(m => ({ value: m, label: m }))} />
              </Col>
              <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Quantity</span>
                <InputField value={s.addDevQty} onChange={(e) => setState({ addDevQty: (e.target ? e.target.value : e).replace(/[^0-9]/g, '') })} placeholder="1" />
              </Col>
              {st && <div style={{ padding: '10px 12px', background: 'var(--b-color-background-secondary)', borderRadius: T.radiusM, fontSize: 13, color: T.sub }}><Ico name="info" size={16} color={T.ink} style={{ verticalAlign: 'middle', marginRight: 6 }} />{st.code} currently has {st.terminals} device{st.terminals === 1 ? '' : 's'}.</div>}
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
        <span style={{ fontSize: 12, fontWeight: 500 }}>{store.code}</span>
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
            <div style={{ minWidth: 0, fontSize: 17, fontWeight: 600 }}>{store.code}</div>
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
const DEV_COUNTRIES = ['Netherlands', 'United Kingdom', 'United States', 'France', 'Australia', 'Japan', 'Germany', 'Belgium'];
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
      store: loc ? loc.code : (o.store || ('Store_' + (1000 + (s % 8999)))), storeId: loc ? loc.id : null,
      merchant: loc ? loc.merchant : (o.merchant || 'Lightspeed F&B'),
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
      store: loc ? loc.code : (o.store || ('Store_' + (1000 + (s % 8999)))), storeId: loc ? loc.id : null,
      merchant: loc ? loc.merchant : (o.merchant || 'Lightspeed F&B'),
      lastTx: DEV_DATES[(s + 3) % DEV_DATES.length],
    });
  }
  return rows;
}

/* Single-select filter chip (e.g. date range) — 36px bordered button + popover, Luma filter-bar style. */
function RangeChip({ value, onChange, options, icon = 'timer' }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const cur = options.find(o => o.value === value) || options[0];
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 10px 0 12px', border: '1px solid #8C959D', borderRadius: 8, background: T.card, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: T.ink, boxSizing: 'border-box' }}>
        <Ico name={icon} size={16} color={T.sub} /><span>{cur.label}</span><Ico name="chevron-down-small" size={16} color={T.faint} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 600, minWidth: 200, background: '#fff', boxShadow: '0px 6px 12px rgba(0,18,34,0.08), 0px 2px 4px rgba(0,18,34,0.04), 0px 0px 0px 1px #DADDDF', borderRadius: 8, padding: 4 }}>
          {options.map(o => (
            <button key={o.value} className="b-menu-item" onClick={() => { onChange(o.value); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', border: 0, background: o.value === value ? 'var(--b-color-background-secondary)' : 'transparent', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: T.ink, textAlign: 'left' }}>{o.label}</button>
          ))}
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
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{ display: 'inline-flex', alignItems: 'stretch', height: 36, borderRadius: 8, background: active ? '#364553' : T.card, border: active ? 'none' : '1px solid #8C959D', boxSizing: 'border-box', overflow: 'hidden' }}>
        <button onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: active ? '0 8px 0 10px' : '0 10px', border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: active ? '#fff' : T.ink }}>
          <span>{label}</span>
          {active
            ? <span style={{ minWidth: 16, height: 20, padding: '0 4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#001222', borderRadius: 4, color: '#fff', fontSize: 14, fontWeight: 500 }}>{n}</span>
            : <Ico name="chevron-down-small" size={16} color={T.faint} />}
        </button>
        {active && (
          <button onClick={() => { onClear && onClear(); }} title={`Clear ${label}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, border: 0, borderLeft: '1px solid #9DA5AC', background: 'transparent', cursor: 'pointer' }}>
            <Ico name="cross" size={16} color="#fff" />
          </button>
        )}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 600, width: 320, background: '#fff', boxShadow: '0px 6px 12px rgba(0,18,34,0.08), 0px 2px 4px rgba(0,18,34,0.04), 0px 0px 0px 1px #DADDDF', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 420 }}>
          <div style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: '#001222' }}>Filter by {label.toLowerCase()}</div>
          <div style={{ height: 1, background: '#DADDDF' }} />
          {options.length > 8 && <div style={{ padding: '8px 16px 4px' }}><SearchBar value={pq} onChange={setPq} placeholder={`Search ${label.toLowerCase()}…`} width="100%" /></div>}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {list.length > 1 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', cursor: 'pointer', fontSize: 14 }} className="b-menu-item">
                <Checkbox checked={allOn} indeterminate={!allOn && list.some(o => selected.includes(o.value))} onChange={() => { const vals = list.map(o => o.value); if (allOn) vals.forEach(v => selected.includes(v) && onChange(v)); else vals.forEach(v => !selected.includes(v) && onChange(v)); }} />
                <span style={{ flex: 1 }}>Select all</span>
              </label>
            )}
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
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
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
function LocationDeviceTable({ stores, onOpenLocation, onOpenDevice, onConfigureStore, onCloseLocation, notify }) {
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
    return makeTerminals(s.terminals || 0, { seed, store: s.code, country: s.country, address: s.street }).map(r => ({ ...r, _type: 'Terminal' }))
      .concat(makeMobiles(Math.max(0, Math.round((s.terminals || 0) / 4)), { seed: seed + 5, store: s.code, country: s.country }).map(r => ({ ...r, _type: 'Mobile' })));
  };
  const cell = (c, r) => {
    if (c.key === 'code') return <a href="#" onClick={(e) => { e.preventDefault(); onOpenLocation(r.id); }} style={{ color: T.ink, fontWeight: 500, textDecoration: 'none' }}>{r.code}<span style={{ color: T.sub, fontWeight: 400 }}> · {r.city}, {r.country}</span></a>;
    if (c.key === 'devices') return <span className="ns-num">{r.devices}</span>;
    if (c.key === 'status') return r.devices ? <Row gap={12}>{[statusChip('var(--b-color-decorative-green)', r.online), statusChip('var(--b-color-decorative-orange)', r.idle), statusChip('var(--b-color-decorative-red)', r.off)].filter(Boolean)}</Row> : <span style={{ color: T.faint }}>No devices</span>;
    if (c.key === 'auth') return r.auth ? <span>{r.auth.toFixed(1)}%</span> : <span style={{ color: T.faint }}>—</span>;
    if (c.key === 'atv') return r.atv ? <span>€{r.atv}</span> : <span style={{ color: T.faint }}>—</span>;
    if (c.key === 'lastTx') return <span style={{ color: T.sub, fontSize: 13 }}>{r.lastTx}</span>;
    return null;
  };
  return (
    <div>
      <Row style={{ marginBottom: 16 }} gap={8}>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: T.sub, alignSelf: 'center' }}>{filtered.length} locations · {filtered.reduce((a, r) => a + r.devices, 0)} devices</span>
      </Row>
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
                  <div style={{ ...stickyL, width: 32, display: 'flex', justifyContent: 'center' }}><Ico name={open ? 'chevron-down-small' : 'chevron-right'} size={16} color={T.sub} /></div>
                  {cols.map(c => <div key={c.key} style={{ width: c.w, flexShrink: 0, boxSizing: 'border-box', paddingRight: 16, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={c.key === 'code' ? (e) => e.stopPropagation() : undefined}>{cell(c, r)}</div>)}
                  <div style={{ ...stickyR, width: 44, display: 'flex', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                    <MenuButton icon="options-vertical" variant="tertiary" items={[
                      { value: 'edit', label: 'Edit location', icon: 'edit-1' },
                      { value: 'configure', label: 'Configure devices', icon: 'settings' },
                      { value: 'close', label: 'Close location', icon: 'cross' },
                    ]} onSelect={(v) => v === 'edit' ? onOpenLocation(r.id) : v === 'configure' ? onConfigureStore(r) : onCloseLocation ? onCloseLocation(r) : notify && notify(`Closing ${r.code}…`)} />
                  </div>
                </SMRowEl>
                {open && (
                  <div style={{ background: 'var(--b-color-background-secondary)', padding: '4px 16px 12px 60px' }}>
                    {r.devices === 0
                      ? <span style={{ fontSize: 13, color: T.sub }}>This location has no devices yet.</span>
                      : genDevices(r).map((d, di) => (
                        <Row key={d.id} gap={12} style={{ padding: '10px 0', borderBottom: `1px solid ${T.sepFaint}` }}>
                          <button type="button" onClick={() => onOpenDevice(d)} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: T.ink, textDecoration: 'underline', textUnderlineOffset: 2, width: 150, textAlign: 'left', flexShrink: 0 }}>{d.model}</button>
                          <span style={{ width: 90, flexShrink: 0 }}><Tag label={d._type} variant={d._type === 'Mobile' ? 'blue' : 'grey'} /></span>
                          <Row gap={6} style={{ width: 170, flexShrink: 0 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: d.dot }} /><span style={{ fontSize: 13, color: T.sub }}>{d.lastActivity}</span></Row>
                          <span style={{ fontFamily: 'var(--b-font-family-secondary)', fontSize: 13, color: T.sub }}>{d._type === 'Mobile' ? d.sdkVersion : d.version}</span>
                        </Row>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
          {sorted.length === 0 && <div style={{ padding: '48px 24px', textAlign: 'center', color: T.sub, fontSize: 14 }}>No locations match your search.</div>}
        </div>
      </div>
      <Row gap={16} style={{ position: 'sticky', bottom: 0, zIndex: 3, background: T.card, borderTop: `1px solid ${T.sep}`, padding: '12px 16px', fontSize: 14, color: T.ink }}>
        <span style={{ color: T.sub }}>{sorted.length} locations</span>
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
  const [phase, setPhase] = useState('empty'); // empty · loading · done
  const answeredKey = SELECTOR_QUESTIONS.map(q => vals[q.id] || '').join('|');
  const complete = SELECTOR_QUESTIONS.every(q => vals[q.id]);
  const answeredCount = SELECTOR_QUESTIONS.filter(q => vals[q.id]).length;
  const matches = getMatches(vals);
  
  const setVal = (id, v) => setVals(s => ({ ...s, [id]: v }));
  const reset = () => { setVals({}); };

  // progressive reveal — show a question once the previous one is answered
  const visibleCount = Math.min(SELECTOR_QUESTIONS.length, answeredCount + 1);

  return (
    <FullPage title="Order devices" subtitle="Terminal selector · find the right device" tone="nav-devices"
      onBack={onBack} backLabel="Devices & locations" backIcon={<ArrowLeftGlyph />} onClose={onBack} bodyBg={T.page}
      actions={<Button variant="secondary" iconLeft="refresh" onClick={reset} disabled={answeredCount === 0}>Start over</Button>}>
      <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
        {/* control panel */}
        <div style={{ width: 400, flexShrink: 0, borderRight: `1px solid ${T.sep}`, background: T.card, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.sepFaint}` }}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Tell us about the client</span>
            <div style={{ marginTop: 8, height: 6, borderRadius: 100, background: T.page, overflow: 'hidden' }}><div style={{ width: `${(answeredCount / SELECTOR_QUESTIONS.length) * 100}%`, height: '100%', background: 'var(--b-color-decorative-blue)', borderRadius: 100, transition: 'width 200ms' }} /></div>
            <span style={{ fontSize: 12, color: T.faint, fontWeight: 500 }}>{answeredCount} of {SELECTOR_QUESTIONS.length} answered</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {SELECTOR_QUESTIONS.slice(0, visibleCount).map((q, i) => (
              <Col key={q.id} gap={6} className="ns-fade">
                <span style={{ fontSize: 13, color: T.sub }}>{i + 1}. {q.label}</span>
                <Dropdown value={vals[q.id] || ''} placeholder={`— ${q.ph} —`} onChange={(v) => setVal(q.id, v)} options={q.opts.map(([value, label]) => ({ value, label }))} />
              </Col>
            ))}
          </div>
        </div>
        {/* canvas — matching devices grid */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 40, background: T.page }}>
          <div style={{ maxWidth: 840, margin: '0 auto' }}>
            <Row style={{ marginBottom: 24, justifyContent: 'space-between' }}>
               <span style={{ fontSize: 18, fontWeight: 600 }}>{matches.length} matching device{matches.length === 1 ? '' : 's'}</span>
               {answeredCount > 0 && <span style={{ fontSize: 13, color: T.sub }}>Filters applied</span>}
            </Row>
            {matches.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: T.s4 }}>
                {matches.map(p => (
                  <div key={p.id} className="ns-fade" style={{ ...surface, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <OrderProductImg p={p} />
                    <Col gap={2}>
                      <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{p.name}</span>
                      <span style={{ fontSize: 13, color: T.sub }}>{p.type}</span>
                    </Col>
                    <Button variant="secondary" condensed onClick={() => onOrder && onOrder(p)}>Select</Button>
                  </div>
                ))}
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

/* ============================================================= ORDER FLOW
   Full-page "Add devices" purchasing flow (matches Adyen Orders & returns):
   region → product catalogue → product detail → checkout. All mock data. */
const ORDER_COUNTRIES = ['Netherlands', 'United Kingdom', 'United States', 'Germany', 'France', 'Spain', 'Australia', 'Japan'];
const ORDER_PRODUCTS = [
  { id: 's1f2', name: 'S1F2', type: 'Mobile', acc: 12, price: 395, blurb: 'An all-in-one Android device with printing power', specs: ['Portable', '2.4 and 5 GHz', '4G'], icon: 'mobile', img: 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoiYWR5ZW5cL2ZpbGVcL01hNHR4a3Fib29xbThtZ1VmY3JXLnBuZyJ9:adyen:0fcuuj2UrJ36lqGND2gZAKWNaTUWzI6sHcSO-iawPJU?format=webp&width=624&height=832',
    filter: { use: ['mobile'], card: 'all', input: 'touchscreen', os: 'all_in_one', offline: 'yes', print: 'yes' } },
  { id: 'ams1', name: 'AMS1', type: 'Mobile', acc: 5, price: 249, blurb: 'Designed by Adyen; your all-in-one terminal running on Android.', specs: ['Portable', 'Wi-Fi', '4G'], icon: 'mobile', img: 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoiYWR5ZW5cL3Q1Y2VySmpjV1B0UkpEZUR4a21SLnBuZyJ9:adyen:Kxr1RJJmlEr_VW--jzZVrMXBbA9jeCcRU6mQQNcP9KA?format=webp&width=624&height=832',
    filter: { use: ['mobile'], card: 'all', input: 'touchscreen', os: 'all_in_one', offline: 'yes', print: 'no' } },
  { id: 'nyc1', name: 'NYC1', type: 'Mobile', acc: 0, price: 79, blurb: 'Designed by us, inspired by you; a card reader for businesses on the move.', specs: ['Portable', 'Bluetooth'], icon: 'terminal-1', img: 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoiYWR5ZW5cL2IzREdwSzRzMmpSV0NYZFJteHo5LnBuZyJ9:adyen:PItds0nupqldFNFSHXLFJvhoGof3pmEmtuxz-1lEsu4?format=webp&width=624&height=832',
    filter: { use: ['mobile', 'unattended'], card: 'contactless_only', input: 'touchscreen', os: 'payment_only', offline: 'no', print: 'no' } },
  { id: 'sfo1', name: 'Adyen SFO1', type: 'Countertop', acc: 10, price: 329, blurb: 'Payment, branding, and customer engagement — all in one terminal.', specs: ['Countertop', 'Ethernet', 'Wi-Fi'], icon: 'terminal-2', img: 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoiYWR5ZW5cL2lRTnNmMkpZbXlpRHNZU3p3dmdOLnBuZyJ9:adyen:_IvTntqAuPTeu_ZpRw2fA7TdLa_vOz1SyMVixX0xI_c?format=webp&width=624&height=832',
    filter: { use: ['countertop'], card: 'all', input: 'touchscreen', os: 'all_in_one', offline: 'yes', print: 'yes' } },
  { id: 'v400m', name: 'V400m', type: 'Mobile', acc: 6, price: 289, blurb: 'Go-to portable, with fast printing and many connections.', specs: ['Portable', 'Wi-Fi', '4G'], icon: 'mobile', img: 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoiYWR5ZW5cL2dBcTZlZ3FidW00OUUzemVFa0ppLnBuZyJ9:adyen:a5trkKg2W6H4lcxWjeNC1WuKCNvcBJeV-fOhxqYxGk8?format=webp&width=624&height=832',
    filter: { use: ['mobile'], card: 'all', input: 'physical', os: 'payment_only', offline: 'yes', print: 'yes' } },
  { id: 'v400c', name: 'V400c Plus', type: 'Countertop', acc: 6, price: 309, blurb: 'Standalone countertop, with added printer.', specs: ['Countertop', 'Wi-Fi', 'Ethernet'], icon: 'terminal-2', img: 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoiYWR5ZW5cL0VNYXRkbTdEdzJqNjRrdGZIc05zLnBuZyJ9:adyen:TPUta3nY4UxF6mJpsba9NX4Yzu8QluRflLQ7caGBhRc?format=webp&width=624&height=832',
    filter: { use: ['countertop'], card: 'all', input: 'physical', os: 'payment_only', offline: 'yes', print: 'yes' } },
  { id: 'e285p', name: 'e285', type: 'Mobile', acc: 2, price: 199, blurb: 'Pocket-sized and mobile, for personal shopping.', specs: ['Portable', 'Wi-Fi'], icon: 'mobile', img: 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoiYWR5ZW5cL2lkaHdZU3VyTEphZ0pIWk10dFdBLnBuZyJ9:adyen:6sMtm8DqITQstuVuLP9fURW1MscS4hfmAzfHl-D9Ipc?format=webp&width=624&height=832',
    filter: { use: ['mobile'], card: 'all', input: 'physical', os: 'payment_only', offline: 'yes', print: 'no' } },
  { id: 'm450', name: 'M450', type: 'Countertop', acc: 5, price: 299, blurb: 'Impact, insights and two-way interactions.', specs: ['Countertop', 'Ethernet'], icon: 'terminal-2', img: 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoiYWR5ZW5cL0pQTWd1RDZlQXc1eXpWeTh1UEdjLnBuZyJ9:adyen:rECF9hGvC_4XwKal-lAuUlQVca5R9A-1JymbVyGXoE8?format=webp&width=624&height=832',
    filter: { use: ['countertop'], card: 'all', input: 'physical', os: 'payment_only', offline: 'yes', print: 'no' } },
  { id: 's1u2', name: 'S1U2', type: 'Unattended', acc: 3, price: 399, blurb: 'All-in-one unattended Android device.', specs: ['Unattended', 'Android'], icon: 'terminal-1', img: 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoiYWR5ZW5cL0FnNnVVNzV6a1g0RWpGTEhoUW9XLnBuZyJ9:adyen:l0WdmQ66XAeQJKIjL0Nyrw_J-PsNH4hTXjCi6C35q8k?format=webp&width=624&height=832',
    filter: { use: ['unattended'], card: 'all', input: 'touchscreen', os: 'all_in_one', offline: 'yes', print: 'no' } },
  { id: 'p630', name: 'P630', type: 'Countertop', acc: 5, price: 349, blurb: 'Premium design, full of features and ultra-reliable.', specs: ['Countertop', 'Ethernet'], icon: 'terminal-2', img: 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoiYWR5ZW5cL280NGNoMTQ5R2lNbTRlYWJIZFFDLnBuZyJ9:adyen:FZLbWs22rLP6LDkPk9dAV4hu70NZQf9GhDZIpwO22Kc?format=webp&width=624&height=832',
    filter: { use: ['countertop'], card: 'all', input: 'physical', os: 'payment_only', offline: 'yes', print: 'no' } },
  { id: 'ttp', name: 'Tap to Pay', type: 'SoftPOS', acc: 0, price: 0, blurb: 'Accept contactless right on the seller’s own phone.', specs: ['SoftPOS', 'iOS & Android'], icon: 'mobile', img: 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoiYWR5ZW5cL2ZpbGVcL0V1UmVFa0JnTXRGVkV1b2FRdDVoLnBuZyJ9:adyen:tQaYhK5XULpw88hLg-inj7a13EvSCDYRL2jYfAJ5hAQ?format=webp&width=624&height=832',
    filter: { use: ['smartphone'], card: 'contactless_only', input: 'touchscreen', os: 'all_in_one', offline: 'no', print: 'no' } },
];
/* Delivered-but-not-yet-assigned devices awaiting activation (mock). */
const ACTIVATE_PENDING = [
  { model: 'S1F2', icon: 'mobile', type: 'Mobile', spec: 'Android · portable · 4G · built-in printer', serial: '0000CC-18B4-2231' },
  { model: 'V400m', icon: 'mobile', type: 'Mobile', spec: 'Portable · Wi-Fi + 4G · colour touchscreen', serial: '0001682249-1057' },
  { model: 'P400 Plus', icon: 'terminal-2', type: 'Countertop', spec: 'Countertop · Ethernet + Wi-Fi · PIN pad', serial: '0001682221-7781' },
  { model: 'AMS 1', icon: 'mobile', type: 'Mobile', spec: 'Android · portable · Wi-Fi', serial: '0000CC-18B4-9942' },
  { model: 'NYC 1', icon: 'terminal-1', type: 'Mobile', spec: 'Pocket reader · Bluetooth · pairs with phone', serial: '0000CC-22A1-3380' },
];
function OrderProductImg({ p, size = 48, h = 140 }) {
  if (p.img) return <div style={{ height: h, borderRadius: T.radiusM, background: '#f7f7f8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><img src={p.img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'darken' }} /></div>;
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
            <Row style={{ marginBottom: 12 }}><span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>Amsterdam flagship store</span><Button variant="secondary" condensed onClick={() => notify && notify('Edit shipping address')}>Edit</Button></Row>
            <StructuredList items={[{ label: 'Contact', value: 'Yi-ning' }, { label: 'Email', value: 'yining.chuang@adyen.com' }, { label: 'Phone', value: '+31615333740' }, { label: 'Street address', value: 'Simon Carmiggeltstraat 6-50, 1011DK' }, { label: 'City', value: 'Amsterdam' }, { label: 'Country/Region', value: region || 'Netherlands' }]} />
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
  const terminals = useMemo(() => makeTerminals(60, { seed: 2, stores: SM_STORES }), []);
  const mobiles = useMemo(() => makeMobiles(25, { seed: 9, stores: SM_STORES }), []);
  const st = SM_STORES.find(x => x.id === addStore);
  const qty = Math.max(0, parseInt(addQty, 10) || 0);
  const rt = SM_STORES.find(x => x.id === reassignTarget);
  // Open the Locations modal, optionally deep-linked to a single location's detail (where Edit store lives).
  const openLocation = (id) => setLocations({ store: SM_STORES.find(x => x.id === id) ? id : undefined });
  const openDeviceStudio = (r) => onOpenStudio && onOpenStudio({ type: 'device', deviceIds: [r.id], model: r.model, name: r.model, deviceType: r._type === 'Mobile' ? 'SoftPOS' : 'Terminal', storeId: r.storeId });
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
        locationView={<LocationDeviceTable stores={SM_STORES} onOpenLocation={openLocation} onOpenDevice={openDeviceStudio} onConfigureStore={configureStore} onCloseLocation={(s) => notify && notify(`Closing ${s.code}…`)} notify={notify} />}
        onOpenDevice={openDeviceStudio}
        title="Devices & locations" subtitle={`${SM_STORES.length} locations · ${terminals.length + mobiles.length} devices across your fleet`}
        info={<span>“<b>Location</b>” replaces the old “Store” concept so it can represent any level of your Adyen account structure — a <b>business line</b>, a <b>merchant account</b> acting as a single shop, or a physical store. One umbrella term for wherever a device operates.</span>}
        actions={<>
          <Button variant="secondary" iconLeft="download" onClick={() => notify && notify('Exporting devices to CSV…')}>Export</Button>
          {view === 'byLocation'
            ? <Button variant="primary" iconLeft="plus" onClick={() => setSelectorOpen(true)}>Add devices</Button>
            : <Button variant="primary" iconLeft="checkmark-circle" onClick={() => setAddOpen(true)}>Activate devices</Button>}
        </>} />
      {reassign && (
        <Modal open onClose={() => setReassign(null)} title="Reassign devices" width={460}
          description={`Move ${reassign.rows.length} device${reassign.rows.length === 1 ? '' : 's'} to a different location. Each device always belongs to exactly one location.`}
          footer={<Row gap={8} style={{ justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setReassign(null)}>Cancel</Button>
            <Button variant="primary" disabled={!rt} onClick={() => { const n = reassign.rows.length; setReassign(null); notify && notify(`Reassigned ${n} device${n === 1 ? '' : 's'} to ${rt ? rt.code : 'location'}`); }}>Reassign</Button>
          </Row>}>
          <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Move to location</span>
            <Dropdown value={reassignTarget} onChange={setReassignTarget} options={SM_STORES.map(x => ({ value: x.id, label: `${x.code} · ${x.city}, ${x.country}` }))} />
          </Col>
        </Modal>
      )}
      {locations && <AllStoresModal key={locations.store || 'list'} initialStore={locations.store} notify={notify} onBack={() => setLocations(null)} onOpenStore={onOpenStore} onOpenStudio={onOpenStudio} />}
      {selectorOpen && <TerminalSelector onBack={() => setSelectorOpen(false)} notify={notify} onOrder={() => { setSelectorOpen(false); setOrderOpen(true); }} />}
      {orderOpen && <OrderFlow onBack={() => setOrderOpen(false)} notify={notify} />}
      {addOpen && (
        <FullPage title="Activate devices" subtitle="Assign devices to a location and finish your setup"
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
  const terminals = makeTerminals(store.terminals, { seed: parseInt(store.id.slice(2), 10) || 1, store: store.code, country: store.country, address: store.street });
  const mobiles = makeMobiles(Math.max(0, Math.round(store.terminals / 3)), { seed: (parseInt(store.id.slice(2), 10) || 1) + 5, store: store.code, country: store.country });
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
                      <div style={{ width: 150, fontFamily: 'var(--b-font-family-secondary)', fontSize: 13 }}>{st.code}</div>
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
                    {skipped.map(st => <span key={st.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 8px', borderRadius: T.radiusM, background: T.card, border: `1px solid ${T.sep}`, fontSize: 12 }}><span style={{ fontFamily: 'var(--b-font-family-secondary)' }}>{st.code}</span>· already closed</span>)}
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
    <Modal open onClose={closeEdit} title="Edit store" description={`${editStore.code} · ${editStore.city}, ${editStore.country}`} width={560}
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
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>Address</div>
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
    { label: 'Description', key: 'name', span: 'span 2', ph: 'Flagship Amsterdam' },
    { label: 'Store reference', key: 'ref', span: 'auto', ph: 'ST_10421' },
    { label: 'Phone number', key: 'phone', span: 'auto', ph: '+31 20 555 1234', hint: 'Any international format — we validate against the country dial code.' },
    { label: 'Street and number', key: 'street', span: 'span 2', ph: 'Prinsengracht 12' },
    { label: 'Postal code', key: 'zip', span: 'auto', ph: '1011 AB' },
    { label: 'City', key: 'city', span: 'auto', ph: 'Amsterdam' },
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
                        {SM_STORES.slice(0, 6).map(st => { const label = st.code + ' \u2014 ' + st.name; return <SMCheckOption key={st.id} label={label} checked={sourceStore === label} onClick={() => setState({ sourceStore: label, dd: null })} />; })}
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
  const terminals = useMemo(() => makeTerminals(60, { seed: 2, stores: SM_STORES }), []);
  const mobiles = useMemo(() => makeMobiles(25, { seed: 9, stores: SM_STORES }), []);
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
            <Button variant="primary" disabled={qty < 1 || !st} onClick={() => { if (st) { st.terminals += qty; st.termOnline += qty; } setAddOpen(false); notify && notify(`Added ${qty} ${addModel} to ${st ? st.code : 'location'}`); }}>Add {qty > 0 ? qty + ' ' : ''}device{qty === 1 ? '' : 's'}</Button>
          </Row>}>
          <Col gap={16}>
            <Col gap={6}><span style={{ fontSize: 13, color: T.sub }}>Assign to location</span>
              <Dropdown value={addStore} onChange={setAddStore} options={SM_STORES.map(x => ({ value: x.id, label: `${x.code} · ${x.city}, ${x.country}` }))} />
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
        <MenuButton variant="secondary" icon="options-vertical" label="Actions" items={[
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

function MultiDropdown({ values = [], options, onChange, placeholder = 'Select', emptyLabel }) {
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
      position: 'fixed', left: rect.left, width: rect.width, maxHeight: maxH, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: 'var(--b-shadow-high)', overflow: 'hidden',
      ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    };
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* trigger — shows selected items as removable chips (Bento) */}
      <div ref={triggerRef} role="button" tabIndex={0} onClick={() => setOpen(o => !o)}
        style={{ ...selBtn, height: 'auto', minHeight: 36, padding: values.length ? '4px 8px 4px 6px' : '0 10px 0 12px' }}>
        {values.length === 0
          ? <span style={{ flex: 1, textAlign: 'left', color: T.faint }}>{emptyLabel || placeholder}</span>
          : <span style={{ flex: 1, display: 'flex', flexWrap: 'nowrap', gap: 4, minWidth: 0, overflow: 'hidden' }}>
              {values.slice(0, 3).map(v => (
                <span key={v} onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <Chip label={labelOf(v)} condensed onRemove={() => remove(v)} />
                </span>
              ))}
              {values.length > 3 && <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13, color: T.sub, fontWeight: 500, whiteSpace: 'nowrap', paddingLeft: 2 }}>+{values.length - 3} more</span>}
            </span>}
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
function TxHeader({ r, p, code }) {
  return (
    <div style={{ height: r.headerH, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${p.border}`, background: p.bg }}>
      <Row style={{ flex: 1, minWidth: 0 }}>
        <div style={{ width: r.headerH, height: r.headerH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TxGlyph src="assets/tx/accessibility.svg" w={r.iconBtn} h={r.iconBtn} color={p.on} /></div>
        <div style={{ fontFamily: TX_FONT, width: r.headerH, height: r.headerH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: r.btnText, fontWeight: 600, color: p.on }}>{code}</div>
      </Row>
      <div style={{ padding: '0 24px', flexShrink: 0 }}><img src="assets/tx/adyen.svg" alt="Adyen" style={{ width: r.logoW, height: r.logoW * 24 / 74, display: 'block' }} /></div>
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
      <TxHeader r={r} p={p} code={code} />
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
      <TxHeader r={r} p={p} code={code} />
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
      <TxHeader r={r} p={p} code={code} />
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
        <TxHeader r={r} p={p} code={code} />
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
      <TxHeader r={r} p={p} code={code} />
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
      <TxHeader r={r} p={p} code={code} />
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
      <TxHeader r={r} p={p} code={code} />
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
      <TxHeader r={r} p={p} code={code} />
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
      <TxHeader r={r} p={p} code={code} />
      <Col gap={16} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: r.padX, textAlign: 'center' }}>
        <span className="ns-pop" style={{ lineHeight: 0 }}>
          <svg width={sz} height={sz} viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="21" stroke={p.accent} strokeWidth="3" />
            <path d="M14.5 24.5 L21 31 L34 17.5" stroke={p.accent} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
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
  if (screen === 'home') return (
    <Col style={{ height: '100%', background: bg, color: fg, padding: 20, alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: TX_FONT }}>
      {home.showLogo && (home.logoSrc
        ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}><img src={home.logoSrc} alt="" style={{ height: 72, display: 'block' }} /></div>
        : <div style={{ width: 60, height: 60, borderRadius: 16, background: theme === 'Light' ? '#eceef0' : 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}><img src="assets/tx/adyen.svg" alt="" style={{ width: 40 }} /></div>)}
      <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, marginBottom: 6 }}>{home.greeting || lang.welcome}</div>
      <div style={{ fontSize: 13, color: subFg }}>{lang.present}</div>
      <div style={{ marginTop: 'auto', fontSize: 11, color: subFg }}>{loc.language}{loc.secondary && loc.secondary !== 'None' ? ' · ' + loc.secondary : ''}</div>
    </Col>
  );
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
          {rec.printLogo && <div style={{ textAlign: 'center', marginBottom: 8 }}><img src="assets/tx/adyen.svg" alt="" style={{ height: 16 }} /></div>}
          <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: 8 }}>{rec.header}</div>
          <div style={{ borderTop: '1px dashed #bbb', borderBottom: '1px dashed #bbb', padding: '6px 0', margin: '6px 0' }}>
            <Row style={{ justifyContent: 'space-between' }}><span>Dinner · Table 12</span><span>€100.00</span></Row>
            <Row style={{ justifyContent: 'space-between', marginTop: 4 }}><span>{lang.total}</span><span style={{ fontWeight: 700 }}>€100.00</span></Row>
          </div>
          <div style={{ textAlign: 'center', color: '#6f6f6f', marginTop: 8 }}>{rec.footer}</div>
        </div>
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
    <div style={{ borderBottom: `1px solid ${T.sep}`, opacity: disabled ? 0.5 : 1 }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', background: 'transparent', border: 0, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
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

/* AI assistant. Manual mode = docked composer under the settings (typing updates them live).
   Agent mode (expanded) = the whole panel becomes a chat: message thread + composer. */
function DockedAsk({ messages, draft, setDraft, onSend, expanded }) {
  // Studio JTBD: customisation + payment integration. First = scripted market-setup scenario.
  const suggestions = ['Enable devices for international clients in Japan', 'Install an Android app on these devices', 'Upload a media asset to the home screen', 'Enable DCC and set the margin'];
  const suggIcons = ['sparkles', 'settings', 'image', 'percent'];
  const last = messages[messages.length - 1];
  const showReply = messages.length > 1 && last && last.role === 'assistant';
  const firstTurn = messages.length <= 1;
  const threadRef = useRef(null);
  useEffect(() => { if (expanded && threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [messages, expanded]);

  const composer = (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, border: `1px solid ${T.borderStrong}`, borderRadius: 12, padding: '4px 4px 4px 10px', background: T.card }}>
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
        <div ref={threadRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: T.s4 }}>
          {firstTurn ? (
            <Col gap={T.s3}>
              <span style={{ fontSize: 13, color: T.sub, lineHeight: '19px' }}>Ask in plain language — I'll change the settings and update the preview.</span>
              <Col gap={1} style={{ marginTop: 4 }}>
                {suggestions.map((sq, i) => (
                  <button key={sq} className="ns-suggest" onClick={() => onSend(sq)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', border: 0, background: 'transparent', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: T.ink, fontSize: 14 }}>
                    <Ico name={suggIcons[i % suggIcons.length]} size={16} color={T.sub} />
                    <span style={{ flex: 1 }}>{sq}</span>
                    <Ico name="arrow-right" size={16} color={T.faint} />
                  </button>
                ))}
              </Col>
            </Col>
          ) : (
            <Col gap={12}>
              {messages.map((m, i) => (
                <Row key={i} align="flex-start" gap={8} style={{ flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                  {m.role === 'assistant' && <span style={{ lineHeight: 0, flexShrink: 0, paddingTop: 6 }}><Ico name="sparkles" size={16} color="var(--b-color-label-primary)" /></span>}
                  <div style={{ maxWidth: '84%', background: m.role === 'user' ? 'var(--b-color-background-inverse-primary)' : 'var(--b-color-background-secondary)', color: m.role === 'user' ? 'var(--b-color-label-inverse-primary)' : T.ink, borderRadius: 12, padding: '8px 12px', fontSize: 13, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{m.text}</div>
                </Row>
              ))}
              {last && last.role === 'assistant' && last.quick && last.quick.length > 0 && (
                <Row gap={6} style={{ flexWrap: 'wrap', paddingLeft: 24 }}>
                  {last.quick.map(qr => (
                    <button key={qr} onClick={() => onSend(qr)} className="ns-chip-btn"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${T.borderStrong}`, background: T.card, borderRadius: 999, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: 'var(--b-color-link-primary)' }}>
                      {qr}
                    </button>
                  ))}
                </Row>
              )}
            </Col>
          )}
        </div>
        <div style={{ flexShrink: 0, padding: T.s4, borderTop: `1px solid ${T.sep}` }}>
          <PromptBox q={draft} setQ={setDraft} onSend={() => onSend()} thinking={false} models={ASK_CONTEXTS.studio.models} placeholder="Ask AI to change settings…" />
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
function ModeSwitch({ mode, setMode }) {
  const opts = [
    { v: 'manual', label: 'Edit', icon: 'edit-1' },
    { v: 'agent', label: 'Ask', icon: 'sparkles' },
  ];
  return (
    <div style={{ display: 'inline-flex', gap: 2, padding: 2, background: 'var(--b-color-background-secondary)', borderRadius: T.radiusM }}>
      {opts.map(o => {
        const on = mode === o.v;
        const ai = o.v === 'agent';
        const fg = on ? T.ink : T.sub;
        return (
          <button key={o.v} onClick={() => setMode(o.v)} title={ai ? 'Ask AI (Agent)' : 'Edit settings manually'}
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
  const [chatMode, setChatMode] = useState('manual'); // manual settings vs agent chat
  const [scopeName, setScopeName] = useState(initialScope.name || 'Lightspeed F&B');
  const [scopeDesc, setScopeDesc] = useState('');
  // Snapshot of the scope at open, so a scope change also counts as a reviewable change.
  const [scope0] = useState(() => ({
    deviceTypes: [initialScope.deviceType || 'Terminal'],
    markets: initialScope.market ? [initialScope.market] : [],
    storeIds: initialScope.storeId ? [initialScope.storeId] : [D.stores[0].id],
    deviceIds: initialScope.deviceIds || null,
    name: initialScope.name || 'Lightspeed F&B',
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
  const startJapanScenario = () => {
    setScope(s => ({ ...s, markets: Array.from(new Set([...(s.markets || []), 'Japan'])) }));
    setOpenGroups(prev => new Set([...prev, 'dcc', 'gratuities', 'localization', 'homeScreen', 'japan']));
    setField('dcc', 'enabled', true);
    setField('dcc', 'markup', 3);
    setField('gratuities', 'enabled', true);
    setField('localization', 'language', 'Japanese');
    setField('japan', 'jcb', true);
    setField('japan', 'emoney', true);
    setField('japan', 'qrWallets', true);
    setScreen('transaction');
  };
  const sendChat = (text) => {
    const q = (text != null ? text : draft).trim(); if (!q) return;
    setDraft('');
    setMessages(m => [...m, { role: 'user', text: q }]);
    const reply = (t, quick) => setMessages(m => [...m, { role: 'assistant', text: t, quick }]);
    const t = q.toLowerCase();
    const step = flow && flow.step;

    // kick off the scripted scenario
    if (!step && /international|japan|日本|market[- ]?specific/.test(t)) {
      startJapanScenario();
      setFlow({ step: 'name' });
      reply("Setting this up for international shoppers in Japan. I've enabled DCC (3% margin) and tipping, turned on JCB, e-money (iD/QUICPay) and QR wallets, and set the language to Japanese — the preview is updated.\n\nWhat should I name this configuration profile?", ['Japan retail profile']);
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
      reply(`Scoped to ${q}. Want me to upload the United Arrows logo to the home screen and switch to a branded theme?`, ['Yes, upload the logo', 'Skip']);
      return;
    }
    if (step === 'logo') {
      if (/yes|logo|upload|brand/.test(t)) {
        setField('homeScreen', 'showLogo', true);
        setField('homeScreen', 'logoSrc', 'assets/tx/united-arrows.svg');
        setField('homeScreen', 'theme', 'Brand');
        setField('homeScreen', 'brandColor', '#C8860F');
        setField('homeScreen', 'greeting', 'いらっしゃいませ');
        setScreen('home');
        reply('Uploaded the United Arrows logo, applied their brand colour and set a Japanese welcome greeting on the home screen. Shall I install the United Arrows retail Android app on these devices?', ['Install the app', 'Not now']);
      } else {
        reply('Skipped the logo. Shall I install the United Arrows retail Android app on these devices?', ['Install the app', 'Not now']);
      }
      setFlow({ ...flow, step: 'app' });
      return;
    }
    if (step === 'app') {
      reply(/install|yes|app/.test(t)
        ? 'Queued the United Arrows retail app (v3.4) to install on next sync. Apply the latest media & configuration updates too?'
        : 'No app install. Apply the latest media & configuration updates?', ['Apply updates', 'Skip']);
      setFlow({ ...flow, step: 'updates' });
      return;
    }
    if (step === 'updates') {
      const name = (flow && flow.name) || scopeName;
      setFlow(null);
      reply(`All set — I've prepared “${name}”: DCC + tipping, Japanese localization, JCB / e-money / QR wallets${/apply|updates|yes/.test(t) ? ', the branded home screen, the retail app and the latest media & config updates' : ' and the branded home screen'}. Review the change list on the left and save to roll it out.`);
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
  const scopeConfig = scope.configuration || (scope.type === 'device' && scope.storeId ? 'Lightspeed F&B' : null);
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
    <FullPage title={initialScope.type === 'device' ? (initialScope.model || initialScope.name || 'Device') : 'Device Studio'} onBack={onBack} backLabel="" backIcon={<ArrowLeftGlyph />}
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
        {/* control panel (docked left) — settings always visible, AI composer docked at the bottom */}
        {panelOpen && (
        <div style={{ width: 440, flexShrink: 0, borderRight: `1px solid ${T.sep}`, background: T.card, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Row style={{ padding: '8px 12px 8px 20px', borderBottom: `1px solid ${T.sepFaint}`, gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Settings</span>
            <ModeSwitch mode={chatMode} setMode={setChatMode} />
            <GlyphButton title="Hide control panel" onClick={() => setPanelOpen(false)}><PanelToggleIcon flip /></GlyphButton>
          </Row>

          {chatMode === 'agent' ? (
            <DockedAsk expanded messages={messages} draft={draft} setDraft={setDraft} onSend={sendChat} />
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

        {/* simulator — right controls pinned to the top · device centered both axes */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'stretch', gap: 32, padding: '32px 32px 40px', background: T.page }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Simulator vals={vals} screen={screen} deviceId={previewDevice} txAmount={txAmountVar} deviceType={(scope.deviceTypes[0] || 'Terminal').indexOf('SoftPOS') === 0 ? 'SoftPOS' : 'Terminal'}
              tx={{ base: 100, tip, tipValue: tip == null ? 0 : tip === 'custom' ? 5 : 100 * tip / 100, total: 100 + (tip == null ? 0 : tip === 'custom' ? 5 : 100 * tip / 100), setTip }} />
          </div>
          <div style={{ width: 300, flexShrink: 0, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Col gap={8}><span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>Screen</span>
              <ChipPicker value={screen} onChange={setScreen} options={previewScreens} />
            </Col>
            <Col gap={8}><span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>Device</span>
              <ChipPicker value={previewDevice} onChange={setPreviewDevice} options={TX_DEVICES.map(d => ({ value: d.id, label: d.name, icon: d.note && d.note.indexOf('SoftPOS') === 0 ? 'mobile' : d.layout === 'landscape' ? 'terminal-1' : 'terminal-2' }))} />
            </Col>
            {screen === 'transaction' && (
              <Col gap={8}><span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>Transaction state</span>
                <ChipPicker value={txAmountVar ? 'amt' : 'noamt'} onChange={(v) => setTxAmountVar(v === 'amt')} options={[{ value: 'amt', label: 'Amount entered' }, { value: 'noamt', label: 'Awaiting card' }]} />
              </Col>
            )}
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
              <Row key={i} style={{ padding: '12px 14px', borderBottom: i < diff.length - 1 ? `1px solid ${T.sepFaint}` : 'none' }} gap={8}>
                <Col gap={2} style={{ flex: 1 }}><span style={{ fontSize: 13, fontWeight: 500 }}>{d.label}</span><span style={{ fontSize: 11, color: T.faint }}>{d.group}</span></Col>
                <span style={{ fontSize: 13, color: T.sub, textDecoration: 'line-through' }}>{d.from}</span>
                <Ico name="arrow-right" size={16} color={T.faint} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--b-color-link-primary)' }}>{d.to}</span>
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

/* ============================================================= TOAST */
function ToastHost({ toast, onClose }) {
  useEffect(() => { if (toast) { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); } }, [toast]);
  if (!toast) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 600 }} className="ns-fade">
      <Toast message={toast} icon="checkmark-circle-fill" onClose={onClose} />
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
  { id: 'cfg-fnb', name: 'Lightspeed F&B', appliesTo: 'Terminals · S1F2, AMS1', deviceType: 'Terminal', stores: 6, devices: 84, status: 'Published', statusV: 'green', updated: '2 days ago' },
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
            <InfoTip width={320} content={<span>Reusable <b>device configurations</b> — receipts, payments, branding and more — that you apply across your fleet. Each device follows exactly one configuration.</span>} placement="right"><Ico name="info" size={16} color={T.ink} /></InfoTip>
          </Row>
          <span style={{ fontSize: 13, color: T.sub }}>Reusable device configurations applied across your fleet · each device follows exactly one</span>
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
                <tr key={cfg.id} className="ns-row ns-clickable" onClick={() => onOpen(cfg)} style={cfg.isNew ? { background: 'var(--b-color-background-success-weak)' } : undefined}>
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
  const cfg = config || { name: 'Lightspeed F&B', deviceType: 'Terminal' };
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
          <Row style={{ padding: `${T.s3}px ${T.s4}px`, borderBottom: `1px solid ${T.sepFaint}`, gap: T.s3, flexShrink: 0 }}>
            <Row gap={6} style={{ flexShrink: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Live preview</span>
              <InfoTip content="Preview reflects this configuration applied across every device it targets.">
                <Ico name="info" size={16} color={T.ink} />
              </InfoTip>
            </Row>
            <div style={{ flex: 1, minWidth: 0, maxWidth: 320, marginLeft: 'auto' }}>
              <SegmentedControl condensed className="ns-seg-full" style={{ display: 'flex', width: '100%' }} value={screen} onChange={setScreen} options={PREVIEW_SCREENS} />
            </div>
          </Row>
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

  const crumb = nav === 'device-studio' ? ['Devices', 'Device studio'] : nav === 'stores' ? ['Devices', 'Devices & locations'] : ['Devices', 'Fleet Intelligence'];

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
        {navOpen && <Sidebar active={nav} onNav={(n) => { reset(); setStudioCfg(null); setNav(n); }} />}
        <div style={{ flex: 1, overflow: 'auto', minWidth: 0, background: T.card }}>
          {nav === 'device-studio' ? (
            studioCfg
              ? <StudioPreview config={studioCfg} onBack={() => setStudioCfg(null)}
                  onEdit={() => openStudio({ type: 'fleet', name: studioCfg.name, deviceType: studioCfg.deviceType, market: studioCfg.market })} />
              : <ConfigLibrary configs={configs} onOpen={setStudioCfg} onNew={() => openStudio({ type: 'fleet', name: 'New configuration', deviceType: 'Terminal' })} />
          ) : nav === 'stores' ? (
            <DeviceLocationsPage notify={notify} onOpenStore={openStore} onOpenStudio={openStudio} />
          ) : nav === 'device-intelligence' ? (
            <DeviceIntelligence notify={notify} onOpenAllStores={openAllStores} onOpenAllDevices={openAllDevices} onOpenExplore={openExplore} onOpenStudio={openStudio} />
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
      {!top && nav !== 'device-intelligence' && (
        <FloatingAsk notify={notify} context={nav === 'stores' ? 'devices' : nav === 'device-studio' ? 'studio' : 'fleet'} />
      )}

      <ToastHost toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
