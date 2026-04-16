import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Bell,
  History,
  Settings,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pen,
  Check,
  User,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const THERESMAC_API = import.meta.env.VITE_THERESMAC_API || 'https://theresmac-backend.fly.dev';
const GPUDRIP_API = import.meta.env.VITE_GPUDRIP_API || 'https://gpudrip-backend-icy-night-2201.fly.dev';
const HEALTHINDEX_API = import.meta.env.VITE_HEALTHINDEX_API || 'https://healthindex-backend.fly.dev';
const BABYGEAR_API = import.meta.env.VITE_BABYGEAR_API || 'https://babygear-backend.fly.dev';

const THERESMAC_KEY = import.meta.env.VITE_THERESMAC_KEY || '';
const GPUDRIP_KEY = import.meta.env.VITE_GPUDRIP_KEY || '';
const HEALTHINDEX_KEY = import.meta.env.VITE_HEALTHINDEX_KEY || '';
const BABYGEAR_KEY = import.meta.env.VITE_BABYGEAR_KEY || '';

const THERESMAC_RETAILERS = [
  'apple', 'amazon', 'walmart', 'target', 'bestbuy', 'bh', 'adorama',
  'ebay', 'cdw', 'backmarket', 'newegg', 'microcenter',
];
const GPUDRIP_RETAILERS = [
  'amazon', 'bestbuy', 'newegg', 'bh_photo', 'micro_center',
  'adorama', 'antonline', 'cdw',
];
const HEALTHINDEX_RETAILERS = [
  'amazon', 'ebay', 'sunlighten', 'iqair', 'molekule', 'austinair',
  'oura', 'chilisleep', 'mitoredlight', 'platinumled', 'therabody',
  'hyperice', 'athleticgreens', 'thorne',
];
const BABYGEAR_RETAILERS = [
  'amazon', 'ebay', 'bestbuy', 'walmart', 'target', 'buybuyBaby', 'amazonBaby',
];

const THERESMAC_CATEGORIES = ['mac', 'iphone', 'ipad', 'watch', 'airpods'];
const GPUDRIP_CATEGORIES = ['nvidia', 'amd', 'intel'];
const HEALTHINDEX_CATEGORIES = ['air-filtration', 'recovery', 'red-light-panels', 'sauna', 'sleep', 'supplements'];
const BABYGEAR_CATEGORIES = ['car-seats', 'carriers', 'cribs', 'monitors', 'strollers'];

const RETAILER_LABELS = {
  apple: 'Apple',
  amazon: 'Amazon',
  walmart: 'Walmart',
  target: 'Target',
  bestbuy: 'Best Buy',
  bh: 'B&H',
  adorama: 'Adorama',
  ebay: 'eBay',
  cdw: 'CDW',
  backmarket: 'Back Market',
  newegg: 'Newegg',
  microcenter: 'Micro Center',
  bh_photo: 'B&H Photo',
  micro_center: 'Micro Center',
  antonline: 'AntOnline',
  sunlighten: 'Sunlighten',
  iqair: 'IQAir',
  molekule: 'Molekule',
  austinair: 'Austin Air',
  oura: 'Oura',
  chilisleep: 'ChiliSleep',
  mitoredlight: 'Mito Red Light',
  platinumled: 'PlatinumLED',
  therabody: 'Therabody',
  hyperice: 'Hyperice',
  athleticgreens: 'Athletic Greens',
  thorne: 'Thorne',
  buybuyBaby: 'buybuy BABY',
  amazonBaby: 'Amazon Baby',
};

// ─── Retailer URL Builder ────────────────────────────────────────────────────

const AFFILIATE_IDS = {
  amazon: 'theresmac-20',
  ebay: '5339142921',
};

function buildRetailerUrl(retailer, productId, productName) {
  const query = encodeURIComponent(productName || productId);
  switch (retailer) {
    case 'amazon':
    case 'amazonBaby':
      return `https://www.amazon.com/s?k=${query}&tag=${AFFILIATE_IDS.amazon}`;
    case 'ebay':
      return `https://www.ebay.com/sch/i.html?_nkw=${query}&mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${AFFILIATE_IDS.ebay}`;
    case 'bestbuy':
      return `https://www.bestbuy.com/site/searchpage.jsp?st=${query}`;
    case 'walmart':
      return `https://www.walmart.com/search?q=${query}`;
    case 'target':
      return `https://www.target.com/s?searchTerm=${query}`;
    case 'bh':
    case 'bh_photo':
      return `https://www.bhphotovideo.com/c/search?q=${query}`;
    case 'adorama':
      return `https://www.adorama.com/l/?searchinfo=${query}`;
    case 'newegg':
      return `https://www.newegg.com/p/pl?d=${query}`;
    case 'microcenter':
    case 'micro_center':
      return `https://www.microcenter.com/search/search_results.aspx?N=&cat=&Ntt=${query}`;
    case 'cdw':
      return `https://www.cdw.com/search/?q=${query}`;
    case 'backmarket':
      return `https://www.backmarket.com/search?q=${query}`;
    case 'apple':
      return `https://www.apple.com/shop/search/${query}`;
    default:
      return null;
  }
}

