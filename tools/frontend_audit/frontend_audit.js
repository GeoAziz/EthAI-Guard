const fs = require('fs');
const path = require('path');
// Avoid external deps (glob) so script runs in CI/dev without extra installs
// We'll use a simple recursive directory walker instead.

const repoRoot = path.resolve(__dirname, '../../');
const appDir = path.join(repoRoot, 'frontend', 'src', 'app');
const outDir = path.join(repoRoot, 'reports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function readFile(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; }
}

function fileToRoute(file) {
  // compute route from frontend/src/app/**/page.*
  const rel = path.relative(appDir, file);
  const parts = rel.split(path.sep);
  // drop page.*
  if (parts[parts.length-1].startsWith('page.')) parts.pop();
  // handle [id] params
  const route = '/' + parts.map(p => p.replace(/index(\..*)?$/, '').replace(/__layout$/, '')).filter(Boolean).join('/');
  return route === '' ? '/' : route;
}

const patterns = {
  roleProtected: /RoleProtected\b/,
  // matches single or array forms: required="admin" or required={'admin'} or required={["admin","analyst"]}
  roleProtectedRequiredSingle: /required\s*=\s*(?:\{|\")?['\"]?(admin|analyst|reviewer|user|guest)['\"]?(?:\})?/i,
  roleProtectedRequiredArray: /required\s*=\s*\{\s*\[([^\]]+)\]\s*\}/i,
  hasRole: /hasRole\s*\(/,
  apiPromoteUser: "/v1/users/promote",
  apiSyncClaims: "/v1/users/sync-claims",
  apiAccessRequests: "/v1/access-requests",
  apiModelsPromote: /\/v1\/models\/[^'"`\s]+\/promote/,
  apiModelsRetrain: /trigger-retrain|\/trigger-retrain/,
};

function walkDir(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkDir(full, fileList);
    } else if (/^page\./.test(e.name)) {
      fileList.push(full);
    }
  }
  return fileList;
}

let files = [];
if (fs.existsSync(appDir)) {
  files = walkDir(appDir, []);
} else {
  console.error('frontend app dir not found at', appDir);
}

const results = [];

files.forEach(file => {
  const src = readFile(file);
  const route = fileToRoute(file);
  const rp = patterns.roleProtected.test(src);
  // try single match first
  let requiredRole = null;
  const single = src.match(patterns.roleProtectedRequiredSingle);
  if (single && single[1]) requiredRole = single[1].toLowerCase();
  // try array form
  const arr = src.match(patterns.roleProtectedRequiredArray);
  let requiredRolesArray = null;
  if (arr && arr[1]) {
    // arr[1] contains the inner items like '"admin","analyst"'
    const items = arr[1]
      .split(',')
      .map(s => s.replace(/["'\s]/g, '').trim())
      .filter(Boolean)
      .map(s => s.toLowerCase());
    requiredRolesArray = items;
    // if single not set, pick first for backward compat
    if (!requiredRole && items.length > 0) requiredRole = items[0];
  }
  const hasHasRole = patterns.hasRole.test(src);
  const backendCalls = [];
  if (src.indexOf(patterns.apiPromoteUser) !== -1) backendCalls.push(patterns.apiPromoteUser);
  if (src.indexOf(patterns.apiSyncClaims) !== -1) backendCalls.push(patterns.apiSyncClaims);
  if (src.indexOf(patterns.apiAccessRequests) !== -1) backendCalls.push(patterns.apiAccessRequests);
  if (patterns.apiModelsPromote.test(src)) backendCalls.push('models_promote');
  if (src.indexOf('trigger-retrain') !== -1 || src.indexOf('/trigger-retrain') !== -1) backendCalls.push('models_trigger_retrain');

  results.push({
    route,
    file: path.relative(repoRoot, file),
    roleProtected: rp,
    requiredRole: requiredRole,
    requiredRolesArray: requiredRolesArray,
    hasHasRole: hasHasRole,
    backendCalls: [...new Set(backendCalls)],
  });
});

// Build role -> pages matrix using simple heuristics
const rolePages = { admin: [], analyst: [], reviewer: [], user: [], guest: [], unknown: [] };
results.forEach(r => {
  if (r.requiredRolesArray && r.requiredRolesArray.length > 0) {
    // if multiple roles, assign page to each
    r.requiredRolesArray.forEach(rr => {
      if (rolePages[rr]) rolePages[rr].push(r.route);
      else rolePages.unknown.push(r.route);
    });
  } else if (r.requiredRole) {
    if (rolePages[r.requiredRole]) rolePages[r.requiredRole].push(r.route);
    else rolePages.unknown.push(r.route);
  } else {
    // layout-level detection: walk up directories and look for layout files that contain RoleProtected
    const fileDir = path.dirname(path.join(repoRoot, r.file));
    let cur = fileDir;
    let foundLayoutProtection = false;
    while (cur.startsWith(appDir) && cur.length > appDir.length) {
      const layoutTsx = path.join(cur, 'layout.tsx');
      const layoutJsx = path.join(cur, 'layout.jsx');
      let layoutSrc = '';
      if (fs.existsSync(layoutTsx)) layoutSrc = readFile(layoutTsx);
      else if (fs.existsSync(layoutJsx)) layoutSrc = readFile(layoutJsx);
      if (layoutSrc && /RoleProtected/.test(layoutSrc)) {
        // try to extract roles from layout as well
        const rolesArr = (layoutSrc.match(patterns.roleProtectedRequiredArray) || [])[1];
        const singleRole = (layoutSrc.match(patterns.roleProtectedRequiredSingle) || [])[1];
        if (rolesArr) {
          const items = rolesArr.split(',').map(s => s.replace(/["'\s]/g, '').trim().toLowerCase()).filter(Boolean);
          items.forEach(it => { if (rolePages[it]) rolePages[it].push(r.route); else rolePages.unknown.push(r.route); });
        } else if (singleRole) {
          const sr = singleRole.toLowerCase();
          if (rolePages[sr]) rolePages[sr].push(r.route); else rolePages.unknown.push(r.route);
        } else {
          rolePages.unknown.push(r.route);
        }
        foundLayoutProtection = true;
        break;
      }
      const parent = path.dirname(cur);
      if (parent === cur) break;
      cur = parent;
    }

    if (foundLayoutProtection) return;

    // heuristic: if page uses admin backend calls or has hasRole('admin') => admin
    const isAdminCall = r.backendCalls.some(c => c === patterns.apiPromoteUser || c === patterns.apiAccessRequests || c === 'models_promote' || c === 'models_trigger_retrain' || c === patterns.apiSyncClaims);
    if (isAdminCall || (r.hasHasRole && /hasRole\(\s*['\"]admin['\"]\s*\)/.test(readFile(path.join(repoRoot, r.file))))) {
      rolePages.admin.push(r.route);
    } else if (r.hasHasRole) {
      rolePages.user.push(r.route);
    } else {
      rolePages.unknown.push(r.route);
    }
  }
});

// Write JSON
const outJson = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalPages: results.length,
    roleCounts: Object.fromEntries(Object.entries(rolePages).map(([k,v]) => [k, v.length]))
  },
  pages: results,
  rolePages
};
fs.writeFileSync(path.join(outDir, 'frontend_role_coverage.json'), JSON.stringify(outJson, null, 2));

// Write Markdown
let md = `# Frontend Role Coverage Report\n\nGenerated: ${outJson.generatedAt}\n\n`;
md += `Total scanned pages: ${outJson.summary.totalPages}\n\n`;
md += `## Role -> Pages (heuristic)\n\n`;
Object.keys(rolePages).forEach(role => {
  md += `### ${role} (${rolePages[role].length})\n\n`;
  rolePages[role].forEach(p => md += `- ${p}\n`);
  md += `\n`;
});

md += `## Per-page details\n\n`;
md += `| Route | File | RoleProtected | requiredRole | hasRoleChecks | backendCalls |\n`;
md += `|---|---|---:|---|---:|---|\n`;
results.forEach(r => {
  md += `| ${r.route} | ${r.file} | ${r.roleProtected ? 'yes' : 'no'} | ${r.requiredRole || ''} | ${r.hasHasRole ? 'yes' : 'no'} | ${r.backendCalls.join(', ')} |\n`;
});

fs.writeFileSync(path.join(outDir, 'frontend_role_coverage.md'), md);

console.log('Report written to reports/frontend_role_coverage.json and .md');
