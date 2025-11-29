(async ()=>{
  const base = 'http://localhost:5000';
  const users = [
    {email:'promote-test@example.com', password:'PromotePass123!', expected:'admin'},
    {email:'analyst-test@example.com', password:'AnalystPass123!', expected:'analyst'},
    {email:'reviewer-test@example.com', password:'ReviewerPass123!', expected:'reviewer'},
    {email:'user-test@example.com', password:'UserPass123!', expected:'user'},
    {email:'guest-test@example.com', password:'GuestPass123!', expected:'guest'},
  ];

  for (const u of users) {
    console.log('================================================================');
    console.log('User:', u.email, '(expected role:', u.expected + ')');
    try {
      const loginRes = await fetch(base + '/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: u.email, password: u.password, deviceName: 'node-check' }) });
      console.log('-- POST /auth/login ->', loginRes.status, loginRes.statusText);
      const loginText = await loginRes.text();
      try { console.log('Headers:', JSON.stringify(Object.fromEntries(loginRes.headers.entries()), null, 2)); } catch(e) {}
      try { console.log('Body:', JSON.stringify(JSON.parse(loginText), null, 2)); } catch(e) { console.log('Body (raw):', loginText); }
      let token = null;
      try { const j = JSON.parse(loginText); token = j.accessToken || j.token || j.access_token || null; } catch(e) {}
      console.log('Token length:', token ? token.length : 0);
      if (!token) { console.log('No token, skipping protected requests.'); continue; }
      const meRes = await fetch(base + '/v1/users/me', { headers: { 'Authorization': 'Bearer ' + token } });
      console.log('-- GET /v1/users/me ->', meRes.status, meRes.statusText);
      const meText = await meRes.text();
      try { console.log('Headers:', JSON.stringify(Object.fromEntries(meRes.headers.entries()), null, 2)); } catch(e) {}
      try { console.log('Body:', JSON.stringify(JSON.parse(meText), null, 2)); } catch(e) { console.log('Body (raw):', meText); }
      const repRes = await fetch(base + '/reports', { headers: { 'Authorization': 'Bearer ' + token } });
      console.log('-- GET /reports ->', repRes.status, repRes.statusText);
      const repText = await repRes.text();
      try { console.log('Headers:', JSON.stringify(Object.fromEntries(repRes.headers.entries()), null, 2)); } catch(e) {}
      try { console.log('Body:', JSON.stringify(JSON.parse(repText), null, 2)); } catch(e) { console.log('Body (raw):', repText); }
      if (u.expected === 'admin') {
        const usersRes = await fetch(base + '/v1/users', { headers: { 'Authorization': 'Bearer ' + token } });
        console.log('-- GET /v1/users ->', usersRes.status, usersRes.statusText);
        const usersText = await usersRes.text();
        try { console.log('Headers:', JSON.stringify(Object.fromEntries(usersRes.headers.entries()), null, 2)); } catch(e) {}
        try { console.log('Body:', JSON.stringify(JSON.parse(usersText), null, 2)); } catch(e) { console.log('Body (raw):', usersText); }
      }
    } catch (e) {
      console.error('ERROR for', u.email, e && e.stack ? e.stack : e);
    }
    console.log();
  }
})();