function ensureUrls(product, site) {
  const prices = product.prices || {};
  const name = product.name || product.model || product.id;
  const retailers = retailersForSite(site);
  const updated = { ...prices };
  for (const r of retailers) {
    const d = updated[r];
    if (d && d.price && !d.notCarried && !d.url) {
      updated[r] = { ...d, url: buildRetailerUrl(r, product.id, name) };
    }
  }
  return { ...product, prices: updated };
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  bg: { backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  card: { backgroundColor: '#141414', border: '1px solid #262626', borderRadius: 8, padding: 20 },
  border: { border: '1px solid #262626' },
  input: { backgroundColor: '#1a1a1a', border: '1px solid #262626', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none' },
  btn: { backgroundColor: '#262626', border: '1px solid #333', borderRadius: 6, padding: '8px 16px', color: '#fff', cursor: 'pointer', fontSize: 14 },
  btnActive: { backgroundColor: '#2563eb', border: '1px solid #3b82f6', borderRadius: 6, padding: '8px 16px', color: '#fff', cursor: 'pointer', fontSize: 14 },
  btnDanger: { backgroundColor: '#991b1b', border: '1px solid #dc2626', borderRadius: 6, padding: '8px 16px', color: '#fff', cursor: 'pointer', fontSize: 14 },
  badge: { padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' },
  badgeTM: { backgroundColor: '#1e3a5f', color: '#60a5fa' },
  badgeGD: { backgroundColor: '#3b1f2b', color: '#f472b6' },
  badgeHI: { backgroundColor: '#064e3b', color: '#34d399' },
  badgeBG: { backgroundColor: '#4c1d2b', color: '#f472b6' },
  tableTh: { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #262626' },
  tableTd: { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #1a1a1a' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => {
  if (n == null || isNaN(n)) return '—';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
};

const siteOf = (site) => {
  const map = {
    theresmac: 'TM',
    gpudrip: 'GD',
    healthindex: 'HI',
    babygear: 'BG',
  };
  return map[site] || site;
};

const siteLabel = (site) => {
  const map = {
    theresmac: 'TheresMac',
    gpudrip: 'GPU Drip',
    healthindex: 'Health Index',
    babygear: 'Baby Gear',
  };
  return map[site] || site;
};

const apiForSite = (site) => {
  const map = {
    theresmac: THERESMAC_API,
    gpudrip: GPUDRIP_API,
    healthindex: HEALTHINDEX_API,
    babygear: BABYGEAR_API,
  };
  return map[site] || THERESMAC_API;
};

const keyForSite = (site) => {
  const map = {
    theresmac: THERESMAC_KEY,
    gpudrip: GPUDRIP_KEY,
    healthindex: HEALTHINDEX_KEY,
    babygear: BABYGEAR_KEY,
  };
  return map[site] || '';
};

const retailersForSite = (site) => {
  const map = {
    theresmac: THERESMAC_RETAILERS,
    gpudrip: GPUDRIP_RETAILERS,
    healthindex: HEALTHINDEX_RETAILERS,
    babygear: BABYGEAR_RETAILERS,
  };
  return map[site] || [];
};

const categoriesForSite = (site) => {
  const map = {
    theresmac: THERESMAC_CATEGORIES,
    gpudrip: GPUDRIP_CATEGORIES,
    healthindex: HEALTHINDEX_CATEGORIES,
    babygear: BABYGEAR_CATEGORIES,
  };
  return map[site] || [];
};

const badgeStyleForSite = (site) => {
  const map = {
    theresmac: s.badgeTM,
    gpudrip: s.badgeGD,
    healthindex: s.badgeHI,
    babygear: s.badgeBG,
  };
  return map[site] || s.badge;
};

const headers = (site) => ({
  'Content-Type': 'application/json',
  'x-api-key': keyForSite(site),
});

// ─── CSV Export Helpers ──────────────────────────────────────────────────────

function downloadCSV(filename, csvString) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCSV(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function exportProductsCSV(products) {
  const rows = [['Site', 'Product', 'Category', 'MSRP', 'Best Price', 'Discount %', 'Retailer', 'Price', 'In Stock', 'URL']];
  for (const p of products) {
    const prices = p.prices || {};
    const site = p._site || 'unknown';
    const retailers = retailersForSite(site);
    const bestEntry = retailers
      .map((r) => [r, prices[r]])
      .filter(([, d]) => d && d.price && !d.notCarried)
      .sort((a, b) => a[1].price - b[1].price);
    const bestPrice = bestEntry[0]?.[1]?.price;
    const discount = p.msrp && bestPrice ? Math.round(((p.msrp - bestPrice) / p.msrp) * 100) : 0;

    for (const r of retailers) {
      const d = prices[r];
      if (!d || d.notCarried) continue;
      rows.push([
        siteOf(site), p.name, p.category || '', p.msrp || '', bestPrice || '',
        discount, RETAILER_LABELS[r] || r, d.price || '', d.inStock ? 'Yes' : 'No', d.url || '',
      ]);
    }
    if (bestEntry.length === 0) {
      rows.push([siteOf(site), p.name, p.category || '', p.msrp || '', '', '', '', '', '', '']);
    }
  }
  downloadCSV(`products-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((r) => r.map(escapeCSV).join(',')).join('\n'));
}

function exportAlertsCSV(alerts) {
  const rows = [['Site', 'Product', 'User Email', 'Target Price', 'Current Best', 'Status', 'Created']];
  for (const a of alerts) {
    rows.push([
      siteOf(a.site), a.productName || a.productId || '', a.email || '',
      a.targetPrice || '', '', a.active !== false ? 'Active' : 'Inactive',
      a.createdAt || a.created || '',
    ]);
  }
  downloadCSV(`alerts-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((r) => r.map(escapeCSV).join(',')).join('\n'));
}

function exportHistoryCSV(history) {
  const rows = [['Site', 'Product', 'Retailer', 'Old Price', 'New Price', 'Change %', 'In Stock', 'Date']];
  for (const h of history) {
    const pct = h.oldPrice ? Math.round(((h.oldPrice - h.newPrice) / h.oldPrice) * 100) : 0;
    rows.push([
      siteOf(h.site), h.productName || h.productId || '',
      RETAILER_LABELS[h.retailer] || h.retailer || '',
      h.oldPrice || '', h.newPrice || '', pct,
      h.in_stock ? 'Yes' : 'No', h.date || h.createdAt || '',
    ]);
  }
  downloadCSV(`price-history-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((r) => r.map(escapeCSV).join(',')).join('\n'));
}

// ─── StatsCards ───────────────────────────────────────────────────────────────

function StatsCards({ tmCount, gdCount, hiCount, bgCount, alertCount, verificationCount }) {
  const cards = [
    { label: 'TheresMac', value: tmCount, color: '#3b82f6' },
    { label: 'GPU Drip', value: gdCount, color: '#ec4899' },
    { label: 'Health Index', value: hiCount, color: '#22c55e' },
    { label: 'Baby Gear', value: bgCount, color: '#a855f7' },
    { label: 'Alerts', value: alertCount, color: '#f59e0b' },
    { label: 'Verify', value: verificationCount, color: '#ef4444' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      {cards.map((c) => (
        <div key={c.label} style={{ ...s.card, borderLeft: `3px solid ${c.color}` }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({ product, site, onPriceUpdate, onMsrpUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [editingRetailer, setEditingRetailer] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editStatus, setEditStatus] = useState('in_stock');
  const [editingMsrp, setEditingMsrp] = useState(false);
  const [editMsrpVal, setEditMsrpVal] = useState('');

  const editStatusMap = {
    in_stock: { icon: '✅', label: 'In Stock', color: '#10b981' },
    out_stock: { icon: '❌', label: 'OOS', color: '#ef4444' },
    backordered: { icon: '⏳', label: 'BO', color: '#f59e0b' },
    not_carried: { icon: '🚫', label: 'NC', color: '#6b7280' },
  };

  const prices = product.prices || {};
  const retailers = retailersForSite(site);
  const bestEntry = retailers
    .map((r) => [r, prices[r]])
    .filter(([, d]) => d && d.price && !d.notCarried)
    .sort((a, b) => a[1].price - b[1].price);
  const bestPrice = bestEntry[0]?.[1]?.price;
  const msrp = product.msrp;
  const discount = msrp && bestPrice ? Math.round(((msrp - bestPrice) / msrp) * 100) : null;

  const getStatus = (d) => {
    if (!d) return 'out_stock';
    if (d.notCarried) return 'not_carried';
    if (d.inStock === false) return 'out_stock';
    return 'in_stock';
  };

  const startEdit = (retailer, currentPrice) => {
    const entry = prices[retailer] || {};
    setEditingRetailer(retailer);
    setEditPrice(String(currentPrice));
    setEditUrl(entry.url || '');
    setEditStatus(getStatus(entry));
  };

  const saveEdit = async (retailer) => {
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice)) return;
    const statusMap = {
      in_stock: [true, false],
      out_stock: [false, false],
      backordered: [true, false],
      not_carried: [false, true],
    };
    const [newInStock, newNotCarried] = statusMap[editStatus] || [true, false];
    await onPriceUpdate(product.id, retailer, newPrice, newInStock, editUrl, newNotCarried);
    setEditingRetailer(null);
  };

  const startMsrpEdit = () => {
    setEditMsrpVal(String(msrp || ''));
    setEditingMsrp(true);
  };

  const saveMsrp = async () => {
    const val = parseFloat(editMsrpVal);
    if (isNaN(val)) return;
    await onMsrpUpdate(product.id, val);
    setEditingMsrp(false);
  };

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ ...s.badge, ...badgeStyleForSite(site) }}>{siteOf(site)}</span>
            {product.category && <span style={{ ...s.badge, backgroundColor: '#1a1a1a', color: '#888' }}>{product.category}</span>}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{product.name}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: bestPrice && msrp && bestPrice < msrp ? '#4ade80' : '#fff' }}>
            {fmt(bestPrice)}
          </div>
          {discount > 0 && (
            <div style={{ fontSize: 12, color: '#4ade80', marginTop: 2 }}>
              <ArrowDownRight size={12} style={{ verticalAlign: 'middle' }} /> {discount}% off
            </div>
          )}
        </div>
      </div>

      {/* MSRP row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#888', marginBottom: 8 }}>
        <span>MSRP: </span>
        {editingMsrp ? (
          <>
            <input
              type="number"
              value={editMsrpVal}
              onChange={(e) => setEditMsrpVal(e.target.value)}
              style={{ ...s.input, width: 90, padding: '4px 8px', fontSize: 13 }}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && saveMsrp()}
            />
            <button onClick={saveMsrp} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', padding: 0 }}><Check size={14} /></button>
            <button onClick={() => setEditingMsrp(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, fontSize: 14 }}>✕</button>
          </>
        ) : (
          <>
            <span>{fmt(msrp)}</span>
            <button onClick={startMsrpEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0 }}><Pen size={12} /></button>
          </>
        )}
      </div>

      {/* Specs */}
      {product.specs && Object.keys(product.specs).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {Object.entries(product.specs).map(([k, v]) => (
            v ? <span key={k} style={{ fontSize: 11, color: '#888', backgroundColor: '#1a1a1a', padding: '2px 6px', borderRadius: 4 }}>{k}: {String(v)}</span> : null
          ))}
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide retailers' : 'Show retailers'}
      </button>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          {retailers.map((r) => {
            const d = prices[r];
            const label = RETAILER_LABELS[r] || r;
            if (!d || d.notCarried) {
              return (
                <div key={r} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1a1a1a', opacity: 0.4 }}>
                  <span>{label}</span>
                  <span style={{ fontSize: 13 }}>Not carried</span>
                </div>
              );
            }
            const isEditing = editingRetailer === r;
            const status = getStatus(d);
            const statusInfo = editStatusMap[status];
            return (
              <div key={r} style={{ padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 500, color: '#60a5fa', textDecoration: 'none' }}>
                        {label} <ExternalLink size={10} style={{ verticalAlign: 'middle' }} />
                      </a>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                    )}
                    <span style={{ fontSize: 11, color: statusInfo?.color || '#888' }}>
                      {statusInfo?.icon} {statusInfo?.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isEditing ? (
                      <>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          style={{ ...s.input, width: 80, padding: '3px 6px', fontSize: 13 }}
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit(r)}
                        />
                        <button onClick={() => saveEdit(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', padding: 0 }}><Check size={14} /></button>
                        <button onClick={() => setEditingRetailer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, fontSize: 14 }}>✕</button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{fmt(d.price)}</span>
                        <button onClick={() => startEdit(r, d.price)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 0 }}><Pen size={12} /></button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <div style={{ marginTop: 4 }}>
                    <input
                      type="text"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="Product URL"
                      style={{ ...s.input, width: '100%', padding: '3px 6px', fontSize: 11, color: '#aaa' }}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(r)}
                    />
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      style={{ ...s.input, fontSize: 12, padding: '4px 8px', marginTop: 4 }}
                    >
                      <option value="in_stock">In Stock</option>
                      <option value="out_stock">Out of Stock</option>
                      <option value="backordered">Backordered</option>
                      <option value="not_carried">Not Carried</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ProductList ──────────────────────────────────────────────────────────────

function ProductList({ tmProducts, gdProducts, hiProducts, bgProducts, siteFilter, onPriceUpdate, onMsrpUpdate }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('price');
  const [sortDir, setSortDir] = useState('asc');

  const allProducts = [
    ...tmProducts.map((p) => ({ ...p, _site: 'theresmac' })),
    ...gdProducts.map((p) => ({ ...p, _site: 'gpudrip' })),
    ...hiProducts.map((p) => ({ ...p, _site: 'healthindex' })),
    ...bgProducts.map((p) => ({ ...p, _site: 'babygear' })),
  ];

  const filtered = allProducts.filter((p) => {
    if (siteFilter === 'theresmac' && p._site !== 'theresmac') return false;
    if (siteFilter === 'gpudrip' && p._site !== 'gpudrip') return false;
    if (siteFilter === 'healthindex' && p._site !== 'healthindex') return false;
    if (siteFilter === 'babygear' && p._site !== 'babygear') return false;
    if (category !== 'all' && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const getPrice = (p) => {
      const prices = p.prices || {};
      const vals = Object.values(prices).filter((d) => d && d.price && !d.notCarried).map((d) => d.price);
      return vals.length ? Math.min(...vals) : Infinity;
    };
    let cmp = 0;
    if (sortBy === 'price') cmp = getPrice(a) - getPrice(b);
    else if (sortBy === 'msrp') cmp = (a.msrp || 0) - (b.msrp || 0);
    else if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortBy === 'discount') {
      const dA = a.msrp ? ((a.msrp - getPrice(a)) / a.msrp) : 0;
      const dB = b.msrp ? ((b.msrp - getPrice(b)) / b.msrp) : 0;
      cmp = dB - dA;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const activeCategories = siteFilter === 'gpudrip' ? GPUDRIP_CATEGORIES
    : siteFilter === 'theresmac' ? THERESMAC_CATEGORIES
    : siteFilter === 'healthindex' ? HEALTHINDEX_CATEGORIES
    : siteFilter === 'babygear' ? BABYGEAR_CATEGORIES
    : [...THERESMAC_CATEGORIES, ...GPUDRIP_CATEGORIES, ...HEALTHINDEX_CATEGORIES, ...BABYGEAR_CATEGORIES];

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...s.input, flex: 1, minWidth: 120 }}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...s.input, minWidth: 0 }}>
          <option value="all">All</option>
          {activeCategories.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <button
          onClick={() => exportProductsCSV(filtered)}
          style={{ ...s.btn, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '6px 10px', fontSize: 12 }}
          title="Export CSV"
        >
          <Download size={12} /> CSV
        </button>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {['price', 'msrp', 'name', 'discount'].map((col) => (
          <button
            key={col}
            onClick={() => toggleSort(col)}
            style={{ ...(sortBy === col ? s.btnActive : s.btn), padding: '5px 10px', fontSize: 12 }}
          >
            {col.charAt(0).toUpperCase() + col.slice(1)}
            {sortBy === col && (sortDir === 'asc' ? ' ↑' : ' ↓')}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
        {filtered.length} product{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Product grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {filtered.map((p) => (
          <ProductCard
            key={`${p._site}-${p.id}`}
            product={p}
            site={p._site}
            onPriceUpdate={(productId, retailer, price, inStock, url, notCarried) =>
              onPriceUpdate(p._site, productId, retailer, price, inStock, url, notCarried)
            }
            onMsrpUpdate={(productId, msrp) => onMsrpUpdate(p._site, productId, msrp)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── AlertsTab ────────────────────────────────────────────────────────────────

function AlertsTab({ alerts, siteFilter, onTest, onDelete }) {
  const [filter, setFilter] = useState(siteFilter);

  const filtered = alerts.filter((a) => {
    if (filter === 'theresmac' && a.site !== 'theresmac') return false;
    if (filter === 'gpudrip' && a.site !== 'gpudrip') return false;
    return true;
  });

  return (
    <div>
      {/* Site filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'theresmac', 'gpudrip', 'healthindex', 'babygear'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={filter === f ? s.btnActive : s.btn}>
            {f === 'all' ? 'All Sites' : siteLabel(f)}
          </button>
        ))}
        <button
          onClick={() => exportAlertsCSV(filtered)}
          style={{ ...s.btn, display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}
          title="Export alerts to CSV"
        >
          <Download size={14} /> CSV
        </button>
      </div>

      <div style={{ ...s.card, padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={s.tableTh}>Product</th>
              <th style={s.tableTh}>User</th>
              <th style={s.tableTh}>Target Price</th>
              <th style={s.tableTh}>Site</th>
              <th style={s.tableTh}>Created</th>
              <th style={s.tableTh}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ ...s.tableTd, textAlign: 'center', color: '#666', padding: 30 }}>No alerts found</td></tr>
            )}
            {filtered.map((a, i) => (
              <tr key={a.id || i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                <td style={s.tableTd}>
                  <div style={{ fontWeight: 500 }}>{a.productName || a.productId || '—'}</div>
                </td>
                <td style={s.tableTd}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={13} style={{ color: '#888' }} />
                    <span style={{ fontSize: 13 }}>{a.email || a.user || '—'}</span>
                  </div>
                </td>
                <td style={s.tableTd}>
                  <span style={{ fontWeight: 600 }}>{fmt(a.targetPrice)}</span>
                </td>
                <td style={s.tableTd}>
                  <span style={{ ...s.badge, ...badgeStyleForSite(a.site) }}>
                    {siteOf(a.site)}
                  </span>
                </td>
                <td style={{ ...s.tableTd, color: '#888', fontSize: 13 }}>
                  {fmtDate(a.createdAt || a.created)}
                </td>
                <td style={s.tableTd}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => onTest(a)} style={{ ...s.btn, padding: '4px 10px', fontSize: 12 }} title="Test alert">
                      <Bell size={12} />
                    </button>
                    <button onClick={() => onDelete(a)} style={{ ...s.btn, padding: '4px 10px', fontSize: 12, color: '#ef4444' }} title="Delete alert">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PriceHistoryTab ──────────────────────────────────────────────────────────

function PriceHistoryTab({ history, siteFilter, onClear }) {
  const [filter, setFilter] = useState(siteFilter);
  const [dropsOnly, setDropsOnly] = useState(false);
  const [clearing, setClearing] = useState(false);

  const filtered = history.filter((h) => {
    if (filter === 'theresmac' && h.site !== 'theresmac') return false;
    if (filter === 'gpudrip' && h.site !== 'gpudrip') return false;
    if (dropsOnly && h.newPrice >= h.oldPrice) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'theresmac', 'gpudrip', 'healthindex', 'babygear'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={filter === f ? s.btnActive : s.btn}>
              {f === 'all' ? 'All Sites' : siteLabel(f)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#ccc' }}>
            <input
              type="checkbox"
              checked={dropsOnly}
              onChange={(e) => setDropsOnly(e.target.checked)}
              style={{ accentColor: '#2563eb' }}
            />
            Price drops only
          </label>
          <button
            onClick={() => exportHistoryCSV(filtered)}
            style={{ ...s.btn, display: 'flex', alignItems: 'center', gap: 6 }}
            title="Export price history to CSV"
          >
            <Download size={14} /> Export CSV
          </button>
          {history.length > 0 && (
            <button
              onClick={async () => {
                if (!confirm('Clear all price history for both sites?')) return;
                setClearing(true);
                try { await onClear(); } finally { setClearing(false); }
              }}
              disabled={clearing}
              style={{ ...s.btnDanger, fontSize: 13, padding: '6px 14px' }}
            >
              {clearing ? 'Clearing...' : 'Clear History'}
            </button>
          )}
        </div>
      </div>

      <div style={{ ...s.card, padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={s.tableTh}>Product</th>
              <th style={s.tableTh}>Retailer</th>
              <th style={s.tableTh}>Old Price</th>
              <th style={s.tableTh}>New Price</th>
              <th style={s.tableTh}>Change</th>
              <th style={s.tableTh}>Site</th>
              <th style={s.tableTh}>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ ...s.tableTd, textAlign: 'center', color: '#666', padding: 30 }}>No price changes found</td></tr>
            )}
            {filtered.map((h, i) => {
              const isDrop = h.newPrice < h.oldPrice;
              const pct = h.oldPrice ? Math.round(((h.oldPrice - h.newPrice) / h.oldPrice) * 100) : 0;
              return (
                <tr key={h.id || i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={s.tableTd}>
                    <span style={{ fontWeight: 500 }}>{h.productName || h.productId || '—'}</span>
                  </td>
                  <td style={{ ...s.tableTd, color: '#aaa' }}>
                    {RETAILER_LABELS[h.retailer] || h.retailer || '—'}
                  </td>
                  <td style={s.tableTd}>{fmt(h.oldPrice)}</td>
                  <td style={s.tableTd}>{fmt(h.newPrice)}</td>
                  <td style={s.tableTd}>
                    <span style={{ color: isDrop ? '#4ade80' : '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {isDrop ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
                      {pct}%
                    </span>
                  </td>
                  <td style={s.tableTd}>
                    <span style={{ ...s.badge, ...badgeStyleForSite(h.site) }}>
                      {siteOf(h.site)}
                    </span>
                  </td>
                  <td style={{ ...s.tableTd, color: '#888', fontSize: 13 }}>
                    {fmtDate(h.date || h.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SettingsTab ──────────────────────────────────────────────────────────────

function SettingsTab({ tmProducts, gdProducts, hiProducts, bgProducts, alerts, history }) {
  const config = [
    { label: 'TheresMac API', value: THERESMAC_API },
    { label: 'TheresMac Key', value: THERESMAC_KEY ? `${THERESMAC_KEY.slice(0, 6)}...${THERESMAC_KEY.slice(-4)}` : 'Not set' },
    { label: 'GPU Drip API', value: GPUDRIP_API },
    { label: 'GPU Drip Key', value: GPUDRIP_KEY ? `${GPUDRIP_KEY.slice(0, 6)}...${GPUDRIP_KEY.slice(-4)}` : 'Not set' },
    { label: 'Health Index API', value: HEALTHINDEX_API },
    { label: 'Health Index Key', value: HEALTHINDEX_KEY ? `${HEALTHINDEX_KEY.slice(0, 6)}...${HEALTHINDEX_KEY.slice(-4)}` : 'Not set' },
    { label: 'Baby Gear API', value: BABYGEAR_API },
    { label: 'Baby Gear Key', value: BABYGEAR_KEY ? `${BABYGEAR_KEY.slice(0, 6)}...${BABYGEAR_KEY.slice(-4)}` : 'Not set' },
  ];

  const counts = [
    { label: 'TheresMac Products', value: tmProducts.length },
    { label: 'GPU Drip Products', value: gdProducts.length },
    { label: 'Health Index Products', value: hiProducts.length },
    { label: 'Baby Gear Products', value: bgProducts.length },
    { label: 'Alerts', value: alerts.length },
    { label: 'Price Changes', value: history.length },
  ];

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* API Configuration */}
      <div style={s.card}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>API Configuration</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {config.map((c) => (
            <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
              <span style={{ fontSize: 13, color: '#888' }}>{c.label}</span>
              <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#ccc' }}>{c.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Status */}
      <div style={s.card}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Data Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {counts.map((c) => (
            <div key={c.label} style={{ backgroundColor: '#1a1a1a', borderRadius: 6, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{c.value}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [siteFilter, setSiteFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('products');
  const [tmProducts, setTmProducts] = useState([]);
  const [gdProducts, setGdProducts] = useState([]);
  const [hiProducts, setHiProducts] = useState([]);
  const [bgProducts, setBgProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch helpers ──

  const fetchProducts = useCallback(async (site) => {
    const api = apiForSite(site);
    const key = keyForSite(site);
    const endpoint = site === 'gpudrip' ? '/api/gpus' : '/api/products';
    const dataKey = site === 'gpudrip' ? 'gpus' : 'products';
    try {
      const res = await fetch(`${api}${endpoint}`, { headers: { 'x-api-key': key } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data[dataKey] || data.products || [];
      // Normalize GPU Drip format to match TheresMac structure
      if (site === 'gpudrip') {
        return list.map((g) => ensureUrls({
          id: g.id,
          name: g.model,
          category: g.brand,
          slug: g.slug,
          msrp: g.msrp_usd,
          specs: { architecture: g.architecture, vram: `${g.vram_gb}GB`, tdp: `${g.tdp_watts}W` },
          prices: g.retailers
            ? Object.fromEntries(
                Object.entries(g.retailers).map(([k, v]) => [k, { price: v.price, inStock: v.inStock, url: v.url, verified: v.verified }])
              )
            : {},
          _site: site,
        }, site));
      }
      return list.map((p) => ensureUrls({ ...p, _site: site }, site));
    } catch (err) {
      console.error(`[${site}] Failed to fetch products:`, err);
      return [];
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    const results = [];
    for (const site of ['theresmac', 'gpudrip', 'healthindex', 'babygear']) {
      try {
        const api = apiForSite(site);
        const key = keyForSite(site);
        const res = await fetch(`${api}/api/admin/alerts`, { headers: { 'x-api-key': key } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.alerts || [];
        list.forEach((a) => results.push({ ...a, site }));
      } catch (err) {
        console.error(`[${site}] Failed to fetch alerts:`, err);
      }
    }
    return results;
  }, []);

  const fetchHistory = useCallback(async () => {
    const results = [];
    // Build a product-name lookup per site
    const nameMap = {};
    const productSets = { theresmac: tmProducts, gpudrip: gdProducts, healthindex: hiProducts, babygear: bgProducts };
    for (const [site, prods] of Object.entries(productSets)) {
      nameMap[site] = {};
      for (const p of prods) {
        nameMap[site][p.id] = p.name;
      }
    }
    for (const site of ['theresmac', 'gpudrip', 'healthindex', 'babygear']) {
      try {
        const api = apiForSite(site);
        const key = keyForSite(site);
        const res = await fetch(`${api}/api/admin/price-history`, { headers: { 'x-api-key': key } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.history || data.changes || [];
        list.forEach((h) => {
          // Normalize snake_case backend fields → camelCase frontend
          results.push({
            ...h,
            site,
            productName: h.productName || h.product_name || nameMap[site]?.[h.product_id || h.productId] || h.product_id || h.productId,
            productId: h.productId || h.product_id,
            retailer: h.retailer,
            oldPrice: h.oldPrice ?? h.old_price,
            newPrice: h.newPrice ?? h.new_price,
            date: h.date || h.changed_at || h.createdAt || h.created_at,
            in_stock: h.in_stock ?? h.inStock,
          });
        });
      } catch (err) {
        console.error(`[${site}] Failed to fetch price history:`, err);
      }
    }
    return results;
  }, [tmProducts, gdProducts, hiProducts, bgProducts]);

  const clearHistory = useCallback(async () => {
    const results = [];
    for (const site of ['theresmac', 'gpudrip', 'healthindex', 'babygear']) {
      try {
        const api = apiForSite(site);
        const key = keyForSite(site);
        const res = await fetch(`${api}/api/admin/price-history`, { method: 'DELETE', headers: { 'x-api-key': key } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        results.push({ site, ok: true });
      } catch (err) {
        console.error(`[${site}] Failed to clear price history:`, err);
        results.push({ site, ok: false });
      }
    }
    setHistory([]);
    return results;
  }, []);

  // ── Load all data ──

  const loadAll = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setRefreshing(true);
    try {
      const [tm, gd, hi, bg, alertData, historyData] = await Promise.all([
        fetchProducts('theresmac'),
        fetchProducts('gpudrip'),
        fetchProducts('healthindex'),
        fetchProducts('babygear'),
        fetchAlerts(),
        fetchHistory(),
      ]);
      setTmProducts(tm);
      setGdProducts(gd);
      setHiProducts(hi);
      setBgProducts(bg);
      setAlerts(alertData);
      setHistory(historyData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchProducts, fetchAlerts, fetchHistory]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Mutations ──

  const handlePriceUpdate = async (site, productId, retailer, price, inStock, url, notCarried) => {
    const api = apiForSite(site);
    try {
      const res = await fetch(`${api}/api/admin/update-price`, {
        method: 'POST',
        headers: headers(site),
        body: JSON.stringify(site === 'gpudrip'
          ? { gpuId: productId, retailer, price, inStock, url }
          : { productId, retailer, price, inStock, url, notCarried }
        ),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      // Update local state
      const updater = (products) =>
        products.map((p) => {
          if (p.id !== productId) return p;
          const prices = { ...p.prices, [retailer]: { ...p.prices[retailer], price, inStock, url, notCarried } };
          return { ...p, prices };
        });
      if (site === 'theresmac') setTmProducts(updater);
      else setGdProducts(updater);
    } catch (err) {
      console.error('Price update failed:', err);
      alert(`Price update failed: ${err.message}`);
    }
  };

  const handleMsrpUpdate = async (site, productId, msrp) => {
    const api = apiForSite(site);
    try {
      const res = await fetch(`${api}/api/admin/update-msrp`, {
        method: 'POST',
        headers: headers(site),
        body: JSON.stringify({ productId, msrp }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const updater = (products) =>
        products.map((p) => (p.id === productId ? { ...p, msrp } : p));
      if (site === 'theresmac') setTmProducts(updater);
      else setGdProducts(updater);
    } catch (err) {
      console.error('MSRP update failed:', err);
      alert(`MSRP update failed: ${err.message}`);
    }
  };

  const handleTestAlert = async (alert) => {
    const api = apiForSite(alert.site);
    try {
      const res = await fetch(`${api}/api/admin/alerts/${alert.id}/test`, {
        method: 'POST',
        headers: headers(alert.site),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert('Test alert sent!');
    } catch (err) {
      console.error('Test alert failed:', err);
      alert(`Test alert failed: ${err.message}`);
    }
  };

  const handleDeleteAlert = async (alert) => {
    if (!window.confirm('Delete this alert?')) return;
    const api = apiForSite(alert.site);
    try {
      const res = await fetch(`${api}/api/admin/alerts/${alert.id}`, {
        method: 'DELETE',
        headers: headers(alert.site),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    } catch (err) {
      console.error('Delete alert failed:', err);
      alert(`Delete failed: ${err.message}`);
    }
  };

  // ── Derived stats ──

  const verificationCount = [...tmProducts, ...gdProducts].filter((p) => {
    const prices = p.prices || {};
    const retailers = retailersForSite(p._site || p.site || 'theresmac');
    return retailers.some((r) => prices[r] && prices[r].price && !prices[r].notCarried && !prices[r].url);
  }).length;

  // ── Tabs config ──

  const tabs = [
    { key: 'products', label: 'Products', icon: Package },
    { key: 'alerts', label: 'Alerts', icon: Bell },
    { key: 'history', label: 'Price History', icon: History },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  // ── Render ──

  return (
    <div style={s.bg}>
      {/* Header */}
      <header style={{ backgroundColor: '#0f0f0f', borderBottom: '1px solid #262626', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Affiliate Admin Dashboard</h1>
            <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>TheresMac · GPU Drip · Health Index · Baby Gear</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
              <span style={{ color: '#3b82f6' }}>TM: {tmProducts.length}</span>
              <span style={{ color: '#666' }}>|</span>
              <span style={{ color: '#ec4899' }}>GD: {gdProducts.length}</span>
              <span style={{ color: '#666' }}>|</span>
              <span style={{ color: '#22c55e' }}>HI: {hiProducts.length}</span>
              <span style={{ color: '#666' }}>|</span>
              <span style={{ color: '#a855f7' }}>BG: {bgProducts.length}</span>
            </div>
            <button onClick={() => loadAll(false)} style={s.btn} title="Refresh data">
              <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', verticalAlign: 'middle' }} />
              <span style={{ marginLeft: 6 }}>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Site Toggle + Tabs */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px 0' }}>
        {/* Site filter toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {['all', 'theresmac', 'gpudrip', 'healthindex', 'babygear'].map((f) => (
            <button
              key={f}
              onClick={() => setSiteFilter(f)}
              style={{ ...(siteFilter === f ? s.btnActive : s.btn), padding: '6px 12px', fontSize: 12 }}
            >
              {f === 'all' ? 'All' : siteOf(f)}
            </button>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #262626', marginBottom: 20 }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                  color: active ? '#fff' : '#888',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Stats (always visible) */}
        <div style={{ marginBottom: 24 }}>
          <StatsCards
            tmCount={tmProducts.length}
            gdCount={gdProducts.length}
            hiCount={hiProducts.length}
            bgCount={bgProducts.length}
            alertCount={alerts.length}
            verificationCount={verificationCount}
          />
        </div>

        {/* Tab content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
            <p style={{ marginTop: 12 }}>Loading data from both APIs...</p>
          </div>
        ) : (
          <>
            {activeTab === 'products' && (
              <ProductList
                tmProducts={tmProducts}
                gdProducts={gdProducts}
                hiProducts={hiProducts}
                bgProducts={bgProducts}
                siteFilter={siteFilter}
                onPriceUpdate={handlePriceUpdate}
                onMsrpUpdate={handleMsrpUpdate}
              />
            )}
            {activeTab === 'alerts' && (
              <AlertsTab
                alerts={alerts}
                siteFilter={siteFilter}
                onTest={handleTestAlert}
                onDelete={handleDeleteAlert}
              />
            )}
            {activeTab === 'history' && (
              <PriceHistoryTab
                history={history}
                siteFilter={siteFilter}
                onClear={clearHistory}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTab
                tmProducts={tmProducts}
                gdProducts={gdProducts}
                hiProducts={hiProducts}
                bgProducts={bgProducts}
                alerts={alerts}
                history={history}
              />
            )}
          </>
        )}
      </div>

      {/* Inline keyframes for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
