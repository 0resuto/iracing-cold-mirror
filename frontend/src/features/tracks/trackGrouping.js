/**
 * Group circuit configurations under a shared parent circuit key.
 *
 * Each track summary's `display_name` follows iRacing's "Circuit - Configuration"
 * convention. This derives a compact parent key per config using the longest
 * dash-segment prefix that is shared by at least 2 configs (so multi-config
 * circuits collapse as one group, e.g. all Monza configs -> "Autodromo Nazionale
 * Monza"). Configs with no shared prefix (single-layout circuits, e.g. Bathurst)
 * become their own parent key equal to their full display name.
 */

function dashPrefixes(displayName) {
  const parts = String(displayName || '').split(' - ');
  const prefixes = [];
  for (let i = 1; i <= parts.length; i++) {
    prefixes.push(parts.slice(0, i).join(' - '));
  }
  return prefixes;
}

export function computeTrackGroups(tracks) {
  if (!tracks || tracks.length === 0) return [];

  const count = new Map();
  for (const t of tracks) {
    for (const p of dashPrefixes(t.display_name)) {
      count.set(p, (count.get(p) || 0) + 1);
    }
  }

  const groups = new Map();
  for (const t of tracks) {
    let best = null;
    for (const p of dashPrefixes(t.display_name)) {
      if (count.get(p) >= 2) best = p;
    }
    const key = best || t.display_name;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  return [...groups.entries()]
    .map(([parent, items]) => ({
      parent,
      items: items.slice().sort((a, b) => a.display_name.localeCompare(b.display_name)),
    }))
    .sort((a, b) => a.parent.localeCompare(b.parent));
}
