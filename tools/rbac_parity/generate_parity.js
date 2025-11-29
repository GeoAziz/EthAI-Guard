const fs = require('fs');
const path = require('path');

function readJSON(p) { return JSON.parse(fs.readFileSync(p,'utf8')); }

const backendDir = path.resolve(__dirname, '../../backend/src/routes');
const frontendReport = path.resolve(__dirname, '../../reports/frontend_role_coverage.json');
const outJson = path.resolve(__dirname, '../../reports/frontend_rbac_parity.json');
const outMd = path.resolve(__dirname, '../../reports/frontend_rbac_parity.md');

function scanBackend() {
  const files = fs.readdirSync(backendDir).filter(f => f.endsWith('.js'));
  const endpoints = []; // { method, path, file, roles: [] }

  files.forEach(file => {
    const p = path.join(backendDir, file);
    const src = fs.readFileSync(p, 'utf8');
    const lines = src.split('\n');

    // detect file-level router.use(authGuard, requireRole('x'))
    let fileLevelRoles = null;
    const useMatch = src.match(/router\.use\([^\)]*requireRole\(([^\)]*)\)/m);
    if (useMatch) {
      try {
        // eval a small array string: replace single quotes appropriately
        const arg = useMatch[1];
        const roles = arg.split(',').map(s=>s.trim().replace(/['"\s]/g,'')).filter(Boolean);
        fileLevelRoles = roles;
      } catch (e) { fileLevelRoles = null; }
    }

    // find router.<method>('\S+', ... ) occurrences
    const routeRegex = /router\.(get|post|patch|put|delete)\s*\(\s*(['\"])([^'\"]+)\2([\s\S]*?)\)/g;
    let m;
    while ((m = routeRegex.exec(src)) !== null) {
      const method = m[1].toUpperCase();
      const routePath = m[3];
      const args = m[4];
      // find requireRole(...) within args
      const rr = args.match(/requireRole\(([^\)]*)\)/);
      let roles = null;
      if (rr) {
        try { roles = rr[1].split(',').map(s=>s.trim().replace(/['"\s]/g,'')).filter(Boolean); } catch(e){ roles=null; }
      } else if (fileLevelRoles) {
        roles = fileLevelRoles;
      }
      // detect if authGuard present
      const hasAuth = /authGuard/.test(args) || /authGuard/.test(src.substring(0, src.indexOf(m[0])));
      endpoints.push({ method, path: routePath, file, roles, authRequired: hasAuth });
    }
  });
  return endpoints;
}

function loadFrontendReport() {
  return readJSON(frontendReport);
}

function crossReference(backendEndpoints, frontendReport) {
  // build backend map by normalized path (strip params)
  const backendMap = {};
  backendEndpoints.forEach(ep => {
    // normalize path: replace :param with {param}
    const norm = ep.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
    backendMap[norm] = backendMap[norm] || [];
    backendMap[norm].push(ep);
  });

  const pages = frontendReport.pages || [];

  const mismatches = [];
  const pagesCallingProtectedButUnprotectedFrontend = [];
  const backendProtectedNotCalled = [];
  const backendCalledBy = {}; // backendNorm -> [page routes]

  pages.forEach(page => {
    const pageRoles = page.requiredRolesArray || (page.requiredRole ? [page.requiredRole] : null);
    (page.backendCalls || []).forEach(call => {
      // Normalize call path: remove query params
      const callPath = call.split('?')[0];
      // Try to match to backendMap keys by simple heuristics: exact match or parameterized
      let matched = false;
      Object.keys(backendMap).forEach(bk => {
        // build regex from bk replacing {param} with [^/]+
        const re = new RegExp('^' + bk.replace(/\{[^}]+\}/g, '[^/]+') + '$');
        if (re.test(callPath) || bk === callPath) {
          matched = true;
          backendCalledBy[bk] = backendCalledBy[bk] || new Set();
          backendCalledBy[bk].add(page.route);

          // check backend required roles
          const backendRoles = Array.from(new Set(backendMap[bk].flatMap(e => e.roles || []))).filter(Boolean);
          // if backend requires admin (or other), but page roles do not include any of those, flag
          if (backendRoles.length > 0) {
            const hasOverlap = pageRoles && backendRoles.some(r => pageRoles.includes(r));
            if (!hasOverlap) {
              pagesCallingProtectedButUnprotectedFrontend.push({ page: page.route, file: page.file, call: callPath, pageRoles, backendRoles });
            }
          } else {
            // backend not role-protected but frontend page is role-protected (maybe too strict) - note it
            if (pageRoles && pageRoles.length > 0 && (!backendMap[bk].some(e=>e.roles && e.roles.length>0))) {
              // record frontend protected calling unprotected endpoint
              // (not critical but useful)
            }
          }
        }
      });

      if (!matched) {
        // record unknown backend call
        backendCalledBy[callPath] = backendCalledBy[callPath] || new Set();
        backendCalledBy[callPath].add(page.route + ' (unknown mapping)');
      }
    });
  });

  // backendProtectedNotCalled = backend endpoints with roles that were not observed in backendCalledBy
  Object.keys(backendMap).forEach(bk => {
    const allRoles = Array.from(new Set(backendMap[bk].flatMap(e=>e.roles||[]))).filter(Boolean);
    if (allRoles.length > 0) {
      if (!backendCalledBy[bk] || backendCalledBy[bk].size === 0) {
        backendProtectedNotCalled.push({ path: bk, roles: allRoles, file: backendMap[bk].map(e=>e.file) });
      }
    }
  });

  // construct result
  return {
    backendEndpoints: backendMap,
    frontendPages: pages.map(p => ({ route: p.route, file: p.file, roles: p.requiredRolesArray || (p.requiredRole ? [p.requiredRole] : null), backendCalls: p.backendCalls })),
    pagesCallingProtectedButUnprotectedFrontend,
    backendProtectedNotCalled,
    backendCalledBy: Object.fromEntries(Object.entries(backendCalledBy).map(([k,v])=>[k, Array.from(v)]))
  };
}

function writeOutputs(res) {
  fs.writeFileSync(outJson, JSON.stringify(res, null, 2));
  let md = '# Frontend ↔ Backend RBAC Parity Report\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += '## Summary\n\n';
  md += `- backend endpoints scanned: ${Object.keys(res.backendEndpoints).length}\n`;
  md += `- frontend pages scanned: ${res.frontendPages.length}\n`;
  md += `- mismatches (page calls protected endpoint but page lacks required role): ${res.pagesCallingProtectedButUnprotectedFrontend.length}\n`;
  md += `- backend protected endpoints not referenced by frontend pages: ${res.backendProtectedNotCalled.length}\n\n`;

  if (res.pagesCallingProtectedButUnprotectedFrontend.length > 0) {
    md += '## Pages calling protected backend endpoints without matching frontend protection\n\n';
    res.pagesCallingProtectedButUnprotectedFrontend.forEach(item => {
      md += `- Page: ${item.page} (file: ${item.file})\n  - Called: ${item.call}\n  - Page roles: ${JSON.stringify(item.pageRoles)}\n  - Backend required roles: ${JSON.stringify(item.backendRoles)}\n\n`;
    });
  }

  if (res.backendProtectedNotCalled.length > 0) {
    md += '## Backend protected endpoints not referenced by any frontend page\n\n';
    res.backendProtectedNotCalled.forEach(b => {
      md += `- ${b.path} (roles: ${JSON.stringify(b.roles)}, files: ${JSON.stringify(b.file)})\n`;
    });
    md += '\n';
  }

  md += '## Backend called by pages (mapping)\n\n';
  Object.keys(res.backendCalledBy).forEach(k => {
    md += `- ${k} \n  - Called by: ${res.backendCalledBy[k].join(', ')}\n`;
  });

  fs.writeFileSync(outMd, md);
}

function main() {
  const backend = scanBackend();
  const frontend = loadFrontendReport();
  const res = crossReference(backend, frontend);
  writeOutputs(res);
  console.log('Parity report written to', outJson, 'and', outMd);
}

main();
