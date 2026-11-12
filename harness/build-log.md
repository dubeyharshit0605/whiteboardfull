# Whiteboard build log

- Imported the public source snapshot as a new root commit with attribution.
  Excluded the upstream environment file, credentials, and commit ancestry.
- Added authenticated board reads and writes, atomic revision checks, validated
  drawing data, sharing and revocation, and Socket.IO change notifications.
  Retained the drawing tools and moved the frontend build from CRA to Vite.
- Reinstalled both lockfiles, built the production frontend, and passed three
  Node tests against an isolated MongoDB 8.0 Docker container. The integration
  test covers SPA deep links, accounts, access, persistence, reconnects,
  concurrent saves, collaboration notifications, revocation, and deletion.
- Both package audits reported zero known vulnerabilities after the lockfile
  updates. Before the updates the backend audit reported 11 advisories, and
  the inherited CRA build reported an undeclared Babel dependency.
- Deployed to [Render](https://whiteboardfull.onrender.com/) with MongoDB Atlas.
  Verified drawing and undo in Chrome. The live app, sign-in and registration
  pages returned HTTP 200, and the [health endpoint](https://whiteboardfull.onrender.com/healthz)
  reported a database connection. Live sign-in and collaboration were not exercised.
