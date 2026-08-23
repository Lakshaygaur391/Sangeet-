# Sangeet — API Contract (Frontend Expectations)

The frontend already works standalone: playlists, likes, and recently-played
are cached in `localStorage` and the UI is fully functional without these
endpoints. Once you add them to the backend, `src/services/*` will pick them
up automatically — no frontend changes needed. All routes are relative to
`VITE_API_BASE_URL` and (except auth) expect the existing `Authorization:
Bearer <token>` header your `/api/auth` routes already issue.

## Already used by the frontend (unchanged)
- `POST /api/auth/login` → `{ user, token }`
- `POST /api/auth/register` → `{ user, token }`
- `GET /api/songs` → `Song[]`
- `GET /api/search?q=` → `Song[]`
- `GET /api/artists` → `Artist[]`
- `GET /api/resolve-song?title=&artist=`

## New — Library (likes + recently played)
```
GET    /api/library/liked                 -> Song[]
POST   /api/library/liked                 -> { success: true }   body: { songId }
DELETE /api/library/liked/:songId         -> { success: true }

GET    /api/library/recent                -> Song[]  (most recent first, server should cap ~30)
POST   /api/library/recent                -> { success: true }   body: { songId }
DELETE /api/library/recent                -> { success: true }   (clears all history)
```

## New — Playlists
```
GET    /api/playlists                     -> Playlist[]
POST   /api/playlists                     -> Playlist   body: { name, description, coverImage, isPublic }
GET    /api/playlists/:id                 -> Playlist
PATCH  /api/playlists/:id                 -> Playlist   body: { name?, description?, coverImage?, isPublic? }
DELETE /api/playlists/:id                 -> { success: true }

POST   /api/playlists/:id/songs           -> Playlist   body: { songId }
DELETE /api/playlists/:id/songs/:songId   -> Playlist
PATCH  /api/playlists/:id/reorder         -> Playlist   body: { songIds: string[] }
```

`Playlist` shape:
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "coverImage": "string | null",
  "isPublic": false,
  "songs": ["Song", "..."],
  "createdAt": "ISO date string"
}
```

## Optional — Albums (page gracefully shows an empty state if absent)
```
GET /api/albums          -> Album[]
GET /api/albums/:id      -> Album  { id, name, artist, releaseYear, coverImage, songs: Song[] }
```

## Optional — Artist follow
```
POST   /api/artists/:id/follow    -> { success: true }
DELETE /api/artists/:id/follow    -> { success: true }
```
(Not yet wired into the Follow button on the Artist page — currently local
UI state only, since there's no `GET` for "is this artist followed" yet.
Add that to the artist object and I can wire it up.)
