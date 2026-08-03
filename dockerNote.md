# Dockerfile Notes: What Was Broken and What We Fixed

## The Original (Broken) Dockerfile

```dockerfile
FROM node:18
WORKDIR /usr/src/app
COPY package.json .
RUN npm install
COPY app.js .
EXPOSE 3000
CMD ["node", "index.js"]
```

---

## Bug 1: Wrong startup file

**Before:** `CMD ["node", "index.js"]`
**After:** `CMD ["node", "app.js"]`

The app's main file is `app.js`, not `index.js`. When the container starts, it tries to run `index.js`, which doesn't exist, so it immediately crashes.

---

## Bug 2: Only copying one file

**Before:** `COPY app.js .`
**After:** `COPY . .`

The app needs more than just `app.js` to work. It also has a `public/` folder for the frontend. The old Dockerfile only copied `app.js`, so the container was missing everything else. Using `COPY . .` grabs the entire project.

---

## Bug 3: Wrong port

**Before:** `EXPOSE 3000`
**After:** `EXPOSE 3001`

Inside the app code, the server listens on port `3001` by default (`const PORT = process.env.PORT || 3001`). The Dockerfile was exposing port `3000`, which doesn't match. Traffic going to port 3000 would never reach the app because nobody is listening there.

---

## Improvements Added

### Added `ENV NODE_ENV=production`

This tells Express (our web framework) to run in production mode. It turns on caching and turns off extra debug messages, making the app faster.

### Changed `COPY package.json .` to `COPY package*.json ./`

The `*` wildcard also grabs `package-lock.json`. The lock file records the exact version of every dependency. Without it, you might get slightly different versions each time you build, which can cause random bugs.

### Changed `RUN npm install` to `RUN npm ci`

`npm ci` (Clean Install) strictly follows `package-lock.json`. It won't guess or update anything. Every build gets the exact same dependencies, guaranteed.
