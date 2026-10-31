# Forest

## Library documentation

Before writing or changing code that uses a library's API, such as NestJS, Next.js, Prisma or Supabase, fetch that library's current documentation with `ctx7`, pinned in `mise.toml`. Your memory of a fast-moving API can be outdated; the fetched docs win.

```sh
mise exec -- ctx7 library nestjs "guards"                              # find the library ID
mise exec -- ctx7 docs /nestjs/docs.nestjs.com "guards canActivate"    # query its docs
```

It needs no account or API key. When `ctx7` fails or returns nothing useful, read the library's official documentation instead, and say in your answer which source you used.
